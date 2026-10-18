import { readFileSync } from "node:fs"
import { join } from "node:path"
import { renderToStaticMarkup } from "react-dom/server"
import { createElement, type ReactElement } from "react"
import { describe, expect, it } from "vitest"

import { UserFolderBlock } from "@/features/analysis-library/nav/UserFolderBlock"
import { I18nProvider } from "@/i18n/I18nProvider"
import type { AnalysisSummary } from "@/domain/analysis/analysisDocument"
import { repoRoot } from "@/test-utils/repoRoot"
import { readLibraryNavSource } from "@/test-utils/librarySource"
import { readLibraryPageSource } from "@/test-utils/librarySource"

const sampleItems: AnalysisSummary[] = [
  {
    id: "a1",
    name: "Very long analysis name that should truncate in the sidebar row",
    folderId: "kommune",
    status: "draft",
    analysisMode: "single",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    lastOpenedAt: "2026-01-01T00:00:00.000Z",
  },
]

function renderWithI18n(node: ReactElement) {
  return renderToStaticMarkup(createElement(I18nProvider, null, node))
}

describe("Sidebar entity row actions (shared Library + analysis sidebar)", () => {
  it("uses one shared SidebarEntityActionsMenu for folder and analysis rows", () => {
    const nav = readLibraryNavSource()
    expect(nav).toContain("function SidebarEntityActionsMenu")
    expect(nav).toContain("group/sidebar-entity-row")
    expect(nav).toContain(
      "group-hover/sidebar-entity-row:opacity-100 group-focus-within/sidebar-entity-row:opacity-100",
    )
    expect(nav).toContain("[@media(hover:none)]:opacity-100")
    expect(nav).toContain('data-sidebar-entity-row="folder"')
    expect(nav).toContain('data-sidebar-entity-row="analysis"')
    expect(nav).toContain("createPortal")
    expect(nav).toContain("data-sidebar-entity-menu")
    expect(nav).toContain("e.stopPropagation()")
    expect(nav).toContain("onMouseDown")
    // Old separate menus removed — one interaction model.
    expect(nav).not.toContain("function FolderActionsMenu")
    expect(nav).not.toContain("function SidebarAnalysisActionsMenu")
    expect(nav).not.toContain("group/analysis-row")
  })

  it("both Library page and AnalysisSidebar mount the same AnalysisLibraryNav", () => {
    const page = readLibraryPageSource()
    const sidebar = readFileSync(
      join(repoRoot, "src/features/analysis-library/AnalysisSidebar.tsx"),
      "utf8",
    )
    expect(page).toContain("<AnalysisLibraryNav")
    expect(sidebar).toContain("<AnalysisLibraryNav")
  })

  it("folder ⋯ is present with reserved quiet width whether collapsed or expanded", () => {
    const collapsed = renderWithI18n(
      createElement(UserFolderBlock, {
        folderKey: "kommune",
        label: "Kommune",
        expanded: false,
        onToggle: () => {},
        items: sampleItems,
        activeAnalysisId: null,
        onOpen: () => {},
        onSelectFolder: () => {},
        selected: false,
        archivedLabel: "Archived",
        onRename: () => {},
        onDelete: () => {},
      }),
    )
    expect(collapsed).toContain('data-folder-expanded="false"')
    expect(collapsed).toContain('data-sidebar-entity-row="folder"')
    expect(collapsed).toContain("data-sidebar-entity-actions")
    expect(collapsed).toContain("opacity-0")
    expect(collapsed).toContain("1.5rem")
    expect(collapsed).not.toContain("Analyse") // nested analyses hidden

    const expanded = renderWithI18n(
      createElement(UserFolderBlock, {
        folderKey: "kommune",
        label: "Kommune",
        expanded: true,
        onToggle: () => {},
        items: sampleItems,
        activeAnalysisId: null,
        onOpen: () => {},
        onSelectFolder: () => {},
        selected: false,
        archivedLabel: "Archived",
        onRename: () => {},
        onDelete: () => {},
        onRenameAnalysis: () => {},
        onMoveAnalysis: () => {},
        onTrashAnalysis: () => {},
      }),
    )
    expect(expanded).toContain('data-folder-expanded="true"')
    expect(expanded).toContain('data-sidebar-entity-row="folder"')
    expect(expanded).toContain('data-sidebar-entity-row="analysis"')
    expect(expanded).toContain("data-sidebar-entity-actions")
    expect(expanded).toContain("opacity-0")
    expect(expanded).toContain("1.5rem")
  })

  it("wires folder Rename/Delete and analysis Rename/Move/Delete through the shared menu", () => {
    const nav = readLibraryNavSource()
    expect(nav).toContain('t("library.renameFolder")')
    expect(nav).toContain('t("library.deleteFolder")')
    expect(nav).toContain('t("library.renameAnalysis")')
    expect(nav).toContain('t("library.moveAnalysis")')
    expect(nav).toContain('t("library.delete")')
    expect(nav).toContain("requestDeleteFolder")
    expect(nav).toContain("commitRenameAnalysis")
    expect(nav).toContain("commitMoveAnalysis")
    expect(nav).toContain("confirmTrashAnalysis")
    // Folder menu items call onSelect from the same SidebarEntityActionsMenu.
    expect(nav).toContain("folderActionItems")
    expect(nav).toContain("actionItems")
  })

  it("ungrouped folder has no dead ⋯ when rename/delete are omitted", () => {
    const html = renderWithI18n(
      createElement(UserFolderBlock, {
        folderKey: "__ungrouped__",
        label: "Ungrouped",
        expanded: false,
        onToggle: () => {},
        items: [],
        activeAnalysisId: null,
        onOpen: () => {},
        onSelectFolder: () => {},
        selected: false,
        archivedLabel: "Archived",
      }),
    )
    expect(html).toContain('data-sidebar-entity-row="folder"')
    expect(html).not.toContain("data-sidebar-entity-actions")
  })
})
