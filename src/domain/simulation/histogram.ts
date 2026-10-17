export type HistogramBin = {
  count: number
  low: number
  high: number
}

/** Sturges-style bin count, clamped for readability on screen. */
export function suggestedBinCount(sampleSize: number): number {
  if (sampleSize <= 0) return 0
  const k = Math.ceil(1 + Math.log2(sampleSize))
  return Math.min(32, Math.max(10, k))
}

/**
 * Equal-width bins from min(values) to max(values).
 * Values land in [low, high) for each bin except the last, which includes max.
 */
export function computeHistogram(
  values: readonly number[],
  binCount: number,
): HistogramBin[] {
  const xs = values.filter((x) => Number.isFinite(x))
  if (xs.length === 0) return []

  let minV = xs[0]!
  let maxV = xs[0]!
  for (let i = 1; i < xs.length; i++) {
    const v = xs[i]!
    if (v < minV) minV = v
    if (v > maxV) maxV = v
  }

  if (minV === maxV) {
    return [{ count: xs.length, low: minV, high: maxV }]
  }

  const bins = Math.max(1, Math.min(binCount, xs.length))
  const width = (maxV - minV) / bins
  const counts = new Array<number>(bins).fill(0)

  for (const v of xs) {
    let i = Math.floor((v - minV) / width)
    if (i >= bins) i = bins - 1
    if (i < 0) i = 0
    counts[i]!++
  }

  return counts.map((count, i) => ({
    count,
    low: minV + i * width,
    high: i === bins - 1 ? maxV : minV + (i + 1) * width,
  }))
}
