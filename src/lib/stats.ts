/**
 * Kun endelige tall; tom liste → null.
 */

export function mean(values: readonly number[]): number | null {
  const xs = values.filter((x) => Number.isFinite(x))
  if (xs.length === 0) return null
  return xs.reduce((a, b) => a + b, 0) / xs.length
}

/**
 * P50: samme som percentile(values, 50).
 */
export function median(values: readonly number[]): number | null {
  return percentile(values, 50)
}

/**
 * Sample standard deviation (population form: √(Σ(x−μ)² / n)).
 * Absolute currency units.
 */
export function standardDeviation(values: readonly number[]): number | null {
  const xs = values.filter((x) => Number.isFinite(x))
  if (xs.length === 0) return null
  if (xs.length === 1) return 0
  const mu = xs.reduce((a, b) => a + b, 0) / xs.length
  let sumSq = 0
  for (const x of xs) {
    const d = x - mu
    sumSq += d * d
  }
  return Math.sqrt(sumSq / xs.length)
}

/**
 * Relative standard deviation (%): absoluteStdDev / expectedValue × 100.
 * Denominator is Expected Value (mean) only — not Base Cost or P50.
 * Returns null when either input is null/non-finite or expectedValue is 0.
 */
export function relativeStandardDeviationPercent(
  absoluteStdDev: number | null,
  expectedValue: number | null,
): number | null {
  if (
    absoluteStdDev === null ||
    expectedValue === null ||
    !Number.isFinite(absoluteStdDev) ||
    !Number.isFinite(expectedValue) ||
    expectedValue === 0
  ) {
    return null
  }
  return (absoluteStdDev / expectedValue) * 100
}

/**
 * Empirical P(total ≤ threshold) on the sample, as a percentage 0–100.
 * Authoritative helper for probability-at-cost-level Key Figures
 * (Base Cost and user-entered “Probability below cost level”).
 * Equality counts as success (`<=`). Does not mutate or re-simulate.
 */
export function probabilityAtOrBelowPercent(
  values: readonly number[],
  threshold: number,
): number | null {
  if (!Number.isFinite(threshold)) return null
  const xs = values.filter((x) => Number.isFinite(x))
  if (xs.length === 0) return null
  let count = 0
  for (const x of xs) {
    if (x <= threshold) count += 1
  }
  return (count / xs.length) * 100
}

/**
 * p ∈ [0, 100] on an already ascending-sorted finite sample.
 * Same interpolation as {@link percentile} (R‑7-like on (n−1)·p/100).
 * Does not copy or sort. Empty → null; one value → that value.
 */
export function percentileFromSorted(
  sortedAscending: readonly number[],
  p: number,
): number | null {
  if (!Number.isFinite(p) || p < 0 || p > 100) return null
  const n = sortedAscending.length
  if (n === 0) return null
  if (n === 1) return sortedAscending[0]!
  const h = ((n - 1) * p) / 100
  const lo = Math.floor(h)
  const hi = Math.ceil(h)
  if (lo === hi) return sortedAscending[lo]!
  return (
    sortedAscending[lo]! +
    (h - lo) * (sortedAscending[hi]! - sortedAscending[lo]!)
  )
}

/**
 * Finite values only, ascending sort — shared prep for multi-percentile reads.
 */
export function sortedFiniteValues(
  values: readonly number[],
): number[] {
  return values
    .filter((x) => Number.isFinite(x))
    .slice()
    .sort((a, b) => a - b)
}

/**
 * p ∈ [0, 100]. Sorterer verdier stigende, plasserer (n−1)·p/100 på indeksen
 * og lineærinterpolerer mellom nærmeste observasjoner (typisk «R‑7»-lignende).
 * Én verdi → den verdien; tom / kun ikke‑endelige → null.
 */
export function percentile(values: readonly number[], p: number): number | null {
  if (!Number.isFinite(p) || p < 0 || p > 100) return null
  return percentileFromSorted(sortedFiniteValues(values), p)
}
