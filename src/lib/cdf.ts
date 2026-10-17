export type CdfPoint = {
  x: number
  y: number
}

/**
 * Empirisk CDF fra rå simulering: sortert x og kumulativ andel y i [0, 1].
 */
export function computeEmpiricalCdf(values: readonly number[]): CdfPoint[] {
  const xs = values.filter((v) => Number.isFinite(v)).sort((a, b) => a - b)
  const n = xs.length
  if (n === 0) return []

  const points: CdfPoint[] = [{ x: xs[0]!, y: 0 }]
  for (let i = 0; i < n; i++) {
    points.push({ x: xs[i]!, y: (i + 1) / n })
  }
  return points
}
