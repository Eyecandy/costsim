/**
 * Tornado chart layout bounds shared by inline and expanded views.
 * Expanded mode uses a centered inner shell with equal name/plot tracks
 * so the bars do not visually dominate the factor names.
 */

export const TORNADO_VIEW_W = 100
export const TORNADO_VIEW_H = 8
export const TORNADO_ROW_PX = 28
export const TORNADO_PAD_X = 2
export const TORNADO_CENTER_X = TORNADO_VIEW_W / 2
export const TORNADO_BAR_H = 2.4
export const TORNADO_LABEL_FONT_SIZE = 2.4

/** Natural width of one row SVG if aspect ratio of the viewBox is preserved at ROW_PX height. */
export const TORNADO_NATURAL_PLOT_WIDTH_PX = TORNADO_ROW_PX * (TORNADO_VIEW_W / TORNADO_VIEW_H)

/**
 * Equal flexible tracks for name and plot.
 * Used for both inline (full panel) and expanded (inside a capped shell).
 */
export const TORNADO_BALANCED_GRID_TEMPLATE_COLUMNS = "minmax(0, 1fr) minmax(0, 1fr)"

/** @deprecated Alias — prefer TORNADO_BALANCED_GRID_TEMPLATE_COLUMNS. */
export const TORNADO_INLINE_GRID_TEMPLATE_COLUMNS = TORNADO_BALANCED_GRID_TEMPLATE_COLUMNS

/** Expanded: modestly taller rows for easier inspection of the six factors. */
export const TORNADO_EXPANDED_ROW_PX = 36
export const TORNADO_EXPANDED_BAR_H = 2.9
export const TORNADO_EXPANDED_LABEL_FONT_SIZE = 2.7

/**
 * Centered shell for the whole Tornado unit inside the large modal.
 * ~56rem ≈ 896px: with a 50/50 grid each track is ≈ natural plot width at
 * expanded row height, so bars enlarge with the figure without dominating.
 */
export const TORNADO_EXPANDED_INNER_MAX_CLASS = "mx-auto w-full max-w-[min(100%,56rem)]"

/** Compact gap between name and plot (same as Tailwind gap-x-3). */
export const TORNADO_COLUMN_GAP_CLASS = "gap-x-3"

export type TornadoModeMetrics = {
  rowPx: number
  barH: number
  labelFontSize: number
  gridTemplateColumns: string
  /** Expanded fills the balanced shell; no separate fixed plot pixel width. */
  plotWidthPx: number | null
  preserveAspectRatio: "none" | "xMidYMid meet"
  maxHClass: string
  /** When true, grid stretches to the inner shell (equal columns). */
  fillShellWidth: boolean
}

export function tornadoModeMetrics(expanded: boolean): TornadoModeMetrics {
  if (!expanded) {
    return {
      rowPx: TORNADO_ROW_PX,
      barH: TORNADO_BAR_H,
      labelFontSize: TORNADO_LABEL_FONT_SIZE,
      gridTemplateColumns: TORNADO_BALANCED_GRID_TEMPLATE_COLUMNS,
      plotWidthPx: null,
      preserveAspectRatio: "none",
      maxHClass: "max-h-7",
      fillShellWidth: true,
    }
  }
  return {
    rowPx: TORNADO_EXPANDED_ROW_PX,
    barH: TORNADO_EXPANDED_BAR_H,
    labelFontSize: TORNADO_EXPANDED_LABEL_FONT_SIZE,
    gridTemplateColumns: TORNADO_BALANCED_GRID_TEMPLATE_COLUMNS,
    plotWidthPx: null,
    preserveAspectRatio: "none",
    maxHClass: "max-h-9",
    fillShellWidth: true,
  }
}

export function tornadoPlotRegionStyle(expanded: boolean): {
  width: string
  maxWidth?: string
  minWidth?: string
} {
  // Both modes: plot track fills its equal flexible column.
  void expanded
  return { width: "100%", minWidth: "6rem" }
}

export function tornadoPreserveAspectRatio(expanded: boolean): "none" | "xMidYMid meet" {
  return tornadoModeMetrics(expanded).preserveAspectRatio
}

export function tornadoHalfSpan(sidePadUnits: number): number {
  return TORNADO_CENTER_X - (TORNADO_PAD_X + sidePadUnits)
}

export function tornadoSidePadUnits(rightMarginPx: number): number {
  return Math.max(1.2, Math.min(8, rightMarginPx / 10))
}

export function tornadoValueToX(
  value: number,
  maxAbs: number,
  halfSpan: number,
  centerX: number = TORNADO_CENTER_X,
): number {
  const m = Math.max(maxAbs, 1e-12)
  return centerX + (value / m) * halfSpan
}

export function tornadoBarRect(
  value: number,
  maxAbs: number,
  halfSpan: number,
  centerX: number = TORNADO_CENTER_X,
): { x: number; w: number } | null {
  if (!Number.isFinite(value) || value === 0) return null
  const x0 = tornadoValueToX(0, maxAbs, halfSpan, centerX)
  const xv = tornadoValueToX(value, maxAbs, halfSpan, centerX)
  const x = Math.min(x0, xv)
  const w = Math.abs(xv - x0)
  if (!(w > 0)) return null
  return { x, w }
}

export function tornadoBarLength(value: number, maxAbs: number, halfSpan: number): number {
  if (!Number.isFinite(value) || value === 0) return 0
  return (Math.abs(value) / Math.max(maxAbs, 1e-12)) * halfSpan
}
