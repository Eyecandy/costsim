import { CHART_SVG_DATA_LABEL_FONT_SIZE } from "@/lib/chartPresentation"
import {
  plotXFromCost,
  plotYFromProbability,
} from "@/lib/sCurveHover"
import { formatPercentileLabel } from "@/lib/resultPreferences"
import { percentile } from "@/domain/simulation/stats"

/** Minimum plot-space gap before custom Y labels share a secondary outer lane. */
export const CLASSIC_Y_LABEL_MIN_GAP = 4.2
/** Minimum plot-space gap before custom X labels stack into the next outer row. */
export const CLASSIC_X_LABEL_MIN_GAP = 10

/**
 * Custom Y labels: lane 0 aligns with the ordinary tick-text lane so selected
 * percentiles can replace redundant tick text; lane 1 is further outward for
 * custom-vs-custom separation.
 */
export const CLASSIC_Y_CUSTOM_LANE_DX = [1.5, 5.8] as const
/**
 * Custom X labels: row 0 aligns with the ordinary tick-text lane; further rows
 * stack outward for custom-vs-custom separation.
 */
export const CLASSIC_X_CUSTOM_LANE_BASE = 1.9
export const CLASSIC_X_CUSTOM_LANE_STEP = 3.15
/** Extra SVG viewBox margin (left / bottom) used only in classic mode. */
export const CLASSIC_VIEWBOX_PAD_LEFT = 8
export const CLASSIC_VIEWBOX_PAD_BOTTOM = 12
/** Padding applied around estimated label boxes for overlap checks. */
export const CLASSIC_TICK_LABEL_COLLISION_PAD = 0.65
/** Approximate glyph width factor for SVG user-unit text estimates. */
export const CLASSIC_TEXT_WIDTH_FACTOR = 0.58

export type LabelBBox = {
  x: number
  y: number
  width: number
  height: number
}

export type ClassicGuideSeriesInput = {
  id: string
  values: readonly number[]
  colorVar: string
  /** Project index (dash pattern). */
  index: number
}

export type ClassicGuide = {
  projectId: string
  colorVar: string
  dash: string
  percentile: number
  cost: number
  /** Curve intersection X in SVG plot space. */
  x: number
  /** Curve intersection Y in SVG plot space (true percentile probability). */
  y: number
}

export type ClassicYAxisLabel = {
  percentile: number
  /** True guide Y (unchanged). */
  y: number
  /**
   * Drawn label Y — normally equals `y`; only nudged when even a secondary
   * outer lane cannot separate custom labels.
   */
  labelY: number
  /** 0 = primary outer lane, 1 = further outward. */
  lane: number
  text: string
}

export type ClassicXAxisLabel = {
  key: string
  projectId: string
  colorVar: string
  percentile: number
  cost: number
  /** Exact guide X (unchanged). */
  x: number
  /** Outer-lane stack row beneath normal tick labels (0, 1, 2…). */
  row: number
}

/**
 * Ordinary S-curve Y-axis tick label — shared P-notation (NO/EN).
 * Probability 0.25 → `P25`. Does not translate the leading `P`.
 */
export function formatSCurveYAxisPercentileTick(probability: number): string {
  if (!Number.isFinite(probability)) return formatPercentileLabel(0)
  return formatPercentileLabel(Math.round(probability * 100))
}

/**
 * Build classic L-guide intersections for each project × selected percentile.
 * Cost comes from the authoritative `percentile()` helper on simulation totals.
 */
export function buildClassicGuides(args: {
  series: readonly ClassicGuideSeriesInput[]
  markerPercentiles: readonly number[]
  axisMinX: number
  axisMaxX: number
  /** SVG viewBox width; defaults to base S-curve width. */
  chartWidth?: number
}): ClassicGuide[] {
  const levels = sanitizeMarkerLevels(args.markerPercentiles)
  const chartWidth = args.chartWidth
  const out: ClassicGuide[] = []
  for (const s of args.series) {
    for (const p of levels) {
      const cost = percentile(s.values, p)
      if (cost === null || !Number.isFinite(cost)) continue
      out.push({
        projectId: s.id,
        colorVar: s.colorVar,
        dash: s.index === 0 ? "1.8 1.8" : "4 2",
        percentile: p,
        cost,
        x: plotXFromCost(cost, args.axisMinX, args.axisMaxX, chartWidth),
        y: plotYFromProbability(p / 100),
      })
    }
  }
  return out
}

/**
 * One Y-axis percentile label per unique percentile.
 * Prefer outer lanes over moving along the data axis; nudge labelY only as last resort.
 */
export function layoutClassicYAxisLabels(
  percentiles: readonly number[],
): ClassicYAxisLabel[] {
  const levels = sanitizeMarkerLevels(percentiles)
  const base: ClassicYAxisLabel[] = levels.map((p) => ({
    percentile: p,
    y: plotYFromProbability(p / 100),
    labelY: plotYFromProbability(p / 100),
    lane: 0,
    text: formatPercentileLabel(p),
  }))
  // High percentiles sit higher on the chart (smaller y). Sort top→bottom.
  base.sort((a, b) => a.y - b.y)

  for (let i = 1; i < base.length; i++) {
    const cur = base[i]!
    let conflict = false
    for (let j = 0; j < i; j++) {
      const prev = base[j]!
      if (
        prev.lane === cur.lane &&
        Math.abs(cur.labelY - prev.labelY) < CLASSIC_Y_LABEL_MIN_GAP
      ) {
        conflict = true
        break
      }
    }
    if (conflict) {
      cur.lane = 1
    }
  }

  // Last resort: if still colliding in lane 1, nudge labelY outward in plot space
  // (down the chart) while keeping true guide `y` unchanged.
  for (let i = 1; i < base.length; i++) {
    const cur = base[i]!
    for (let j = 0; j < i; j++) {
      const prev = base[j]!
      if (
        prev.lane === cur.lane &&
        Math.abs(cur.labelY - prev.labelY) < CLASSIC_Y_LABEL_MIN_GAP
      ) {
        cur.labelY = prev.labelY + CLASSIC_Y_LABEL_MIN_GAP
      }
    }
  }

  return base
}

/**
 * X-axis cost labels in dedicated outer rows beneath normal tick labels.
 * Guide X remains exact; only the text row is staggered.
 */
export function layoutClassicXAxisLabels(
  guides: readonly ClassicGuide[],
): ClassicXAxisLabel[] {
  const sorted = [...guides].sort(
    (a, b) => a.x - b.x || a.percentile - b.percentile || a.projectId.localeCompare(b.projectId),
  )
  const out: ClassicXAxisLabel[] = []
  const active: { x: number; row: number }[] = []

  for (const g of sorted) {
    // Find the lowest row that does not collide with a nearby prior label.
    let row = 0
    for (;;) {
      const hits = active.some(
        (a) => a.row === row && g.x - a.x < CLASSIC_X_LABEL_MIN_GAP,
      )
      if (!hits) break
      row += 1
      if (row > 5) break
    }
    active.push({ x: g.x, row })
    out.push({
      key: `${g.projectId}-${g.percentile}`,
      projectId: g.projectId,
      colorVar: g.colorVar,
      percentile: g.percentile,
      cost: g.cost,
      x: g.x,
      row,
    })
  }
  return out
}

export function classicYLabelX(padX: number, lane: number): number {
  const dx =
    CLASSIC_Y_CUSTOM_LANE_DX[
      Math.min(lane, CLASSIC_Y_CUSTOM_LANE_DX.length - 1)
    ]!
  return padX - dx
}

export function classicXLabelY(axisBottomY: number, row: number): number {
  return axisBottomY + CLASSIC_X_CUSTOM_LANE_BASE + row * CLASSIC_X_CUSTOM_LANE_STEP
}

/**
 * Estimate an axis-label bounding box in SVG user units.
 * Used for Classic tick-vs-custom collision (not for layout math).
 */
export function estimateAxisLabelBBox(args: {
  text: string
  x: number
  y: number
  fontSize: number
  textAnchor: "start" | "middle" | "end"
  dominantBaseline: "middle" | "hanging" | "auto"
}): LabelBBox {
  const width = Math.max(
    args.fontSize,
    args.text.length * args.fontSize * CLASSIC_TEXT_WIDTH_FACTOR,
  )
  const height = args.fontSize * 1.15
  let x = args.x
  if (args.textAnchor === "middle") x -= width / 2
  else if (args.textAnchor === "end") x -= width

  let y = args.y
  if (args.dominantBaseline === "middle") y -= height / 2
  else if (args.dominantBaseline === "auto") y -= height

  return { x, y, width, height }
}

export function labelBBoxesOverlap(
  a: LabelBBox,
  b: LabelBBox,
  pad: number = CLASSIC_TICK_LABEL_COLLISION_PAD,
): boolean {
  return !(
    a.x + a.width + pad <= b.x ||
    b.x + b.width + pad <= a.x ||
    a.y + a.height + pad <= b.y ||
    b.y + b.height + pad <= a.y
  )
}

/**
 * Ordinary Y tick text is hidden when it duplicates an emphasized percentile
 * annotation (same Pxx) or intersects a custom percentile label box.
 */
export function shouldHideOrdinaryYTickLabel(args: {
  tickY: number
  tickText: string
  padX: number
  fontSize?: number
  customLabels: readonly ClassicYAxisLabel[]
  /** Prefer semantic hide when an emphasized Pxx occupies this percentile. */
  tickPercentile?: number
}): boolean {
  if (
    args.tickPercentile != null &&
    Number.isFinite(args.tickPercentile) &&
    args.customLabels.some((l) => l.percentile === args.tickPercentile)
  ) {
    return true
  }
  const fontSize = args.fontSize ?? 3
  const tickBox = estimateAxisLabelBBox({
    text: args.tickText,
    x: args.padX - 1.5,
    y: args.tickY,
    fontSize,
    textAnchor: "end",
    dominantBaseline: "middle",
  })
  for (const label of args.customLabels) {
    const customBox = estimateAxisLabelBBox({
      text: label.text,
      x: classicYLabelX(args.padX, label.lane),
      y: label.labelY,
      fontSize,
      textAnchor: "end",
      dominantBaseline: "middle",
    })
    if (labelBBoxesOverlap(tickBox, customBox)) return true
  }
  return false
}

/** Ordinary X tick text is hidden when it intersects any custom cost label. */
export function shouldHideOrdinaryXTickLabel(args: {
  tickX: number
  tickY: number
  tickText: string
  fontSize?: number
  customLabels: readonly {
    text: string
    x: number
    y: number
    fontSize?: number
  }[]
}): boolean {
  const fontSize = args.fontSize ?? 3
  const tickBox = estimateAxisLabelBBox({
    text: args.tickText,
    x: args.tickX,
    y: args.tickY,
    fontSize,
    textAnchor: "middle",
    dominantBaseline: "hanging",
  })
  for (const label of args.customLabels) {
    const customBox = estimateAxisLabelBBox({
      text: label.text,
      x: label.x,
      y: label.y,
      fontSize: label.fontSize ?? CHART_SVG_DATA_LABEL_FONT_SIZE,
      textAnchor: "middle",
      dominantBaseline: "hanging",
    })
    if (labelBBoxesOverlap(tickBox, customBox)) return true
  }
  return false
}

function sanitizeMarkerLevels(markerPercentiles: readonly number[]): number[] {
  const cleaned = markerPercentiles
    .filter((p) => Number.isFinite(p) && p >= 1 && p <= 99)
    .map((p) => Math.round(p))
  const unique = [...new Set(cleaned)].sort((a, b) => a - b)
  return unique.length > 0 ? unique : [50, 85]
}
