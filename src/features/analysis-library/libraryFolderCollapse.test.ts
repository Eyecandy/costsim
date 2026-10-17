import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import { repoRoot } from "@/test-utils/repoRoot"
import { readAppSource } from "@/test-utils/appSource"


describe("library user-folder collapse vs nav sections", () => {
  it("user folders use empty expandedUserFolderIds; Recent/Archived are not sidebar sections", () => {
    const nav = readFileSync(
      join(repoRoot, "src/features/analysis-library/AnalysisLibraryNav.tsx"),
      "utf8",
    )
    expect(nav).toContain("expandedUserFolderIds")
    expect(nav).toContain("() => new Set<string>()")
    expect(nav).toContain("UserFolderBlock")
    expect(nav).toContain("data-library-user-folders")
    expect(nav).toContain("library.allAnalyses")
    expect(nav).not.toContain("library.recent")
    expect(nav).not.toContain("library.archivedAnalyses")
    expect(nav).not.toContain("CollapsibleListSection")
    expect(nav).not.toContain("recentOpen")
  })

  it("AnalysisLibraryPage does not pass activeAnalysisId (Home stays collapsed)", () => {
    const page = readFileSync(
      join(repoRoot, "src/features/analysis-library/AnalysisLibraryPage.tsx"),
      "utf8",
    )
    expect(page).not.toContain("activeAnalysisId=")
  })

  it("Library shell reuses analysis sticky-footer pattern (flow, not fixed)", () => {
    const page = readFileSync(
      join(repoRoot, "src/features/analysis-library/AnalysisLibraryPage.tsx"),
      "utf8",
    )
    const app = readAppSource()
    expect(page).toContain('className="flex min-h-screen flex-col bg-background"')
    expect(page).toContain('role="contentinfo"')
    expect(page).toContain("© 2026 {PRODUCT_NAME}")
    expect(page).toContain(
      'className="mt-auto flex justify-center pt-10 pb-8 text-center"',
    )
    // Same markup as analysis workspace footer
    expect(app).toContain(
      'className="mt-auto flex justify-center pt-10 pb-8 text-center"',
    )
    expect(app).toContain("© 2026 {PRODUCT_NAME}")
    // No fixed overlay footer on Library
    const footerIdx = page.indexOf('role="contentinfo"')
    const footerBlock = page.slice(Math.max(0, footerIdx - 120), footerIdx + 200)
    expect(footerBlock).not.toContain("fixed")
    expect(footerBlock).not.toContain("bottom-0")
  })

  it("does not couple folder disclosure to auth", () => {
    const auth = readFileSync(
      join(repoRoot, "src/shared/auth/AuthProvider.tsx"),
      "utf8",
    )
    expect(auth).not.toContain("expandedUserFolder")
    expect(auth).not.toContain("libraryFolderDisclosure")
  })
})
