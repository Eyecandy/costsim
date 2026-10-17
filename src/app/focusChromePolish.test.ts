import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { join } from "node:path"

import { messages } from "@/i18n/messages"
import {
  FOCUS_NEXT_STEPS_ACTION_CLASS,
  FOCUS_NEXT_STEPS_ACTION_COL_CLASS,
  FOCUS_SESSION_FOOTER_CLASS,
  FOCUS_SESSION_FOOTER_NAV_BUTTON_CLASS,
} from "@/domain/guided/focusSessionFrame"
import { focusResultHelpCopyKeys } from "@/domain/guided/focusResultSteps"
import { repoRoot as root } from "@/test-utils/repoRoot"
import { readAppSource } from "@/test-utils/appSource"


function readSrc(rel: string) {
  return readFileSync(join(root, rel), "utf8")
}

describe("Focus chrome visual polish", () => {
  it("A: Focus Simulation uses App primary Button + brandPrimaryButtonClass", () => {
    const guided = readSrc("src/features/guided-input/GuidedInputDialog.tsx")
    const app = readAppSource()
    expect(guided).toContain("brandPrimaryButtonClass")
    expect(guided).toContain("<Button")
    expect(guided).toContain('data-guided-simulation-run=""')
    expect(guided).toContain("h-8 w-full shrink-0")
    expect(app).toContain("brandPrimaryButtonClass")
    expect(guided).not.toMatch(
      /data-guided-simulation-run[\s\S]{0,400}bg-\[#1d868c\]/,
    )
  })

  it("B/C: Results Focus header shows alternative and Results context (no Results help)", () => {
    const app = readAppSource()
    const shell = readSrc("src/features/focus-mode/FocusModeShell.tsx")
    expect(app).toContain("data-focus-results-project-context")
    expect(app).toContain("data-focus-results-context")
    expect(app).toContain('t("inputs.focusResultsContext")')
    expect(app).toContain("ProjectColorSwatch")
    expect(app).toContain("activeProject.name")
    // Results must not wire result-section help; Input may use GuidedPhaseInfo.
    expect(app).not.toContain("focusResultHelpCopyKeys")
    const resultsSubtitle = app.slice(
      app.indexOf("data-focus-results-project-context"),
      app.indexOf("data-focus-results-context") + 40,
    )
    expect(resultsSubtitle).not.toContain("GuidedPhaseInfo")
    expect(shell).toContain("data-focus-mode-subtitle")
    expect(messages.no.inputs.focusResultsContext).toBe("Resultat")
    expect(messages.en.inputs.focusResultsContext).toBe("Results")
  })

  it("D: shared FS/X toolbar remains independently anchored", () => {
    const shell = readSrc("src/features/focus-mode/FocusModeShell.tsx")
    expect(shell).toContain('data-focus-session-toolbar=""')
    expect(shell).toContain("absolute top-4 right-5")
    const header = shell.slice(
      shell.indexOf("data-focus-mode-header"),
      shell.indexOf("data-focus-mode-status"),
    )
    expect(header).not.toContain("data-focus-mode-fullscreen-toggle")
    expect(header).not.toContain("data-focus-mode-close")
  })

  it("E/F: Input and Results share lightweight footer nav positioning/style", () => {
    const guided = readSrc("src/features/guided-input/GuidedInputDialog.tsx")
    const app = readAppSource()
    const shell = readSrc("src/features/focus-mode/FocusModeShell.tsx")
    expect(FOCUS_SESSION_FOOTER_CLASS).toContain("px-5 py-3 sm:px-8")
    expect(FOCUS_SESSION_FOOTER_NAV_BUTTON_CLASS).toContain(
      "text-muted-foreground",
    )
    expect(guided).toContain("FOCUS_SESSION_FOOTER_CLASS")
    expect(guided).toContain("FOCUS_SESSION_FOOTER_NAV_BUTTON_CLASS")
    expect(shell).toContain("FOCUS_SESSION_FOOTER_CLASS")
    expect(app).toContain("FOCUS_SESSION_FOOTER_NAV_BUTTON_CLASS")
    // Results Next is ghost — not a filled primary CTA.
    const resultsNav = app.slice(
      app.indexOf("data-focus-results-nav"),
      app.indexOf("data-focus-results-next") + 80,
    )
    expect(resultsNav).toContain("FOCUS_SESSION_FOOTER_NAV_BUTTON_CLASS")
    expect(resultsNav).not.toContain("bg-[#1d868c]")
  })

  it("G: Next Steps footer is Previous + Close with shared nav weight", () => {
    const app = readAppSource()
    expect(app).toContain("data-focus-results-exit")
    expect(app).toContain("data-focus-session-exit")
    expect(app).toContain('t("inputs.focusSessionExit")')
    const exitBtn = app.slice(
      app.indexOf("data-focus-session-exit"),
      app.indexOf("data-focus-session-exit") + 350,
    )
    // Exit uses the same lightweight class as Next (search nearby className).
    expect(app).toMatch(
      /data-focus-session-exit[\s\S]{0,200}FOCUS_SESSION_FOOTER_NAV_BUTTON_CLASS|FOCUS_SESSION_FOOTER_NAV_BUTTON_CLASS[\s\S]{0,200}data-focus-session-exit/,
    )
    expect(exitBtn).not.toContain("bg-[#1d868c]")
  })

  it("H: Next Steps action buttons share equal width + centered text", () => {
    const panel = readSrc("src/features/results/ResultsPanel.tsx")
    expect(panel).toContain("FOCUS_NEXT_STEPS_ACTION_CLASS")
    expect(panel).toContain("FOCUS_NEXT_STEPS_ACTION_COL_CLASS")
    expect(FOCUS_NEXT_STEPS_ACTION_CLASS).toContain("w-full")
    expect(FOCUS_NEXT_STEPS_ACTION_CLASS).toContain("justify-center")
    expect(FOCUS_NEXT_STEPS_ACTION_CLASS).toContain("text-center")
    expect(FOCUS_NEXT_STEPS_ACTION_COL_CLASS).toContain("sm:w-44")
    expect(panel).toContain('data-focus-next-steps-continue=""')
    expect(panel).toContain('data-focus-next-steps-use-results=""')
  })

  it("reuses existing result guidance keys for Focus section titles", () => {
    expect(focusResultHelpCopyKeys("keyFigures").meaningKey).toBe(
      "helper.resultsKeyMetrics",
    )
    expect(focusResultHelpCopyKeys("scurve").meaningKey).toBe(
      "charts.sCurveSubtitle",
    )
    expect(focusResultHelpCopyKeys("tornado").meaningKey).toBe(
      "charts.tornadoSubtitle",
    )
    expect(focusResultHelpCopyKeys("contribution").meaningKey).toBe(
      "charts.attributionSubtitle",
    )
    expect(messages.no.inputs.focusNextStepsHelpMeaning.length).toBeGreaterThan(
      10,
    )
    expect(messages.en.inputs.focusNextStepsHelpMeaning.length).toBeGreaterThan(
      10,
    )
  })
})
