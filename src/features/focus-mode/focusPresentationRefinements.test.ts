import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { join } from "node:path"

import { messages } from "@/i18n/messages"
import { repoRoot as root } from "@/test-utils/repoRoot"
import { readAppSource } from "@/test-utils/appSource"


function readSrc(rel: string) {
  return readFileSync(join(root, rel), "utf8")
}

describe("Focus presentation refinements", () => {
  it("A/B: Input and Results Focus share dimmed-app backdrop (not opaque white)", () => {
    const shell = readSrc("src/features/focus-mode/FocusModeShell.tsx")
    const guided = readSrc("src/features/guided-input/GuidedInputDialog.tsx")
    expect(shell).toContain('data-focus-backdrop={')
    expect(shell).toContain('"dimmed"')
    expect(shell).toContain("bg-black/40 p-3 sm:p-6")
    // Opaque white is reserved for browser fullscreen only.
    expect(shell).toMatch(
      /browserFullscreen\s*\n?\s*\? "h-full min-h-full w-full bg-background/,
    )
    expect(guided).toContain('data-guided-backdrop="dimmed"')
    expect(guided).toContain("bg-black/40")
  })

  it("C/D: Focus Simulation reuses SpotlightLoadingText / normal run presentation", () => {
    const guided = readSrc("src/features/guided-input/GuidedInputDialog.tsx")
    const app = readAppSource()
    expect(guided).toContain("SpotlightLoadingText")
    expect(guided).toContain('data-simulation-loading=""')
    expect(guided).toContain('data-guided-simulation-loading=""')
    expect(guided).toContain('t("buttons.simulating")')
    expect(guided).toContain('t("buttons.runSimulation")')
    expect(app).toContain("SpotlightLoadingText")
    expect(app).toContain('data-simulation-loading=""')
  })

  it("Simulation step centers its compact action block only", () => {
    const guided = readSrc("src/features/guided-input/GuidedInputDialog.tsx")
    const simStart = guided.indexOf('case "simulation"')
    const simEnd = guided.indexOf("const renderFooter", simStart)
    const sim = guided.slice(simStart, simEnd)
    expect(sim).toContain('data-guided-simulation-centered=""')
    expect(sim).toContain("items-center")
    expect(sim).toContain("justify-center")
    expect(sim).toContain("text-center")
    expect(sim).toContain("min-h-full")
    expect(sim).toContain("max-w-sm")
    expect(sim).toContain('data-guided-simulation-run=""')
    expect(sim).toContain('data-guided-simulation-loading=""')
    expect(sim).toContain("SpotlightLoadingText")
    // Embedded portal fills height only on Simulation — not a global alignment style.
    expect(guided).toContain('step?.phase === "simulation" && "min-h-full"')
    // Shared shell / frame tokens remain untouched by this layout.
    expect(readSrc("src/domain/guided/focusSessionFrame.ts")).toContain(
      "FOCUS_SESSION_CARD_CLASS",
    )
    expect(readSrc("src/features/focus-mode/FocusModeShell.tsx")).toContain(
      "FOCUS_SESSION_CONTENT_CLASS",
    )
  })

  it("E/F/G: Driver note empty outside-click cancels; side placeholders", () => {
    const editor = readSrc("src/features/scenario-tables/DriverUncertaintyNotesEditor.tsx")
    expect(editor).toContain("handleAddBlur")
    expect(editor).toContain("cancelAdd")
    expect(editor).toContain("onBlur={handleAddBlur}")
    expect(editor).toContain(
      "guidedDriverUncertaintyNotePlaceholderLower",
    )
    expect(editor).toContain(
      "guidedDriverUncertaintyNotePlaceholderHigher",
    )
    expect(messages.no.inputs.guidedDriverUncertaintyNotePlaceholderLower).toBe(
      "Beskriv et forhold som kan gi lavere kostnadsutfall",
    )
    expect(messages.en.inputs.guidedDriverUncertaintyNotePlaceholderLower).toBe(
      "Describe a factor that could lead to a lower cost outcome",
    )
    expect(
      messages.no.inputs.guidedDriverUncertaintyNotePlaceholderHigher,
    ).toBe("Beskriv et forhold som kan gi høyere kostnadsutfall")
    expect(
      messages.en.inputs.guidedDriverUncertaintyNotePlaceholderHigher,
    ).toBe("Describe a factor that could lead to a higher cost outcome")
  })

  it("H/I/J: Next Steps footer uses Avslutt/Close via exitFocusMode; Previous remains", () => {
    const app = readAppSource()
    expect(app).toContain("data-focus-session-exit")
    expect(app).toContain("data-focus-results-exit")
    expect(app).toContain("onClick={exitFocusMode}")
    expect(app).toContain('t("inputs.focusSessionExit")')
    expect(app).toContain("data-focus-results-previous")
    expect(app).toContain("navigateFocusPrevious")
    expect(app).toContain(
      "focusResultStepIndex >= focusResultSteps.length - 1",
    )
    expect(messages.no.inputs.focusSessionExit).toBe("Avslutt")
    expect(messages.en.inputs.focusSessionExit).toBe("Close")
  })

  it("K/L: Arrow nav does not autofocus close; close stays Tab-reachable", () => {
    const shell = readSrc("src/features/focus-mode/FocusModeShell.tsx")
    expect(shell).toContain("focusNeutralSessionTarget")
    expect(shell).toContain("contentSlotRef.current?.focus")
    expect(shell).toContain("preventScroll: true")
    expect(shell).not.toContain("closeBtnRef.current?.focus")
    expect(shell).toContain("data-focus-mode-close")
    expect(shell).toContain("ref={closeBtnRef}")
    // Arrow handler restores neutral focus after step changes.
    expect(shell).toMatch(
      /onNavigateNext\?\.\(\)[\s\S]*?requestAnimationFrame\([\s\S]*?requestAnimationFrame\([\s\S]*?focusNeutralSessionTarget/,
    )
  })

  it("Contained Focus locks body scroll so Input ↔ Results cannot shift the card", () => {
    const shell = readSrc("src/features/focus-mode/FocusModeShell.tsx")
    expect(shell).toContain('body.style.overflow = "hidden"')
    expect(shell).toContain("scrollbarGap")
    expect(shell).toContain("paddingRight")
    // Shared frame still uses one contained class (no Input/Results offsets).
    expect(shell).toContain("FOCUS_SESSION_CARD_CLASS")
    expect(shell).not.toMatch(
      /focusView === "results"[\s\S]{0,40}top-|hostOnly[\s\S]{0,40}right-/,
    )
  })
})
