import { describe, expect, it } from "vitest"

import {
  computeShapleyAttribution,
  type ShapleyAttributionInput,
} from "@/domain/simulation/shapleyAttribution"
import {
  formatWaterfallValueWithScale,
  resolveWaterfallDisplayScale,
} from "@/domain/results/formatWaterfallValue"
import { simulateAggregateCostWithDriversValuesAndSeries } from "@/domain/simulation/simulation"
import { percentile } from "@/domain/simulation/stats"

const RECON_CONFIG = {
  permutations: 100,
  runsPerSubset: 3000,
  convergenceBatchSize: 50,
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
    seed: 4242,
    config: RECON_CONFIG,
    ...overrides,
  }
}

function contributionSum(result: ReturnType<typeof computeShapleyAttribution>) {
  return result.contributions.reduce((acc, row) => acc + row.contribution, 0)
}

describe("Shapley full-coalition reconciliation", () => {
  it("A/B: waterfall endpoint and contributions reconcile to main simulation P50", () => {
    const mainP50 = 512_345.678
    const result = computeShapleyAttribution(
      baseInput({ mainSimulationP50: mainP50 }),
    )

    expect(result.estimatedP50).toBe(mainP50)
    expect(
      Math.abs(result.baseCost + contributionSum(result) - mainP50),
    ).toBeLessThan(1e-9)
    expect(Math.abs(result.diagnostics.additivityResidual)).toBeLessThan(1e-9)
  })

  it("C/D: preserves raw Shapley full P50 and reconciliation delta diagnostics", () => {
    const mainP50 = 600_000
    const result = computeShapleyAttribution(
      baseInput({ mainSimulationP50: mainP50 }),
    )

    expect(result.diagnostics.rawShapleyFullP50).not.toBeNull()
    expect(result.diagnostics.mainSimulationP50).toBe(mainP50)
    expect(result.diagnostics.fullCoalitionReconciliationDelta).toBeCloseTo(
      mainP50 - result.diagnostics.rawShapleyFullP50!,
      9,
    )
  })

  it("E: leaves behavior unchanged when raw Shapley P50 already equals main P50", () => {
    const unpinned = computeShapleyAttribution(baseInput())
    const pinned = computeShapleyAttribution(
      baseInput({ mainSimulationP50: unpinned.estimatedP50 }),
    )

    expect(pinned.diagnostics.fullCoalitionReconciliationDelta).toBe(0)
    expect(pinned.diagnostics.mainSimulationP50Difference).toBe(0)
    expect(pinned.estimatedP50).toBe(unpinned.estimatedP50)
    for (let i = 0; i < unpinned.contributions.length; i++) {
      expect(pinned.contributions[i]!.contribution).toBeCloseTo(
        unpinned.contributions[i]!.contribution,
        9,
      )
    }
  })

  it("F: does not proportionally rescale contributions after calculation", () => {
    const unpinned = computeShapleyAttribution(baseInput())
    const mainP50 = unpinned.estimatedP50 + 75_000
    const pinned = computeShapleyAttribution(
      baseInput({ mainSimulationP50: mainP50 }),
    )

    expect(Math.abs(pinned.diagnostics.fullCoalitionReconciliationDelta!)).toBeGreaterThan(
      1000,
    )

    const ratios = unpinned.contributions
      .map((row, i) => pinned.contributions[i]!.contribution / row.contribution)
      .filter((ratio) => Number.isFinite(ratio))

    expect(ratios.length).toBeGreaterThanOrEqual(2)
    const firstRatio = ratios[0]!
    const allSameRatio = ratios.every(
      (ratio) => Math.abs(ratio - firstRatio) < 1e-9,
    )
    expect(allSameRatio).toBe(false)
  })

  it("G: records valid random permutation last-position counts for all players", () => {
    const result = computeShapleyAttribution(
      baseInput({ mainSimulationP50: 500_000 }),
    )
    const counts = result.diagnostics.permutationLastPositionCounts

    expect(counts).not.toBeNull()
    expect(counts).toHaveLength(3)
    expect(counts!.reduce((acc, n) => acc + n, 0)).toBe(RECON_CONFIG.permutations)
    for (const count of counts!) {
      expect(count).toBeGreaterThan(0)
      expect(count).toBeLessThan(RECON_CONFIG.permutations)
    }
  })

  it("formats reconciled waterfall P50 identically to key-metrics million display", () => {
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
    const result = computeShapleyAttribution({
      ...input,
      mainSimulationP50: mainP50,
    })

    const scale = resolveWaterfallDisplayScale([
      result.baseCost,
      mainP50,
      ...result.contributions.map((c) => c.contribution),
    ])

    const formattedMain = formatWaterfallValueWithScale(mainP50, scale, "no")
    const formattedWaterfall = formatWaterfallValueWithScale(
      result.estimatedP50,
      scale,
      "no",
    )

    const report = {
      rawShapleyFullP50: result.diagnostics.rawShapleyFullP50,
      mainP50,
      reconciliationDelta: result.diagnostics.fullCoalitionReconciliationDelta,
      deltaPctOfMainAddition:
        result.diagnostics.fullCoalitionReconciliationDelta == null
          ? null
          : (Math.abs(result.diagnostics.fullCoalitionReconciliationDelta) /
              Math.abs(mainP50 - result.baseCost)) *
            100,
      contributionSum: contributionSum(result),
      additivityResidual: result.diagnostics.additivityResidual,
      lastPositionCounts: result.diagnostics.permutationLastPositionCounts,
      formattedMain,
      formattedWaterfall,
    }

    // eslint-disable-next-line no-console
    console.table(report)

    expect(formattedWaterfall).toBe(formattedMain)
    expect(result.estimatedP50).toBe(mainP50)
  }, 120_000)
})
