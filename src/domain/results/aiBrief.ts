import type { AnalysisCheckpoint } from "@/domain/analysis/analysisCheckpoint"
import {
  compareStructuralInputs,
  extractKeyFigureValue,
  resultSourceFromArchivedSnapshot,
  type CheckpointResultSource,
  type CheckpointStructuralChangeCounts,
} from "@/domain/analysis/checkpointComparison"
import { getPrecedingCheckpointPair } from "@/domain/analysis/checkpointDiff"
import type { CompactProjectResultV1 } from "@/domain/analysis/compactAnalysisResult"
import { computeDeterministicTornadoRows } from "@/domain/simulation/deterministicTornado"
import type { OngoingCheckpointResultSnapshotV1 } from "@/domain/analysis/ongoingCheckpointResultSnapshot"
import { buildOngoingDevelopmentSeries } from "@/domain/analysis/ongoingDevelopmentSeries"
import {
  computeUncertainDeltaWithPct,
  normalizeIncurredCosts,
  type CostCorrelationsByRowId,
  type DriverImpactsByRowId,
  type Project,
} from "@/domain/analysis/project"
import type { ResolvedResultView } from "@/domain/results/resultPreferences"
import {
  formatPercentileLabel,
  shouldShowProbabilityBelowCostLevel,
} from "@/domain/results/resultPreferences"
import type { ShapleyAttributionResult } from "@/domain/simulation/shapleyAttribution"
import { percentile, probabilityAtOrBelowPercent } from "@/domain/simulation/stats"
import {
  parseNumberField,
  resolveDriverImpactPercent,
  type CostElementRow,
  type DriverRow,
  type ScenarioRow,
} from "@/domain/results/tableRows"
import { uncertaintyModelConfig } from "@/domain/simulation/uncertaintyModelConfig"
import { summarizeSamples } from "@/domain/simulation/simulation"
import type { ProjectResult } from "@/domain/simulation/simulationTypes"
import { resolvePairRho } from "@/domain/simulation/costCorrelationSummaries"
import {
  AI_BRIEF_CONTRIBUTION_TOP_N,
  AI_BRIEF_DRIVER_IMPACT_DEFAULT_PCT,
  AI_BRIEF_SCHEMA_VERSION,
  AI_BRIEF_TORNADO_RANKING_METRIC,
  AI_BRIEF_TORNADO_TOP_N,
  type AiBriefAssumption,
  type AiBriefContributionAnalysis,
  type AiBriefContributionFactor,
  type AiBriefCorrelationPair,
  type AiBriefCostItem,
  type AiBriefCurrentResultView,
  type AiBriefDriverConcentration,
  type AiBriefDriverImpact,
  type AiBriefDriverImpactOverride,
  type AiBriefDriverInput,
  type AiBriefOngoingDevelopment,
  type AiBriefOngoingDevelopmentPoint,
  type AiBriefOngoingPreviousComparison,
  type AiBriefOngoingStructuralChanges,
  type AiBriefProject,
  type AiBriefV3,
} from "@/domain/results/aiBriefTypes"

const DRIVER_CONCENTRATION_HIGH_TOP_SHARE = 0.5
const DRIVER_CONCENTRATION_MODERATE_TOP_SHARE = 0.35

function scenarioRowHasContent(row: ScenarioRow): boolean {
  return (
    row.name.trim() !== "" ||
    row.optimistic.trim() !== "" ||
    row.likely.trim() !== "" ||
    row.pessimistic.trim() !== ""
  )
}

function optionalTrimmedText(raw: string | undefined): string | null {
  if (typeof raw !== "string") return null
  const t = raw.trim()
  return t === "" ? null : t
}

/**
 * Brief-only presentation labels. Duplicate `name` values get `(1)`, `(2)`, …
 * in `projects[]` order. Unique names are left unchanged. Does not mutate
 * stored project names.
 */
export function buildProjectDisplayNames(projects: readonly { name: string }[]): string[] {
  const counts = new Map<string, number>()
  for (const p of projects) {
    counts.set(p.name, (counts.get(p.name) ?? 0) + 1)
  }
  const occurrence = new Map<string, number>()
  return projects.map((p) => {
    if ((counts.get(p.name) ?? 0) <= 1) return p.name
    const n = (occurrence.get(p.name) ?? 0) + 1
    occurrence.set(p.name, n)
    return `${p.name} (${n})`
  })
}

function deriveDriverConcentration(
  rankedFactors: readonly { spread: number }[],
): AiBriefDriverConcentration | null {
  if (rankedFactors.length === 0) return null
  const spreads = rankedFactors.map((f) => f.spread).filter((s) => Number.isFinite(s) && s > 0)
  if (spreads.length === 0) return null
  const total = spreads.reduce((sum, s) => sum + s, 0)
  if (total <= 0) return null
  const topShare = spreads[0]! / total
  if (topShare >= DRIVER_CONCENTRATION_HIGH_TOP_SHARE) return "high"
  if (topShare >= DRIVER_CONCENTRATION_MODERATE_TOP_SHARE) return "moderate"
  return "low"
}

function buildTornadoForProject(
  project: Project,
  pr: ProjectResult | undefined,
): AiBriefProject["tornado"] {
  if (!pr || pr.values.length === 0) {
    return { rankingMetric: AI_BRIEF_TORNADO_RANKING_METRIC, rankedFactors: [] }
  }
  const rows = computeDeterministicTornadoRows(project, AI_BRIEF_TORNADO_TOP_N)
  return {
    rankingMetric: AI_BRIEF_TORNADO_RANKING_METRIC,
    rankedFactors: rows.map((r, i) => ({
      name: r.name,
      type: r.type === "driver" ? "driver" : "costItem",
      p10Impact: r.lowImpact,
      p90Impact: r.highImpact,
      spread: r.spread,
      rank: i + 1,
    })),
  }
}

function mapAssumptions(project: Project): AiBriefAssumption[] {
  const list = project.assumptions ?? []
  return list.map((a) => ({ id: a.id, text: a.text }))
}

function mapCostRows(rows: readonly CostElementRow[]): AiBriefCostItem[] {
  return rows.filter(scenarioRowHasContent).map((row) => ({
    id: row.id,
    name: row.name.trim(),
    description: optionalTrimmedText(row.description),
    optimisticPct: parseNumberField(row.optimistic),
    mostLikely: parseNumberField(row.likely),
    pessimisticPct: parseNumberField(row.pessimistic),
  }))
}

function mapDriverRows(rows: readonly DriverRow[]): AiBriefDriverInput[] {
  return rows.filter(scenarioRowHasContent).map((row) => ({
    id: row.id,
    name: row.name.trim(),
    description: optionalTrimmedText(row.description),
    optimisticPct: parseNumberField(row.optimistic),
    mostLikely: parseNumberField(row.likely),
    pessimisticPct: parseNumberField(row.pessimistic),
  }))
}

/** Sparse non-zero off-diagonal pairs from the stored correlation map. */
export function collectNonZeroCostCorrelations(
  costRows: readonly CostElementRow[],
  costCorrelations: CostCorrelationsByRowId | undefined,
): AiBriefCorrelationPair[] {
  const items = costRows.filter(scenarioRowHasContent)
  const out: AiBriefCorrelationPair[] = []
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      const a = items[i]!
      const b = items[j]!
      const rho = resolvePairRho(costCorrelations, a.id, b.id)
      if (rho === 0) continue
      out.push({
        costItemAId: a.id,
        costItemAName: a.name.trim(),
        costItemBId: b.id,
        costItemBName: b.name.trim(),
        rho,
      })
    }
  }
  return out
}

export function buildDriverImpactEntries(
  costRows: readonly CostElementRow[],
  driverRows: readonly DriverRow[],
  driverImpacts: DriverImpactsByRowId | undefined,
): AiBriefDriverImpact[] {
  const costs = costRows.filter(scenarioRowHasContent)
  const drivers = driverRows.filter(scenarioRowHasContent)
  return drivers.map((driver) => {
    const overrides: AiBriefDriverImpactOverride[] = []
    for (const cost of costs) {
      const impactPct = resolveDriverImpactPercent(driverImpacts?.[driver.id]?.[cost.id])
      if (impactPct === AI_BRIEF_DRIVER_IMPACT_DEFAULT_PCT) continue
      overrides.push({
        costItemId: cost.id,
        costItemName: cost.name.trim(),
        impactPct,
      })
    }
    return {
      driverId: driver.id,
      driverName: driver.name.trim(),
      defaultImpactPct: AI_BRIEF_DRIVER_IMPACT_DEFAULT_PCT,
      overrides,
    }
  })
}

function mapShapleyType(type: "cost" | "driver"): "costItem" | "driver" {
  return type === "cost" ? "costItem" : "driver"
}

/**
 * Keep Top N by absolute contribution; aggregate the exact remainder as Other.
 * Preserves signed contributions (including negatives).
 */
export function compactContributionFactors(
  contributions: readonly {
    type: "cost" | "driver"
    id: string
    name: string
    contribution: number
  }[],
  otherLabel: string,
): AiBriefContributionFactor[] {
  const ranked = [...contributions].sort(
    (a, b) => Math.abs(b.contribution) - Math.abs(a.contribution),
  )
  const top = ranked.slice(0, AI_BRIEF_CONTRIBUTION_TOP_N)
  const rest = ranked.slice(AI_BRIEF_CONTRIBUTION_TOP_N)
  const mapped: AiBriefContributionFactor[] = top.map((c, i) => ({
    type: mapShapleyType(c.type),
    id: c.id,
    name: c.name,
    contribution: c.contribution,
    rank: i + 1,
  }))
  if (rest.length === 0) return mapped
  const otherSum = rest.reduce((sum, c) => sum + c.contribution, 0)
  mapped.push({
    type: "other",
    id: null,
    name: otherLabel,
    contribution: otherSum,
    rank: null,
  })
  return mapped
}

export function mapContributionAnalysis(
  result: ShapleyAttributionResult | null | undefined,
  language: "no" | "en" = "en",
): AiBriefContributionAnalysis {
  if (!result) return { status: "notCalculated" }
  const otherLabel = language === "no" ? "Øvrige" : "Other"
  return {
    status: "calculated",
    expectedAddition: {
      startValue: result.expectedAdditionDecomposition.startValue,
      endValue: result.expectedAdditionDecomposition.endValue,
      contributions: compactContributionFactors(
        result.expectedAdditionDecomposition.contributions,
        otherLabel,
      ),
    },
    uncertaintyReserve: {
      startValue: result.uncertaintyReserveDecomposition.startValue,
      endValue: result.uncertaintyReserveDecomposition.endValue,
      contributions: compactContributionFactors(
        result.uncertaintyReserveDecomposition.contributions,
        otherLabel,
      ),
    },
    endpoints: {
      baseCost: result.baseCost,
      p50: result.estimatedP50,
      p85: result.estimatedP85,
      expectedAddition: result.expectedAddition,
      uncertaintyReserve: result.uncertaintyReserve,
    },
  }
}

function projectHasNonZeroCorrelations(project: Project): boolean {
  return collectNonZeroCostCorrelations(project.costRows, project.costCorrelations).length > 0
}

export function buildAiBriefCurrentResultView(opts: {
  resultView: ResolvedResultView
  projects: readonly { id: string }[]
  projectResults: readonly ProjectResult[]
  ongoingCompactResult?: OngoingCheckpointResultSnapshotV1 | null
  compactByProjectId?: Readonly<Record<string, CompactProjectResultV1>>
}): AiBriefCurrentResultView {
  const { resultView, projects, projectResults, ongoingCompactResult, compactByProjectId } = opts
  const kf = resultView.keyFigures
  const primaryVisibleLabels: string[] = []
  if (kf.showBaseCost) primaryVisibleLabels.push("baseCost")
  if (kf.showExpectedAddition) primaryVisibleLabels.push("expectedAddition")
  for (const p of kf.percentiles) {
    primaryVisibleLabels.push(formatPercentileLabel(p))
  }
  if (kf.showUncertaintyReserve) primaryVisibleLabels.push("uncertaintyReserve")
  if (kf.showExpectedValue) primaryVisibleLabels.push("expectedValue")
  if (kf.showStdDev) primaryVisibleLabels.push("standardDeviation")
  if (kf.showProbabilityAtBaseCost) {
    primaryVisibleLabels.push("probabilityAtBaseCost")
  }

  let probabilityPercentByProjectId: Record<string, number | null> | null = null
  if (shouldShowProbabilityBelowCostLevel(kf.probabilityBelowCostLevel)) {
    const amount = kf.probabilityBelowCostLevel.amount!
    primaryVisibleLabels.push("probabilityBelowCostLevel")
    probabilityPercentByProjectId = {}
    for (const project of projects) {
      const values = projectResults.find((r) => r.projectId === project.id)?.values ?? []
      const compact =
        compactByProjectId?.[project.id] ??
        (ongoingCompactResult?.activeProjectId === project.id ? ongoingCompactResult : null)
      probabilityPercentByProjectId[project.id] = compact
        ? compact.keyFigures.probBelowCostLevel
        : probabilityAtOrBelowPercent(values, amount)
    }
  }

  return {
    keyFigures: {
      showBaseCost: kf.showBaseCost,
      showExpectedValue: kf.showExpectedValue,
      showExpectedAddition: kf.showExpectedAddition,
      showUncertaintyReserve: kf.showUncertaintyReserve,
      showStdDev: kf.showStdDev,
      showProbabilityAtBaseCost: kf.showProbabilityAtBaseCost,
      percentiles: [...kf.percentiles],
      primaryVisibleLabels,
      probabilityBelowCostLevel: {
        enabled: kf.probabilityBelowCostLevel.enabled,
        amount: kf.probabilityBelowCostLevel.amount,
        probabilityPercentByProjectId,
      },
    },
    sCurve: {
      percentiles: [...resultView.sCurve.percentiles],
    },
  }
}

export function buildAiBriefV3(opts: {
  language: "no" | "en"
  projects: Project[]
  activeProjectId: string
  projectResults: ProjectResult[]
  simulatedBaseCostByProjectId: Record<string, number | null>
  simulationCount: number
  /** Already-calculated Shapley results only; omit or null → notCalculated. */
  contributionAnalysisByProjectId?: Readonly<
    Record<string, ShapleyAttributionResult | null | undefined>
  >
  /** Active Result View snapshot at Generate time (session draft, not localStorage). */
  resultView: ResolvedResultView
  /** Frozen Ongoing scalars/attribution; avoids historical recomputation. */
  ongoingCompactResult?: OngoingCheckpointResultSnapshotV1 | null
  compactByProjectId?: Readonly<Record<string, CompactProjectResultV1>>
  /**
   * Ongoing Analysis only — compact development context up to the viewed checkpoint.
   * Omit for Single Analysis.
   */
  ongoingDevelopment?: AiBriefOngoingDevelopment | null
  generatedAt?: string
}): AiBriefV3 {
  const {
    language,
    projects,
    activeProjectId,
    projectResults,
    simulatedBaseCostByProjectId,
    simulationCount,
    contributionAnalysisByProjectId,
    resultView,
    generatedAt = new Date().toISOString(),
    ongoingCompactResult,
    compactByProjectId,
    ongoingDevelopment,
  } = opts

  const costCorrelationsPresent = projects.some(projectHasNonZeroCorrelations)
  const displayNames = buildProjectDisplayNames(projects)
  const currentResultView = buildAiBriefCurrentResultView({
    resultView,
    projects,
    projectResults,
    ongoingCompactResult,
    compactByProjectId,
  })

  const projectsOut: AiBriefProject[] = projects.map((project, index) => {
    const pr = projectResults.find((r) => r.projectId === project.id)
    const compact =
      compactByProjectId?.[project.id] ??
      (ongoingCompactResult?.activeProjectId === project.id ? ongoingCompactResult : null)
    const values = pr?.values ?? []
    const summary = summarizeSamples(values)
    const base = compact?.keyFigures.baseCost ?? simulatedBaseCostByProjectId[project.id] ?? null
    const p50 = compact?.keyFigures.percentiles["50"] ?? summary.median
    const p85 = compact?.keyFigures.percentiles["85"] ?? summary.p85
    const incurred = normalizeIncurredCosts(compact?.incurredCosts ?? project.incurredCosts)
    const expected = compact
      ? {
          absolute: compact.keyFigures.expectedAddition,
          percent: compact.keyFigures.expectedAdditionPct,
        }
      : computeUncertainDeltaWithPct(p50, base, incurred)
    const uncertainty = compact
      ? {
          absolute: compact.keyFigures.uncertaintyReserve,
          percent: compact.keyFigures.uncertaintyReservePct,
        }
      : computeUncertainDeltaWithPct(p85, p50, incurred)
    const p10 =
      compact?.keyFigures.percentiles["10"] ?? (values.length > 0 ? percentile(values, 10) : null)
    const spreadP50ToP85 =
      p50 !== null && p85 !== null && Number.isFinite(p50) && Number.isFinite(p85)
        ? p85 - p50
        : null
    const uncertainBase = base !== null ? base - incurred : null
    const spreadP50ToP85PctOfBase =
      spreadP50ToP85 !== null && uncertainBase !== null && uncertainBase !== 0
        ? (spreadP50ToP85 / uncertainBase) * 100
        : null
    const tornado = compact
      ? {
          rankingMetric: AI_BRIEF_TORNADO_RANKING_METRIC,
          rankedFactors: (compact.tornado ?? []).map((row, rank) => ({
            name: row.name,
            type: row.type === "driver" ? ("driver" as const) : ("costItem" as const),
            p10Impact: row.lowImpact,
            p90Impact: row.highImpact,
            spread: row.spread,
            rank: rank + 1,
          })),
        }
      : buildTornadoForProject(project, pr)
    const correlations = collectNonZeroCostCorrelations(project.costRows, project.costCorrelations)

    return {
      id: project.id,
      name: project.name,
      displayName: displayNames[index]!,
      incurredCosts: incurred,
      assumptions: mapAssumptions(project),
      metrics: {
        baseCost: base,
        expectedAddition: expected.absolute,
        expectedAdditionPct: expected.percent,
        p50,
        uncertaintyAllowance: uncertainty.absolute,
        uncertaintyAllowancePct: uncertainty.percent,
        p85,
      },
      distribution: {
        p10,
        p50,
        p85,
        spreadP50ToP85,
        spreadP50ToP85PctOfBase,
      },
      tornado,
      contributionAnalysis: mapContributionAnalysis(
        contributionAnalysisByProjectId?.[project.id],
        language,
      ),
      signals: {
        uncertaintyGapP50ToP85: spreadP50ToP85,
        uncertaintyGapPctOfBase: spreadP50ToP85PctOfBase,
        driverConcentration: deriveDriverConcentration(tornado.rankedFactors),
      },
      costItems: mapCostRows(project.costRows),
      drivers: mapDriverRows(project.driverRows),
      driverImpacts: buildDriverImpactEntries(
        project.costRows,
        project.driverRows,
        project.driverImpacts,
      ),
      correlations,
    }
  })

  return {
    version: AI_BRIEF_SCHEMA_VERSION,
    generatedAt,
    language,
    method: {
      simulationType: "monte-carlo",
      distributionType: uncertaintyModelConfig.marginalDistribution,
      simulationCount,
      estimateSemantics: {
        optimistic: "p10",
        mostLikely: "mode",
        pessimistic: "p90",
      },
      estimateInterpretation: {
        p10ProbabilityMassBelowOrAt: 0.1,
        p90ProbabilityMassAboveOrAt: 0.1,
        triangularSupportExtendsBeyondPercentiles: true,
      },
      triangularSupportCalibratedFromPercentiles: true,
      driversIndependent: true,
      driversApplyMultiplicativelyAcrossCostBase: true,
      driverImpactDefaultPct: AI_BRIEF_DRIVER_IMPACT_DEFAULT_PCT,
      driverImpactMayVaryByCostItem: true,
      omittedDriverImpactMeansDefault: true,
      costItemDependenceModel: "gaussian-copula",
      costCorrelationsPresent,
      omittedPairwiseCostCorrelationMeansZero: true,
      diagonalCostCorrelationRho: 1,
      costCorrelationsSymmetric: true,
      driverConcentrationDefinition: {
        basis: "topTornadoFactorShareOfSumOfPositiveSpreadsAmongTopN",
        topN: AI_BRIEF_TORNADO_TOP_N,
        categories: {
          high: "topShare >= 0.50",
          moderate: "0.35 <= topShare < 0.50",
          low: "topShare < 0.35",
        },
      },
      contributionAnalysisCompaction: {
        topN: AI_BRIEF_CONTRIBUTION_TOP_N,
        otherAggregatesExactRemainder: true,
        otherIsNotARealFactor: true,
      },
    },
    labelSemantics: {
      userDefinedLabels: true,
      definitionsMayBeProvidedPerCostItemAndDriver: true,
      missingDefinitionMeansNameIsLabelOnly: true,
    },
    interpretationHints: {
      primarySignals: ["metrics", "distribution", "tornado", "contributionAnalysis"],
      contextualInputsForRobustness: [
        "assumptions",
        "costItems",
        "drivers",
        "driverImpacts",
        "correlations",
      ],
      tornadoMeansSensitivityNotAttribution: true,
      contributionMeansAttributionOfExpectedAdditionAndReserve: true,
      doNotConflateTornadoAndContribution: true,
      contributionAbsenceIsNotAModellingWeakness: true,
      useDriverConcentrationOnlyPerMethodDefinition: true,
      emptyDriverImpactOverridesMeansDefaultOnAllCostItems: true,
    },
    analysis: {
      projectCount: projects.length,
      activeProjectId,
      simulationCount,
    },
    currentResultView,
    projects: projectsOut,
    ...(ongoingDevelopment ? { ongoingDevelopment } : {}),
  }
}

function finiteDelta(current: number | null, previous: number | null): number | null {
  if (
    current === null ||
    previous === null ||
    !Number.isFinite(current) ||
    !Number.isFinite(previous)
  ) {
    return null
  }
  return current - previous
}

function spanP85MinusBase(baseCost: number | null, p85: number | null): number | null {
  return finiteDelta(p85, baseCost)
}

function spanP85MinusP50(p50: number | null, p85: number | null): number | null {
  return finiteDelta(p85, p50)
}

function mapStructuralForBrief(
  structural: CheckpointStructuralChangeCounts,
): AiBriefOngoingStructuralChanges {
  return {
    costItemsAdded: structural.costItemsAdded,
    costItemsRemoved: structural.costItemsRemoved,
    costRangesChanged: structural.costRangesChanged,
    driversAdded: structural.driversAdded,
    driversRemoved: structural.driversRemoved,
    driverRangesChanged: structural.driverRangesChanged,
  }
}

/**
 * Checkpoints at or before the viewed sequence — never leaks later history.
 */
export function filterCheckpointsUpToViewed(
  checkpoints: readonly AnalysisCheckpoint[],
  viewedCheckpointId: string,
): AnalysisCheckpoint[] {
  const ordered = [...checkpoints].sort((a, b) => a.sequence - b.sequence)
  const viewed = ordered.find((c) => c.id === viewedCheckpointId)
  if (!viewed) return []
  return ordered.filter((c) => c.sequence <= viewed.sequence)
}

function resultSourceForCheckpointPoint(
  checkpoint: AnalysisCheckpoint,
  viewedCheckpointId: string,
  viewedResultSource: CheckpointResultSource | null | undefined,
): CheckpointResultSource | null {
  if (checkpoint.status === "archived") {
    return resultSourceFromArchivedSnapshot(checkpoint)
  }
  if (
    checkpoint.id === viewedCheckpointId &&
    viewedResultSource &&
    viewedResultSource.resultsComparable
  ) {
    return viewedResultSource
  }
  return null
}

function expectedValueFromSource(source: CheckpointResultSource, projectId: string): number | null {
  return extractKeyFigureValue(source, projectId, "expectedValue")
}

/**
 * Build compact Ongoing development context for AI Brief.
 * Uses frozen archived snapshots and the already-hydrated viewed result source.
 * Does not re-run Monte Carlo or persist new KPIs.
 */
export function buildAiBriefOngoingDevelopment(args: {
  checkpoints: readonly AnalysisCheckpoint[]
  viewedCheckpointId: string
  viewedResultSource?: CheckpointResultSource | null
}): AiBriefOngoingDevelopment | null {
  const viewed = args.checkpoints.find((c) => c.id === args.viewedCheckpointId)
  if (!viewed) return null

  const scoped = filterCheckpointsUpToViewed(args.checkpoints, args.viewedCheckpointId)
  if (scoped.length === 0) return null

  const viewedIsDraft = viewed.status === "draft"
  const seriesBase = buildOngoingDevelopmentSeries({
    checkpoints: scoped,
    viewedCheckpointId: viewedIsDraft ? viewed.id : null,
    viewedResultSource: viewedIsDraft ? (args.viewedResultSource ?? null) : null,
  })

  const series: AiBriefOngoingDevelopmentPoint[] = seriesBase.points.map((point) => {
    const checkpoint = scoped.find((c) => c.id === point.checkpointId)
    const projectId =
      checkpoint?.workspace.projects[0]?.id ??
      (checkpoint?.status === "archived"
        ? resultSourceFromArchivedSnapshot(checkpoint)?.compact?.activeProjectId
        : null) ??
      args.viewedResultSource?.compact?.activeProjectId ??
      args.viewedResultSource?.projectResults[0]?.projectId ??
      null
    const source = checkpoint
      ? resultSourceForCheckpointPoint(checkpoint, args.viewedCheckpointId, args.viewedResultSource)
      : null
    const expectedValue = source && projectId ? expectedValueFromSource(source, projectId) : null
    return {
      checkpointId: point.checkpointId,
      sequence: point.sequence,
      name: point.name,
      baseCost: point.baseCost,
      expectedValue,
      p50: point.p50,
      p85: point.p85,
      uncertaintySpanP85MinusBase: spanP85MinusBase(point.baseCost, point.p85),
      spreadP85MinusP50: spanP85MinusP50(point.p50, point.p85),
      source: point.source,
    }
  })

  const pair = getPrecedingCheckpointPair(scoped, args.viewedCheckpointId)
  let previousComparison: AiBriefOngoingPreviousComparison | null = null
  if (pair && series.length >= 2) {
    const currentPoint = series[series.length - 1]!
    const previousPoint = series[series.length - 2]!
    if (
      previousPoint.checkpointId === pair.earlier.id &&
      currentPoint.checkpointId === pair.later.id
    ) {
      previousComparison = {
        previousCheckpointId: pair.earlier.id,
        previousSequence: pair.earlier.sequence,
        previousName: pair.earlier.name,
        deltas: {
          baseCost: finiteDelta(currentPoint.baseCost, previousPoint.baseCost),
          expectedValue: finiteDelta(currentPoint.expectedValue, previousPoint.expectedValue),
          p50: finiteDelta(currentPoint.p50, previousPoint.p50),
          p85: finiteDelta(currentPoint.p85, previousPoint.p85),
          uncertaintySpanP85MinusBase: finiteDelta(
            currentPoint.uncertaintySpanP85MinusBase,
            previousPoint.uncertaintySpanP85MinusBase,
          ),
          spreadP85MinusP50: finiteDelta(
            currentPoint.spreadP85MinusP50,
            previousPoint.spreadP85MinusP50,
          ),
        },
        structural: mapStructuralForBrief(compareStructuralInputs(pair.earlier, pair.later)),
      }
    }
  }

  return {
    analysisMode: "ongoing",
    viewedCheckpointId: viewed.id,
    viewedSequence: viewed.sequence,
    viewedName: viewed.name,
    viewedStatus: viewed.status,
    hasHistoricalDevelopment: series.length > 1,
    interpretationNotes: {
      currentCheckpointIsPrimaryFocus: true,
      historyIsSupportingContext: true,
      historyIncludesOnlyCheckpointsUpToViewed: true,
      uncertaintySpanDefinition: "p85MinusBaseCost",
      uncertaintySpanIsPracticalIndicatorNotCompleteMeasure: true,
      distinguishCostLevelMovementFromUncertaintyMovement: true,
    },
    series,
    previousComparison,
  }
}

/** @deprecated Use `buildAiBriefV3`. */
export const buildAiBriefV2 = buildAiBriefV3

/** @deprecated Use `buildAiBriefV3`. */
export const buildAiBriefV1 = buildAiBriefV3
