import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { join } from "node:path"

import { messages } from "@/i18n/messages"
import { buildFocusResultSteps, focusResultSectionTitleKey } from "@/domain/guided/focusResultSteps"
import { buildGuidedWorkflowSteps } from "@/domain/guided/guidedWorkflow"
import type { CostElementRow, DriverRow } from "@/domain/results/tableRows"
import { repoRoot } from "@/test-utils/repoRoot"
import { readAppSource } from "@/test-utils/appSource"

function readSrc(rel: string) {
  return readFileSync(join(repoRoot, rel), "utf8")
}

function cost(partial: Partial<CostElementRow> & { id: string }): CostElementRow {
  return {
    name: "Cost",
    optimistic: "90",
    likely: "100",
    pessimistic: "120",
    ...partial,
  }
}

function driver(partial: Partial<DriverRow> & { id: string }): DriverRow {
  return {
    name: "Driver",
    optimistic: "-5",
    likely: "0",
    pessimistic: "10",
    ...partial,
  }
}

describe("Focus Results stepwise workflow", () => {
  it("A: Results Focus entry uses Play like Input, not Maximize2", () => {
    const panel = readSrc("src/features/results/ResultsPanel.tsx")
    const table = readSrc("src/features/scenario-tables/ScenarioPercentTable.tsx")
    expect(panel).toContain("data-results-focus-toggle")
    expect(panel).toContain('import { Check, Play } from "lucide-react"')
    expect(panel).not.toContain("Maximize2")
    // Local Focus shortcuts: outline Play (no fill), quiet next to primary entry.
    expect(panel).toContain('<Play className="size-4" aria-hidden />')
    expect(table).toContain('<Play className="size-4" aria-hidden />')
    expect(panel).not.toContain('<Play className="size-4 fill-current"')
    expect(table).not.toContain('<Play className="size-4 fill-current"')
  })

  it("B: existing Guided Input steps remain intact before Simulation", () => {
    const steps = buildGuidedWorkflowSteps({
      entry: "cost",
      costRows: [cost({ id: "c1" })],
      driverRows: [driver({ id: "d1" })],
    })
    expect(steps.map((s) => s.phase)).toEqual([
      "focusIntro",
      "projectProfile",
      "assumptions",
      "incurred",
      "estimateUncertaintyIntro",
      "cost",
      "correlation",
      "driversIntro",
      "driver",
      "impact",
      "simulation",
    ])
  })

  it("C: Simulation is the final Guided input stage", () => {
    const guided = readSrc("src/features/guided-input/GuidedInputDialog.tsx")
    expect(guided).toContain('data-guided-phase="simulation"')
    expect(guided).toContain("data-guided-simulation-run")
    expect(guided).not.toContain('data-guided-focus-run=""')
    expect(guided).not.toContain('data-guided-phase="finish"')
    expect(
      buildGuidedWorkflowSteps({
        entry: "cost",
        costRows: [cost({ id: "c1" })],
        driverRows: [driver({ id: "d1" })],
      }).at(-1),
    ).toEqual({ phase: "simulation" })
  })

  it("D: optional drivers still reach Simulation", () => {
    const steps = buildGuidedWorkflowSteps({
      entry: "cost",
      costRows: [cost({ id: "c1" })],
      driverRows: [],
    })
    expect(steps.some((s) => s.phase === "driversEmpty")).toBe(true)
    expect(steps.at(-1)).toEqual({ phase: "simulation" })
    expect(steps.some((s) => s.phase === "impact")).toBe(false)
  })

  it("E: no result — cannot advance into Results from Simulation", () => {
    const guided = readSrc("src/features/guided-input/GuidedInputDialog.tsx")
    expect(guided).toContain("canContinueFromSimulation")
    expect(guided).toContain("disabled={!canContinueFromSimulation}")
    expect(guided).toContain("guidedSimulationBodyNoResults")
  })

  it("F: valid existing result can continue without rerun", () => {
    const guided = readSrc("src/features/guided-input/GuidedInputDialog.tsx")
    expect(guided).toContain('simulationResultStatus === "valid"')
    expect(guided).toContain("onContinueToResults")
    expect(guided).toContain("guidedSimulationBodyValid")
  })

  it("G: stale existing result allows rerun OR continue", () => {
    const guided = readSrc("src/features/guided-input/GuidedInputDialog.tsx")
    expect(guided).toContain('simulationResultStatus === "stale"')
    expect(guided).toContain('t("projects.staleInputsTitle")')
    expect(guided).toContain('t("projects.staleInputsNotice")')
    expect(guided).toContain("data-guided-simulation-run")
    expect(guided).toContain("data-guided-simulation-next")
    expect(messages.no.projects.staleInputsTitle).toBe("Input er endret")
    expect(messages.no.projects.staleInputsNotice).toContain(
      "Resultatene er basert på tidligere input",
    )
  })

  it("H: successful Guided run uses existing handler and opens first result", () => {
    const app = readAppSource()
    expect(app).toContain("pendingFocusResultsAfterGuidedRunRef")
    expect(app).toContain("handleRun()")
    expect(app).toContain("setFocusResultStepIndex(0)")
    expect(app).toContain('setFocusView("results")')
    expect(app.match(/new SimulationWorker\(\)/g)?.length).toBe(1)
  })

  it("I: failed run clears pending Focus Results", () => {
    const app = readAppSource()
    const errorBlock = app.slice(
      app.indexOf("worker.onerror"),
      app.indexOf("return () => {", app.indexOf("worker.onerror")),
    )
    expect(errorBlock).toContain("pendingFocusResultsAfterGuidedRunRef.current = false")
    expect(errorBlock).not.toContain('setFocusView("results")')
  })

  it("J: stepwise Results — one section via focusSection", () => {
    const panel = readSrc("src/features/results/ResultsPanel.tsx")
    const steps = buildFocusResultSteps({
      includeDevelopment: false,
      includeContribution: true,
    })
    expect(steps).toEqual(["keyFigures", "scurve", "tornado", "contribution", "nextSteps"])
    expect(panel).toContain("focusSection")
    expect(panel).toContain("data-focus-results-step")
    expect(panel).toContain("data-focus-result-section")
    expect(panel).toContain("inFocusStep")
  })

  it("K: Next/Previous wiring across Simulation and Results", () => {
    const app = readAppSource()
    expect(app).toContain("continueFromSimulationToResults")
    expect(app).toContain("data-focus-results-previous")
    expect(app).toContain("data-focus-results-next")
    expect(app).toContain("backToFocusInput")
    expect(app).toContain('setGuidedResumePhase("simulation")')
  })

  it("L: Focus Results share Guided Focus frame dimensions", () => {
    const shell = readSrc("src/features/focus-mode/FocusModeShell.tsx")
    const guided = readSrc("src/features/guided-input/GuidedInputDialog.tsx")
    const frame = readSrc("src/domain/guided/focusSessionFrame.ts")
    expect(frame).toMatch(
      /FOCUS_SESSION_CARD_CLASS =\s*"h-\[min\(92vh,48rem\)\] w-\[min\(96vw,60rem\)\]"/,
    )
    expect(shell).toContain("FOCUS_SESSION_CARD_CLASS")
    expect(guided).toContain("FOCUS_SESSION_CARD_CLASS")
    // No Results-only large shell in normal Focus.
    expect(shell).not.toContain("h-[min(96vh,56rem)] w-[min(96vw,76rem)]")
  })

  it("M/N: ExpandedChartDialog reused; expand stays on same step", () => {
    const panel = readSrc("src/features/results/ResultsPanel.tsx")
    expect(panel).toContain("ExpandedChartDialog")
    expect(panel).toContain("setExpandedChart")
    expect(panel).toContain("closeExpandedChart")
    expect(panel).toContain("onExpand={() => setExpandedChart")
  })

  it("O: stale status remains on Focus Results shell across steps", () => {
    const app = readAppSource()
    expect(app).toContain("data-focus-stale-notice")
    expect(app).toContain("showStaleInputNotice")
  })

  it("P: Show changes exits Focus to normal Input with green highlighting", () => {
    const app = readAppSource()
    const guided = readSrc("src/features/guided-input/GuidedInputDialog.tsx")
    expect(app).toContain("onShowStaleChanges={handleFocusShowChanges}")
    expect(app).toMatch(
      /const handleFocusShowChanges = useCallback\(\(\) => \{\s*setShowStaleInputChanges\(true\)\s*focusShellRef\.current\?\.exitFullscreen\(\)\s*clearStoredFocusSessionResume\(\)\s*setFocusView\(null\)/,
    )
    expect(app).toContain("setGuidedInputKind(null)")
    expect(guided).toContain("data-guided-simulation-show-changes")
  })

  it("Q: Undo uses existing revert handler", () => {
    const app = readAppSource()
    expect(app).toContain("handleRevertInputsToLastSimulation")
    expect(app).toMatch(
      /data-focus-stale-notice[\s\S]*?onClick=\{handleRevertInputsToLastSimulation\}/,
    )
  })

  it("R: normal Results Play opens Focus Results directly", () => {
    const app = readAppSource()
    expect(app).toContain("openFocusResults")
    expect(app).toMatch(
      /const openFocusResults = useCallback\(\(\) => \{\s*if \(!hasViewableResults\) return\s*setFocusResultStepIndex\(0\)\s*setFocusView\("results"\)/,
    )
  })

  it("S: Result Settings shared in Focus header", () => {
    const app = readAppSource()
    const shell = readSrc("src/features/focus-mode/FocusModeShell.tsx")
    expect(app).toContain("ResultPreferencesPanel")
    expect(app).toContain("shouldShowResultSettingsEditor")
    expect(app).toContain("replacePreferences")
    expect(app).toContain("headerActions={")
    // Settings is a shell toolbar extra — not a flex sibling that moves FS/X.
    expect(shell).toContain('data-focus-session-toolbar-extra=""')
    expect(shell).toContain("right-full")
  })

  it("T/U: Single/Ongoing ownership unchanged", () => {
    const app = readAppSource()
    expect(app).toContain("getLiveResultValidity")
    expect(app).toContain("commitOngoingDraftResult")
    expect(app).toContain("commitSingleDraftResult")
    expect(app).toContain("checkpointComparisonResultSource")
  })

  it("Focus Results close uses same X affordance as Focus Input", () => {
    const shell = readSrc("src/features/focus-mode/FocusModeShell.tsx")
    const guided = readSrc("src/features/guided-input/GuidedInputDialog.tsx")
    expect(shell).toContain('data-focus-mode-close=""')
    expect(shell).toContain("<X ")
    expect(guided).toContain('data-guided-input-close=""')
    expect(guided).toContain("<X ")
    const exitMatch = readAppSource().match(
      /const exitFocusMode = useCallback\(\(\) => \{([\s\S]*?)\}, \[[^\]]*\]\)/,
    )
    expect(exitMatch?.[1] ?? "").toContain("setFocusView(null)")
    expect(exitMatch?.[1] ?? "").toContain("setGuidedInputKind(null)")
    expect(exitMatch?.[1] ?? "").toContain("clearStoredFocusSessionResume")
    expect(exitMatch?.[1] ?? "").not.toContain("setProjectResults")
    expect(exitMatch?.[1] ?? "").not.toContain("setLastSimulated")
  })

  it("Focus Results fullscreen reuses Guided fullscreen helpers", () => {
    const shell = readSrc("src/features/focus-mode/FocusModeShell.tsx")
    const guided = readSrc("src/features/guided-input/GuidedInputDialog.tsx")
    const app = readAppSource()
    expect(shell).toContain("requestElementFullscreen")
    expect(shell).toContain("exitFullscreenIfNeeded")
    expect(shell).toContain("subscribeFullscreenChange")
    expect(shell).toContain('data-focus-mode-fullscreen-toggle=""')
    expect(shell).toContain("data-focus-session-host")
    expect(shell).toContain("keepMounted")
    expect(shell).toContain("Maximize2")
    expect(shell).toContain("Minimize2")
    expect(guided).toContain("onRequestFocusFullscreen")
    expect(guided).toContain("focusPortalTarget")
    expect(guided).toContain("data-guided-embedded-in-focus-host")
    expect(app).toContain("focusShellRef")
    expect(app).toContain("keepMounted={Boolean(guidedInputKind")
    // Exit fullscreen keeps Focus open (Escape while FS returns early).
    expect(shell).toMatch(/isElementFullscreen\(focusRootRef\.current\)[\s\S]*?return/)
  })

  it("Fullscreen Input → Results keeps shared host mounted", () => {
    const app = readAppSource()
    const guided = readSrc("src/features/guided-input/GuidedInputDialog.tsx")
    expect(app).toContain('suspend={focusView === "results"}')
    expect(guided).toContain("Does not exit browser fullscreen — the shared Focus host owns it")
    expect(guided).toContain("data-guided-soft-suspend")
    expect(guided).not.toContain("if (suspend) return null\n\n  const dialogSurface")
  })

  it("Next Steps is the final Focus result step", () => {
    const steps = buildFocusResultSteps({
      includeDevelopment: false,
      includeContribution: true,
    })
    expect(steps.at(-1)).toBe("nextSteps")
    expect(focusResultSectionTitleKey("nextSteps")).toBe("inputs.focusNextStepsTitle")
    expect(messages.no.inputs.focusNextStepsTitle).toBe("Neste steg")
    expect(messages.en.inputs.focusNextStepsTitle).toBe("Next steps")
    const panel = readSrc("src/features/results/ResultsPanel.tsx")
    expect(panel).toContain('data-focus-next-steps=""')
    expect(panel).toContain("onFocusReviewInput")
    expect(panel).toContain("onRequestArchiveAndCreateNext")
    expect(panel).toContain("handleDownloadPdf")
    expect(panel).toContain("handleCopyShareLink")
    expect(panel).toContain("handleCopyAiBriefPackage")
  })

  it("Next Steps Previous returns to last analytical result via step index", () => {
    const app = readAppSource()
    expect(app).toContain("data-focus-results-previous")
    expect(app).toContain("navigateFocusPrevious")
    expect(app).toContain("resolveFocusPrevious")
    expect(app).toContain("canFocusNavigateNextResults")
  })

  it("Next Steps archive uses existing eligibility gate", () => {
    const app = readAppSource()
    const panel = readSrc("src/features/results/ResultsPanel.tsx")
    expect(app).toContain("librarySession.canArchive")
    expect(app).toContain("requestArchiveCheckpoint")
    expect(panel).toContain("data-focus-next-steps-archive")
    expect(panel).toContain("!analysisArchivedView")
  })

  it("G: Next Steps removes redundant Back to results", () => {
    const panel = readSrc("src/features/results/ResultsPanel.tsx")
    const app = readAppSource()
    expect(panel).not.toContain("onFocusBackToResults")
    expect(panel).not.toContain("data-focus-next-steps-back-to-results")
    expect(app).not.toContain("handleFocusBackToResults")
    expect(app).not.toContain("onFocusBackToResults")
  })

  it("H: Next Steps renders Continue working and Use the results sections", () => {
    const panel = readSrc("src/features/results/ResultsPanel.tsx")
    expect(panel).toContain('data-focus-next-steps-continue=""')
    expect(panel).toContain('data-focus-next-steps-use-results=""')
    expect(messages.no.inputs.focusContinueWorkingHeading).toBe("Fortsett arbeidet")
    expect(messages.en.inputs.focusContinueWorkingHeading).toBe("Continue working")
    expect(messages.no.inputs.focusUseResultsHeading).toBe("Bruk resultatene")
    expect(messages.en.inputs.focusUseResultsHeading).toBe("Use the results")
    expect(messages.no.inputs.focusNextStepsBody).toBe(
      "Velg hvordan du vil arbeide videre med analysen eller bruke resultatene.",
    )
    expect(messages.en.inputs.focusNextStepsBody).toBe(
      "Choose how you want to continue working with the analysis or use the results.",
    )
  })

  it("I: Review input uses existing Focus exit without green highlighting", () => {
    const app = readAppSource()
    const review = app.match(
      /const handleFocusReviewInput = useCallback\(\(\) => \{([\s\S]*?)\}, \[[^\]]*\]\)/,
    )
    expect(review?.[1] ?? "").toContain("exitFullscreen")
    expect(review?.[1] ?? "").toContain("clearStoredFocusSessionResume")
    expect(review?.[1] ?? "").toContain("setFocusView(null)")
    expect(review?.[1] ?? "").not.toContain("setShowStaleInputChanges(true)")
    expect(review?.[1] ?? "").not.toContain("setProjectResults")
  })

  it("J–N: Next Steps reuses PDF / share / AI / archive handlers and gates", () => {
    const panel = readSrc("src/features/results/ResultsPanel.tsx")
    const start = panel.indexOf('data-focus-next-steps=""')
    const endMarker = panel.indexOf('data-focus-next-steps-ai-brief=""', start)
    expect(start).toBeGreaterThanOrEqual(0)
    expect(endMarker).toBeGreaterThan(start)
    const nextStepsBlock = panel.slice(start, endMarker + 80)
    expect(nextStepsBlock).toContain("handleDownloadPdf")
    expect(nextStepsBlock).toContain("handleCopyShareLink")
    expect(nextStepsBlock).toContain("handleCopyAiBriefPackage")
    expect(nextStepsBlock).toContain("onRequestArchiveAndCreateNext")
    expect(nextStepsBlock).toContain("appFeatures.allowShareLink")
    expect(nextStepsBlock).toContain("!analysisArchivedView")
    expect(nextStepsBlock).toContain("data-focus-next-steps-review-input")
    expect(nextStepsBlock).toContain("data-focus-next-steps-pdf")
    expect(nextStepsBlock).toContain("data-focus-next-steps-share")
    expect(nextStepsBlock).toContain("data-focus-next-steps-ai-brief")
  })

  it("A–F: Focus session arrow keys reuse Previous/Next with safeguards", () => {
    const shell = readSrc("src/features/focus-mode/FocusModeShell.tsx")
    const app = readAppSource()
    const ignore = readSrc("src/features/focus-mode/shouldIgnoreFocusArrowNavigation.ts")
    expect(shell).toContain("shouldIgnoreFocusArrowNavigation")
    expect(shell).toContain("ArrowLeft")
    expect(shell).toContain("ArrowRight")
    expect(shell).toContain("onNavigatePrevious")
    expect(shell).toContain("onNavigateNext")
    expect(shell).toContain("canNavigateNext")
    expect(shell).toContain('window.addEventListener("keydown", onKeyDown)')
    expect(shell).toContain("target === document.body")
    expect(shell).not.toContain('root.addEventListener("keydown"')
    expect(app).toContain("onNavigatePrevious=")
    expect(app).toContain("onNavigateNext=")
    expect(app).toContain("canNavigateNext=")
    expect(app).toContain("navigateFocusPrevious")
    expect(app).toContain("navigateFocusNext")
    expect(app).toContain("canFocusNavigateNextResults")
    expect(app).toContain("backToFocusInput()")
    expect(ignore).toContain("shouldIgnoreGuidedArrowNavigation")
    expect(ignore).toContain("data-expanded-chart-dialog")
    expect(ignore).toContain("data-result-preferences-panel")
    expect(ignore).toContain("data-confirm-dialog")
    // Fullscreen uses the same shell handlers — no separate FS keyboard path.
    expect(shell).not.toContain("browserFullscreen && event.key")
    expect(shell).not.toMatch(/data-focus-browser-fullscreen[\s\S]{0,200}ArrowLeft/)
  })

  it("O: Focus refinements do not own simulation / results state", () => {
    const shell = readSrc("src/features/focus-mode/FocusModeShell.tsx")
    expect(shell).not.toContain("setProjectResults")
    expect(shell).not.toContain("runSimulation")
    expect(shell).not.toContain("lastSimulatedInputSignature")
  })

  it("Fullscreen toggle does not reset focusSection / step index", () => {
    const shell = readSrc("src/features/focus-mode/FocusModeShell.tsx")
    expect(shell).toContain("enterBrowserFullscreen")
    expect(shell).toContain("exitBrowserFullscreen")
    // Fullscreen helpers never call onExitFocus.
    const enterBlock = shell.slice(
      shell.indexOf("const enterBrowserFullscreen"),
      shell.indexOf("const exitBrowserFullscreen"),
    )
    const exitFsBlock = shell.slice(
      shell.indexOf("const exitBrowserFullscreen"),
      shell.indexOf("const handleClose"),
    )
    expect(enterBlock).not.toContain("onExitFocus")
    expect(exitFsBlock).not.toContain("onExitFocus")
  })

  it("Expanded chart portals into fullscreen container", () => {
    const dialog = readSrc("src/features/results/ExpandedChartDialog.tsx")
    expect(dialog).toContain("useOverlayPortalContainer")
    expect(dialog).toContain("portalContainer")
    const panel = readSrc("src/features/results/ResultsPanel.tsx")
    expect(panel).toContain('setExpandedChart({ kind: "scurve" })')
    expect(panel).toMatch(
      /expandedChart\?\.kind === "scurve"[\s\S]*?<ResultsSCurve[\s\S]*?expanded/,
    )
  })

  it("Focus view / step index are ephemeral", () => {
    const app = readAppSource()
    expect(app).not.toMatch(/focusView[\s\S]{0,80}localStorage/)
    expect(app).not.toMatch(/focusResultStepIndex[\s\S]{0,80}localStorage/)
  })

  it("section title keys map correctly", () => {
    expect(focusResultSectionTitleKey("keyFigures")).toBe("results.keyMetricsTitle")
    expect(focusResultSectionTitleKey("scurve")).toBe("charts.sCurveTitle")
    expect(focusResultSectionTitleKey("tornado")).toBe("charts.tornadoTitle")
    expect(focusResultSectionTitleKey("contribution")).toBe("charts.attributionTitle")
  })
})
