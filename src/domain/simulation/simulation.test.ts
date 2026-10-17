import { describe, expect, it } from "vitest"

import {
  computeTotalFromSampledValues,
  computeTotalGlobalDriverLegacy,
  driverFactorForCostItem,
  simulateAggregateCostWithDriversValues,
  simulateAggregateCostWithDriversValuesAndSeries,
  triangularQuantile,
  type TriangularParams,
} from "@/domain/simulation/simulation"
import { mean, percentile } from "@/domain/simulation/stats"

const fullImpact = (costs: number, drivers: number): number[][] =>
  Array.from({ length: costs }, () => Array.from({ length: drivers }, () => 100))

const zeroImpact = (costs: number, drivers: number): number[][] =>
  Array.from({ length: costs }, () => Array.from({ length: drivers }, () => 0))

describe("computeTotalFromSampledValues", () => {
  it("A: all impacts 100% matches legacy global-driver model", () => {
    const costValues = [100, 200, 50]
    const driverPctValues = [10, -5]
    const driverImpacts = fullImpact(3, 2)
    const incurred = 25

    const perItem = computeTotalFromSampledValues({
      costValues,
      driverPctValues,
      driverImpacts,
      incurredCosts: incurred,
    })
    const legacy = computeTotalGlobalDriverLegacy({
      costValues,
      driverPctValues,
      incurredCosts: incurred,
    })

    expect(perItem).toBe(legacy)
    expect(perItem).toBeCloseTo((100 + 200 + 50) * 1.1 * 0.95 + 25)
  })

  it("B: all impacts 0% — drivers have no effect", () => {
    const total = computeTotalFromSampledValues({
      costValues: [100, 200],
      driverPctValues: [10, -5],
      driverImpacts: zeroImpact(2, 2),
      incurredCosts: 30,
    })
    expect(total).toBe(330)
  })

  it("C: +10% driver, 50% impact on one cost item → multiplier 1.05", () => {
    expect(
      driverFactorForCostItem([10], [50]),
    ).toBeCloseTo(1.05)

    expect(
      computeTotalFromSampledValues({
        costValues: [200],
        driverPctValues: [10],
        driverImpacts: [[50]],
      }),
    ).toBeCloseTo(210)
  })

  it("D: two drivers +10% and -5% at 100% impact → 1.10 × 0.95", () => {
    expect(
      driverFactorForCostItem([10, -5], [100, 100]),
    ).toBeCloseTo(1.1 * 0.95)

    expect(
      computeTotalFromSampledValues({
        costValues: [1000],
        driverPctValues: [10, -5],
        driverImpacts: [[100, 100]],
      }),
    ).toBeCloseTo(1045)
  })

  it("E: mixed impacts scale each cost item independently before summing", () => {
    const total = computeTotalFromSampledValues({
      costValues: [100, 200],
      driverPctValues: [10],
      driverImpacts: [[100], [50]],
    })
    expect(total).toBeCloseTo(100 * 1.1 + 200 * 1.05)
    expect(total).not.toBeCloseTo((100 + 200) * 1.1)
  })

  it("incurred costs stay outside driver scaling", () => {
    const total = computeTotalFromSampledValues({
      costValues: [100],
      driverPctValues: [10],
      driverImpacts: [[100]],
      incurredCosts: 50,
    })
    expect(total).toBeCloseTo(100 * 1.1 + 50)
  })

  it("missing driverImpacts defaults to 100% (backward compatible)", () => {
    const costValues = [80, 120]
    const driverPctValues = [5]
    const legacy = computeTotalGlobalDriverLegacy({ costValues, driverPctValues })
    const next = computeTotalFromSampledValues({ costValues, driverPctValues })
    expect(next).toBe(legacy)
  })
})

describe("simulateAggregateCostWithDriversValues integration", () => {
  const degenerate = (value: number) => ({ min: value, mode: value, max: value })

  it("deterministic run: C case via fixed triangular samples", () => {
    const { values } = simulateAggregateCostWithDriversValues({
      runs: 1,
      costTriangles: [degenerate(100)],
      drivers: [degenerate(10)],
      driverImpacts: [[50]],
    })
    expect(values[0]).toBeCloseTo(105)
  })

  it("deterministic run: all 100% matches legacy over multiple costs/drivers", () => {
    const opts = {
      runs: 1,
      costTriangles: [degenerate(100), degenerate(200)],
      drivers: [degenerate(10), degenerate(-5)],
      driverImpacts: fullImpact(2, 2),
    }
    const { values } = simulateAggregateCostWithDriversValues(opts)
    const legacy = computeTotalGlobalDriverLegacy({
      costValues: [100, 200],
      driverPctValues: [10, -5],
    })
    expect(values[0]).toBeCloseTo(legacy)
  })
})

describe("triangularQuantile", () => {
  const tri: TriangularParams = { min: 80, mode: 100, max: 140 }

  it("maps u=0, c, 1 to min, mode, max", () => {
    const c = (tri.mode - tri.min) / (tri.max - tri.min)
    expect(triangularQuantile(tri.min, tri.mode, tri.max, 0)).toBeCloseTo(tri.min)
    expect(triangularQuantile(tri.min, tri.mode, tri.max, c)).toBeCloseTo(tri.mode)
    expect(triangularQuantile(tri.min, tri.mode, tri.max, 1)).toBeCloseTo(tri.max)
  })

  it("degenerate triangle returns mode for any u", () => {
    expect(triangularQuantile(50, 50, 50, 0.3)).toBe(50)
    expect(triangularQuantile(50, 50, 50, 0.9)).toBe(50)
  })
})

describe("cost-item Gaussian copula sampling", () => {
  const triA: TriangularParams = { min: 80, mode: 100, max: 140 }
  const triB: TriangularParams = { min: 160, mode: 200, max: 280 }
  const theoreticalMean = (t: TriangularParams) => (t.min + t.mode + t.max) / 3
  const RUNS = 8000

  function correlatedPairSamples(latentRho: number) {
    const { inputSeries } = simulateAggregateCostWithDriversValuesAndSeries({
      runs: RUNS,
      costTriangles: [triA, triB],
      drivers: [],
      costCorrelation: [
        [1, latentRho],
        [latentRho, 1],
      ],
    })
    return {
      a: inputSeries[0]!.values,
      b: inputSeries[1]!.values,
    }
  }

  function spearman(x: readonly number[], y: readonly number[]): number {
    const rx = rank(x)
    const ry = rank(y)
    return pearson(rx, ry)
  }

  function rank(values: readonly number[]): number[] {
    const indexed = values.map((v, i) => ({ v, i }))
    indexed.sort((p, q) => p.v - q.v)
    const ranks = new Array<number>(values.length)
    for (let r = 0; r < indexed.length; r++) {
      ranks[indexed[r]!.i] = r + 1
    }
    return ranks
  }

  function pearson(x: readonly number[], y: readonly number[]): number {
    const n = x.length
    let sx = 0
    let sy = 0
    for (let i = 0; i < n; i++) {
      sx += x[i]!
      sy += y[i]!
    }
    const mx = sx / n
    const my = sy / n
    let num = 0
    let dx = 0
    let dy = 0
    for (let i = 0; i < n; i++) {
      const a = x[i]! - mx
      const b = y[i]! - my
      num += a * b
      dx += a * a
      dy += b * b
    }
    return num / Math.sqrt(dx * dy)
  }

  it("latent rho = 0 yields approximately independent samples", () => {
    const { a, b } = correlatedPairSamples(0)
    expect(Math.abs(spearman(a, b))).toBeLessThan(0.06)
  })

  it("positive latent rho yields positive rank dependence", () => {
    const { a, b } = correlatedPairSamples(0.7)
    expect(spearman(a, b)).toBeGreaterThan(0.35)
  })

  it("increasing latent rho increases observed rank dependence", () => {
    const lowPair = correlatedPairSamples(0.25)
    const midPair = correlatedPairSamples(0.55)
    const highPair = correlatedPairSamples(0.85)
    const low = spearman(lowPair.a, lowPair.b)
    const mid = spearman(midPair.a, midPair.b)
    const high = spearman(highPair.a, highPair.b)
    expect(mid).toBeGreaterThan(low + 0.08)
    expect(high).toBeGreaterThan(mid + 0.08)
  })

  it("latent rho near 1 yields near-perfect rank co-movement", () => {
    const { a, b } = correlatedPairSamples(0.995)
    expect(spearman(a, b)).toBeGreaterThan(0.95)
  })

  it("preserves triangular marginal means within tolerance", () => {
    const { inputSeries, costCorrelationPrep } =
      simulateAggregateCostWithDriversValuesAndSeries({
        runs: RUNS,
        costTriangles: [triA, triB],
        drivers: [],
        costCorrelation: [
          [1, 0.75],
          [0.75, 1],
        ],
      })
    const a = inputSeries[0]!.values
    const b = inputSeries[1]!.values
    expect(costCorrelationPrep.status.kind).toBe("valid")
    expect(Math.abs(mean(a)! - theoreticalMean(triA))).toBeLessThan(3)
    expect(Math.abs(mean(b)! - theoreticalMean(triB))).toBeLessThan(5)
  })

  it("preserves triangular marginal quantiles within tolerance", () => {
    const independent = simulateAggregateCostWithDriversValuesAndSeries({
      runs: RUNS,
      costTriangles: [triA, triB],
      drivers: [],
      costCorrelation: [
        [1, 0],
        [0, 1],
      ],
    })
    const correlated = simulateAggregateCostWithDriversValuesAndSeries({
      runs: RUNS,
      costTriangles: [triA, triB],
      drivers: [],
      costCorrelation: [
        [1, 0.75],
        [0.75, 1],
      ],
    })
    for (const q of [10, 50, 90] as const) {
      const ind = percentile(independent.inputSeries[0]!.values, q)!
      const cor = percentile(correlated.inputSeries[0]!.values, q)!
      expect(Math.abs(cor - ind)).toBeLessThan(8)
    }
  })

  it("omitted costCorrelation stays independent (identity prep status)", () => {
    const { costCorrelationPrep } = simulateAggregateCostWithDriversValues({
      runs: 10,
      costTriangles: [triA, triB],
      drivers: [],
    })
    expect(costCorrelationPrep.status).toEqual({
      kind: "identity",
      reason: "missing",
    })
  })
})
