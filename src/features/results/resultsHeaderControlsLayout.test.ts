import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { repoRoot as root } from "@/test-utils/repoRoot"

function readSrc(rel: string) {
  return readFileSync(join(root, rel), "utf8")
}

describe("Results header right-side control group", () => {
  it("Focus, Result Settings, and expander share one right-side end group", () => {
    const expander = readSrc("src/shared/SectionExpander.tsx")
    const panel = readSrc("src/features/results/ResultsPanel.tsx")

    expect(expander).toContain('data-section-expander-end=""')
    expect(expander).toContain('data-section-expander-trailing=""')
    expect(expander).toContain('data-section-expander-chevron=""')

    // Trailing slot is inside the end group, not the title group.
    const titleGroup = expander.slice(
      expander.indexOf('data-section-expander-title-group=""'),
      expander.indexOf('data-section-expander-end=""'),
    )
    expect(titleGroup).not.toContain("headerTrailing")
    expect(titleGroup).not.toContain("data-section-expander-trailing")

    const endGroup = expander.slice(
      expander.indexOf('data-section-expander-end=""'),
      expander.indexOf("id={panelId}"),
    )
    expect(endGroup).toContain("headerTrailing")
    expect(endGroup).toContain("data-section-expander-trailing")
    expect(endGroup).toContain("data-section-expander-chevron")

    // Results still supplies Focus + Settings via headerTrailing.
    expect(panel).toContain('data-results-header-actions=""')
    expect(panel).toContain("headerTrailing=")
    expect(panel).toContain("data-results-focus-toggle")
    expect(panel).toContain("ResultPreferencesPanel")
    expect(panel).toContain("onOpenFocusResults")
  })

  it("control order is Focus → Settings → Expander (outermost)", () => {
    const panel = readSrc("src/features/results/ResultsPanel.tsx")
    const expander = readSrc("src/shared/SectionExpander.tsx")

    const actions = panel.slice(
      panel.indexOf('data-results-header-actions=""'),
      panel.indexOf("</div>", panel.indexOf('data-results-header-actions=""')) + 6,
    )
    const focusIdx = actions.indexOf("data-results-focus-toggle")
    const settingsIdx = actions.indexOf("ResultPreferencesPanel")
    expect(focusIdx).toBeGreaterThan(-1)
    expect(settingsIdx).toBeGreaterThan(-1)
    expect(focusIdx).toBeLessThan(settingsIdx)

    // In SectionExpander, trailing renders before chevron inside end group.
    const endStart = expander.indexOf('data-section-expander-end=""')
    const trailingIdx = expander.indexOf('data-section-expander-trailing=""', endStart)
    const chevronIdx = expander.indexOf('data-section-expander-chevron=""', endStart)
    expect(trailingIdx).toBeGreaterThan(-1)
    expect(chevronIdx).toBeGreaterThan(-1)
    expect(trailingIdx).toBeLessThan(chevronIdx)
  })

  it("Focus and Result Settings handlers remain unchanged", () => {
    const panel = readSrc("src/features/results/ResultsPanel.tsx")
    expect(panel).toContain("onClick={onOpenFocusResults}")
    expect(panel).toContain('aria-label={t("inputs.openFocusMode")}')
    expect(panel).toContain('title={t("inputs.openFocusMode")}')
    expect(panel).toContain("onChange={replacePreferences}")
    expect(panel).toContain("onSaveAsDefault={saveAsDefault}")
    expect(panel).toContain("onReset={resetToDefaults}")
  })
})
