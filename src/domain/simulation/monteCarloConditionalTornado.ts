/**
 * Legacy Monte Carlo conditional Tornado (non-production).
 *
 * Kept for method-comparison tests. User-facing Tornado uses
 * `computeDeterministicTornadoRows` in `deterministicTornado.ts`.
 */
import type { SimulationInputSeriesItem } from "@/domain/simulation/simulation"
import { percentile } from "@/domain/simulation/stats"

export type MonteCarloConditionalTornadoRow = {
  name: string
  type: "cost" | "driver"
  sourceSeriesIndex: number
  lowImpact: number
  highImpact: number
  spread: number
}

export function computeMonteCarloConditionalTornadoRows(
  totals: readonly number[],
  inputSeries: readonly SimulationInputSeriesItem[],
  topN = 12,
): MonteCarloConditionalTornadoRow[] {
  if (totals.length === 0 || inputSeries.length === 0) return []
  const baseline = percentile(totals, 50)
  if (baseline === null) return []

  const rows: MonteCarloConditionalTornadoRow[] = []
  for (let i = 0; i < inputSeries.length; i++) {
    const s = inputSeries[i]!
    if (s.values.length !== totals.length || s.values.length === 0) continue
    const p10 = percentile(s.values, 10)
    const p90 = percentile(s.values, 90)
    if (p10 === null || p90 === null) continue
    const p10Totals = collectTotalsForBand(
      s.values,
      totals,
      Number.NEGATIVE_INFINITY,
      p10,
    )
    const p90Totals = collectTotalsForBand(
      s.values,
      totals,
      p90,
      Number.POSITIVE_INFINITY,
    )
    const p10Total = percentile(p10Totals, 50)
    const p90Total = percentile(p90Totals, 50)
    if (p10Total === null || p90Total === null) continue
    const lowImpact = p10Total - baseline
    const highImpact = p90Total - baseline
    rows.push({
      name: s.name,
      type: s.type,
      sourceSeriesIndex: i,
      lowImpact,
      highImpact,
      spread: highImpact - lowImpact,
    })
  }

  rows.sort((a, b) => b.spread - a.spread)
  return rows.slice(0, Math.max(0, topN))
}

function collectTotalsForBand(
  variable: readonly number[],
  totals: readonly number[],
  minInclusive: number,
  maxInclusive: number,
): number[] {
  const out: number[] = []
  for (let i = 0; i < variable.length; i++) {
    const v = variable[i]
    const t = totals[i]
    if (v === undefined || t === undefined) continue
    if (!Number.isFinite(v) || !Number.isFinite(t)) continue
    if (v >= minInclusive && v <= maxInclusive) out.push(t)
  }
  return out
}
