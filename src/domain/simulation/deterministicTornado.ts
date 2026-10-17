/**
 * Production Tornado: deterministic one-factor-at-a-time P10 / mode / P90.
 *
 * Uses user-entered percentile inputs directly (not calibrated triangular
 * support). Correlation is ignored. Driver impacts use the same multiplicative
 * model as simulation via `computeTotalFromSampledValues`.
 */
import {
  computeBaseCostSum,
  buildSimulationDriverImpactMatrix,
  normalizeIncurredCosts,
  type Project,
} from "@/domain/analysis/project"
import {
  parseNumberField,
  parseCostForSimulation,
  parseDriverForSimulation,
  type CostElementRow,
  type DriverRow,
} from "@/domain/results/tableRows"
import {
  computeTotalFromSampledValues,
  type DriverImpactMatrix,
} from "@/domain/simulation/simulation"

export type DeterministicTornadoRow = {
  name: string
  type: "cost" | "driver"
  /**
   * Stable factor index among tornado candidates (costs first, then drivers).
   * Used for list reconciliation; not an MC series index.
   */
  sourceSeriesIndex: number
  /** totalAtP10 − referenceValue (allModeTotal) */
  lowImpact: number
  /** totalAtP90 − referenceValue (allModeTotal) */
  highImpact: number
  /** max(low, high) − min(low, high) */
  spread: number
}

export type DeterministicTornadoComputation = {
  /** App Base Cost (incurred + Σ cost likely). Unchanged semantics. */
  baseCost: number
  /** All factors at mode — Tornado chart center / referenceValue. */
  referenceValue: number
  rows: DeterministicTornadoRow[]
}

const DEFAULT_TOP_N = 12
const IMPACT_NEAR_ZERO = 1e-9

function nearZeroToZero(n: number): number {
  return Math.abs(n) < IMPACT_NEAR_ZERO ? 0 : n
}

/** User-implied absolute P10 / mode / P90 for a cost row (before triangular support). */
export function costUserPercentileAbsolutes(row: CostElementRow): {
  p10: number
  mode: number
  p90: number
} | null {
  const mode = parseNumberField(row.likely)
  const optPct = parseNumberField(row.optimistic)
  const pesPct = parseNumberField(row.pessimistic)
  if (mode === null || optPct === null || pesPct === null) return null
  if (!(mode > 0)) return null
  return {
    p10: mode * (1 + optPct / 100),
    mode,
    p90: mode * (1 + pesPct / 100),
  }
}

/** User-entered driver P10 / mode / P90 in percent points. */
export function driverUserPercentiles(row: DriverRow): {
  p10: number
  mode: number
  p90: number
} | null {
  const p10 = parseNumberField(row.optimistic)
  const mode = parseNumberField(row.likely)
  const p90 = parseNumberField(row.pessimistic)
  if (p10 === null || mode === null || p90 === null) return null
  return { p10, mode, p90 }
}

function parseTornadoFactors(project: Project): {
  costRows: CostElementRow[]
  driverRows: DriverRow[]
  costModes: number[]
  costP10: number[]
  costP90: number[]
  driverModes: number[]
  driverP10: number[]
  driverP90: number[]
  driverImpacts: DriverImpactMatrix
  incurredCosts: number
  baseCost: number
} | null {
  const costParsed = project.costRows
    .map((row) => ({ row, abs: costUserPercentileAbsolutes(row) }))
    .filter(
      (x): x is { row: CostElementRow; abs: NonNullable<typeof x.abs> } =>
        x.abs !== null && parseCostForSimulation(x.row) !== null,
    )
  if (costParsed.length === 0) return null

  const driverParsed = project.driverRows
    .map((row) => ({ row, pct: driverUserPercentiles(row) }))
    .filter(
      (x): x is { row: DriverRow; pct: NonNullable<typeof x.pct> } =>
        x.pct !== null && parseDriverForSimulation(x.row) !== null,
    )

  const costRows = costParsed.map((x) => x.row)
  const driverRows = driverParsed.map((x) => x.row)
  const incurredCosts = normalizeIncurredCosts(project.incurredCosts)
  const baseCost = computeBaseCostSum(costRows, incurredCosts)
  if (baseCost === null) return null

  return {
    costRows,
    driverRows,
    costModes: costParsed.map((x) => x.abs.mode),
    costP10: costParsed.map((x) => x.abs.p10),
    costP90: costParsed.map((x) => x.abs.p90),
    driverModes: driverParsed.map((x) => x.pct.mode),
    driverP10: driverParsed.map((x) => x.pct.p10),
    driverP90: driverParsed.map((x) => x.pct.p90),
    driverImpacts: buildSimulationDriverImpactMatrix(costRows, driverRows, project.driverImpacts),
    incurredCosts,
    baseCost,
  }
}

function tornadoSpread(lowImpact: number, highImpact: number): number {
  return Math.max(lowImpact, highImpact) - Math.min(lowImpact, highImpact)
}

/**
 * Full deterministic Tornado computation (reference + ranked rows).
 * Correlation is intentionally unused.
 */
export function computeDeterministicTornado(
  project: Project,
  topN: number = DEFAULT_TOP_N,
): DeterministicTornadoComputation | null {
  const parsed = parseTornadoFactors(project)
  if (!parsed) return null

  const {
    costRows,
    driverRows,
    costModes,
    costP10,
    costP90,
    driverModes,
    driverP10,
    driverP90,
    driverImpacts,
    incurredCosts,
    baseCost,
  } = parsed

  const totalAt = (costValues: readonly number[], driverPctValues: readonly number[]) =>
    computeTotalFromSampledValues({
      costValues,
      driverPctValues,
      driverImpacts,
      incurredCosts,
    })

  const referenceValue = totalAt(costModes, driverModes)
  const rows: DeterministicTornadoRow[] = []

  for (let c = 0; c < costRows.length; c++) {
    const costsP10 = costModes.map((v, i) => (i === c ? costP10[c]! : v))
    const costsP90 = costModes.map((v, i) => (i === c ? costP90[c]! : v))
    const lowImpact = nearZeroToZero(totalAt(costsP10, driverModes) - referenceValue)
    const highImpact = nearZeroToZero(totalAt(costsP90, driverModes) - referenceValue)
    rows.push({
      name: costRows[c]!.name.trim() || `Kost ${c + 1}`,
      type: "cost",
      sourceSeriesIndex: c,
      lowImpact,
      highImpact,
      spread: tornadoSpread(lowImpact, highImpact),
    })
  }

  for (let d = 0; d < driverRows.length; d++) {
    const driversAtP10 = driverModes.map((v, i) => (i === d ? driverP10[d]! : v))
    const driversAtP90 = driverModes.map((v, i) => (i === d ? driverP90[d]! : v))
    const lowImpact = nearZeroToZero(totalAt(costModes, driversAtP10) - referenceValue)
    const highImpact = nearZeroToZero(totalAt(costModes, driversAtP90) - referenceValue)
    rows.push({
      name: driverRows[d]!.name.trim() || `Driver ${d + 1}`,
      type: "driver",
      sourceSeriesIndex: costRows.length + d,
      lowImpact,
      highImpact,
      spread: tornadoSpread(lowImpact, highImpact),
    })
  }

  rows.sort((a, b) => {
    const d = b.spread - a.spread
    if (d !== 0) return d
    return a.sourceSeriesIndex - b.sourceSeriesIndex
  })

  return {
    baseCost,
    referenceValue,
    rows: rows.slice(0, Math.max(0, topN)),
  }
}

/** Production Tornado rows for charts / PDF / AI Brief. */
export function computeDeterministicTornadoRows(
  project: Project,
  topN: number = DEFAULT_TOP_N,
): DeterministicTornadoRow[] {
  return computeDeterministicTornado(project, topN)?.rows ?? []
}
