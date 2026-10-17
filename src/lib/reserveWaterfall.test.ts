import { describe, expect, it } from "vitest"

import {
  formatWaterfallSignedDeltaWithScale,
  formatWaterfallValueWithScale,
  resolveWaterfallDisplayScale,
} from "@/lib/formatWaterfallValue"
import { buildSimulationProjectPayload } from "@/domain/simulation/buildSimulationProjectPayload"
import {
  groupWaterfallContributors,
  sumWaterfallDisplayContributions,
} from "@/lib/waterfallContributors"
import { buildWaterfallChartLayout } from "@/lib/waterfallLayout"
import { computeShapleyAttribution } from "@/domain/simulation/shapleyAttribution"
import { runShapleyAttributionForPayload } from "@/domain/simulation/shapleyWorkerMessages"
import { createProject } from "@/lib/project"
import { isShapleyCacheEntryValid } from "@/domain/simulation/lazyShapleyAttribution"

const TEST_CONFIG = {
  permutations: 60,
  runsPerSubset: 2500,
  convergenceBatchSize: 30,
} as const

function sampleProject() {
  const base = createProject({ id: "p1", name: "Project A" })
  return {
    ...base,
    costRows: [
      {
        ...base.costRows[0]!,
        name: "Cost A",
        optimistic: "-10",
        likely: "100",
        pessimistic: "30",
      },
    ],
    driverRows: [
      {
        ...base.driverRows[0]!,
        name: "Driver 1",
        optimistic: "-5",
        likely: "0",
        pessimistic: "8",
      },
    ],
  }
}

describe("uncertainty reserve waterfall", () => {
  it("A/B: reserve layout starts at main P50 and ends at main P85", () => {
    const mainP50 = 520_000
    const mainP85 = 565_000
    const result = computeShapleyAttribution({
      costTriangles: [{ min: 90, mode: 100, max: 130 }],
      costIds: ["c1"],
      costNames: ["Cost"],
      drivers: [{ min: -5, mode: 0, max: 8 }],
      driverIds: ["d1"],
      driverNames: ["Driver"],
      driverImpacts: [[100]],
      incurredCosts: 0,
      seed: 11,
      config: TEST_CONFIG,
      mainSimulationP50: mainP50,
      mainSimulationP85: mainP85,
    })

    const grouped = groupWaterfallContributors(
      result.uncertaintyReserveDecomposition.contributions,
      { maxIndividual: 6, otherLabel: "Other" },
    )
    const layout = buildWaterfallChartLayout(
      result.uncertaintyReserveDecomposition.startValue,
      result.uncertaintyReserveDecomposition.endValue,
      grouped,
    )

    expect(layout.startValue).toBe(mainP50)
    expect(layout.endValue).toBe(mainP85)
  })

  it("C/D: P50 plus displayed reserve contributions including Other equals P85", () => {
    const mainP50 = 512_345.678
    const mainP85 = 548_901.234
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
      seed: 5151,
      config: TEST_CONFIG,
      mainSimulationP50: mainP50,
      mainSimulationP85: mainP85,
    })

    const grouped = groupWaterfallContributors(
      result.uncertaintyReserveDecomposition.contributions,
      { maxIndividual: 6, otherLabel: "Other" },
    )
    const layout = buildWaterfallChartLayout(
      result.uncertaintyReserveDecomposition.startValue,
      result.uncertaintyReserveDecomposition.endValue,
      grouped,
    )

    const displayedSum =
      layout.startValue + sumWaterfallDisplayContributions(grouped)
    expect(displayedSum).toBeCloseTo(mainP85, 9)
    expect(layout.spanTotal).toBeCloseTo(mainP85 - mainP50, 9)
    expect(result.uncertaintyReserve).toBeCloseTo(mainP85 - mainP50, 9)
  })

  it("E: expected addition and reserve come from the same attribution result", () => {
    const project = sampleProject()
    const payload = buildSimulationProjectPayload(project)!
    const mainP50 = 123_456
    const mainP85 = 145_678
    const result = runShapleyAttributionForPayload(payload, mainP50, mainP85)

    expect(result.expectedAdditionDecomposition.contributions).toBe(
      result.contributions,
    )
    expect(result.uncertaintyReserveDecomposition.startValue).toBe(mainP50)
    expect(result.uncertaintyReserveDecomposition.endValue).toBe(mainP85)
    expect(result.uncertaintyReserveDecomposition.contributions).not.toBe(
      result.contributions,
    )
  })

  it("F/G: reserve grouping does not require a second attribution run", () => {
    const project = sampleProject()
    const payload = buildSimulationProjectPayload(project)!
    const result = runShapleyAttributionForPayload(payload, 130_000, 150_000)

    const expectedGrouped = groupWaterfallContributors(result.contributions)
    const reserveGrouped = groupWaterfallContributors(
      result.uncertaintyReserveDecomposition.contributions,
    )

    expect(expectedGrouped.length).toBeGreaterThan(0)
    expect(reserveGrouped.length).toBeGreaterThan(0)
    expect(
      result.baseCost +
        sumWaterfallDisplayContributions(expectedGrouped),
    ).toBeCloseTo(result.estimatedP50, 9)
    expect(
      result.estimatedP50 +
        sumWaterfallDisplayContributions(reserveGrouped),
    ).toBeCloseTo(result.estimatedP85, 9)
  })

  it("J: negative reserve contributions remain in grouping and layout", () => {
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

    const grouped = groupWaterfallContributors(
      result.uncertaintyReserveDecomposition.contributions,
    )
    expect(grouped.some((row) => row.contribution < 0)).toBe(true)

    const layout = buildWaterfallChartLayout(
      result.uncertaintyReserveDecomposition.startValue,
      result.uncertaintyReserveDecomposition.endValue,
      grouped,
    )
    const negative = layout.contributionRows.find((row) => row.contribution < 0)
    expect(negative).toBeDefined()
    expect(negative!.cumulativeAfter).toBeLessThan(negative!.cumulativeBefore)
    expect(layout.contributionRows.at(-1)?.cumulativeAfter).toBeCloseTo(
      result.estimatedP85,
      9,
    )
  })

  it("K: top-6 plus Other reserve grouping remains exact", () => {
    const contributions = Array.from({ length: 9 }, (_, i) => ({
      type: "cost" as const,
      id: `c${i}`,
      name: `Cost ${i}`,
      contribution: (i + 1) * 1000 - 5000,
    }))
    const total = contributions.reduce((acc, row) => acc + row.contribution, 0)
    const grouped = groupWaterfallContributors(contributions, {
      maxIndividual: 6,
      otherLabel: "Other",
    })

    expect(grouped).toHaveLength(7)
    expect(sumWaterfallDisplayContributions(grouped)).toBeCloseTo(total, 9)
  })

  it("L: reserve waterfall uses one chart-level millions scale", () => {
    const scale = resolveWaterfallDisplayScale([
      202_800_000,
      219_400_000,
      5_200_000,
      -400_000,
    ])
    expect(formatWaterfallValueWithScale(202_800_000, scale, "en")).toBe(
      "202.8 M",
    )
    expect(formatWaterfallValueWithScale(219_400_000, scale, "en")).toBe(
      "219.4 M",
    )
    expect(formatWaterfallSignedDeltaWithScale(16_600_000, scale, "en")).toBe(
      "+16.6 M",
    )
    expect(formatWaterfallSignedDeltaWithScale(-400_000, scale, "no")).toBe(
      "-0,4 M",
    )
  })

  it("I: cached attribution carries both decompositions and invalidates together", () => {
    const project = sampleProject()
    const payload = buildSimulationProjectPayload(project)!
    const result = runShapleyAttributionForPayload(payload, 130_000, 150_000)
    const entry = {
      inputSignature: "sig",
      simulationRunId: "run-1",
      result,
    }

    expect(
      entry.result.expectedAdditionDecomposition.endValue,
    ).toBe(entry.result.estimatedP50)
    expect(
      entry.result.uncertaintyReserveDecomposition.endValue,
    ).toBe(entry.result.estimatedP85)

    expect(isShapleyCacheEntryValid(entry, "sig", "run-1")).toBe(true)
    expect(isShapleyCacheEntryValid(entry, "sig", "run-2")).toBe(false)
  })
})
