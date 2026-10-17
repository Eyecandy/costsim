/**
 * Presentation-only Focus Results step ids.
 * Order mirrors the normal ResultsPanel analytical section order,
 * then a final Next Steps card.
 */
export type FocusResultSectionId =
  | "keyFigures"
  | "development"
  | "scurve"
  | "tornado"
  | "contribution"
  | "nextSteps"

export function buildFocusResultSteps(args: {
  /** Ongoing Development chart — same gate as ResultsPanel. */
  includeDevelopment: boolean
  /** Contribution / attribution — same gate as ResultsPanel (`appFeatures.showExpectedAddition`). */
  includeContribution: boolean
}): FocusResultSectionId[] {
  const steps: FocusResultSectionId[] = ["keyFigures"]
  if (args.includeDevelopment) steps.push("development")
  steps.push("scurve", "tornado")
  if (args.includeContribution) steps.push("contribution")
  steps.push("nextSteps")
  return steps
}

export function focusResultSectionTitleKey(
  id: FocusResultSectionId,
): string {
  switch (id) {
    case "keyFigures":
      return "results.keyMetricsTitle"
    case "development":
      return "checkpoints.developmentTitle"
    case "scurve":
      return "charts.sCurveTitle"
    case "tornado":
      return "charts.tornadoTitle"
    case "contribution":
      return "charts.attributionTitle"
    case "nextSteps":
      return "inputs.focusNextStepsTitle"
  }
}

/**
 * Existing result help/subtitle copy reused for Focus Results GuidedPhaseInfo.
 * Returns translation keys for meaning (+ optional discuss footnote).
 */
export function focusResultHelpCopyKeys(id: FocusResultSectionId): {
  titleKey: string
  meaningKey: string
  discussKey?: string
} {
  switch (id) {
    case "keyFigures":
      return {
        titleKey: "results.keyMetricsTitle",
        meaningKey: "helper.resultsKeyMetrics",
      }
    case "development":
      return {
        titleKey: "checkpoints.developmentTitle",
        meaningKey: "checkpoints.developmentHelper",
      }
    case "scurve":
      return {
        titleKey: "charts.sCurveTitle",
        meaningKey: "charts.sCurveSubtitle",
      }
    case "tornado":
      return {
        titleKey: "charts.tornadoTitle",
        meaningKey: "charts.tornadoSubtitle",
      }
    case "contribution":
      return {
        titleKey: "charts.attributionTitle",
        meaningKey: "charts.attributionSubtitle",
      }
    case "nextSteps":
      return {
        titleKey: "inputs.focusNextStepsTitle",
        meaningKey: "inputs.focusNextStepsHelpMeaning",
      }
  }
}

/** Analytical result steps (excludes the final Next Steps card). */
export function isAnalyticalFocusResultSection(
  id: FocusResultSectionId,
): boolean {
  return id !== "nextSteps"
}
