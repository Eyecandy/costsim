/**
 * Development chart metrics + memo/perf invariants.
 */
import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { join } from "node:path"

import {
  archiveCheckpoint,
  createInitialOngoingState,
  createNextCheckpoint,
  getLatestCheckpoint,
  selectCheckpoint,
} from "@/domain/analysis/analysisCheckpoint"
import { buildArchivedAnalysisSnapshot } from "@/domain/analysis/buildArchivedAnalysisSnapshot"
import { extractKeyFigureValue } from "@/domain/analysis/checkpointComparison"
import {
  buildOngoingDevelopmentSeries,
  extractDevelopmentMetrics,
} from "@/domain/analysis/ongoingDevelopmentSeries"
import { DEFAULT_RESULT_PREFERENCES } from "@/domain/results/resultPreferences"
import { percentile, sortedFiniteValues } from "@/domain/simulation/stats"
import { createBlankWorkspaceRuntimeState } from "@/domain/analysis/workspaceReset"
import type { ProjectResult } from "@/domain/simulation/simulationTypes"
import { repoRoot } from "@/test-utils/repoRoot"
import { readAppSource } from "@/test-utils/appSource"
import { readResultsPanelSource } from "@/test-utils/resultsPanelSource"

function results(projectId: string, values: number[]): ProjectResult[] {
  return [
    {
      projectId,
      incurredCosts: 0,
      values,
      inputSeries: [],
    },
  ]
}

function countLargeArraySorts(run: () => void, minLength = 50): number {
  const orig = Array.prototype.sort
  let sorts = 0
  Array.prototype.sort = function (this: unknown[], compareFn?) {
    if (Array.isArray(this) && this.length >= minLength) {
      sorts += 1
    }
    return orig.call(this, compareFn)
  }
  try {
    run()
  } finally {
    Array.prototype.sort = orig
  }
  return sorts
}

describe("extractDevelopmentMetrics", () => {
  it("matches extractKeyFigureValue for baseCost / p50 / p85", () => {
    const projectId = "p1"
    const values = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120, 130, 140, 150]
    const source = {
      projectResults: results(projectId, values),
      simulatedBaseCostByProjectId: { [projectId]: 42 },
      resultsComparable: true as const,
    }
    const m = extractDevelopmentMetrics(source, projectId)
    expect(m.baseCost).toBe(extractKeyFigureValue(source, projectId, "baseCost"))
    expect(m.p50).toBe(extractKeyFigureValue(source, projectId, "p50"))
    expect(m.p85).toBe(extractKeyFigureValue(source, projectId, "p85"))
    expect(m.p50).toBe(percentile(values, 50))
    expect(m.p85).toBe(percentile(values, 85))
  })

  it("performs at most one full array sort per checkpoint extract", () => {
    const projectId = "p1"
    const values = Array.from({ length: 2_000 }, (_, i) => (i * 17) % 997)
    const source = {
      projectResults: results(projectId, values),
      simulatedBaseCostByProjectId: { [projectId]: 100 },
      resultsComparable: true as const,
    }
    const sorts = countLargeArraySorts(() => {
      extractDevelopmentMetrics(source, projectId)
    })
    expect(sorts).toBe(1)
  })

  it("derives P50 and P85 from the same sorted finite array", () => {
    const projectId = "p1"
    const values = [5, Number.NaN, 1, 9, 3, Number.POSITIVE_INFINITY, 7]
    const source = {
      projectResults: results(projectId, values),
      simulatedBaseCostByProjectId: { [projectId]: 0 },
      resultsComparable: true as const,
    }
    const sorted = sortedFiniteValues(values)
    const m = extractDevelopmentMetrics(source, projectId)
    expect(m.p50).toBe(percentile(sorted, 50))
    expect(m.p85).toBe(percentile(sorted, 85))
    // Second call must not sort again (WeakMap hit)
    const sorts = countLargeArraySorts(() => {
      const again = extractDevelopmentMetrics(source, projectId)
      expect(again).toEqual(m)
    }, 1)
    expect(sorts).toBe(0)
  })
})

describe("buildOngoingDevelopmentSeries performance invariants", () => {
  function archiveWithValues(
    ongoing: ReturnType<typeof createInitialOngoingState>,
    values: number[],
    base: number,
  ) {
    const tip = getLatestCheckpoint(ongoing)!
    const projectId = tip.workspace.activeProjectId
    const snap = buildArchivedAnalysisSnapshot({
      projects: tip.workspace.projects,
      activeProjectId: projectId,
      projectResults: results(projectId, values),
      simulatedBaseCostByProjectId: { [projectId]: base },
      inputSignature: `sig-${tip.sequence}-${base}`,
      simulationCount: values.length,
      resultPreferences: DEFAULT_RESULT_PREFERENCES,
    })
    return archiveCheckpoint(ongoing, tip.id, snap)
  }

  it("one sort per archived checkpoint on first build; zero on rebuild", () => {
    const blank = createBlankWorkspaceRuntimeState()
    let ongoing = createInitialOngoingState({
      projects: blank.projects,
      activeProjectId: blank.activeProjectId,
    })
    const v1 = Array.from({ length: 500 }, (_, i) => i)
    const v2 = Array.from({ length: 500 }, (_, i) => i + 10)
    ongoing = archiveWithValues(ongoing, v1, 100)
    const next = createNextCheckpoint(ongoing, { name: "CP2" })
    expect(next.ok).toBe(true)
    if (!next.ok) return
    ongoing = archiveWithValues(next.ongoing, v2, 110)

    const firstSorts = countLargeArraySorts(() => {
      buildOngoingDevelopmentSeries({ checkpoints: ongoing.checkpoints })
    })
    expect(firstSorts).toBe(2)

    const secondSorts = countLargeArraySorts(() => {
      buildOngoingDevelopmentSeries({ checkpoints: ongoing.checkpoints })
    })
    expect(secondSorts).toBe(0)
  })

  it("archived metrics unchanged across navigation-style rebuilds", () => {
    const blank = createBlankWorkspaceRuntimeState()
    let ongoing = createInitialOngoingState({
      projects: blank.projects,
      activeProjectId: blank.activeProjectId,
    })
    const values = [100, 110, 120, 130, 140, 150, 160, 170, 180, 190]
    ongoing = archiveWithValues(ongoing, values, 95)
    const next = createNextCheckpoint(ongoing, { name: "Draft" })
    expect(next.ok).toBe(true)
    if (!next.ok) return
    ongoing = next.ongoing
    const cp1 = ongoing.checkpoints.find((c) => c.sequence === 1)!
    const tip = getLatestCheckpoint(ongoing)!
    const projectId = tip.workspace.activeProjectId

    const a = buildOngoingDevelopmentSeries({
      checkpoints: ongoing.checkpoints,
      viewedCheckpointId: tip.id,
      viewedResultSource: {
        projectResults: results(projectId, [200, 210, 220]),
        simulatedBaseCostByProjectId: { [projectId]: 180 },
        resultsComparable: true,
      },
    })
    ongoing = selectCheckpoint(ongoing, cp1.id) ?? ongoing
    const b = buildOngoingDevelopmentSeries({
      checkpoints: ongoing.checkpoints,
      viewedCheckpointId: cp1.id,
      viewedResultSource: {
        projectResults: results(projectId, values),
        simulatedBaseCostByProjectId: { [projectId]: 95 },
        resultsComparable: true,
      },
    })
    expect(a.points[0]).toMatchObject({
      checkpointId: cp1.id,
      baseCost: 95,
      source: "archived",
    })
    expect(b.points[0]).toEqual(a.points[0])
  })
})

describe("Development wiring stability (source / memo / hover)", () => {
  it("App memoizes checkpointComparisonResultSource", () => {
    const app = readAppSource()
    expect(app).toContain("const checkpointComparisonResultSource = useMemo")
  })

  it("ResultsPanel development memo ignores result preferences and archived nav tip", () => {
    const panel = readResultsPanelSource()
    expect(panel).toContain("viewedDraftCheckpointId")
    expect(panel).toContain("developmentLiveResultSource")
    const memoStart = panel.indexOf("const developmentSeries = useMemo")
    const memoDepsEnd = panel.indexOf("])", memoStart)
    const block = panel.slice(memoStart, memoDepsEnd + 2)
    expect(block).not.toContain("resultPreferences")
    expect(block).toContain("viewedDraftCheckpointId")
    expect(block).toContain("developmentLiveResultSource")
  })

  it("hover chart does not import percentile helpers", () => {
    const chart = readFileSync(
      join(repoRoot, "src/features/results/ResultsDevelopmentChart.tsx"),
      "utf8",
    )
    expect(chart).not.toContain("extractDevelopmentMetrics")
    expect(chart).not.toContain("extractKeyFigureValue")
    expect(chart).not.toContain("percentile")
    expect(chart).toContain("useState<number | null>(null)")
  })

  it("new simulation values update development metrics", () => {
    const projectId = "p1"
    const sourceA = {
      projectResults: results(projectId, [1, 2, 3, 4, 5]),
      simulatedBaseCostByProjectId: { [projectId]: 1 },
      resultsComparable: true as const,
    }
    const sourceB = {
      projectResults: results(projectId, [10, 20, 30, 40, 50]),
      simulatedBaseCostByProjectId: { [projectId]: 1 },
      resultsComparable: true as const,
    }
    const a = extractDevelopmentMetrics(sourceA, projectId)
    const b = extractDevelopmentMetrics(sourceB, projectId)
    expect(a.p50).not.toBe(b.p50)
    expect(b.p50).toBe(percentile([10, 20, 30, 40, 50], 50))
  })
})
