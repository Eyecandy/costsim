/**
 * Resolve Ongoing PDF report cutoff from the currently viewed checkpoint.
 *
 * Selected archived CP → cutoff = that CP (status at that point in history).
 * Selected draft CP → cutoff = latest archived predecessor (never include draft).
 *
 * Distinct from activeCheckpointId vs viewedCheckpointId — callers pass the
 * viewed/selected id used for export semantics.
 */

import type { AnalysisCheckpoint } from "@/domain/analysis/analysisCheckpoint"
import { ongoingDevelopmentAxisLabel } from "@/domain/analysis/ongoingDevelopmentSeries"
import {
  isLegacyHeavyArchivedSnapshot,
  isOngoingCheckpointResultSnapshot,
} from "@/domain/analysis/ongoingCheckpointResultSnapshot"

/**
 * Short checkpoint label for Ongoing PDF export dialogs (CP1, CP2, …).
 * Reuses the Development axis helper — do not hardcode at call sites.
 */
export function ongoingPdfCheckpointDisplayLabel(sequence: number): string {
  return ongoingDevelopmentAxisLabel(sequence)
}

/** Build title/body for the draft-selected PDF confirmation dialog. */
export function buildOngoingPdfDraftConfirmCopy(args: {
  draftSequence: number
  cutoffSequence: number
  titleTemplate: string
  bodyTemplate: string
}): {
  draftLabel: string
  cutoffLabel: string
  title: string
  message: string
} {
  const draftLabel = ongoingPdfCheckpointDisplayLabel(args.draftSequence)
  const cutoffLabel = ongoingPdfCheckpointDisplayLabel(args.cutoffSequence)
  return {
    draftLabel,
    cutoffLabel,
    title: args.titleTemplate.replaceAll("{label}", draftLabel),
    message: args.bodyTemplate
      .replaceAll("{cutoffLabel}", cutoffLabel)
      .replaceAll("{draftLabel}", draftLabel),
  }
}

export type OngoingPdfCutoffFailureReason =
  "missing_selection" | "selection_not_found" | "no_archived_checkpoints" | "no_frozen_results"

export type OngoingPdfCutoffResolution =
  | {
      ok: true
      /** Frozen archived checkpoint that ends the report. */
      cutoffCheckpointId: string
      cutoffCheckpoint: AnalysisCheckpoint
      /** Currently viewed/selected checkpoint (may be a draft). */
      selectedCheckpointId: string
      selectedCheckpoint: AnalysisCheckpoint
      /** True when the selected checkpoint is a draft and was excluded. */
      selectedIsDraft: boolean
    }
  | { ok: false; reason: OngoingPdfCutoffFailureReason }

export type OngoingPdfExportPlan =
  | { action: "block"; reason: OngoingPdfCutoffFailureReason }
  | {
      action: "confirm"
      cutoffCheckpointId: string
      cutoffCheckpoint: AnalysisCheckpoint
      selectedCheckpoint: AnalysisCheckpoint
    }
  | {
      action: "generate"
      cutoffCheckpointId: string
      cutoffCheckpoint: AnalysisCheckpoint
    }

function orderedCheckpoints(checkpoints: readonly AnalysisCheckpoint[]): AnalysisCheckpoint[] {
  return [...checkpoints].sort((a, b) => a.sequence - b.sequence)
}

/** Archived snapshot present in a form the PDF builder can read. */
function isArchivedWithFrozenSnapshot(cp: AnalysisCheckpoint): boolean {
  if (cp.status !== "archived" || !cp.archivedSnapshot) return false
  const snap = cp.archivedSnapshot
  if (isOngoingCheckpointResultSnapshot(snap)) return true
  if (isLegacyHeavyArchivedSnapshot(snap)) {
    return snap.projectResults.some((r) => r.values.length > 0)
  }
  return false
}

/**
 * Resolve which archived checkpoint is the PDF cutoff for a selected view.
 */
export function resolveOngoingPdfCutoff(args: {
  checkpoints: readonly AnalysisCheckpoint[]
  /** Currently viewed/selected checkpoint (not necessarily the active draft tip). */
  selectedCheckpointId: string | null | undefined
}): OngoingPdfCutoffResolution {
  const selectedId = args.selectedCheckpointId?.trim()
  if (!selectedId) {
    return { ok: false, reason: "missing_selection" }
  }

  const ordered = orderedCheckpoints(args.checkpoints)
  const selected = ordered.find((c) => c.id === selectedId)
  if (!selected) {
    return { ok: false, reason: "selection_not_found" }
  }

  const eligible =
    selected.status === "draft"
      ? ordered.filter((c) => c.sequence < selected.sequence && isArchivedWithFrozenSnapshot(c))
      : ordered.filter((c) => c.sequence <= selected.sequence && isArchivedWithFrozenSnapshot(c))

  if (eligible.length === 0) {
    const anyArchived = ordered.some((c) => c.status === "archived")
    return {
      ok: false,
      reason: anyArchived ? "no_frozen_results" : "no_archived_checkpoints",
    }
  }

  const cutoff = eligible[eligible.length - 1]!
  return {
    ok: true,
    cutoffCheckpointId: cutoff.id,
    cutoffCheckpoint: cutoff,
    selectedCheckpointId: selected.id,
    selectedCheckpoint: selected,
    selectedIsDraft: selected.status === "draft",
  }
}

/**
 * Export UX plan: generate immediately, confirm (draft selected), or block.
 */
export function planOngoingPdfExport(args: {
  checkpoints: readonly AnalysisCheckpoint[]
  selectedCheckpointId: string | null | undefined
}): OngoingPdfExportPlan {
  const resolved = resolveOngoingPdfCutoff(args)
  if (!resolved.ok) {
    return { action: "block", reason: resolved.reason }
  }
  if (resolved.selectedIsDraft) {
    return {
      action: "confirm",
      cutoffCheckpointId: resolved.cutoffCheckpointId,
      cutoffCheckpoint: resolved.cutoffCheckpoint,
      selectedCheckpoint: resolved.selectedCheckpoint,
    }
  }
  return {
    action: "generate",
    cutoffCheckpointId: resolved.cutoffCheckpointId,
    cutoffCheckpoint: resolved.cutoffCheckpoint,
  }
}

/**
 * Filter checkpoints to those at or before the cutoff sequence.
 * Keeps later archived history out of the builder input set entirely.
 */
export function filterCheckpointsUpToCutoff(
  checkpoints: readonly AnalysisCheckpoint[],
  cutoffCheckpointId: string,
): AnalysisCheckpoint[] {
  const ordered = orderedCheckpoints(checkpoints)
  const cutoff = ordered.find((c) => c.id === cutoffCheckpointId)
  if (!cutoff) return []
  return ordered.filter((c) => c.sequence <= cutoff.sequence)
}
