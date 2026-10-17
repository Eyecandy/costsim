import { beforeEach, describe, expect, it } from "vitest"

import {
  archiveCheckpoint,
  createInitialOngoingState,
  createNextCheckpoint,
} from "@/lib/analysisCheckpoint"
import { buildArchivedAnalysisSnapshot } from "@/lib/buildArchivedAnalysisSnapshot"
import {
  getArchiveBlockReason,
  getOngoingCompactArchiveBlockReason,
} from "@/lib/buildArchivedAnalysisSnapshot"
import {
  buildOngoingCheckpointResultSnapshot,
  freezeOngoingCompactForArchive,
  isOngoingCheckpointResultSnapshot,
} from "@/lib/ongoingCheckpointResultSnapshot"
import {
  ongoingDraftResultIdentityMatches,
  pickAuthoritativeOngoingDraftResult,
} from "@/lib/ongoingDraftResultCommit"
import {
  clearLocalAnalysisLibraryStorageForTests,
  getLocalAnalysisLibraryRepository,
} from "@/lib/localAnalysisLibraryRepository"
import { getLiveResultValidity } from "@/lib/liveSimulationState"
import { createSimulationRunIdsForProjects } from "@/lib/simulationRunId"
import { DEFAULT_RESULT_PREFERENCES } from "@/lib/resultPreferences"
import { buildSimulationInputSignature } from "@/lib/simulationInputSignature"
import type { OngoingAnalysisState } from "@/lib/analysisCheckpoint"
import type { Project } from "@/lib/project"
import { createBlankWorkspaceRuntimeState } from "@/lib/workspaceReset"
import type { ProjectResult } from "@/simulation.worker"

function valuesAround(center: number): number[] {
  return Array.from({ length: 20_000 }, (_, i) => center + (i - 10_000) * 0.01)
}

function projectResultsFor(
  projectId: string,
  incurredCosts: number,
  center: number,
): ProjectResult[] {
  return [
    {
      projectId,
      incurredCosts,
      values: valuesAround(center),
      inputSeries: [],
    },
  ]
}

function ensureWs(project: Project): {
  projects: Project[]
  activeProjectId: string
} {
  return { projects: [project], activeProjectId: project.id }
}

function syncWs(
  ongoing: OngoingAnalysisState,
  project: Project,
): OngoingAnalysisState {
  const activeId = ongoing.activeCheckpointId
  return {
    ...ongoing,
    checkpoints: ongoing.checkpoints.map((cp) =>
      cp.id === activeId
        ? {
            ...cp,
            workspace: {
              projects: [project],
              activeProjectId: project.id,
            },
          }
        : cp,
    ),
  }
}

function buildCompact(args: {
  analysisId: string
  checkpointId: string
  project: Project
  center: number
  inputSignature: string
  batchSeq: number
}) {
  const results = projectResultsFor(
    args.project.id,
    args.project.incurredCosts,
    args.center,
  )
  return buildOngoingCheckpointResultSnapshot({
    analysisId: args.analysisId,
    checkpointId: args.checkpointId,
    projects: [args.project],
    activeProjectId: args.project.id,
    projectResults: results,
    simulatedBaseCostByProjectId: { [args.project.id]: args.center },
    inputSignature: args.inputSignature,
    simulationCount: 20_000,
    resultPreferences: DEFAULT_RESULT_PREFERENCES,
    simulationRunIdByProjectId: createSimulationRunIdsForProjects(
      [args.project.id],
      args.batchSeq,
    ),
  })
}

beforeEach(() => clearLocalAnalysisLibraryStorageForTests())

describe("Ongoing draft result reload regression", () => {
  it("A: createNext reload restores inherited compact as valid", async () => {
    const repo = getLocalAnalysisLibraryRepository()
    const blank = createBlankWorkspaceRuntimeState()
    const project = blank.projects[0]!
    const doc = await repo.create({
      name: "Create next",
      analysisMode: "ongoing",
      workspace: blank,
    })

    let ongoing = createInitialOngoingState(blank)
    const cp1Id = ongoing.activeCheckpointId
    const sigA = buildSimulationInputSignature([project])
    const compactA = buildCompact({
      analysisId: doc.id,
      checkpointId: cp1Id,
      project,
      center: 1000,
      inputSignature: sigA,
      batchSeq: 1,
    })
    ongoing = archiveCheckpoint(ongoing, cp1Id, compactA)
    const created = createNextCheckpoint(ongoing, {
      name: "CP2",
      analysisId: doc.id,
    })
    expect(created.ok).toBe(true)
    if (!created.ok) return

    await repo.saveDraft({
      ...(await repo.get(doc.id))!,
      ongoing: created.ongoing,
      workspace: ensureWs(project),
      ongoingDraftResult: created.inheritedResult,
    })

    const cold = await repo.get(doc.id)
    expect(cold?.ongoingDraftResult?.checkpointId).toBe(created.newCheckpoint.id)
    expect(
      getLiveResultValidity({
        analysisId: doc.id,
        checkpointId: created.newCheckpoint.id,
        currentProjects: cold!.workspace.projects,
        simulationState: {
          analysisId: null,
          checkpointId: null,
          inputSignature: "",
          projectResults: [],
          simulatedBaseCostByProjectId: {},
          activeProjectIdAtRun: "",
          simulationCount: 0,
          projectsAtRun: [],
        },
        ongoingCompactResult: cold!.ongoingDraftResult,
      }).kind,
    ).toBe("valid")
  })

  it("B: edit without rerun keeps compact signature and classifies stale", async () => {
    const blank = createBlankWorkspaceRuntimeState()
    const project = blank.projects[0]!
    const sigA = buildSimulationInputSignature([project])
    const compactA = buildCompact({
      analysisId: "analysis-1",
      checkpointId: "cp2",
      project,
      center: 1000,
      inputSignature: sigA,
      batchSeq: 1,
    })
    const edited = {
      ...project,
      costRows: project.costRows.map((row, i) =>
        i === 0 ? { ...row, likely: "999" } : row,
      ),
    }
    expect(buildSimulationInputSignature([edited])).not.toBe(sigA)
    expect(compactA.inputSignature).toBe(sigA)

    expect(
      getLiveResultValidity({
        analysisId: "analysis-1",
        checkpointId: "cp2",
        currentProjects: [edited],
        simulationState: {
          analysisId: null,
          checkpointId: null,
          inputSignature: "",
          projectResults: [],
          simulatedBaseCostByProjectId: {},
          activeProjectIdAtRun: "",
          simulationCount: 0,
          projectsAtRun: [],
        },
        ongoingCompactResult: compactA,
      }).kind,
    ).toBe("stale")
  })

  it("C: prompt commit persists B before reload window", async () => {
    const repo = getLocalAnalysisLibraryRepository()
    const blank = createBlankWorkspaceRuntimeState()
    const project = blank.projects[0]!
    const doc = await repo.create({
      name: "Rerun",
      analysisMode: "ongoing",
      workspace: blank,
    })

    let ongoing = createInitialOngoingState(blank)
    const sigA = buildSimulationInputSignature([project])
    ongoing = archiveCheckpoint(
      ongoing,
      ongoing.activeCheckpointId,
      buildCompact({
        analysisId: doc.id,
        checkpointId: ongoing.activeCheckpointId,
        project,
        center: 1000,
        inputSignature: sigA,
        batchSeq: 1,
      }),
    )
    const created = createNextCheckpoint(ongoing, {
      name: "CP2",
      analysisId: doc.id,
    })
    expect(created.ok).toBe(true)
    if (!created.ok) return

    const inherited = created.inheritedResult
    const p50A = inherited.keyFigures.percentiles["50"]!

    const edited = {
      ...project,
      costRows: project.costRows.map((row, i) =>
        i === 0 ? { ...row, likely: "2500" } : row,
      ),
    }
    const sigB = buildSimulationInputSignature([edited])
    const compactB = buildCompact({
      analysisId: doc.id,
      checkpointId: created.newCheckpoint.id,
      project: edited,
      center: 5000,
      inputSignature: sigB,
      batchSeq: 5,
    })
    const p50B = compactB.keyFigures.percentiles["50"]!
    expect(p50B).not.toBe(p50A)

    await repo.saveDraft({
      ...(await repo.get(doc.id))!,
      ongoing: syncWs(created.ongoing, edited),
      workspace: ensureWs(edited),
      ongoingDraftResult: compactB,
    })

    const cold = await repo.get(doc.id)
    expect(cold?.ongoingDraftResult?.keyFigures.percentiles["50"]).toBe(p50B)
    expect(cold?.ongoingDraftResult?.inputSignature).toBe(sigB)
    expect(cold?.ongoingDraftResult?.keyFigures.percentiles["50"]).not.toBe(p50A)
  })

  it("D: session/ref is authoritative over disk; no batchSeq ordering", () => {
    const blank = createBlankWorkspaceRuntimeState()
    const project = blank.projects[0]!
    const sigA = buildSimulationInputSignature([project])
    const sigB = buildSimulationInputSignature([
      {
        ...project,
        costRows: project.costRows.map((row, i) =>
          i === 0 ? { ...row, likely: "2500" } : row,
        ),
      },
    ])
    const inherited = buildCompact({
      analysisId: "analysis-1",
      checkpointId: "cp2",
      project,
      center: 1000,
      inputSignature: sigA,
      batchSeq: 1,
    })
    const latest = buildCompact({
      analysisId: "analysis-1",
      checkpointId: "cp2",
      project,
      center: 5000,
      inputSignature: sigB,
      batchSeq: 5,
    })

    // Explicit commit updates the session ref first — that ref wins on save.
    expect(
      pickAuthoritativeOngoingDraftResult(latest, inherited)?.keyFigures
        .percentiles["50"],
    ).toBe(latest.keyFigures.percentiles["50"])
    // Disk-only fallback when session has no compact yet.
    expect(
      pickAuthoritativeOngoingDraftResult(null, latest)?.keyFigures.percentiles[
        "50"
      ],
    ).toBe(latest.keyFigures.percentiles["50"])
  })

  it("D2: prior-session high batchSeq must not beat new-session lower batchSeq", async () => {
    const repo = getLocalAnalysisLibraryRepository()
    const blank = createBlankWorkspaceRuntimeState()
    const project = blank.projects[0]!
    const doc = await repo.create({
      name: "Cross session seq",
      analysisMode: "ongoing",
      workspace: blank,
    })

    const sigA = buildSimulationInputSignature([project])
    const priorSessionA = buildCompact({
      analysisId: doc.id,
      checkpointId: "cp2",
      project,
      center: 1000,
      inputSignature: sigA,
      batchSeq: 50,
    })
    await repo.saveDraft({
      ...doc,
      ongoingDraftResult: priorSessionA,
    })

    // New browser session: runSeqRef resets; first sim may be batchSeq=1.
    const edited = {
      ...project,
      costRows: project.costRows.map((row, i) =>
        i === 0 ? { ...row, likely: "2500" } : row,
      ),
    }
    const sigB = buildSimulationInputSignature([edited])
    const newSessionB = buildCompact({
      analysisId: doc.id,
      checkpointId: "cp2",
      project: edited,
      center: 5000,
      inputSignature: sigB,
      batchSeq: 1,
    })
    expect(
      (newSessionB.simulationRunIdByProjectId?.[edited.id] ?? "").startsWith(
        "1:",
      ),
    ).toBe(true)
    expect(
      (priorSessionA.simulationRunIdByProjectId?.[project.id] ?? "").startsWith(
        "50:",
      ),
    ).toBe(true)

    const diskBefore = (await repo.get(doc.id))!.ongoingDraftResult
    const chosen = pickAuthoritativeOngoingDraftResult(newSessionB, diskBefore)
    expect(chosen?.keyFigures.percentiles["50"]).toBe(
      newSessionB.keyFigures.percentiles["50"],
    )
    expect(chosen?.inputSignature).toBe(sigB)

    await repo.saveDraft({
      ...(await repo.get(doc.id))!,
      workspace: ensureWs(edited),
      ongoingDraftResult: chosen,
    })

    const cold = await repo.get(doc.id)
    expect(cold?.ongoingDraftResult?.keyFigures.percentiles["50"]).toBe(
      newSessionB.keyFigures.percentiles["50"],
    )
    expect(cold?.ongoingDraftResult?.inputSignature).toBe(sigB)
    expect(cold?.ongoingDraftResult?.keyFigures.percentiles["50"]).not.toBe(
      priorSessionA.keyFigures.percentiles["50"],
    )
  })

  it("E: same-signature reruns keep distinct run identity", () => {
    const runB = createSimulationRunIdsForProjects(["p1"], 2)["p1"]!
    const runC = createSimulationRunIdsForProjects(["p1"], 3)["p1"]!
    expect(runB).not.toBe(runC)
  })

  it("F: contribution attach requires matching run identity", () => {
    const blank = createBlankWorkspaceRuntimeState()
    const project = blank.projects[0]!
    const sig = buildSimulationInputSignature([project])
    const compactB = buildCompact({
      analysisId: "analysis-1",
      checkpointId: "cp2",
      project,
      center: 5000,
      inputSignature: sig,
      batchSeq: 5,
    })
    const runB = createSimulationRunIdsForProjects([project.id], 5)[project.id]!
    const runA = createSimulationRunIdsForProjects([project.id], 1)[project.id]!

    expect(
      ongoingDraftResultIdentityMatches({
        snapshot: compactB,
        analysisId: "analysis-1",
        checkpointId: "cp2",
        activeProjectId: project.id,
        inputSignature: sig,
        simulationRunId: runB,
      }),
    ).toBe(true)
    expect(
      ongoingDraftResultIdentityMatches({
        snapshot: compactB,
        analysisId: "analysis-1",
        checkpointId: "cp2",
        activeProjectId: project.id,
        inputSignature: sig,
        simulationRunId: runA,
      }),
    ).toBe(false)
  })

  it("G: archived compact after reload remains archivable without raw arrays", async () => {
    const repo = getLocalAnalysisLibraryRepository()
    const blank = createBlankWorkspaceRuntimeState()
    const project = blank.projects[0]!
    const doc = await repo.create({
      name: "Archive",
      analysisMode: "ongoing",
      workspace: blank,
    })
    const sig = buildSimulationInputSignature([project])
    const compact = buildCompact({
      analysisId: doc.id,
      checkpointId: "cp2",
      project,
      center: 5000,
      inputSignature: sig,
      batchSeq: 5,
    })
    await repo.saveDraft({
      ...doc,
      ongoingDraftResult: compact,
    })
    const cold = await repo.get(doc.id)
    expect(
      getArchiveBlockReason({
        analysisId: doc.id,
        checkpointId: "cp2",
        projects: cold!.workspace.projects,
        projectResults: [],
        lastSimulatedInputSignature: "",
        ongoingCompactResult: cold!.ongoingDraftResult,
      }),
    ).toBeNull()
    const frozen = freezeOngoingCompactForArchive(cold!.ongoingDraftResult!)
    expect(JSON.stringify(frozen)).not.toContain('"values"')
    expect(isOngoingCheckpointResultSnapshot(frozen)).toBe(true)
  })

  it("H: stale compact blocks archive after edit/reload", async () => {
    const blank = createBlankWorkspaceRuntimeState()
    const project = blank.projects[0]!
    const sig = buildSimulationInputSignature([project])
    const compact = buildCompact({
      analysisId: "analysis-1",
      checkpointId: "cp2",
      project,
      center: 5000,
      inputSignature: sig,
      batchSeq: 5,
    })
    const edited = {
      ...project,
      costRows: project.costRows.map((row, i) =>
        i === 0 ? { ...row, likely: "999" } : row,
      ),
    }
    expect(
      getOngoingCompactArchiveBlockReason({
        analysisId: "analysis-1",
        checkpointId: "cp2",
        projects: [edited],
        compact,
      }),
    ).toBe("stale_results")
  })

  it("I: persisted Ongoing draft/archived compact contains no raw 20k arrays", () => {
    const blank = createBlankWorkspaceRuntimeState()
    const project = blank.projects[0]!
    const sig = buildSimulationInputSignature([project])
    const compact = buildCompact({
      analysisId: "analysis-1",
      checkpointId: "cp2",
      project,
      center: 5000,
      inputSignature: sig,
      batchSeq: 5,
    })
    expect(JSON.stringify(compact)).not.toContain('"values"')
    expect(compact.sCurve.pointCount).toBeLessThanOrEqual(800)
  })

  it("J: Single archive control remains heavy legacy snapshot", () => {
    const blank = createBlankWorkspaceRuntimeState()
    const project = blank.projects[0]!
    const results = projectResultsFor(project.id, project.incurredCosts, 1000)
    const sig = buildSimulationInputSignature([project])
    const heavy = buildArchivedAnalysisSnapshot({
      projects: [project],
      activeProjectId: project.id,
      projectResults: results,
      simulatedBaseCostByProjectId: { [project.id]: 1000 },
      inputSignature: sig,
      simulationCount: 20_000,
      resultPreferences: DEFAULT_RESULT_PREFERENCES,
    })
    expect(heavy.projectResults[0]?.values).toHaveLength(20_000)
  })
})
