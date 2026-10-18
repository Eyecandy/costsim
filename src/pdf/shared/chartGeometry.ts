/** Plot rectangle of a PDF chart, in PDF points. `plotBottom` is the y of probability 0. */
export type ChartGeometry = {
  plotLeft: number
  plotBottom: number
  innerWidth: number
  innerHeight: number
}

/** Round a rough tick spacing to 1, 2, 5 or 10 times a power of ten. */
export function niceTickStep(rough: number): number {
  if (!Number.isFinite(rough) || rough <= 0) return 1
  const exp = Math.floor(Math.log10(rough))
  const f = rough / 10 ** exp
  const nf = f < 1.5 ? 1 : f < 3.5 ? 2 : f < 7.5 ? 5 : 10
  return nf * 10 ** exp
}

/** Coordinate helpers for an S-curve style chart (x = value, y = probability 0..1). */
export function createChartGeometry(g: ChartGeometry) {
  const xForValue = (value: number, minX: number, maxX: number): number => {
    const spanX = maxX - minX || 1
    return g.plotLeft + ((value - minX) / spanX) * g.innerWidth
  }
  const yForProbability = (p: number): number => g.plotBottom - p * g.innerHeight
  const pathFromPoints = (
    points: { x: number; y: number }[],
    minX: number,
    maxX: number,
  ): string => {
    if (points.length === 0) return ""
    return points
      .map((p, idx) => {
        const x = xForValue(p.x, minX, maxX)
        const y = yForProbability(p.y)
        return `${idx === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`
      })
      .join(" ")
  }
  return { xForValue, yForProbability, pathFromPoints }
}
