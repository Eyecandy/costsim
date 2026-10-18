import { describe, expect, it } from "vitest"

import {
  archiveCheckpoint,
  createInitialOngoingState,
  createNextCheckpoint,
  getLatestCheckpoint,
} from "@/domain/analysis/analysisCheckpoint"
import { buildArchivedAnalysisSnapshot } from "@/domain/analysis/buildArchivedAnalysisSnapshot"
import {
  buildOngoingDevelopmentSeries,
  ongoingDevelopmentAxisLabel,
} from "@/domain/analysis/ongoingDevelopmentSeries"
import { DEFAULT_RESULT_PREFERENCES } from "@/domain/results/resultPreferences"
import { createBlankWorkspaceRuntimeState } from "@/domain/analysis/workspaceReset"
import type { ProjectResult } from "@/domain/simulation/simulationTypes"
import { messages } from "@/i18n/messages"
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

function archiveWith(
  ongoing: ReturnType<typeof createInitialOngoingState>,
  base: number,
  p50: number,
  p85: number,
) {
  const tip = getLatestCheckpoint(ongoing)!
  const projectId = tip.workspace.activeProjectId
  // values chosen so percentile(50)≈p50 and percentile(85)≈p85 approximately
  const values = [
    ...Array.from({ length: 50 }, () => p50 - 10),
    ...Array.from({ length: 35 }, () => p50),
    ...Array.from({ length: 15 }, () => p85),
  ]
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

describe("buildOngoingDevelopmentSeries", () => {
  it("orders archived checkpoints and computes deltas", () => {
    const blank = createBlankWorkspaceRuntimeState()
    let ongoing = createInitialOngoingState({
      projects: blank.projects,
      activeProjectId: blank.activeProjectId,
    })
    ongoing = archiveWith(ongoing, 100, 120, 150)
    const next = createNextCheckpoint(ongoing, { name: "Decision" })
    expect(next.ok).toBe(true)
    if (!next.ok) return
    ongoing = archiveWith(next.ongoing, 110, 130, 170)

    const series = buildOngoingDevelopmentSeries({
      checkpoints: ongoing.checkpoints,
    })
    expect(series.points).toHaveLength(2)
    expect(series.points[0]!.sequence).toBe(1)
    expect(series.points[1]!.sequence).toBe(2)
    expect(series.points[1]!.name).toBe("Decision")
    expect(series.points[0]!.deltaBaseCost).toBeNull()
    expect(series.points[0]!.deltaP50).toBeNull()
    expect(series.points[1]!.deltaBaseCost).toBe(10)
    expect(series.points[0]!.source).toBe("archived")
    expect(series.points[1]!.baseCost).toBe(110)
  })

  it("includes single live draft point when that is the only result", () => {
    const blank = createBlankWorkspaceRuntimeState()
    const ongoing = createInitialOngoingState({
      projects: blank.projects,
      activeProjectId: blank.activeProjectId,
    })
    const tip = ongoing.checkpoints[0]!
    const projectId = tip.workspace.activeProjectId
    const series = buildOngoingDevelopmentSeries({
      checkpoints: ongoing.checkpoints,
      viewedCheckpointId: tip.id,
      viewedResultSource: {
        projectResults: results(projectId, [100, 110, 120, 130, 140]),
        simulatedBaseCostByProjectId: { [projectId]: 90 },
        resultsComparable: true,
      },
    })
    expect(series.points).toHaveLength(1)
    expect(series.points[0]!.source).toBe("live")
    expect(series.points[0]!.baseCost).toBe(90)
    expect(series.points[0]!.deltaP50).toBeNull()
  })

  it("returns empty points when no usable results", () => {
    const blank = createBlankWorkspaceRuntimeState()
    const ongoing = createInitialOngoingState({
      projects: blank.projects,
      activeProjectId: blank.activeProjectId,
    })
    const series = buildOngoingDevelopmentSeries({
      checkpoints: ongoing.checkpoints,
      viewedResultSource: {
        projectResults: [],
        simulatedBaseCostByProjectId: {},
        resultsComparable: false,
      },
    })
    expect(series.points).toHaveLength(0)
  })

  it("does not use stale live results for a draft tip", () => {
    const blank = createBlankWorkspaceRuntimeState()
    const ongoing = createInitialOngoingState({
      projects: blank.projects,
      activeProjectId: blank.activeProjectId,
    })
    const tip = ongoing.checkpoints[0]!
    const projectId = tip.workspace.activeProjectId
    const series = buildOngoingDevelopmentSeries({
      checkpoints: ongoing.checkpoints,
      viewedCheckpointId: tip.id,
      viewedResultSource: {
        projectResults: results(projectId, [100, 110, 120]),
        simulatedBaseCostByProjectId: { [projectId]: 90 },
        resultsComparable: false,
      },
    })
    expect(series.points).toHaveLength(0)
  })

  it("axis label is compact CP{n}", () => {
    expect(ongoingDevelopmentAxisLabel(3)).toBe("CP3")
  })

  it("ResultsPanel wires Ongoing-only development section", () => {
    const panel = readResultsPanelSource()
    expect(panel).toContain("buildOngoingDevelopmentSeries")
    expect(panel).toContain("ResultsDevelopmentChart")
    expect(panel).toContain("developmentSeries")
    expect(panel).toContain('data-ongoing-development-section=""')
    // Only when ongoing checkpoints exist
    expect(panel).toContain("if (!ongoingCheckpoints || ongoingCheckpoints.length === 0)")

    expect(messages.no.checkpoints.developmentTitle).toBe("UTVIKLING")
    expect(messages.en.checkpoints.developmentTitle).toBe("DEVELOPMENT")
  })
})
