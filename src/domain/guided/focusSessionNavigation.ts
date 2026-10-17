/**
 * Focus session navigation — presentation-only helpers.
 *
 * Input steps (Guided) and Result steps share one Focus session.
 * These helpers describe boundary moves; App owns the live indices.
 */

export type FocusSessionView = "input" | "results"

export type FocusPreviousAction =
  | { kind: "noop" }
  | { kind: "resultStep"; index: number }
  | { kind: "enterInputFromResults" }
  | { kind: "inputPrevious" }

export type FocusNextAction =
  | { kind: "noop" }
  | { kind: "resultStep"; index: number }
  | { kind: "enterResultsFromInput" }
  | { kind: "inputNext" }

/** Previous within the continuous Focus sequence. */
export function resolveFocusPrevious(args: {
  focusView: FocusSessionView
  focusResultStepIndex: number
}): FocusPreviousAction {
  if (args.focusView === "results") {
    if (args.focusResultStepIndex <= 0) {
      return { kind: "enterInputFromResults" }
    }
    return {
      kind: "resultStep",
      index: Math.max(0, args.focusResultStepIndex - 1),
    }
  }
  return { kind: "inputPrevious" }
}

/** Next within the continuous Focus sequence. */
export function resolveFocusNext(args: {
  focusView: FocusSessionView
  focusResultStepIndex: number
  resultStepCount: number
  /** When on Input at Simulation: whether Results may be entered. */
  canEnterResults: boolean
}): FocusNextAction {
  if (args.focusView === "results") {
    const last = Math.max(0, args.resultStepCount - 1)
    if (args.focusResultStepIndex >= last) {
      return { kind: "noop" }
    }
    return {
      kind: "resultStep",
      index: Math.min(last, args.focusResultStepIndex + 1),
    }
  }
  // Input: Guided performs the step advance / Simulation → Results bridge.
  // When already at Simulation without viewable results, Guided no-ops.
  if (!args.canEnterResults) {
    // Still allow advancing within Input; Guided decides at Simulation.
    return { kind: "inputNext" }
  }
  return { kind: "inputNext" }
}

/** Whether the Focus shell should offer Next from the Results phase. */
export function canFocusNavigateNextResults(
  focusResultStepIndex: number,
  resultStepCount: number,
): boolean {
  return focusResultStepIndex < Math.max(0, resultStepCount - 1)
}
