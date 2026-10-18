import { describe, expect, it, beforeEach } from "vitest"
import { readFileSync } from "node:fs"
import { join } from "node:path"

import {
  clearLocalAnalysisLibraryStorageForTests,
  __seedRawAnalysisDocForTests,
} from "@/persistence/localAnalysisLibraryRepository"
import { getAnalysisLibraryRepository } from "@/persistence/analysisLibraryRepository"
import {
  ANALYSIS_DOCUMENT_SCHEMA_VERSION,
  DEFAULT_ANALYSIS_MODE,
  normalizeAnalysisMode,
  nowIso,
} from "@/domain/analysis/analysisDocument"
import { createBlankWorkspaceRuntimeState } from "@/domain/analysis/workspaceReset"
import {
  buildArchivedAnalysisSnapshot,
  canArchiveCurrentResults,
} from "@/domain/analysis/buildArchivedAnalysisSnapshot"
import { DEFAULT_RESULT_PREFERENCES } from "@/domain/results/resultPreferences"
import type { ProjectResult } from "@/domain/simulation/simulationTypes"
import { repoRoot } from "@/test-utils/repoRoot"
import { readAppSource } from "@/test-utils/appSource"
import { readLibrarySessionSource } from "@/test-utils/librarySessionSource"

describe("Analysis Library repository", () => {
  beforeEach(() => {
    clearLocalAnalysisLibraryStorageForTests()
  })

  it("creates, lists, and loads a draft", async () => {
    const repo = getAnalysisLibraryRepository()
    const blank = createBlankWorkspaceRuntimeState()
    const doc = await repo.create({
      name: "Test analyse",
      folderId: null,
      workspace: {
        projects: blank.projects,
        activeProjectId: blank.activeProjectId,
      },
    })
    expect(doc.status).toBe("draft")
    expect(doc.name).toBe("Test analyse")
    expect(doc.analysisMode).toBe("single")
    const summaries = await repo.listSummaries()
    expect(summaries).toHaveLength(1)
    expect(summaries[0]!.id).toBe(doc.id)
    const loaded = await repo.get(doc.id)
    expect(loaded?.workspace.projects).toHaveLength(1)
    expect(loaded?.analysisMode).toBe("single")
  })

  it("associates folders and sorts recent by lastOpenedAt", async () => {
    const repo = getAnalysisLibraryRepository()
    const folder = await repo.createFolder("Kommune")
    const blank = createBlankWorkspaceRuntimeState()
    const a = await repo.create({
      name: "A",
      folderId: folder.id,
      workspace: {
        projects: blank.projects,
        activeProjectId: blank.activeProjectId,
      },
    })
    await new Promise((r) => setTimeout(r, 5))
    const b = await repo.create({
      name: "B",
      folderId: null,
      workspace: {
        projects: blank.projects,
        activeProjectId: blank.activeProjectId,
      },
    })
    await repo.touchMetadata(a.id, {
      lastOpenedAt: new Date(Date.now() + 10_000).toISOString(),
    })
    const summaries = await repo.listSummaries()
    const recent = summaries
      .slice()
      .sort((x, y) => new Date(y.lastOpenedAt).getTime() - new Date(x.lastOpenedAt).getTime())
    expect(recent[0]!.id).toBe(a.id)
    expect(summaries.find((s) => s.id === a.id)?.folderId).toBe(folder.id)
    expect(b.folderId).toBeNull()
  })

  it("archives immutably and createDraftFromArchived clones", async () => {
    const repo = getAnalysisLibraryRepository()
    const folder = await repo.createFolder("Archive folder")
    const blank = createBlankWorkspaceRuntimeState()
    const doc = await repo.create({
      name: "Archive me",
      folderId: folder.id,
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
      simulatedBaseCostByProjectId: { [blank.projects[0]!.id]: 100 },
      inputSignature: signature,
      simulationCount: 20_000,
      resultPreferences: DEFAULT_RESULT_PREFERENCES,
    })
    const archived = await repo.archive({
      analysisId: doc.id,
      snapshot,
    })
    expect(archived.status).toBe("archived")
    expect(archived.folderId).toBe(folder.id)
    expect(archived.archivedSnapshot).toEqual(snapshot)
    await expect(repo.saveDraft({ ...archived, status: "draft", name: "hack" })).rejects.toThrow(
      /archived/i,
    )

    const draft = await repo.createDraftFromArchived({
      archivedId: archived.id,
      name: "Archive me (ny versjon)",
    })
    expect(draft.id).not.toBe(archived.id)
    expect(draft.status).toBe("draft")
    expect(draft.previousVersionId).toBe(archived.id)
    expect(draft.analysisMode).toBe("single")
    expect(draft.workspace.projects[0]!.id).not.toBe(archived.workspace.projects[0]!.id)
    const still = await repo.get(archived.id)
    expect(still?.status).toBe("archived")
    expect(still?.name).toBe("Archive me")
  })

  it("creates single and ongoing analysis modes and persists them", async () => {
    const repo = getAnalysisLibraryRepository()
    const blank = createBlankWorkspaceRuntimeState()
    const single = await repo.create({
      name: "Single",
      folderId: null,
      analysisMode: "single",
      workspace: {
        projects: blank.projects,
        activeProjectId: blank.activeProjectId,
      },
    })
    const ongoing = await repo.create({
      name: "Ongoing",
      folderId: null,
      analysisMode: "ongoing",
      workspace: {
        projects: blank.projects,
        activeProjectId: blank.activeProjectId,
      },
    })
    expect(single.analysisMode).toBe("single")
    expect(single.ongoing).toBeUndefined()
    expect(ongoing.analysisMode).toBe("ongoing")
    expect(ongoing.ongoing?.checkpoints).toHaveLength(1)
    expect(ongoing.ongoing?.checkpoints[0]!.sequence).toBe(1)
    expect(ongoing.ongoing?.checkpoints[0]!.status).toBe("draft")
    expect(ongoing.workspace.projects).toHaveLength(1)
    expect((await repo.get(single.id))?.analysisMode).toBe("single")
    expect((await repo.get(ongoing.id))?.analysisMode).toBe("ongoing")
    expect((await repo.get(ongoing.id))?.ongoing?.checkpoints).toHaveLength(1)

    await repo.saveDraft({
      ...ongoing,
      name: "Ongoing renamed",
    })
    const reloaded = await repo.get(ongoing.id)
    expect(reloaded?.analysisMode).toBe("ongoing")
    expect(reloaded?.name).toBe("Ongoing renamed")
    expect(reloaded?.ongoing?.checkpoints).toHaveLength(1)
  })

  it("ongoing create truncates to one project and reloads checkpoint workspace", async () => {
    const repo = getAnalysisLibraryRepository()
    const blank = createBlankWorkspaceRuntimeState()
    const p2 = { ...blank.projects[0]!, id: "extra-alt", name: "Extra" }
    const created = await repo.create({
      name: "Ongoing multi input",
      analysisMode: "ongoing",
      workspace: {
        projects: [blank.projects[0]!, p2],
        activeProjectId: blank.activeProjectId,
      },
    })
    expect(created.workspace.projects).toHaveLength(1)
    expect(created.ongoing?.checkpoints[0]!.workspace.projects).toHaveLength(1)

    const withPhase = {
      ...created,
      workspace: {
        projects: [
          {
            ...created.workspace.projects[0]!,
            profile: { phase: "execution" as const },
          },
        ],
        activeProjectId: created.workspace.activeProjectId,
      },
    }
    // Session/domain must sync before save — repository no longer does this.
    const { syncActiveCheckpointWorkspace } = await import("@/domain/analysis/analysisCheckpoint")
    const synced = {
      ...withPhase,
      ongoing: syncActiveCheckpointWorkspace(created.ongoing!, withPhase.workspace),
    }
    await repo.saveDraft(synced)
    const loaded = await repo.get(created.id)
    expect(loaded?.ongoing?.checkpoints[0]!.workspace.projects[0]!.profile?.phase).toBe("execution")
  })

  it("persists checkpoint switch and archived checkpoint workspace", async () => {
    const repo = getAnalysisLibraryRepository()
    const blank = createBlankWorkspaceRuntimeState()
    const created = await repo.create({
      name: "Switch CP",
      analysisMode: "ongoing",
      workspace: {
        projects: blank.projects,
        activeProjectId: blank.activeProjectId,
      },
    })
    const cp1 = created.ongoing!.checkpoints[0]!
    const fakeResults: ProjectResult[] = [
      {
        projectId: blank.projects[0]!.id,
        incurredCosts: 0,
        values: [1, 2, 3],
        inputSeries: [],
      },
    ]
    const snapshot = buildArchivedAnalysisSnapshot({
      projects: blank.projects,
      activeProjectId: blank.activeProjectId,
      projectResults: fakeResults,
      simulatedBaseCostByProjectId: { [blank.projects[0]!.id]: 100 },
      inputSignature: "sig",
      simulationCount: 1000,
      resultPreferences: DEFAULT_RESULT_PREFERENCES,
    })
    const cp2Id = "cp-two"
    const ongoing = {
      lifecycle: "active" as const,
      activeCheckpointId: cp2Id,
      checkpoints: [
        {
          ...cp1,
          status: "archived" as const,
          archivedAt: nowIso(),
          archivedSnapshot: snapshot,
          workspace: {
            projects: [
              {
                ...blank.projects[0]!,
                profile: { phase: "preliminary_design" as const },
              },
            ],
            activeProjectId: blank.activeProjectId,
          },
        },
        {
          id: cp2Id,
          sequence: 2,
          name: "After tender",
          status: "draft" as const,
          createdAt: nowIso(),
          archivedAt: null,
          workspace: {
            projects: [
              {
                ...blank.projects[0]!,
                profile: { phase: "execution" as const },
              },
            ],
            activeProjectId: blank.activeProjectId,
          },
        },
      ],
    }
    await repo.saveDraft({
      ...created,
      ongoing,
      workspace: ongoing.checkpoints[1]!.workspace,
    })
    const draftView = await repo.get(created.id)
    expect(draftView?.ongoing?.activeCheckpointId).toBe(cp2Id)
    expect(draftView?.workspace.projects[0]!.profile?.phase).toBe("execution")

    await repo.saveDraft({
      ...draftView!,
      ongoing: {
        ...ongoing,
        activeCheckpointId: cp1.id,
      },
      workspace: ongoing.checkpoints[0]!.workspace,
    })
    const archivedView = await repo.get(created.id)
    expect(archivedView?.ongoing?.activeCheckpointId).toBe(cp1.id)
    expect(archivedView?.workspace.projects[0]!.profile?.phase).toBe("preliminary_design")
    expect(archivedView?.ongoing?.checkpoints.find((c) => c.id === cp1.id)?.status).toBe("archived")
  })

  it("defaults legacy documents without analysisMode to single", async () => {
    expect(normalizeAnalysisMode(undefined)).toBe(DEFAULT_ANALYSIS_MODE)
    expect(normalizeAnalysisMode("ongoing")).toBe("ongoing")
    expect(normalizeAnalysisMode("bogus")).toBe("single")

    const blank = createBlankWorkspaceRuntimeState()
    const id = "legacy-no-mode"
    const ts = nowIso()
    __seedRawAnalysisDocForTests(id, {
      id,
      name: "Legacy",
      folderId: null,
      status: "draft",
      createdAt: ts,
      updatedAt: ts,
      lastOpenedAt: ts,
      schemaVersion: ANALYSIS_DOCUMENT_SCHEMA_VERSION,
      deletedAt: null,
      workspace: {
        projects: blank.projects,
        activeProjectId: blank.activeProjectId,
      },
    })

    const repo = getAnalysisLibraryRepository()
    const loaded = await repo.get(id)
    expect(loaded?.analysisMode).toBe("single")
    expect(loaded?.name).toBe("Legacy")
  })

  it("preserves analysisMode through archive and Create New Version", async () => {
    const repo = getAnalysisLibraryRepository()
    const blank = createBlankWorkspaceRuntimeState()
    const doc = await repo.create({
      name: "Ongoing archive",
      analysisMode: "ongoing",
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
    expect(archived.analysisMode).toBe("ongoing")
    const draft = await repo.createDraftFromArchived({
      archivedId: archived.id,
      name: "Ongoing archive (ny versjon)",
    })
    expect(draft.analysisMode).toBe("ongoing")
  })

  it("new-analysis dialog includes analysis mode choice", () => {
    const nav = readFileSync(
      join(repoRoot, "src/features/analysis-library/AnalysisLibraryNav.tsx"),
      "utf8",
    )
    expect(nav).toContain("analysisMode")
    expect(nav).toContain("data-analysis-mode-option")
    expect(nav).toContain("library.analysisModeSingle")
    expect(nav).toContain("library.analysisModeOngoing")
  })

  it("ongoing mode uses CheckpointNav timeline and hides multi-alternative controls", () => {
    const app = readAppSource()
    expect(app).toContain("CheckpointNav")
    expect(app).toContain("CreateNextCheckpointDialog")
    expect(app).toContain("archiveActiveCheckpoint")
    expect(app).toContain("requestArchiveCheckpoint")
    expect(app).toContain("onRequestArchiveAndCreateNext")
    expect(app).toContain('librarySession.analysisMode === "ongoing"')
    expect(app).toContain("isOngoingAnalysis")
    expect(app).toMatch(/handleAddProject[\s\S]*isOngoingAnalysis/)
    expect(app).toMatch(/handleCopyExistingAlternative[\s\S]*isOngoingAnalysis/)
    expect(app).toMatch(/handleDeleteProject[\s\S]*isOngoingAnalysis/)
    const nav = readFileSync(join(repoRoot, "src/features/checkpoints/CheckpointNav.tsx"), "utf8")
    expect(nav).toContain('data-checkpoint-nav="timeline"')
    expect(nav).not.toContain("border-b-[1.5px] border-[#1d868c]")
    expect(nav).not.toContain("rounded-t-lg")
    const session = readLibrarySessionSource()
    expect(session).toContain("checkpointReadOnly")
    expect(session).toContain("selectCheckpoint")
    expect(session).toContain("createNextCheckpoint")
    expect(session).toContain('activeCheckpoint?.status === "archived"')
  })

  it("deleteFolder refuses non-empty folders without mutating analyses", async () => {
    const repo = getAnalysisLibraryRepository()
    const folder = await repo.createFolder("Temp")
    const blank = createBlankWorkspaceRuntimeState()
    const doc = await repo.create({
      name: "In folder",
      folderId: folder.id,
      workspace: {
        projects: blank.projects,
        activeProjectId: blank.activeProjectId,
      },
    })
    await expect(repo.deleteFolder(folder.id)).rejects.toThrow(/not empty/i)
    const loaded = await repo.get(doc.id)
    expect(loaded?.folderId).toBe(folder.id)
    expect((await repo.listFolders()).find((f) => f.id === folder.id)).toBeTruthy()
  })
})
