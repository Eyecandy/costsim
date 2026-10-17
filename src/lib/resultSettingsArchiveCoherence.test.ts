/**
 * Result Settings archive coherence + createNext durable-first + quota classification.
 */
import { beforeEach, describe, expect, it, vi } from "vitest"

import {
  archiveCheckpoint,
  createInitialOngoingState,
  createNextCheckpoint,
  ensureSingleProjectWorkspace,
} from "@/lib/analysisCheckpoint"
import { getArchiveBlockReason } from "@/lib/buildArchivedAnalysisSnapshot"
import {
  AnalysisPersistenceError,
  clearLocalAnalysisLibraryStorageForTests,
  getLocalAnalysisLibraryRepository,
  isQuotaExceededStorageError,
  librarySaveStatusFromError,
  writeJson,
  LIBRARY_STORAGE_KEYS,
} from "@/lib/localAnalysisLibraryRepository"
import {
  buildOngoingCheckpointResultSnapshot,
  freezeOngoingCompactForArchive,
} from "@/lib/ongoingCheckpointResultSnapshot"
import {
  DEFAULT_RESULT_PREFERENCES,
  addKeyFigurePercentile,
  cloneResultPreferences,
} from "@/domain/results/resultPreferences"
import {
  compactFrozenKeyFiguresSupportPreferences,
  compactSnapshotSupportsResultPreferences,
} from "@/domain/results/resultSettingsPresentation"
import { buildSimulationInputSignature } from "@/domain/simulation/simulationInputSignature"
import { createBlankWorkspaceRuntimeState } from "@/lib/workspaceReset"
import type { Project } from "@/lib/project"
import type { ProjectResult } from "@/simulation.worker"

function valuesAround(center: number, n = 200): number[] {
  return Array.from({ length: n }, (_, i) => center + (i - n / 2) * 0.01)
}

function resultsFor(project: Project, center: number): ProjectResult[] {
  return [
    {
      projectId: project.id,
      incurredCosts: project.incurredCosts,
      values: valuesAround(center),
      inputSeries: [],
    },
  ]
}

function prefsWithP70() {
  return addKeyFigurePercentile(DEFAULT_RESULT_PREFERENCES, 70)
}

function makeDefaultCompact(
  analysisId: string,
  checkpointId: string,
  project: Project,
  prefs = DEFAULT_RESULT_PREFERENCES,
) {
  return buildOngoingCheckpointResultSnapshot({
    analysisId,
    checkpointId,
    projects: [project],
    activeProjectId: project.id,
    projectResults: resultsFor(project, 1000),
    simulatedBaseCostByProjectId: { [project.id]: 100 },
    inputSignature: buildSimulationInputSignature([project]),
    simulationCount: 20_000,
    resultPreferences: prefs,
  })
}

beforeEach(() => clearLocalAnalysisLibraryStorageForTests())

describe("Result Settings archive coherence", () => {
  it("A: compact-only P70 blocks archive with result_settings_need_rerun", () => {
    const blank = createBlankWorkspaceRuntimeState()
    const project = blank.projects[0]!
    const ongoing = createInitialOngoingState({
      projects: [project],
      activeProjectId: project.id,
    })
    const compact = makeDefaultCompact("a1", ongoing.activeCheckpointId, project)
    const prefs = prefsWithP70()

    expect(compactSnapshotSupportsResultPreferences(compact, prefs)).toBe(false)
    expect(
      getArchiveBlockReason({
        analysisId: "a1",
        checkpointId: ongoing.activeCheckpointId,
        projects: [project],
        projectResults: [],
        lastSimulatedInputSignature: compact.inputSignature,
        ongoingCompactResult: compact,
        resultPreferences: prefs,
      }),
    ).toBe("result_settings_need_rerun")
  })

  it("B: pure presentation (showStdDev) allows archive without rerun", () => {
    const blank = createBlankWorkspaceRuntimeState()
    const project = blank.projects[0]!
    const ongoing = createInitialOngoingState({
      projects: [project],
      activeProjectId: project.id,
    })
    const compact = makeDefaultCompact("a1", ongoing.activeCheckpointId, project)
    const prefs = cloneResultPreferences(DEFAULT_RESULT_PREFERENCES)
    prefs.keyFigures.showStdDev = true

    expect(compactFrozenKeyFiguresSupportPreferences(compact.keyFigures, prefs)).toBe(
      true,
    )
    expect(
      getArchiveBlockReason({
        analysisId: "a1",
        checkpointId: ongoing.activeCheckpointId,
        projects: [project],
        projectResults: [],
        lastSimulatedInputSignature: compact.inputSignature,
        ongoingCompactResult: compact,
        resultPreferences: prefs,
      }),
    ).toBeNull()

    const frozen = freezeOngoingCompactForArchive(compact, {
      resultPreferences: prefs,
    })
    expect(frozen.resultPreferences.keyFigures.showStdDev).toBe(true)
    expect(frozen.resultView.keyFigures.showStdDev).toBe(true)
    expect(Object.keys(frozen.keyFigures.percentiles).sort()).toEqual(["50", "85"])
  })

  it("C: live arrays + P70 archive includes P70", () => {
    const blank = createBlankWorkspaceRuntimeState()
    const project = blank.projects[0]!
    const ongoing = createInitialOngoingState({
      projects: [project],
      activeProjectId: project.id,
    })
    const prefs = prefsWithP70()
    const liveResults = resultsFor(project, 1000)

    expect(
      getArchiveBlockReason({
        analysisId: "a1",
        checkpointId: ongoing.activeCheckpointId,
        projects: [project],
        projectResults: liveResults,
        lastSimulatedInputSignature: buildSimulationInputSignature([project]),
        ongoingCompactResult: makeDefaultCompact(
          "a1",
          ongoing.activeCheckpointId,
          project,
        ),
        resultPreferences: prefs,
      }),
    ).toBeNull()

    const snapshot = buildOngoingCheckpointResultSnapshot({
      analysisId: "a1",
      checkpointId: ongoing.activeCheckpointId,
      projects: [project],
      activeProjectId: project.id,
      projectResults: liveResults,
      simulatedBaseCostByProjectId: { [project.id]: 100 },
      inputSignature: buildSimulationInputSignature([project]),
      simulationCount: 20_000,
      resultPreferences: prefs,
    })
    expect(snapshot.resultPreferences.keyFigures.percentiles).toEqual([50, 70, 85])
    expect(snapshot.keyFigures.percentiles["70"]).toEqual(expect.any(Number))
    expect(snapshot.resultView.keyFigures.percentiles).toContain(70)
  })

  it("D: compact-only + P70 + rerun then archive includes P70", () => {
    const blank = createBlankWorkspaceRuntimeState()
    const project = blank.projects[0]!
    const ongoing = createInitialOngoingState({
      projects: [project],
      activeProjectId: project.id,
    })
    const prefs = prefsWithP70()
    const afterRerun = makeDefaultCompact(
      "a1",
      ongoing.activeCheckpointId,
      project,
      prefs,
    )

    expect(compactSnapshotSupportsResultPreferences(afterRerun, prefs)).toBe(true)
    expect(
      getArchiveBlockReason({
        analysisId: "a1",
        checkpointId: ongoing.activeCheckpointId,
        projects: [project],
        projectResults: [],
        lastSimulatedInputSignature: afterRerun.inputSignature,
        ongoingCompactResult: afterRerun,
        resultPreferences: prefs,
      }),
    ).toBeNull()

    const frozen = freezeOngoingCompactForArchive(afterRerun, {
      resultPreferences: prefs,
    })
    expect(frozen.resultPreferences.keyFigures.percentiles).toEqual([50, 70, 85])
    expect(frozen.keyFigures.percentiles["70"]).toEqual(expect.any(Number))
  })

  it("E: archive never silently drops [50,70,85] to [50,85]", () => {
    const blank = createBlankWorkspaceRuntimeState()
    const project = blank.projects[0]!
    const ongoing = createInitialOngoingState({
      projects: [project],
      activeProjectId: project.id,
    })
    const defaultCompact = makeDefaultCompact(
      "a1",
      ongoing.activeCheckpointId,
      project,
    )
    const prefs = prefsWithP70()

    // Unsupported → block (no silent freeze with dropped P70).
    expect(
      getArchiveBlockReason({
        analysisId: "a1",
        checkpointId: ongoing.activeCheckpointId,
        projects: [project],
        projectResults: [],
        lastSimulatedInputSignature: defaultCompact.inputSignature,
        ongoingCompactResult: defaultCompact,
        resultPreferences: prefs,
      }),
    ).toBe("result_settings_need_rerun")

    // Supported path freezes the requested prefs, not the old tip prefs alone.
    const withP70 = makeDefaultCompact(
      "a1",
      ongoing.activeCheckpointId,
      project,
      prefs,
    )
    const frozen = freezeOngoingCompactForArchive(withP70, {
      resultPreferences: prefs,
    })
    expect(frozen.resultPreferences.keyFigures.percentiles).toEqual([50, 70, 85])
    expect(frozen.resultView.keyFigures.percentiles).toEqual([50, 70, 85])
  })
})

describe("createNext durable-first", () => {
  it("F: successful createNext persists CP2 before runtime commit contract", async () => {
    const repo = getLocalAnalysisLibraryRepository()
    const blank = createBlankWorkspaceRuntimeState()
    const project = blank.projects[0]!
    const workspace = { projects: [project], activeProjectId: project.id }
    const doc = await repo.create({
      name: "createNext success",
      analysisMode: "ongoing",
      workspace,
    })
    let ongoing = createInitialOngoingState(workspace)
    const cp1Id = ongoing.activeCheckpointId
    const compact = makeDefaultCompact(doc.id, cp1Id, project)
    ongoing = archiveCheckpoint(ongoing, cp1Id, compact)
    await repo.saveDraft({
      ...doc,
      ongoing,
      workspace,
      ongoingDraftResult: compact,
    })

    const created = createNextCheckpoint(ongoing, {
      name: "CP2",
      analysisId: doc.id,
    })
    expect(created.ok).toBe(true)
    if (!created.ok) return

    // Simulate durable-first: disk first, then "runtime".
    const runtime = { activeCheckpointId: cp1Id as string }
    await repo.saveDraft({
      ...(await repo.get(doc.id))!,
      ongoing: created.ongoing,
      workspace: ensureSingleProjectWorkspace(created.newCheckpoint.workspace),
      ongoingDraftResult: created.inheritedResult,
    })
    runtime.activeCheckpointId = created.ongoing.activeCheckpointId

    const cold = await repo.get(doc.id)
    expect(cold!.ongoing!.activeCheckpointId).toBe(created.newCheckpoint.id)
    expect(runtime.activeCheckpointId).toBe(created.newCheckpoint.id)
    expect(cold!.ongoing!.checkpoints).toHaveLength(2)
  })

  it("G: createNext durable failure leaves CP1 on disk and does not commit CP2", async () => {
    const repo = getLocalAnalysisLibraryRepository()
    const blank = createBlankWorkspaceRuntimeState()
    const project = blank.projects[0]!
    const workspace = { projects: [project], activeProjectId: project.id }
    const doc = await repo.create({
      name: "createNext fail",
      analysisMode: "ongoing",
      workspace,
    })
    let ongoing = createInitialOngoingState(workspace)
    const cp1Id = ongoing.activeCheckpointId
    const compact = makeDefaultCompact(doc.id, cp1Id, project)
    ongoing = archiveCheckpoint(ongoing, cp1Id, compact)
    await repo.saveDraft({
      ...doc,
      ongoing,
      workspace,
      ongoingDraftResult: compact,
    })

    const created = createNextCheckpoint(ongoing, {
      name: "CP2",
      analysisId: doc.id,
    })
    expect(created.ok).toBe(true)
    if (!created.ok) return

    const runtime = {
      activeCheckpointId: ongoing.activeCheckpointId,
      checkpointCount: ongoing.checkpoints.length,
    }

    const originalSave = repo.saveDraft.bind(repo)
    repo.saveDraft = async () => {
      throw new AnalysisPersistenceError(
        "Failed to persist draft analysis",
        "quota",
      )
    }
    let saveErr: unknown = null
    try {
      await repo.saveDraft({
        ...(await repo.get(doc.id))!,
        ongoing: created.ongoing,
        workspace: ensureSingleProjectWorkspace(created.newCheckpoint.workspace),
        ongoingDraftResult: created.inheritedResult,
      })
    } catch (e) {
      saveErr = e
      // Durable-first: do not commit runtime on failure.
    } finally {
      repo.saveDraft = originalSave
    }

    expect(saveErr).toBeInstanceOf(AnalysisPersistenceError)
    expect((saveErr as AnalysisPersistenceError).failureKind).toBe("quota")
    expect(librarySaveStatusFromError(saveErr)).toBe("error_quota")
    expect(runtime.activeCheckpointId).toBe(cp1Id)
    expect(runtime.checkpointCount).toBe(1)

    const cold = await repo.get(doc.id)
    expect(cold!.ongoing!.activeCheckpointId).toBe(cp1Id)
    expect(cold!.ongoing!.checkpoints).toHaveLength(1)
    expect(cold!.ongoing!.checkpoints[0]!.status).toBe("archived")
  })
})

describe("persistence failure classification", () => {
  it("H: QuotaExceededError classifies as storage-capacity / error_quota", () => {
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
      removeItem: (key: string) => store.delete(key),
      clear: () => store.clear(),
    })
    try {
      expect(writeJson(LIBRARY_STORAGE_KEYS.index, { v: 1 })).toBe(true)
      failWrites = true
      expect(writeJson(LIBRARY_STORAGE_KEYS.index, { v: 2 })).toBe(false)
      expect(isQuotaExceededStorageError({ name: "QuotaExceededError" })).toBe(
        true,
      )
      const err = new AnalysisPersistenceError(
        "Failed to persist draft analysis",
        "quota",
      )
      expect(err.failureKind).toBe("quota")
      expect(librarySaveStatusFromError(err)).toBe("error_quota")
    } finally {
      vi.unstubAllGlobals()
    }
  })

  it("I: non-quota failure remains generic persistence / error", () => {
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
          throw new Error("disk exploded")
        }
        store.set(key, String(value))
      },
      removeItem: (key: string) => store.delete(key),
      clear: () => store.clear(),
    })
    try {
      failWrites = true
      expect(writeJson(LIBRARY_STORAGE_KEYS.index, { v: 1 })).toBe(false)
      const err = new AnalysisPersistenceError(
        "Failed to persist draft analysis",
        "generic",
      )
      expect(librarySaveStatusFromError(err)).toBe("error")
      expect(librarySaveStatusFromError(new Error("other"))).toBe("error")
    } finally {
      vi.unstubAllGlobals()
    }
  })

  it("H2: saveDraft propagates quota failureKind from writeJson", async () => {
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
      removeItem: (key: string) => store.delete(key),
      clear: () => store.clear(),
    })
    try {
      clearLocalAnalysisLibraryStorageForTests()
      const repo = getLocalAnalysisLibraryRepository()
      const blank = createBlankWorkspaceRuntimeState()
      const project = blank.projects[0]!
      const doc = await repo.create({
        name: "quota saveDraft",
        analysisMode: "ongoing",
        workspace: { projects: [project], activeProjectId: project.id },
      })
      failWrites = true
      await expect(
        repo.saveDraft({
          ...doc,
          name: "quota saveDraft renamed",
        }),
      ).rejects.toMatchObject({
        name: "AnalysisPersistenceError",
        failureKind: "quota",
      })
    } finally {
      vi.unstubAllGlobals()
    }
  })
})
