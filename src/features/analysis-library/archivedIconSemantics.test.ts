import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { repoRoot as root } from "@/test-utils/repoRoot"
import { readAppSource } from "@/test-utils/appSource"
import { readMessagesSource } from "@/test-utils/messagesSource"

describe("archived state uses Archive icon (not Lock)", () => {
  it("Library / workspace archived indicators use lucide Archive", () => {
    const nav = readFileSync(
      join(root, "src/features/analysis-library/AnalysisLibraryNav.tsx"),
      "utf8",
    )
    const page = readFileSync(
      join(root, "src/features/analysis-library/AnalysisLibraryPage.tsx"),
      "utf8",
    )
    const menu = readFileSync(
      join(root, "src/features/analysis-library/AnalysisActionsMenu.tsx"),
      "utf8",
    )
    const app = readAppSource()

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
    const messages = readMessagesSource()
    expect(messages).toContain('readOnlyHint: "Arkivert"')
    expect(messages).toContain('readOnlyHint: "Archived"')
    expect(messages).toContain('statusArchived: "Arkivert"')
    expect(messages).toContain('statusArchived: "Archived"')
  })

  it("does not replace key-figure feature-lock wording (permissions stay Locked)", () => {
    const visibility = readFileSync(join(root, "src/domain/results/keyFigureVisibility.ts"), "utf8")
    expect(visibility).toContain("isKeyFigureRowLocked")
    const messages = readMessagesSource()
    expect(messages).toMatch(/locked:\s*"Locked"/)
    expect(messages).toMatch(/locked:\s*"Låst"/)
  })
})
