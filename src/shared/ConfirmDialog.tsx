import { useEffect, useRef } from "react"
import { createPortal } from "react-dom"

import { Button } from "@/shared/ui/button"
import {
  resolveOverlayPortalContainer,
  useOverlayPortalContainer,
} from "@/shared/overlayPortalContainer"
import { cn } from "@/shared/utils"

type ConfirmDialogProps = {
  open: boolean
  /** Optional short title above the message. */
  title?: string
  message: string
  cancelLabel: string
  confirmLabel: string
  /** Defaults to outline; use destructive for irreversible checkpoint actions. */
  confirmVariant?: "outline" | "destructive"
  onCancel: () => void
  onConfirm: () => void
}

export function ConfirmDialog({
  open,
  title,
  message,
  cancelLabel,
  confirmLabel,
  confirmVariant = "outline",
  onCancel,
  onConfirm,
}: ConfirmDialogProps) {
  const confirmBtnRef = useRef<HTMLButtonElement | null>(null)
  // Re-render when fullscreen changes; resolve fresh at portal time for Focus.
  const trackedContainer = useOverlayPortalContainer()

  useEffect(() => {
    if (!open) return
    confirmBtnRef.current?.focus()
  }, [open])

  if (!open) return null
  if (typeof document === "undefined") return null

  // Fresh resolve so contained Focus host is found even if the hook last
  // synced before Focus mounted; trackedContainer keeps FS enter/exit live.
  void trackedContainer
  const portalTarget = resolveOverlayPortalContainer()

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 p-4"
      role="presentation"
      onClick={(e) => {
        if (e.target !== e.currentTarget) return
        onCancel()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title ?? message}
        aria-describedby={title ? "confirm-dialog-message" : undefined}
        className={cn(
          "w-full max-w-sm rounded-lg border border-border/60 bg-background p-4 shadow-md",
        )}
        data-confirm-dialog=""
      >
        {title ? (
          <h2 className="m-0 mb-2 font-sans text-[15px] font-medium text-foreground">{title}</h2>
        ) : null}
        <p
          id={title ? "confirm-dialog-message" : undefined}
          className={cn("section-body leading-relaxed")}
        >
          {message}
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button
            ref={confirmBtnRef}
            type="button"
            variant={confirmVariant}
            size="sm"
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>,
    portalTarget,
  )
}
