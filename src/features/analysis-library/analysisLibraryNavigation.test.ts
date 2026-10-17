import { beforeEach, describe, expect, it, vi } from "vitest"

import {
  buildAnalysisWorkspacePath,
  getLocationPathKey,
  readAnalysisIdFromLocation,
  shouldAutosaveLibraryDraft,
} from "@/persistence/analysisLibraryRoutes"
import { clearLocalAnalysisLibraryStorageForTests } from "@/persistence/localAnalysisLibraryRepository"
import { getAnalysisLibraryRepository } from "@/persistence/analysisLibraryRepository"
import { createBlankWorkspaceRuntimeState } from "@/domain/analysis/workspaceReset"
import {
  buildArchivedAnalysisSnapshot,
  canArchiveCurrentResults,
} from "@/domain/analysis/buildArchivedAnalysisSnapshot"
import { DEFAULT_RESULT_PREFERENCES } from "@/domain/results/resultPreferences"
import { navigateTo } from "@/shared/auth/auth"
import type { ProjectResult } from "@/domain/simulation/simulationTypes"

function stubWindowLocation(href = "http://localhost/") {
  const url = new URL(href)
  const listeners = new Set<() => void>()
  const locationState = {
    pathname: url.pathname,
    search: url.search,
    hash: url.hash,
    href: url.href,
  }
  class PopStateEventStub {
    type = "popstate"
  }
  vi.stubGlobal("PopStateEvent", PopStateEventStub)
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
      replaceState: (_s: unknown, _t: string, path: string) => {
        const next = new URL(path, "http://localhost")
        locationState.pathname = next.pathname
        locationState.search = next.search
        locationState.hash = next.hash
        locationState.href = next.href
      },
    },
    addEventListener: (type: string, fn: () => void) => {
      if (type === "popstate") listeners.add(fn)
    },
    removeEventListener: (type: string, fn: () => void) => {
      if (type === "popstate") listeners.delete(fn)
    },
    dispatchEvent: (event: { type: string }) => {
      if (event.type === "popstate") {
        for (const fn of listeners) fn()
      }
      return true
    },
  })
}

describe("analysis library route helpers", () => {
  it("buildAnalysisWorkspacePath embeds the analysis id", () => {
    expect(buildAnalysisWorkspacePath("abc-123")).toBe("/app?analysis=abc-123")
  })

  it("getLocationPathKey includes search so analysis switches are detectable", () => {
    expect(getLocationPathKey({ pathname: "/app", search: "?analysis=a" })).not.toBe(
      getLocationPathKey({ pathname: "/app", search: "?analysis=b" }),
    )
  })

  it("shouldAutosaveLibraryDraft blocks mismatched route/loaded ids", () => {
    expect(
      shouldAutosaveLibraryDraft({
        routeAnalysisId: "b",
        loadedAnalysisId: "a",
        docId: "a",
        docStatus: "draft",
        ready: true,
      }),
    ).toBe(false)
    expect(
      shouldAutosaveLibraryDraft({
        routeAnalysisId: "b",
        loadedAnalysisId: "b",
        docId: "b",
        docStatus: "draft",
        ready: false,
      }),
    ).toBe(false)
    expect(
      shouldAutosaveLibraryDraft({
        routeAnalysisId: "b",
        loadedAnalysisId: "b",
        docId: "b",
        docStatus: "archived",
        ready: true,
      }),
    ).toBe(false)
    expect(
      shouldAutosaveLibraryDraft({
        routeAnalysisId: "b",
        loadedAnalysisId: "b",
        docId: "b",
        docStatus: "draft",
        ready: true,
      }),
    ).toBe(true)
  })
})

describe("analysis library navigation / new analysis", () => {
  beforeEach(() => {
    clearLocalAnalysisLibraryStorageForTests()
    stubWindowLocation("http://localhost/")
  })

  it("navigateTo updates the authoritative analysis id in the URL", () => {
    const listener = vi.fn()
    window.addEventListener("popstate", listener)
    navigateTo(buildAnalysisWorkspacePath("new-doc-id"))
    expect(readAnalysisIdFromLocation()).toBe("new-doc-id")
    expect(listener).toHaveBeenCalled()
    window.removeEventListener("popstate", listener)
  })

  it("New analysis creates a blank draft independent of an open archived analysis", async () => {
    const repo = getAnalysisLibraryRepository()
    const blankA = createBlankWorkspaceRuntimeState()
    blankA.projects[0]!.name = "Archived alternative"
    blankA.projects[0]!.assumptions = [{ id: "asm1", text: "Do not leak" }]
    const a = await repo.create({
      name: "Archived A",
      workspace: {
        projects: blankA.projects,
        activeProjectId: blankA.activeProjectId,
      },
    })
    const fakeResults: ProjectResult[] = [
      {
        projectId: blankA.projects[0]!.id,
        incurredCosts: 0,
        values: [10, 20, 30],
        inputSeries: [],
      },
    ]
    const signature = JSON.stringify(blankA.projects)
    expect(
      canArchiveCurrentResults({
        projects: blankA.projects,
        projectResults: fakeResults,
        lastSimulatedInputSignature: signature,
      }),
    ).toBe(true)
    const archived = await repo.archive({
      analysisId: a.id,
      snapshot: buildArchivedAnalysisSnapshot({
        projects: blankA.projects,
        activeProjectId: blankA.activeProjectId,
        projectResults: fakeResults,
        simulatedBaseCostByProjectId: { [blankA.projects[0]!.id]: 100 },
        inputSignature: signature,
        simulationCount: 20_000,
        resultPreferences: DEFAULT_RESULT_PREFERENCES,
      }),
    })

    const blankB = createBlankWorkspaceRuntimeState()
    const b = await repo.create({
      name: "Fresh B",
      folderId: null,
      workspace: {
        projects: blankB.projects,
        activeProjectId: blankB.activeProjectId,
      },
    })

    expect(b.id).not.toBe(archived.id)
    expect(b.status).toBe("draft")
    expect(b.archivedSnapshot).toBeUndefined()
    expect(b.previousVersionId).toBeUndefined()
    expect(b.workspace.projects[0]!.id).not.toBe(archived.workspace.projects[0]!.id)
    expect(b.workspace.projects[0]!.assumptions ?? []).toEqual([])
    expect(b.workspace.projects[0]!.name).not.toBe("Archived alternative")
    expect(archived.workspace.projects[0]!.assumptions?.[0]?.text).toBe("Do not leak")

    const stillA = await repo.get(archived.id)
    expect(stillA?.status).toBe("archived")
    expect(stillA?.workspace.projects[0]!.name).toBe("Archived alternative")
    expect(
      stillA?.archivedSnapshot && "projectResults" in stillA.archivedSnapshot
        ? stillA.archivedSnapshot.projectResults[0]?.values
        : null,
    ).toEqual([10, 20, 30])

    navigateTo(buildAnalysisWorkspacePath(b.id))
    expect(readAnalysisIdFromLocation()).toBe(b.id)
  })

  it("Create new version clones archived input intentionally", async () => {
    const repo = getAnalysisLibraryRepository()
    const blank = createBlankWorkspaceRuntimeState()
    blank.projects[0]!.name = "Source alt"
    const a = await repo.create({
      name: "Archived A",
      workspace: {
        projects: blank.projects,
        activeProjectId: blank.activeProjectId,
      },
    })
    const fakeResults: ProjectResult[] = [
      {
        projectId: blank.projects[0]!.id,
        incurredCosts: 0,
        values: [1, 2, 3],
        inputSeries: [],
      },
    ]
    const signature = JSON.stringify(blank.projects)
    const archived = await repo.archive({
      analysisId: a.id,
      snapshot: buildArchivedAnalysisSnapshot({
        projects: blank.projects,
        activeProjectId: blank.activeProjectId,
        projectResults: fakeResults,
        simulatedBaseCostByProjectId: { [blank.projects[0]!.id]: 50 },
        inputSignature: signature,
        simulationCount: 20_000,
        resultPreferences: DEFAULT_RESULT_PREFERENCES,
      }),
    })
    const draft = await repo.createDraftFromArchived({
      archivedId: archived.id,
      name: "Archived A (ny versjon)",
    })
    expect(draft.status).toBe("draft")
    expect(draft.id).not.toBe(archived.id)
    expect(draft.previousVersionId).toBe(archived.id)
    expect(draft.workspace.projects[0]!.name).toBe("Source alt")
    expect(draft.workspace.projects[0]!.id).not.toBe(archived.workspace.projects[0]!.id)
    const still = await repo.get(archived.id)
    expect(still?.status).toBe("archived")
  })

  it("draft A is unchanged after creating independent draft B", async () => {
    const repo = getAnalysisLibraryRepository()
    const blankA = createBlankWorkspaceRuntimeState()
    blankA.projects[0]!.name = "Draft A alt"
    const a = await repo.create({
      name: "Draft A",
      workspace: {
        projects: blankA.projects,
        activeProjectId: blankA.activeProjectId,
      },
    })
    const blankB = createBlankWorkspaceRuntimeState()
    const b = await repo.create({
      name: "Draft B",
      workspace: {
        projects: blankB.projects,
        activeProjectId: blankB.activeProjectId,
      },
    })
    const stillA = await repo.get(a.id)
    expect(stillA?.name).toBe("Draft A")
    expect(stillA?.workspace.projects[0]!.name).toBe("Draft A alt")
    expect(b.id).not.toBe(a.id)
    navigateTo(buildAnalysisWorkspacePath(b.id))
    expect(readAnalysisIdFromLocation()).toBe(b.id)
  })
})
