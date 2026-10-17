import { describe, expect, it } from "vitest"

import { percentile } from "@/domain/simulation/stats"
import {
  computeShapleyAttribution,
  costActive,
  driverActive,
  EMPTY_PLAYER_MASK,
  fullPlayerMask,
  maskWithPlayer,
  medianOfNumbers,
  percentileOfNumbers,
  playerBit,
  type ShapleyAttributionInput,
} from "@/domain/simulation/shapleyAttribution"
import {
  computeTotalFromSampledValues,
  type TriangularParams,
} from "@/domain/simulation/simulation"

const TEST_CONFIG = {
  permutations: 60,
  runsPerSubset: 2500,
  convergenceBatchSize: 30,
} as const

const HIGH_PRECISION_CONFIG = {
  permutations: 80,
  runsPerSubset: 5000,
  convergenceBatchSize: 40,
} as const

function runShapley(
  overrides: Partial<ShapleyAttributionInput> &
    Pick<
      ShapleyAttributionInput,
      "costTriangles" | "costIds" | "costNames" | "drivers" | "driverIds" | "driverNames"
    >,
) {
  return computeShapleyAttribution({
    incurredCosts: 0,
    seed: 42,
    config: TEST_CONFIG,
    ...overrides,
  })
}

function contributionSum(result: ReturnType<typeof computeShapleyAttribution>) {
  return result.contributions.reduce((acc, row) => acc + row.contribution, 0)
}

function expectExactAdditivity(result: ReturnType<typeof computeShapleyAttribution>) {
  expect(result.diagnostics.estimatedP50EmptyModel).toBe(result.baseCost)
  expect(Math.abs(result.diagnostics.additivityResidual)).toBeLessThan(1e-9)
  expect(Math.abs(result.baseCost + contributionSum(result) - result.estimatedP50)).toBeLessThan(
    1e-9,
  )
  expect(Math.abs(contributionSum(result) - result.expectedAddition)).toBeLessThan(1e-9)
}

describe("medianOfNumbers", () => {
  it("matches percentile(..., 50) for random samples", () => {
    const xs = Array.from({ length: 3000 }, (_, i) => Math.sin(i * 0.17) * 1000 + i)
    expect(medianOfNumbers(xs)).toBeCloseTo(percentile(xs, 50)!, 9)
  })
})

describe("percentileOfNumbers", () => {
  it("matches percentile(..., 85) for random samples", () => {
    const xs = Array.from({ length: 3000 }, (_, i) => Math.cos(i * 0.11) * 500 + i * 2)
    expect(percentileOfNumbers(xs, 85)).toBeCloseTo(percentile(xs, 85)!, 9)
  })
})

describe("PlayerMask (BigInt)", () => {
  it("supports player index 31 and full 32-player coalition", () => {
    expect(playerBit(31)).toBe(1n << 31n)
    const full = fullPlayerMask(32)
    expect(full).toBe((1n << 32n) - 1n)
    expect(costActive(full, 31)).toBe(true)
    expect(costActive(full, 0)).toBe(true)
  })

  it("builds the same full mask incrementally as fullPlayerMask(32)", () => {
    let mask = EMPTY_PLAYER_MASK
    for (let i = 0; i < 32; i++) {
      mask = maskWithPlayer(mask, i)
      expect(costActive(mask, i)).toBe(true)
    }
    expect(mask).toBe(fullPlayerMask(32))
  })

  it("tracks driver bits above cost indices", () => {
    const nCosts = 20
    const mask = maskWithPlayer(EMPTY_PLAYER_MASK, 31)
    expect(costActive(mask, 19)).toBe(false)
    expect(driverActive(mask, 11, nCosts)).toBe(true)
  })
})

describe("computeShapleyAttribution", () => {
  it("additivity is exact apart from floating-point noise", () => {
    const result = computeShapleyAttribution({
      costTriangles: [
        { min: 90, mode: 100, max: 130 },
        { min: 180, mode: 200, max: 260 },
      ],
      costIds: ["c1", "c2"],
      costNames: ["A", "B"],
      drivers: [{ min: -5, mode: 0, max: 8 }],
      driverIds: ["d1"],
      driverNames: ["Driver"],
      driverImpacts: [
        [100, 100],
        [100, 100],
      ],
      incurredCosts: 25,
      seed: 123,
      config: {
        permutations: 100,
        runsPerSubset: 3000,
        convergenceBatchSize: 50,
      },
    })
    expectExactAdditivity(result)
  })

  it("reports reconciliation diagnostics when main simulation P50 is supplied", () => {
    const result = runShapley({
      costTriangles: [{ min: 80, mode: 100, max: 140 }],
      costIds: ["c1"],
      costNames: ["Cost"],
      drivers: [{ min: -5, mode: 0, max: 5 }],
      driverIds: ["d1"],
      driverNames: ["Driver"],
      driverImpacts: [[100]],
      mainSimulationP50: 999_999,
      seed: 5,
    })
    expect(result.estimatedP50).toBe(999_999)
    expect(result.diagnostics.mainSimulationP50).toBe(999_999)
    expect(result.diagnostics.rawShapleyFullP50).not.toBeNull()
    expect(result.diagnostics.fullCoalitionReconciliationDelta).toBeCloseTo(
      999_999 - result.diagnostics.rawShapleyFullP50!,
      9,
    )
    expect(result.diagnostics.mainSimulationP50Difference).toBe(0)
    expect(Math.abs(result.baseCost + contributionSum(result) - 999_999)).toBeLessThan(1e-9)
  })

  it("A: single uncertain cost item ≈ P50(full) − M", () => {
    const tri: TriangularParams = { min: 80, mode: 100, max: 200 }
    const result = computeShapleyAttribution({
      costTriangles: [tri],
      costIds: ["c1"],
      costNames: ["Cost A"],
      drivers: [],
      driverIds: [],
      driverNames: [],
      incurredCosts: 0,
      seed: 7,
      config: HIGH_PRECISION_CONFIG,
    })
    expect(result.baseCost).toBe(100)
    expect(result.contributions).toHaveLength(1)
    expectExactAdditivity(result)
    expect(Math.abs(result.contributions[0]!.contribution - result.expectedAddition)).toBeLessThan(
      Math.max(5, Math.abs(result.expectedAddition) * 0.05),
    )
  })

  it("B: single driver carries the P50 uplift over fixed cost base", () => {
    const result = runShapley({
      costTriangles: [{ min: 100, mode: 100, max: 100 }],
      costIds: ["c1"],
      costNames: ["Fixed cost"],
      drivers: [{ min: -10, mode: 0, max: 10 }],
      driverIds: ["d1"],
      driverNames: ["Driver"],
      driverImpacts: [[100]],
      seed: 11,
    })
    expectExactAdditivity(result)
    const driver = result.contributions.find((c) => c.type === "driver")!
    const cost = result.contributions.find((c) => c.type === "cost")!
    expect(Math.abs(cost.contribution)).toBeLessThan(
      Math.max(1, Math.abs(result.expectedAddition) * 0.05),
    )
    expect(Math.abs(driver.contribution - result.expectedAddition)).toBeLessThan(
      Math.max(8, Math.abs(result.expectedAddition) * 0.08),
    )
  })

  it("C: two independent players sum to expected addition", () => {
    const result = runShapley({
      costTriangles: [{ min: 90, mode: 100, max: 130 }],
      costIds: ["c1"],
      costNames: ["Cost"],
      drivers: [{ min: -5, mode: 0, max: 5 }],
      driverIds: ["d1"],
      driverNames: ["Driver"],
      driverImpacts: [[100]],
      seed: 19,
    })
    expectExactAdditivity(result)
  })

  it("D: multiplicative interaction is split across cost and driver", () => {
    const result = runShapley({
      costTriangles: [{ min: 80, mode: 100, max: 160 }],
      costIds: ["c1"],
      costNames: ["Cost"],
      drivers: [{ min: 0, mode: 10, max: 20 }],
      driverIds: ["d1"],
      driverNames: ["Driver"],
      driverImpacts: [[100]],
      seed: 23,
    })
    expectExactAdditivity(result)
    const cost = result.contributions.find((c) => c.type === "cost")!
    const driver = result.contributions.find((c) => c.type === "driver")!
    expect(cost.contribution).toBeGreaterThan(0)
    expect(driver.contribution).toBeGreaterThan(0)
  })

  it("E: driver with 0% impact on all costs ≈ zero contribution", () => {
    const result = runShapley({
      costTriangles: [{ min: 80, mode: 100, max: 140 }],
      costIds: ["c1"],
      costNames: ["Cost"],
      drivers: [{ min: -10, mode: 5, max: 15 }],
      driverIds: ["d1"],
      driverNames: ["Driver"],
      driverImpacts: [[0]],
      seed: 29,
    })
    expectExactAdditivity(result)
    const driver = result.contributions.find((c) => c.type === "driver")!
    expect(Math.abs(driver.contribution)).toBeLessThan(2)
  })

  it("F: correlated cost items preserve exact additivity", () => {
    const result = runShapley({
      costTriangles: [
        { min: 80, mode: 100, max: 140 },
        { min: 160, mode: 200, max: 280 },
      ],
      costIds: ["c1", "c2"],
      costNames: ["A", "B"],
      drivers: [],
      driverIds: [],
      driverNames: [],
      costCorrelation: [
        [1, 0.85],
        [0.85, 1],
      ],
      seed: 31,
    })
    expect(result.diagnostics.correlationPrepKind).toBe("valid")
    expectExactAdditivity(result)
  })

  it("G: inactive cost item is fixed at M (empty model equals base cost)", () => {
    const result = runShapley({
      costTriangles: [{ min: 70, mode: 100, max: 150 }],
      costIds: ["c1"],
      costNames: ["Cost"],
      drivers: [],
      driverIds: [],
      driverNames: [],
      incurredCosts: 25,
      seed: 37,
    })
    expect(result.diagnostics.estimatedP50EmptyModel).toBe(result.baseCost)
    expectExactAdditivity(result)
  })

  it("H: inactive driver is exactly 0%", () => {
    const tri: TriangularParams = { min: -10, mode: 0, max: 10 }
    const totalsInactive = Array.from({ length: 50 }, () =>
      computeTotalFromSampledValues({
        costValues: [100],
        driverPctValues: [0],
        driverImpacts: [[100]],
      }),
    )
    expect(totalsInactive.every((v) => v === 100)).toBe(true)

    const result = runShapley({
      costTriangles: [{ min: 100, mode: 100, max: 100 }],
      costIds: ["c1"],
      costNames: ["Cost"],
      drivers: [tri],
      driverIds: ["d1"],
      driverNames: ["Driver"],
      driverImpacts: [[100]],
      seed: 99,
    })
    expectExactAdditivity(result)
    expect(result.diagnostics.estimatedP50EmptyModel).toBe(100)
    expect(result.estimatedP50).toBeGreaterThan(100)
  })

  it("J: does not clamp negative contributions", () => {
    const result = runShapley({
      costTriangles: [
        { min: 50, mode: 100, max: 110 },
        { min: 200, mode: 220, max: 400 },
      ],
      costIds: ["c1", "c2"],
      costNames: ["Downside", "Upside"],
      drivers: [{ min: 0, mode: 0, max: 0 }],
      driverIds: ["d1"],
      driverNames: ["Neutral"],
      driverImpacts: [
        [100, 100],
        [100, 100],
      ],
      seed: 43,
    })
    expectExactAdditivity(result)
    expect(result.contributions.some((c) => c.contribution < 0)).toBe(true)
  })

  it("32-player mask path preserves exact additivity", () => {
    const costTriangles = Array.from({ length: 20 }, (_, i) => ({
      min: 80 + i,
      mode: 100 + i,
      max: 140 + i,
    }))
    const drivers = Array.from({ length: 12 }, () => ({
      min: -5,
      mode: 0,
      max: 5,
    }))
    const driverImpacts = costTriangles.map(() => Array.from({ length: 12 }, () => 100))
    const result = computeShapleyAttribution({
      costTriangles,
      costIds: costTriangles.map((_, i) => `c${i}`),
      costNames: costTriangles.map((_, i) => `Cost ${i + 1}`),
      drivers,
      driverIds: drivers.map((_, i) => `d${i}`),
      driverNames: drivers.map((_, i) => `Driver ${i + 1}`),
      driverImpacts,
      incurredCosts: 0,
      seed: 2024,
      config: {
        permutations: 20,
        runsPerSubset: 400,
        convergenceBatchSize: 10,
      },
    })
    expectExactAdditivity(result)
  })

  it("exposes convergence diagnostics from permutation batches", () => {
    const result = runShapley({
      costTriangles: [{ min: 85, mode: 100, max: 125 }],
      costIds: ["c1"],
      costNames: ["Cost"],
      drivers: [{ min: -4, mode: 0, max: 6 }],
      driverIds: ["d1"],
      driverNames: ["Driver"],
      driverImpacts: [[100]],
      seed: 47,
    })
    expectExactAdditivity(result)
    expect(result.diagnostics.permutationsUsed).toBe(TEST_CONFIG.permutations)
    expect(result.diagnostics.simulationRunsPerSubset).toBe(TEST_CONFIG.runsPerSubset)
    expect(result.diagnostics.convergenceMaxAbsDelta).not.toBeNull()
    expect(result.diagnostics.cacheHits).toBeGreaterThan(0)
  })
})
