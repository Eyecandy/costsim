/**
 * PDF Classic S-curve layout — pure helpers in PDF-local plot coordinates.
 *
 * Mirrors Classic semantics of the app S-curve (L-guides, shared Y-axis
 * percentile labels, X-axis cost labels) without mounting the React DOM chart
 * and without the app's 200×150 viewBox pads.
 */

import { formatSCurveYAxisPercentileTick } from "@/domain/results/sCurveClassicGuides"
import { formatSCurveCost, resolveSCurveCostDisplayScale } from "@/domain/results/sCurveHover"
import type { AppLanguage } from "@/domain/results/formatNumber"
import { formatPercentileLabel } from "@/domain/results/resultPreferences"

export { formatSCurveCost, resolveSCurveCostDisplayScale }

/** Print-safe L-guide stroke (thinner than SCURVE_CURVE_STROKE_WIDTH). */
export const PDF_SCURVE_GUIDE_STROKE_WIDTH = 0.65
export const PDF_SCURVE_MARKER_RADIUS = 1.9
export const PDF_SCURVE_TICK_FONT = 7
export const PDF_SCURVE_LABEL_FONT = 7
/** Ordinary Y-axis percentile levels (P-notation). */
export const PDF_SCURVE_Y_TICKS = [0, 0.25, 0.5, 0.75, 1] as const
/** Minimum PDF-unit vertical gap between Y labels sharing a lane. */
export const PDF_SCURVE_Y_LABEL_MIN_GAP = 8
/** Distance from plot-left to the right edge of Y label text, by lane. */
export const PDF_SCURVE_Y_LANE_DX = [4, 26] as const
/** First X cost-label row sits at the ordinary tick-text baseline. */
export const PDF_SCURVE_X_LABEL_BASE_DY = 11
export const PDF_SCURVE_X_LABEL_ROW_STEP = 8
export const PDF_SCURVE_X_LABEL_MAX_ROWS = 3
export const PDF_SCURVE_X_LABEL_PAD = 2
const PDF_SCURVE_TEXT_WIDTH_FACTOR = 0.55
const PDF_SCURVE_DASH_PATTERNS = ["2.5 2", "4 2.5", "1.5 1.5", "3 2"] as const

export type PdfSCurveGeometry = {
  plotLeft: number
  plotRight: number
  plotTop: number
  plotBottom: number
}

export type PdfSCurveGuideInput = {
  id: string
  color: string
  /** Project index — selects the dash pattern. */
  index: number
  markers: ReadonlyArray<{ percentile: number; value: number }>
}

export type PdfSCurveGuide = {
  projectId: string
  color: string
  dash: string
  percentile: number
  cost: number
  /** Curve intersection (PDF plot coordinates). */
  x: number
  y: number
  /** L-shaped path: left plot edge → intersection → baseline. */
  path: string
}

export type PdfSCurveYLabel = {
  key: string
  percentile: number
  /** True guide Y. */
  y: number
  labelY: number
  /** Text right-edge X. */
  x: number
  lane: number
  text: string
}

export type PdfSCurveXCostLabel = {
  key: string
  projectId: string
  color: string
  percentile: number
  cost: number
  x: number
  y: number
  row: number
  text: string
}

export type PdfSCurveCostScale = ReturnType<typeof resolveSCurveCostDisplayScale>

export function pdfSCurveXForValue(
  value: number,
  minX: number,
  maxX: number,
  geometry: PdfSCurveGeometry,
): number {
  const spanX = maxX - minX || 1
  return geometry.plotLeft + ((value - minX) / spanX) * (geometry.plotRight - geometry.plotLeft)
}

export function pdfSCurveYForProbability(probability: number, geometry: PdfSCurveGeometry): number {
  const p = Math.min(1, Math.max(0, probability))
  return geometry.plotBottom - p * (geometry.plotBottom - geometry.plotTop)
}

/** One chart-level cost scale for x ticks AND percentile costs. */
export function resolvePdfSCurveCostScale(minX: number, maxX: number): PdfSCurveCostScale {
  return resolveSCurveCostDisplayScale(minX, maxX)
}

export function formatPdfSCurveCost(
  cost: number,
  scale: PdfSCurveCostScale,
  language: AppLanguage,
): string {
  return formatSCurveCost(cost, scale, language)
}

export function estimatePdfTextWidth(text: string, fontSize: number): number {
  return Math.max(0, text.length) * fontSize * PDF_SCURVE_TEXT_WIDTH_FACTOR
}

export function pdfSCurveLGuidePath(x: number, y: number, geometry: PdfSCurveGeometry): string {
  return `M ${geometry.plotLeft.toFixed(2)} ${y.toFixed(2)} L ${x.toFixed(2)} ${y.toFixed(2)} L ${x.toFixed(2)} ${geometry.plotBottom.toFixed(2)}`
}

/** Unique marker percentiles across curves, ascending. */
export function uniquePdfMarkerPercentiles(
  curves: ReadonlyArray<{ markers: ReadonlyArray<{ percentile: number }> }>,
): number[] {
  const set = new Set<number>()
  for (const c of curves) {
    for (const m of c.markers) {
      if (Number.isFinite(m.percentile)) set.add(m.percentile)
    }
  }
  return [...set].sort((a, b) => a - b)
}

/**
 * L-guides per project × configured marker percentile.
 * Y position uses the true percentile probability; X uses the percentile cost.
 */
export function buildPdfClassicGuides(args: {
  curves: readonly PdfSCurveGuideInput[]
  minX: number
  maxX: number
  geometry: PdfSCurveGeometry
}): PdfSCurveGuide[] {
  const { geometry } = args
  const out: PdfSCurveGuide[] = []
  for (const curve of args.curves) {
    for (const m of curve.markers) {
      if (!Number.isFinite(m.value) || !Number.isFinite(m.percentile)) continue
      const rawX = pdfSCurveXForValue(m.value, args.minX, args.maxX, geometry)
      const x = Math.min(geometry.plotRight, Math.max(geometry.plotLeft, rawX))
      const y = pdfSCurveYForProbability(m.percentile / 100, geometry)
      out.push({
        projectId: curve.id,
        color: curve.color,
        dash: PDF_SCURVE_DASH_PATTERNS[curve.index % PDF_SCURVE_DASH_PATTERNS.length]!,
        percentile: m.percentile,
        cost: m.value,
        x,
        y,
        path: pdfSCurveLGuidePath(x, y, geometry),
      })
    }
  }
  return out
}

/**
 * Shared Y-axis emphasized labels — one per unique percentile.
 * Colliding labels move to an outer lane; only as a last resort is labelY nudged.
 */
export function layoutPdfClassicYLabels(
  percentiles: readonly number[],
  geometry: PdfSCurveGeometry,
): PdfSCurveYLabel[] {
  const levels = [...new Set(percentiles.filter((p) => Number.isFinite(p)))].sort((a, b) => a - b)
  const labels: PdfSCurveYLabel[] = levels.map((p) => {
    const y = pdfSCurveYForProbability(p / 100, geometry)
    return {
      key: `ylab-p${p}`,
      percentile: p,
      y,
      labelY: y,
      x: geometry.plotLeft - PDF_SCURVE_Y_LANE_DX[0],
      lane: 0,
      text: formatPercentileLabel(p),
    }
  })
  // Top → bottom (higher percentile = smaller y).
  labels.sort((a, b) => a.y - b.y)
  for (let i = 1; i < labels.length; i++) {
    const cur = labels[i]!
    const conflict = labels
      .slice(0, i)
      .some(
        (prev) =>
          prev.lane === cur.lane && Math.abs(cur.labelY - prev.labelY) < PDF_SCURVE_Y_LABEL_MIN_GAP,
      )
    if (conflict) {
      cur.lane = 1
      cur.x = geometry.plotLeft - PDF_SCURVE_Y_LANE_DX[1]
    }
  }
  for (let i = 1; i < labels.length; i++) {
    const cur = labels[i]!
    for (let j = 0; j < i; j++) {
      const prev = labels[j]!
      if (
        prev.lane === cur.lane &&
        Math.abs(cur.labelY - prev.labelY) < PDF_SCURVE_Y_LABEL_MIN_GAP
      ) {
        cur.labelY = prev.labelY + PDF_SCURVE_Y_LABEL_MIN_GAP
      }
    }
  }
  return labels
}

export type PdfSCurveOrdinaryYTick = {
  key: string
  probability: number
  y: number
  text: string
}

/**
 * Ordinary Y ticks in P-notation. A tick is dropped when an emphasized label
 * occupies the same percentile or sits too close in the primary lane.
 */
export function layoutPdfClassicOrdinaryYTicks(
  emphasized: readonly PdfSCurveYLabel[],
  geometry: PdfSCurveGeometry,
  ticks: readonly number[] = PDF_SCURVE_Y_TICKS,
): PdfSCurveOrdinaryYTick[] {
  const out: PdfSCurveOrdinaryYTick[] = []
  for (const p of ticks) {
    const percentilePoint = Math.round(p * 100)
    const y = pdfSCurveYForProbability(p, geometry)
    const hidden = emphasized.some(
      (l) =>
        l.percentile === percentilePoint ||
        (l.lane === 0 && Math.abs(l.labelY - y) < PDF_SCURVE_Y_LABEL_MIN_GAP),
    )
    if (hidden) continue
    out.push({
      key: `ytick-${percentilePoint}`,
      probability: p,
      y,
      text: formatSCurveYAxisPercentileTick(p),
    })
  }
  return out
}

/**
 * Cost labels beneath the x-axis for marker costs. Row 0 shares the ordinary
 * tick-text lane; colliding labels stack into the next row down.
 */
export function layoutPdfClassicXCostLabels(args: {
  guides: readonly PdfSCurveGuide[]
  scale: PdfSCurveCostScale
  language: AppLanguage
  geometry: PdfSCurveGeometry
  fontSize?: number
}): PdfSCurveXCostLabel[] {
  const fontSize = args.fontSize ?? PDF_SCURVE_LABEL_FONT
  const sorted = [...args.guides].sort(
    (a, b) => a.x - b.x || a.percentile - b.percentile || a.projectId.localeCompare(b.projectId),
  )
  const placed: Array<{ x: number; width: number; row: number }> = []
  const out: PdfSCurveXCostLabel[] = []
  for (const g of sorted) {
    const text = formatPdfSCurveCost(g.cost, args.scale, args.language)
    const width = estimatePdfTextWidth(text, fontSize)
    let row = 0
    while (row < PDF_SCURVE_X_LABEL_MAX_ROWS - 1) {
      const hit = placed.some(
        (p) =>
          p.row === row && Math.abs(g.x - p.x) < (width + p.width) / 2 + PDF_SCURVE_X_LABEL_PAD,
      )
      if (!hit) break
      row += 1
    }
    placed.push({ x: g.x, width, row })
    out.push({
      key: `${g.projectId}-p${g.percentile}`,
      projectId: g.projectId,
      color: g.color,
      percentile: g.percentile,
      cost: g.cost,
      x: g.x,
      y: args.geometry.plotBottom + PDF_SCURVE_X_LABEL_BASE_DY + row * PDF_SCURVE_X_LABEL_ROW_STEP,
      row,
      text,
    })
  }
  return out
}

/** Ordinary X tick text is hidden when it would overlap a row-0 cost label. */
export function shouldHidePdfOrdinaryXTick(args: {
  tickX: number
  tickText: string
  customLabels: readonly PdfSCurveXCostLabel[]
  fontSize?: number
}): boolean {
  const fontSize = args.fontSize ?? PDF_SCURVE_TICK_FONT
  const tickW = estimatePdfTextWidth(args.tickText, fontSize)
  return args.customLabels.some((l) => {
    if (l.row !== 0) return false
    const w = estimatePdfTextWidth(l.text, PDF_SCURVE_LABEL_FONT)
    return Math.abs(args.tickX - l.x) < (tickW + w) / 2 + PDF_SCURVE_X_LABEL_PAD
  })
}
