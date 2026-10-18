import { useEffect, useRef, useState } from "react"

import { type GuidedNumericField } from "@/domain/guided/guidedInput"
import { cn } from "@/shared/utils"
import { inlineEditInputClassName } from "@/features/guided-input/parts/guidedInputStyles"

/**
 * Click-to-edit numeric display — not a permanent form field.
 *
 * `commitMode`:
 * - `"enter"` — uncertainty ranges: Enter commits; Escape / blur discard draft
 * - `"blur"` — incurred (default): Enter or blur commits; Escape cancels
 */
export function GuidedInlineValue({
  rowId,
  field,
  rawValue,
  displayText,
  ariaLabel,
  displayAttrs,
  onCommit,
  commitMode = "blur",
}: {
  rowId: string
  field: GuidedNumericField
  rawValue: string
  displayText: string
  ariaLabel: string
  displayAttrs?: Record<string, string | undefined>
  onCommit: (nextRaw: string) => void
  commitMode?: "enter" | "blur"
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(rawValue)
  const inputRef = useRef<HTMLInputElement | null>(null)
  /** Skip the blur handler after Enter/Escape already finished the edit. */
  const skipBlurAction = useRef(false)

  useEffect(() => {
    setEditing(false)
    setDraft(rawValue)
  }, [rowId, field])

  useEffect(() => {
    if (!editing) setDraft(rawValue)
  }, [rawValue, editing])

  useEffect(() => {
    if (!editing) return
    inputRef.current?.focus()
    inputRef.current?.select()
  }, [editing])

  const save = () => {
    onCommit(draft)
    setEditing(false)
  }

  const discardDraft = () => {
    setDraft(rawValue)
    setEditing(false)
  }

  const cancel = () => {
    skipBlurAction.current = true
    discardDraft()
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="text"
        inputMode="decimal"
        value={draft}
        aria-label={ariaLabel}
        data-guided-inline-edit={field}
        data-guided-field={field}
        data-guided-commit-mode={commitMode}
        className={inlineEditInputClassName}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault()
            skipBlurAction.current = true
            save()
            return
          }
          if (e.key === "Escape") {
            e.preventDefault()
            cancel()
          }
        }}
        onBlur={() => {
          if (skipBlurAction.current) {
            skipBlurAction.current = false
            return
          }
          // Uncertainty ranges: blur discards uncommitted draft (Enter-only).
          // Incurred keeps blur-to-save.
          if (commitMode === "enter") {
            discardDraft()
            return
          }
          save()
        }}
      />
    )
  }

  return (
    <button
      type="button"
      data-guided-inline-display={field}
      {...displayAttrs}
      className={cn(
        "m-0 flex h-9 w-full items-center justify-center",
        "cursor-pointer rounded-md px-2 text-center",
        "font-sans text-[18px] font-medium tabular-nums text-foreground",
        "hover:bg-[#1d868c]/10 hover:underline hover:decoration-[#1d868c]/40 hover:underline-offset-4",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1d868c]/35",
      )}
      aria-label={ariaLabel}
      onClick={() => {
        setDraft(rawValue)
        setEditing(true)
      }}
    >
      {displayText}
    </button>
  )
}
