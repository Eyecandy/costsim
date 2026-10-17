import { beforeEach, describe, expect, it } from "vitest"

import { getAnalysisLibraryRepository } from "@/lib/analysisLibraryRepository"
import {
  __getFullDocumentLoadCountForTests,
  __resetFullDocumentLoadCountForTests,
  clearLocalAnalysisLibraryStorageForTests,
  LIBRARY_STORAGE_KEYS,
} from "@/lib/localAnalysisLibraryRepository"
import { buildArchivedAnalysisSnapshot } from "@/lib/buildArchivedAnalysisSnapshot"
import { DEFAULT_RESULT_PREFERENCES } from "@/domain/results/resultPreferences"
import { createBlankWorkspaceRuntimeState } from "@/lib/workspaceReset"
import {
  archiveCheckpoint,
  createInitialOngoingState,
  createNextCheckpoint,
  getLatestCheckpoint,
} from "@/lib/analysisCheckpoint"
import { nowIso } from "@/lib/analysisDocument"
import type { ProjectResult } from "@/simulation.worker"

function installLocalStoragePolyfill() {
  const store = new Map<string, string>()
  Object.defineProperty(globalThis, "localStorage", {
    value: {
      getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
      setItem: (k: string, v: string) => {
        store.set(k, String(v))
      },
      removeItem: (k: string) => {
        store.delete(k)
      },
      clear: () => store.clear(),
      key: () => null,
      get length() {
        return store.size
      },
    },
    configurable: true,
    writable: true,
  })
}

function makeValues(n: number): number[] {
  const out = new Array<number>(n)
  for (let i = 0; i < n; i++) out[i] = 100 + (i % 50) * 0.1
  return out
}

function archiveTipWithResults(
  ongoing: ReturnType<typeof createInitialOngoingState>,
  tag: string,
) {
  const tip = getLatestCheckpoint(ongoing)!
  const project = tip.workspace.projects[0]!
  const results: ProjectResult[] = [
    {
      projectId: project.id,
      incurredCosts: 0,
      values: makeValues(20_000),
      inputSeries: [],
    },
  ]
  const snap = buildArchivedAnalysisSnapshot({
    projects: tip.workspace.projects,
    activeProjectId: tip.workspace.activeProjectId,
    projectResults: results,
    simulatedBaseCostByProjectId: { [project.id]: 100 },
    inputSignature: `sig-${tag}`,
    simulationCount: 20_000,
    resultPreferences: DEFAULT_RESULT_PREFERENCES,
  })
  return archiveCheckpoint(ongoing, tip.id, snap)
}

describe("library summary index (hot path)", () => {
  beforeEach(() => {
    installLocalStoragePolyfill()
    clearLocalAnalysisLibraryStorageForTests()
  })

  it("listSummaries does not load full AnalysisDocuments when summaries are warm", async () => {
    const repo = getAnalysisLibraryRepository()
    const blank = createBlankWorkspaceRuntimeState()
    const a = await repo.create({
      name: "Heavy A",
      analysisMode: "ongoing",
      workspace: {
        projects: blank.projects,
        activeProjectId: blank.activeProjectId,
      },
    })
    let ongoing = createInitialOngoingState({
      projects: blank.projects,
      activeProjectId: blank.activeProjectId,
    })
    ongoing = archiveTipWithResults(ongoing, "1")
    const next = createNextCheckpoint(ongoing, {
      name: "CP2",
      analysisName: a.name,
    })
    expect(next.ok).toBe(true)
    if (!next.ok) return
    ongoing = archiveTipWithResults(next.ongoing, "2")
    await repo.saveDraft({ ...a, ongoing })

    await repo.create({
      name: "Single B",
      analysisMode: "single",
      workspace: {
        projects: blank.projects,
        activeProjectId: blank.activeProjectId,
      },
    })

    __resetFullDocumentLoadCountForTests()
    const summaries = await repo.listSummaries()
    const loads = __getFullDocumentLoadCountForTests()

    expect(summaries).toHaveLength(2)
    expect(summaries.map((s) => s.name).sort()).toEqual(["Heavy A", "Single B"])
    expect(summaries.find((s) => s.name === "Heavy A")?.analysisMode).toBe(
      "ongoing",
    )
    expect(summaries.find((s) => s.name === "Heavy A")?.status).toBe("draft")
    expect(loads).toBe(0)
  })

  it("create / rename / move keep summary in sync", async () => {
    const repo = getAnalysisLibraryRepository()
    const blank = createBlankWorkspaceRuntimeState()
    const created = await repo.create({
      name: "Original",
      analysisMode: "single",
      workspace: {
        projects: blank.projects,
        activeProjectId: blank.activeProjectId,
      },
    })
    const folder = await repo.createFolder("Folder")

    __resetFullDocumentLoadCountForTests()
    await repo.touchMetadata(created.id, { name: "Renamed" })
    await repo.touchMetadata(created.id, { folderId: folder.id })
    const listed = await repo.listSummaries()
    expect(__getFullDocumentLoadCountForTests()).toBeLessThanOrEqual(2) // rename+move each one load without knownDoc
    expect(listed.find((s) => s.id === created.id)?.name).toBe("Renamed")
    expect(listed.find((s) => s.id === created.id)?.folderId).toBe(folder.id)
  })

  it("archive Single updates summary status without list parsing bodies", async () => {
    const repo = getAnalysisLibraryRepository()
    const blank = createBlankWorkspaceRuntimeState()
    const created = await repo.create({
      name: "To archive",
      analysisMode: "single",
      workspace: {
        projects: blank.projects,
        activeProjectId: blank.activeProjectId,
      },
    })
    const snap = buildArchivedAnalysisSnapshot({
      projects: blank.projects,
      activeProjectId: blank.activeProjectId,
      projectResults: [
        {
          projectId: blank.projects[0]!.id,
          incurredCosts: 0,
          values: makeValues(20_000),
          inputSeries: [],
        },
      ],
      simulatedBaseCostByProjectId: { [blank.projects[0]!.id]: 100 },
      inputSignature: "arch",
      simulationCount: 20_000,
      resultPreferences: DEFAULT_RESULT_PREFERENCES,
    })
    await repo.archive({ analysisId: created.id, snapshot: snap })

    __resetFullDocumentLoadCountForTests()
    const listed = await repo.listSummaries()
    expect(__getFullDocumentLoadCountForTests()).toBe(0)
    expect(listed.find((s) => s.id === created.id)?.status).toBe("archived")
  })

  it("complete Ongoing updates summary to archived", async () => {
    const repo = getAnalysisLibraryRepository()
    const blank = createBlankWorkspaceRuntimeState()
    const created = await repo.create({
      name: "Finish me",
      analysisMode: "ongoing",
      workspace: {
        projects: blank.projects,
        activeProjectId: blank.activeProjectId,
      },
    })
    let ongoing = createInitialOngoingState({
      projects: blank.projects,
      activeProjectId: blank.activeProjectId,
    })
    ongoing = archiveTipWithResults(ongoing, "final")
    await repo.saveDraft({ ...created, ongoing })
    await repo.completeOngoingAnalysis(created.id)

    __resetFullDocumentLoadCountForTests()
    const listed = await repo.listSummaries()
    expect(__getFullDocumentLoadCountForTests()).toBe(0)
    expect(listed.find((s) => s.id === created.id)?.status).toBe("archived")
    expect(listed.find((s) => s.id === created.id)?.analysisMode).toBe(
      "ongoing",
    )
  })

  it("lastOpenedAt with knownDocument does not load the full document again", async () => {
    const repo = getAnalysisLibraryRepository()
    const blank = createBlankWorkspaceRuntimeState()
    const created = await repo.create({
      name: "Open me",
      analysisMode: "ongoing",
      workspace: {
        projects: blank.projects,
        activeProjectId: blank.activeProjectId,
      },
    })
    let ongoing = createInitialOngoingState({
      projects: blank.projects,
      activeProjectId: blank.activeProjectId,
    })
    ongoing = archiveTipWithResults(ongoing, "cp1")
    await repo.saveDraft({ ...created, ongoing })

    const doc = await repo.get(created.id)
    expect(doc).toBeTruthy()
    __resetFullDocumentLoadCountForTests()
    const openedAt = nowIso()
    await repo.touchMetadata(
      created.id,
      { lastOpenedAt: openedAt },
      { knownDocument: doc! },
    )
    expect(__getFullDocumentLoadCountForTests()).toBe(0)

    __resetFullDocumentLoadCountForTests()
    const listed = await repo.listSummaries()
    expect(__getFullDocumentLoadCountForTests()).toBe(0)
    expect(listed.find((s) => s.id === created.id)?.lastOpenedAt).toBe(openedAt)

    const reloaded = await repo.get(created.id)
    expect(reloaded?.lastOpenedAt).toBe(openedAt)
    // Analytical payload unchanged
    const reloadedSnapshot =
      reloaded?.ongoing?.checkpoints[0]?.archivedSnapshot
    expect(
      reloadedSnapshot && "projectResults" in reloadedSnapshot
        ? reloadedSnapshot.projectResults[0]?.values
        : [],
    ).toHaveLength(20_000)
  })

  it("trash / restore keep summary consistent without list body loads", async () => {
    const repo = getAnalysisLibraryRepository()
    const blank = createBlankWorkspaceRuntimeState()
    const created = await repo.create({
      name: "Trash me",
      analysisMode: "single",
      workspace: {
        projects: blank.projects,
        activeProjectId: blank.activeProjectId,
      },
    })
    await repo.moveToTrash(created.id)

    __resetFullDocumentLoadCountForTests()
    expect(await repo.listSummaries()).toHaveLength(0)
    const trash = await repo.listTrash()
    expect(trash).toHaveLength(1)
    expect(trash[0]?.id).toBe(created.id)
    expect(__getFullDocumentLoadCountForTests()).toBe(0)

    await repo.restore(created.id)
    __resetFullDocumentLoadCountForTests()
    expect((await repo.listSummaries()).map((s) => s.id)).toContain(created.id)
    expect(__getFullDocumentLoadCountForTests()).toBe(0)
  })

  it("opening still returns full persisted AnalysisDocument content", async () => {
    const repo = getAnalysisLibraryRepository()
    const blank = createBlankWorkspaceRuntimeState()
    const created = await repo.create({
      name: "Full body",
      analysisMode: "ongoing",
      workspace: {
        projects: blank.projects,
        activeProjectId: blank.activeProjectId,
      },
    })
    let ongoing = createInitialOngoingState({
      projects: blank.projects,
      activeProjectId: blank.activeProjectId,
    })
    ongoing = archiveTipWithResults(ongoing, "keep")
    await repo.saveDraft({ ...created, ongoing })
    const got = await repo.get(created.id)
    expect(got?.ongoing?.checkpoints).toHaveLength(1)
    const gotSnapshot = got?.ongoing?.checkpoints[0]?.archivedSnapshot
    expect(
      gotSnapshot && "projectResults" in gotSnapshot
        ? gotSnapshot.projectResults[0]?.values.length
        : 0,
    ).toBe(20_000)
    expect(got?.workspace.projects[0]?.id).toBe(blank.projects[0]!.id)
  })

  it("legacy index without summaries rebuilds once then stays warm", async () => {
    const repo = getAnalysisLibraryRepository()
    const blank = createBlankWorkspaceRuntimeState()
    const created = await repo.create({
      name: "Legacy",
      analysisMode: "single",
      workspace: {
        projects: blank.projects,
        activeProjectId: blank.activeProjectId,
      },
    })
    // Strip summaries to simulate pre-optimization index.
    const raw = JSON.parse(
      localStorage.getItem(LIBRARY_STORAGE_KEYS.index)!,
    ) as { v: 1; folders: unknown[]; analysisIds: string[] }
    localStorage.setItem(
      LIBRARY_STORAGE_KEYS.index,
      JSON.stringify({
        v: 1,
        folders: raw.folders,
        analysisIds: raw.analysisIds,
      }),
    )

    __resetFullDocumentLoadCountForTests()
    const first = await repo.listSummaries()
    const rebuildLoads = __getFullDocumentLoadCountForTests()
    expect(first.find((s) => s.id === created.id)?.name).toBe("Legacy")
    expect(rebuildLoads).toBeGreaterThanOrEqual(1)

    __resetFullDocumentLoadCountForTests()
    await repo.listSummaries()
    expect(__getFullDocumentLoadCountForTests()).toBe(0)
  })
})
