import { describe, expect, it } from "vitest"

import { percentile } from "@/domain/simulation/stats"
import {
  computeShapleyAttribution,
  percentileOfNumbers,
  quantilesFromSampleTotals,
  reserveValueFromQuantiles,
  type ShapleyAttributionInput,
} from "@/domain/simulation/shapleyAttribution"
import { simulateAggregateCostWithDriversValuesAndSeries } from "@/domain/simulation/simulation"

const RESERVE_CONFIG = {
  permutations: 80,
  runsPerSubset: 3000,
  convergenceBatchSize: 40,
} as const

function baseInput(
  overrides: Partial<ShapleyAttributionInput> = {},
): ShapleyAttributionInput {
  return {
    costTriangles: [
      { min: 90, mode: 100, max: 130 },
      { min: 180, mode: 200, max: 260 },
    ],
    costIds: ["c1", "c2"],
    costNames: ["Cost A", "Cost B"],
    drivers: [{ min: -5, mode: 0, max: 8 }],
    driverIds: ["d1"],
    driverNames: ["Driver"],
    driverImpacts: [
      [100, 100],
      [100, 100],
    ],
    incurredCosts: 25,
    seed: 5151,
    config: RESERVE_CONFIG,
    ...overrides,
  }
}

function expectedContributionSum(
  result: ReturnType<typeof computeShapleyAttribution>,
) {
  return result.contributions.reduce((acc, row) => acc + row.contribution, 0)
}

function reserveContributionSum(
  result: ReturnType<typeof computeShapleyAttribution>,
) {
  return result.uncertaintyReserveDecomposition.contributions.reduce(
    (acc, row) => acc + row.contribution,
    0,
  )
}

function expectExactReserveAdditivity(
  result: ReturnType<typeof computeShapleyAttribution>,
) {
  expect(Math.abs(result.diagnostics.reserveAdditivityResidual)).toBeLessThan(
    1e-9,
  )
  expect(
    Math.abs(
      result.estimatedP50 + reserveContributionSum(result) - result.estimatedP85,
    ),
  ).toBeLessThan(1e-9)
  expect(
    Math.abs(reserveContributionSum(result) - result.uncertaintyReserve),
  ).toBeLessThan(1e-9)
}

describe("uncertainty reserve Shapley attribution", () => {
  it("A: empty coalition has P50 = P85 = base cost and reserve = 0", () => {
    const result = computeShapleyAttribution(baseInput())
    expect(result.diagnostics.estimatedP50EmptyModel).toBe(result.baseCost)
    expect(result.diagnostics.estimatedP85EmptyModel).toBe(result.baseCost)
    expect(
      reserveValueFromQuantiles({
        p50: result.diagnostics.estimatedP50EmptyModel,
        p85: result.diagnostics.estimatedP85EmptyModel,
      }),
    ).toBe(0)
  })

  it("B: full coalition reserve equals main P85 − main P50 when reconciled", () => {
    const mainP50 = 520_000
    const mainP85 = 565_000
    const result = computeShapleyAttribution(
      baseInput({ mainSimulationP50: mainP50, mainSimulationP85: mainP85 }),
    )

    expect(result.estimatedP50).toBe(mainP50)
    expect(result.estimatedP85).toBe(mainP85)
    expect(result.uncertaintyReserve).toBe(mainP85 - mainP50)
    expect(result.diagnostics.mainSimulationReserveSpread).toBe(
      mainP85 - mainP50,
    )
  })

  it("C: main P50 + reserve contributions equals main P85 exactly", () => {
    const mainP50 = 512_345.678
    const mainP85 = 548_901.234
    const result = computeShapleyAttribution(
      baseInput({ mainSimulationP50: mainP50, mainSimulationP85: mainP85 }),
    )

    expectExactReserveAdditivity(result)
    expect(
      Math.abs(result.estimatedP50 + reserveContributionSum(result) - mainP85),
    ).toBeLessThan(1e-9)
  })

  it("D: P50 and P85 are derived from the same subset totals", () => {
    const totals = Array.from({ length: 3000 }, (_, i) => 100_000 + i * 17.3)
    const quantiles = quantilesFromSampleTotals(totals)
    expect(quantiles.p50).toBeCloseTo(percentile(totals, 50)!, 9)
    expect(quantiles.p85).toBeCloseTo(percentile(totals, 85)!, 9)
    expect(percentileOfNumbers(totals, 50)).toBeCloseTo(
      percentile(totals, 50)!,
      9,
    )
    expect(percentileOfNumbers(totals, 85)).toBeCloseTo(
      percentile(totals, 85)!,
      9,
    )
  })

  it("E: expected addition and reserve share the same permutation sample", () => {
    const result = computeShapleyAttribution(baseInput())
    expect(result.diagnostics.permutationLastPositionCounts).not.toBeNull()
    expect(result.diagnostics.permutationsUsed).toBe(RESERVE_CONFIG.permutations)
    expect(result.contributions).toHaveLength(
      result.uncertaintyReserveDecomposition.contributions.length,
    )
    for (let i = 0; i < result.contributions.length; i++) {
      expect(result.contributions[i]!.id).toBe(
        result.uncertaintyReserveDecomposition.contributions[i]!.id,
      )
    }
  })

  it("F: one uncertain cost item carries the full reserve", () => {
    const result = computeShapleyAttribution({
      costTriangles: [{ min: 80, mode: 100, max: 220 }],
      costIds: ["c1"],
      costNames: ["Cost A"],
      drivers: [],
      driverIds: [],
      driverNames: [],
      incurredCosts: 0,
      seed: 17,
      config: { permutations: 100, runsPerSubset: 4000, convergenceBatchSize: 50 },
    })

    expectExactReserveAdditivity(result)
    expect(result.uncertaintyReserveDecomposition.contributions).toHaveLength(1)
    expect(
      Math.abs(
        result.uncertaintyReserveDecomposition.contributions[0]!.contribution -
          result.uncertaintyReserve,
      ),
    ).toBeLessThan(Math.max(8, Math.abs(result.uncertaintyReserve) * 0.06))
  })

  it("G: zero-impact driver has approximately no reserve contribution", () => {
    const result = computeShapleyAttribution({
      costTriangles: [{ min: 80, mode: 100, max: 160 }],
      costIds: ["c1"],
      costNames: ["Cost"],
      drivers: [{ min: -10, mode: 5, max: 15 }],
      driverIds: ["d1"],
      driverNames: ["Driver"],
      driverImpacts: [[0]],
      incurredCosts: 0,
      seed: 21,
      config: RESERVE_CONFIG,
    })

    expectExactReserveAdditivity(result)
    const driver = result.uncertaintyReserveDecomposition.contributions.find(
      (row) => row.type === "driver",
    )!
    expect(Math.abs(driver.contribution)).toBeLessThan(2)
  })

  it("H: correlated cost items preserve exact reserve additivity", () => {
    const result = computeShapleyAttribution({
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
      incurredCosts: 0,
      seed: 33,
      config: RESERVE_CONFIG,
    })

    expect(result.diagnostics.correlationPrepKind).toBe("valid")
    expectExactReserveAdditivity(result)
  })

  it("I: negative reserve contributions are allowed and not clamped", () => {
    const result = computeShapleyAttribution({
      costTriangles: [
        { min: 80, mode: 100, max: 200 },
        { min: 80, mode: 100, max: 200 },
      ],
      costIds: ["c1", "c2"],
      costNames: ["A", "B"],
      drivers: [],
      driverIds: [],
      driverNames: [],
      costCorrelation: [
        [1, -0.99],
        [-0.99, 1],
      ],
      incurredCosts: 0,
      seed: 2,
      config: {
        permutations: 100,
        runsPerSubset: 4000,
        convergenceBatchSize: 50,
      },
    })

    expectExactReserveAdditivity(result)
    expect(
      result.uncertaintyReserveDecomposition.contributions.some(
        (row) => row.contribution < 0,
      ),
    ).toBe(true)
  })

  it("J: expected addition attribution remains unchanged and additive", () => {
    const result = computeShapleyAttribution(baseInput())
    expect(Math.abs(result.diagnostics.additivityResidual)).toBeLessThan(1e-9)
    expect(
      Math.abs(
        result.baseCost + expectedContributionSum(result) - result.estimatedP50,
      ),
    ).toBeLessThan(1e-9)
    expect(result.expectedAdditionDecomposition.startValue).toBe(result.baseCost)
    expect(result.expectedAdditionDecomposition.endValue).toBe(result.estimatedP50)
    expect(result.expectedAdditionDecomposition.contributions).toBe(
      result.contributions,
    )
  })

  it("preserves raw and reconciled P50/P85 diagnostics", () => {
    const input = baseInput()
    const { values } = simulateAggregateCostWithDriversValuesAndSeries({
      runs: 20_000,
      costTriangles: [...input.costTriangles],
      drivers: [...input.drivers],
      driverImpacts: input.driverImpacts,
      costNames: input.costNames,
      driverNames: input.driverNames,
      incurredCosts: input.incurredCosts,
    })
    const mainP50 = percentile(values, 50)!
    const mainP85 = percentile(values, 85)!
    const result = computeShapleyAttribution({
      ...input,
      mainSimulationP50: mainP50,
      mainSimulationP85: mainP85,
    })

    expect(result.diagnostics.rawShapleyFullP50).not.toBeNull()
    expect(result.diagnostics.rawShapleyFullP85).not.toBeNull()
    expect(result.diagnostics.p50ReconciliationDelta).toBeCloseTo(
      mainP50 - result.diagnostics.rawShapleyFullP50!,
      9,
    )
    expect(result.diagnostics.p85ReconciliationDelta).toBeCloseTo(
      mainP85 - result.diagnostics.rawShapleyFullP85!,
      9,
    )
    expect(result.diagnostics.rawShapleyReserveSpread).toBeCloseTo(
      result.diagnostics.rawShapleyFullP85! -
        result.diagnostics.rawShapleyFullP50!,
      9,
    )
    expect(result.diagnostics.mainSimulationReserveSpread).toBeCloseTo(
      mainP85 - mainP50,
      9,
    )
    expect(result.diagnostics.reserveSpreadReconciliationDelta).toBeCloseTo(
      mainP85 - mainP50 - result.diagnostics.rawShapleyReserveSpread!,
      9,
    )
  }, 120_000)
})
