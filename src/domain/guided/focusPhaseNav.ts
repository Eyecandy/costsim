import {
  findGuidedWorkflowPhaseIndex,
  type GuidedWorkflowPhase,
  type GuidedWorkflowStep,
} from "@/domain/guided/guidedWorkflow"

/** Broad user-facing Focus phases (not every internal Guided step). */
export type FocusUserPhase = "project" | "costs" | "drivers" | "simulation" | "results"

export const FOCUS_USER_PHASES: readonly FocusUserPhase[] = [
  "project",
  "costs",
  "drivers",
  "simulation",
  "results",
] as const

export type FocusUserPhaseInput = Exclude<FocusUserPhase, "results">

const PHASE_ORDER: Record<FocusUserPhase, number> = {
  project: 0,
  costs: 1,
  drivers: 2,
  simulation: 3,
  results: 4,
}

/** Map a Guided workflow phase → broad Focus phase (Intro → null). */
export function getFocusPhaseForGuidedStep(phase: GuidedWorkflowPhase): FocusUserPhase | null {
  switch (phase) {
    case "focusIntro":
      return null
    case "projectProfile":
      return "project"
    case "assumptions":
    case "incurred":
    case "estimateUncertaintyIntro":
    case "costsEmpty":
    case "cost":
    case "correlation":
      return "costs"
    case "driversIntro":
    case "driversEmpty":
    case "driver":
    case "impact":
      return "drivers"
    case "simulation":
      return "simulation"
  }
}

/**
 * Current broad phase from canonical Focus session state.
 * `null` while on Intro (or Focus closed / unknown Input).
 */
export function getFocusUserPhase(args: {
  focusView: "input" | "results" | null
  guidedWorkflowPhase: GuidedWorkflowPhase | null | undefined
}): FocusUserPhase | null {
  if (args.focusView === "results") return "results"
  if (args.focusView !== "input") return null
  if (!args.guidedWorkflowPhase) return null
  return getFocusPhaseForGuidedStep(args.guidedWorkflowPhase)
}

export function compareFocusUserPhases(a: FocusUserPhase, b: FocusUserPhase): number {
  return PHASE_ORDER[a] - PHASE_ORDER[b]
}

/** Monotonic unlock: never moves backward. */
export function advanceFurthestFocusPhase(
  previous: FocusUserPhase | null,
  current: FocusUserPhase | null,
): FocusUserPhase | null {
  if (current == null) return previous
  if (previous == null) return current
  return compareFocusUserPhases(current, previous) > 0 ? current : previous
}

export function isFocusPhaseReached(
  phase: FocusUserPhase,
  furthest: FocusUserPhase | null,
): boolean {
  if (furthest == null) return false
  return compareFocusUserPhases(phase, furthest) <= 0
}

/** Whether the phase overview should render (hidden on Intro). */
export function shouldShowFocusPhaseNav(args: {
  focusView: "input" | "results" | null
  guidedWorkflowPhase: GuidedWorkflowPhase | null | undefined
}): boolean {
  if (args.focusView === "results") return true
  if (args.focusView !== "input") return false
  if (!args.guidedWorkflowPhase || args.guidedWorkflowPhase === "focusIntro") {
    return false
  }
  return true
}

/**
 * First semantic Guided step index for a broad Input phase.
 * Prefer concept intros / profile over raw numeric indices.
 */
export function findGuidedStepIndexForFocusPhase(
  steps: readonly GuidedWorkflowStep[],
  phase: FocusUserPhaseInput,
): number {
  if (steps.length === 0) return 0

  if (phase === "project") {
    const profile = steps.findIndex((s) => s.phase === "projectProfile")
    return profile >= 0 ? profile : 0
  }

  if (phase === "costs") {
    // Costs begins at assumptions (kalkyleforutsetninger), then incurred / ranges.
    const assumptions = steps.findIndex((s) => s.phase === "assumptions")
    if (assumptions >= 0) return assumptions
    const incurred = steps.findIndex((s) => s.phase === "incurred")
    if (incurred >= 0) return incurred
    const intro = steps.findIndex((s) => s.phase === "estimateUncertaintyIntro")
    if (intro >= 0) return intro
    const cost = steps.findIndex((s) => s.phase === "cost")
    if (cost >= 0) return cost
    const empty = steps.findIndex((s) => s.phase === "costsEmpty")
    return empty >= 0 ? empty : 0
  }

  if (phase === "drivers") {
    const intro = steps.findIndex((s) => s.phase === "driversIntro")
    if (intro >= 0) return intro
    const driver = steps.findIndex((s) => s.phase === "driver")
    if (driver >= 0) return driver
    const empty = steps.findIndex((s) => s.phase === "driversEmpty")
    return empty >= 0 ? empty : 0
  }

  return findGuidedWorkflowPhaseIndex(steps, "simulation")
}

export function focusUserPhaseMessageKey(
  phase: FocusUserPhase,
): `inputs.focusPhase${"Project" | "Costs" | "Drivers" | "Simulation" | "Results"}` {
  switch (phase) {
    case "project":
      return "inputs.focusPhaseProject"
    case "costs":
      return "inputs.focusPhaseCosts"
    case "drivers":
      return "inputs.focusPhaseDrivers"
    case "simulation":
      return "inputs.focusPhaseSimulation"
    case "results":
      return "inputs.focusPhaseResults"
  }
}
