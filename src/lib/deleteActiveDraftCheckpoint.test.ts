/**
 * Delete active tip draft checkpoint — NOT AnalysisDocument / Trash delete.
 */
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

import { beforeEach, describe, expect, it } from "vitest"

import {
  archiveCheckpoint,
  canCreateNextCheckpoint,
  canDeleteActiveDraftCheckpoint,
  createInitialOngoingState,
  createNextCheckpoint,
  defaultCheckpointName,
  deleteActiveDraftCheckpoint,
  ensureSingleProjectWorkspace,
  getActiveCheckpoint,
  getDeleteActiveDraftCheckpointBlockReason,
  selectCheckpoint as selectCheckpointInState,
} from "@/lib/analysisCheckpoint"
import { isAnalysisTrashed } from "@/lib/analysisDocument"
import {
  clearLocalAnalysisLibraryStorageForTests,
  getLocalAnalysisLibraryRepository,
} from "@/lib/localAnalysisLibraryRepository"
import { buildOngoingCheckpointResultSnapshot } from "@/lib/ongoingCheckpointResultSnapshot"
import { DEFAULT_RESULT_PREFERENCES } from "@/domain/results/resultPreferences"
import { buildSimulationInputSignature } from "@/domain/simulation/simulationInputSignature"
import { createBlankWorkspaceRuntimeState } from "@/lib/workspaceReset"
import type { Project } from "@/lib/project"
import type { ProjectResult } from "@/simulation.worker"

const sessionSource = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "useLibraryAnalysisSession.ts"),
  "utf8",
)
const appSource = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "../App.tsx"),
  "utf8",
)
const menuSource = readFileSync(
  join(
    dirname(fileURLToPath(import.meta.url)),
    "../components/AnalysisActionsMenu.tsx",
  ),
  "utf8",
)

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

function makeCompact(
  analysisId: string,
  checkpointId: string,
  project: Project,
  center = 1000,
) {
  return buildOngoingCheckpointResultSnapshot({
    analysisId,
    checkpointId,
    projects: [project],
    activeProjectId: project.id,
    projectResults: resultsFor(project, center),
    simulatedBaseCostByProjectId: { [project.id]: 100 },
    inputSignature: buildSimulationInputSignature([project]),
    simulationCount: 20_000,
    resultPreferences: DEFAULT_RESULT_PREFERENCES,
  })
}

async function setupCp1ArchivedCp2Draft() {
  const repo = getLocalAnalysisLibraryRepository()
  const blank = createBlankWorkspaceRuntimeState()
  const project = blank.projects[0]!
  const workspace = { projects: [project], activeProjectId: project.id }
  const doc = await repo.create({
    name: "Ongoing delete-CP test",
    analysisMode: "ongoing",
    workspace,
  })
  let ongoing = createInitialOngoingState(workspace)
  const cp1Id = ongoing.activeCheckpointId
  const compact = makeCompact(doc.id, cp1Id, project)
  ongoing = archiveCheckpoint(ongoing, cp1Id, compact)
  const created = createNextCheckpoint(ongoing, {
    name: defaultCheckpointName(2),
    analysisId: doc.id,
  })
  expect(created.ok).toBe(true)
  if (!created.ok) throw new Error("createNext failed")
  ongoing = created.ongoing
  await repo.saveDraft({
    ...doc,
    ongoing,
    workspace: ensureSingleProjectWorkspace(created.newCheckpoint.workspace),
    ongoingDraftResult: created.inheritedResult,
  })
  return { repo, doc, project, ongoing, cp1Id, created, compact }
}

beforeEach(() => clearLocalAnalysisLibraryStorageForTests())

describe("delete active draft checkpoint — not analysis delete", () => {
  it("A: deletes CP2 only; document stays; deletedAt null; CP1 intact", async () => {
    const { repo, doc, ongoing, cp1Id, created, compact } =
      await setupCp1ArchivedCp2Draft()
    const before = await repo.get(doc.id)
    expect(before!.deletedAt).toBeNull()
    expect(isAnalysisTrashed(before!)).toBe(false)

    const deleted = deleteActiveDraftCheckpoint(ongoing)
    expect(deleted.ok).toBe(true)
    if (!deleted.ok) return

    await repo.saveDraft({
      ...(await repo.get(doc.id))!,
      deletedAt: null,
      ongoing: deleted.ongoing,
      workspace: ensureSingleProjectWorkspace(
        deleted.restoredCheckpoint.workspace,
      ),
      ongoingDraftResult: undefined,
    })

    const after = await repo.get(doc.id)
    expect(after).toBeTruthy()
    expect(after!.id).toBe(doc.id)
    expect(after!.name).toBe(doc.name)
    expect(after!.deletedAt).toBeNull()
    expect(isAnalysisTrashed(after!)).toBe(false)
    expect(after!.status).toBe("draft")
    expect(after!.ongoing!.lifecycle).toBe("active")
    expect(after!.ongoing!.checkpoints).toHaveLength(1)
    expect(after!.ongoing!.activeCheckpointId).toBe(cp1Id)
    expect(after!.ongoing!.checkpoints[0]!.archivedSnapshot).toEqual(compact)
    expect(
      after!.ongoing!.checkpoints.some((c) => c.id === created.newCheckpoint.id),
    ).toBe(false)
    expect(after!.ongoingDraftResult).toBeUndefined()
  })

  it("B: Library still lists the same Ongoing analysis after CP delete", async () => {
    const { repo, doc, ongoing } = await setupCp1ArchivedCp2Draft()
    const deleted = deleteActiveDraftCheckpoint(ongoing)
    expect(deleted.ok).toBe(true)
    if (!deleted.ok) return
    await repo.saveDraft({
      ...(await repo.get(doc.id))!,
      ongoing: deleted.ongoing,
      workspace: ensureSingleProjectWorkspace(
        deleted.restoredCheckpoint.workspace,
      ),
      ongoingDraftResult: undefined,
    })

    const list = await repo.listSummaries()
    const found = list.find((s) => s.id === doc.id)
    expect(found).toBeTruthy()
    expect(found!.deletedAt).toBeNull()
    expect(isAnalysisTrashed(found!)).toBe(false)
    const opened = await repo.get(doc.id)
    expect(opened?.ongoing?.lifecycle).toBe("active")
  })

  it("C: session delete path never calls moveToTrash / sets deletedAt", () => {
    const fn = sessionSource.slice(
      sessionSource.indexOf("const deleteActiveDraftCheckpointSession"),
      sessionSource.indexOf("const selectCheckpoint ="),
    )
    expect(fn).toContain("await repo.saveDraft")
    expect(fn).not.toContain("moveToTrash")
    expect(fn).not.toContain("deleteAnalysis")
    expect(fn).toContain("deletedAt: latest.deletedAt ?? null")
    expect(fn).toContain("ongoingDraftResult: undefined")
    // Durable-first: persist before committing React/UI.
    expect(fn.indexOf("await repo.saveDraft")).toBeLessThan(
      fn.indexOf("setOngoing(deleted.ongoing)"),
    )
  })

  it("C2: UI wires checkpoint delete separately from trash", () => {
    expect(menuSource).toContain("onDeleteCheckpoint")
    expect(menuSource).toContain("onMoveToTrash")
    expect(appSource).toContain("deleteActiveDraftCheckpoint")
    expect(appSource).toContain("setDeleteCheckpointConfirmOpen(true)")
    const confirmBlock = appSource.slice(
      appSource.indexOf("open={deleteCheckpointConfirmOpen}"),
      appSource.indexOf("open={finishOngoingConfirmOpen}"),
    )
    expect(confirmBlock).toContain("deleteActiveDraftCheckpoint")
    expect(confirmBlock).toMatch(
      /onConfirm=\{\(\) => \{[\s\S]*?deleteActiveDraftCheckpoint\(\)/,
    )
    expect(confirmBlock).not.toContain("setTrashConfirmOpen")
    expect(confirmBlock).not.toContain("moveCurrentToTrash()")
    expect(confirmBlock).toContain("checkpoints.deleteCheckpointConfirm")
    expect(confirmBlock).not.toMatch(/30\s*day|papirkurv/i)
  })

  it("D: archived CP1 cannot be deleted", async () => {
    const { ongoing, cp1Id } = await setupCp1ArchivedCp2Draft()
    const viewingCp1 = selectCheckpointInState(ongoing, cp1Id)!
    expect(canDeleteActiveDraftCheckpoint(viewingCp1)).toBe(false)
    expect(getDeleteActiveDraftCheckpointBlockReason(viewingCp1)).toBe(
      "not_draft",
    )
    const tipArchivedOnly = await (async () => {
      const blank = createBlankWorkspaceRuntimeState()
      const project = blank.projects[0]!
      let o = createInitialOngoingState({
        projects: [project],
        activeProjectId: project.id,
      })
      o = archiveCheckpoint(
        o,
        o.activeCheckpointId,
        makeCompact("x", o.activeCheckpointId, project),
      )
      return o
    })()
    expect(canDeleteActiveDraftCheckpoint(tipArchivedOnly)).toBe(false)
  })

  it("E: first/only draft checkpoint — delete unavailable", () => {
    const blank = createBlankWorkspaceRuntimeState()
    const ongoing = createInitialOngoingState({
      projects: blank.projects,
      activeProjectId: blank.activeProjectId,
    })
    expect(canDeleteActiveDraftCheckpoint(ongoing)).toBe(false)
    expect(getDeleteActiveDraftCheckpointBlockReason(ongoing)).toBe(
      "no_archived_predecessor",
    )
  })

  it("F: delete simulated CP2 + reload — CP2 gone, CP1 intact", async () => {
    const { repo, doc, project, ongoing, cp1Id, created, compact } =
      await setupCp1ArchivedCp2Draft()
    const tipCompact = makeCompact(
      doc.id,
      created.newCheckpoint.id,
      project,
      9000,
    )
    await repo.saveDraft({
      ...(await repo.get(doc.id))!,
      ongoing,
      ongoingDraftResult: tipCompact,
    })

    const deleted = deleteActiveDraftCheckpoint(ongoing)
    expect(deleted.ok).toBe(true)
    if (!deleted.ok) return
    await repo.saveDraft({
      ...(await repo.get(doc.id))!,
      ongoing: deleted.ongoing,
      workspace: ensureSingleProjectWorkspace(
        deleted.restoredCheckpoint.workspace,
      ),
      ongoingDraftResult: undefined,
    })

    const cold = await repo.get(doc.id)
    expect(cold!.deletedAt).toBeNull()
    expect(cold!.ongoing!.checkpoints.map((c) => c.id)).toEqual([cp1Id])
    expect(cold!.ongoingDraftResult).toBeUndefined()
    expect(cold!.ongoing!.checkpoints[0]!.archivedSnapshot).toEqual(compact)
  })

  it("G: createNext after delete is CP2 again", async () => {
    const { ongoing, created } = await setupCp1ArchivedCp2Draft()
    expect(created.newCheckpoint.sequence).toBe(2)
    const deleted = deleteActiveDraftCheckpoint(ongoing)
    expect(deleted.ok).toBe(true)
    if (!deleted.ok) return
    expect(canCreateNextCheckpoint(deleted.ongoing)).toBe(true)
    const again = createNextCheckpoint(deleted.ongoing, { analysisId: "a" })
    expect(again.ok).toBe(true)
    if (!again.ok) return
    expect(again.newCheckpoint.sequence).toBe(2)
    expect(again.newCheckpoint.name).toBe(defaultCheckpointName(2))
  })

  it("H: durable save failure — CP2 remains; not trashed", async () => {
    const { repo, doc, ongoing, created } = await setupCp1ArchivedCp2Draft()
    const deleted = deleteActiveDraftCheckpoint(ongoing)
    expect(deleted.ok).toBe(true)
    if (!deleted.ok) return

    const original = repo.saveDraft.bind(repo)
    repo.saveDraft = async () => {
      throw new Error("Failed to persist draft analysis")
    }
    let failed = false
    try {
      await repo.saveDraft({
        ...(await repo.get(doc.id))!,
        ongoing: deleted.ongoing,
        ongoingDraftResult: undefined,
      })
    } catch {
      failed = true
    } finally {
      repo.saveDraft = original
    }
    expect(failed).toBe(true)

    const cold = await repo.get(doc.id)
    expect(cold!.deletedAt).toBeNull()
    expect(isAnalysisTrashed(cold!)).toBe(false)
    expect(cold!.ongoing!.checkpoints).toHaveLength(2)
    expect(cold!.ongoing!.activeCheckpointId).toBe(created.newCheckpoint.id)
  })

  it("I: whole-analysis Trash remains a separate path", () => {
    expect(sessionSource).toContain("moveCurrentToTrash")
    expect(sessionSource).toContain("await repo.moveToTrash")
    const trashFn = sessionSource.slice(
      sessionSource.indexOf("const moveCurrentToTrash"),
      sessionSource.indexOf("moveCurrentToTrash,"),
    )
    expect(trashFn).toContain("moveToTrash")
    const deleteFn = sessionSource.slice(
      sessionSource.indexOf("const deleteActiveDraftCheckpointSession"),
      sessionSource.indexOf("const selectCheckpoint ="),
    )
    expect(deleteFn).not.toContain("moveToTrash")
    expect(appSource).toContain("onMoveToTrash={() => setTrashConfirmOpen(true)}")
    expect(appSource).toContain("onDeleteCheckpoint=")
    expect(appSource).toContain("canDeleteActiveDraftCheckpoint")
  })
})

describe("delete active draft checkpoint — eligibility extras", () => {
  it("active tip draft with predecessor is deletable", async () => {
    const { ongoing } = await setupCp1ArchivedCp2Draft()
    expect(canDeleteActiveDraftCheckpoint(ongoing)).toBe(true)
    expect(getActiveCheckpoint(ongoing)?.status).toBe("draft")
  })
})
