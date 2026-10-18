import { beforeEach, describe, expect, it } from "vitest"

import { getAnalysisLibraryRepository } from "@/persistence/analysisLibraryRepository"
import {
  __seedRawAnalysisDocForTests,
  clearLocalAnalysisLibraryStorageForTests,
  getLocalAnalysisLibraryRepository,
} from "@/persistence/localAnalysisLibraryRepository"
import { buildArchivedAnalysisSnapshot } from "@/domain/analysis/buildArchivedAnalysisSnapshot"
import { DEFAULT_RESULT_PREFERENCES } from "@/domain/results/resultPreferences"
import { createBlankWorkspaceRuntimeState } from "@/domain/analysis/workspaceReset"
import type { ProjectResult } from "@/domain/simulation/simulationTypes"
import { readLibrarySessionSource } from "@/test-utils/librarySessionSource"

function makeResults(
  projectId: string,
  values: number[] = [100, 110, 120, 130, 140],
): ProjectResult[] {
  return [
    {
      projectId,
      incurredCosts: 0,
      values,
      inputSeries: [],
    },
  ]
}

function archiveSnapshotFor(
  projects: ReturnType<typeof createBlankWorkspaceRuntimeState>["projects"],
  activeProjectId: string,
) {
  const project = projects[0]!
  return buildArchivedAnalysisSnapshot({
    projects,
    activeProjectId,
    projectResults: makeResults(project.id),
    simulatedBaseCostByProjectId: { [project.id]: 100 },
    inputSignature: JSON.stringify(projects),
    simulationCount: 20_000,
    resultPreferences: DEFAULT_RESULT_PREFERENCES,
  })
}

describe("archive persistence", () => {
  beforeEach(() => {
    clearLocalAnalysisLibraryStorageForTests()
  })

  it("archive → library list → reload keeps status archived and same id", async () => {
    const repo = getLocalAnalysisLibraryRepository()
    const blank = createBlankWorkspaceRuntimeState()
    const created = await repo.create({
      name: "Persist archive",
      analysisMode: "single",
      workspace: {
        projects: blank.projects,
        activeProjectId: blank.activeProjectId,
      },
    })
    const sourceId = created.id

    const archived = await repo.archive({
      analysisId: sourceId,
      snapshot: archiveSnapshotFor(blank.projects, blank.activeProjectId),
    })
    expect(archived.id).toBe(sourceId)
    expect(archived.status).toBe("archived")
    expect(archived.archivedSnapshot).toBeTruthy()

    // Navigate to Library equivalent: list from repository
    const listed = await repo.listSummaries()
    expect(listed.find((s) => s.id === sourceId)?.status).toBe("archived")

    // Reopen archived analysis
    const reopened = await repo.get(sourceId)
    expect(reopened?.status).toBe("archived")
    expect(reopened?.id).toBe(sourceId)

    // Page reload: capture persisted body, drop storage/singleton, re-seed
    const persisted = await repo.get(sourceId)
    expect(persisted?.status).toBe("archived")
    const rawBody = JSON.parse(JSON.stringify(persisted))
    clearLocalAnalysisLibraryStorageForTests()
    __seedRawAnalysisDocForTests(sourceId, rawBody)

    const reloadedRepo = getLocalAnalysisLibraryRepository()
    const afterReload = await reloadedRepo.get(sourceId)
    expect(afterReload?.status).toBe("archived")
    expect(afterReload?.id).toBe(sourceId)
    const summaries = await reloadedRepo.listSummaries()
    expect(summaries.find((s) => s.id === sourceId)?.status).toBe("archived")
  })

  it("stale saveDraft cannot revert archived → draft", async () => {
    const repo = getAnalysisLibraryRepository()
    const blank = createBlankWorkspaceRuntimeState()
    const created = await repo.create({
      name: "Race archive",
      analysisMode: "single",
      workspace: {
        projects: blank.projects,
        activeProjectId: blank.activeProjectId,
      },
    })
    const draftCopy = await repo.get(created.id)
    expect(draftCopy?.status).toBe("draft")

    await repo.archive({
      analysisId: created.id,
      snapshot: archiveSnapshotFor(blank.projects, blank.activeProjectId),
    })

    await expect(
      repo.saveDraft({
        ...draftCopy!,
        status: "draft",
        name: "stale overwrite",
        workspace: {
          projects: blank.projects.map((p) => ({
            ...p,
            name: "mutated",
          })),
          activeProjectId: blank.activeProjectId,
        },
      }),
    ).rejects.toThrow(/archived/i)

    const still = await repo.get(created.id)
    expect(still?.status).toBe("archived")
    expect(still?.name).toBe("Race archive")
    expect(still?.archivedSnapshot).toBeTruthy()
  })

  it("concurrent stale saveDraft after archive leaves document archived", async () => {
    const repo = getAnalysisLibraryRepository()
    const blank = createBlankWorkspaceRuntimeState()
    const created = await repo.create({
      name: "Concurrent race",
      analysisMode: "single",
      workspace: {
        projects: blank.projects,
        activeProjectId: blank.activeProjectId,
      },
    })
    const draftCopy = (await repo.get(created.id))!

    const archivePromise = repo.archive({
      analysisId: created.id,
      snapshot: archiveSnapshotFor(blank.projects, blank.activeProjectId),
    })
    const staleSave = repo
      .saveDraft({
        ...draftCopy,
        name: "should not win",
      })
      .then(
        () => "saved" as const,
        () => "rejected" as const,
      )

    const archived = await archivePromise
    expect(archived.status).toBe("archived")
    const saveOutcome = await staleSave
    expect(saveOutcome).toBe("rejected")

    const still = await repo.get(created.id)
    expect(still?.status).toBe("archived")
    expect(still?.name).toBe("Concurrent race")
  })

  it("session archiveCurrent serializes behind save chain and skips next autosave", () => {
    const session = readLibrarySessionSource()
    const archiveFnStart = session.indexOf("const archiveCurrent = useCallback")
    expect(archiveFnStart).toBeGreaterThanOrEqual(0)
    const archiveFn = session.slice(archiveFnStart, archiveFnStart + 2800)
    expect(archiveFn).toContain("saveTimerRef.current")
    expect(archiveFn).toContain("clearTimeout")
    expect(archiveFn).toContain("enqueueSave")
    expect(archiveFn).toContain("skipNextSaveRef.current = true")
  })
})
