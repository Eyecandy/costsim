import {
  SCURVE_CURVE_BOTTOM_PAD,
  SCURVE_CURVE_TOP_PAD,
  SCURVE_PLOT_PAD_X,
  SCURVE_PLOT_PAD_Y,
  SCURVE_VIEWBOX_HEIGHT,
  SCURVE_VIEWBOX_WIDTH,
} from "@/domain/results/sCurveDisplay"
import {
  formatWaterfallValueWithScale,
  resolveWaterfallDisplayScale,
  type WaterfallDisplayScale,
} from "@/domain/results/formatWaterfallValue"
import type { AppLanguage } from "@/domain/results/formatNumber"

export function sortFiniteValues(values: readonly number[]): number[] {
  return values
    .filter((v) => Number.isFinite(v))
    .slice()
    .sort((a, b) => a - b)
}

/**
 * Empirical CDF F(cost) = #{v ≤ cost} / n on a pre-sorted finite sample.
 * Binary search; does not allocate. Below-range → 0, above-range → 1.
 */
export function cumulativeProbabilityAtCost(
  sortedAscending: readonly number[],
  cost: number,
): number {
  const n = sortedAscending.length
  if (n === 0 || !Number.isFinite(cost)) return 0
  if (cost < sortedAscending[0]!) return 0
  if (cost >= sortedAscending[n - 1]!) return 1

  let lo = 0
  let hi = n
  while (lo < hi) {
    const mid = (lo + hi) >>> 1
    if (sortedAscending[mid]! <= cost) lo = mid + 1
    else hi = mid
  }
  return lo / n
}

export function wholePercentileLabel(probability: number): string {
  if (!Number.isFinite(probability)) return "P0"
  const p = Math.min(100, Math.max(0, Math.round(probability * 100)))
  return `P${p}`
}

export function plotInnerWidth(chartWidth: number = SCURVE_VIEWBOX_WIDTH): number {
  return chartWidth - SCURVE_PLOT_PAD_X * 2
}

export function plotInnerHeight(curveTopPad: number = SCURVE_CURVE_TOP_PAD): number {
  return SCURVE_VIEWBOX_HEIGHT - curveTopPad - SCURVE_CURVE_BOTTOM_PAD
}

export function costFromPlotX(
  plotX: number,
  axisMinX: number,
  axisMaxX: number,
  chartWidth: number = SCURVE_VIEWBOX_WIDTH,
): number {
  const innerW = plotInnerWidth(chartWidth)
  const spanX = axisMaxX - axisMinX || 1
  return axisMinX + ((plotX - SCURVE_PLOT_PAD_X) / innerW) * spanX
}

export function plotXFromCost(
  cost: number,
  axisMinX: number,
  axisMaxX: number,
  chartWidth: number = SCURVE_VIEWBOX_WIDTH,
): number {
  const innerW = plotInnerWidth(chartWidth)
  const spanX = axisMaxX - axisMinX || 1
  return SCURVE_PLOT_PAD_X + ((cost - axisMinX) / spanX) * innerW
}

export function plotYFromProbability(
  probability: number,
  curveTopPad: number = SCURVE_CURVE_TOP_PAD,
): number {
  const p = Math.min(1, Math.max(0, probability))
  return SCURVE_VIEWBOX_HEIGHT - SCURVE_CURVE_BOTTOM_PAD - p * plotInnerHeight(curveTopPad)
}

export function isInsideSCurvePlot(
  plotX: number,
  plotY: number,
  chartWidth: number = SCURVE_VIEWBOX_WIDTH,
  curveTopPad: number = SCURVE_CURVE_TOP_PAD,
): boolean {
  return (
    plotX >= SCURVE_PLOT_PAD_X &&
    plotX <= chartWidth - SCURVE_PLOT_PAD_X &&
    plotY >= curveTopPad &&
    plotY <= SCURVE_VIEWBOX_HEIGHT - SCURVE_PLOT_PAD_Y
  )
}

export function clientPointToViewBox(
  clientX: number,
  clientY: number,
  svgRect: { left: number; top: number; width: number; height: number },
  viewBoxWidth: number = SCURVE_VIEWBOX_WIDTH,
  viewBoxHeight: number = SCURVE_VIEWBOX_HEIGHT,
): { x: number; y: number } | null {
  if (svgRect.width <= 0 || svgRect.height <= 0) return null
  return {
    x: ((clientX - svgRect.left) / svgRect.width) * viewBoxWidth,
    y: ((clientY - svgRect.top) / svgRect.height) * viewBoxHeight,
  }
}

export type SCurveHoverProjectInput = {
  id: string
  label: string
  sortedValues: readonly number[]
}

export type SCurveHoverProjectRow = {
  id: string
  label: string
  probability: number
  percentileLabel: string
}

/** Same cost for every project; row order matches chart/legend order. */
export function hoverRowsAtCost(
  projects: readonly SCurveHoverProjectInput[],
  cost: number,
): SCurveHoverProjectRow[] {
  return projects.map((project) => {
    const probability = cumulativeProbabilityAtCost(project.sortedValues, cost)
    return {
      id: project.id,
      label: project.label,
      probability,
      percentileLabel: wholePercentileLabel(probability),
    }
  })
}

/**
 * One chart-level monetary display scale for the entire S-curve
 * (x-axis ticks, P50/P85/selected labels, hover).
 * Based on the shared axis domain — not per-label magnitude.
 */
export function resolveSCurveCostDisplayScale(
  axisMinX: number,
  axisMaxX: number,
): WaterfallDisplayScale {
  return resolveWaterfallDisplayScale([axisMinX, axisMaxX])
}

/** @deprecated Prefer {@link resolveSCurveCostDisplayScale}. */
export const resolveSCurveHoverCostScale = resolveSCurveCostDisplayScale

/** Format one S-curve cost using a chart-level scale (display only). */
export function formatSCurveCost(
  cost: number,
  scale: WaterfallDisplayScale,
  language: AppLanguage,
): string {
  return formatWaterfallValueWithScale(cost, scale, language)
}

/** @deprecated Prefer {@link formatSCurveCost}. */
export const formatSCurveHoverCost = formatSCurveCost

/** Prefer tooltip to the right of the crosshair; flip near the right edge. */
export function scurveTooltipPlacement(
  plotX: number,
  chartWidth: number = SCURVE_VIEWBOX_WIDTH,
): "right" | "left" {
  const innerW = plotInnerWidth(chartWidth)
  const t = (plotX - SCURVE_PLOT_PAD_X) / innerW
  return t > 0.62 ? "left" : "right"
}

export const SCURVE_HOVER_CROSSHAIR_STROKE_WIDTH = 0.45
export const SCURVE_HOVER_MARKER_RADIUS = 1.35

/**
 * Active inspection cost: pinned cost wins over live hover.
 * Both are chart-domain costs (not pixel positions).
 */
export function activeSCurveInspectionCost(
  pinnedCost: number | null,
  hoverCost: number | null,
): number | null {
  return pinnedCost ?? hoverCost
}

/**
 * Simple pin toggle: click while unpinned freezes hoverCost;
 * click while pinned always clears the pin (does not move it).
 */
export function togglePinnedCost(
  pinnedCost: number | null,
  hoverCost: number | null,
): number | null {
  if (pinnedCost !== null) return null
  return hoverCost
}
