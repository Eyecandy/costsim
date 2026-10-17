import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { runBeforeLeaveWithoutBlocking } from "@/features/analysis-library/AnalysisLibraryNav"
import { buildArchivedAnalysisSnapshot } from "@/domain/analysis/buildArchivedAnalysisSnapshot"
import { assertNoHeavyValuesInCompact } from "@/domain/analysis/compactAnalysisResult"
import {
  createNextCheckpoint,
  getActiveCheckpoint,
} from "@/domain/analysis/analysisCheckpoint"
import {
  clearLocalAnalysisLibraryStorageForTests,
  getLocalAnalysisLibraryRepository,
  LIBRARY_STORAGE_KEYS,
  writeJson,
} from "@/persistence/localAnalysisLibraryRepository"
import {
  buildOngoingCheckpointResultSnapshot,
  isLegacyHeavyArchivedSnapshot,
  isOngoingCheckpointResultSnapshot,
} from "@/domain/analysis/ongoingCheckpointResultSnapshot"
import { DEFAULT_RESULT_PREFERENCES } from "@/domain/results/resultPreferences"
import {
  buildSingleArchivedResultSnapshot,
  isSingleArchivedResultSnapshot,
} from "@/domain/analysis/singleArchivedResultSnapshot"
import { buildSimulationInputSignature } from "@/domain/simulation/simulationInputSignature"
import { createBlankWorkspaceRuntimeState } from "@/domain/analysis/workspaceReset"
import type { ProjectResult } from "@/domain/simulation/simulationTypes"

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
    removeItem: (key: string) => store.delete(key),
    clear: () => store.clear(),
  })
  return {
    store,
    fail: () => {
      failWrites = true
    },
  }
}

function result(projectId: string, offset = 0, count = 20_000): ProjectResult {
  return {
    projectId,
    incurredCosts: 25,
    values: Array.from({ length: count }, (_, index) => offset + 1_000 + index),
    inputSeries: [],
  }
}

function fixture(projectCount = 1) {
  const blank = createBlankWorkspaceRuntimeState()
  const first = blank.projects[0]!
  const projects = Array.from({ length: projectCount }, (_, index) => ({
    ...structuredClone(first),
    id: `project-${index + 1}`,
    name: `Project ${index + 1}`,
  }))
  const projectResults = projects.map((project, index) =>
    result(project.id, index * 10_000),
  )
  const inputSignature = buildSimulationInputSignature(projects)
  return {
    projects,
    projectResults,
    activeProjectId: projects[0]!.id,
    inputSignature,
    baseCosts: Object.fromEntries(projects.map((project) => [project.id, 900])),
  }
}

function compactFixture(projectCount = 1) {
  const data = fixture(projectCount)
  return {
    ...data,
    snapshot: buildSingleArchivedResultSnapshot({
      analysisId: "analysis-1",
      projects: data.projects,
      activeProjectId: data.activeProjectId,
      projectResults: data.projectResults,
      simulatedBaseCostByProjectId: data.baseCosts,
      inputSignature: data.inputSignature,
      simulationCount: 20_000,
      resultPreferences: DEFAULT_RESULT_PREFERENCES,
    }),
  }
}

describe("compact Single Analysis archives", () => {
  beforeEach(() => {
    installStorage()
    clearLocalAnalysisLibraryStorageForTests()
  })

  afterEach(() => {
    clearLocalAnalysisLibraryStorageForTests()
    vi.unstubAllGlobals()
  })

  it("A: builds the versioned compact Single shape without raw values", () => {
    const { snapshot } = compactFixture()
    expect(isSingleArchivedResultSnapshot(snapshot)).toBe(true)
    expect(snapshot.kind).toBe("single_archived_result_v1")
    expect(JSON.stringify(snapshot)).not.toContain('"values"')
    assertNoHeavyValuesInCompact(snapshot)
  })

  it("B: freezes every alternative independently", () => {
    const { projects, snapshot } = compactFixture(2)
    expect(Object.keys(snapshot.byProjectId)).toEqual(
      projects.map((project) => project.id),
    )
    expect(snapshot.byProjectId[projects[0]!.id]?.keyFigures.expectedValue)
      .not.toBe(snapshot.byProjectId[projects[1]!.id]?.keyFigures.expectedValue)
  })

  it("C: shares the same analytical freeze math as Ongoing", () => {
    const data = compactFixture()
    const ongoing = buildOngoingCheckpointResultSnapshot({
      analysisId: "analysis-1",
      checkpointId: "checkpoint-1",
      projects: data.projects,
      activeProjectId: data.activeProjectId,
      projectResults: data.projectResults,
      simulatedBaseCostByProjectId: data.baseCosts,
      inputSignature: data.inputSignature,
      simulationCount: 20_000,
      resultPreferences: DEFAULT_RESULT_PREFERENCES,
    })
    const single = data.snapshot.byProjectId[data.activeProjectId]!
    expect(single.keyFigures).toEqual(ongoing.keyFigures)
    expect(single.sCurve).toEqual(ongoing.sCurve)
    expect(single.tornado).toEqual(ongoing.tornado)
  })

  it("D: caps each persisted display CDF at 800 points", () => {
    const { snapshot } = compactFixture(2)
    for (const compact of Object.values(snapshot.byProjectId)) {
      expect(compact.sCurve.pointCount).toBeLessThanOrEqual(800)
      expect(compact.sCurve.points).toHaveLength(compact.sCurve.pointCount)
    }
  })

  it("E: is materially smaller than the legacy heavy snapshot", () => {
    const data = fixture(2)
    const compact = buildSingleArchivedResultSnapshot({
      analysisId: "analysis-1",
      projects: data.projects,
      activeProjectId: data.activeProjectId,
      projectResults: data.projectResults,
      simulatedBaseCostByProjectId: data.baseCosts,
      inputSignature: data.inputSignature,
      simulationCount: 20_000,
      resultPreferences: DEFAULT_RESULT_PREFERENCES,
    })
    const heavy = buildArchivedAnalysisSnapshot({
      projects: data.projects,
      activeProjectId: data.activeProjectId,
      projectResults: data.projectResults,
      simulatedBaseCostByProjectId: data.baseCosts,
      inputSignature: data.inputSignature,
      simulationCount: 20_000,
      resultPreferences: DEFAULT_RESULT_PREFERENCES,
    })
    expect(JSON.stringify(compact).length).toBeLessThan(
      JSON.stringify(heavy).length / 5,
    )
    // eslint-disable-next-line no-console
    console.log("single archive bytes", {
      compact: JSON.stringify(compact).length,
      heavy: JSON.stringify(heavy).length,
      projects: 2,
    })
  })

  it("F: repository archives and reloads the compact union member", async () => {
    const repo = getLocalAnalysisLibraryRepository()
    const data = compactFixture(2)
    const draft = await repo.create({
      name: "Compact archive",
      analysisMode: "single",
      workspace: {
        projects: data.projects,
        activeProjectId: data.activeProjectId,
      },
    })
    const archived = await repo.archive({
      analysisId: draft.id,
      snapshot: { ...data.snapshot, analysisId: draft.id },
    })
    expect(archived.status).toBe("archived")
    expect(isSingleArchivedResultSnapshot(archived.archivedSnapshot)).toBe(true)
    expect(JSON.stringify((await repo.get(draft.id))?.archivedSnapshot))
      .not.toContain('"values"')
  })

  it("G: legacy heavy snapshots remain readable", async () => {
    const repo = getLocalAnalysisLibraryRepository()
    const data = fixture()
    const draft = await repo.create({
      name: "Legacy archive",
      workspace: {
        projects: data.projects,
        activeProjectId: data.activeProjectId,
      },
    })
    const legacy = buildArchivedAnalysisSnapshot({
      projects: data.projects,
      activeProjectId: data.activeProjectId,
      projectResults: data.projectResults,
      simulatedBaseCostByProjectId: data.baseCosts,
      inputSignature: data.inputSignature,
      simulationCount: 20_000,
      resultPreferences: DEFAULT_RESULT_PREFERENCES,
    })
    await repo.archive({ analysisId: draft.id, snapshot: legacy })
    const reloaded = await repo.get(draft.id)
    expect(isLegacyHeavyArchivedSnapshot(reloaded?.archivedSnapshot)).toBe(true)
  })

  it("H: create-new-version carries compact display data without samples", async () => {
    const repo = getLocalAnalysisLibraryRepository()
    const data = compactFixture(2)
    const draft = await repo.create({
      name: "Version source",
      workspace: {
        projects: data.projects,
        activeProjectId: data.activeProjectId,
      },
    })
    await repo.archive({
      analysisId: draft.id,
      snapshot: { ...data.snapshot, analysisId: draft.id },
    })
    const next = await repo.createDraftFromArchived({
      archivedId: draft.id,
      name: "Version next",
    })
    expect(next.status).toBe("draft")
    expect(next.draftResultSeed?.projectResults).toEqual([])
    expect(Object.keys(next.draftResultSeed?.compactByProjectId ?? {}))
      .toHaveLength(2)
    expect(JSON.stringify(next.draftResultSeed)).not.toContain('"values"')
  })

  it("H2: legacy heavy archive create-new-version seeds compact only", async () => {
    const repo = getLocalAnalysisLibraryRepository()
    const data = fixture(2)
    const draft = await repo.create({
      name: "Legacy version source",
      workspace: {
        projects: data.projects,
        activeProjectId: data.activeProjectId,
      },
    })
    await repo.archive({
      analysisId: draft.id,
      snapshot: buildArchivedAnalysisSnapshot({
        projects: data.projects,
        activeProjectId: data.activeProjectId,
        projectResults: data.projectResults,
        simulatedBaseCostByProjectId: data.baseCosts,
        inputSignature: data.inputSignature,
        simulationCount: 20_000,
        resultPreferences: DEFAULT_RESULT_PREFERENCES,
      }),
    })
    const next = await repo.createDraftFromArchived({
      archivedId: draft.id,
      name: "Legacy version next",
    })
    expect(next.draftResultSeed?.projectResults).toEqual([])
    expect(Object.keys(next.draftResultSeed?.compactByProjectId ?? {}))
      .toHaveLength(2)
    expect(JSON.stringify(next.draftResultSeed)).not.toContain('"values"')
  })

  it("I: starting Ongoing converts selected compact data without samples", async () => {
    const repo = getLocalAnalysisLibraryRepository()
    const data = compactFixture(2)
    const draft = await repo.create({
      name: "Ongoing source",
      workspace: {
        projects: data.projects,
        activeProjectId: data.activeProjectId,
      },
    })
    await repo.archive({
      analysisId: draft.id,
      snapshot: { ...data.snapshot, analysisId: draft.id },
    })
    const ongoingDoc = await repo.createOngoingFromArchivedSingle({
      archivedId: draft.id,
      selectedProjectId: data.projects[1]!.id,
    })
    const cp1 = getActiveCheckpoint(ongoingDoc.ongoing!)
    expect(isOngoingCheckpointResultSnapshot(cp1?.archivedSnapshot)).toBe(true)
    expect(JSON.stringify(cp1?.archivedSnapshot)).not.toContain('"values"')
    const next = createNextCheckpoint(ongoingDoc.ongoing!, {
      analysisId: ongoingDoc.id,
    })
    expect(next.ok).toBe(true)
    if (next.ok) {
      expect(JSON.stringify(next.inheritedResult)).not.toContain('"values"')
    }
  })

  it("J: setItem failure is fail-closed and leaves archive draft durable", async () => {
    const storage = installStorage()
    clearLocalAnalysisLibraryStorageForTests()
    const repo = getLocalAnalysisLibraryRepository()
    const data = compactFixture()
    const draft = await repo.create({
      name: "Quota archive",
      workspace: {
        projects: data.projects,
        activeProjectId: data.activeProjectId,
      },
    })
    const key = `${LIBRARY_STORAGE_KEYS.analysisPrefix}${draft.id}`
    storage.fail()
    expect(writeJson("test:fail-closed", { ok: true })).toBe(false)
    await expect(
      repo.archive({
        analysisId: draft.id,
        snapshot: { ...data.snapshot, analysisId: draft.id },
      }),
    ).rejects.toThrow(/persist/i)
    expect(JSON.parse(storage.store.get(key)!).status).toBe("draft")
    expect((await repo.get(draft.id))?.status).toBe("draft")
  })

  it("K: persistence failure does not block leave and Ongoing stays compact", async () => {
    await expect(
      runBeforeLeaveWithoutBlocking(async () => {
        throw new Error("quota")
      }),
    ).resolves.toBeUndefined()

    const data = compactFixture()
    const ongoing = buildOngoingCheckpointResultSnapshot({
      analysisId: "analysis-1",
      checkpointId: "checkpoint-1",
      projects: data.projects,
      activeProjectId: data.activeProjectId,
      projectResults: data.projectResults,
      simulatedBaseCostByProjectId: data.baseCosts,
      inputSignature: data.inputSignature,
      simulationCount: 20_000,
      resultPreferences: DEFAULT_RESULT_PREFERENCES,
    })
    expect(ongoing.sCurve.pointCount).toBeLessThanOrEqual(800)
    expect(JSON.stringify(ongoing)).not.toContain('"values"')
  })
})
