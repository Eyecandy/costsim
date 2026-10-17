import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { join } from "node:path"

import {
  canFocusNavigateNextResults,
  resolveFocusNext,
  resolveFocusPrevious,
} from "@/lib/focusSessionNavigation"
import { repoRoot as root } from "@/test-utils/repoRoot"


function readSrc(rel: string) {
  return readFileSync(join(root, rel), "utf8")
}

describe("focusSessionNavigation", () => {
  it("A/B: Previous from Key Figures enters Input; Next from Input is Guided-owned", () => {
    expect(
      resolveFocusPrevious({
        focusView: "results",
        focusResultStepIndex: 0,
      }),
    ).toEqual({ kind: "enterInputFromResults" })
    expect(
      resolveFocusPrevious({
        focusView: "results",
        focusResultStepIndex: 2,
      }),
    ).toEqual({ kind: "resultStep", index: 1 })
    expect(
      resolveFocusPrevious({
        focusView: "input",
        focusResultStepIndex: 0,
      }),
    ).toEqual({ kind: "inputPrevious" })
  })

  it("J: Next clamps at final Results step; earlier Results advance", () => {
    expect(
      resolveFocusNext({
        focusView: "results",
        focusResultStepIndex: 4,
        resultStepCount: 5,
        canEnterResults: true,
      }),
    ).toEqual({ kind: "noop" })
    expect(
      resolveFocusNext({
        focusView: "results",
        focusResultStepIndex: 0,
        resultStepCount: 5,
        canEnterResults: true,
      }),
    ).toEqual({ kind: "resultStep", index: 1 })
    expect(canFocusNavigateNextResults(4, 5)).toBe(false)
    expect(canFocusNavigateNextResults(0, 5)).toBe(true)
  })

  it("Input Next always delegates to Guided (Simulation bridge included)", () => {
    expect(
      resolveFocusNext({
        focusView: "input",
        focusResultStepIndex: 0,
        resultStepCount: 5,
        canEnterResults: false,
      }),
    ).toEqual({ kind: "inputNext" })
    expect(
      resolveFocusNext({
        focusView: "input",
        focusResultStepIndex: 0,
        resultStepCount: 5,
        canEnterResults: true,
      }),
    ).toEqual({ kind: "inputNext" })
  })
})

describe("unified Focus session ownership", () => {
  it("A–C: App owns continuous Previous/Next across Input and Results", () => {
    const app = readSrc("src/App.tsx")
    expect(app).toContain("navigateFocusPrevious")
    expect(app).toContain("navigateFocusNext")
    expect(app).toContain("guidedDialogRef")
    expect(app).toContain("resolveFocusPrevious")
    expect(app).toContain("resolveFocusNext")
    expect(app).toContain("ref={guidedDialogRef}")
    // Results footer uses the same handlers as arrows.
    expect(app).toContain("onClick={navigateFocusPrevious}")
    expect(app).toContain("onClick={navigateFocusNext}")
    expect(app).toContain("data-focus-session-previous")
    expect(app).toContain("data-focus-session-next")
  })

  it("B: Shell arrows apply for the whole Focus session, not Results-only", () => {
    const shell = readSrc("src/components/FocusModeShell.tsx")
    expect(shell).toContain("shouldIgnoreFocusArrowNavigation")
    expect(shell).toContain("ArrowLeft")
    expect(shell).toContain("onNavigatePrevious")
    // No longer gated on variant === \"results\".
    expect(shell).not.toMatch(
      /if \(!open \|\| variant !== "results"\) return/,
    )
    const guided = readSrc("src/components/GuidedInputDialog.tsx")
    expect(guided).toContain(
      "if (!open || suspend || focusMode || ensureFocusMode) return",
    )
    expect(guided).toContain("GuidedInputDialogHandle")
  })

  it("D–F: X / exitFocusMode closes the whole Focus session including Guided", () => {
    const app = readSrc("src/App.tsx")
    const exit = app.match(
      /const exitFocusMode = useCallback\(\(\) => \{([\s\S]*?)\}, \[[^\]]*\]\)/,
    )
    expect(exit?.[1] ?? "").toContain("setFocusView(null)")
    expect(exit?.[1] ?? "").toContain("setGuidedInputKind(null)")
    expect(exit?.[1] ?? "").toContain("exitFullscreen")
    expect(exit?.[1] ?? "").toContain("clearStoredFocusSessionResume")
    expect(exit?.[1] ?? "").not.toContain('setFocusView("input")')
  })

  it("A/F: Key Figures Previous enters Input at Simulation — never skips to Impact", () => {
    expect(
      resolveFocusPrevious({
        focusView: "results",
        focusResultStepIndex: 0,
      }),
    ).toEqual({ kind: "enterInputFromResults" })
    const app = readSrc("src/App.tsx")
    const back = app.match(
      /const backToFocusInput = useCallback\(\(\) => \{([\s\S]*?)\}, \[/,
    )
    expect(back?.[1] ?? "").toContain('setGuidedResumePhase("simulation")')
    expect(back?.[1] ?? "").toContain("goToSimulation")
    expect(back?.[1] ?? "").not.toContain("openingFresh")
  })

  it("C: After Results → Input, Guided does not own competing window arrows", () => {
    const guided = readSrc("src/components/GuidedInputDialog.tsx")
    expect(guided).toContain(
      "if (!open || suspend || focusMode || ensureFocusMode) return",
    )
    // Results suspend must not clear focusMode (keeps session sizing + arrow owner).
    expect(guided).toContain("if (suspend) return")
    expect(guided).toContain("Results suspends Guided UI but the Focus session is still active")
  })

  it("G: Shared Focus frame contract is phase-invariant", () => {
    const shell = readSrc("src/components/FocusModeShell.tsx")
    const guided = readSrc("src/components/GuidedInputDialog.tsx")
    const frame = readSrc("src/lib/focusSessionFrame.ts")
    expect(shell).toContain('data-focus-frame-contract={dormant ? undefined : "session"}')
    expect(frame).toContain("h-[min(92vh,48rem)] w-[min(96vw,60rem)]")
    expect(shell).toContain("FOCUS_SESSION_CARD_CLASS")
    expect(guided).toContain("FOCUS_SESSION_CARD_CLASS")
    // Embedded Guided is body-only inside the shared shell — no Results-only card.
    expect(guided).toContain("data-guided-embedded-in-focus-host")
    expect(guided).toContain("Embedded Focus path: body-only")
    // Normal Focus size is not inferred from focusView === \"results\".
    expect(shell).not.toMatch(
      /focusView[\s\S]{0,40}76rem|variant === "results"[\s\S]{0,80}76rem/,
    )
    expect(shell).not.toContain("h-[min(96vh,56rem)] w-[min(96vw,76rem)]")
  })

  it("A–G presentation: normal Focus card vs explicit fullscreen", () => {
    const frame = readSrc("src/lib/focusSessionFrame.ts")
    const shell = readSrc("src/components/FocusModeShell.tsx")
    expect(frame).toContain("FOCUS_SESSION_CARD_CLASS")
    expect(frame).toContain("FOCUS_SESSION_CARD_FULLSCREEN_CLASS")
    expect(frame).toContain("h-[min(92vh,48rem)] w-[min(96vw,60rem)]")
    expect(frame).toContain("h-[min(100%,56rem)] w-[min(100%,80rem)]")
    // Fullscreen is the only size branch on the shell card.
    expect(shell).toContain("browserFullscreen")
    expect(shell).toContain("FOCUS_SESSION_CARD_FULLSCREEN_CLASS")
    expect(shell).toContain("FOCUS_SESSION_CARD_CLASS")
  })

  it("Shell arrows use window listener so Input↔Results remounts keep working", () => {
    const shell = readSrc("src/components/FocusModeShell.tsx")
    expect(shell).toContain('window.addEventListener("keydown", onKeyDown)')
    expect(shell).toContain("target === document.body")
    expect(shell).not.toContain("root.addEventListener(\"keydown\"")
  })

  it("H: Focus arrow ignore helper covers editables and overlays", () => {
    const src = readSrc("src/lib/shouldIgnoreFocusArrowNavigation.ts")
    expect(src).toContain("shouldIgnoreGuidedArrowNavigation")
    expect(src).toContain("data-expanded-chart-dialog")
    expect(src).toContain("data-result-preferences-panel")
    expect(src).toContain("data-confirm-dialog")
  })

  it("I: Simulation → Results still requires viewable results", () => {
    const app = readSrc("src/App.tsx")
    const cont = app.match(
      /const continueFromSimulationToResults = useCallback\(\(\) => \{([\s\S]*?)\}, \[hasViewableResults\]\)/,
    )
    expect(cont?.[1] ?? "").toContain("if (!hasViewableResults) return")
    expect(cont?.[1] ?? "").toContain('setFocusView("results")')
    const guided = readSrc("src/components/GuidedInputDialog.tsx")
    expect(guided).toContain("onContinueToResults")
    expect(guided).toContain('simulationResultStatus === "valid"')
    expect(guided).toContain('simulationResultStatus === "stale"')
  })
})
