import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { join } from "node:path"

import { messages } from "@/i18n/messages"
import {
  advanceFurthestFocusPhase,
  findGuidedStepIndexForFocusPhase,
  FOCUS_USER_PHASES,
  getFocusPhaseForGuidedStep,
  getFocusUserPhase,
  isFocusPhaseReached,
  shouldShowFocusPhaseNav,
} from "@/domain/guided/focusPhaseNav"
import {
  buildGuidedWorkflowSteps,
  initialGuidedWorkflowStepIndex,
} from "@/domain/guided/guidedWorkflow"
import type { CostElementRow, DriverRow } from "@/domain/results/tableRows"
import { repoRoot as root } from "@/test-utils/repoRoot"


function readSrc(rel: string) {
  return readFileSync(join(root, rel), "utf8")
}

function cost(id: string): CostElementRow {
  return {
    id,
    name: id,
    optimistic: "-10",
    likely: "100",
    pessimistic: "20",
  }
}

function driver(id: string): DriverRow {
  return {
    id,
    name: id,
    optimistic: "-10",
    likely: "0",
    pessimistic: "20",
  }
}

describe("Focus phase navigation helpers", () => {
  it("maps Guided steps to five broad phases; Intro → null", () => {
    expect(getFocusPhaseForGuidedStep("focusIntro")).toBeNull()
    expect(getFocusPhaseForGuidedStep("projectProfile")).toBe("project")
    expect(getFocusPhaseForGuidedStep("assumptions")).toBe("costs")
    expect(getFocusPhaseForGuidedStep("incurred")).toBe("costs")
    expect(getFocusPhaseForGuidedStep("estimateUncertaintyIntro")).toBe("costs")
    expect(getFocusPhaseForGuidedStep("costsEmpty")).toBe("costs")
    expect(getFocusPhaseForGuidedStep("cost")).toBe("costs")
    expect(getFocusPhaseForGuidedStep("correlation")).toBe("costs")
    expect(getFocusPhaseForGuidedStep("driversIntro")).toBe("drivers")
    expect(getFocusPhaseForGuidedStep("driversEmpty")).toBe("drivers")
    expect(getFocusPhaseForGuidedStep("driver")).toBe("drivers")
    expect(getFocusPhaseForGuidedStep("impact")).toBe("drivers")
    expect(getFocusPhaseForGuidedStep("simulation")).toBe("simulation")
    expect(FOCUS_USER_PHASES).toEqual([
      "project",
      "costs",
      "drivers",
      "simulation",
      "results",
    ])
  })

  it("forward: projectProfile → Project; assumptions → Costs", () => {
    expect(
      getFocusUserPhase({
        focusView: "input",
        guidedWorkflowPhase: "projectProfile",
      }),
    ).toBe("project")
    expect(
      getFocusUserPhase({
        focusView: "input",
        guidedWorkflowPhase: "assumptions",
      }),
    ).toBe("costs")
    expect(
      getFocusUserPhase({
        focusView: "input",
        guidedWorkflowPhase: "incurred",
      }),
    ).toBe("costs")
    expect(
      getFocusUserPhase({
        focusView: "input",
        guidedWorkflowPhase: "correlation",
      }),
    ).toBe("costs")
  })

  it("backward: assumptions → projectProfile switches current to Project; Costs stays reached", () => {
    let furthest = advanceFurthestFocusPhase(null, "project")
    furthest = advanceFurthestFocusPhase(furthest, "costs")
    expect(furthest).toBe("costs")
    // Navigating back to Project does not reduce furthest.
    furthest = advanceFurthestFocusPhase(furthest, "project")
    expect(furthest).toBe("costs")
    expect(isFocusPhaseReached("costs", furthest)).toBe(true)
    expect(
      getFocusUserPhase({
        focusView: "input",
        guidedWorkflowPhase: "projectProfile",
      }),
    ).toBe("project")
  })

  it("A: phase nav hidden on Intro; shown after entering workflow / Results", () => {
    expect(
      shouldShowFocusPhaseNav({
        focusView: "input",
        guidedWorkflowPhase: "focusIntro",
      }),
    ).toBe(false)
    expect(
      getFocusUserPhase({
        focusView: "input",
        guidedWorkflowPhase: "focusIntro",
      }),
    ).toBeNull()
    expect(
      shouldShowFocusPhaseNav({
        focusView: "input",
        guidedWorkflowPhase: "projectProfile",
      }),
    ).toBe(true)
    expect(
      shouldShowFocusPhaseNav({
        focusView: "results",
        guidedWorkflowPhase: null,
      }),
    ).toBe(true)
    expect(
      getFocusUserPhase({
        focusView: "results",
        guidedWorkflowPhase: null,
      }),
    ).toBe("results")
  })

  it("B/C/D/E/F/G: furthest reached advances monotonically", () => {
    // B: Project only
    let furthest = advanceFurthestFocusPhase(null, "project")
    expect(furthest).toBe("project")
    expect(isFocusPhaseReached("project", furthest)).toBe(true)
    expect(isFocusPhaseReached("costs", furthest)).toBe(false)
    expect(isFocusPhaseReached("drivers", furthest)).toBe(false)
    expect(isFocusPhaseReached("simulation", furthest)).toBe(false)
    expect(isFocusPhaseReached("results", furthest)).toBe(false)

    // C: Reach Costs
    furthest = advanceFurthestFocusPhase(furthest, "costs")
    expect(isFocusPhaseReached("project", furthest)).toBe(true)
    expect(isFocusPhaseReached("costs", furthest)).toBe(true)
    expect(isFocusPhaseReached("drivers", furthest)).toBe(false)

    // D: Drivers
    furthest = advanceFurthestFocusPhase(furthest, "drivers")
    expect(isFocusPhaseReached("drivers", furthest)).toBe(true)
    expect(isFocusPhaseReached("simulation", furthest)).toBe(false)

    // E: Simulation
    furthest = advanceFurthestFocusPhase(furthest, "simulation")
    expect(isFocusPhaseReached("simulation", furthest)).toBe(true)
    expect(isFocusPhaseReached("results", furthest)).toBe(false)

    // F: Results unlocks all
    furthest = advanceFurthestFocusPhase(furthest, "results")
    for (const phase of FOCUS_USER_PHASES) {
      expect(isFocusPhaseReached(phase, furthest)).toBe(true)
    }

    // G: Backward does not relock
    furthest = advanceFurthestFocusPhase(furthest, "project")
    expect(furthest).toBe("results")
    expect(isFocusPhaseReached("simulation", furthest)).toBe(true)
  })

  it("H: click destinations land on first semantic Guided steps", () => {
    const steps = buildGuidedWorkflowSteps({
      entry: "cost",
      costRows: [cost("c1"), cost("c2")],
      driverRows: [driver("d1")],
    })
    expect(steps[findGuidedStepIndexForFocusPhase(steps, "project")]?.phase).toBe(
      "projectProfile",
    )
    expect(steps[findGuidedStepIndexForFocusPhase(steps, "costs")]?.phase).toBe(
      "assumptions",
    )
    expect(steps[findGuidedStepIndexForFocusPhase(steps, "drivers")]?.phase).toBe(
      "driversIntro",
    )
    expect(
      steps[findGuidedStepIndexForFocusPhase(steps, "simulation")]?.phase,
    ).toBe("simulation")
  })

  it("J: Driver Play uses full workflow; Project/Costs reachable behind Drivers landing", () => {
    const steps = buildGuidedWorkflowSteps({
      entry: "driver",
      costRows: [cost("c1")],
      driverRows: [driver("d1")],
    })
    expect(steps.some((s) => s.phase === "projectProfile")).toBe(true)
    expect(steps.some((s) => s.phase === "assumptions")).toBe(true)
    expect(steps.some((s) => s.phase === "cost")).toBe(true)
    const land = initialGuidedWorkflowStepIndex({
      entry: "driver",
      steps,
      startRowIndex: 0,
    })
    expect(steps[land]?.phase).toBe("driversIntro")
    expect(getFocusPhaseForGuidedStep("driversIntro")).toBe("drivers")
    // Landing on Drivers unlocks Project + Costs via furthest-reached semantics.
    const furthest = advanceFurthestFocusPhase(null, "drivers")
    expect(isFocusPhaseReached("project", furthest)).toBe(true)
    expect(isFocusPhaseReached("costs", furthest)).toBe(true)
    expect(isFocusPhaseReached("drivers", furthest)).toBe(true)
    expect(isFocusPhaseReached("simulation", furthest)).toBe(false)
    expect(isFocusPhaseReached("results", furthest)).toBe(false)
    expect(findGuidedStepIndexForFocusPhase(steps, "project")).toBe(
      steps.findIndex((s) => s.phase === "projectProfile"),
    )
    expect(findGuidedStepIndexForFocusPhase(steps, "costs")).toBe(
      steps.findIndex((s) => s.phase === "assumptions"),
    )
    expect(findGuidedStepIndexForFocusPhase(steps, "drivers")).toBe(land)
    // Previous from Drivers enters Costs.
    expect(steps[land - 1]?.phase).toBe("correlation")
  })

  it("K/L: Results current unlocks all; existing results alone do not imply Results phase", () => {
    expect(
      getFocusUserPhase({
        focusView: "input",
        guidedWorkflowPhase: "projectProfile",
      }),
    ).toBe("project")
    expect(isFocusPhaseReached("results", "project")).toBe(false)
    expect(isFocusPhaseReached("simulation", "project")).toBe(false)
    const afterResultsPlay = advanceFurthestFocusPhase(null, "results")
    expect(afterResultsPlay).toBe("results")
    expect(isFocusPhaseReached("project", afterResultsPlay)).toBe(true)
  })

  it("cost empty / driver empty destinations still resolve", () => {
    const noCosts = buildGuidedWorkflowSteps({
      entry: "cost",
      costRows: [],
      driverRows: [],
    })
    expect(noCosts[findGuidedStepIndexForFocusPhase(noCosts, "costs")]?.phase).toBe(
      "assumptions",
    )
    const driverEmpty = buildGuidedWorkflowSteps({
      entry: "driver",
      costRows: [],
      driverRows: [],
    })
    expect(
      driverEmpty[findGuidedStepIndexForFocusPhase(driverEmpty, "drivers")]?.phase,
    ).toBe("driversIntro")
  })
})

describe("Focus phase navigation wiring", () => {
  it("App owns ephemeral furthestReached + phase nav in header aux", () => {
    const app = readSrc("src/App.tsx")
    expect(app).toContain("furthestReachedFocusPhase")
    expect(app).toContain("advanceFurthestFocusPhase")
    expect(app).toContain("FocusPhaseNav")
    expect(app).toContain("navigateToFocusUserPhase")
    expect(app).toContain("shouldShowFocusPhaseNav")
    expect(app).toContain("setFurthestReachedFocusPhase(null)")
    expect(app).toContain("resumeFocusUserPhase={guidedLandFocusPhase}")
    // Existing results do not seed furthest — only session current phase does.
    expect(app).not.toMatch(
      /hasViewableResults[\s\S]{0,80}setFurthestReachedFocusPhase/,
    )
  })

  it("Guided publishes workflowPhase; goToFocusUserPhase uses shared helper", () => {
    const guided = readSrc("src/components/GuidedInputDialog.tsx")
    expect(guided).toContain("workflowPhase: phase ?? null")
    expect(guided).toContain("goToFocusUserPhase")
    expect(guided).toContain("findGuidedStepIndexForFocusPhase")
    expect(guided).toContain("resumeFocusUserPhase")
  })

  it("N: item progress remains available beside phase nav", () => {
    const nav = readSrc("src/components/FocusPhaseNav.tsx")
    expect(nav).toContain("itemProgressLabel")
    expect(nav).toContain('data-guided-progress=""')
    expect(nav).toContain('aria-current={current ? "step" : undefined}')
    expect(nav).toContain("disabled={!interactive}")
    // True center: equal side columns so trailing progress cannot shift the nav.
    expect(nav).toContain("grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]")
    expect(nav).toContain("justify-self-center")
    const app = readSrc("src/App.tsx")
    expect(app).toContain("itemProgressLabel=")
    expect(app).toContain("guidedFocusChromeMeta?.progressLabel")
  })

  it("O: same Focus shell header aux hosts phase nav in contained + fullscreen", () => {
    const shell = readSrc("src/components/FocusModeShell.tsx")
    expect(shell).toContain("headerAuxiliary")
    expect(shell).toContain("FOCUS_SESSION_HEADER_AUX_CLASS")
    expect(shell).toContain("data-focus-mode-header-aux")
    expect(shell).toContain("data-focus-mode-header-titles")
    expect(shell).toContain("FOCUS_SESSION_HEADER_TITLE_CLASS")
    // Titles stay left; aux is a sibling full-width row (not nested in title stack).
    const header = shell.slice(
      shell.indexOf("data-focus-mode-header"),
      shell.indexOf("data-focus-mode-status"),
    )
    expect(header.indexOf("data-focus-mode-header-titles")).toBeLessThan(
      header.indexOf("data-focus-mode-header-aux"),
    )
    expect(header).toContain("data-focus-mode-subtitle")
    // No separate fullscreen phase-nav branch.
    expect(shell).not.toMatch(
      /browserFullscreen[\s\S]{0,120}FocusPhaseNav|FocusPhaseNav[\s\S]{0,120}browserFullscreen/,
    )
  })

  it("NO/EN phase labels present; no sixth Next Steps phase", () => {
    expect(messages.no.inputs.focusPhaseProject).toBe("Prosjekt")
    expect(messages.no.inputs.focusPhaseCosts).toBe("Kostnader")
    expect(messages.no.inputs.focusPhaseDrivers).toBe("Drivere")
    expect(messages.no.inputs.focusPhaseSimulation).toBe("Simulering")
    expect(messages.no.inputs.focusPhaseResults).toBe("Resultater")
    expect(messages.en.inputs.focusPhaseProject).toBe("Project")
    expect(messages.en.inputs.focusPhaseCosts).toBe("Costs")
    expect(messages.en.inputs.focusPhaseDrivers).toBe("Drivers")
    expect(messages.en.inputs.focusPhaseSimulation).toBe("Simulation")
    expect(messages.en.inputs.focusPhaseResults).toBe("Results")
    expect(FOCUS_USER_PHASES).not.toContain("nextSteps")
  })
})
