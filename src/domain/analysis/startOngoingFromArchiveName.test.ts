import { beforeEach, describe, expect, it } from "vitest"

import { ANALYSIS_DOCUMENT_SCHEMA_VERSION } from "@/domain/analysis/analysisDocument"
import type { AnalysisDocument } from "@/domain/analysis/analysisDocument"
import { ARCHIVE_MODEL_VERSION } from "@/domain/analysis/archivedAnalysisSnapshot"
import type { ArchivedAnalysisSnapshotV1 } from "@/domain/analysis/archivedAnalysisSnapshot"
import {
  getAnalysisLibraryRepository,
  setAnalysisLibraryRepositoryForTests,
} from "@/persistence/analysisLibraryRepository"
import { ANALYSIS_NAME_CONFLICT_ERROR } from "@/domain/analysis/analysisNameUniqueness"
import { planCreateOngoingFromArchivedSingle } from "@/domain/analysis/createOngoingFromArchivedSingle"
import {
  clearLocalAnalysisLibraryStorageForTests,
  getLocalAnalysisLibraryRepository,
} from "@/persistence/localAnalysisLibraryRepository"
import { DEFAULT_RESULT_PREFERENCES } from "@/domain/results/resultPreferences"
import { resolveResultView } from "@/domain/results/resultPreferences"
import {
  applyAlternativeSelection,
  applyManualNameEdit,
  initStartOngoingNameState,
  proposeStartOngoingAnalysisName,
  validateStartOngoingSubmit,
} from "@/domain/analysis/startOngoingFromArchiveName"
import { createBlankWorkspaceRuntimeState } from "@/domain/analysis/workspaceReset"
import { repoRoot as root } from "@/test-utils/repoRoot"
import { readAppSource } from "@/test-utils/appSource"
import { readMessagesSource } from "@/test-utils/messagesSource"

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
    simulatedBaseCostByProjectId: Object.fromEntries(projects.map((p) => [p.id, 100])),
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
  folderId: string | null = null,
): AnalysisDocument {
  const snapshot = makeSnapshot(projects, activeProjectId)
  return {
    id: "src-archived-single",
    name: "Source Single",
    folderId,
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

async function createArchivedSingleInRepo(args: {
  projectName: string
  analysisName?: string
  folderId?: string | null
}) {
  const repo = getLocalAnalysisLibraryRepository()
  const blank = createBlankWorkspaceRuntimeState()
  const project = { ...blank.projects[0]!, name: args.projectName }
  const draft = await repo.create({
    name: args.analysisName ?? "Source Single",
    folderId: args.folderId ?? null,
    analysisMode: "single",
    workspace: { projects: [project], activeProjectId: project.id },
  })
  const archived = await repo.archive({
    analysisId: draft.id,
    snapshot: makeSnapshot([project], project.id),
  })
  return { repo, project, archived }
}

describe("startOngoingFromArchiveName", () => {
  beforeEach(() => {
    clearLocalAnalysisLibraryStorageForTests()
    setAnalysisLibraryRepositoryForTests(null)
  })

  it("1. one-alternative: default name prefilled; creation succeeds", async () => {
    const blank = createBlankWorkspaceRuntimeState()
    const project = { ...blank.projects[0]!, name: "Alternativ 1" }
    const alternatives = [{ id: project.id, name: project.name }]
    const state = initStartOngoingNameState(alternatives)
    expect(state.selectedProjectId).toBe(project.id)
    expect(state.name).toBe("Alternativ 1")
    expect(state.nameManuallyEdited).toBe(false)
    expect(proposeStartOngoingAnalysisName(project.name)).toBe("Alternativ 1")

    const planned = planCreateOngoingFromArchivedSingle(makeArchivedSingle([project], project.id))
    expect(planned.ok).toBe(true)
    if (planned.ok) expect(planned.plan.name).toBe("Alternativ 1")

    const {
      repo,
      project: p,
      archived,
    } = await createArchivedSingleInRepo({
      projectName: "Alternativ 1",
    })
    const created = await repo.createOngoingFromArchivedSingle({
      archivedId: archived.id,
      selectedProjectId: p.id,
      name: "Alternativ 1",
    })
    expect(created.name).toBe("Alternativ 1")
    expect(created.analysisMode).toBe("ongoing")
  })

  it("2. default name conflicts in same folder → duplicate_name; create does not run", async () => {
    const repo = getLocalAnalysisLibraryRepository()
    await repo.create({
      name: "Alternativ 1",
      folderId: null,
      analysisMode: "single",
      workspace: createBlankWorkspaceRuntimeState(),
    })

    const { project, archived } = await createArchivedSingleInRepo({
      projectName: "Alternativ 1",
    })

    const occupants = (await repo.listSummaries()).map((s) => ({
      id: s.id,
      name: s.name,
      folderId: s.folderId ?? null,
    }))
    expect(
      validateStartOngoingSubmit({
        name: "Alternativ 1",
        selectedProjectId: project.id,
        folderId: archived.folderId ?? null,
        analyses: occupants,
      }),
    ).toBe("duplicate_name")

    await expect(
      repo.createOngoingFromArchivedSingle({
        archivedId: archived.id,
        selectedProjectId: project.id,
        name: "Alternativ 1",
      }),
    ).rejects.toThrow(ANALYSIS_NAME_CONFLICT_ERROR)
  })

  it("3. user edits conflicting name to unique → validation clears; creation succeeds", async () => {
    const repo = getLocalAnalysisLibraryRepository()
    await repo.create({
      name: "Alternativ 1",
      folderId: null,
      analysisMode: "single",
      workspace: createBlankWorkspaceRuntimeState(),
    })

    const { project, archived } = await createArchivedSingleInRepo({
      projectName: "Alternativ 1",
    })

    const occupants = (await repo.listSummaries()).map((s) => ({
      id: s.id,
      name: s.name,
      folderId: s.folderId ?? null,
    }))
    expect(
      validateStartOngoingSubmit({
        name: "Alternativ 1",
        selectedProjectId: project.id,
        folderId: null,
        analyses: occupants,
      }),
    ).toBe("duplicate_name")
    expect(
      validateStartOngoingSubmit({
        name: "Alternativ 1 – løpende",
        selectedProjectId: project.id,
        folderId: null,
        analyses: occupants,
      }),
    ).toBe("ok")

    const created = await repo.createOngoingFromArchivedSingle({
      archivedId: archived.id,
      selectedProjectId: project.id,
      name: "Alternativ 1 – løpende",
    })
    expect(created.name).toBe("Alternativ 1 – løpende")
  })

  it("4. same name in different folder is not a conflict", async () => {
    const repo = getLocalAnalysisLibraryRepository()
    const folder = await repo.createFolder("Other folder")
    await repo.create({
      name: "Alternativ 1",
      folderId: folder.id,
      analysisMode: "single",
      workspace: createBlankWorkspaceRuntimeState(),
    })

    expect(
      validateStartOngoingSubmit({
        name: "Alternativ 1",
        selectedProjectId: "p1",
        folderId: null,
        analyses: (await repo.listSummaries()).map((s) => ({
          id: s.id,
          name: s.name,
          folderId: s.folderId ?? null,
        })),
      }),
    ).toBe("ok")

    const { project, archived } = await createArchivedSingleInRepo({
      projectName: "Alternativ 1",
      folderId: null,
    })
    const created = await repo.createOngoingFromArchivedSingle({
      archivedId: archived.id,
      selectedProjectId: project.id,
      name: "Alternativ 1",
    })
    expect(created.name).toBe("Alternativ 1")
  })

  it("5. trashed analysis with same name is not a conflict", async () => {
    const repo = getLocalAnalysisLibraryRepository()
    const occupant = await repo.create({
      name: "Alternativ 1",
      folderId: null,
      analysisMode: "single",
      workspace: createBlankWorkspaceRuntimeState(),
    })
    await repo.moveToTrash(occupant.id)

    const occupants = (await repo.listSummaries()).map((s) => ({
      id: s.id,
      name: s.name,
      folderId: s.folderId ?? null,
    }))
    expect(occupants.some((o) => o.name === "Alternativ 1")).toBe(false)

    const { project, archived } = await createArchivedSingleInRepo({
      projectName: "Alternativ 1",
    })
    expect(
      validateStartOngoingSubmit({
        name: "Alternativ 1",
        selectedProjectId: project.id,
        folderId: null,
        analyses: occupants,
      }),
    ).toBe("ok")

    const created = await repo.createOngoingFromArchivedSingle({
      archivedId: archived.id,
      selectedProjectId: project.id,
      name: "Alternativ 1",
    })
    expect(created.name).toBe("Alternativ 1")
  })

  it("6. source archived Single remains unchanged after successful creation", async () => {
    const { repo, project, archived } = await createArchivedSingleInRepo({
      projectName: "Unique Ongoing Name",
    })
    const before = JSON.stringify(await repo.get(archived.id))

    await repo.createOngoingFromArchivedSingle({
      archivedId: archived.id,
      selectedProjectId: project.id,
      name: "Unique Ongoing Name",
    })

    expect(JSON.stringify(await repo.get(archived.id))).toBe(before)
  })

  it("7. multi-alternative flow still requires/selects one alternative", () => {
    const blank = createBlankWorkspaceRuntimeState()
    const a = { ...blank.projects[0]!, id: "a", name: "Alt A" }
    const b = {
      ...structuredClone(blank.projects[0]!),
      id: "b",
      name: "Alt B",
    }
    const need = planCreateOngoingFromArchivedSingle(makeArchivedSingle([a, b], a.id))
    expect(need.ok).toBe(false)
    if (!need.ok) expect(need.reason).toBe("need_selection")

    expect(
      validateStartOngoingSubmit({
        name: "Alt A",
        selectedProjectId: null,
        folderId: null,
        analyses: [],
      }),
    ).toBe("no_selection")

    const planned = planCreateOngoingFromArchivedSingle(makeArchivedSingle([a, b], a.id), {
      selectedProjectId: "b",
      name: "My Ongoing",
    })
    expect(planned.ok).toBe(true)
    if (planned.ok) {
      expect(planned.plan.sourceProjectId).toBe("b")
      expect(planned.plan.name).toBe("My Ongoing")
    }
  })

  it("8. manually edited analysis name is not overwritten by later UI state changes", () => {
    const alternatives = [
      { id: "a", name: "Alt A" },
      { id: "b", name: "Alt B" },
    ]
    let state = initStartOngoingNameState(alternatives)
    expect(state.name).toBe("Alt A")

    state = applyManualNameEdit(state, "My custom name")
    expect(state.nameManuallyEdited).toBe(true)

    state = applyAlternativeSelection(state, "b", alternatives)
    expect(state.selectedProjectId).toBe("b")
    expect(state.name).toBe("My custom name")

    state = initStartOngoingNameState(alternatives)
    state = applyAlternativeSelection(state, "b", alternatives)
    expect(state.name).toBe("Alt B")
  })
})

describe("start ongoing name UX wiring", () => {
  it("dialog exposes analysis name field and create CTA", async () => {
    const { readFileSync } = await import("node:fs")
    const { join } = await import("node:path")
    const dialog = readFileSync(
      join(root, "src/features/analysis-library/StartOngoingFromArchiveDialog.tsx"),
      "utf8",
    )
    const app = readAppSource()
    const messages = readMessagesSource()
    const session = readFileSync(
      join(root, "src/features/analysis-library/useLibraryAnalysisSession.ts"),
      "utf8",
    )

    expect(dialog).toContain("startOngoingNameLabel")
    expect(dialog).toContain("startOngoingCreate")
    expect(dialog).toContain("duplicateNameInFolder")
    expect(dialog).toContain("validateStartOngoingSubmit")
    expect(dialog).toContain("applyManualNameEdit")
    expect(app).toContain("folderId={librarySession.docMeta?.folderId")
    expect(app).toContain("beginStartOngoingFromArchived")
    expect(session).toContain("need_selection")
    expect(messages).toContain("Navn på analyse")
    expect(messages).toContain("Analysis name")
    expect(messages).toContain("Opprett løpende analyse")
    expect(messages).toContain("Create ongoing analysis")
    expect(getAnalysisLibraryRepository).toBeTypeOf("function")
  })
})
