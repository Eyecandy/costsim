import { formatNumber } from "@/domain/results/formatNumber"
import { niceTickStep } from "@/pdf/shared/chartGeometry"

/** Place S-curve on page 1 only when the metrics table stays compact. */
export const PDF_COVER_ALWAYS_ONE_PAGE = true

/** @deprecated S-curve is never on the cover; kept only if external imports remain. */
export const PDF_SCURVE_ON_PAGE1_MAX_PROJECTS = 0

export function generateXAxisTicks(minX: number, maxX: number): number[] {
  const span = maxX - minX || 1
  let step = niceTickStep(span / 7)
  let start = Math.floor(minX / step) * step
  let end = Math.ceil(maxX / step) * step
  const ticks: number[] = []
  let guard = 0
  for (let x = start; x <= end + step * 1e-6 && guard < 24; x += step, guard++) {
    ticks.push(x)
  }
  if (ticks.length > 12) {
    step *= 2
    start = Math.floor(minX / step) * step
    end = Math.ceil(maxX / step) * step
    ticks.length = 0
    guard = 0
    for (let x = start; x <= end + step * 1e-6 && guard < 24; x += step, guard++) {
      ticks.push(x)
    }
  }
  return ticks
}

export function formatSignedMillions(value: number): string {
  if (!Number.isFinite(value)) return "—"
  const sign = value >= 0 ? "+" : "-"
  const millions = Math.abs(value) / 1_000_000
  const rounded = millions < 0.05 ? 0 : Math.round(millions * 10) / 10
  const body = formatNumber(rounded, Number.isInteger(rounded) ? 0 : 1, "en")
  return `${sign}${body}M`
}
