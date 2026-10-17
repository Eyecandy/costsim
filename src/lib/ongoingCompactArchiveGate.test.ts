/**
 * Ongoing archive eligibility with compact draft results (recovery step 2 gate fix).
 */
import { beforeEach, describe, expect, it } from "vitest"

import {
  archiveCheckpoint,
  createInitialOngoingState,
  createNextCheckpoint,
  getActiveCheckpoint,
} from "@/lib/analysisCheckpoint"
import {
  canArchiveCurrentResults,
  getArchiveBlockReason,
  getOngoingCompactArchiveBlockReason,
} from "@/lib/buildArchivedAnalysisSnapshot"
import {
  assertNoHeavyValuesInOngoingSnapshot,
  buildOngoingCheckpointResultSnapshot,
  freezeOngoingCompactForArchive,
  isOngoingCheckpointResultSnapshot,
} from "@/lib/ongoingCheckpointResultSnapshot"
import {
  clearLocalAnalysisLibraryStorageForTests,
  getLocalAnalysisLibraryRepository,
} from "@/lib/localAnalysisLibraryRepository"
import { DEFAULT_RESULT_PREFERENCES } from "@/lib/resultPreferences"
import { buildSimulationInputSignature } from "@/domain/simulation/simulationInputSignature"
import {
  buildSingleArchivedResultSnapshot,
  isSingleArchivedResultSnapshot,
} from "@/lib/singleArchivedResultSnapshot"
import { createBlankWorkspaceRuntimeState } from "@/lib/workspaceReset"
import type { ProjectResult } from "@/simulation.worker"

beforeEach(() => clearLocalAnalysisLibraryStorageForTests())

function makeResults(projectId: string, incurred = 0): ProjectResult[] {
  return [
    {
      projectId,
      incurredCosts: incurred,
      values: Array.from({ length: 200 }, (_, i) => 1000 + i),
      inputSeries: [],
    },
  ]
}

function makeCompact(args: {
  analysisId: string
  checkpointId: string
  projectId: string
  projects: Parameters<typeof buildOngoingCheckpointResultSnapshot>[0]["projects"]
  inputSignature: string
}) {
  return buildOngoingCheckpointResultSnapshot({
    analysisId: args.analysisId,
    checkpointId: args.checkpointId,
    projects: args.projects,
    activeProjectId: args.projectId,
    projectResults: makeResults(args.projectId),
    simulatedBaseCostByProjectId: { [args.projectId]: 100 },
    inputSignature: args.inputSignature,
    simulationCount: 200,
    resultPreferences: DEFAULT_RESULT_PREFERENCES,
  })
}

describe("Ongoing compact archive gate", () => {
  it("A: compact-only valid tip authorizes archive", () => {
    const blank = createBlankWorkspaceRuntimeState()
    const project = blank.projects[0]!
    const sig = buildSimulationInputSignature([project])
    const compact = makeCompact({
      analysisId: "a1",
      checkpointId: "c1",
      projectId: project.id,
      projects: [project],
      inputSignature: sig,
    })
    expect(
      getArchiveBlockReason({
        analysisId: "a1",
        checkpointId: "c1",
        projects: [project],
        projectResults: [],
        lastSimulatedInputSignature: sig,
        simulationState: {
          analysisId: "a1",
          checkpointId: "c1",
          inputSignature: sig,
          projectResults: [],
          simulatedBaseCostByProjectId: { [project.id]: 100 },
          activeProjectIdAtRun: project.id,
          simulationCount: 200,
          projectsAtRun: [],
        },
        ongoingCompactResult: compact,
      }),
    ).toBeNull()
    expect(
      canArchiveCurrentResults({
        analysisId: "a1",
        checkpointId: "c1",
        projects: [project],
        projectResults: [],
        lastSimulatedInputSignature: sig,
        ongoingCompactResult: compact,
      }),
    ).toBe(true)
  })

  it("B: reload-shaped persist → cold get → compact archive succeeds", async () => {
    const repo = getLocalAnalysisLibraryRepository()
    const blank = createBlankWorkspaceRuntimeState()
    const project = blank.projects[0]!
    const workspace = { projects: [project], activeProjectId: project.id }
    const doc = await repo.create({
      name: "Reload archive",
      analysisMode: "ongoing",
      workspace,
    })
    const cpId = doc.ongoing!.activeCheckpointId
    const sig = buildSimulationInputSignature([project])
    const compact = makeCompact({
      analysisId: doc.id,
      checkpointId: cpId,
      projectId: project.id,
      projects: [project],
      inputSignature: sig,
    })
    await repo.saveDraft({ ...doc, ongoingDraftResult: compact })
    const cold = await repo.get(doc.id)
    expect(cold?.ongoingDraftResult?.checkpointId).toBe(cpId)
    expect(
      getArchiveBlockReason({
        analysisId: cold!.id,
        checkpointId: cpId,
        projects: [project],
        projectResults: [],
        lastSimulatedInputSignature: compact.inputSignature,
        ongoingCompactResult: cold!.ongoingDraftResult,
      }),
    ).toBeNull()

    const frozen = freezeOngoingCompactForArchive(cold!.ongoingDraftResult!)
    const next = archiveCheckpoint(cold!.ongoing!, cpId, frozen)
    await repo.saveDraft({
      ...cold!,
      ongoing: next,
      ongoingDraftResult: undefined,
      workspace: getActiveCheckpoint(next)!.workspace,
    })
    const after = await repo.get(doc.id)
    const tip = getActiveCheckpoint(after!.ongoing!)
    expect(tip?.status).toBe("archived")
    expect(isOngoingCheckpointResultSnapshot(tip?.archivedSnapshot)).toBe(true)
    assertNoHeavyValuesInOngoingSnapshot(
      tip!.archivedSnapshot as ReturnType<typeof freezeOngoingCompactForArchive>,
    )
  })

  it("C: createNext inherited compact authorizes CP2 archive", () => {
    const blank = createBlankWorkspaceRuntimeState()
    const project = blank.projects[0]!
    const sig = buildSimulationInputSignature([project])
    let ongoing = createInitialOngoingState({
      projects: [project],
      activeProjectId: project.id,
    })
    const cp1 = ongoing.activeCheckpointId
    ongoing = archiveCheckpoint(
      ongoing,
      cp1,
      makeCompact({
        analysisId: "a1",
        checkpointId: cp1,
        projectId: project.id,
        projects: [project],
        inputSignature: sig,
      }),
    )
    const created = createNextCheckpoint(ongoing, { analysisId: "a1" })
    expect(created.ok).toBe(true)
    if (!created.ok) return
    expect(
      getArchiveBlockReason({
        analysisId: "a1",
        checkpointId: created.newCheckpoint.id,
        projects: [project],
        projectResults: [],
        lastSimulatedInputSignature: created.inheritedResult.inputSignature,
        ongoingCompactResult: created.inheritedResult,
      }),
    ).toBeNull()
  })

  it("D: analytical edit makes compact stale for archive", () => {
    const blank = createBlankWorkspaceRuntimeState()
    const project = blank.projects[0]!
    const sig = buildSimulationInputSignature([project])
    const compact = makeCompact({
      analysisId: "a1",
      checkpointId: "c1",
      projectId: project.id,
      projects: [project],
      inputSignature: sig,
    })
    const edited = {
      ...project,
      costRows: project.costRows.map((row, index) =>
        index === 0 ? { ...row, likely: "99999" } : row,
      ),
    }
    expect(
      getArchiveBlockReason({
        analysisId: "a1",
        checkpointId: "c1",
        projects: [edited],
        projectResults: [],
        lastSimulatedInputSignature: sig,
        ongoingCompactResult: compact,
      }),
    ).toBe("stale_results")
  })

  it("E: wrong checkpoint compact cannot authorize active tip", () => {
    const blank = createBlankWorkspaceRuntimeState()
    const project = blank.projects[0]!
    const sig = buildSimulationInputSignature([project])
    const compact = makeCompact({
      analysisId: "a1",
      checkpointId: "cp2",
      projectId: project.id,
      projects: [project],
      inputSignature: sig,
    })
    expect(
      getOngoingCompactArchiveBlockReason({
        analysisId: "a1",
        checkpointId: "cp3",
        projects: [project],
        compact,
      }),
    ).toBe("wrong_checkpoint")
    expect(
      getArchiveBlockReason({
        analysisId: "a1",
        checkpointId: "cp3",
        projects: [project],
        projectResults: [],
        lastSimulatedInputSignature: sig,
        ongoingCompactResult: compact,
      }),
    ).toBe("wrong_checkpoint")
  })

  it("F: live arrays still archive to compact checkpoint snapshot", () => {
    const blank = createBlankWorkspaceRuntimeState()
    const project = blank.projects[0]!
    const results = makeResults(project.id)
    const sig = buildSimulationInputSignature([project])
    expect(
      getArchiveBlockReason({
        analysisId: "a1",
        checkpointId: "c1",
        projects: [project],
        projectResults: results,
        lastSimulatedInputSignature: sig,
        simulationState: {
          analysisId: "a1",
          checkpointId: "c1",
          inputSignature: sig,
          projectResults: results,
          simulatedBaseCostByProjectId: { [project.id]: 100 },
          activeProjectIdAtRun: project.id,
          simulationCount: 200,
          projectsAtRun: [],
        },
      }),
    ).toBeNull()
    const snap = buildOngoingCheckpointResultSnapshot({
      analysisId: "a1",
      checkpointId: "c1",
      projects: [project],
      activeProjectId: project.id,
      projectResults: results,
      simulatedBaseCostByProjectId: { [project.id]: 100 },
      inputSignature: sig,
      simulationCount: 200,
      resultPreferences: DEFAULT_RESULT_PREFERENCES,
    })
    assertNoHeavyValuesInOngoingSnapshot(snap)
    let ongoing = createInitialOngoingState({
      projects: [project],
      activeProjectId: project.id,
    })
    ongoing = archiveCheckpoint(ongoing, ongoing.activeCheckpointId, snap)
    expect(
      isOngoingCheckpointResultSnapshot(
        ongoing.checkpoints[0]?.archivedSnapshot,
      ),
    ).toBe(true)
  })

  it("G: compact-only archive JSON has no 20k values", () => {
    const blank = createBlankWorkspaceRuntimeState()
    const project = blank.projects[0]!
    const sig = buildSimulationInputSignature([project])
    const compact = makeCompact({
      analysisId: "a1",
      checkpointId: "c1",
      projectId: project.id,
      projects: [project],
      inputSignature: sig,
    })
    const frozen = freezeOngoingCompactForArchive(compact)
    expect(JSON.stringify(frozen)).not.toContain('"values"')
    assertNoHeavyValuesInOngoingSnapshot(frozen)
  })

  it("H: Single live results archive through the compact Single payload", async () => {
    const repo = getLocalAnalysisLibraryRepository()
    const blank = createBlankWorkspaceRuntimeState()
    const project = blank.projects[0]!
    const doc = await repo.create({
      name: "Single control",
      analysisMode: "single",
      workspace: blank,
    })
    const results = makeResults(project.id, project.incurredCosts)
    const sig = buildSimulationInputSignature(blank.projects)
    expect(
      canArchiveCurrentResults({
        analysisId: doc.id,
        checkpointId: null,
        projects: blank.projects,
        projectResults: results,
        lastSimulatedInputSignature: sig,
        ongoingCompactResult: null,
      }),
    ).toBe(true)
    const snapshot = buildSingleArchivedResultSnapshot({
      analysisId: doc.id,
      projects: blank.projects,
      activeProjectId: blank.activeProjectId,
      projectResults: results,
      simulatedBaseCostByProjectId: { [project.id]: 100 },
      inputSignature: sig,
      simulationCount: 200,
      resultPreferences: DEFAULT_RESULT_PREFERENCES,
    })
    const archived = await repo.archive({ analysisId: doc.id, snapshot })
    expect(archived.status).toBe("archived")
    expect(isSingleArchivedResultSnapshot(archived.archivedSnapshot)).toBe(true)
    expect(JSON.stringify(archived.archivedSnapshot)).not.toContain('"values"')
  })

  it("I: Single stale semantics unchanged (compact ignored)", () => {
    const blank = createBlankWorkspaceRuntimeState()
    const project = blank.projects[0]!
    const results = makeResults(project.id)
    const sig = buildSimulationInputSignature([project])
    const edited = {
      ...project,
      costRows: project.costRows.map((row, index) =>
        index === 0 ? { ...row, likely: "888" } : row,
      ),
    }
    const decoyCompact = makeCompact({
      analysisId: "a1",
      checkpointId: "should-not-apply",
      projectId: project.id,
      projects: [project],
      inputSignature: sig,
    })
    expect(
      getArchiveBlockReason({
        analysisId: "a1",
        checkpointId: null,
        projects: [edited],
        projectResults: results,
        lastSimulatedInputSignature: sig,
        ongoingCompactResult: decoyCompact,
      }),
    ).toBe("stale_results")
  })
})
