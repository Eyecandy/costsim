/**
 * Folder-scoped analysis name uniqueness (trimmed, case-insensitive).
 */

import { beforeEach, describe, expect, it } from "vitest"

import { getAnalysisLibraryRepository } from "@/persistence/analysisLibraryRepository"
import {
  ANALYSIS_NAME_CONFLICT_ERROR,
  ANALYSIS_NAME_CONFLICT_ON_MOVE_ERROR,
  hasAnalysisNameConflict,
  normalizeAnalysisName,
} from "@/domain/analysis/analysisNameUniqueness"
import { clearLocalAnalysisLibraryStorageForTests } from "@/persistence/localAnalysisLibraryRepository"
import { createBlankWorkspaceRuntimeState } from "@/domain/analysis/workspaceReset"

async function createNamed(args: {
  name: string
  folderId?: string | null
  status?: "draft" | "archived"
}) {
  const repo = getAnalysisLibraryRepository()
  const blank = createBlankWorkspaceRuntimeState()
  const doc = await repo.create({
    name: args.name,
    folderId: args.folderId ?? null,
    workspace: {
      projects: blank.projects,
      activeProjectId: blank.activeProjectId,
    },
  })
  if (args.status === "archived") {
    const { buildArchivedAnalysisSnapshot } =
      await import("@/domain/analysis/buildArchivedAnalysisSnapshot")
    const { DEFAULT_RESULT_PREFERENCES } = await import("@/domain/results/resultPreferences")
    const { buildSimulationInputSignature } =
      await import("@/domain/simulation/simulationInputSignature")
    await repo.archive({
      analysisId: doc.id,
      snapshot: buildArchivedAnalysisSnapshot({
        projects: blank.projects,
        activeProjectId: blank.activeProjectId,
        projectResults: [
          {
            projectId: blank.activeProjectId,
            incurredCosts: 0,
            values: [1, 2, 3],
            inputSeries: [],
          },
        ],
        simulatedBaseCostByProjectId: { [blank.activeProjectId]: 0 },
        inputSignature: buildSimulationInputSignature(blank.projects),
        simulationCount: 1000,
        resultPreferences: DEFAULT_RESULT_PREFERENCES,
      }),
    })
  }
  return doc
}

describe("analysis name uniqueness", () => {
  beforeEach(() => {
    clearLocalAnalysisLibraryStorageForTests()
  })

  it("normalizes trim + case-insensitive", () => {
    expect(normalizeAnalysisName("  Project Alpha ")).toBe("project alpha")
    expect(normalizeAnalysisName("PROJECT ALPHA")).toBe("project alpha")
    expect(
      hasAnalysisNameConflict({
        name: " project alpha ",
        folderId: null,
        analyses: [{ id: "1", name: "Project Alpha", folderId: null }],
      }),
    ).toBe(true)
  })

  it("1. create duplicate in same folder → blocked", async () => {
    const repo = getAnalysisLibraryRepository()
    const folder = await repo.createFolder("Jobs")
    await createNamed({ name: "Alpha", folderId: folder.id })
    await expect(createNamed({ name: "alpha", folderId: folder.id })).rejects.toThrow(
      ANALYSIS_NAME_CONFLICT_ERROR,
    )
  })

  it("2. create same name in different folder → allowed", async () => {
    const repo = getAnalysisLibraryRepository()
    const a = await repo.createFolder("A")
    const b = await repo.createFolder("B")
    await createNamed({ name: "Shared", folderId: a.id })
    const second = await createNamed({ name: "Shared", folderId: b.id })
    expect(second.name).toBe("Shared")
    expect(second.folderId).toBe(b.id)
  })

  it("3. create duplicate in root → blocked", async () => {
    await createNamed({ name: "Root Job", folderId: null })
    await expect(createNamed({ name: " root job ", folderId: null })).rejects.toThrow(
      ANALYSIS_NAME_CONFLICT_ERROR,
    )
  })

  it("4. rename to duplicate in same folder → blocked", async () => {
    const repo = getAnalysisLibraryRepository()
    const folder = await repo.createFolder("F")
    await createNamed({ name: "One", folderId: folder.id })
    const two = await createNamed({ name: "Two", folderId: folder.id })
    await expect(repo.touchMetadata(two.id, { name: "one" })).rejects.toThrow(
      ANALYSIS_NAME_CONFLICT_ERROR,
    )
  })

  it("5. rename to own current name → allowed", async () => {
    const repo = getAnalysisLibraryRepository()
    const doc = await createNamed({ name: "Solo", folderId: null })
    await repo.touchMetadata(doc.id, { name: " Solo " })
    const reloaded = await repo.get(doc.id)
    expect(reloaded?.name).toBe("Solo")
  })

  it("6. move into folder containing same name → blocked", async () => {
    const repo = getAnalysisLibraryRepository()
    const folder = await repo.createFolder("Target")
    await createNamed({ name: "Clash", folderId: folder.id })
    const mover = await createNamed({ name: "Clash", folderId: null })
    await expect(repo.touchMetadata(mover.id, { folderId: folder.id })).rejects.toThrow(
      ANALYSIS_NAME_CONFLICT_ON_MOVE_ERROR,
    )
  })

  it("7. move into folder without conflict → allowed", async () => {
    const repo = getAnalysisLibraryRepository()
    const folder = await repo.createFolder("Emptyish")
    await createNamed({ name: "Other", folderId: folder.id })
    const mover = await createNamed({ name: "Unique", folderId: null })
    await repo.touchMetadata(mover.id, { folderId: folder.id })
    const reloaded = await repo.get(mover.id)
    expect(reloaded?.folderId).toBe(folder.id)
  })

  it("8. archived analysis counts as conflict", async () => {
    const repo = getAnalysisLibraryRepository()
    const folder = await repo.createFolder("Mix")
    await createNamed({
      name: "Frozen",
      folderId: folder.id,
      status: "archived",
    })
    await expect(createNamed({ name: "frozen", folderId: folder.id })).rejects.toThrow(
      ANALYSIS_NAME_CONFLICT_ERROR,
    )
  })

  it("9. trashed analysis does not count as conflict", async () => {
    const repo = getAnalysisLibraryRepository()
    const doc = await createNamed({ name: "Gone", folderId: null })
    await repo.moveToTrash(doc.id)
    const again = await createNamed({ name: "gone", folderId: null })
    expect(again.name).toBe("gone")
  })

  it("10. comparison is trimmed + case-insensitive (helper + create)", async () => {
    await createNamed({ name: "Project Alpha", folderId: null })
    await expect(createNamed({ name: " PROJECT ALPHA ", folderId: null })).rejects.toThrow(
      ANALYSIS_NAME_CONFLICT_ERROR,
    )
  })
})
