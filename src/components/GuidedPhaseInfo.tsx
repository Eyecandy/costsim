import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react"
import { createPortal } from "react-dom"
import { HelpCircle, X } from "lucide-react"

import { useOverlayPortalContainer } from "@/lib/overlayPortalContainer"
import { cn } from "@/lib/utils"

import type { GuidedPhaseInfoContent } from "@/domain/guided/guidedPhaseInfoContent"

export type { GuidedPhaseInfoContent }

type GuidedPhaseInfoProps = {
  content: GuidedPhaseInfoContent
  /** Stable id for tests / aria, e.g. estimateUncertainty | drivers | correlation | impact */
  topic: string
  className?: string
}

const PANEL_CLASS =
  "fixed z-[220] w-[min(22rem,calc(100vw-1.5rem))] max-h-[min(70vh,28rem)] overflow-y-auto rounded-md border border-border/70 bg-card px-3 py-3 text-left shadow-md"

/**
 * Phase-level contextual help for Guided Input.
 * Click-toggle popover (longer than LabelHelpTooltip); stays inside the guided session.
 * Portals into the browser fullscreen element when Focus owns true fullscreen.
 */
export function GuidedPhaseInfo({
  content,
  topic,
  className,
}: GuidedPhaseInfoProps) {
  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const titleId = useId()
  const [open, setOpen] = useState(false)
  const [position, setPosition] = useState({ top: 0, left: 0 })
  const portalContainer = useOverlayPortalContainer()

  const updatePosition = useCallback(() => {
    const trigger = triggerRef.current
    if (!trigger) return
    const triggerRect = trigger.getBoundingClientRect()
    const panelRect = panelRef.current?.getBoundingClientRect()
    const panelWidth = panelRect?.width ?? 352
    const panelHeight = panelRect?.height ?? 240
    const viewportPad = 8
    const gap = 8

    let left = triggerRect.left
    left = Math.max(
      viewportPad,
      Math.min(left, window.innerWidth - panelWidth - viewportPad),
    )

    let top = triggerRect.bottom + gap
    if (top + panelHeight > window.innerHeight - viewportPad) {
      top = Math.max(
        viewportPad,
        triggerRect.top - panelHeight - gap,
      )
    }

    setPosition({ top, left })
  }, [])

  useLayoutEffect(() => {
    if (!open) return
    updatePosition()
  }, [open, updatePosition, content, portalContainer])

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

  useEffect(() => {
    if (!open) return
    const onDocMouseDown = (event: MouseEvent) => {
      const target = event.target
      if (!(target instanceof Node)) return
      if (triggerRef.current?.contains(target)) return
      if (panelRef.current?.contains(target)) return
      setOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault()
        event.stopPropagation()
        setOpen(false)
        triggerRef.current?.focus()
      }
    }
    document.addEventListener("mousedown", onDocMouseDown)
    document.addEventListener("keydown", onKeyDown, true)
    return () => {
      document.removeEventListener("mousedown", onDocMouseDown)
      document.removeEventListener("keydown", onKeyDown, true)
    }
  }, [open])

  return (
    <span className={cn("inline-flex shrink-0 items-center", className)}>
      <button
        ref={triggerRef}
        type="button"
        className={cn(
          "inline-flex size-5 items-center justify-center rounded",
          "text-muted-foreground/55 hover:text-muted-foreground",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1d868c]/35",
        )}
        aria-label={content.title}
        aria-expanded={open}
        aria-controls={open ? titleId : undefined}
        data-guided-phase-info={topic}
        onClick={(event) => {
          event.stopPropagation()
          setOpen((prev) => !prev)
        }}
      >
        <HelpCircle className="size-3.5 stroke-[1.25]" aria-hidden />
      </button>
      {open && portalContainer
        ? createPortal(
            <div
              ref={panelRef}
              role="dialog"
              aria-modal="false"
              aria-labelledby={titleId}
              className={PANEL_CLASS}
              style={{ top: `${position.top}px`, left: `${position.left}px` }}
              data-guided-phase-info-panel={topic}
              onClick={(event) => event.stopPropagation()}
            >
              <div className="mb-2 flex items-start justify-between gap-2">
                <h4
                  id={titleId}
                  className="m-0 font-sans text-[13px] font-medium text-foreground"
                >
                  {content.title}
                </h4>
                <button
                  type="button"
                  className={cn(
                    "flex size-6 shrink-0 items-center justify-center rounded",
                    "text-muted-foreground hover:bg-muted hover:text-foreground",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1d868c]/35",
                  )}
                  aria-label={content.title}
                  data-guided-phase-info-close=""
                  onClick={() => {
                    setOpen(false)
                    triggerRef.current?.focus()
                  }}
                >
                  <X className="size-3.5" strokeWidth={2} aria-hidden />
                </button>
              </div>
              <div className="space-y-2.5">
                {content.meaning ? (
                  <HelpSection
                    label={content.meaningLabel}
                    body={content.meaning}
                  />
                ) : null}
                {content.discuss ? (
                  <HelpSection
                    label={content.discussLabel}
                    body={content.discuss}
                  />
                ) : null}
                {content.avoid ? (
                  <HelpSection label={content.avoidLabel} body={content.avoid} />
                ) : null}
              </div>
            </div>,
            portalContainer,
          )
        : null}
    </span>
  )
}

function HelpSection({ label, body }: { label: string; body: string }) {
  return (
    <div className="space-y-1">
      <p className="m-0 font-sans text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="m-0 whitespace-pre-line font-sans text-[12px] leading-snug text-muted-foreground">
        {body}
      </p>
    </div>
  )
}
