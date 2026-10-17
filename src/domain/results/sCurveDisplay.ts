import { computeEmpiricalCdf, type CdfPoint } from "@/domain/simulation/cdf"

/** Display-only point count per S-curve (full Monte Carlo arrays stay runtime-only). */
export const SCURVE_DISPLAY_POINT_TARGET = 800

/** Slightly tighter than the previous 1.6 app / 2.0 PDF curve strokes. */
export const SCURVE_CURVE_STROKE_WIDTH = 1.25
export const SCURVE_CURVE_STROKE_LINECAP = "butt" as const
export const SCURVE_CURVE_STROKE_LINEJOIN = "miter" as const

/** Shared plot proportion for inline, expanded, and PDF (4:3, rectangular). */
export const SCURVE_ASPECT_RATIO = 4 / 3
export const SCURVE_VIEWBOX_WIDTH = 200
export const SCURVE_VIEWBOX_HEIGHT = 150
/** Inner plot padding — shared by drawing and expanded hover mapping. */
export const SCURVE_PLOT_PAD_X = 10
export const SCURVE_PLOT_PAD_Y = 6
export const SCURVE_CURVE_TOP_PAD = SCURVE_PLOT_PAD_Y + 11.2
export const SCURVE_CURVE_BOTTOM_PAD = SCURVE_PLOT_PAD_Y + 7
export const SCURVE_PLOT_ASPECT_CLASS = "aspect-[4/3]"
/**
 * Available-width shell for the S-curve plot.
 * Larger than the prior 30rem / 42rem caps so the inline chart reads clearly
 * while aspect-[4/3] keeps height proportional. Outer card padding supplies
 * breathing room so the plot does not hug the edges.
 */
export const SCURVE_INLINE_SHELL_CLASS = "mx-auto w-full max-w-[min(100%,36rem)]"
export const SCURVE_EXPANDED_SHELL_CLASS = "mx-auto w-full max-w-[min(100%,48rem)]"

/**
 * Evenly index into a sorted CDF so the visible polyline stays deterministic,
 * monotonic, and includes the first and last points.
 */
export function downsampleCdfPointsForDisplay(
  points: readonly CdfPoint[],
  targetCount: number = SCURVE_DISPLAY_POINT_TARGET,
): CdfPoint[] {
  const n = points.length
  if (n === 0) return []
  if (n <= targetCount) return [...points]

  const count = Math.max(2, Math.min(targetCount, n))
  const sampled: CdfPoint[] = []
  let lastIdx = -1
  for (let i = 0; i < count; i++) {
    const idx = Math.round((i * (n - 1)) / (count - 1))
    if (idx === lastIdx) continue
    sampled.push(points[idx]!)
    lastIdx = idx
  }
  if (sampled[0] !== points[0]) {
    sampled.unshift(points[0]!)
  }
  const last = points[n - 1]!
  if (sampled[sampled.length - 1] !== last) {
    sampled.push(last)
  }
  return sampled
}

/** Reduced S-curve polyline from full simulation values. Does not replace statistics. */
export function computeSCurveDisplaySeries(
  values: readonly number[],
  targetCount: number = SCURVE_DISPLAY_POINT_TARGET,
): CdfPoint[] {
  return downsampleCdfPointsForDisplay(computeEmpiricalCdf(values), targetCount)
}
