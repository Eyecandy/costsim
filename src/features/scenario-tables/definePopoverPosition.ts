import { clamp } from "@/domain/math"
const VIEWPORT_PAD = 8

const GAP = 8

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
