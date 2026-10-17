import { useEffect, useId, useRef, type ReactNode } from "react"
import { createPortal } from "react-dom"
import { X } from "lucide-react"

import { buttonVariants } from "@/shared/ui/button"
import { useOverlayPortalContainer } from "@/shared/overlayPortalContainer"
import { cn } from "@/shared/utils"

export type ExpandedChartDialogProps = {
  open: boolean
  title: string
  /** Optional project / alternative name shown above the chart title. */
  subtitle?: ReactNode
  closeLabel: string
  onClose: () => void
  children: ReactNode
}

/**
 * Large overlay for inspecting an existing result chart.
 * Renders the same chart component (via children) in a wider viewport —
 * suitable for later expanded-only S-curve interaction without a separate modal.
 * Portals into the active fullscreen element when Focus is fullscreen.
 */
export function ExpandedChartDialog({
  open,
  title,
  subtitle,
  closeLabel,
  onClose,
  children,
}: ExpandedChartDialogProps) {
  const titleId = useId()
  const closeBtnRef = useRef<HTMLButtonElement | null>(null)
  const portalContainer = useOverlayPortalContainer()

  useEffect(() => {
    if (!open) return
    closeBtnRef.current?.focus()
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault()
        event.stopPropagation()
        onClose()
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [open, onClose])

  if (!open) return null
  if (!portalContainer) return null

  return createPortal(
    <div
      className="fixed inset-0 z-[220] flex items-center justify-center bg-black/40 p-3 sm:p-5"
      role="presentation"
      onClick={onClose}
      data-expanded-chart-dialog=""
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={cn(
          "flex max-h-[min(92vh,56rem)] w-[min(92vw,72rem)] flex-col overflow-hidden",
          "rounded-lg border border-border/60 bg-background shadow-md",
        )}
        onClick={(e) => e.stopPropagation()}
        data-expanded-chart-surface=""
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-border/50 px-4 py-3">
          <div className="min-w-0 space-y-0.5">
            {subtitle ? (
              <p className="flex min-w-0 items-center gap-1.5 font-sans text-[11px] font-medium text-muted-foreground">
                {subtitle}
              </p>
            ) : null}
            <h2
              id={titleId}
              className="section-heading m-0 text-[12px] tracking-wide text-foreground/90"
            >
              {title}
            </h2>
          </div>
          <button
            ref={closeBtnRef}
            type="button"
            className={buttonVariants({
              variant: "ghost",
              size: "icon-sm",
              className: "shrink-0 text-muted-foreground hover:text-foreground",
            })}
            aria-label={closeLabel}
            onClick={onClose}
            data-expanded-chart-close=""
          >
            <X className="size-4" strokeWidth={2} aria-hidden />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-auto px-4 py-4 sm:px-5 sm:py-5">{children}</div>
      </div>
    </div>,
    portalContainer,
  )
}
