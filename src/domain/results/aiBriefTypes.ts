import type { UncertaintyMarginalDistribution } from "@/domain/simulation/uncertaintyModelConfig"

export const AI_BRIEF_SCHEMA_VERSION = "ai-brief-v3" as const

/** Matches deterministic Tornado sort key: full isolated P10–P90 spread. */
export const AI_BRIEF_TORNADO_RANKING_METRIC = "spread" as const

/** Matches `ResultsPanel` / PDF tornado row count. */
export const AI_BRIEF_TORNADO_TOP_N = 6 as const

/** Top contributors kept before aggregating the exact remainder as Other. */
export const AI_BRIEF_CONTRIBUTION_TOP_N = 6 as const

/** Missing / omitted driver×cost impact pairs mean full effect. */
export const AI_BRIEF_DRIVER_IMPACT_DEFAULT_PCT = 100 as const

export type AiBriefDriverConcentration = "low" | "moderate" | "high"

export type AiBriefProjectMetrics = {
  baseCost: number | null
  expectedAddition: number | null
  expectedAdditionPct: number | null
  p50: number | null
  uncertaintyAllowance: number | null
  uncertaintyAllowancePct: number | null
  p85: number | null
}

export type AiBriefDistribution = {
  p10: number | null
  p50: number | null
  p85: number | null
  spreadP50ToP85: number | null
  spreadP50ToP85PctOfBase: number | null
}

export type AiBriefTornadoRankedFactor = {
  name: string
  type: "costItem" | "driver"
  p10Impact: number
  p90Impact: number
  /** Same metric used to rank the chart: `highImpact - lowImpact`. */
  spread: number
  rank: number
}

export type AiBriefProjectSignals = {
  uncertaintyGapP50ToP85: number | null
  uncertaintyGapPctOfBase: number | null
  /**
   * Top tornado factor share of total positive tornado spread among top N —
   * see `method.driverConcentrationDefinition` before interpreting.
   */
  driverConcentration: AiBriefDriverConcentration | null
}

export type AiBriefAssumption = {
  id: string
  text: string
}

export type AiBriefCostItem = {
  id: string
  name: string
  description: string | null
  optimisticPct: number | null
  mostLikely: number | null
  pessimisticPct: number | null
}

export type AiBriefDriverInput = {
  id: string
  name: string
  description: string | null
  optimisticPct: number | null
  mostLikely: number | null
  pessimisticPct: number | null
}

export type AiBriefDriverImpactOverride = {
  costItemId: string
  costItemName: string
  impactPct: number
}

export type AiBriefDriverImpact = {
  driverId: string
  driverName: string
  defaultImpactPct: typeof AI_BRIEF_DRIVER_IMPACT_DEFAULT_PCT
  /** Only pairs that differ from `defaultImpactPct` (typically 100). */
  overrides: AiBriefDriverImpactOverride[]
}

export type AiBriefCorrelationPair = {
  costItemAId: string
  costItemAName: string
  costItemBId: string
  costItemBName: string
  rho: number
}

export type AiBriefContributionFactor = {
  type: "costItem" | "driver" | "other"
  /** Null for the aggregated remainder bucket (`type: "other"`). */
  id: string | null
  name: string
  contribution: number
  /** 1-based among Top N only; null for `other`. */
  rank: number | null
}

export type AiBriefContributionDecomposition = {
  startValue: number
  endValue: number
  contributions: AiBriefContributionFactor[]
}

export type AiBriefContributionAnalysis =
  | { status: "notCalculated" }
  | {
      status: "calculated"
      expectedAddition: AiBriefContributionDecomposition
      uncertaintyReserve: AiBriefContributionDecomposition
      endpoints: {
        baseCost: number
        p50: number
        p85: number
        expectedAddition: number
        uncertaintyReserve: number
      }
    }

export type AiBriefProject = {
  id: string
  name: string
  /**
   * Human-facing project label for the receiving AI.
   * Equals `name` when unique in this brief; otherwise `name (1)`, `name (2)`, …
   * numbered by order in `projects[]`. Never use `id` in user-facing text.
   */
  displayName: string
  /** Fixed known costs already spent (not simulated as uncertain). */
  incurredCosts: number
  assumptions: AiBriefAssumption[]
  metrics: AiBriefProjectMetrics
  distribution: AiBriefDistribution
  tornado: {
    rankingMetric: typeof AI_BRIEF_TORNADO_RANKING_METRIC
    rankedFactors: AiBriefTornadoRankedFactor[]
  }
  contributionAnalysis: AiBriefContributionAnalysis
  signals: AiBriefProjectSignals
  costItems: AiBriefCostItem[]
  drivers: AiBriefDriverInput[]
  driverImpacts: AiBriefDriverImpact[]
  /** Sparse non-zero off-diagonal pairwise cost correlations (source of truth). */
  correlations: AiBriefCorrelationPair[]
}

export type AiBriefEstimateSemantics = {
  optimistic: "p10"
  mostLikely: "mode"
  pessimistic: "p90"
}

export type AiBriefMethod = {
  simulationType: "monte-carlo"
  distributionType: UncertaintyMarginalDistribution
  simulationCount: number
  estimateSemantics: AiBriefEstimateSemantics
  /**
   * Approx. 10% probability at/below P10 and at/above P90; triangular support
   * is calibrated from those percentiles and extends beyond them.
   */
  estimateInterpretation: {
    p10ProbabilityMassBelowOrAt: 0.1
    p90ProbabilityMassAboveOrAt: 0.1
    triangularSupportExtendsBeyondPercentiles: true
  }
  triangularSupportCalibratedFromPercentiles: true
  driversIndependent: true
  driversApplyMultiplicativelyAcrossCostBase: true
  driverImpactDefaultPct: typeof AI_BRIEF_DRIVER_IMPACT_DEFAULT_PCT
  driverImpactMayVaryByCostItem: true
  omittedDriverImpactMeansDefault: true
  /** Model capability: cost dependence via Gaussian copula when non-zero ρ exist. */
  costItemDependenceModel: "gaussian-copula"
  /** True when at least one project in this brief has a non-zero saved correlation. */
  costCorrelationsPresent: boolean
  omittedPairwiseCostCorrelationMeansZero: true
  diagonalCostCorrelationRho: 1
  costCorrelationsSymmetric: true
  /**
   * How `signals.driverConcentration` is derived from tornado Top N spreads.
   */
  driverConcentrationDefinition: {
    basis: "topTornadoFactorShareOfSumOfPositiveSpreadsAmongTopN"
    topN: typeof AI_BRIEF_TORNADO_TOP_N
    categories: {
      high: "topShare >= 0.50"
      moderate: "0.35 <= topShare < 0.50"
      low: "topShare < 0.35"
    }
  }
  /** Contribution lists keep Top N by |contribution| plus exact Other remainder. */
  contributionAnalysisCompaction: {
    topN: typeof AI_BRIEF_CONTRIBUTION_TOP_N
    otherAggregatesExactRemainder: true
    otherIsNotARealFactor: true
  }
}

export type AiBriefLabelSemantics = {
  userDefinedLabels: true
  definitionsMayBeProvidedPerCostItemAndDriver: true
  missingDefinitionMeansNameIsLabelOnly: true
}

export type AiBriefInterpretationHints = {
  primarySignals: readonly ("metrics" | "distribution" | "tornado" | "contributionAnalysis")[]
  contextualInputsForRobustness: readonly (
    "assumptions" | "costItems" | "drivers" | "driverImpacts" | "correlations"
  )[]
  tornadoMeansSensitivityNotAttribution: true
  contributionMeansAttributionOfExpectedAdditionAndReserve: true
  doNotConflateTornadoAndContribution: true
  contributionAbsenceIsNotAModellingWeakness: true
  useDriverConcentrationOnlyPerMethodDefinition: true
  emptyDriverImpactOverridesMeansDefaultOnAllCostItems: true
}

/**
 * Compact Ongoing development context for AI Brief.
 * Supporting history only — current/viewed analysis remains in `projects`.
 */
export type AiBriefOngoingDevelopmentPoint = {
  checkpointId: string
  sequence: number
  name: string
  baseCost: number | null
  expectedValue: number | null
  p50: number | null
  p85: number | null
  /**
   * Practical overall uncertainty-span indicator: P85 − Base Cost.
   * Not a mathematically complete measure of all uncertainty.
   */
  uncertaintySpanP85MinusBase: number | null
  /** Convenient secondary spread when both percentiles exist. */
  spreadP85MinusP50: number | null
  source: "archived" | "live"
}

export type AiBriefOngoingPreviousDeltas = {
  baseCost: number | null
  expectedValue: number | null
  p50: number | null
  p85: number | null
  uncertaintySpanP85MinusBase: number | null
  spreadP85MinusP50: number | null
}

export type AiBriefOngoingStructuralChanges = {
  costItemsAdded: number
  costItemsRemoved: number
  costRangesChanged: number
  driversAdded: number
  driversRemoved: number
  driverRangesChanged: number
}

export type AiBriefOngoingPreviousComparison = {
  previousCheckpointId: string
  previousSequence: number
  previousName: string
  deltas: AiBriefOngoingPreviousDeltas
  structural: AiBriefOngoingStructuralChanges
}

export type AiBriefOngoingDevelopment = {
  analysisMode: "ongoing"
  viewedCheckpointId: string
  viewedSequence: number
  viewedName: string
  viewedStatus: "draft" | "archived"
  /** False for the first checkpoint (or when no prior comparable point exists). */
  hasHistoricalDevelopment: boolean
  interpretationNotes: {
    currentCheckpointIsPrimaryFocus: true
    historyIsSupportingContext: true
    historyIncludesOnlyCheckpointsUpToViewed: true
    uncertaintySpanDefinition: "p85MinusBaseCost"
    uncertaintySpanIsPracticalIndicatorNotCompleteMeasure: true
    distinguishCostLevelMovementFromUncertaintyMovement: true
  }
  /** Chronological scalars up to and including the viewed checkpoint. */
  series: AiBriefOngoingDevelopmentPoint[]
  /** Deltas vs immediately preceding checkpoint when one exists. */
  previousComparison: AiBriefOngoingPreviousComparison | null
}

export type AiBriefV3 = {
  version: typeof AI_BRIEF_SCHEMA_VERSION
  generatedAt: string
  language: "no" | "en"
  method: AiBriefMethod
  labelSemantics: AiBriefLabelSemantics
  interpretationHints: AiBriefInterpretationHints
  analysis: {
    projectCount: number
    activeProjectId: string
    simulationCount: number
  }
  /**
   * Snapshot of the user's CURRENT on-screen Result Preferences at generation.
   * Additional context only — does not filter `projects` / analysis data.
   */
  currentResultView: AiBriefCurrentResultView
  projects: AiBriefProject[]
  /**
   * Ongoing Analysis only. Omitted for Single so the Single package stays unchanged.
   * Compact historical context; does not replace `projects` as the primary analysis.
   */
  ongoingDevelopment?: AiBriefOngoingDevelopment
}

export type AiBriefCurrentResultView = {
  keyFigures: {
    showBaseCost: boolean
    showExpectedValue: boolean
    showExpectedAddition: boolean
    showUncertaintyReserve: boolean
    showStdDev: boolean
    showProbabilityAtBaseCost: boolean
    percentiles: number[]
    primaryVisibleLabels: string[]
    probabilityBelowCostLevel: {
      enabled: boolean
      amount: number | null
      /** Authoritative P(total ≤ amount) per project when enabled + valid amount. */
      probabilityPercentByProjectId: Record<string, number | null> | null
    }
  }
  sCurve: {
    percentiles: number[]
  }
}

/** @deprecated Prefer `AiBriefV3`. */
export type AiBriefV2 = AiBriefV3
