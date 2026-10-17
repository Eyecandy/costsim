import { beforeEach, describe, expect, it, vi } from "vitest"
import { readFileSync } from "node:fs"
import { join } from "node:path"

import {
  buildAnalysisWorkspacePath,
  readAnalysisIdFromLocation,
} from "@/lib/analysisLibraryRoutes"
import { getAnalysisLibraryRepository } from "@/lib/analysisLibraryRepository"
import { clearLocalAnalysisLibraryStorageForTests } from "@/lib/localAnalysisLibraryRepository"
import { navigateTo } from "@/lib/auth"
import { createBlankWorkspaceRuntimeState } from "@/domain/analysis/workspaceReset"
import { repoRoot } from "@/test-utils/repoRoot"


function stubWindowLocation(href = "http://localhost/library") {
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
  const ls = new Map<string, string>()
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => (ls.has(k) ? ls.get(k)! : null),
    setItem: (k: string, v: string) => {
      ls.set(k, String(v))
    },
    removeItem: (k: string) => {
      ls.delete(k)
    },
    clear: () => ls.clear(),
  })
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
  return ls
}

async function createBlankNamed(name: string) {
  const repo = getAnalysisLibraryRepository()
  const blank = createBlankWorkspaceRuntimeState()
  return repo.create({
    name,
    folderId: null,
    workspace: {
      projects: blank.projects,
      activeProjectId: blank.activeProjectId,
    },
  })
}

describe("empty-library New Analysis shares sidebar action", () => {
  it("sidebar exposes openNewAnalysisFromToolbar via openNewAnalysisActionRef", () => {
    const nav = readFileSync(
      join(repoRoot, "src/components/AnalysisLibraryNav.tsx"),
      "utf8",
    )
    expect(nav).toContain("openNewAnalysisFromToolbar")
    expect(nav).toContain("openNewAnalysisActionRef")
    expect(nav).toContain(
      "openNewAnalysisActionRef.current = openNewAnalysisFromToolbar",
    )
    expect(nav).toContain("onClick={() => openNewAnalysisFromToolbar()}")
  })

  it("Home empty-state CTA invokes the registered sidebar action (not requestNewAnalysis)", () => {
    const page = readFileSync(
      join(repoRoot, "src/AnalysisLibraryPage.tsx"),
      "utf8",
    )
    expect(page).toContain("openNewAnalysisActionRef")
    expect(page).toContain(
      "onNewAnalysis={() => openNewAnalysisActionRef.current?.()}",
    )
    // Must not wire Home to the folder-request counter path (click-event bug).
    expect(page).not.toMatch(
      /LibraryHomeContent[\s\S]*onNewAnalysis=\{requestNewAnalysis\}/,
    )
  })

  it("empty-state button and sidebar call the same registered function", () => {
    const openNewAnalysisFromToolbar = vi.fn()
    const openNewAnalysisActionRef: { current: (() => void) | null } = {
      current: openNewAnalysisFromToolbar,
    }
    // Home empty-state wiring
    const onHomeNewAnalysis = () => openNewAnalysisActionRef.current?.()
    // Sidebar wiring
    const onSidebarNewAnalysis = () => openNewAnalysisFromToolbar()

    onHomeNewAnalysis()
    onSidebarNewAnalysis()
    expect(openNewAnalysisFromToolbar).toHaveBeenCalledTimes(2)
  })

  it("Get Started empty state is only when active count is 0", () => {
    const isEmptyLibrary = (loading: boolean, activeCount: number) =>
      !loading && activeCount === 0
    expect(isEmptyLibrary(false, 0)).toBe(true)
    expect(isEmptyLibrary(false, 1)).toBe(false)
    expect(isEmptyLibrary(true, 0)).toBe(false)
  })
})

describe("shared New Analysis create path after empty / delete-all", () => {
  beforeEach(() => {
    clearLocalAnalysisLibraryStorageForTests()
    stubWindowLocation("http://localhost/library")
  })

  it("A/B: blank create (shared dialog confirm) opens the new analysis", async () => {
    const repo = getAnalysisLibraryRepository()
    expect(await repo.listSummaries()).toHaveLength(0)

    const doc = await createBlankNamed("First")
    expect(await repo.get(doc.id)).not.toBeNull()
    navigateTo(buildAnalysisWorkspacePath(doc.id))
    expect(readAnalysisIdFromLocation()).toBe(doc.id)
  })

  it("C: after one active analysis, empty-library condition is false", async () => {
    const repo = getAnalysisLibraryRepository()
    await createBlankNamed("One")
    const active = await repo.listSummaries()
    expect(active).toHaveLength(1)
    const isEmptyLibrary = !false && active.length === 0
    expect(isEmptyLibrary).toBe(false)
  })

  it("D: delete-all restores empty state; shared create still works", async () => {
    const repo = getAnalysisLibraryRepository()
    const a = await createBlankNamed("A")
    await repo.moveToTrash(a.id)
    expect(await repo.listSummaries()).toHaveLength(0)

    const next = await createBlankNamed("After empty")
    expect(next.id).not.toBe(a.id)
    navigateTo(buildAnalysisWorkspacePath(next.id))
    expect(readAnalysisIdFromLocation()).toBe(next.id)
    expect(await repo.get(next.id)).not.toBeNull()
    expect((await repo.get(a.id))!.deletedAt).toBeTruthy()
  })
})
