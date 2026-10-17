import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { join } from "node:path"

import { messages } from "@/i18n/messages"
import { repoRoot as root } from "@/test-utils/repoRoot"


function readSrc(rel: string) {
  return readFileSync(join(root, rel), "utf8")
}

/**
 * Flatten leaf string values from the i18n catalogs for user-facing scans.
 */
function leafStrings(value: unknown, out: string[] = []): string[] {
  if (typeof value === "string") {
    out.push(value)
    return out
  }
  if (value && typeof value === "object") {
    for (const child of Object.values(value as Record<string, unknown>)) {
      leafStrings(child, out)
    }
  }
  return out
}

describe("Focus mode user-facing terminology", () => {
  it("A: primary entry / intro use Fokusmodus / Focus mode", () => {
    expect(messages.no.inputs.guidedFocusMode).toBe("Fokusmodus")
    expect(messages.en.inputs.guidedFocusMode).toBe("Focus mode")
    expect(messages.no.expanders.guidedInput).toBe("Fokusmodus")
    expect(messages.en.expanders.guidedInput).toBe("Focus mode")
    expect(messages.no.inputs.focusIntroTitle).toBe("Fokusmodus")
    expect(messages.en.inputs.focusIntroTitle).toBe("Focus mode")
    expect(messages.no.inputs.guidedPhaseFocusIntro).toBe("Fokusmodus")
    expect(messages.en.inputs.guidedPhaseFocusIntro).toBe("Focus mode")
    const app = readSrc("src/App.tsx")
    expect(app).toContain('t("inputs.guidedFocusMode")')
    expect(app).toContain("data-focus-mode-primary-entry")
  })

  it("B: local shortcuts use Åpne Fokusmodus / Open Focus mode", () => {
    expect(messages.no.inputs.openFocusMode).toBe("Åpne Fokusmodus")
    expect(messages.en.inputs.openFocusMode).toBe("Open Focus mode")
    const table = readSrc("src/components/ScenarioPercentTable.tsx")
    const results = readSrc("src/components/ResultsPanel.tsx")
    expect(table).toContain('title={t("inputs.openFocusMode")}')
    expect(table).toContain('aria-label={t("inputs.openFocusMode")}')
    expect(results).toContain('title={t("inputs.openFocusMode")}')
    expect(results).toContain('aria-label={t("inputs.openFocusMode")}')
  })

  it("C: Intro body describes step-by-step without naming Guided view", () => {
    expect(messages.no.inputs.focusIntroBody).toContain("steg for steg")
    expect(messages.en.inputs.focusIntroBody).toContain("step by step")
    expect(messages.no.inputs.focusIntroBody).not.toMatch(/Guidet visning/i)
    expect(messages.en.inputs.focusIntroBody).not.toMatch(/Guided view/i)
  })

  it("D: Method Guide workflow references use Focus mode terminology", () => {
    expect(messages.no.methodGuide.introGuideName).toBe("Fokusmodus")
    expect(messages.en.methodGuide.introGuideName).toBe("Focus mode")
    expect(messages.no.methodGuide.guideTipName).toBe("Fokusmodus")
    expect(messages.en.methodGuide.guideTipName).toBe("Focus mode")
    expect(messages.no.methodGuide.introGuideAfter).toContain("steg for steg")
    expect(messages.en.methodGuide.introGuideAfter).toContain("step by step")
    expect(messages.no.inputs.guidanceCostItemsGuide).toContain("Fokusmodus")
    expect(messages.en.inputs.guidanceCostItemsGuide).toContain("Focus mode")
    expect(messages.no.inputs.guidanceCostDriversGuide).toContain("Fokusmodus")
    expect(messages.en.inputs.guidanceCostDriversGuide).toContain("Focus mode")
  })

  it("E: Method Guide feature name remains Metodeguide / Method Guide", () => {
    expect(messages.no.methodGuide.title).toBe("Metodeguide")
    expect(messages.en.methodGuide.title).toBe("Method Guide")
    expect(messages.no.header.navMethodGuide).toBe("Metodeguide")
    expect(messages.en.header.navMethodGuide).toBe("Method Guide")
  })

  it("F: no user-facing Focus controls still use old Guide feature naming", () => {
    const noLeaves = leafStrings(messages.no)
    const enLeaves = leafStrings(messages.en)
    for (const s of noLeaves) {
      expect(s).not.toMatch(/Guidet visning/i)
      expect(s).not.toMatch(/\bGuiden\b/)
      expect(s).not.toMatch(/Åpne guide/i)
      expect(s).not.toMatch(/Start guide/i)
    }
    for (const s of enLeaves) {
      expect(s).not.toMatch(/Guided view/i)
      expect(s).not.toMatch(/Guided input/i)
      expect(s).not.toMatch(/Open guide/i)
      expect(s).not.toMatch(/Start guide/i)
      // Bare product name "Guide" must not remain for Focus (Method Guide is longer).
      expect(s).not.toBe("Guide")
    }
    expect(messages.no.inputs.guidedExitFocusMode).toBe("Avslutt Fokusmodus")
    expect(messages.en.inputs.guidedExitFocusMode).toBe("Exit Focus mode")
  })
})
