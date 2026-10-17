import { beforeEach, describe, expect, it } from "vitest"

import {
  clearLocalAnalysisLibraryStorageForTests,
} from "@/lib/localAnalysisLibraryRepository"
import { getAnalysisLibraryRepository } from "@/lib/analysisLibraryRepository"
import { shouldAutosaveLibraryDraft } from "@/lib/analysisLibraryRoutes"
import {
  buildArchivedAnalysisSnapshot,
  canArchiveCurrentResults,
} from "@/lib/buildArchivedAnalysisSnapshot"
import { computeDeterministicTornadoRows } from "@/lib/deterministicTornado"
import { DEFAULT_RESULT_PREFERENCES } from "@/lib/resultPreferences"
import type { ShapleyAttributionResult } from "@/lib/shapleyAttribution"
import { createBlankWorkspaceRuntimeState } from "@/lib/workspaceReset"
import type { ProjectResult } from "@/simulation.worker"

function fakeShapleyStub(): ShapleyAttributionResult {
  // Minimal stand-in — snapshot round-trip only checks identity, not shape validity.
  return {
    baseCost: 100,
    estimatedP50: 120,
    estimatedP85: 150,
    expectedAddition: 20,
    uncertaintyReserve: 30,
    contributions: [],
  } as unknown as ShapleyAttributionResult
}

describe("archived immutability", () => {
  beforeEach(() => {
    clearLocalAnalysisLibraryStorageForTests()
  })

  it("saveDraft rejects archived analyses", async () => {
    const repo = getAnalysisLibraryRepository()
    const blank = createBlankWorkspaceRuntimeState()
    const doc = await repo.create({
      name: "To archive",
      folderId: null,
      workspace: {
        projects: blank.projects,
        activeProjectId: blank.activeProjectId,
      },
    })
    const fakeResults: ProjectResult[] = [
      {
        projectId: blank.projects[0]!.id,
        incurredCosts: 0,
        values: [1, 2, 3, 4, 5],
        inputSeries: [],
      },
    ]
    const signature = JSON.stringify(blank.projects)
    const snapshot = buildArchivedAnalysisSnapshot({
      projects: blank.projects,
      activeProjectId: blank.activeProjectId,
      projectResults: fakeResults,
      simulatedBaseCostByProjectId: { [blank.projects[0]!.id]: 100 },
      inputSignature: signature,
      simulationCount: 20_000,
      resultPreferences: DEFAULT_RESULT_PREFERENCES,
    })
    const archived = await repo.archive({
      analysisId: doc.id,
      snapshot,
    })
    await expect(
      repo.saveDraft({ ...archived, status: "draft", name: "hacked" }),
    ).rejects.toThrow(/archived/i)
  })

  it("shouldAutosaveLibraryDraft is false for archived", () => {
    expect(
      shouldAutosaveLibraryDraft({
        routeAnalysisId: "a1",
        loadedAnalysisId: "a1",
        docId: "a1",
        docStatus: "archived",
        ready: true,
      }),
    ).toBe(false)
  })

  it("buildArchivedAnalysisSnapshot freezes tornado and accepts shapley map", () => {
    const blank = createBlankWorkspaceRuntimeState()
    const project = blank.projects[0]!
    const fakeResults: ProjectResult[] = [
      {
        projectId: project.id,
        incurredCosts: 0,
        values: [10, 20, 30, 40, 50],
        inputSeries: [],
      },
    ]
    const signature = JSON.stringify(blank.projects)
    expect(
      canArchiveCurrentResults({
        projects: blank.projects,
        projectResults: fakeResults,
        lastSimulatedInputSignature: signature,
      }),
    ).toBe(true)

    const expectedTornado = computeDeterministicTornadoRows(project, 6)
    const shapley = fakeShapleyStub()
    const snapshot = buildArchivedAnalysisSnapshot({
      projects: blank.projects,
      activeProjectId: blank.activeProjectId,
      projectResults: fakeResults,
      simulatedBaseCostByProjectId: { [project.id]: 100 },
      inputSignature: signature,
      simulationCount: 20_000,
      resultPreferences: DEFAULT_RESULT_PREFERENCES,
      shapleyByProjectId: { [project.id]: shapley },
    })

    expect(snapshot.tornadoByProjectId[project.id]).toEqual(expectedTornado)
    expect(snapshot.shapleyByProjectId[project.id]).toEqual(shapley)
    expect(snapshot.resultPreferences).toEqual(DEFAULT_RESULT_PREFERENCES)
  })

  it("saveDraft/assertDraft blocks content mutation of archived (rename at session level)", async () => {
    // Display-name rename is library metadata via touchMetadata (allowed for archived).
    // Analytical content mutation via saveDraft remains blocked.
    const repo = getAnalysisLibraryRepository()
    const blank = createBlankWorkspaceRuntimeState()
    const doc = await repo.create({
      name: "Immutable title",
      folderId: null,
      workspace: {
        projects: blank.projects,
        activeProjectId: blank.activeProjectId,
      },
    })
    const fakeResults: ProjectResult[] = [
      {
        projectId: blank.projects[0]!.id,
        incurredCosts: 0,
        values: [5, 6, 7],
        inputSeries: [],
      },
    ]
    const signature = JSON.stringify(blank.projects)
    const archived = await repo.archive({
      analysisId: doc.id,
      snapshot: buildArchivedAnalysisSnapshot({
        projects: blank.projects,
        activeProjectId: blank.activeProjectId,
        projectResults: fakeResults,
        simulatedBaseCostByProjectId: { [blank.projects[0]!.id]: 50 },
        inputSignature: signature,
        simulationCount: 10_000,
        resultPreferences: DEFAULT_RESULT_PREFERENCES,
        shapleyByProjectId: {},
      }),
    })
    const originalName = archived.name
    await expect(
      repo.saveDraft({
        ...archived,
        status: "draft",
        name: "Renamed via saveDraft",
        workspace: {
          ...archived.workspace,
          projects: archived.workspace.projects.map((p) => ({
            ...p,
            name: "mutated",
          })),
        },
      }),
    ).rejects.toThrow(/archived/i)

    const still = await repo.get(archived.id)
    expect(still?.status).toBe("archived")
    expect(still?.name).toBe(originalName)
    expect(still?.workspace.projects[0]!.name).toBe(
      archived.workspace.projects[0]!.name,
    )
  })

  it("createDraftFromArchived leaves original archived unchanged", async () => {
    const repo = getAnalysisLibraryRepository()
    const blank = createBlankWorkspaceRuntimeState()
    blank.projects[0]!.name = "Frozen alt"
    const doc = await repo.create({
      name: "Archive source",
      folderId: null,
      workspace: {
        projects: blank.projects,
        activeProjectId: blank.activeProjectId,
      },
    })
    const fakeResults: ProjectResult[] = [
      {
        projectId: blank.projects[0]!.id,
        incurredCosts: 0,
        values: [100, 200, 300],
        inputSeries: [],
      },
    ]
    const signature = JSON.stringify(blank.projects)
    const shapley = fakeShapleyStub()
    const archived = await repo.archive({
      analysisId: doc.id,
      snapshot: buildArchivedAnalysisSnapshot({
        projects: blank.projects,
        activeProjectId: blank.activeProjectId,
        projectResults: fakeResults,
        simulatedBaseCostByProjectId: { [blank.projects[0]!.id]: 80 },
        inputSignature: signature,
        simulationCount: 20_000,
        resultPreferences: DEFAULT_RESULT_PREFERENCES,
        shapleyByProjectId: { [blank.projects[0]!.id]: shapley },
      }),
    })
    const archivedSnapshotBefore = structuredClone(archived.archivedSnapshot)

    const draft = await repo.createDraftFromArchived({
      archivedId: archived.id,
      name: "Archive source (ny versjon)",
    })
    expect(draft.status).toBe("draft")
    expect(draft.id).not.toBe(archived.id)
    expect(draft.previousVersionId).toBe(archived.id)
    expect(draft.archivedSnapshot).toBeUndefined()
    expect(draft.draftResultSeed).toBeDefined()
    expect(draft.draftResultSeed!.projectResults).toEqual([])
    expect(
      draft.draftResultSeed!.compactByProjectId?.[
        draft.workspace.projects[0]!.id
      ]?.keyFigures.percentiles["50"],
    ).toBeDefined()
    expect(JSON.stringify(draft.draftResultSeed)).not.toContain('"values"')
    expect(draft.draftResultSeed!.inputSignature).toBe(
      JSON.stringify(draft.workspace.projects),
    )

    draft.workspace.projects[0]!.name = "Edited draft alt"
    await repo.saveDraft(draft)

    const stillArchived = await repo.get(archived.id)
    expect(stillArchived?.status).toBe("archived")
    expect(stillArchived?.name).toBe("Archive source")
    expect(stillArchived?.workspace.projects[0]!.name).toBe("Frozen alt")
    expect(stillArchived?.archivedSnapshot).toEqual(archivedSnapshotBefore)
  })
})
