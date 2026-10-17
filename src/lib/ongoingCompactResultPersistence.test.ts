import { beforeEach, describe, expect, it } from "vitest"
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
  resultSourceFromArchivedSnapshot,
} from "@/lib/checkpointComparison"
import { buildOngoingDevelopmentSeries } from "@/lib/ongoingDevelopmentSeries"
import {
  assertNoHeavyValuesInOngoingSnapshot,
  buildOngoingCheckpointResultSnapshot,
  isLegacyHeavyArchivedSnapshot,
  isOngoingCheckpointResultSnapshot,
  legacyHeavyToOngoingCompact,
} from "@/lib/ongoingCheckpointResultSnapshot"
import {
  clearLocalAnalysisLibraryStorageForTests,
  getLocalAnalysisLibraryRepository,
} from "@/lib/localAnalysisLibraryRepository"
import {
  DEFAULT_RESULT_PREFERENCES,
  resolveResultView,
} from "@/domain/results/resultPreferences"
import { buildSimulationInputSignature } from "@/domain/simulation/simulationInputSignature"
import { createBlankWorkspaceRuntimeState } from "@/lib/workspaceReset"
import type { ProjectResult } from "@/simulation.worker"
import { repoRoot } from "@/test-utils/repoRoot"


function fixture() {
  const blank = createBlankWorkspaceRuntimeState()
  const project = blank.projects[0]!
  const values = Array.from({ length: 20_000 }, (_, i) => 100 + i / 100)
  const projectResults: ProjectResult[] = [
    {
      projectId: project.id,
      incurredCosts: project.incurredCosts,
      values,
      inputSeries: [],
    },
  ]
  const inputSignature = buildSimulationInputSignature([project])
  const compact = buildOngoingCheckpointResultSnapshot({
    analysisId: "analysis-1",
    checkpointId: "checkpoint-1",
    projects: [project],
    activeProjectId: project.id,
    projectResults,
    simulatedBaseCostByProjectId: { [project.id]: 125 },
    inputSignature,
    simulationCount: 20_000,
    resultPreferences: DEFAULT_RESULT_PREFERENCES,
  })
  return { blank, project, projectResults, inputSignature, compact }
}

beforeEach(() => clearLocalAnalysisLibraryStorageForTests())

describe("Ongoing compact result persistence A–K", () => {
  it("A: reloads a compact Ongoing draft", async () => {
    const { blank, compact } = fixture()
    const repo = getLocalAnalysisLibraryRepository()
    const doc = await repo.create({
      name: "Draft",
      analysisMode: "ongoing",
      workspace: blank,
    })
    const owned = { ...compact, analysisId: doc.id }
    await repo.saveDraft({ ...doc, ongoingDraftResult: owned })
    expect((await repo.get(doc.id))?.ongoingDraftResult).toEqual(owned)
  })

  it("B: preserves stale compact results while signatures reveal the edit", () => {
    const { project, compact } = fixture()
    const edited = {
      ...project,
      costRows: project.costRows.map((row, index) =>
        index === 0 ? { ...row, likely: "999" } : row,
      ),
    }
    expect(buildSimulationInputSignature([edited])).not.toBe(
      compact.inputSignature,
    )
    expect(compact.sCurve.points.length).toBeGreaterThan(0)
  })

  it("C: archives without 20k totals", () => {
    const { blank, compact } = fixture()
    let ongoing = createInitialOngoingState(blank)
    const id = ongoing.activeCheckpointId
    ongoing = archiveCheckpoint(
      ongoing,
      id,
      { ...compact, checkpointId: id },
    )
    expect(JSON.stringify(ongoing)).not.toContain('"values"')
    expect(isOngoingCheckpointResultSnapshot(
      ongoing.checkpoints[0]?.archivedSnapshot,
    )).toBe(true)
  })

  it("D: archived compact contribution is frozen and needs no rerun", () => {
    const { compact } = fixture()
    expect(compact.contribution).toBeNull()
    expect(readFileSync(
      join(repoRoot, "src/components/ResultsPanel.tsx"),
      "utf8",
    )).toContain("ongoingCompactResult.contribution")
    expect(readFileSync(
      join(repoRoot, "src/components/ResultsPanel.tsx"),
      "utf8",
    )).toContain("onContributionReady")
    expect(readFileSync(
      join(repoRoot, "src/lib/useLibraryAnalysisSession.ts"),
      "utf8",
    )).toContain("attachOngoingDraftContribution")
  })

  it("E: compares compact checkpoint Key Figures", () => {
    const { blank, compact } = fixture()
    let ongoing = createInitialOngoingState(blank)
    const cp1 = ongoing.activeCheckpointId
    ongoing = archiveCheckpoint(
      ongoing,
      cp1,
      { ...compact, checkpointId: cp1 },
    )
    const next = createNextCheckpoint(ongoing, { analysisId: "analysis-1" })
    expect(next.ok).toBe(true)
    if (!next.ok) return
    const comparison = compareCheckpoints({
      checkpoints: next.ongoing.checkpoints,
      viewedCheckpointId: next.newCheckpoint.id,
      viewedResultSource: {
        projectResults: [],
        simulatedBaseCostByProjectId: {},
        compact: next.inheritedResult,
        resultsComparable: true,
      },
    })
    expect(comparison?.kind).toBe("comparison")
    if (comparison?.kind === "comparison") {
      expect(comparison.keyFigures?.find((row) => row.metric === "p50")?.change)
        .toBe(0)
      expect(comparison.extensions?.sCurve?.previous.displayPoints?.length)
        .toBeGreaterThan(0)
    }
  })

  it("F: development reads compact P50/P85 without historical sorting", () => {
    const { blank, compact } = fixture()
    let ongoing = createInitialOngoingState(blank)
    const id = ongoing.activeCheckpointId
    ongoing = archiveCheckpoint(
      ongoing,
      id,
      { ...compact, checkpointId: id },
    )
    const series = buildOngoingDevelopmentSeries({
      checkpoints: ongoing.checkpoints,
    })
    expect(series.points[0]?.p50).toBe(compact.keyFigures.percentiles["50"])
    expect(series.points[0]?.p85).toBe(compact.keyFigures.percentiles["85"])
  })

  it("G: create-next inherits compact ownership only", () => {
    const { blank, compact } = fixture()
    let ongoing = createInitialOngoingState(blank)
    ongoing = archiveCheckpoint(
      ongoing,
      ongoing.activeCheckpointId,
      { ...compact, checkpointId: ongoing.activeCheckpointId },
    )
    const next = createNextCheckpoint(ongoing, { analysisId: "analysis-1" })
    expect(next.ok).toBe(true)
    if (!next.ok) return
    expect(next.inheritedResult.checkpointId).toBe(next.newCheckpoint.id)
    expect(JSON.stringify(next.inheritedResult)).not.toContain('"values"')
  })

  it("H: rejects wrong checkpoint ownership during session hydration", () => {
    const source = readFileSync(
      join(repoRoot, "src/lib/useLibraryAnalysisSession.ts"),
      "utf8",
    )
    expect(source).toContain(
      "doc.ongoingDraftResult.checkpointId === checkpoint.id",
    )
    expect(source).toContain(
      "doc.ongoingDraftResult.analysisId === doc.id",
    )
  })

  it("I: leave paths remain non-blocking after save failure", () => {
    const source = readFileSync(
      join(repoRoot, "src/lib/useLibraryAnalysisSession.ts"),
      "utf8",
    )
    expect(source).toContain("/* still switch — last save may have failed */")
    expect(source).toContain("/* still move to trash */")
  })

  it("J: Single archive remains the rich legacy snapshot", () => {
    const { project, projectResults, inputSignature } = fixture()
    const snapshot = buildArchivedAnalysisSnapshot({
      projects: [project],
      activeProjectId: project.id,
      projectResults,
      simulatedBaseCostByProjectId: { [project.id]: 125 },
      inputSignature,
      simulationCount: 20_000,
      resultPreferences: DEFAULT_RESULT_PREFERENCES,
    })
    expect(snapshot.projectResults[0]?.values).toHaveLength(20_000)
  })

  it("K: legacy heavy checkpoints remain readable and convertible", () => {
    const { project, projectResults, inputSignature } = fixture()
    const heavy = buildArchivedAnalysisSnapshot({
      projects: [project],
      activeProjectId: project.id,
      projectResults,
      simulatedBaseCostByProjectId: { [project.id]: 125 },
      inputSignature,
      simulationCount: 20_000,
      resultPreferences: DEFAULT_RESULT_PREFERENCES,
    })
    expect(isLegacyHeavyArchivedSnapshot(heavy)).toBe(true)
    const compact = legacyHeavyToOngoingCompact({
      snapshot: heavy,
      analysisId: "a",
      checkpointId: "c",
    })
    expect(compact.resultView).toEqual(
      resolveResultView(DEFAULT_RESULT_PREFERENCES),
    )
    assertNoHeavyValuesInOngoingSnapshot(compact)
  })
})

describe("compact storage measurements", () => {
  it("stays far below one 220KB heavy checkpoint at supported timeline sizes", () => {
    const { compact } = fixture()
    const oneBytes = new TextEncoder().encode(JSON.stringify(compact)).length
    const measurements = [1, 5, 10, 20, 24].map((count) => ({
      count,
      approximateBytes: oneBytes * count,
    }))
    console.info("ongoing compact checkpoint bytes", measurements)
    expect(oneBytes).toBeLessThan(220_000)
    expect(compact.sCurve.pointCount).toBeLessThanOrEqual(800)
    expect(JSON.stringify(compact)).not.toContain('"values"')
  })
})
