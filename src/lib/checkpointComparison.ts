/**
 * Domain-level Ongoing Analysis checkpoint comparison.
 *
 * Presentation-agnostic: reusable by Results UI, PDF, AI Brief, overlays later.
 * Does not re-run Monte Carlo — derives key figures from stored/hydrated results
 * the same way Key Figures does (percentile / mean / base map).
 *
 * Metric ids match the main Key Figures table (`baseCost`, `p50`, …).
 * Visibility/order are applied in presentation via `listVisibleComparableKeyFigureRowIds`.
 */

import type { AnalysisCheckpoint } from "@/lib/analysisCheckpoint"
import {
  diffRowIds,
  getPrecedingCheckpointPair,
} from "@/lib/checkpointDiff"
import type { KeyFigureRowId } from "@/lib/keyFigureVisibility"
import { keyFigureInlinePercentCompanionId } from "@/lib/keyFigureVisibility"
import { computeUncertainDeltaWithPct } from "@/lib/project"
import {
  mean,
  percentile,
  probabilityAtOrBelowPercent,
  relativeStandardDeviationPercent,
  standardDeviation,
} from "@/lib/stats"
import type { ScenarioRow } from "@/lib/tableRows"
import type { ProjectResult } from "@/simulation.worker"
import {
  extractKeyFigureFromOngoingSnapshot,
  isOngoingCheckpointResultSnapshot,
  type OngoingCheckpointResultSnapshotV1,
} from "@/lib/ongoingCheckpointResultSnapshot"

/** @deprecated Prefer KeyFigureRowId — kept as alias for call-site clarity. */
export type CheckpointKeyFigureMetricId = KeyFigureRowId

export type CheckpointKeyFigureDelta = {
  /** Same id as ResultsKeyFiguresTable / buildKeyFigureMetricTableRows. */
  metric: KeyFigureRowId
  previous: number | null
  current: number | null
  /** current − previous; null if either side is null or locked */
  change: number | null
  /**
   * Inline % companion (same formulas as main Key Figures) when the metric
   * displays absolute + % in one cell. Not a separate row.
   */
  previousPercent?: number | null
  currentPercent?: number | null
  /** currentPercent − previousPercent (percentage points). */
  changePercent?: number | null
}

/**
 * Structural input diffs (counts only for v1).
 * Extra optional fields reserved so later categories can attach without rewrite.
 */
export type CheckpointStructuralChangeCounts = {
  costItemsAdded: number
  costItemsRemoved: number
  costRangesChanged: number
  driversAdded: number
  driversRemoved: number
  driverRangesChanged: number
  /** Reserved — not populated in v1 UI */
  impactsChanged?: number
  correlationsChanged?: number
  assumptionsChanged?: number
  profileChanged?: boolean
}

export type CheckpointKeyFiguresUnavailableReason =
  | "missing_previous_results"
  | "missing_current_results"
  | "stale_current_results"

/** Frozen previous distribution for S-curve reference (no Monte Carlo rerun). */
export type CheckpointSCurveReference = {
  checkpointId: string
  sequence: number
  name: string
  projectId: string
  /** Legacy Monte Carlo totals. */
  values?: readonly number[]
  /** Compact display CDF for lightweight Ongoing checkpoints. */
  displayPoints?: readonly { x: number; y: number }[]
}

export type CheckpointComparisonBaseline = {
  kind: "baseline"
  currentCheckpointId: string
  currentSequence: number
  currentName: string
}

export type CheckpointComparisonPair = {
  kind: "comparison"
  currentCheckpointId: string
  currentSequence: number
  currentName: string
  previousCheckpointId: string
  previousSequence: number
  previousName: string
  /**
   * Result deltas keyed by Key Figure row id (unordered bag).
   * Presentation filters/orders via active Result Preferences.
   * Null when unavailable — never invent zeros.
   */
  keyFigures: CheckpointKeyFigureDelta[] | null
  keyFiguresUnavailableReason?: CheckpointKeyFiguresUnavailableReason
  structural: CheckpointStructuralChangeCounts
  extensions?: {
    sCurve?: { previous: CheckpointSCurveReference }
    tornado?: unknown
    contribution?: unknown
  }
}

export type CheckpointComparison =
  | CheckpointComparisonBaseline
  | CheckpointComparisonPair

export type CheckpointResultSource = {
  projectResults: readonly ProjectResult[]
  simulatedBaseCostByProjectId: Readonly<Record<string, number | null>>
  compact?: OngoingCheckpointResultSnapshotV1
  /**
   * When false (stale live inputs, or empty), key-figure deltas are omitted.
   * Structural input comparison still runs.
   */
  resultsComparable: boolean
}

/** Optional presentation inputs needed for preference-dependent metrics. */
export type CheckpointKeyFigureExtractOptions = {
  /** Active Result Preferences threshold for probability-below row. */
  probabilityBelowAmount?: number | null
}

function rangeFieldsEqual(a: ScenarioRow, b: ScenarioRow): boolean {
  return (
    a.optimistic.trim() === b.optimistic.trim() &&
    a.likely.trim() === b.likely.trim() &&
    a.pessimistic.trim() === b.pessimistic.trim()
  )
}

function countRangeChanges(
  sharedIds: readonly string[],
  earlierById: Readonly<Record<string, ScenarioRow>>,
  laterById: Readonly<Record<string, ScenarioRow>>,
): number {
  let n = 0
  for (const id of sharedIds) {
    const earlier = earlierById[id]
    const later = laterById[id]
    if (!earlier || !later) continue
    if (!rangeFieldsEqual(earlier, later)) n += 1
  }
  return n
}

/**
 * Extract a Key Figure absolute value for a row id from a result source.
 * Mirrors the numeric basis used by ResultsKeyFiguresTable.
 */
export function extractKeyFigureValue(
  source: Pick<
    CheckpointResultSource,
    "projectResults" | "simulatedBaseCostByProjectId" | "compact"
  >,
  projectId: string,
  metricId: KeyFigureRowId,
  options?: CheckpointKeyFigureExtractOptions,
): number | null {
  if (source.compact && source.compact.activeProjectId === projectId) {
    return extractKeyFigureFromOngoingSnapshot(source.compact, metricId)
  }
  const pr = source.projectResults.find((r) => r.projectId === projectId)
  if (!pr || pr.values.length === 0) return null
  const values = pr.values
  const baseCost = source.simulatedBaseCostByProjectId[projectId] ?? null
  const p50 = percentile(values, 50)
  const p85 = percentile(values, 85)

  if (metricId === "baseCost") return baseCost
  if (metricId === "expectedAddition") {
    return computeUncertainDeltaWithPct(p50, baseCost, pr.incurredCosts)
      .absolute
  }
  if (metricId === "expectedAdditionPct") {
    return computeUncertainDeltaWithPct(p50, baseCost, pr.incurredCosts)
      .percent
  }
  if (metricId === "uncertaintyReserve") {
    return computeUncertainDeltaWithPct(p85, p50, pr.incurredCosts).absolute
  }
  if (metricId === "uncertaintyReservePct") {
    return computeUncertainDeltaWithPct(p85, p50, pr.incurredCosts).percent
  }
  if (metricId === "expectedValue") return mean(values)
  if (metricId === "stdDev") return standardDeviation(values)
  if (metricId === "stdDevPct") {
    return relativeStandardDeviationPercent(
      standardDeviation(values),
      mean(values),
    )
  }
  if (metricId === "probAtBase") {
    if (baseCost === null) return null
    return probabilityAtOrBelowPercent(values, baseCost)
  }
  if (metricId === "probBelowCostLevel") {
    const amount = options?.probabilityBelowAmount
    if (amount === null || amount === undefined || !Number.isFinite(amount)) {
      return null
    }
    return probabilityAtOrBelowPercent(values, amount)
  }
  const percentileMatch = /^p(\d+)$/.exec(metricId)
  if (percentileMatch) {
    return percentile(values, Number(percentileMatch[1]))
  }
  return null
}

/** @deprecated Prefer extractKeyFigureValue — retained for focused tests. */
export function extractKeyFiguresFromResultSource(
  source: Pick<
    CheckpointResultSource,
    "projectResults" | "simulatedBaseCostByProjectId" | "compact"
  >,
  projectId: string,
): {
  baseCost: number | null
  expectedAddition: number | null
  p50: number | null
  p85: number | null
  uncertaintyReserve: number | null
  expectedValue: number | null
} | null {
  const pr = source.projectResults.find((r) => r.projectId === projectId)
  if ((!pr || pr.values.length === 0) && !source.compact) return null
  return {
    baseCost: extractKeyFigureValue(source, projectId, "baseCost"),
    expectedAddition: extractKeyFigureValue(
      source,
      projectId,
      "expectedAddition",
    ),
    p50: extractKeyFigureValue(source, projectId, "p50"),
    p85: extractKeyFigureValue(source, projectId, "p85"),
    uncertaintyReserve: extractKeyFigureValue(
      source,
      projectId,
      "uncertaintyReserve",
    ),
    expectedValue: extractKeyFigureValue(source, projectId, "expectedValue"),
  }
}

export function resultSourceFromArchivedSnapshot(
  checkpoint: AnalysisCheckpoint,
): CheckpointResultSource | null {
  const snap = checkpoint.archivedSnapshot
  if (!snap) return null
  if (isOngoingCheckpointResultSnapshot(snap)) {
    return {
      projectResults: [],
      simulatedBaseCostByProjectId: {
        [snap.activeProjectId]: snap.simulatedBaseCost,
      },
      compact: snap,
      resultsComparable: true,
    }
  }
  if (snap.projectResults.length === 0) return null
  return {
    projectResults: snap.projectResults,
    simulatedBaseCostByProjectId: snap.simulatedBaseCostByProjectId,
    resultsComparable: true,
  }
}

function sCurveReferenceFromCheckpoint(
  checkpoint: AnalysisCheckpoint,
  projectId: string,
): CheckpointSCurveReference | undefined {
  const snap = checkpoint.archivedSnapshot
  if (isOngoingCheckpointResultSnapshot(snap)) {
    if (snap.activeProjectId !== projectId || snap.sCurve.points.length === 0) {
      return undefined
    }
    return {
      checkpointId: checkpoint.id,
      sequence: checkpoint.sequence,
      name: checkpoint.name,
      projectId,
      displayPoints: snap.sCurve.points,
    }
  }
  const pr = snap?.projectResults.find((r) => r.projectId === projectId)
  if (!pr || pr.values.length === 0) return undefined
  return {
    checkpointId: checkpoint.id,
    sequence: checkpoint.sequence,
    name: checkpoint.name,
    projectId,
    values: pr.values,
  }
}

/** Build deltas for the given metric ids (typically all comparable visibles). */
export function buildKeyFigureDeltas(args: {
  previous: Pick<
    CheckpointResultSource,
    "projectResults" | "simulatedBaseCostByProjectId" | "compact"
  >
  current: Pick<
    CheckpointResultSource,
    "projectResults" | "simulatedBaseCostByProjectId" | "compact"
  >
  projectId: string
  metricIds: readonly KeyFigureRowId[]
  options?: CheckpointKeyFigureExtractOptions
}): CheckpointKeyFigureDelta[] {
  const { previous, current, projectId, metricIds, options } = args
  return metricIds.map((metric) => {
    const prev = extractKeyFigureValue(previous, projectId, metric, options)
    const cur = extractKeyFigureValue(current, projectId, metric, options)
    const pctCompanion = keyFigureInlinePercentCompanionId(metric)
    const prevPct = pctCompanion
      ? extractKeyFigureValue(previous, projectId, pctCompanion, options)
      : undefined
    const curPct = pctCompanion
      ? extractKeyFigureValue(current, projectId, pctCompanion, options)
      : undefined
    const change =
      prev === null ||
      cur === null ||
      !Number.isFinite(prev) ||
      !Number.isFinite(cur)
        ? null
        : cur - prev
    const changePercent =
      pctCompanion === null
        ? undefined
        : prevPct === null ||
            curPct === null ||
            prevPct === undefined ||
            curPct === undefined ||
            !Number.isFinite(prevPct) ||
            !Number.isFinite(curPct)
          ? null
          : curPct - prevPct
    return {
      metric,
      previous: prev,
      current: cur,
      change,
      ...(pctCompanion
        ? {
            previousPercent: prevPct ?? null,
            currentPercent: curPct ?? null,
            changePercent: changePercent ?? null,
          }
        : {}),
    }
  })
}

export function compareStructuralInputs(
  previous: AnalysisCheckpoint,
  current: AnalysisCheckpoint,
): CheckpointStructuralChangeCounts {
  const earlierProject = previous.workspace.projects[0]
  const laterProject = current.workspace.projects[0]
  const earlierCosts = earlierProject?.costRows ?? []
  const laterCosts = laterProject?.costRows ?? []
  const earlierDrivers = earlierProject?.driverRows ?? []
  const laterDrivers = laterProject?.driverRows ?? []

  const costDiff = diffRowIds(
    earlierCosts.map((r) => r.id),
    laterCosts.map((r) => r.id),
  )
  const driverDiff = diffRowIds(
    earlierDrivers.map((r) => r.id),
    laterDrivers.map((r) => r.id),
  )

  const earlierCostById = Object.fromEntries(
    earlierCosts.map((r) => [r.id, r]),
  )
  const laterCostById = Object.fromEntries(laterCosts.map((r) => [r.id, r]))
  const earlierDriverById = Object.fromEntries(
    earlierDrivers.map((r) => [r.id, r]),
  )
  const laterDriverById = Object.fromEntries(
    laterDrivers.map((r) => [r.id, r]),
  )

  return {
    costItemsAdded: costDiff.onlyLater.length,
    costItemsRemoved: costDiff.onlyEarlier.length,
    costRangesChanged: countRangeChanges(
      costDiff.shared,
      earlierCostById,
      laterCostById,
    ),
    driversAdded: driverDiff.onlyLater.length,
    driversRemoved: driverDiff.onlyEarlier.length,
    driverRangesChanged: countRangeChanges(
      driverDiff.shared,
      earlierDriverById,
      laterDriverById,
    ),
  }
}

export function hasStructuralChanges(
  structural: CheckpointStructuralChangeCounts,
): boolean {
  return (
    structural.costItemsAdded > 0 ||
    structural.costItemsRemoved > 0 ||
    structural.costRangesChanged > 0 ||
    structural.driversAdded > 0 ||
    structural.driversRemoved > 0 ||
    structural.driverRangesChanged > 0
  )
}

function pairBase(
  earlier: AnalysisCheckpoint,
  later: AnalysisCheckpoint,
  structural: CheckpointStructuralChangeCounts,
  projectId: string | undefined,
): Omit<
  CheckpointComparisonPair,
  "keyFigures" | "keyFiguresUnavailableReason"
> {
  const sCurvePrev = projectId
    ? sCurveReferenceFromCheckpoint(earlier, projectId)
    : undefined
  return {
    kind: "comparison",
    currentCheckpointId: later.id,
    currentSequence: later.sequence,
    currentName: later.name,
    previousCheckpointId: earlier.id,
    previousSequence: earlier.sequence,
    previousName: earlier.name,
    structural,
    ...(sCurvePrev
      ? { extensions: { sCurve: { previous: sCurvePrev } } }
      : {}),
  }
}

/**
 * Compare the viewed checkpoint against the immediately preceding sequence neighbor.
 *
 * Pass `keyFigureMetricIds` from `listVisibleComparableKeyFigureRowIds(activePrefs)`
 * so comparison rows match the main Key Figures table selection and order.
 */
export function compareCheckpoints(args: {
  checkpoints: readonly AnalysisCheckpoint[]
  viewedCheckpointId: string
  viewedResultSource: CheckpointResultSource | null
  /** Visible comparable metric ids from active Result Preferences (ordered). */
  keyFigureMetricIds?: readonly KeyFigureRowId[]
  /** Active prefs threshold for optional probability-below comparison. */
  probabilityBelowAmount?: number | null
}): CheckpointComparison | null {
  const {
    checkpoints,
    viewedCheckpointId,
    viewedResultSource,
    keyFigureMetricIds,
    probabilityBelowAmount,
  } = args
  const viewed = checkpoints.find((c) => c.id === viewedCheckpointId)
  if (!viewed) return null

  const pair = getPrecedingCheckpointPair(checkpoints, viewedCheckpointId)
  if (!pair) {
    return {
      kind: "baseline",
      currentCheckpointId: viewed.id,
      currentSequence: viewed.sequence,
      currentName: viewed.name,
    }
  }

  const { earlier, later } = pair
  const structural = compareStructuralInputs(earlier, later)
  const projectId =
    later.workspace.projects[0]?.id ??
    earlier.workspace.projects[0]?.id ??
    viewedResultSource?.projectResults[0]?.projectId
    ?? viewedResultSource?.compact?.activeProjectId

  const base = pairBase(earlier, later, structural, projectId)
  const extractOpts: CheckpointKeyFigureExtractOptions = {
    probabilityBelowAmount: probabilityBelowAmount ?? null,
  }

  const previousSource = resultSourceFromArchivedSnapshot(earlier)
  if (!previousSource) {
    return {
      ...base,
      keyFigures: null,
      keyFiguresUnavailableReason: "missing_previous_results",
    }
  }

  if (
    !viewedResultSource ||
    (viewedResultSource.projectResults.length === 0 &&
      !viewedResultSource.compact)
  ) {
    return {
      ...base,
      keyFigures: null,
      keyFiguresUnavailableReason: "missing_current_results",
    }
  }

  if (!viewedResultSource.resultsComparable) {
    return {
      ...base,
      keyFigures: null,
      keyFiguresUnavailableReason: "stale_current_results",
    }
  }

  if (!projectId) {
    return {
      ...base,
      keyFigures: null,
      keyFiguresUnavailableReason: "missing_current_results",
    }
  }

  const metricIds =
    keyFigureMetricIds && keyFigureMetricIds.length > 0
      ? keyFigureMetricIds
      : ([
          "baseCost",
          "expectedAddition",
          "p50",
          "uncertaintyReserve",
          "p85",
          "expectedValue",
        ] as const)

  return {
    ...base,
    keyFigures: buildKeyFigureDeltas({
      previous: previousSource,
      current: viewedResultSource,
      projectId,
      metricIds,
      options: extractOpts,
    }),
  }
}
