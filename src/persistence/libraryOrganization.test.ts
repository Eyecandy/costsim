import { describe, expect, it, beforeEach } from "vitest"

import { clearLocalAnalysisLibraryStorageForTests } from "@/persistence/localAnalysisLibraryRepository"
import { getAnalysisLibraryRepository } from "@/persistence/analysisLibraryRepository"
import { createBlankWorkspaceRuntimeState } from "@/domain/analysis/workspaceReset"
import { buildArchivedAnalysisSnapshot } from "@/domain/analysis/buildArchivedAnalysisSnapshot"
import { DEFAULT_RESULT_PREFERENCES } from "@/domain/results/resultPreferences"
import type { ProjectResult } from "@/domain/simulation/simulationTypes"
import type { AnalysisDocument } from "@/domain/analysis/analysisDocument"

async function createDraft(name: string, folderId: string | null = null) {
  const repo = getAnalysisLibraryRepository()
  const blank = createBlankWorkspaceRuntimeState()
  return repo.create({
    name,
    folderId,
    workspace: {
      projects: blank.projects,
      activeProjectId: blank.activeProjectId,
    },
  })
}

async function archiveDoc(doc: AnalysisDocument): Promise<AnalysisDocument> {
  const repo = getAnalysisLibraryRepository()
  const blank = doc.workspace
  const projectId = blank.activeProjectId
  const fakeResults: ProjectResult[] = [
    {
      projectId,
      incurredCosts: 0,
      values: [1, 2, 3],
      inputSeries: [],
    },
  ]
  return repo.archive({
    analysisId: doc.id,
    snapshot: buildArchivedAnalysisSnapshot({
      projects: blank.projects,
      activeProjectId: blank.activeProjectId,
      projectResults: fakeResults,
      simulatedBaseCostByProjectId: { [projectId]: 100 },
      inputSignature: JSON.stringify(blank.projects),
      simulationCount: 10_000,
      resultPreferences: DEFAULT_RESULT_PREFERENCES,
      shapleyByProjectId: {},
    }),
  })
}

describe("Library organization — folders", () => {
  beforeEach(() => {
    clearLocalAnalysisLibraryStorageForTests()
  })

  it("renames folder: id stable, membership kept, alphabetical display sort", async () => {
    const repo = getAnalysisLibraryRepository()
    const zebra = await repo.createFolder("Zebra")
    const alpha = await repo.createFolder("Alpha")
    const doc = await createDraft("Inside", zebra.id)

    const renamed = await repo.renameFolder(zebra.id, "Beta")
    expect(renamed.id).toBe(zebra.id)
    expect(renamed.name).toBe("Beta")
    expect((await repo.get(doc.id))?.folderId).toBe(zebra.id)

    const sorted = (await repo.listFolders())
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name, "nb", { sensitivity: "base" }))
    expect(sorted.map((f) => f.name)).toEqual(["Alpha", "Beta"])
    expect(sorted.map((f) => f.id)).toEqual([alpha.id, zebra.id])
  })

  it("A: empty folder can be deleted", async () => {
    const repo = getAnalysisLibraryRepository()
    const folder = await repo.createFolder("Empty")
    await repo.deleteFolder(folder.id)
    expect((await repo.listFolders()).find((f) => f.id === folder.id)).toBeUndefined()
  })

  it("B: folder with draft is blocked", async () => {
    const repo = getAnalysisLibraryRepository()
    const folder = await repo.createFolder("With draft")
    const doc = await createDraft("Draft", folder.id)
    await expect(repo.deleteFolder(folder.id)).rejects.toThrow(/not empty/i)
    expect((await repo.get(doc.id))?.folderId).toBe(folder.id)
  })

  it("C: folder with archived analysis is blocked", async () => {
    const repo = getAnalysisLibraryRepository()
    const folder = await repo.createFolder("With archived")
    const draft = await createDraft("To archive", folder.id)
    await archiveDoc(draft)
    await expect(repo.deleteFolder(folder.id)).rejects.toThrow(/not empty/i)
    expect((await repo.get(draft.id))?.folderId).toBe(folder.id)
    expect((await repo.get(draft.id))?.status).toBe("archived")
  })

  it("D: filter-hidden content still blocks (archived exists while drafts-only UI would hide it)", async () => {
    const repo = getAnalysisLibraryRepository()
    const folder = await repo.createFolder("Mixed")
    const draft = await createDraft("Visible draft", folder.id)
    await archiveDoc(draft)
    // Authoritative emptiness ignores UI status filters — archived still counts.
    const summaries = await repo.listSummaries()
    const draftsOnly = summaries.filter((s) => s.folderId === folder.id && s.status === "draft")
    expect(draftsOnly).toHaveLength(0)
    await expect(repo.deleteFolder(folder.id)).rejects.toThrow(/not empty/i)
  })

  it("E: soft-deleted-only reference allows delete; restore falls back to no folder", async () => {
    const repo = getAnalysisLibraryRepository()
    const folder = await repo.createFolder("Trash only")
    const doc = await createDraft("Soft deleted", folder.id)
    await repo.moveToTrash(doc.id)
    await repo.deleteFolder(folder.id)
    expect((await repo.listFolders()).find((f) => f.id === folder.id)).toBeUndefined()
    await repo.restore(doc.id)
    expect((await repo.get(doc.id))?.folderId).toBeNull()
  })
})

describe("Library organization — analysis rename", () => {
  beforeEach(() => {
    clearLocalAnalysisLibraryStorageForTests()
  })

  it("renames draft: name changes, id/folder/status/workspace unchanged; updatedAt yes, lastOpenedAt no", async () => {
    const repo = getAnalysisLibraryRepository()
    const folder = await repo.createFolder("Campus")
    const doc = await createDraft("Old name", folder.id)
    const before = await repo.get(doc.id)
    expect(before).toBeTruthy()
    const lastOpenedAt = before!.lastOpenedAt
    const workspaceJson = JSON.stringify(before!.workspace)

    await new Promise((r) => setTimeout(r, 5))
    await repo.touchMetadata(doc.id, { name: "New name" })
    const after = await repo.get(doc.id)
    expect(after?.id).toBe(doc.id)
    expect(after?.name).toBe("New name")
    expect(after?.folderId).toBe(folder.id)
    expect(after?.status).toBe("draft")
    expect(JSON.stringify(after?.workspace)).toBe(workspaceJson)
    expect(after?.lastOpenedAt).toBe(lastOpenedAt)
    expect(new Date(after!.updatedAt).getTime()).toBeGreaterThan(
      new Date(before!.updatedAt).getTime(),
    )
  })

  it("renames archived: metadata only; snapshot and status intact", async () => {
    const repo = getAnalysisLibraryRepository()
    const draft = await createDraft("Archive title")
    const archived = await archiveDoc(draft)
    const snapshotBefore = structuredClone(archived.archivedSnapshot)
    const lastOpenedAt = archived.lastOpenedAt

    await repo.touchMetadata(archived.id, { name: "Library rename" })
    const after = await repo.get(archived.id)
    expect(after?.id).toBe(archived.id)
    expect(after?.name).toBe("Library rename")
    expect(after?.status).toBe("archived")
    expect(after?.archivedSnapshot).toEqual(snapshotBefore)
    expect(after?.workspace).toEqual(archived.workspace)
    expect(after?.lastOpenedAt).toBe(lastOpenedAt)
  })
})

describe("Library organization — move", () => {
  beforeEach(() => {
    clearLocalAnalysisLibraryStorageForTests()
  })

  it("moves folder A → B, → no folder, no folder → folder without cloning", async () => {
    const repo = getAnalysisLibraryRepository()
    const a = await repo.createFolder("A")
    const b = await repo.createFolder("B")
    const doc = await createDraft("Mover", a.id)
    const id = doc.id

    await repo.touchMetadata(id, { folderId: b.id })
    expect((await repo.get(id))?.folderId).toBe(b.id)

    await repo.touchMetadata(id, { folderId: null })
    expect((await repo.get(id))?.folderId).toBeNull()

    await repo.touchMetadata(id, { folderId: a.id })
    expect((await repo.get(id))?.folderId).toBe(a.id)

    const summaries = await repo.listSummaries()
    expect(summaries.filter((s) => s.id === id)).toHaveLength(1)
  })

  it("create new folder then move (Move dialog semantics)", async () => {
    const repo = getAnalysisLibraryRepository()
    const doc = await createDraft("Ungrouped")
    const folder = await repo.createFolder("From Move")
    await repo.touchMetadata(doc.id, { folderId: folder.id })
    expect((await repo.get(doc.id))?.folderId).toBe(folder.id)
    expect((await repo.listFolders()).some((f) => f.id === folder.id)).toBe(true)
  })

  it("moves draft and archived; does not change lastOpenedAt", async () => {
    const repo = getAnalysisLibraryRepository()
    const folder = await repo.createFolder("Dest")
    const draft = await createDraft("Draft move")
    const archived = await archiveDoc(await createDraft("Archived move"))
    const draftOpened = draft.lastOpenedAt
    const archivedOpened = archived.lastOpenedAt

    await repo.touchMetadata(draft.id, { folderId: folder.id })
    await repo.touchMetadata(archived.id, { folderId: folder.id })

    const d = await repo.get(draft.id)
    const a = await repo.get(archived.id)
    expect(d?.folderId).toBe(folder.id)
    expect(d?.status).toBe("draft")
    expect(d?.lastOpenedAt).toBe(draftOpened)
    expect(a?.folderId).toBe(folder.id)
    expect(a?.status).toBe("archived")
    expect(a?.archivedSnapshot).toEqual(archived.archivedSnapshot)
    expect(a?.lastOpenedAt).toBe(archivedOpened)
  })
})
