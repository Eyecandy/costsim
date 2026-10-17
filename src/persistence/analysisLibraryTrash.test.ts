import { beforeEach, describe, expect, it } from "vitest"

import {
  clearLocalAnalysisLibraryStorageForTests,
} from "@/persistence/localAnalysisLibraryRepository"
import { getAnalysisLibraryRepository } from "@/persistence/analysisLibraryRepository"
import {
  isAnalysisTrashed,
  isTrashExpired,
  TRASH_RETENTION_DAYS,
} from "@/domain/analysis/analysisDocument"
import { createBlankWorkspaceRuntimeState } from "@/domain/analysis/workspaceReset"
import {
  buildArchivedAnalysisSnapshot,
  canArchiveCurrentResults,
} from "@/domain/analysis/buildArchivedAnalysisSnapshot"
import { DEFAULT_RESULT_PREFERENCES } from "@/domain/results/resultPreferences"
import type { ProjectResult } from "@/simulation.worker"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { repoRoot } from "@/test-utils/repoRoot"


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

describe("Analysis Library Trash", () => {
  beforeEach(() => {
    clearLocalAnalysisLibraryStorageForTests()
  })

  it("A: soft-deletes draft — hidden from normal views, restorable", async () => {
    const repo = getAnalysisLibraryRepository()
    const doc = await createDraft("Draft to trash")
    await repo.moveToTrash(doc.id)

    const active = await repo.listSummaries()
    expect(active.find((s) => s.id === doc.id)).toBeUndefined()

    const trash = await repo.listTrash()
    expect(trash).toHaveLength(1)
    expect(trash[0]!.id).toBe(doc.id)
    expect(trash[0]!.deletedAt).toBeTruthy()

    const body = await repo.get(doc.id)
    expect(body).not.toBeNull()
    expect(isAnalysisTrashed(body!)).toBe(true)
    expect(body!.status).toBe("draft")

    await repo.restore(doc.id)
    const restored = await repo.get(doc.id)
    expect(restored?.deletedAt == null || restored?.deletedAt === null).toBe(
      true,
    )
    expect(restored?.status).toBe("draft")
    expect((await repo.listSummaries()).some((s) => s.id === doc.id)).toBe(true)
    expect((await repo.listTrash()).length).toBe(0)
  })

  it("B: soft-deletes archived — restore keeps archived + snapshot", async () => {
    const repo = getAnalysisLibraryRepository()
    const blank = createBlankWorkspaceRuntimeState()
    const doc = await createDraft("Archive then trash")
    const fakeResults: ProjectResult[] = [
      {
        projectId: blank.projects[0]!.id,
        incurredCosts: 0,
        values: [1, 2, 3, 4, 5],
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
    const snapshot = buildArchivedAnalysisSnapshot({
      projects: blank.projects,
      activeProjectId: blank.activeProjectId,
      projectResults: fakeResults,
      simulatedBaseCostByProjectId: { [blank.projects[0]!.id]: 10 },
      inputSignature: signature,
      simulationCount: 1,
      resultPreferences: DEFAULT_RESULT_PREFERENCES,
      shapleyByProjectId: {},
    })
    await repo.archive({ analysisId: doc.id, snapshot })
    await repo.moveToTrash(doc.id)

    const inTrash = (await repo.listTrash())[0]!
    expect(inTrash.status).toBe("archived")

    await repo.restore(doc.id)
    const restored = await repo.get(doc.id)
    expect(restored?.status).toBe("archived")
    expect(restored?.archivedSnapshot).toBeTruthy()
    expect(isAnalysisTrashed(restored!)).toBe(false)
  })

  it("C: restore returns to original folder", async () => {
    const repo = getAnalysisLibraryRepository()
    const folder = await repo.createFolder("Kommune")
    const doc = await createDraft("In folder", folder.id)
    await repo.moveToTrash(doc.id)
    await repo.restore(doc.id)
    expect((await repo.get(doc.id))?.folderId).toBe(folder.id)
  })

  it("D: restore ungroups when original folder is gone", async () => {
    const repo = getAnalysisLibraryRepository()
    const folder = await repo.createFolder("Gone")
    const doc = await createDraft("Orphan later", folder.id)
    await repo.moveToTrash(doc.id)
    await repo.deleteFolder(folder.id)
    await repo.restore(doc.id)
    expect((await repo.get(doc.id))?.folderId).toBeNull()
  })

  it("E: trashed items excluded from Recent / Home lists", async () => {
    const repo = getAnalysisLibraryRepository()
    const keep = await createDraft("Keep me")
    const trash = await createDraft("Trash me")
    await repo.touchMetadata(trash.id, {
      lastOpenedAt: new Date(Date.now() + 60_000).toISOString(),
    })
    await repo.moveToTrash(trash.id)
    const summaries = await repo.listSummaries()
    expect(summaries.map((s) => s.id)).toEqual([keep.id])
  })

  it("F: permanent delete removes body and cannot restore", async () => {
    const repo = getAnalysisLibraryRepository()
    const doc = await createDraft("Gone forever")
    await repo.moveToTrash(doc.id)
    await repo.deletePermanently(doc.id)
    expect(await repo.get(doc.id)).toBeNull()
    expect(await repo.listTrash()).toHaveLength(0)
    await expect(repo.restore(doc.id)).rejects.toThrow()
  })

  it("G: emptyTrash removes only trashed analyses", async () => {
    const repo = getAnalysisLibraryRepository()
    const keep = await createDraft("Stay")
    const a = await createDraft("Trash A")
    const b = await createDraft("Trash B")
    await repo.moveToTrash(a.id)
    await repo.moveToTrash(b.id)
    await repo.emptyTrash()
    expect(await repo.listTrash()).toHaveLength(0)
    expect((await repo.listSummaries()).map((s) => s.id)).toEqual([keep.id])
  })

  it("H: 30-day expiry purges on list", async () => {
    const repo = getAnalysisLibraryRepository()
    const { __setDeletedAtForTests } = await import(
      "@/persistence/localAnalysisLibraryRepository"
    )
    const fresh = await createDraft("Fresh trash")
    const old = await createDraft("Expired trash")
    await repo.moveToTrash(fresh.id)
    await repo.moveToTrash(old.id)
    const expiredAt = new Date(
      Date.now() - (TRASH_RETENTION_DAYS + 1) * 24 * 60 * 60 * 1000,
    ).toISOString()
    __setDeletedAtForTests(old.id, expiredAt)
    expect(isTrashExpired(expiredAt)).toBe(true)

    const trash = await repo.listTrash()
    expect(trash.map((s) => s.id)).toEqual([fresh.id])
    expect(await repo.get(old.id)).toBeNull()
  })

  it("J: UI copy — soft delete is recoverable; permanent is irreversible", () => {
    const messages = readFileSync(
      join(repoRoot, "src/i18n/messages.ts"),
      "utf8",
    )
    expect(messages).toContain('delete: "Slett"')
    expect(messages).toContain('delete: "Delete"')
    expect(messages).toContain("Slettede analyser")
    expect(messages).toContain("Deleted analyses")
    expect(messages).toContain("Slette analysen?")
    expect(messages).toContain("Delete analysis?")
    expect(messages).toContain("30 dager")
    expect(messages).toContain("30 days")
    expect(messages).toContain("Slett permanent")
    expect(messages).toContain("Delete permanently")
    expect(messages).toContain("kan ikke angres")
    expect(messages).toContain("cannot be undone")
    expect(messages).toContain("Slett alle permanent")
    expect(messages).toContain("Delete all permanently")
    expect(messages).toContain("Ingen slettede analyser")
    expect(messages).toContain("No deleted analyses")
    // Soft-delete copy must not use Trash / Papirkurv wording
    expect(messages).not.toMatch(/library:[\s\S]*?Papirkurv/)
    expect(messages).not.toContain("Move to Trash")
    expect(messages).not.toContain("Empty Trash")
    expect(messages).not.toContain("Flytt til papirkurv")
    expect(messages).not.toContain("Tøm papirkurv")
    // Soft-delete confirm explains recovery; irreversible only on permanent
    expect(messages).toMatch(
      /deleteConfirm:[\s\S]*?Slettede analyser[\s\S]*?30 dager/,
    )
    expect(messages).toMatch(
      /deleteConfirm:[\s\S]*?Deleted analyses[\s\S]*?30 days/,
    )
  })
})
