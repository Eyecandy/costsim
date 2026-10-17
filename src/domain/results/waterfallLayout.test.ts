import { describe, expect, it } from "vitest"

import {
  groupWaterfallContributors,
  sumWaterfallDisplayContributions,
} from "@/domain/results/waterfallContributors"
import { buildWaterfallChartLayout } from "@/domain/results/waterfallLayout"

describe("waterfall reference layout", () => {
  const baseCost = 200_000_000
  const estimatedP50 = 202_800_000
  const contributions = groupWaterfallContributors(
    [
      { type: "cost", id: "a", name: "A", contribution: 1_200_000 },
      { type: "cost", id: "b", name: "B", contribution: 800_000 },
      { type: "driver", id: "c", name: "C", contribution: 600_000 },
      { type: "driver", id: "d", name: "D", contribution: 300_000 },
      { type: "cost", id: "e", name: "E", contribution: -100_000 },
    ],
    { maxIndividual: 6, otherLabel: "Other" },
  )

  const layout = buildWaterfallChartLayout(baseCost, estimatedP50, contributions)

  it("A/B: contribution rows exclude start and end reference totals", () => {
    expect(layout.contributionRows.length).toBe(contributions.length)
    expect(
      layout.contributionRows.some((row) => row.key === "base" || row.key === "p50"),
    ).toBe(false)
  })

  it("C: span total equals end minus start", () => {
    expect(layout.spanTotal).toBe(estimatedP50 - baseCost)
    expect(layout.spanTotal).toBe(
      sumWaterfallDisplayContributions(contributions),
    )
  })

  it("D: contribution waterfall terminates exactly at end value", () => {
    const last = layout.contributionRows.at(-1)
    expect(last?.cumulativeAfter).toBeCloseTo(estimatedP50, 9)
    expect(
      baseCost + sumWaterfallDisplayContributions(contributions),
    ).toBeCloseTo(estimatedP50, 9)
  })

  it("E: negative contributions move the cumulative value downward", () => {
    const negative = layout.contributionRows.find((row) => row.contribution < 0)
    expect(negative).toBeDefined()
    expect(negative!.cumulativeAfter).toBeLessThan(negative!.cumulativeBefore)
  })

  it("F: top-N plus Other grouping arithmetic is unchanged", () => {
    expect(sumWaterfallDisplayContributions(contributions)).toBeCloseTo(
      2_800_000,
      9,
    )
  })
})
