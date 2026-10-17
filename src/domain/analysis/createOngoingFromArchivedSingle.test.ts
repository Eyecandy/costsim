import { beforeEach, describe, expect, it, vi } from "vitest"

import {
  createNextCheckpoint,
  getLatestCheckpoint,
  type AnalysisCheckpoint,
} from "@/domain/analysis/analysisCheckpoint"
import type { AnalysisDocument } from "@/domain/analysis/analysisDocument"
import { ANALYSIS_DOCUMENT_SCHEMA_VERSION } from "@/domain/analysis/analysisDocument"
import type { ArchivedAnalysisSnapshotV1 } from "@/domain/analysis/archivedAnalysisSnapshot"
import { ARCHIVE_MODEL_VERSION } from "@/domain/analysis/archivedAnalysisSnapshot"
import {
  canStartOngoingFromArchivedSingle,
  createOngoingFromArchivedSingle,
  filterArchivedSnapshotToProject,
  planCreateOngoingFromArchivedSingle,
} from "@/domain/analysis/createOngoingFromArchivedSingle"
import {
  clearLocalAnalysisLibraryStorageForTests,
  getLocalAnalysisLibraryRepository,
} from "@/lib/localAnalysisLibraryRepository"
import {
  getAnalysisLibraryRepository,
  setAnalysisLibraryRepositoryForTests,
} from "@/lib/analysisLibraryRepository"
import { DEFAULT_RESULT_PREFERENCES } from "@/domain/results/resultPreferences"
import { resolveResultView } from "@/domain/results/resultPreferences"
import { createBlankWorkspaceRuntimeState } from "@/domain/analysis/workspaceReset"
import { repoRoot as root } from "@/test-utils/repoRoot"

function heavyCheckpointSnapshot(
  snapshot: AnalysisCheckpoint["archivedSnapshot"],
): ArchivedAnalysisSnapshotV1 {
  if (!snapshot || !("projectResults" in snapshot)) {
    throw new Error("expected legacy heavy snapshot")
  }
  return snapshot
}

function makeSnapshot(
  projects: AnalysisDocument["workspace"]["projects"],
  activeProjectId: string,
): ArchivedAnalysisSnapshotV1 {
  return {
    v: 1,
    archivedAt: "2026-01-01T00:00:00.000Z",
    schemaVersion: 1,
    modelVersion: ARCHIVE_MODEL_VERSION,
    simulationCount: 1000,
    inputSignature: JSON.stringify(projects),
    projectsAtArchive: projects,
    activeProjectIdAtRun: activeProjectId,
    simulatedBaseCostByProjectId: Object.fromEntries(
      projects.map((p) => [p.id, 100]),
    ),
    projectResults: projects.map((p) => ({
      projectId: p.id,
      incurredCosts: 0,
      values: [100, 110, 120, 130, 140],
      inputSeries: [],
    })),
    resultPreferences: DEFAULT_RESULT_PREFERENCES,
    resultView: resolveResultView(DEFAULT_RESULT_PREFERENCES),
    tornadoByProjectId: {},
    shapleyByProjectId: {},
  }
}

function makeArchivedSingle(
  projects: AnalysisDocument["workspace"]["projects"],
  activeProjectId: string,
): AnalysisDocument {
  const snapshot = makeSnapshot(projects, activeProjectId)
  return {
    id: "src-archived-single",
    name: "Source Single",
    folderId: null,
    status: "archived",
    analysisMode: "single",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    lastOpenedAt: "2026-01-01T00:00:00.000Z",
    schemaVersion: ANALYSIS_DOCUMENT_SCHEMA_VERSION,
    deletedAt: null,
    workspace: { projects, activeProjectId },
    archivedSnapshot: snapshot,
  }
}

describe("createOngoingFromArchivedSingle", () => {
  beforeEach(() => {
    clearLocalAnalysisLibraryStorageForTests()
    setAnalysisLibraryRepositoryForTests(null)
  })

  it("gates the action to archived single analyses only", () => {
    expect(
      canStartOngoingFromArchivedSingle({
        status: "archived",
        analysisMode: "single",
        deletedAt: null,
      }),
    ).toBe(true)
    expect(
      canStartOngoingFromArchivedSingle({
        status: "draft",
        analysisMode: "single",
        deletedAt: null,
      }),
    ).toBe(false)
    expect(
      canStartOngoingFromArchivedSingle({
        status: "archived",
        analysisMode: "ongoing",
        deletedAt: null,
      }),
    ).toBe(false)
    expect(
      canStartOngoingFromArchivedSingle({
        status: "archived",
        analysisMode: "single",
        deletedAt: "2026-01-02T00:00:00.000Z",
      }),
    ).toBe(false)
  })

  it("one alternative: starts Ongoing directly with preserved IDs and archived CP1", () => {
    const blank = createBlankWorkspaceRuntimeState()
    const project = blank.projects[0]!
    const costId = project.costRows[0]?.id
    const source = makeArchivedSingle([project], project.id)
    const sourceJson = JSON.stringify(source)

    const result = planCreateOngoingFromArchivedSingle(source)
    expect(result.ok).toBe(true)
    if (!result.ok) return

    expect(result.plan.workspace.projects).toHaveLength(1)
    expect(result.plan.workspace.projects[0]!.id).toBe(project.id)
    expect(result.plan.workspace.projects[0]!.costRows[0]?.id).toBe(costId)
    expect(result.plan.sourceAnalysisId).toBe(source.id)
    expect(result.plan.sourceProjectId).toBe(project.id)

    const cp1 = result.plan.ongoing.checkpoints[0]!
    expect(cp1.sequence).toBe(1)
    expect(cp1.status).toBe("archived")
    expect(heavyCheckpointSnapshot(cp1.archivedSnapshot).projectResults[0]?.values).toEqual([
      100, 110, 120, 130, 140,
    ])
    expect(result.plan.checkpointSnapshot).not.toBeNull()

    // Source unchanged
    expect(JSON.stringify(source)).toBe(sourceJson)
  })

  it("multiple alternatives: requires selection and copies only the chosen one", () => {
    const blank = createBlankWorkspaceRuntimeState()
    const a = { ...blank.projects[0]!, id: "alt-a", name: "Alpha" }
    const b = { ...blank.projects[0]!, id: "alt-b", name: "Beta" }
    const source = makeArchivedSingle([a, b], a.id)

    const needSelect = planCreateOngoingFromArchivedSingle(source)
    expect(needSelect.ok).toBe(false)
    if (needSelect.ok) return
    expect(needSelect.reason).toBe("need_selection")
    expect(needSelect.projects?.map((p) => p.id)).toEqual(["alt-a", "alt-b"])

    const planned = planCreateOngoingFromArchivedSingle(source, {
      selectedProjectId: "alt-b",
    })
    expect(planned.ok).toBe(true)
    if (!planned.ok) return
    expect(planned.plan.workspace.projects).toHaveLength(1)
    expect(planned.plan.workspace.projects[0]!.id).toBe("alt-b")
    expect(planned.plan.workspace.projects[0]!.name).toBe("Beta")
    expect(heavyCheckpointSnapshot(planned.plan.ongoing.checkpoints[0]!.archivedSnapshot).projectResults).toHaveLength(
      1,
    )
    expect(
      heavyCheckpointSnapshot(planned.plan.ongoing.checkpoints[0]!.archivedSnapshot).projectResults[0]
        ?.projectId,
    ).toBe("alt-b")
  })

  it("reuses frozen results without invoking simulation builders", () => {
    const blank = createBlankWorkspaceRuntimeState()
    const project = blank.projects[0]!
    const source = makeArchivedSingle([project], project.id)
    const buildSpy = vi.fn()
    // Guardrail: domain helper must not call buildArchivedAnalysisSnapshot / MC.
    const result = createOngoingFromArchivedSingle(source)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(buildSpy).not.toHaveBeenCalled()
    expect(
      heavyCheckpointSnapshot(result.plan.ongoing.checkpoints[0]!.archivedSnapshot).projectResults[0]
        ?.values.length,
    ).toBe(5)
  })

  it("filterArchivedSnapshotToProject drops other alternatives", () => {
    const blank = createBlankWorkspaceRuntimeState()
    const a = { ...blank.projects[0]!, id: "a", name: "A" }
    const b = { ...blank.projects[0]!, id: "b", name: "B" }
    const snap = makeSnapshot([a, b], "a")
    const filtered = filterArchivedSnapshotToProject(snap, "b")
    expect(filtered).not.toBeNull()
    expect(filtered!.projectsAtArchive).toHaveLength(1)
    expect(filtered!.projectsAtArchive[0]!.id).toBe("b")
    expect(filtered!.projectResults.every((r) => r.projectId === "b")).toBe(
      true,
    )
  })

  it("repo persists new ongoing and leaves source immutable; CP2 compares to imported CP1", async () => {
    const repo = getLocalAnalysisLibraryRepository()
    setAnalysisLibraryRepositoryForTests(repo)
    const blank = createBlankWorkspaceRuntimeState()
    const project = blank.projects[0]!
    const costId = project.costRows[0]!.id

    const created = await repo.create({
      name: "To archive",
      analysisMode: "single",
      workspace: { projects: [project], activeProjectId: project.id },
    })
    const snapshot = makeSnapshot([project], project.id)
    const archived = await repo.archive({
      analysisId: created.id,
      snapshot,
    })
    expect(archived.status).toBe("archived")
    const before = JSON.stringify(await repo.get(archived.id))

    const ongoingDoc = await repo.createOngoingFromArchivedSingle({
      archivedId: archived.id,
      selectedProjectId: project.id,
    })

    expect(ongoingDoc.id).not.toBe(archived.id)
    expect(ongoingDoc.analysisMode).toBe("ongoing")
    expect(ongoingDoc.status).toBe("draft")
    expect(ongoingDoc.sourceAnalysisId).toBe(archived.id)
    expect(ongoingDoc.sourceProjectId).toBe(project.id)
    expect(ongoingDoc.workspace.projects).toHaveLength(1)
    expect(ongoingDoc.workspace.projects[0]!.costRows[0]!.id).toBe(costId)

    const cp1 = ongoingDoc.ongoing!.checkpoints[0]!
    expect(cp1.status).toBe("archived")
    expect(heavyCheckpointSnapshot(cp1.archivedSnapshot).projectResults[0]?.values).toEqual(
      snapshot.projectResults[0]?.values,
    )

    const afterSource = JSON.stringify(await repo.get(archived.id))
    expect(afterSource).toBe(before)

    // Both remain listed
    const summaries = await repo.listSummaries()
    const ids = summaries.map((s) => s.id)
    expect(ids).toContain(archived.id)
    expect(ids).toContain(ongoingDoc.id)

    const next = createNextCheckpoint(ongoingDoc.ongoing!)
    expect(next.ok).toBe(true)
    if (!next.ok) return
    expect(next.newCheckpoint.sequence).toBe(2)
    expect(next.newCheckpoint.status).toBe("draft")
    expect(next.sourceCheckpoint.id).toBe(cp1.id)
    expect(getLatestCheckpoint(next.ongoing)?.sequence).toBe(2)
    // Preserved row IDs on CP2 for later structural diffs
    expect(next.newCheckpoint.workspace.projects[0]!.costRows[0]!.id).toBe(
      costId,
    )
  })

  it("one-alternative click flow: create + navigate target + source unchanged", async () => {
    const repo = getLocalAnalysisLibraryRepository()
    setAnalysisLibraryRepositoryForTests(repo)
    const blank = createBlankWorkspaceRuntimeState()
    const project = blank.projects[0]!
    const created = await repo.create({
      name: "Single archive",
      analysisMode: "single",
      workspace: { projects: [project], activeProjectId: project.id },
    })
    const archived = await repo.archive({
      analysisId: created.id,
      snapshot: makeSnapshot([project], project.id),
    })
    const sourceBefore = JSON.stringify(await repo.get(archived.id))

    // Same as App one-alt path: plan without selection, then create.
    const planned = planCreateOngoingFromArchivedSingle(archived)
    expect(planned.ok).toBe(true)
    if (!planned.ok) return

    const ongoingDoc = await repo.createOngoingFromArchivedSingle({
      archivedId: archived.id,
      selectedProjectId: planned.plan.sourceProjectId,
    })

    expect(ongoingDoc.id).not.toBe(archived.id)
    expect(ongoingDoc.analysisMode).toBe("ongoing")
    expect(JSON.stringify(await repo.get(archived.id))).toBe(sourceBefore)

    const { buildAnalysisWorkspacePath, readAnalysisIdFromLocation } =
      await import("@/lib/analysisLibraryRoutes")
    const { navigateTo } = await import("@/lib/auth")

    // Minimal location stub for navigateTo
    const locationState = {
      pathname: "/app",
      search: `?analysis=${archived.id}`,
      hash: "",
      href: `http://localhost/app?analysis=${archived.id}`,
    }
    vi.stubGlobal("PopStateEvent", class {
      type = "popstate"
    })
    vi.stubGlobal("window", {
      location: locationState,
      history: {
        pushState: (_s: unknown, _t: string, path: string) => {
          const next = new URL(path, "http://localhost")
          locationState.pathname = next.pathname
          locationState.search = next.search
          locationState.hash = next.hash
          locationState.href = next.href
        },
      },
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => true,
    })

    navigateTo(buildAnalysisWorkspacePath(ongoingDoc.id))
    expect(readAnalysisIdFromLocation()).toBe(ongoingDoc.id)
    expect(readAnalysisIdFromLocation()).not.toBe(archived.id)
  })

  it("multi-alternative: selection required; cancel creates nothing; confirm copies one", async () => {
    const repo = getLocalAnalysisLibraryRepository()
    setAnalysisLibraryRepositoryForTests(repo)
    const blank = createBlankWorkspaceRuntimeState()
    const a = { ...blank.projects[0]!, id: "alt-a", name: "Alpha" }
    const b = {
      ...structuredClone(blank.projects[0]!),
      id: "alt-b",
      name: "Beta",
    }
    const created = await repo.create({
      name: "Multi archive",
      analysisMode: "single",
      workspace: { projects: [a, b], activeProjectId: a.id },
    })
    const archived = await repo.archive({
      analysisId: created.id,
      snapshot: makeSnapshot([a, b], a.id),
    })
    const sourceBefore = JSON.stringify(await repo.get(archived.id))
    const countBefore = (await repo.listSummaries()).length

    const needSelect = planCreateOngoingFromArchivedSingle(archived)
    expect(needSelect.ok).toBe(false)
    if (needSelect.ok) return
    expect(needSelect.reason).toBe("need_selection")
    expect(needSelect.projects?.map((p) => p.name)).toEqual(["Alpha", "Beta"])

    // Cancel: nothing created
    expect((await repo.listSummaries()).length).toBe(countBefore)
    expect(JSON.stringify(await repo.get(archived.id))).toBe(sourceBefore)

    const ongoingDoc = await repo.createOngoingFromArchivedSingle({
      archivedId: archived.id,
      selectedProjectId: "alt-b",
    })
    expect(ongoingDoc.workspace.projects).toHaveLength(1)
    expect(ongoingDoc.workspace.projects[0]!.id).toBe("alt-b")

    const sourceAfter = await repo.get(archived.id)
    expect(JSON.stringify(sourceAfter)).toBe(sourceBefore)
    expect(sourceAfter!.workspace.projects.map((p) => p.id)).toEqual([
      "alt-a",
      "alt-b",
    ])
  })

  it("editing the new Ongoing workspace does not mutate archived source", async () => {
    const repo = getLocalAnalysisLibraryRepository()
    setAnalysisLibraryRepositoryForTests(repo)
    const blank = createBlankWorkspaceRuntimeState()
    const project = blank.projects[0]!
    const created = await repo.create({
      name: "Immutable source",
      analysisMode: "single",
      workspace: { projects: [project], activeProjectId: project.id },
    })
    const archived = await repo.archive({
      analysisId: created.id,
      snapshot: makeSnapshot([project], project.id),
    })
    const sourceBefore = JSON.stringify(await repo.get(archived.id))

    const ongoingDoc = await repo.createOngoingFromArchivedSingle({
      archivedId: archived.id,
      selectedProjectId: project.id,
    })

    // Mutate the in-memory ongoing document graph
    ongoingDoc.workspace.projects[0]!.name = "Mutated name"
    ongoingDoc.workspace.projects[0]!.costRows[0]!.name = "Mutated cost"
    if (ongoingDoc.ongoing?.checkpoints[0]?.workspace.projects[0]) {
      ongoingDoc.ongoing.checkpoints[0].workspace.projects[0].name =
        "Mutated cp"
    }

    expect(JSON.stringify(await repo.get(archived.id))).toBe(sourceBefore)
  })
})

describe("start ongoing UI wiring", () => {
  it("exposes archived-single action and selection dialog", async () => {
    const { readFileSync } = await import("node:fs")
    const { join } = await import("node:path")
    const menu = readFileSync(
      join(root, "src/components/AnalysisActionsMenu.tsx"),
      "utf8",
    )
    const app = readFileSync(join(root, "src/App.tsx"), "utf8")
    const dialog = readFileSync(
      join(root, "src/components/StartOngoingFromArchiveDialog.tsx"),
      "utf8",
    )
    const session = readFileSync(
      join(root, "src/lib/useLibraryAnalysisSession.ts"),
      "utf8",
    )
    const messages = readFileSync(join(root, "src/i18n/messages.ts"), "utf8")

    expect(menu).toContain("startOngoingLabel")
    expect(menu).toContain("onStartOngoing")
    expect(app).toContain("beginStartOngoingFromArchived")
    expect(app).toContain("canStartOngoingFromArchivedSingle")
    expect(app).toContain("StartOngoingFromArchiveDialog")
    expect(session).toContain("beginStartOngoingFromArchived")
    expect(session).toContain("createOngoingFromArchivedSingle")
    expect(dialog).toContain("startOngoingAnalysis")
    expect(dialog).toContain("startOngoingNameLabel")
    expect(dialog).toContain("startOngoingCreate")
    expect(dialog).toContain('role="radio"')
    expect(dialog).toContain("common.cancel")
    expect(messages).toContain("Start løpende analyse")
    expect(messages).toContain("Start ongoing analysis")
    expect(messages).toContain("Navn på analyse")
    expect(messages).toContain("Opprett løpende analyse")
    expect(getAnalysisLibraryRepository).toBeTypeOf("function")
  })
})
