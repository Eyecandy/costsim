import { useEffect, useId, useRef, useState } from "react"
import { createPortal } from "react-dom"

import { Button } from "@/shared/ui/button"
import { Input } from "@/shared/ui/input"
import { useI18n } from "@/i18n/useI18n"
import {
  resolveOverlayPortalContainer,
  useOverlayPortalContainer,
} from "@/shared/overlayPortalContainer"

type CreateNextCheckpointDialogProps = {
  open: boolean
  nextSequence: number
  sourceSequence: number
  sourceName: string
  onCancel: () => void
  onCreate: (name: string) => void
}

/**
 * Lightweight naming dialog for Checkpoint N+1.
 * Sequence is fixed; name/decision point is optional user text.
 */
export function CreateNextCheckpointDialog({
  open,
  nextSequence,
  sourceSequence,
  sourceName,
  onCancel,
  onCreate,
}: CreateNextCheckpointDialogProps) {
  const { t } = useI18n()
  const [name, setName] = useState("")
  const inputRef = useRef<HTMLInputElement | null>(null)
  const titleId = useId()
  const hintId = useId()
  const trackedContainer = useOverlayPortalContainer()

  useEffect(() => {
    if (!open) return
    setName("")
    const tId = window.setTimeout(() => inputRef.current?.focus(), 0)
    return () => window.clearTimeout(tId)
  }, [open])

  if (!open) return null
  if (typeof document === "undefined") return null

  void trackedContainer
  const portalTarget = resolveOverlayPortalContainer()

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
        aria-describedby={hintId}
        className="w-full max-w-sm rounded-lg border border-border/60 bg-background p-4 shadow-md"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id={titleId} className="m-0 mb-3 font-sans text-[15px] font-medium text-foreground">
          {t("checkpoints.nextDialogTitle").replace("{n}", String(nextSequence))}
        </h2>
        <label
          htmlFor="next-checkpoint-name"
          className="mb-1 block font-sans text-[12px] text-muted-foreground"
        >
          {t("checkpoints.nextNameLabel")}
        </label>
        <Input
          ref={inputRef}
          id="next-checkpoint-name"
          value={name}
          maxLength={80}
          placeholder={t("checkpoints.nextNamePlaceholder").replace("{n}", String(nextSequence))}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault()
              onCreate(name)
            }
            if (e.key === "Escape") {
              e.preventDefault()
              onCancel()
            }
          }}
        />
        <p id={hintId} className="mt-2 font-sans text-[11px] leading-snug text-muted-foreground">
          {t("checkpoints.nextCreatedFrom")
            .replace("{n}", String(sourceSequence))
            .replace("{name}", sourceName)}
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
            {t("common.cancel")}
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => onCreate(name)}>
            {t("checkpoints.nextCreate")}
          </Button>
        </div>
      </div>
    </div>,
    portalTarget,
  )
}
