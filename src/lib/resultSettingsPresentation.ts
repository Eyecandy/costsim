/**
 * Presentation helpers for Result Settings vs compact/live analytics.
 * Keeps ResultsPanel gates testable without mounting React.
 */

import type { CompactFrozenKeyFiguresV1 } from "@/lib/compactAnalysisResult"
import {
  resolveResultView,
  type ResultPreferencesV1,
} from "@/lib/resultPreferences"
import type { ProjectResult } from "@/simulation.worker"

/** Live Monte Carlo arrays present — compact draft is reload fallback only. */
export function hasLiveProjectResultArrays(
  projectResults: readonly ProjectResult[],
): boolean {
  return projectResults.some((r) => r.values.length > 0)
}

/**
 * Use compact analytics only when there is no live sample payload.
 * Editable drafts may still show Result Settings while this is true.
 */
export function shouldUseCompactResultAnalytics(args: {
  projectResults: readonly ProjectResult[]
  ongoingCompactResult: unknown
  singleArchivedCompact: unknown
  singleDraftResult: unknown
}): boolean {
  if (hasLiveProjectResultArrays(args.projectResults)) return false
  return Boolean(
    args.ongoingCompactResult ||
      args.singleArchivedCompact ||
      args.singleDraftResult,
  )
}

/**
 * Result Settings editor is for editable drafts only — not archived /
 * checkpoint-history read-only views.
 */
export function shouldShowResultSettingsEditor(args: {
  analysisArchivedView: boolean
  useArchivedResults: boolean
}): boolean {
  return !args.analysisArchivedView && !args.useArchivedResults
}

/**
 * Frozen P(≤amount) is only valid for the amount captured at freeze time.
 * Do not show a mismatched frozen probability as if it matched a new amount.
 */
export function frozenProbabilityBelowForAmount(
  frozen: CompactFrozenKeyFiguresV1 | undefined,
  amount: number,
): number | null {
  if (!frozen) return null
  if (
    frozen.probabilityBelowAmount === null ||
    !Number.isFinite(frozen.probabilityBelowAmount) ||
    frozen.probabilityBelowAmount !== amount
  ) {
    return null
  }
  return frozen.probBelowCostLevel
}

/**
 * True when frozen compact key figures already contain every derived analytic
 * requested by editable Result Preferences (percentiles + optional P(≤amount)).
 * Pure presentation flags (displayMode, show*) never fail this check.
 */
export function compactFrozenKeyFiguresSupportPreferences(
  keyFigures: CompactFrozenKeyFiguresV1,
  prefs: ResultPreferencesV1,
): boolean {
  const view = resolveResultView(prefs)
  const required = new Set<number>([
    ...view.keyFigures.percentiles,
    ...view.sCurve.percentiles,
  ])
  for (const p of required) {
    const value = keyFigures.percentiles[String(p)]
    if (typeof value !== "number" || !Number.isFinite(value)) {
      return false
    }
  }
  const pb = view.keyFigures.probabilityBelowCostLevel
  if (pb.enabled && pb.amount !== null) {
    if (frozenProbabilityBelowForAmount(keyFigures, pb.amount) === null) {
      return false
    }
  }
  return true
}

/** Snapshot-level convenience for Ongoing tip/draft compact. */
export function compactSnapshotSupportsResultPreferences(
  snapshot: { keyFigures: CompactFrozenKeyFiguresV1 },
  prefs: ResultPreferencesV1,
): boolean {
  return compactFrozenKeyFiguresSupportPreferences(snapshot.keyFigures, prefs)
}
