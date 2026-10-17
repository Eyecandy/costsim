import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { repoRoot as root } from "@/test-utils/repoRoot"


describe("archived state uses Archive icon (not Lock)", () => {
  it("Library / workspace archived indicators use lucide Archive", () => {
    const nav = readFileSync(
      join(root, "src/components/AnalysisLibraryNav.tsx"),
      "utf8",
    )
    const page = readFileSync(
      join(root, "src/AnalysisLibraryPage.tsx"),
      "utf8",
    )
    const menu = readFileSync(
      join(root, "src/components/AnalysisActionsMenu.tsx"),
      "utf8",
    )
    const app = readFileSync(join(root, "src/App.tsx"), "utf8")

    for (const src of [nav, page, menu, app]) {
      expect(src).toContain("Archive")
      expect(src).toContain("data-archived-icon")
    }

    // Former lock markers for archived state are gone from these surfaces.
    expect(nav).not.toMatch(/\bLock\b/)
    expect(page).not.toMatch(/\bLock\b/)
    expect(menu).not.toMatch(/\bLock\b/)
    expect(app).not.toContain("🔒")
    expect(app).toContain('t("library.readOnlyHint")')
  })

  it("keeps Archive / Arkivert accessible labels for archived header", () => {
    const messages = readFileSync(join(root, "src/i18n/messages.ts"), "utf8")
    expect(messages).toContain('readOnlyHint: "Arkivert"')
    expect(messages).toContain('readOnlyHint: "Archived"')
    expect(messages).toContain('statusArchived: "Arkivert"')
    expect(messages).toContain('statusArchived: "Archived"')
  })

  it("does not replace key-figure feature-lock wording (permissions stay Locked)", () => {
    const visibility = readFileSync(
      join(root, "src/lib/keyFigureVisibility.ts"),
      "utf8",
    )
    expect(visibility).toContain("isKeyFigureRowLocked")
    const messages = readFileSync(join(root, "src/i18n/messages.ts"), "utf8")
    expect(messages).toMatch(/locked:\s*"Locked"/)
    expect(messages).toMatch(/locked:\s*"Låst"/)
  })
})
