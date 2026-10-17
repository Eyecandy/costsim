import { readFileSync } from "node:fs"
import { join } from "node:path"
import { renderToStaticMarkup } from "react-dom/server"
import { createElement, type ReactElement } from "react"
import { describe, expect, it } from "vitest"

import { UserFolderBlock } from "@/components/AnalysisLibraryNav"
import { I18nProvider } from "@/i18n/I18nProvider"
import type { AnalysisSummary } from "@/lib/analysisDocument"
import { repoRoot } from "@/test-utils/repoRoot"


const sampleItems: AnalysisSummary[] = [
  {
    id: "a1",
    name: "Analyse A",
    folderId: "kommune",
    status: "draft",
    analysisMode: "single",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    lastOpenedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "a2",
    name: "Analyse B",
    folderId: "kommune",
    status: "draft",
    analysisMode: "ongoing",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    lastOpenedAt: "2026-01-01T00:00:00.000Z",
  },
]

function renderWithI18n(node: ReactElement) {
  return renderToStaticMarkup(createElement(I18nProvider, null, node))
}

describe("UserFolderBlock (Mapper user-created folders)", () => {
  it("hides nested analyses when collapsed (fresh Home state)", () => {
    const html = renderWithI18n(
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
      }),
    )
    expect(html).toContain('data-folder-expanded="false"')
    expect(html).toContain("Kommune")
    expect(html).not.toContain("Analyse A")
    expect(html).not.toContain("Analyse B")
    expect(html).not.toContain("data-folder-children")
  })

  it("shows nested analyses only when expanded", () => {
    const html = renderWithI18n(
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
      }),
    )
    expect(html).toContain('data-folder-expanded="true"')
    expect(html).toContain("data-folder-children")
    expect(html).toContain("Analyse A")
    expect(html).toContain("Analyse B")
  })

  it("owns disclosure via expandedUserFolderIds empty Set — independent of All analyses", () => {
    const nav = readFileSync(
      join(repoRoot, "src/components/AnalysisLibraryNav.tsx"),
      "utf8",
    )
    expect(nav).toContain("expandedUserFolderIds")
    expect(nav).toContain("() => new Set<string>()")
    expect(nav).toContain("data-library-user-folders")
    expect(nav).toContain("UserFolderBlock")
    expect(nav).toContain("library.allAnalyses")
    expect(nav).toContain("FolderPlus")
    expect(nav).toContain("setFolderPromptOpen(true)")
    expect(nav).not.toContain("CollapsibleListSection")
    expect(nav).not.toContain("recentOpen")
    // Standalone "+ New folder" text row removed from Folders header.
    const foldersSection = nav.slice(
      nav.indexOf("data-library-user-folders"),
      nav.indexOf('t("library.allAnalyses")'),
    )
    expect(foldersSection).toContain("FolderPlus")
    expect(foldersSection).toContain('aria-label={t("library.newFolder")}')
    expect(foldersSection).not.toContain("<Plus")
  })
})
