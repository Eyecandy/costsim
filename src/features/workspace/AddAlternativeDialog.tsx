import { useEffect, useId, useRef, useState } from "react"
import { createPortal } from "react-dom"

import { Button } from "@/shared/ui/button"
import { useI18n } from "@/i18n/useI18n"
import { cn } from "@/shared/utils"

export type AddAlternativeSourceOption = {
  id: string
  name: string
}

type AddAlternativeDialogProps = {
  open: boolean
  sources: AddAlternativeSourceOption[]
  onClose: () => void
  onCreateBlank: () => void
  onCopyExisting: (sourceId: string) => void
}

/**
 * Compact choice: blank alternative vs copy an existing one.
 */
export function AddAlternativeDialog({
  open,
  sources,
  onClose,
  onCreateBlank,
  onCopyExisting,
}: AddAlternativeDialogProps) {
  const { t } = useI18n()
  const titleId = useId()
  const [mode, setMode] = useState<"choose" | "copy">("choose")
  const [sourceId, setSourceId] = useState<string>("")
  const firstOptionRef = useRef<HTMLButtonElement | null>(null)
  const selectRef = useRef<HTMLSelectElement | null>(null)

  useEffect(() => {
    if (!open) return
    setMode("choose")
    setSourceId(sources[0]?.id ?? "")
    const tId = window.setTimeout(() => firstOptionRef.current?.focus(), 0)
    return () => window.clearTimeout(tId)
  }, [open, sources])

  useEffect(() => {
    if (!open || mode !== "copy") return
    const tId = window.setTimeout(() => selectRef.current?.focus(), 0)
    return () => window.clearTimeout(tId)
  }, [open, mode])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault()
        onClose()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, onClose])

  if (!open || typeof document === "undefined") return null

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 p-4"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="w-full max-w-sm rounded-lg border border-border/60 bg-background p-4 shadow-md"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id={titleId} className="m-0 mb-3 font-sans text-[15px] font-medium text-foreground">
          {t("projects.addAlternativeTitle")}
        </h2>

        {mode === "choose" ? (
          <div className="flex flex-col gap-2">
            <button
              ref={firstOptionRef}
              type="button"
              className={cn(
                "rounded-md border border-border/60 px-3 py-2.5 text-left",
                "hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              )}
              onClick={onCreateBlank}
            >
              <span className="block font-sans text-[13px] font-medium text-foreground">
                {t("projects.newAlternative")}
              </span>
              <span className="mt-0.5 block font-sans text-[12px] text-muted-foreground">
                {t("projects.newAlternativeHint")}
              </span>
            </button>
            <button
              type="button"
              className={cn(
                "rounded-md border border-border/60 px-3 py-2.5 text-left",
                "hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                sources.length === 0 && "pointer-events-none opacity-40",
              )}
              disabled={sources.length === 0}
              onClick={() => setMode("copy")}
            >
              <span className="block font-sans text-[13px] font-medium text-foreground">
                {t("projects.copyExisting")}
              </span>
              <span className="mt-0.5 block font-sans text-[12px] text-muted-foreground">
                {t("projects.copyExistingHint")}
              </span>
            </button>
            <div className="mt-1 flex justify-end">
              <Button type="button" variant="ghost" size="sm" onClick={onClose}>
                {t("common.cancel")}
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <label className="flex flex-col gap-1.5">
              <span className="font-sans text-[12px] font-medium text-foreground">
                {t("projects.copyFrom")}
              </span>
              <select
                ref={selectRef}
                className="h-9 w-full rounded-md border border-border bg-background px-2 font-sans text-[13px]"
                value={sourceId}
                onChange={(e) => setSourceId(e.target.value)}
              >
                {sources.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => setMode("choose")}>
                {t("common.cancel")}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!sourceId}
                onClick={() => {
                  if (!sourceId) return
                  onCopyExisting(sourceId)
                }}
              >
                {t("projects.copyExisting")}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}
