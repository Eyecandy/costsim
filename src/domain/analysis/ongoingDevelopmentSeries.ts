/**
 * Ongoing Analysis — development-over-checkpoints series.
 * Visualization-only: reads frozen archived snapshots and/or already-hydrated
 * live/draft results. Does not run Monte Carlo or Shapley.
 */

import type { AnalysisCheckpoint } from "@/domain/analysis/analysisCheckpoint"
import {
  resultSourceFromArchivedSnapshot,
  type CheckpointResultSource,
} from "@/domain/analysis/checkpointComparison"
import {
  percentileFromSorted,
  sortedFiniteValues,
} from "@/domain/simulation/stats"
import {
  isLegacyHeavyArchivedSnapshot,
  isOngoingCheckpointResultSnapshot,
} from "@/domain/analysis/ongoingCheckpointResultSnapshot"

export type OngoingDevelopmentPointSource =
  | "archived"
  | "live"

export type OngoingDevelopmentPoint = {
  checkpointId: string
  sequence: number
  name: string
  baseCost: number | null
  p50: number | null
  p85: number | null
  /** Null for the first plotted point. */
  deltaBaseCost: number | null
  deltaP50: number | null
  deltaP85: number | null
  source: OngoingDevelopmentPointSource
}

export type OngoingDevelopmentSeries = {
  points: OngoingDevelopmentPoint[]
}

export type DevelopmentMetrics = {
  baseCost: number | null
  p50: number | null
  p85: number | null
}

/**
 * Cache Base/P50/P85 for an immutable `ProjectResult.values` array.
 * Archived snapshots keep stable array identities — navigation must not
 * re-sort the same 20k totals.
 */
const developmentMetricsByValues = new WeakMap<
  readonly number[],
  DevelopmentMetrics
>()

function projectIdForCheckpoint(checkpoint: AnalysisCheckpoint): string | null {
  const compact = checkpoint.archivedSnapshot
  if (isOngoingCheckpointResultSnapshot(compact)) {
    return compact.activeProjectId
  }
  const legacy = isLegacyHeavyArchivedSnapshot(checkpoint.archivedSnapshot)
    ? checkpoint.archivedSnapshot
    : undefined
  return (
    checkpoint.workspace.projects[0]?.id ??
    legacy?.activeProjectIdAtRun ??
    legacy?.projectsAtArchive[0]?.id ??
    null
  )
}

function hasUsableTotals(source: CheckpointResultSource, projectId: string): boolean {
  if (!source.resultsComparable) return false
  if (source.compact?.activeProjectId === projectId) return true
  const pr = source.projectResults.find((r) => r.projectId === projectId)
  return Boolean(pr && pr.values.length > 0)
}

/**
 * Base / P50 / P85 for the Development chart — one filter+sort of values.
 * Base Cost is read from the simulated base map (no MC array work).
 * Does not use {@link extractKeyFigureValue} (avoids 8 sorts / checkpoint).
 */
export function extractDevelopmentMetrics(
  source: Pick<
    CheckpointResultSource,
    "projectResults" | "simulatedBaseCostByProjectId" | "compact"
  >,
  projectId: string,
): DevelopmentMetrics {
  if (source.compact?.activeProjectId === projectId) {
    return {
      baseCost: source.compact.keyFigures.baseCost,
      p50: source.compact.keyFigures.percentiles["50"] ?? null,
      p85: source.compact.keyFigures.percentiles["85"] ?? null,
    }
  }
  const pr = source.projectResults.find((r) => r.projectId === projectId)
  const baseCost = source.simulatedBaseCostByProjectId[projectId] ?? null
  if (!pr || pr.values.length === 0) {
    return { baseCost, p50: null, p85: null }
  }

  const cached = developmentMetricsByValues.get(pr.values)
  if (cached && Object.is(cached.baseCost, baseCost)) {
    return cached
  }

  const sorted = sortedFiniteValues(pr.values)
  const metrics: DevelopmentMetrics = {
    baseCost,
    p50: percentileFromSorted(sorted, 50),
    p85: percentileFromSorted(sorted, 85),
  }
  developmentMetricsByValues.set(pr.values, metrics)
  return metrics
}

function delta(
  current: number | null,
  previous: number | null,
): number | null {
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

/**
 * Build Base / P50 / P85 points across the Ongoing timeline.
 *
 * - Archived checkpoints → frozen `archivedSnapshot`
 * - Draft checkpoint → live viewed source when that checkpoint is viewed and
 *   results are comparable
 */
export function buildOngoingDevelopmentSeries(args: {
  checkpoints: readonly AnalysisCheckpoint[]
  viewedCheckpointId?: string | null
  viewedResultSource?: CheckpointResultSource | null
}): OngoingDevelopmentSeries {
  const ordered = [...args.checkpoints].sort((a, b) => a.sequence - b.sequence)
  const raw: Omit<
    OngoingDevelopmentPoint,
    "deltaBaseCost" | "deltaP50" | "deltaP85"
  >[] = []

  for (const checkpoint of ordered) {
    const projectId = projectIdForCheckpoint(checkpoint)
    if (!projectId) continue

    if (checkpoint.status === "archived") {
      const archivedSource = resultSourceFromArchivedSnapshot(checkpoint)
      if (!archivedSource || !hasUsableTotals(archivedSource, projectId)) {
        continue
      }
      const m = extractDevelopmentMetrics(archivedSource, projectId)
      raw.push({
        checkpointId: checkpoint.id,
        sequence: checkpoint.sequence,
        name: checkpoint.name,
        ...m,
        source: "archived",
      })
      continue
    }

    // Draft checkpoint
    let source: CheckpointResultSource | null = null
    let origin: OngoingDevelopmentPointSource | null = null

    if (
      args.viewedCheckpointId === checkpoint.id &&
      args.viewedResultSource &&
      hasUsableTotals(args.viewedResultSource, projectId)
    ) {
      source = args.viewedResultSource
      origin = "live"
    }

    if (!source || !origin) continue
    const m = extractDevelopmentMetrics(source, projectId)
    raw.push({
      checkpointId: checkpoint.id,
      sequence: checkpoint.sequence,
      name: checkpoint.name,
      ...m,
      source: origin,
    })
  }

  const points: OngoingDevelopmentPoint[] = raw.map((point, index) => {
    const prev = index > 0 ? raw[index - 1]! : null
    return {
      ...point,
      deltaBaseCost: prev ? delta(point.baseCost, prev.baseCost) : null,
      deltaP50: prev ? delta(point.p50, prev.p50) : null,
      deltaP85: prev ? delta(point.p85, prev.p85) : null,
    }
  })

  return { points }
}

/** Short axis label — sequence only; full name belongs in the tooltip. */
export function ongoingDevelopmentAxisLabel(sequence: number): string {
  return `CP${sequence}`
}
