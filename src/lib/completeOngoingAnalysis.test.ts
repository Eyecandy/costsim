import { beforeEach, describe, expect, it, vi } from "vitest"
import { readFileSync } from "node:fs"
import { join } from "node:path"

import {
  archiveCheckpoint,
  canCreateNextCheckpoint,
  completeOngoingAnalysis,
  createInitialOngoingState,
  createNextCheckpoint,
  getCompleteOngoingAnalysisBlockReason,
  getCreateNextCheckpointBlockReason,
  getLatestCheckpoint,
  selectCheckpoint,
} from "@/lib/analysisCheckpoint"
import { getAnalysisLibraryRepository } from "@/lib/analysisLibraryRepository"
import { clearLocalAnalysisLibraryStorageForTests } from "@/lib/localAnalysisLibraryRepository"
import { buildArchivedAnalysisSnapshot } from "@/lib/buildArchivedAnalysisSnapshot"
import { DEFAULT_RESULT_PREFERENCES } from "@/lib/resultPreferences"
import { createBlankWorkspaceRuntimeState } from "@/lib/workspaceReset"
import type { Project } from "@/lib/project"
import type { ProjectResult } from "@/simulation.worker"
import { messages } from "@/i18n/messages"
import { repoRoot } from "@/test-utils/repoRoot"


function snapshotFor(projects: Project[], activeProjectId: string, tag = "a") {
  const fakeResults: ProjectResult[] = projects.map((p) => ({
    projectId: p.id,
    incurredCosts: 0,
    values: [100, 110, 120, 130, 140],
    inputSeries: [],
  }))
  return buildArchivedAnalysisSnapshot({
    projects,
    activeProjectId,
    projectResults: fakeResults,
    simulatedBaseCostByProjectId: Object.fromEntries(
      projects.map((p) => [p.id, 100]),
    ),
    inputSignature: `sig-${tag}`,
    simulationCount: 20_000,
    resultPreferences: DEFAULT_RESULT_PREFERENCES,
  })
}

function archiveTip(
  ongoing: ReturnType<typeof createInitialOngoingState>,
  projects: Project[],
  activeProjectId: string,
  tag?: string,
) {
  const tip = getLatestCheckpoint(ongoing)!
  return archiveCheckpoint(
    ongoing,
    tip.id,
    snapshotFor(projects, activeProjectId, tag),
  )
}

describe("completeOngoingAnalysis", () => {
  beforeEach(() => {
    clearLocalAnalysisLibraryStorageForTests()
  })

  it("finishes when lifecycle active and latest checkpoint archived", async () => {
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
    let ongoing = created.ongoing!
    expect(ongoing.lifecycle).toBe("active")
    ongoing = archiveTip(ongoing, blank.projects, blank.activeProjectId, "cp1")
    await repo.saveDraft({ ...created, ongoing })

    expect(
      getCompleteOngoingAnalysisBlockReason({
        status: "draft",
        analysisMode: "ongoing",
        ongoing,
      }),
    ).toBeNull()

    const completed = await repo.completeOngoingAnalysis(created.id)
    expect(completed.status).toBe("archived")
    expect(completed.ongoing?.lifecycle).toBe("completed")
    expect(completed.ongoing?.checkpoints).toHaveLength(1)
    expect(completed.ongoing?.checkpoints[0]!.status).toBe("archived")
    expect(completed.ongoing?.activeCheckpointId).toBe(ongoing.activeCheckpointId)
    expect(completed.ongoing?.checkpoints[0]!.archivedSnapshot?.inputSignature).toBe(
      "sig-cp1",
    )
    expect(canCreateNextCheckpoint(completed.ongoing)).toBe(false)
    expect(getCreateNextCheckpointBlockReason(completed.ongoing)).toBe(
      "lifecycle_completed",
    )

    const listed = await repo.listSummaries()
    expect(listed.find((s) => s.id === created.id)?.status).toBe("archived")
  })

  it("blocks finish while latest checkpoint is still draft", async () => {
    const repo = getAnalysisLibraryRepository()
    const blank = createBlankWorkspaceRuntimeState()
    const created = await repo.create({
      name: "Still drafting",
      analysisMode: "ongoing",
      workspace: {
        projects: blank.projects,
        activeProjectId: blank.activeProjectId,
      },
    })
    const ongoing = created.ongoing!
    expect(
      getCompleteOngoingAnalysisBlockReason({
        status: "draft",
        analysisMode: "ongoing",
        ongoing,
      }),
    ).toBe("has_draft")

    await expect(repo.completeOngoingAnalysis(created.id)).rejects.toThrow(
      /latest_not_archived|has_draft/,
    )
    const reloaded = await repo.get(created.id)
    expect(reloaded?.status).toBe("draft")
    expect(reloaded?.ongoing?.lifecycle).toBe("active")

    expect(messages.no.checkpoints.finishOngoingNeedArchiveCheckpoint).toBe(
      "Arkiver gjeldende sjekkpunkt før analysen avsluttes.",
    )
    expect(messages.en.checkpoints.finishOngoingNeedArchiveCheckpoint).toBe(
      "Archive the current checkpoint before finishing the analysis.",
    )
  })

  it("preserves multi-checkpoint history and active tip on completion", async () => {
    const repo = getAnalysisLibraryRepository()
    const blank = createBlankWorkspaceRuntimeState()
    const created = await repo.create({
      name: "Three CPs",
      analysisMode: "ongoing",
      workspace: {
        projects: blank.projects,
        activeProjectId: blank.activeProjectId,
      },
    })
    let ongoing = archiveTip(
      created.ongoing!,
      blank.projects,
      blank.activeProjectId,
      "cp1",
    )
    let next = createNextCheckpoint(ongoing, {
      name: "CP2",
      analysisName: created.name,
    })
    expect(next.ok).toBe(true)
    if (!next.ok) return
    ongoing = archiveTip(
      next.ongoing,
      next.newCheckpoint.workspace.projects,
      next.newCheckpoint.workspace.activeProjectId,
      "cp2",
    )
    next = createNextCheckpoint(ongoing, {
      name: "CP3",
      analysisName: created.name,
    })
    expect(next.ok).toBe(true)
    if (!next.ok) return
    ongoing = archiveTip(
      next.ongoing,
      next.newCheckpoint.workspace.projects,
      next.newCheckpoint.workspace.activeProjectId,
      "cp3",
    )
    const tipId = ongoing.activeCheckpointId
    const checkpointsBefore = structuredClone(ongoing.checkpoints)
    await repo.saveDraft({ ...created, ongoing })

    const completed = await repo.completeOngoingAnalysis(created.id)
    expect(completed.ongoing?.lifecycle).toBe("completed")
    expect(completed.status).toBe("archived")
    expect(completed.ongoing?.activeCheckpointId).toBe(tipId)
    expect(completed.ongoing?.checkpoints.map((c) => c.id)).toEqual(
      checkpointsBefore.map((c) => c.id),
    )
    expect(
      completed.ongoing?.checkpoints.map((c) => c.archivedSnapshot?.inputSignature),
    ).toEqual(["sig-cp1", "sig-cp2", "sig-cp3"])

    const nav = selectCheckpoint(completed.ongoing!, checkpointsBefore[0]!.id)
    expect(nav?.activeCheckpointId).toBe(checkpointsBefore[0]!.id)
    expect(nav?.checkpoints[0]!.archivedSnapshot?.inputSignature).toBe("sig-cp1")
    const back = selectCheckpoint(nav!, tipId)
    expect(back?.activeCheckpointId).toBe(tipId)
  })

  it("rejects createNextCheckpoint after completion", () => {
    const blank = createBlankWorkspaceRuntimeState()
    let ongoing = createInitialOngoingState({
      projects: blank.projects,
      activeProjectId: blank.activeProjectId,
    })
    ongoing = archiveTip(ongoing, blank.projects, blank.activeProjectId)
    ongoing = completeOngoingAnalysis(ongoing)
    expect(ongoing.lifecycle).toBe("completed")
    const created = createNextCheckpoint(ongoing, { name: "Should fail" })
    expect(created.ok).toBe(false)
    if (created.ok) return
    expect(created.reason).toBe("lifecycle_completed")
  })

  it("does not mutate checkpoint snapshots when completing", async () => {
    const repo = getAnalysisLibraryRepository()
    const blank = createBlankWorkspaceRuntimeState()
    const created = await repo.create({
      name: "Frozen snaps",
      analysisMode: "ongoing",
      workspace: {
        projects: blank.projects,
        activeProjectId: blank.activeProjectId,
      },
    })
    const ongoing = archiveTip(
      created.ongoing!,
      blank.projects,
      blank.activeProjectId,
      "freeze",
    )
    const snapBefore = structuredClone(ongoing.checkpoints[0]!.archivedSnapshot)
    await repo.saveDraft({ ...created, ongoing })
    const completed = await repo.completeOngoingAnalysis(created.id)
    expect(completed.ongoing?.checkpoints[0]!.archivedSnapshot).toEqual(snapBefore)
    expect(completed.archivedSnapshot?.inputSignature).toBe("sig-freeze")
  })

  it("surfaces persistence failure without marking document completed", async () => {
    const repo = getAnalysisLibraryRepository()
    const blank = createBlankWorkspaceRuntimeState()
    const created = await repo.create({
      name: "Persist fail",
      analysisMode: "ongoing",
      workspace: {
        projects: blank.projects,
        activeProjectId: blank.activeProjectId,
      },
    })
    const ongoing = archiveTip(
      created.ongoing!,
      blank.projects,
      blank.activeProjectId,
    )
    await repo.saveDraft({ ...created, ongoing })

    const nativeStringify = JSON.stringify.bind(JSON)
    const spy = vi.spyOn(JSON, "stringify").mockImplementation((value, ...rest) => {
      if (
        value &&
        typeof value === "object" &&
        (value as { status?: string }).status === "archived" &&
        (value as { ongoing?: { lifecycle?: string } }).ongoing?.lifecycle ===
          "completed"
      ) {
        throw new Error("serialize fail")
      }
      return nativeStringify(value, ...rest)
    })

    await expect(repo.completeOngoingAnalysis(created.id)).rejects.toThrow()
    spy.mockRestore()

    const reloaded = await repo.get(created.id)
    expect(reloaded?.status).toBe("draft")
    expect(reloaded?.ongoing?.lifecycle).toBe("active")
    expect(reloaded?.ongoing?.checkpoints[0]!.status).toBe("archived")
  })

  it("Single Analysis archive path remains distinct (no completeOngoing required)", async () => {
    const repo = getAnalysisLibraryRepository()
    const blank = createBlankWorkspaceRuntimeState()
    const created = await repo.create({
      name: "Single only",
      analysisMode: "single",
      workspace: {
        projects: blank.projects,
        activeProjectId: blank.activeProjectId,
      },
    })
    expect(
      getCompleteOngoingAnalysisBlockReason({
        status: "draft",
        analysisMode: "single",
        ongoing: null,
      }),
    ).toBe("not_ongoing")
    await expect(repo.completeOngoingAnalysis(created.id)).rejects.toThrow(
      /not_ongoing/,
    )
    const archived = await repo.archive({
      analysisId: created.id,
      snapshot: snapshotFor(blank.projects, blank.activeProjectId, "single"),
    })
    expect(archived.status).toBe("archived")
    expect(archived.ongoing).toBeUndefined()
  })

  it("UI strings and wiring for finish action exist", () => {
    expect(messages.no.checkpoints.finishOngoingAction).toBe(
      "Avslutt løpende analyse",
    )
    expect(messages.en.checkpoints.finishOngoingAction).toBe(
      "Finish ongoing analysis",
    )
    expect(messages.no.checkpoints.finishOngoingConfirmTitle).toBe(
      "Avslutt løpende analyse?",
    )
    expect(messages.en.checkpoints.finishOngoingConfirmAction).toBe(
      "Finish and archive",
    )

    const app = readFileSync(join(repoRoot, "src/App.tsx"), "utf8")
    expect(app).toContain("finishOngoingConfirmOpen")
    expect(app).toContain("completeOngoingAnalysis")
    expect(app).toContain("canCompleteOngoingAnalysis")
    expect(app).toContain("requestFinishOngoingAnalysis")

    const menu = readFileSync(
      join(repoRoot, "src/components/AnalysisActionsMenu.tsx"),
      "utf8",
    )
    expect(menu).toContain("finishOngoingLabel")
    expect(menu).toContain("onFinishOngoing")

    const results = readFileSync(
      join(repoRoot, "src/components/ResultsPanel.tsx"),
      "utf8",
    )
    expect(results).toContain("onRequestFinishOngoingAnalysis")
    expect(results).toContain('data-finish-ongoing-analysis=""')
  })
})
