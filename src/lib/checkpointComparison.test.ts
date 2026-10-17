import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { join } from "node:path"

import {
  archiveCheckpoint,
  createInitialOngoingState,
  createNextCheckpoint,
} from "@/lib/analysisCheckpoint"
import { buildArchivedAnalysisSnapshot } from "@/lib/buildArchivedAnalysisSnapshot"
import {
  compareCheckpoints,
  compareStructuralInputs,
  buildKeyFigureDeltas,
  extractKeyFigureValue,
  extractKeyFiguresFromResultSource,
} from "@/lib/checkpointComparison"
import {
  costDeltaClassName,
  costDeltaTone,
  comparisonAbsoluteCellParts,
  comparisonDeltaCellParts,
  filterComparisonKeyFiguresByPreferences,
  formatCheckpointContextLabel,
  formatCheckpointLegendLabel,
  formatComparisonAbsolute,
  formatComparisonDelta,
  getCostDeltaClass,
  getPercentageDeltaClass,
  selectComparisonKeyFigures,
} from "@/lib/checkpointComparisonPresentation"
import { listVisibleComparableKeyFigureRowIds } from "@/domain/results/keyFigureVisibility"
import { DEFAULT_RESULT_PREFERENCES } from "@/domain/results/resultPreferences"
import { createBlankWorkspaceRuntimeState } from "@/lib/workspaceReset"
import { newId } from "@/domain/results/tableRows"
import type { Project } from "@/lib/project"
import type { ProjectResult } from "@/simulation.worker"
import { repoRoot } from "@/test-utils/repoRoot"


function read(pathFromRepo: string) {
  return readFileSync(join(repoRoot, pathFromRepo), "utf8")
}

function resultBundle(
  projectId: string,
  values: number[],
  baseCost: number,
  incurredCosts = 0,
): {
  projectResults: ProjectResult[]
  simulatedBaseCostByProjectId: Record<string, number | null>
} {
  return {
    projectResults: [
      {
        projectId,
        incurredCosts,
        values,
        inputSeries: [],
      },
    ],
    simulatedBaseCostByProjectId: { [projectId]: baseCost },
  }
}

function snapshotFor(projects: Project[], activeProjectId: string, values: number[], base: number) {
  return buildArchivedAnalysisSnapshot({
    projects,
    activeProjectId,
    projectResults: [
      {
        projectId: activeProjectId,
        incurredCosts: projects[0]!.incurredCosts,
        values,
        inputSeries: [],
      },
    ],
    simulatedBaseCostByProjectId: { [activeProjectId]: base },
    inputSignature: JSON.stringify(projects),
    simulationCount: 1000,
    resultPreferences: DEFAULT_RESULT_PREFERENCES,
  })
}

function filledCost(
  project: Project,
  overrides: Partial<Project["costRows"][number]> & { id: string },
): Project {
  const rows = project.costRows.map((r, i) =>
    i === 0
      ? {
          ...r,
          id: overrides.id,
          name: overrides.name ?? "Cost A",
          optimistic: overrides.optimistic ?? "-10",
          likely: overrides.likely ?? "100",
          pessimistic: overrides.pessimistic ?? "20",
        }
      : r,
  )
  return { ...project, costRows: rows }
}

describe("compareCheckpoints domain helper", () => {
  it("CP1 returns baseline / no previous comparison", () => {
    const blank = createBlankWorkspaceRuntimeState()
    const ongoing = createInitialOngoingState({
      projects: blank.projects,
      activeProjectId: blank.activeProjectId,
    })
    const cp1 = ongoing.checkpoints[0]!
    const comparison = compareCheckpoints({
      checkpoints: ongoing.checkpoints,
      viewedCheckpointId: cp1.id,
      viewedResultSource: {
        ...resultBundle(blank.activeProjectId, [100, 110, 120], 100),
        resultsComparable: true,
      },
    })
    expect(comparison).toEqual({
      kind: "baseline",
      currentCheckpointId: cp1.id,
      currentSequence: 1,
      currentName: cp1.name,
    })
  })

  it("CP2 resolves CP1 as previous; CP3 resolves CP2", () => {
    const blank = createBlankWorkspaceRuntimeState()
    let ongoing = createInitialOngoingState({
      projects: blank.projects,
      activeProjectId: blank.activeProjectId,
    })
    const cp1Id = ongoing.checkpoints[0]!.id
    ongoing = archiveCheckpoint(
      ongoing,
      cp1Id,
      snapshotFor(blank.projects, blank.activeProjectId, [100, 110, 120], 100),
    )
    const cp2 = createNextCheckpoint(ongoing, { name: "CP2" })
    expect(cp2.ok).toBe(true)
    if (!cp2.ok) return
    ongoing = cp2.ongoing
    ongoing = archiveCheckpoint(
      ongoing,
      cp2.newCheckpoint.id,
      snapshotFor(
        cp2.newCheckpoint.workspace.projects,
        cp2.newCheckpoint.workspace.activeProjectId,
        [120, 130, 140],
        110,
      ),
    )
    const cp3 = createNextCheckpoint(ongoing, { name: "CP3" })
    expect(cp3.ok).toBe(true)
    if (!cp3.ok) return

    const vsCp2 = compareCheckpoints({
      checkpoints: cp3.ongoing.checkpoints,
      viewedCheckpointId: cp2.newCheckpoint.id,
      viewedResultSource: {
        ...resultBundle(blank.activeProjectId, [120, 130, 140], 110),
        resultsComparable: true,
      },
    })
    expect(vsCp2?.kind).toBe("comparison")
    if (vsCp2?.kind !== "comparison") return
    expect(vsCp2.previousCheckpointId).toBe(cp1Id)
    expect(vsCp2.currentCheckpointId).toBe(cp2.newCheckpoint.id)
    expect(vsCp2.previousName).toBeTruthy()
    expect(vsCp2.currentName).toBe("CP2")
    expect(
      vsCp2.extensions?.sCurve?.previous?.values?.length,
    ).toBeGreaterThan(0)

    const vsCp3 = compareCheckpoints({
      checkpoints: cp3.ongoing.checkpoints,
      viewedCheckpointId: cp3.newCheckpoint.id,
      viewedResultSource: {
        ...resultBundle(blank.activeProjectId, [140, 150, 160], 120),
        resultsComparable: true,
      },
    })
    expect(vsCp3?.kind).toBe("comparison")
    if (vsCp3?.kind !== "comparison") return
    expect(vsCp3.previousCheckpointId).toBe(cp2.newCheckpoint.id)
    expect(vsCp3.currentCheckpointId).toBe(cp3.newCheckpoint.id)
  })

  it("key figure deltas = current − previous", () => {
    const blank = createBlankWorkspaceRuntimeState()
    let ongoing = createInitialOngoingState({
      projects: blank.projects,
      activeProjectId: blank.activeProjectId,
    })
    const pid = blank.activeProjectId
    // Deterministic samples so median/mean/p85 are known enough for delta checks.
    const prevValues = [100, 100, 100, 100, 100]
    const curValues = [108, 108, 108, 108, 108]
    ongoing = archiveCheckpoint(
      ongoing,
      ongoing.checkpoints[0]!.id,
      snapshotFor(blank.projects, pid, prevValues, 90),
    )
    const next = createNextCheckpoint(ongoing)
    expect(next.ok).toBe(true)
    if (!next.ok) return

    const comparison = compareCheckpoints({
      checkpoints: next.ongoing.checkpoints,
      viewedCheckpointId: next.newCheckpoint.id,
      viewedResultSource: {
        ...resultBundle(pid, curValues, 95),
        resultsComparable: true,
      },
    })
    expect(comparison?.kind).toBe("comparison")
    if (comparison?.kind !== "comparison" || !comparison.keyFigures) return

    const byId = Object.fromEntries(
      comparison.keyFigures.map((r) => [r.metric, r]),
    )
    expect(byId.baseCost!.previous).toBe(90)
    expect(byId.baseCost!.current).toBe(95)
    expect(byId.baseCost!.change).toBe(5)
    expect(byId.p50!.change).toBe(8)
    expect(byId.expectedValue!.change).toBe(8)
    expect(byId.p85!.change).toBe(8)
    // Reserve = p85−p50 (with incurred 0) → both 0 → change 0
    expect(byId.uncertaintyReserve!.change).toBe(0)
  })

  it("detects added/removed/changed cost and driver rows by stable ID", () => {
    const blank = createBlankWorkspaceRuntimeState()
    const costKeepId = blank.projects[0]!.costRows[0]!.id
    const costRemoveId = blank.projects[0]!.costRows[1]!.id
    const driverKeepId = blank.projects[0]!.driverRows[0]!.id
    const driverRemoveId = blank.projects[0]!.driverRows[1]!.id
    const costAddId = newId()
    const driverAddId = newId()

    const earlierProject: Project = {
      ...blank.projects[0]!,
      costRows: blank.projects[0]!.costRows.map((r) =>
        r.id === costKeepId
          ? {
              ...r,
              name: "Keep",
              optimistic: "-10",
              likely: "100",
              pessimistic: "20",
            }
          : r.id === costRemoveId
            ? {
                ...r,
                name: "Remove me",
                optimistic: "-5",
                likely: "50",
                pessimistic: "10",
              }
            : r,
      ),
      driverRows: blank.projects[0]!.driverRows.map((r) =>
        r.id === driverKeepId
          ? {
              ...r,
              name: "Driver keep",
              optimistic: "90",
              likely: "100",
              pessimistic: "110",
            }
          : r.id === driverRemoveId
            ? {
                ...r,
                name: "Driver remove",
                optimistic: "80",
                likely: "100",
                pessimistic: "120",
              }
            : r,
      ),
    }

    const laterProject: Project = {
      ...earlierProject,
      costRows: [
        {
          ...earlierProject.costRows.find((r) => r.id === costKeepId)!,
          name: "Keep renamed", // rename must NOT count as add/remove
          optimistic: "-15", // range change
          likely: "100",
          pessimistic: "25",
        },
        {
          id: costAddId,
          name: "New cost",
          optimistic: "-10",
          likely: "40",
          pessimistic: "15",
        },
        ...earlierProject.costRows.filter(
          (r) => r.id !== costKeepId && r.id !== costRemoveId,
        ),
      ],
      driverRows: [
        {
          ...earlierProject.driverRows.find((r) => r.id === driverKeepId)!,
          optimistic: "85",
          likely: "100",
          pessimistic: "115",
        },
        {
          id: driverAddId,
          name: "New driver",
          optimistic: "90",
          likely: "100",
          pessimistic: "110",
        },
        ...earlierProject.driverRows.filter(
          (r) => r.id !== driverKeepId && r.id !== driverRemoveId,
        ),
      ],
    }

    const earlier = createInitialOngoingState({
      projects: [earlierProject],
      activeProjectId: earlierProject.id,
    }).checkpoints[0]!
    const laterCp = {
      ...earlier,
      id: newId(),
      sequence: 2,
      workspace: {
        projects: [laterProject],
        activeProjectId: laterProject.id,
      },
    }

    const structural = compareStructuralInputs(earlier, laterCp)
    expect(structural.costItemsAdded).toBe(1)
    expect(structural.costItemsRemoved).toBe(1)
    expect(structural.costRangesChanged).toBe(1)
    expect(structural.driversAdded).toBe(1)
    expect(structural.driversRemoved).toBe(1)
    expect(structural.driverRangesChanged).toBe(1)
  })

  it("unchanged rows are not counted; rename-only is not add/remove or range change", () => {
    const blank = createBlankWorkspaceRuntimeState()
    const row = blank.projects[0]!.costRows[0]!
    const earlierProject = filledCost(blank.projects[0]!, {
      id: row.id,
      name: "Alpha",
      optimistic: "-10",
      likely: "100",
      pessimistic: "20",
    })
    const laterProject = filledCost(blank.projects[0]!, {
      id: row.id,
      name: "Alpha renamed",
      optimistic: "-10",
      likely: "100",
      pessimistic: "20",
    })
    // Keep other rows identical
    laterProject.costRows = earlierProject.costRows.map((r) =>
      r.id === row.id ? laterProject.costRows[0]! : r,
    )
    laterProject.driverRows = earlierProject.driverRows.map((r) => ({ ...r }))

    const earlier = createInitialOngoingState({
      projects: [earlierProject],
      activeProjectId: earlierProject.id,
    }).checkpoints[0]!
    const later = {
      ...earlier,
      id: newId(),
      sequence: 2,
      workspace: {
        projects: [laterProject],
        activeProjectId: laterProject.id,
      },
    }
    const structural = compareStructuralInputs(earlier, later)
    expect(structural.costItemsAdded).toBe(0)
    expect(structural.costItemsRemoved).toBe(0)
    expect(structural.costRangesChanged).toBe(0)
    expect(structural.driversAdded).toBe(0)
    expect(structural.driversRemoved).toBe(0)
    expect(structural.driverRangesChanged).toBe(0)
  })

  it("stale or missing current results do not produce key figure deltas", () => {
    const blank = createBlankWorkspaceRuntimeState()
    let ongoing = createInitialOngoingState({
      projects: blank.projects,
      activeProjectId: blank.activeProjectId,
    })
    ongoing = archiveCheckpoint(
      ongoing,
      ongoing.checkpoints[0]!.id,
      snapshotFor(blank.projects, blank.activeProjectId, [100, 110, 120], 100),
    )
    const next = createNextCheckpoint(ongoing)
    expect(next.ok).toBe(true)
    if (!next.ok) return

    const stale = compareCheckpoints({
      checkpoints: next.ongoing.checkpoints,
      viewedCheckpointId: next.newCheckpoint.id,
      viewedResultSource: {
        ...resultBundle(blank.activeProjectId, [130, 140, 150], 110),
        resultsComparable: false,
      },
    })
    expect(stale?.kind).toBe("comparison")
    if (stale?.kind !== "comparison") return
    expect(stale.keyFigures).toBeNull()
    expect(stale.keyFiguresUnavailableReason).toBe("stale_current_results")

    const missing = compareCheckpoints({
      checkpoints: next.ongoing.checkpoints,
      viewedCheckpointId: next.newCheckpoint.id,
      viewedResultSource: null,
    })
    expect(missing?.kind).toBe("comparison")
    if (missing?.kind !== "comparison") return
    expect(missing.keyFigures).toBeNull()
    expect(missing.keyFiguresUnavailableReason).toBe("missing_current_results")
  })

  it("historical archived checkpoint uses its frozen results for previous side", () => {
    const blank = createBlankWorkspaceRuntimeState()
    const pid = blank.activeProjectId
    let ongoing = createInitialOngoingState({
      projects: blank.projects,
      activeProjectId: pid,
    })
    const frozenPrev = [90, 100, 110, 120, 130]
    ongoing = archiveCheckpoint(
      ongoing,
      ongoing.checkpoints[0]!.id,
      snapshotFor(blank.projects, pid, frozenPrev, 80),
    )
    const next = createNextCheckpoint(ongoing)
    expect(next.ok).toBe(true)
    if (!next.ok) return
    ongoing = archiveCheckpoint(
      next.ongoing,
      next.newCheckpoint.id,
      snapshotFor(
        next.newCheckpoint.workspace.projects,
        pid,
        [100, 110, 120, 130, 140],
        90,
      ),
    )

    const viewingCp2 = compareCheckpoints({
      checkpoints: ongoing.checkpoints,
      viewedCheckpointId: next.newCheckpoint.id,
      viewedResultSource: {
        ...resultBundle(pid, [100, 110, 120, 130, 140], 90),
        resultsComparable: true,
      },
    })
    expect(viewingCp2?.kind).toBe("comparison")
    if (viewingCp2?.kind !== "comparison" || !viewingCp2.keyFigures) return

    const previousSnapshot = ongoing.checkpoints[0]!.archivedSnapshot!
    if (!("projectResults" in previousSnapshot)) return
    const prevExtracted = extractKeyFiguresFromResultSource(
      {
        projectResults: previousSnapshot.projectResults,
        simulatedBaseCostByProjectId:
          previousSnapshot.simulatedBaseCostByProjectId,
      },
      pid,
    )
    const baseRow = viewingCp2.keyFigures.find((r) => r.metric === "baseCost")
    expect(baseRow?.previous).toBe(prevExtracted?.baseCost)
    expect(baseRow?.previous).toBe(80)
    expect(viewingCp2.extensions?.sCurve?.previous?.values).toEqual(
      previousSnapshot.projectResults[0]!.values,
    )
  })
})

describe("checkpoint comparison presentation helpers", () => {
  it("formats context labels with optional custom names", () => {
    const tpl = "Checkpoint {n}"
    expect(formatCheckpointContextLabel(3, "Checkpoint 3", tpl)).toBe(
      "Checkpoint 3",
    )
    expect(formatCheckpointContextLabel(3, "After tender", tpl)).toBe(
      "Checkpoint 3 · After tender",
    )
    expect(formatCheckpointLegendLabel(2, tpl)).toBe("Checkpoint 2")

    expect(costDeltaTone(8, "p50")).toBe("increase")
    expect(costDeltaTone(-4, "baseCost")).toBe("decrease")
    expect(costDeltaTone(0, "p50")).toBe("neutral")
    expect(costDeltaTone(5, "probAtBase")).toBe("neutral")
    // Higher cost → red; Uncertainty Reserve / Expected Addition reduction → green
    expect(costDeltaTone(-4, "uncertaintyReserve")).toBe("decrease")
    expect(costDeltaTone(-5, "expectedAddition")).toBe("decrease")
    expect(getCostDeltaClass(-4, "uncertaintyReserve")).toBe(
      costDeltaClassName("decrease"),
    )
    expect(getCostDeltaClass(-5, "expectedAddition")).toContain("#3f7d4e")
    expect(getCostDeltaClass(-4, "uncertaintyReserve")).not.toContain("bg-")
    expect(getCostDeltaClass(4, "uncertaintyReserve")).toContain("#c24141")
    expect(getCostDeltaClass(5, "expectedAddition")).toContain("#c24141")
    expect(getCostDeltaClass(5, "expectedAddition")).not.toMatch(
      /bg-|rounded-sm|px-1/,
    )
    expect(costDeltaTone(8, "expectedAddition")).toBe("increase")
    expect(costDeltaClassName(costDeltaTone(8, "p50"))).toContain("#c24141")
    expect(costDeltaClassName("increase")).toContain("#c24141")
    expect(costDeltaClassName("decrease")).toContain("#3f7d4e")
    expect(costDeltaClassName("neutral")).toContain("text-foreground")
    expect(costDeltaClassName("increase")).not.toContain("bg-")
    expect(costDeltaClassName("decrease")).not.toContain("bg-")

    const urRow = {
      metric: "uncertaintyReserve",
      previous: 17,
      current: 13,
      change: -4,
      previousPercent: 12.4,
      currentPercent: 9.8,
      changePercent: -2.6,
    }
    expect(formatComparisonAbsolute(urRow, "en", "previous", "Locked")).toBe(
      "17 (12.4 %)",
    )
    expect(formatComparisonAbsolute(urRow, "en", "current", "Locked")).toBe(
      "13 (9.8 %)",
    )
    expect(formatComparisonDelta(urRow, "en")).toBe("−4 (−2.6 pp)")
    expect(formatComparisonAbsolute(urRow, "no", "previous", "Locked")).toBe(
      "17 (12,4 %)",
    )
    expect(formatComparisonDelta(urRow, "no")).toBe("−4 (−2,6 pp)")

    const prevParts = comparisonAbsoluteCellParts(
      urRow,
      "previous",
      "en",
      "Locked",
    )
    expect(prevParts.absoluteText).toBe("17")
    expect(prevParts.percentText).toBe("(12.4 %)")
    expect(prevParts.reservePercentSlot).toBe(true)
    const changeParts = comparisonDeltaCellParts(urRow, "en")
    expect(changeParts.absoluteText).toBe("−4")
    expect(changeParts.percentText).toBe("(−2.6 pp)")

    // Color is derived only from absoluteDelta — never from changePercent.
    // Absolute and pp colors are independent (same sign rule, separate sources).
    expect(getCostDeltaClass(-4, "uncertaintyReserve")).toContain("#3f7d4e")
    expect(getPercentageDeltaClass(-2.6)).toContain("#3f7d4e")
    expect(getCostDeltaClass(4, "uncertaintyReserve")).toContain("#c24141")
    expect(getPercentageDeltaClass(2.6)).toContain("#c24141")
    // Mixed: +absolute / −pp → red / green
    expect(getCostDeltaClass(10, "uncertaintyReserve")).toContain("#c24141")
    expect(getPercentageDeltaClass(-3)).toContain("#3f7d4e")
    // Mixed: −absolute / +pp → green / red
    expect(getCostDeltaClass(-10, "uncertaintyReserve")).toContain("#3f7d4e")
    expect(getPercentageDeltaClass(3)).toContain("#c24141")
    expect(getCostDeltaClass(0, "uncertaintyReserve")).toContain("text-foreground")
    expect(getPercentageDeltaClass(0)).toContain("text-foreground")
    expect(getPercentageDeltaClass(null)).toContain("text-foreground")

    const ordered = listVisibleComparableKeyFigureRowIds(
      DEFAULT_RESULT_PREFERENCES.keyFigures,
    )
    expect(ordered).not.toContain("uncertaintyReservePct")
    const rows = ordered.map((metric) => ({
      metric,
      previous: 1,
      current: 2,
      change: 1,
    }))
    const filtered = filterComparisonKeyFiguresByPreferences(
      rows,
      DEFAULT_RESULT_PREFERENCES.keyFigures,
    )
    expect(filtered.map((r) => r.metric)).toEqual(ordered)
    expect(
      selectComparisonKeyFigures(rows, {
        ...DEFAULT_RESULT_PREFERENCES.keyFigures,
        showExpectedValue: false,
        percentiles: [50, 85],
      }).map((r) => r.metric),
    ).not.toContain("expectedValue")
  })

  it("extracts inline percentages with the same formulas as Key Figures", () => {
    const source = {
      projectResults: [
        {
          projectId: "p1",
          incurredCosts: 0,
          values: [100, 100, 100, 100, 100],
          inputSeries: [],
        },
      ],
      simulatedBaseCostByProjectId: { p1: 80 },
    }
    // P50=100, base=80 → expected addition absolute=20, pct=25
    expect(extractKeyFigureValue(source, "p1", "expectedAddition")).toBe(20)
    expect(extractKeyFigureValue(source, "p1", "expectedAdditionPct")).toBe(25)
    // P85=100, P50=100 → reserve 0 / 0%
    expect(extractKeyFigureValue(source, "p1", "uncertaintyReserve")).toBe(0)
    expect(extractKeyFigureValue(source, "p1", "uncertaintyReservePct")).toBe(0)

    const deltas = buildKeyFigureDeltas({
      previous: source,
      current: {
        projectResults: [
          {
            projectId: "p1",
            incurredCosts: 0,
            values: [90, 90, 90, 90, 90],
            inputSeries: [],
          },
        ],
        simulatedBaseCostByProjectId: { p1: 80 },
      },
      projectId: "p1",
      metricIds: ["expectedAddition"],
    })
    expect(deltas).toHaveLength(1)
    expect(deltas[0]!.metric).toBe("expectedAddition")
    expect(deltas[0]!.previous).toBe(20)
    expect(deltas[0]!.previousPercent).toBe(25)
    expect(deltas[0]!.current).toBe(10)
    expect(deltas[0]!.currentPercent).toBe(12.5)
    expect(deltas[0]!.change).toBe(-10)
    expect(deltas[0]!.changePercent).toBe(-12.5)
    expect(formatComparisonDelta(deltas[0]!, "en")).toBe("−10 (−12.5 pp)")
  })

  it("colors absolute and percentage-point deltas independently", () => {
    // 1. both negative → green / green
    expect(getCostDeltaClass(-4, "expectedAddition")).toContain("#3f7d4e")
    expect(getPercentageDeltaClass(-2.6)).toContain("#3f7d4e")

    // 2. both positive → red / red
    expect(getCostDeltaClass(4, "expectedAddition")).toContain("#c24141")
    expect(getPercentageDeltaClass(2.6)).toContain("#c24141")

    // 3. absolute +, pp − → red / green
    expect(getCostDeltaClass(10, "uncertaintyReserve")).toContain("#c24141")
    expect(getPercentageDeltaClass(-3)).toContain("#3f7d4e")

    // 4. absolute −, pp + → green / red
    expect(getCostDeltaClass(-10, "uncertaintyReserve")).toContain("#3f7d4e")
    expect(getPercentageDeltaClass(3)).toContain("#c24141")

    // 5. zero → neutral
    expect(getCostDeltaClass(0, "p50")).toContain("text-foreground")
    expect(getPercentageDeltaClass(0)).toContain("text-foreground")

    const section = read("src/components/CheckpointComparisonSection.tsx")
    expect(section).toContain("getCostDeltaClass")
    expect(section).toContain("getPercentageDeltaClass")
    expect(section).toContain("absoluteDelta")
    expect(section).toContain("percentagePointDelta")
    expect(section).toContain("absoluteDeltaClass")
    expect(section).toContain("percentageDeltaClass")
    // Must not force one shared group color onto both parts
    expect(section).not.toContain("inheritColor")
    expect(section).not.toContain("deltaGroupClass")
  })
})

describe("checkpoint comparison UI wiring", () => {
  it("shows comparison above shared result sections for Ongoing only", () => {
    const panel = read("src/components/ResultsPanel.tsx")
    expect(panel).toContain("CheckpointComparisonSection")
    expect(panel).toContain("ongoingCheckpoints")
    expect(panel).toContain("resultPreferences={resultPreferences}")
    expect(panel).toContain('emphasis: "reference"')
    expect(panel).toContain("formatCheckpointLegendLabel")
    const layoutStart = panel.indexOf(
      'space-y-6 [&>div:not(:first-child)]:pt-3',
    )
    const layout = panel.slice(layoutStart)
    const comparisonContext = layout.indexOf('slot="context"')
    const keyFigures = layout.indexOf("results.keyMetricsTitle")
    const comparisonChange = layout.indexOf('slot="change"')
    const sCurve = layout.indexOf("charts.sCurveTitle")
    expect(comparisonContext).toBeGreaterThan(-1)
    expect(comparisonContext).toBeLessThan(keyFigures)
    expect(comparisonChange).toBeGreaterThan(keyFigures)
    expect(comparisonChange).toBeLessThan(sCurve)

    const app = read("src/App.tsx")
    expect(app).toContain("ongoingCheckpoints={")
    expect(app).toMatch(
      /isOngoingAnalysis\s*\?\s*librarySession\.ongoing\?\.checkpoints/,
    )
    expect(app).toContain("checkpointComparisonResultSource")
  })

  it("comparison section has context header + expander; S-curve supports reference emphasis", () => {
    const section = read("src/components/CheckpointComparisonSection.tsx")
    expect(section).toContain("listVisibleComparableKeyFigureRowIds")
    expect(section).toContain("selectComparisonKeyFigures")
    expect(section).toContain("SectionExpander")
    expect(section).toContain("checkpoints.comparisonHeading")
    expect(section).toContain("data-cost-delta-tone")
    expect(section).toContain("formatCheckpointContextLabel")
    expect(section).toContain("comparisonComparedWith")
    expect(section).toContain("KeyFigureMetricValue")
    expect(section).toContain("KeyFigureMetricColumnHeader")
    expect(section).toContain("comparisonAbsoluteCellParts")
    expect(section).toContain("comparisonDeltaCellParts")
    expect(section).toContain("getCostDeltaClass")
    expect(section).toContain("getPercentageDeltaClass")
    expect(section).toContain("absoluteDelta")
    expect(section).toContain("percentagePointDelta")
    expect(section).toContain("absoluteDeltaClass")
    expect(section).toContain("percentageDeltaClass")
    expect(section).toContain("table-value text-right tabular-nums")
    expect(section).toContain("absoluteClassName")
    expect(section).toContain("percentClassNameOverride")
    expect(section).not.toContain("comparisonMetricPreferences")
    expect(section).not.toContain("inheritColor")
    expect(section).not.toContain("deltaGroupClass")
    expect(section).not.toContain("translateX")

    const metricValue = read("src/components/KeyFigureMetricValue.tsx")
    expect(metricValue).toContain("KeyFigureMetricColumnHeader")
    expect(metricValue).toContain("KEY_FIGURES_METRIC_GRID_INLINE")
    expect(metricValue).toContain("data-key-figure-metric-column-header")

    const presentation = read("src/lib/checkpointComparisonPresentation.ts")
    expect(presentation).toContain("getCostDeltaClass")
    expect(presentation).toContain("getPercentageDeltaClass")
    expect(presentation).not.toContain("rounded-sm bg-")

    const scurve = read("src/components/ResultsSCurve.tsx")
    expect(scurve).toContain('emphasis?: "primary" | "reference"')
    expect(scurve).toContain('data-scurve-emphasis={c.emphasis}')
    expect(scurve).toContain("strokeDasharray={isReference")
    expect(scurve).toContain('data-scurve-legend-emphasis="reference"')
  })

  it("exposes baseline and comparison i18n strings", () => {
    const messages = read("src/i18n/messages.ts")
    expect(messages).toContain('comparisonBaselineTitle: "Første checkpoint"')
    expect(messages).toContain('comparisonBaselineTitle: "First checkpoint"')
    expect(messages).toContain(
      'comparisonHeading: "Endring siden forrige checkpoint"',
    )
    expect(messages).toContain(
      'comparisonHeading: "Change since previous checkpoint"',
    )
    expect(messages).toContain("comparisonBaselineContext")
    expect(messages).toContain("comparisonComparedWith")
  })
})
