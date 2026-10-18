import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { repoRoot as root } from "@/test-utils/repoRoot"
import { readGuidedInputSource } from "@/test-utils/guidedInputSource"

function guidedDialogSource() {
  return readGuidedInputSource()
}

function arrowNavSource() {
  return readFileSync(join(root, "src/domain/guided/shouldIgnoreGuidedArrowNavigation.ts"), "utf8")
}

/**
 * Extract the GuidedInlineValue function body for structural commit-mode checks.
 */
function guidedInlineValueSource(): string {
  const src = guidedDialogSource()
  const start = src.indexOf("function GuidedInlineValue(")
  const end = src.indexOf("\nfunction SideLabel(", start)
  expect(start).toBeGreaterThan(-1)
  expect(end).toBeGreaterThan(start)
  return src.slice(start, end)
}

describe("Focus uncertainty range Enter-only numeric commit", () => {
  it("A/B/C/D: GuidedInlineValue supports enter vs blur commit modes", () => {
    const inline = guidedInlineValueSource()
    expect(inline).toContain('commitMode = "blur"')
    expect(inline).toContain('commitMode?: "enter" | "blur"')
    expect(inline).toContain("data-guided-commit-mode={commitMode}")
    // Typing updates draft only.
    expect(inline).toContain("onChange={(e) => setDraft(e.target.value)}")
    // Enter commits once.
    expect(inline).toMatch(
      /e\.key === "Enter"[\s\S]*?skipBlurAction\.current = true[\s\S]*?save\(\)/,
    )
    // Escape discards without commit.
    expect(inline).toMatch(/e\.key === "Escape"[\s\S]*?cancel\(\)/)
    // Enter-mode blur discards; blur-mode still saves.
    expect(inline).toContain('if (commitMode === "enter")')
    expect(inline).toContain("discardDraft()")
    const blurBlock = inline.slice(inline.indexOf("onBlur={() => {"))
    expect(blurBlock).toMatch(
      /commitMode === "enter"[\s\S]*?discardDraft\(\)[\s\S]*?return[\s\S]*?save\(\)/,
    )
  })

  it("E/H: cost and driver O/M/P use commitMode enter (blur cancels draft)", () => {
    const src = guidedDialogSource()
    const costRange = src.slice(
      src.indexOf('data-guided-cost-range=""'),
      src.indexOf("function GuidedDriverPhase"),
    )
    expect(costRange).toContain('commitMode="enter"')
    expect((costRange.match(/commitMode="enter"/g) ?? []).length).toBe(3)

    const driverRange = src.slice(
      src.indexOf('data-guided-driver-range=""'),
      src.indexOf("data-guided-driver-range-warning"),
    )
    expect(driverRange).toContain('commitMode="enter"')
    expect((driverRange.match(/commitMode="enter"/g) ?? []).length).toBe(3)
  })

  it("F: GuidedRangeSlider still commits live on change", () => {
    const src = guidedDialogSource()
    const sliderStart = src.indexOf("function GuidedRangeSlider(")
    const sliderEnd = src.indexOf("function GuidedInlineValue(", sliderStart)
    let slider = src.slice(sliderStart, sliderEnd)
    const trailingDoc = slider.indexOf("\n/**")
    if (trailingDoc >= 0) slider = slider.slice(0, trailingDoc)
    expect(slider).toContain("onChange={(e) => {")
    expect(slider).toContain("onCommit(next)")
    expect(slider).not.toContain("commitMode")
  })

  it("G: numeric → slider: enter-mode blur discards before slider live commit", () => {
    const inline = guidedInlineValueSource()
    // Enter-mode blur discards; blur-mode still saves after that branch returns.
    expect(inline).toMatch(/if \(commitMode === "enter"\) \{\s*discardDraft\(\)\s*return\s*\}/)
    expect(inline).toMatch(
      /if \(commitMode === "enter"\) \{\s*discardDraft\(\)\s*return\s*\}\s*save\(\)/,
    )
  })

  it("I: incurred keeps blur-to-save commit mode", () => {
    const src = guidedDialogSource()
    const incurred = src.slice(
      src.indexOf("function GuidedIncurredPhase("),
      src.indexOf("function phaseTitle("),
    )
    expect(incurred).toContain("<GuidedInlineValue")
    expect(incurred).toContain('commitMode="blur"')
    expect(incurred).not.toContain('commitMode="enter"')
    expect(incurred).toContain("data-guided-incurred-display")
  })

  it("J: arrow navigation still ignores guided inline edit fields", () => {
    const nav = arrowNavSource()
    expect(nav).toContain("[data-guided-inline-edit]")
    expect(nav).toContain("target.dataset.guidedInlineEdit != null")
    const dialog = guidedDialogSource()
    expect(dialog).toContain("data-guided-inline-edit={field}")
  })
})
