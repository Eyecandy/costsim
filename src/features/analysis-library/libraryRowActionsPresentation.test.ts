import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import { repoRoot } from "@/test-utils/repoRoot"


describe("Library analysis row actions presentation", () => {
  it("main list uses one shared row surface with right-aligned ⋯ menu", () => {
    const page = readFileSync(
      join(repoRoot, "src/features/analysis-library/AnalysisLibraryPage.tsx"),
      "utf8",
    )
    expect(page).toContain("function LibraryListRow")
    expect(page).toContain("revealWithRow")
    expect(page).toContain("hover:bg-muted/50")
    expect(page).toContain("MoreHorizontal")
    expect(page).toContain('t("library.renameAnalysis")')
    expect(page).toContain('t("library.moveAnalysis")')
    expect(page).toContain('t("library.delete")')
    // No separate three-icon hover strip.
    expect(page).not.toContain("FolderInput")
    expect(page).not.toContain("Pencil")
    expect(page).not.toContain("LibraryRowIconAction")
    // Deleted analyses keep Restore / permanent delete — not Rename/Move.
    expect(page).toContain("function TrashListRow")
    const trashStart = page.indexOf("function TrashListRow")
    const trashBlock = page.slice(trashStart, trashStart + 2500)
    expect(trashBlock).toContain("restore")
    expect(trashBlock.toLowerCase()).toContain("permanent")
  })

  it("sidebar rows share SidebarEntityActionsMenu hover-reveal + portal menu", () => {
    const nav = readFileSync(
      join(repoRoot, "src/features/analysis-library/AnalysisLibraryNav.tsx"),
      "utf8",
    )
    expect(nav).toContain("function SidebarEntityActionsMenu")
    expect(nav).toContain("group/sidebar-entity-row")
    expect(nav).toContain("group-hover/sidebar-entity-row:opacity-100")
    expect(nav).toContain("group-focus-within/sidebar-entity-row:opacity-100")
    expect(nav).toContain("[@media(hover:none)]:opacity-100")
    expect(nav).toContain("data-sidebar-entity-menu")
    expect(nav).toContain("commitRenameAnalysis")
    expect(nav).toContain("MoveAnalysisDialog")
  })

  it("Folders header shares one surface with Folder-plus", () => {
    const nav = readFileSync(
      join(repoRoot, "src/features/analysis-library/AnalysisLibraryNav.tsx"),
      "utf8",
    )
    const foldersStart = nav.indexOf("data-library-user-folders")
    const foldersHeader = nav.slice(foldersStart, foldersStart + 2000)
    expect(foldersHeader).toContain("FolderPlus")
    expect(foldersHeader).toContain("group/folders-header")
    expect(foldersHeader).toContain("hover:bg-muted/50")
    expect(foldersHeader).toContain("opacity-0")
    expect(foldersHeader).toContain(
      "group-hover/folders-header:opacity-100 group-focus-within/folders-header:opacity-100",
    )
    expect(foldersHeader).toContain("[@media(hover:none)]:opacity-100")
    expect(foldersHeader).not.toContain("opacity-40")
    const plusBtnStart = foldersHeader.indexOf(
      'aria-label={t("library.newFolder")}',
    )
    const plusBtn = foldersHeader.slice(plusBtnStart, plusBtnStart + 700)
    expect(plusBtn).not.toContain("hover:bg-muted")
  })
})
