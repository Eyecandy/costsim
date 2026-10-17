import { mean, median, percentile } from "@/domain/simulation/stats"
import {
  type CostCorrelationPrepResult,
  prepareCostCorrelationCholesky,
  sampleCorrelatedUniforms,
} from "@/domain/simulation/costCorrelation"
import { triangularParamsFromPercentiles } from "@/domain/simulation/triangularCalibration"

/** Inverse CDF of a triangular distribution from uniform probability u ∈ [0, 1]. */
export function triangularQuantile(min: number, mode: number, max: number, u: number): number {
  if (max <= min) return mode

  const clampedU = Math.min(1, Math.max(0, u))
  const c = (mode - min) / (max - min)

  if (clampedU < c) {
    return min + Math.sqrt(clampedU * (max - min) * (mode - min))
  }
  return max - Math.sqrt((1 - clampedU) * (max - min) * (max - mode))
}

export function sampleTriangular(min: number, mode: number, max: number) {
  return triangularQuantile(min, mode, max, Math.random())
}

export type SampleSummary = {
  mean: number | null
  median: number | null
  p85: number | null
  min: number | null
  max: number | null
}

export function summarizeSamples(results: number[]): SampleSummary {
  const xs = results.filter((x) => Number.isFinite(x))
  if (xs.length === 0) {
    return {
      mean: null,
      median: null,
      p85: null,
      min: null,
      max: null,
    }
  }
  return {
    mean: mean(xs),
    median: median(xs),
    p85: percentile(xs, 85),
    min: Math.min(...xs),
    max: Math.max(...xs),
  }
}

export function runSimulation({
  runs,
  min,
  mode,
  max,
}: {
  runs: number
  min: number
  mode: number
  max: number
}) {
  const results: number[] = []

  for (let i = 0; i < runs; i++) {
    results.push(sampleTriangular(min, mode, max))
  }

  return summarizeSamples(results)
}

export type TriangularParams = { min: number; mode: number; max: number }

/**
 * Kost: P = mest sannsynlig (absolutt), optimistisk/pessimistisk som % av P.
 * Brukerinput tolkes som P10 / mode / P90 (ikke harde min/max-grenser).
 * Kalibrerer trekantens matematiske støtte [low, high] før sampling.
 */
export function costAbsoluteLikelyToTriangular(opts: {
  base: number
  optimisticPercent: number
  pessimisticPercent: number
}): TriangularParams | null {
  const { base, optimisticPercent, pessimisticPercent } = opts
  if (!(base > 0 && Number.isFinite(base))) return null
  if (!Number.isFinite(optimisticPercent) || !Number.isFinite(pessimisticPercent)) {
    return null
  }
  const p10 = base * (1 + optimisticPercent / 100)
  const mode = base
  const p90 = base * (1 + pessimisticPercent / 100)
  return triangularParamsFromPercentiles(p10, mode, p90)
}

export type SimulationTotalSummary = SampleSummary

export type SimulationInputSeriesItem = {
  name: string
  type: "cost" | "driver"
  values: number[]
}

/** `[costIndex][driverIndex]` impact weights 0–100. Omitted → all 100%. */
export type DriverImpactMatrix = readonly (readonly number[])[]

function resolveImpactPct(
  driverImpacts: DriverImpactMatrix | undefined,
  costIndex: number,
  driverIndex: number,
): number {
  const row = driverImpacts?.[costIndex]
  const raw = row?.[driverIndex]
  return raw === undefined ? 100 : raw
}

/**
 * Per-cost driver factor: Π_d (1 + p_d/100 × impact_{c,d}/100).
 * Pure helper for tests and the simulation loop.
 */
export function driverFactorForCostItem(
  driverPctValues: readonly number[],
  impactsForCost: readonly number[],
): number {
  let factor = 1
  for (let d = 0; d < driverPctValues.length; d++) {
    const p = driverPctValues[d]!
    const impact = impactsForCost[d] ?? 100
    factor *= 1 + (p / 100) * (impact / 100)
  }
  return factor
}

/**
 * Total from pre-sampled cost and driver values (one Monte Carlo draw).
 * adjustedCost[c] = cost[c] × driverFactorForCostItem(drivers, impacts[c]).
 */
export function computeTotalFromSampledValues(opts: {
  costValues: readonly number[]
  driverPctValues: readonly number[]
  driverImpacts?: DriverImpactMatrix
  incurredCosts?: number
}): number {
  const { costValues, driverPctValues, driverImpacts } = opts
  const incurred = Number.isFinite(opts.incurredCosts) ? Math.max(0, opts.incurredCosts!) : 0
  let total = 0
  for (let c = 0; c < costValues.length; c++) {
    const impactsForCost: number[] = []
    for (let d = 0; d < driverPctValues.length; d++) {
      impactsForCost.push(resolveImpactPct(driverImpacts, c, d))
    }
    total += costValues[c]! * driverFactorForCostItem(driverPctValues, impactsForCost)
  }
  return total + incurred
}

/**
 * Per trekk: sample costs and drivers, scale each cost by per-item driver factors, sum.
 * Missing impact matrix → all impacts 100% (legacy global-driver behavior).
 */
export function simulateAggregateCostWithDriversValues(opts: {
  runs: number
  costTriangles: TriangularParams[]
  drivers: TriangularParams[]
  driverImpacts?: DriverImpactMatrix
  /** Latent Gaussian-copula correlation matrix; omitted → independent. */
  costCorrelation?: number[][]
  incurredCosts?: number
}): { values: number[]; costCorrelationPrep: CostCorrelationPrepResult } {
  const { runs, costTriangles, drivers, driverImpacts } = opts
  const incurred = Number.isFinite(opts.incurredCosts) ? Math.max(0, opts.incurredCosts!) : 0
  const results: number[] = new Array(runs)
  const costCorrelationPrep = resolveCostCorrelationPrep(costTriangles.length, opts.costCorrelation)

  for (let i = 0; i < runs; i++) {
    const costValues = sampleCostValuesFromMarginals(costTriangles, costCorrelationPrep)
    const driverPctValues: number[] = []
    for (const d of drivers) {
      driverPctValues.push(sampleTriangular(d.min, d.mode, d.max))
    }
    results[i] = computeTotalFromSampledValues({
      costValues,
      driverPctValues,
      driverImpacts,
      incurredCosts: incurred,
    })
  }

  return { values: results, costCorrelationPrep }
}

/** Adds fixed incurred costs to each simulated total (uncertain part unchanged). */
export function applyIncurredCostsToSamples(
  values: readonly number[],
  incurredCosts: number,
): number[] {
  const incurred = Number.isFinite(incurredCosts) ? Math.max(0, incurredCosts) : 0
  if (incurred === 0) return [...values]
  return values.map((v) => v + incurred)
}

export function simulateAggregateCostWithDriversValuesAndSeries(opts: {
  runs: number
  costTriangles: TriangularParams[]
  drivers: TriangularParams[]
  driverImpacts?: DriverImpactMatrix
  costCorrelation?: number[][]
  costNames?: readonly string[]
  driverNames?: readonly string[]
  /** Fixed known costs added to each run total after uncertain simulation. */
  incurredCosts?: number
}): {
  values: number[]
  inputSeries: SimulationInputSeriesItem[]
  costCorrelationPrep: CostCorrelationPrepResult
} {
  const { runs, costTriangles, drivers, driverImpacts } = opts
  const incurred = Number.isFinite(opts.incurredCosts) ? Math.max(0, opts.incurredCosts!) : 0
  const values: number[] = new Array(runs)
  const costSamples: number[][] = costTriangles.map(() => new Array(runs))
  const driverSamples: number[][] = drivers.map(() => new Array(runs))
  const costCorrelationPrep = resolveCostCorrelationPrep(costTriangles.length, opts.costCorrelation)

  for (let i = 0; i < runs; i++) {
    const costValues = sampleCostValuesFromMarginals(costTriangles, costCorrelationPrep)
    for (let c = 0; c < costTriangles.length; c++) {
      costSamples[c]![i] = costValues[c]!
    }
    const driverPctValues: number[] = []
    for (let d = 0; d < drivers.length; d++) {
      const t = drivers[d]!
      const p = sampleTriangular(t.min, t.mode, t.max)
      driverSamples[d]![i] = p
      driverPctValues.push(p)
    }
    values[i] = computeTotalFromSampledValues({
      costValues,
      driverPctValues,
      driverImpacts,
      incurredCosts: incurred,
    })
  }

  const inputSeries: SimulationInputSeriesItem[] = [
    ...costSamples.map((s, i) => ({
      name: opts.costNames?.[i]?.trim() || `Kost ${i + 1}`,
      type: "cost" as const,
      values: s,
    })),
    ...driverSamples.map((s, i) => ({
      name: opts.driverNames?.[i]?.trim() || `Driver ${i + 1}`,
      type: "driver" as const,
      values: s,
    })),
  ]

  return { values, inputSeries, costCorrelationPrep }
}

export function simulateAggregateCostWithDrivers(opts: {
  runs: number
  costTriangles: TriangularParams[]
  drivers: TriangularParams[]
  driverImpacts?: DriverImpactMatrix
  costCorrelation?: number[][]
}): SimulationTotalSummary {
  return summarizeSamples(simulateAggregateCostWithDriversValues(opts).values)
}

/** Legacy global-driver formula (reference for regression tests). */
export function computeTotalGlobalDriverLegacy(opts: {
  costValues: readonly number[]
  driverPctValues: readonly number[]
  incurredCosts?: number
}): number {
  const incurred = Number.isFinite(opts.incurredCosts) ? Math.max(0, opts.incurredCosts!) : 0
  let sumCosts = 0
  for (const v of opts.costValues) sumCosts += v
  let dProd = 1
  for (const p of opts.driverPctValues) {
    dProd *= 1 + p / 100
  }
  return sumCosts * dProd + incurred
}

function sampleCostValuesFromMarginals(
  costTriangles: readonly TriangularParams[],
  costCorrelationPrep: CostCorrelationPrepResult,
  rng: () => number = Math.random,
): number[] {
  if (costTriangles.length <= 1) {
    return costTriangles.map((c) => triangularQuantile(c.min, c.mode, c.max, rng()))
  }

  const uniforms = sampleCorrelatedUniforms(costCorrelationPrep.choleskyL, rng)
  return costTriangles.map((c, i) => triangularQuantile(c.min, c.mode, c.max, uniforms[i]!))
}

function resolveCostCorrelationPrep(
  costItemCount: number,
  costCorrelation: number[][] | undefined,
): CostCorrelationPrepResult {
  if (costCorrelation === undefined) {
    return prepareCostCorrelationCholesky(undefined, costItemCount)
  }
  return prepareCostCorrelationCholesky(costCorrelation)
}
