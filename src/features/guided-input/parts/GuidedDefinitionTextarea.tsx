import { useEffect, useRef, useState } from "react"

import {
  applyGuidedDefinitionDraftChange,
  cancelGuidedDefinitionDraft,
  commitGuidedDefinitionDraft,
  syncGuidedDefinitionDraft,
  type GuidedDefinitionDraftState,
} from "@/domain/guided/guidedDefinitionDraft"
import { textareaClassName } from "@/features/guided-input/parts/guidedInputStyles"

/**
 * Focus definition textarea — local draft while typing.
 * Blur (or Cmd/Ctrl+Enter) commits once; Escape restores canonical text
 * without leaving Focus / Guided.
 */
export function GuidedDefinitionTextarea({
  rowId,
  sourceDescription,
  maxLength,
  placeholder,
  onCommit,
}: {
  rowId: string
  sourceDescription: string
  maxLength: number
  placeholder: string
  onCommit: (rowId: string, description: string) => void
}) {
  const [state, setState] = useState<GuidedDefinitionDraftState>(() => ({
    rowId,
    draft: String(sourceDescription ?? ""),
    baseline: String(sourceDescription ?? ""),
    dirty: false,
  }))
  const stateRef = useRef(state)
  const onCommitRef = useRef(onCommit)
  const maxLengthRef = useRef(maxLength)
  stateRef.current = state
  onCommitRef.current = onCommit
  maxLengthRef.current = maxLength

  useEffect(() => {
    const synced = syncGuidedDefinitionDraft(stateRef.current, {
      rowId,
      sourceDescription,
      maxLength,
    })
    if (synced.pendingCommit) {
      onCommitRef.current(synced.pendingCommit.rowId, synced.pendingCommit.description)
    }
    stateRef.current = synced.state
    setState(synced.state)
  }, [rowId, sourceDescription, maxLength])

  const commitCurrent = () => {
    const result = commitGuidedDefinitionDraft(stateRef.current, maxLengthRef.current)
    stateRef.current = result.state
    setState(result.state)
    if (result.commit) {
      onCommitRef.current(result.commit.rowId, result.commit.description)
    }
  }

  return (
    <textarea
      id="guided-definition"
      rows={2}
      maxLength={maxLength}
      value={state.draft}
      placeholder={placeholder}
      onChange={(event) => {
        setState((prev) => {
          const next = applyGuidedDefinitionDraftChange(
            prev,
            event.target.value,
            maxLengthRef.current,
          )
          stateRef.current = next
          return next
        })
      }}
      onBlur={() => {
        commitCurrent()
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault()
          event.stopPropagation()
          setState((prev) => {
            const next = cancelGuidedDefinitionDraft(prev)
            stateRef.current = next
            return next
          })
          return
        }
        // DefineRowEditor convention: Cmd/Ctrl+Enter commits without advancing.
        if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
          event.preventDefault()
          commitCurrent()
        }
      }}
      className={textareaClassName}
      data-guided-description=""
    />
  )
}
