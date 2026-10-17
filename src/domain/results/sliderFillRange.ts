/** Visual fill of a range slider as a segment of the track, not native accent-color. */

export type SliderFillRange = {
  startPct: number
  endPct: number
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function valueToPct(value: number, min: number, max: number): number {
  const span = max - min
  if (!(span > 0)) return 0
  return ((clamp(value, min, max) - min) / span) * 100
}

/**
 * Track fill from `origin` to `value`, as percentages of the slider span.
 *
 * Impact: origin = min (0) so 60 fills 0→60%.
 * Correlation: origin = 0 so +0.6 fills midpoint→positive, −0.6 fills negative→midpoint.
 */
export function sliderFillRangePct(
  value: number,
  min: number,
  max: number,
  origin: number,
): SliderFillRange {
  const originPct = valueToPct(origin, min, max)
  const valuePct = valueToPct(value, min, max)
  return {
    startPct: Math.min(originPct, valuePct),
    endPct: Math.max(originPct, valuePct),
  }
}
