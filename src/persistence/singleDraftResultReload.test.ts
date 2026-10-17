import { beforeEach, describe, expect, it } from "vitest"

import { getArchiveBlockReason } from "@/domain/analysis/buildArchivedAnalysisSnapshot"
import {
  clearLocalAnalysisLibraryStorageForTests,
  getLocalAnalysisLibraryRepository,
  writeJson,
} from "@/persistence/localAnalysisLibraryRepository"
import { getLiveResultValidity } from "@/domain/simulation/liveSimulationState"
import { createSimulationRunIdsForProjects } from "@/domain/simulation/simulationRunId"
import { DEFAULT_RESULT_PREFERENCES } from "@/domain/results/resultPreferences"
import { buildSimulationInputSignature } from "@/domain/simulation/simulationInputSignature"
import {
  buildSingleDraftResultSnapshot,
  freezeSingleDraftForArchive,
  isSingleDraftResultSnapshot,
  pickAuthoritativeSingleDraftResult,
  singleDraftResultIdentityMatches,
} from "@/domain/analysis/singleDraftResultSnapshot"
import { isSingleArchivedResultSnapshot } from "@/domain/analysis/singleArchivedResultSnapshot"
import { runBeforeLeaveWithoutBlocking } from "@/features/analysis-library/libraryNavigation"
import { createBlankWorkspaceRuntimeState } from "@/domain/analysis/workspaceReset"
import type { Project } from "@/domain/analysis/project"
import type { ProjectResult } from "@/domain/simulation/simulationTypes"
import { vi } from "vitest"

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

function installStorage() {
  const store = new Map<string, string>()
  let failWrites = false
  vi.stubGlobal("localStorage", {
    get length() {
      return store.size
    },
    key: (index: number) => [...store.keys()][index] ?? null,
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      if (failWrites) {
        const error = new Error("quota")
        error.name = "QuotaExceededError"
        throw error
      }
      store.set(key, String(value))
    },
    removeItem: (key: string) => {
      store.delete(key)
    },
    clear: () => store.clear(),
  })
  return {
    store,
    fail: () => {
      failWrites = true
    },
  }
}

function buildDraft(args: {
  analysisId: string
  projects: Project[]
  activeProjectId: string
  center: number
  batchSeq: number
}) {
  const results = projectResultsFor(
    args.activeProjectId,
    args.projects[0]!.incurredCosts,
    args.center,
  )
  const inputSignature = buildSimulationInputSignature(args.projects)
  return buildSingleDraftResultSnapshot({
    analysisId: args.analysisId,
    projects: args.projects,
    activeProjectId: args.activeProjectId,
    projectResults: results,
    simulatedBaseCostByProjectId: {
      [args.activeProjectId]: args.center,
    },
    inputSignature,
    simulationCount: 20_000,
    resultPreferences: DEFAULT_RESULT_PREFERENCES,
    simulationRunIdByProjectId: createSimulationRunIdsForProjects(
      [args.activeProjectId],
      args.batchSeq,
    ),
  })
}

beforeEach(() => {
  clearLocalAnalysisLibraryStorageForTests()
  vi.unstubAllGlobals()
})

describe("Single draft result reload continuity", () => {
  it("A: valid simulate → commit → cold reload restores A", async () => {
    const repo = getLocalAnalysisLibraryRepository()
    const blank = createBlankWorkspaceRuntimeState()
    const project = blank.projects[0]!
    const doc = await repo.create({
      name: "Single A",
      workspace: blank,
    })
    const draftA = buildDraft({
      analysisId: doc.id,
      projects: [project],
      activeProjectId: project.id,
      center: 1000,
      batchSeq: 1,
    })
    await repo.saveDraft({ ...doc, singleDraftResult: draftA })

    const cold = await repo.get(doc.id)
    expect(isSingleDraftResultSnapshot(cold?.singleDraftResult)).toBe(true)
    expect(
      getLiveResultValidity({
        analysisId: doc.id,
        checkpointId: null,
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
        singleDraftResult: cold!.singleDraftResult,
      }).kind,
    ).toBe("valid")
    expect(JSON.stringify(cold!.singleDraftResult)).not.toContain('"values"')
  })

  it("B: edit without rerun keeps signature and is stale after reload", async () => {
    const repo = getLocalAnalysisLibraryRepository()
    const blank = createBlankWorkspaceRuntimeState()
    const project = blank.projects[0]!
    const doc = await repo.create({
      name: "Single stale",
      workspace: blank,
    })
    const draftA = buildDraft({
      analysisId: doc.id,
      projects: [project],
      activeProjectId: project.id,
      center: 1000,
      batchSeq: 1,
    })
    const edited = {
      ...project,
      costRows: project.costRows.map((row, i) => (i === 0 ? { ...row, likely: "999" } : row)),
    }
    await repo.saveDraft({
      ...doc,
      workspace: { projects: [edited], activeProjectId: edited.id },
      singleDraftResult: draftA,
    })

    const cold = await repo.get(doc.id)
    expect(cold!.singleDraftResult!.inputSignature).toBe(draftA.inputSignature)
    expect(
      getLiveResultValidity({
        analysisId: doc.id,
        checkpointId: null,
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
        singleDraftResult: cold!.singleDraftResult,
      }).kind,
    ).toBe("stale")
  })

  it("C: rerun B replaces A; session/ref wins over disk A", async () => {
    const blank = createBlankWorkspaceRuntimeState()
    const project = blank.projects[0]!
    const draftA = buildDraft({
      analysisId: "a1",
      projects: [project],
      activeProjectId: project.id,
      center: 1000,
      batchSeq: 50,
    })
    const edited = {
      ...project,
      costRows: project.costRows.map((row, i) => (i === 0 ? { ...row, likely: "2500" } : row)),
    }
    const draftB = buildDraft({
      analysisId: "a1",
      projects: [edited],
      activeProjectId: edited.id,
      center: 5000,
      batchSeq: 1,
    })
    expect(
      pickAuthoritativeSingleDraftResult(draftB, draftA)?.byProjectId[edited.id]?.keyFigures
        .percentiles["50"],
    ).toBe(draftB.byProjectId[edited.id]!.keyFigures.percentiles["50"])

    const repo = getLocalAnalysisLibraryRepository()
    const doc = await repo.create({
      name: "Rerun",
      workspace: { projects: [edited], activeProjectId: edited.id },
    })
    await repo.saveDraft({
      ...doc,
      singleDraftResult: { ...draftB, analysisId: doc.id },
    })
    const cold = await repo.get(doc.id)
    expect(cold?.singleDraftResult?.byProjectId[edited.id]?.keyFigures.percentiles["50"]).toBe(
      draftB.byProjectId[edited.id]!.keyFigures.percentiles["50"],
    )
    expect(
      getLiveResultValidity({
        analysisId: doc.id,
        checkpointId: null,
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
        singleDraftResult: cold!.singleDraftResult,
      }).kind,
    ).toBe("valid")
  })

  it("D: archive from compact-only draft after reload", async () => {
    const repo = getLocalAnalysisLibraryRepository()
    const blank = createBlankWorkspaceRuntimeState()
    const project = blank.projects[0]!
    const doc = await repo.create({
      name: "Archive compact",
      workspace: blank,
    })
    const draft = buildDraft({
      analysisId: doc.id,
      projects: [project],
      activeProjectId: project.id,
      center: 1000,
      batchSeq: 2,
    })
    await repo.saveDraft({ ...doc, singleDraftResult: draft })
    const cold = await repo.get(doc.id)
    expect(
      getArchiveBlockReason({
        analysisId: doc.id,
        checkpointId: null,
        projects: cold!.workspace.projects,
        projectResults: [],
        lastSimulatedInputSignature: "",
        singleDraftResult: cold!.singleDraftResult,
      }),
    ).toBeNull()

    const snapshot = freezeSingleDraftForArchive({
      draft: cold!.singleDraftResult!,
      projects: cold!.workspace.projects,
    })
    const archived = await repo.archive({
      analysisId: doc.id,
      snapshot,
    })
    expect(archived.status).toBe("archived")
    expect(isSingleArchivedResultSnapshot(archived.archivedSnapshot)).toBe(true)
    expect(JSON.stringify(archived.archivedSnapshot)).not.toContain('"values"')
    expect(archived.singleDraftResult).toBeUndefined()
  })

  it("E: stale compact draft blocks archive", async () => {
    const blank = createBlankWorkspaceRuntimeState()
    const project = blank.projects[0]!
    const draft = buildDraft({
      analysisId: "a1",
      projects: [project],
      activeProjectId: project.id,
      center: 1000,
      batchSeq: 1,
    })
    const edited = {
      ...project,
      costRows: project.costRows.map((row, i) => (i === 0 ? { ...row, likely: "999" } : row)),
    }
    expect(
      getArchiveBlockReason({
        analysisId: "a1",
        checkpointId: null,
        projects: [edited],
        projectResults: [],
        lastSimulatedInputSignature: "",
        singleDraftResult: draft,
      }),
    ).toBe("stale_results")
  })

  it("F: create new version seeds singleDraftResult without raw arrays", async () => {
    const repo = getLocalAnalysisLibraryRepository()
    const blank = createBlankWorkspaceRuntimeState()
    const project = blank.projects[0]!
    const draft = await repo.create({
      name: "Version source",
      workspace: blank,
    })
    const compactDraft = buildDraft({
      analysisId: draft.id,
      projects: [project],
      activeProjectId: project.id,
      center: 1000,
      batchSeq: 1,
    })
    const archivedSnap = freezeSingleDraftForArchive({
      draft: compactDraft,
      projects: [project],
    })
    await repo.archive({ analysisId: draft.id, snapshot: archivedSnap })
    const next = await repo.createDraftFromArchived({
      archivedId: draft.id,
      name: "Version next",
    })
    expect(next.status).toBe("draft")
    expect(isSingleDraftResultSnapshot(next.singleDraftResult)).toBe(true)
    expect(next.singleDraftResult?.analysisId).toBe(next.id)
    expect(JSON.stringify(next.singleDraftResult)).not.toContain('"values"')
    expect(Object.keys(next.draftResultSeed?.compactByProjectId ?? {}).length).toBeGreaterThan(0)
  })

  it("G: contribution attach requires matching run identity", () => {
    const blank = createBlankWorkspaceRuntimeState()
    const project = blank.projects[0]!
    const draft = buildDraft({
      analysisId: "a1",
      projects: [project],
      activeProjectId: project.id,
      center: 1000,
      batchSeq: 5,
    })
    const runB = createSimulationRunIdsForProjects([project.id], 5)[project.id]!
    const runA = createSimulationRunIdsForProjects([project.id], 1)[project.id]!
    expect(
      singleDraftResultIdentityMatches({
        snapshot: draft,
        analysisId: "a1",
        activeProjectId: project.id,
        inputSignature: draft.inputSignature,
        simulationRunId: runB,
      }),
    ).toBe(true)
    expect(
      singleDraftResultIdentityMatches({
        snapshot: draft,
        analysisId: "a1",
        activeProjectId: project.id,
        inputSignature: draft.inputSignature,
        simulationRunId: runA,
      }),
    ).toBe(false)
  })

  it("H: storage contract — no raw 20k arrays; size is compact", () => {
    const blank = createBlankWorkspaceRuntimeState()
    const project = blank.projects[0]!
    const draft = buildDraft({
      analysisId: "a1",
      projects: [project],
      activeProjectId: project.id,
      center: 1000,
      batchSeq: 1,
    })
    const json = JSON.stringify(draft)
    expect(json).not.toContain('"values"')
    const bytes = new TextEncoder().encode(json).length
    console.info("single draft compact bytes", bytes)
    expect(bytes).toBeLessThan(80_000)
    expect(Object.values(draft.byProjectId)[0]!.sCurve.pointCount).toBeLessThanOrEqual(800)
  })

  it("I: quota failure is fail-closed; leave remains possible", async () => {
    const storage = installStorage()
    clearLocalAnalysisLibraryStorageForTests()
    expect(writeJson("test:single-fail", { ok: true })).toBe(true)
    storage.fail()
    expect(writeJson("test:single-fail-2", { ok: true })).toBe(false)
    await expect(
      runBeforeLeaveWithoutBlocking(async () => {
        throw new Error("quota")
      }),
    ).resolves.toBeUndefined()
  })

  it("J: Ongoing durability control still prefers session over disk", async () => {
    const { pickAuthoritativeOngoingDraftResult } =
      await import("@/domain/analysis/ongoingDraftResultCommit")
    const { buildOngoingCheckpointResultSnapshot } =
      await import("@/domain/analysis/ongoingCheckpointResultSnapshot")
    const blank = createBlankWorkspaceRuntimeState()
    const project = blank.projects[0]!
    const results = projectResultsFor(project.id, project.incurredCosts, 5000)
    const sig = buildSimulationInputSignature([project])
    const latest = buildOngoingCheckpointResultSnapshot({
      analysisId: "a1",
      checkpointId: "cp2",
      projects: [project],
      activeProjectId: project.id,
      projectResults: results,
      simulatedBaseCostByProjectId: { [project.id]: 5000 },
      inputSignature: sig,
      simulationCount: 20_000,
      resultPreferences: DEFAULT_RESULT_PREFERENCES,
      simulationRunIdByProjectId: createSimulationRunIdsForProjects([project.id], 1),
    })
    const older = buildOngoingCheckpointResultSnapshot({
      analysisId: "a1",
      checkpointId: "cp2",
      projects: [project],
      activeProjectId: project.id,
      projectResults: projectResultsFor(project.id, project.incurredCosts, 1000),
      simulatedBaseCostByProjectId: { [project.id]: 1000 },
      inputSignature: sig,
      simulationCount: 20_000,
      resultPreferences: DEFAULT_RESULT_PREFERENCES,
      simulationRunIdByProjectId: createSimulationRunIdsForProjects([project.id], 50),
    })
    expect(pickAuthoritativeOngoingDraftResult(latest, older)?.keyFigures.percentiles["50"]).toBe(
      latest.keyFigures.percentiles["50"],
    )
  })
})
