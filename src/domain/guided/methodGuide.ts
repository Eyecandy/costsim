/**
 * Chronological Method Guide section order (excluding intro + tip sections).
 * Presentation-only — does not affect simulation or Guided Analysis workflow.
 */
export const METHOD_GUIDE_SECTION_IDS = [
  "analysisModes",
  "projectProfile",
  "costBasis",
  "assumptions",
  "incurredCosts",
  "costItems",
  "ranges",
  "drivers",
  "impact",
  "correlation",
  "runAnalysis",
  "interpretation",
  "workingApproach",
] as const

export type MethodGuideSectionId = (typeof METHOD_GUIDE_SECTION_IDS)[number]
