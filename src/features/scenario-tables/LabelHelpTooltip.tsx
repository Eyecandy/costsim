import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { HelpCircle } from "lucide-react"

import { cn } from "@/shared/utils"

type LabelHelpTooltipProps = {
  label: string
  tooltip: string
  /** Help icon only (label rendered elsewhere, e.g. grid cell). */
  iconOnly?: boolean
  className?: string
  labelClassName?: string
}

const TOOLTIP_CLASS =
  "pointer-events-none fixed z-[120] w-max max-w-[min(22rem,calc(100vw-2rem))] rounded-md border border-border/70 bg-card px-2.5 py-2 text-left text-[11px] leading-snug text-muted-foreground shadow-sm"

/** Inline label with help icon; tooltip portaled to document.body (same as cost-table toolbar help). */
export function LabelHelpTooltip({
  label,
  tooltip,
  iconOnly = false,
  className,
  labelClassName,
}: LabelHelpTooltipProps) {
  const triggerRef = useRef<HTMLButtonElement>(null)
  const tooltipRef = useRef<HTMLSpanElement>(null)
  const [open, setOpen] = useState(false)
  const [position, setPosition] = useState({ top: 0, left: 0 })

  const updatePosition = useCallback(() => {
    const trigger = triggerRef.current
    if (!trigger) return
    const triggerRect = trigger.getBoundingClientRect()
    const tooltipRect = tooltipRef.current?.getBoundingClientRect()
    const tooltipWidth = tooltipRect?.width ?? 320
    const tooltipHeight = tooltipRect?.height ?? 72
    const viewportPad = 8
    const gap = 6

    let left = triggerRect.left
    left = Math.max(viewportPad, Math.min(left, window.innerWidth - tooltipWidth - viewportPad))

    let top = triggerRect.top - tooltipHeight - gap
    if (top < viewportPad) {
      top = Math.min(
        triggerRect.bottom + gap,
        window.innerHeight - tooltipHeight - viewportPad,
      )
    }

    setPosition({ top, left })
  }, [])

  useLayoutEffect(() => {
    if (!open) return
    updatePosition()
  }, [open, updatePosition, tooltip])

  useEffect(() => {
    if (!open) return
    const onViewportChange = () => updatePosition()
    window.addEventListener("resize", onViewportChange)
    window.addEventListener("scroll", onViewportChange, true)
    return () => {
      window.removeEventListener("resize", onViewportChange)
      window.removeEventListener("scroll", onViewportChange, true)
    }
  }, [open, updatePosition])

  return (
    <span
      className={cn("relative inline-flex min-w-0 max-w-full items-center gap-1", className)}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocusCapture={() => setOpen(true)}
      onBlurCapture={(event) => {
        const next = event.relatedTarget
        if (!(next instanceof Node) || !event.currentTarget.contains(next)) {
          setOpen(false)
        }
      }}
    >
      {!iconOnly ? (
        <span className={cn("truncate", labelClassName)}>{label}</span>
      ) : null}
      <button
        ref={triggerRef}
        type="button"
        className="inline-flex size-4 shrink-0 items-center justify-center rounded text-muted-foreground/55 hover:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        aria-label={tooltip}
      >
        <HelpCircle className="size-3.5 stroke-[1.25]" aria-hidden />
      </button>
      {open && typeof document !== "undefined"
        ? createPortal(
            <span
              ref={tooltipRef}
              role="tooltip"
              className={TOOLTIP_CLASS}
              style={{
                top: `${position.top}px`,
                left: `${position.left}px`,
              }}
            >
              {tooltip}
            </span>,
            document.body,
          )
        : null}
    </span>
  )
}
