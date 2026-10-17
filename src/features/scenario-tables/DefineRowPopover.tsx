import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react"
import { createPortal } from "react-dom"

import { cn } from "@/shared/utils"

const VIEWPORT_PAD = 8
const GAP = 8
const PREFERRED_WIDTH = 352

function portalRoot(): HTMLElement {
  return document.getElementById("portal") ?? document.body
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n))
}

/** Place a panel near an anchor: prefer right, then left, then below/above. */
export function positionDefinePopover(
  anchor: DOMRect,
  panelWidth: number,
  panelHeight: number,
  viewport: { width: number; height: number } = {
    width: typeof window !== "undefined" ? window.innerWidth : 1024,
    height: typeof window !== "undefined" ? window.innerHeight : 768,
  },
): { top: number; left: number } {
  const vw = viewport.width
  const vh = viewport.height
  const maxLeft = Math.max(VIEWPORT_PAD, vw - panelWidth - VIEWPORT_PAD)
  const maxTop = Math.max(VIEWPORT_PAD, vh - panelHeight - VIEWPORT_PAD)

  const spaceRight = vw - anchor.right - GAP - VIEWPORT_PAD
  const spaceLeft = anchor.left - GAP - VIEWPORT_PAD

  let left: number
  let top: number

  if (spaceRight >= panelWidth || spaceRight >= spaceLeft) {
    left = clamp(anchor.right + GAP, VIEWPORT_PAD, maxLeft)
    top = clamp(anchor.top, VIEWPORT_PAD, maxTop)
    if (top + panelHeight > vh - VIEWPORT_PAD) {
      const above = anchor.bottom - panelHeight
      if (above >= VIEWPORT_PAD) top = above
      else top = maxTop
    }
    return { top, left }
  }

  if (spaceLeft >= panelWidth * 0.5) {
    left = clamp(anchor.left - GAP - panelWidth, VIEWPORT_PAD, maxLeft)
    top = clamp(anchor.top, VIEWPORT_PAD, maxTop)
    if (top + panelHeight > vh - VIEWPORT_PAD) {
      const above = anchor.bottom - panelHeight
      if (above >= VIEWPORT_PAD) top = above
      else top = maxTop
    }
    return { top, left }
  }

  // Narrow viewport: below (or above) the anchor.
  left = clamp(anchor.right - panelWidth, VIEWPORT_PAD, maxLeft)
  top = anchor.bottom + GAP
  if (top + panelHeight > vh - VIEWPORT_PAD) {
    top = clamp(anchor.top - GAP - panelHeight, VIEWPORT_PAD, maxTop)
  } else {
    top = clamp(top, VIEWPORT_PAD, maxTop)
  }
  return { top, left }
}

type DefineRowPopoverProps = {
  /** Resolve the live anchor element (icon or row-right fallback). */
  getAnchor: () => HTMLElement | null
  /** When false, unmount. */
  open: boolean
  /** Reposition when the selected row / definition state changes. */
  anchorKey: string
  /** Called when the anchor is gone / not measurable (e.g. scrolled away). */
  onAnchorLost?: () => void
  children: ReactNode
  className?: string
  /** Optional kind marker for tests / styling (cost vs driver). */
  popoverKind?: "cost" | "driver"
}

/**
 * Row-anchored definition editor surface.
 * Portaled into `#portal` so grid overflow cannot clip it and App outside-click
 * treats interaction as inside the editing surface.
 */
export function DefineRowPopover({
  getAnchor,
  open,
  anchorKey,
  onAnchorLost,
  children,
  className,
  popoverKind,
}: DefineRowPopoverProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState({ top: 0, left: 0 })

  const updatePosition = useCallback(() => {
    const measure = (anchor: HTMLElement) => {
      const anchorRect = anchor.getBoundingClientRect()
      if (anchorRect.width === 0 && anchorRect.height === 0) {
        onAnchorLost?.()
        return
      }
      if (
        anchorRect.bottom < 0 ||
        anchorRect.top > window.innerHeight ||
        anchorRect.right < 0 ||
        anchorRect.left > window.innerWidth
      ) {
        onAnchorLost?.()
        return
      }
      const panelRect = panelRef.current?.getBoundingClientRect()
      const panelWidth = panelRect?.width ?? PREFERRED_WIDTH
      const panelHeight = panelRect?.height ?? 160
      setPosition(positionDefinePopover(anchorRect, panelWidth, panelHeight))
    }

    const anchor = getAnchor()
    if (!anchor) {
      // First paint may race the row anchor mount — retry once.
      requestAnimationFrame(() => {
        const retry = getAnchor()
        if (!retry) {
          onAnchorLost?.()
          return
        }
        measure(retry)
      })
      return
    }
    measure(anchor)
  }, [getAnchor, onAnchorLost])

  useLayoutEffect(() => {
    if (!open) return
    updatePosition()
  }, [open, updatePosition, children, anchorKey])

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

  if (!open || typeof document === "undefined") return null

  return createPortal(
    <div
      ref={panelRef}
      role="dialog"
      aria-modal="false"
      data-define-row-popover=""
      data-define-popover-kind={popoverKind}
      className={cn(
        "fixed z-[120] w-[min(22rem,calc(100vw-1.5rem))] rounded-md border border-border/80 bg-card p-2.5 shadow-md",
        className,
      )}
      style={{ top: position.top, left: position.left }}
    >
      {children}
    </div>,
    portalRoot(),
  )
}

type DefineRowPreviewTooltipProps = {
  getAnchor: () => HTMLElement | null
  open: boolean
  text: string
  anchorKey: string
}

/** Lightweight read-only hover preview of a saved definition. */
export function DefineRowPreviewTooltip({
  getAnchor,
  open,
  text,
  anchorKey,
}: DefineRowPreviewTooltipProps) {
  const tipRef = useRef<HTMLSpanElement>(null)
  const [position, setPosition] = useState({ top: 0, left: 0 })

  const updatePosition = useCallback(() => {
    const anchor = getAnchor()
    if (!anchor) return
    const anchorRect = anchor.getBoundingClientRect()
    const tipRect = tipRef.current?.getBoundingClientRect()
    const tipWidth = tipRect?.width ?? 280
    const tipHeight = tipRect?.height ?? 48
    setPosition(positionDefinePopover(anchorRect, tipWidth, tipHeight))
  }, [getAnchor])

  useLayoutEffect(() => {
    if (!open) return
    updatePosition()
  }, [open, updatePosition, text, anchorKey])

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

  if (!open || text.trim() === "" || typeof document === "undefined") return null

  return createPortal(
    <span
      ref={tipRef}
      role="tooltip"
      data-define-row-preview=""
      className="pointer-events-none fixed z-[130] max-w-[min(20rem,calc(100vw-2rem))] whitespace-pre-wrap break-words rounded-md border border-border/70 bg-card px-2.5 py-2 text-left text-[11px] leading-snug text-muted-foreground shadow-sm"
      style={{ top: position.top, left: position.left }}
    >
      {text}
    </span>,
    portalRoot(),
  )
}
