import { useEffect, useId, useState } from "react"
import { createPortal } from "react-dom"

import { Button } from "@/components/ui/button"
import { useI18n } from "@/i18n/useI18n"
import {
  getAnalysisLibraryRepository,
} from "@/lib/analysisLibraryRepository"
import {
  isAnalysisNameConflictError,
  type AnalysisNameOccupant,
} from "@/domain/analysis/analysisNameUniqueness"
import {
  applyAlternativeSelection,
  applyManualNameEdit,
  initStartOngoingNameState,
  validateStartOngoingSubmit,
} from "@/domain/analysis/startOngoingFromArchiveName"
import { cn } from "@/lib/utils"

export type OngoingFromArchiveAlternativeOption = {
  id: string
  name: string
}

type StartOngoingFromArchiveDialogProps = {
  open: boolean
  alternatives: readonly OngoingFromArchiveAlternativeOption[]
  /** Target folder for the new Ongoing Analysis (same as source Single). */
  folderId: string | null
  onCancel: () => void
  /**
   * Create after client-side validation. Dialog stays open on failure so
   * known name conflicts can be shown inline.
   */
  onConfirm: (
    selectedProjectId: string,
    name: string,
  ) => Promise<void>
}

/**
 * Start Ongoing from archived Single: pick alternative (when needed) and
 * confirm an editable Analysis Name before create.
 */
export function StartOngoingFromArchiveDialog({
  open,
  alternatives,
  folderId,
  onCancel,
  onConfirm,
}: StartOngoingFromArchiveDialogProps) {
  const { t } = useI18n()
  const [state, setState] = useState(() =>
    initStartOngoingNameState(alternatives),
  )
  const [occupants, setOccupants] = useState<AnalysisNameOccupant[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [inlineError, setInlineError] = useState<"duplicate" | "generic" | null>(
    null,
  )
  const titleId = useId()
  const hintId = useId()
  const nameId = useId()
  const showAlternatives = alternatives.length > 1

  useEffect(() => {
    if (!open) return
    setState(initStartOngoingNameState(alternatives))
    setInlineError(null)
    setSubmitting(false)
    let cancelled = false
    void getAnalysisLibraryRepository()
      .listSummaries()
      .then((list) => {
        if (cancelled) return
        setOccupants(
          list.map((s) => ({
            id: s.id,
            name: s.name,
            folderId: s.folderId ?? null,
          })),
        )
      })
      .catch(() => {
        if (!cancelled) setOccupants([])
      })
    return () => {
      cancelled = true
    }
  }, [open, alternatives])

  if (!open) return null
  if (typeof document === "undefined") return null

  const validation = validateStartOngoingSubmit({
    name: state.name,
    selectedProjectId: state.selectedProjectId,
    folderId,
    analyses: occupants,
  })
  const nameConflict = validation === "duplicate_name"
  const canCreate =
    validation === "ok" && !submitting && Boolean(state.selectedProjectId)

  const submit = async () => {
    if (!state.selectedProjectId || submitting) return
    const check = validateStartOngoingSubmit({
      name: state.name,
      selectedProjectId: state.selectedProjectId,
      folderId,
      analyses: occupants,
    })
    if (check === "duplicate_name") {
      setInlineError("duplicate")
      return
    }
    if (check !== "ok") return

    setSubmitting(true)
    setInlineError(null)
    try {
      await onConfirm(state.selectedProjectId, state.name.trim())
    } catch (error) {
      setInlineError(
        isAnalysisNameConflictError(error) ? "duplicate" : "generic",
      )
      setSubmitting(false)
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[220] flex items-center justify-center bg-black/40 p-4"
      role="presentation"
      onClick={onCancel}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={showAlternatives ? hintId : undefined}
        className="w-full max-w-sm rounded-lg border border-border/60 bg-background p-4 shadow-md"
        onClick={(e) => e.stopPropagation()}
        data-start-ongoing-from-archive-dialog=""
      >
        <h2
          id={titleId}
          className="m-0 mb-1 font-sans text-[15px] font-medium text-foreground"
        >
          {t("library.startOngoingAnalysis")}
        </h2>
        {showAlternatives ? (
          <p
            id={hintId}
            className="m-0 mb-3 font-sans text-[12px] leading-snug text-muted-foreground"
          >
            {t("library.startOngoingChooseHint")}
          </p>
        ) : (
          <div className="mb-3" />
        )}
        {showAlternatives ? (
          <ul className="m-0 mb-3 list-none space-y-1 p-0">
            {alternatives.map((alt) => {
              const selected = alt.id === state.selectedProjectId
              return (
                <li key={alt.id}>
                  <button
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    className={cn(
                      "flex w-full rounded-md border px-3 py-2 text-left font-sans text-[13px]",
                      selected
                        ? "border-foreground/30 bg-muted/60 text-foreground"
                        : "border-border/50 text-foreground/90 hover:bg-muted/40",
                    )}
                    onClick={() => {
                      setState((prev) =>
                        applyAlternativeSelection(prev, alt.id, alternatives),
                      )
                      setInlineError(null)
                    }}
                  >
                    {alt.name}
                  </button>
                </li>
              )
            })}
          </ul>
        ) : null}
        <label
          htmlFor={nameId}
          className="mb-1 block font-sans text-[12px] text-muted-foreground"
        >
          {t("library.startOngoingNameLabel")}
        </label>
        <input
          id={nameId}
          autoFocus={!showAlternatives}
          className="mb-1 h-9 w-full rounded-md border border-border bg-background px-2 font-sans text-[13px]"
          value={state.name}
          aria-invalid={nameConflict || inlineError != null}
          onChange={(e) => {
            setState((prev) => applyManualNameEdit(prev, e.target.value))
            setInlineError(null)
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") void submit()
          }}
        />
        {nameConflict || inlineError === "duplicate" ? (
          <p
            className="m-0 mb-3 font-sans text-[12px] text-destructive"
            data-start-ongoing-name-conflict=""
          >
            {t("library.duplicateNameInFolder")}
          </p>
        ) : inlineError === "generic" ? (
          <p className="m-0 mb-3 font-sans text-[12px] text-destructive">
            {t("library.startOngoingFailed")}
          </p>
        ) : (
          <div className="mb-3" />
        )}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onCancel}>
            {t("common.cancel")}
          </Button>
          <Button type="button" disabled={!canCreate} onClick={() => void submit()}>
            {t("library.startOngoingCreate")}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
