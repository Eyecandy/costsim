import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { join } from "node:path"

import {
  buildLibraryPath,
  readLibraryFilterFromLocation,
  runBeforeLeaveWithoutBlocking,
} from "@/persistence/libraryNavigation"
import { repoRoot } from "@/test-utils/repoRoot"
import { readAppSource } from "@/test-utils/appSource"
import { readLibrarySessionSource } from "@/test-utils/librarySessionSource"

describe("Library direct destinations (URL-authoritative)", () => {
  it("buildLibraryPath encodes Home / All / Deleted / folder canonically", () => {
    expect(buildLibraryPath({ kind: "home" })).toBe("/library")
    expect(buildLibraryPath({ kind: "all" })).toBe("/library?view=all")
    expect(buildLibraryPath({ kind: "trash" })).toBe("/library?view=trash")
    expect(buildLibraryPath({ kind: "folder", folderId: "campus-1" })).toBe(
      "/library?view=folder&folderId=campus-1",
    )
    expect(buildLibraryPath({ kind: "folder", folderId: null })).toBe("/library?view=folder")
  })

  it("readLibraryFilterFromLocation is the inverse of buildLibraryPath", () => {
    expect(readLibraryFilterFromLocation("")).toEqual({ kind: "home" })
    expect(readLibraryFilterFromLocation("?view=all")).toEqual({ kind: "all" })
    expect(readLibraryFilterFromLocation("?view=trash")).toEqual({
      kind: "trash",
    })
    expect(readLibraryFilterFromLocation("?view=folder&folderId=campus-1")).toEqual({
      kind: "folder",
      folderId: "campus-1",
    })
    expect(readLibraryFilterFromLocation("?view=folder")).toEqual({
      kind: "folder",
      folderId: null,
    })
  })

  it("workspace navigation goes directly to buildLibraryPath (not bare /library stash)", () => {
    const nav = readFileSync(
      join(repoRoot, "src/features/analysis-library/AnalysisLibraryNav.tsx"),
      "utf8",
    )
    const page = readFileSync(
      join(repoRoot, "src/features/analysis-library/AnalysisLibraryPage.tsx"),
      "utf8",
    )
    expect(nav).toContain("goToLibraryDestination")
    expect(nav).toContain("navigateTo(buildLibraryPath(next))")
    expect(nav).not.toContain("stashLibraryInitialFilter")
    expect(nav).toContain('goToLibraryDestination({ kind: "all" })')
    expect(nav).toContain('goToLibraryDestination({ kind: "trash" })')
    expect(nav).toContain('goToLibraryDestination({ kind: "folder", folderId })')
    // Library page reads destination from URL, not sessionStorage initializer
    expect(page).toContain("readLibraryFilterFromLocation")
    expect(page).toContain("buildLibraryPath")
    expect(page).toContain("useSyncExternalStore")
    expect(page).not.toContain("takeLibraryInitialFilter")
  })

  it("draft leave still flushes autosave before direct destination navigation", () => {
    const nav = readFileSync(
      join(repoRoot, "src/features/analysis-library/AnalysisLibraryNav.tsx"),
      "utf8",
    )
    const app = readAppSource()
    expect(nav).toContain("beforeLeaveWorkspace")
    expect(app).toContain("flushPendingSave()")
    expect(app).toContain("if (librarySession.readOnly) return")
    expect(app).toContain('librarySession.docMeta?.status !== "draft"')
  })

  it("save failure cannot block Library navigation", async () => {
    await expect(
      runBeforeLeaveWithoutBlocking(async () => {
        throw new Error("quota")
      }),
    ).resolves.toBeUndefined()

    const nav = readFileSync(
      join(repoRoot, "src/features/analysis-library/AnalysisLibraryNav.tsx"),
      "utf8",
    )
    expect(nav).toContain("await runBeforeLeaveWithoutBlocking(beforeLeaveWorkspace)")
  })

  it("autosave race guard remains ID-bound", () => {
    const session = readLibrarySessionSource()
    expect(session).toContain("if (loadedIdRef.current !== saveDocId) return")
    expect(session).toContain("shouldAutosaveLibraryDraft")
  })
})
