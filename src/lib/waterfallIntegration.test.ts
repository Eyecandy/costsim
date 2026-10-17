import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

import {
  collectWaterfallDisplayValues,
  formatWaterfallSignedDeltaWithScale,
  formatWaterfallValueWithScale,
  resolveWaterfallDisplayScale,
} from "@/domain/results/formatWaterfallValue"
import {
  isShapleyCacheEntryValid,
  ShapleyRequestQueue,
  type ShapleyCacheEntry,
} from "@/domain/simulation/lazyShapleyAttribution"
import { createProject, type Project } from "@/lib/project"
import { runShapleyAttributionForPayload } from "@/domain/simulation/shapleyWorkerMessages"
import { shapleyInputSignature } from "@/domain/simulation/shapleyInputSignature"
import { buildSimulationProjectPayload } from "@/domain/simulation/buildSimulationProjectPayload"
import {
  groupWaterfallContributors,
  sumWaterfallDisplayContributions,
} from "@/domain/results/waterfallContributors"
import { buildWaterfallChartLayout } from "@/domain/results/waterfallLayout"
import { repoRoot } from "@/test-utils/repoRoot"


function sampleProject(overrides: Partial<Project> = {}): Project {
  const base = createProject({ id: "p1", name: "Project A" })
  return {
    ...base,
    id: "p1",
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
    ...overrides,
  }
}

describe("lazy Shapley integration", () => {
  it("A: normal simulation worker does not compute Shapley", () => {
    const src = readFileSync(
      join(repoRoot, "src/simulation.worker.ts"),
      "utf8",
    )
    expect(src).not.toContain("computeShapleyAttribution")
    expect(src).not.toContain("shapleyAttribution")
  })

  it("B: per-project queue only runs requested project ids sequentially", () => {
    const queue = new ShapleyRequestQueue()
    queue.enqueue("project-a")
    queue.enqueue("project-b")

    expect(queue.startNext()).toBe("project-a")
    expect(queue.getActiveProjectId()).toBe("project-a")
    expect(queue.startNext()).toBeNull()

    queue.complete("project-a")
    expect(queue.startNext()).toBe("project-b")
    queue.complete("project-b")
    expect(queue.startNext()).toBeNull()
  })

  it("C: cache entry is valid only when input and simulation signatures match", () => {
    const entry: ShapleyCacheEntry = {
      inputSignature: "sig-a",
      simulationRunId: "run-1",
      result: {
        baseCost: 100,
        estimatedP50: 110,
        estimatedP85: 118,
        expectedAddition: 10,
        uncertaintyReserve: 8,
        contributions: [],
        expectedAdditionDecomposition: {
          startValue: 100,
          endValue: 110,
          contributions: [],
        },
        uncertaintyReserveDecomposition: {
          startValue: 110,
          endValue: 118,
          contributions: [],
        },
        diagnostics: {} as ShapleyCacheEntry["result"]["diagnostics"],
      },
    }

    expect(isShapleyCacheEntryValid(entry, "sig-a", "run-1")).toBe(true)
    expect(isShapleyCacheEntryValid(entry, "sig-a", "run-2")).toBe(false)
    expect(isShapleyCacheEntryValid(entry, "sig-b", "run-1")).toBe(false)
  })

  it("D: changing relevant project input invalidates the signature", () => {
    const project = sampleProject()
    const before = shapleyInputSignature(project)
    const after = shapleyInputSignature({
      ...project,
      costRows: [
        {
          ...project.costRows[0]!,
          likely: "101",
        },
      ],
    })
    expect(before).not.toBe(after)
  })
})

describe("waterfall contributors", () => {
  it("E: visible contributors plus Other sum exactly to total attribution", () => {
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
    expect(grouped.some((row) => row.kind === "other")).toBe(true)
    expect(sumWaterfallDisplayContributions(grouped)).toBeCloseTo(total, 9)
  })

  it("F: negative contributions are kept in grouping", () => {
    const grouped = groupWaterfallContributors(
      [
        { type: "cost", id: "a", name: "A", contribution: -2500 },
        { type: "driver", id: "d", name: "D", contribution: 5000 },
      ],
      { maxIndividual: 6 },
    )
    expect(grouped.some((row) => row.contribution < 0)).toBe(true)
    expect(sumWaterfallDisplayContributions(grouped)).toBe(2500)
  })
})

describe("waterfall formatting", () => {
  it("G: chart-level millions formatting stays consistent across rows", () => {
    const scale = resolveWaterfallDisplayScale([
      202_834_534,
      202_000_000,
      620_000,
    ])
    expect(formatWaterfallValueWithScale(620_000, scale, "en")).toBe("0.6 M")
    expect(formatWaterfallValueWithScale(202_834_534, scale, "en")).toBe(
      "202.8 M",
    )
    expect(formatWaterfallSignedDeltaWithScale(-4250, scale, "en")).toBe(
      "-0.004 M",
    )
  })
})

describe("waterfall arithmetic", () => {
  it("H: base + displayed contributions including Other equals Shapley P50", () => {
    const project = sampleProject()
    const payload = buildSimulationProjectPayload(project)
    expect(payload).not.toBeNull()

    const mainP50 = 123_456
    const result = runShapleyAttributionForPayload(payload!, mainP50, null)
    const grouped = groupWaterfallContributors(result.contributions, {
      maxIndividual: 6,
      otherLabel: "Other",
    })
    const layout = buildWaterfallChartLayout(
      result.baseCost,
      result.estimatedP50,
      grouped,
    )

    const displayedSum =
      result.baseCost + sumWaterfallDisplayContributions(grouped)
    expect(displayedSum).toBeCloseTo(mainP50, 9)
    expect(layout.endValue).toBe(mainP50)
    expect(Math.abs(result.diagnostics.additivityResidual)).toBeLessThan(1e-9)
  })
})
