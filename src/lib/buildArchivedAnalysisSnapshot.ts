/**
 * Builds archived analysis snapshots and canonical archive eligibility.
 */

import { computeDeterministicTornadoRows } from "@/domain/simulation/deterministicTornado"
import {
  ARCHIVE_MODEL_VERSION,
  ARCHIVED_ANALYSIS_SNAPSHOT_VERSION,
  slimProjectResultsForArchive,
  type ArchivedAnalysisSnapshotV1,
} from "@/lib/archivedAnalysisSnapshot"
import type { Project } from "@/lib/project"
import {
  resolveResultView,
  type ResultPreferencesV1,
} from "@/lib/resultPreferences"
import type { ShapleyAttributionResult } from "@/domain/simulation/shapleyAttribution"
import type { ProjectResult } from "@/simulation.worker"
import {
  coerceSimulationInputSignature,
  emptyLiveSimulationState,
  getLiveResultValidity,
  type LiveResultValidityKind,
  type LiveSimulationState,
} from "@/domain/simulation/liveSimulationState"
import {
  isOngoingCheckpointResultSnapshot,
  type OngoingCheckpointResultSnapshotV1,
} from "@/lib/ongoingCheckpointResultSnapshot"
import {
  isSingleDraftResultSnapshot,
  type SingleDraftResultSnapshotV1,
} from "@/lib/singleDraftResultSnapshot"
import {
  compactFrozenKeyFiguresSupportPreferences,
  hasLiveProjectResultArrays,
} from "@/lib/resultSettingsPresentation"
import { buildSimulationInputSignature } from "@/domain/simulation/simulationInputSignature"

export type BuildArchiveSnapshotInput = {
  projects: readonly Project[]
  activeProjectId: string
  projectResults: readonly ProjectResult[]
  simulatedBaseCostByProjectId: Record<string, number | null>
  /** Canonical simulation input signature (analytical fields only). */
  inputSignature: string
  simulationCount: number
  resultPreferences: ResultPreferencesV1
  shapleyByProjectId?: Record<string, ShapleyAttributionResult | null>
}

/**
 * Builds an archived snapshot from a live, non-stale simulation result set.
 * Does not run Monte Carlo or Shapley — only freezes what is provided (+ cheap tornado).
 */
export function buildArchivedAnalysisSnapshot(
  input: BuildArchiveSnapshotInput,
): ArchivedAnalysisSnapshotV1 {
  const projectsAtArchive = structuredClone(input.projects) as Project[]
  const tornadoByProjectId: ArchivedAnalysisSnapshotV1["tornadoByProjectId"] =
    {}
  for (const p of projectsAtArchive) {
    const pr = input.projectResults.find((r) => r.projectId === p.id)
    if (pr && pr.values.length > 0) {
      tornadoByProjectId[p.id] = computeDeterministicTornadoRows(p, 6)
    } else {
      tornadoByProjectId[p.id] = []
    }
  }

  const shapleyByProjectId: ArchivedAnalysisSnapshotV1["shapleyByProjectId"] =
    {}
  for (const p of projectsAtArchive) {
    shapleyByProjectId[p.id] = input.shapleyByProjectId?.[p.id] ?? null
  }

  const resultPreferences = structuredClone(input.resultPreferences)
  return {
    v: ARCHIVED_ANALYSIS_SNAPSHOT_VERSION,
    archivedAt: new Date().toISOString(),
    schemaVersion: ARCHIVED_ANALYSIS_SNAPSHOT_VERSION,
    modelVersion: ARCHIVE_MODEL_VERSION,
    simulationCount: input.simulationCount,
    inputSignature: input.inputSignature,
    projectsAtArchive,
    activeProjectIdAtRun: input.activeProjectId,
    simulatedBaseCostByProjectId: { ...input.simulatedBaseCostByProjectId },
    projectResults: slimProjectResultsForArchive(input.projectResults),
    resultPreferences,
    resultView: resolveResultView(resultPreferences),
    tornadoByProjectId,
    shapleyByProjectId,
  }
}

/**
 * Archive / result-action block reasons.
 * Lifecycle and persistence failures must NOT be reported as no_results.
 */
export type ArchiveBlockReason =
  | "no_results"
  | "stale_results"
  | "wrong_checkpoint"
  | "wrong_analysis"
  | "not_draft"
  | "not_ongoing"
  | "persistence_failed"
  /** Compact tip lacks derived analytics requested by current Result Preferences. */
  | "result_settings_need_rerun"

function validityKindToArchiveBlock(
  kind: LiveResultValidityKind,
): ArchiveBlockReason | null {
  switch (kind) {
    case "valid":
      return null
    case "none":
      return "no_results"
    case "stale":
      return "stale_results"
    case "wrong_checkpoint":
      return "wrong_checkpoint"
    case "wrong_analysis":
      return "wrong_analysis"
  }
}

/**
 * Coerce a stored signature (legacy full-projects JSON or canonical) for comparison.
 * @deprecated Prefer {@link coerceSimulationInputSignature} from liveSimulationState.
 */
export const coerceStoredSimulationSignature = coerceSimulationInputSignature

/**
 * Ongoing compact draft / tip result validity for Archive (no raw MC arrays).
 * Same ownership + canonical signature rules as live results.
 */
export function getOngoingCompactArchiveBlockReason(args: {
  analysisId?: string | null
  checkpointId?: string | null
  projects: readonly Project[]
  compact: OngoingCheckpointResultSnapshotV1 | null | undefined
}): ArchiveBlockReason | null {
  const compact = args.compact
  if (!compact || !isOngoingCheckpointResultSnapshot(compact)) {
    return "no_results"
  }
  if (
    args.analysisId != null &&
    args.analysisId !== compact.analysisId
  ) {
    return "wrong_analysis"
  }
  if (
    args.checkpointId != null &&
    args.checkpointId !== compact.checkpointId
  ) {
    return "wrong_checkpoint"
  }
  // Single Analysis never passes compact; Ongoing always has a checkpoint id.
  if (args.checkpointId == null) {
    return "no_results"
  }
  const currentSig = buildSimulationInputSignature(args.projects)
  const storedSig = coerceSimulationInputSignature(compact.inputSignature)
  if (currentSig !== storedSig) {
    return "stale_results"
  }
  return null
}

/**
 * Why Archive must not proceed for the current result context.
 * Prefer live Monte Carlo arrays when present; otherwise Ongoing/Single may use
 * a matching compact draft snapshot (no 20k restoration).
 */
export function getArchiveBlockReason(args: {
  analysisId?: string | null
  checkpointId?: string | null
  projects: readonly Project[]
  projectResults: readonly ProjectResult[]
  lastSimulatedInputSignature: string
  /** Optional full live simulation state; preferred when available. */
  simulationState?: LiveSimulationState | null
  /**
   * Ongoing: compact draft/inherited tip result when live projectResults
   * are empty (reload / createNext).
   */
  ongoingCompactResult?: OngoingCheckpointResultSnapshotV1 | null
  /** Single: compact draft result when live projectResults are empty after reload. */
  singleDraftResult?: SingleDraftResultSnapshotV1 | null
  /**
   * Current editable Result Preferences. When archiving from compact-only
   * (no live samples), derived analytics requested here must already exist
   * in the frozen compact payload.
   */
  resultPreferences?: ResultPreferencesV1 | null
}): ArchiveBlockReason | null {
  const state: LiveSimulationState =
    args.simulationState ??
    emptyLiveSimulationState({
      analysisId: args.analysisId ?? null,
      checkpointId: args.checkpointId ?? null,
      inputSignature: args.lastSimulatedInputSignature,
      projectResults: args.projectResults,
    })

  const validity = getLiveResultValidity({
    analysisId: args.analysisId ?? state.analysisId,
    checkpointId:
      args.checkpointId !== undefined ? args.checkpointId : state.checkpointId,
    currentProjects: args.projects,
    simulationState: state,
    ongoingCompactResult: args.ongoingCompactResult,
    singleDraftResult: args.singleDraftResult,
  })
  const block = validityKindToArchiveBlock(validity.kind)
  if (block) return block

  // Live samples can rebuild compact with current prefs — no support gate.
  if (
    hasLiveProjectResultArrays(args.projectResults) ||
    hasLiveProjectResultArrays(state.projectResults)
  ) {
    return null
  }

  const prefs = args.resultPreferences
  if (!prefs) return null

  if (
    args.ongoingCompactResult &&
    isOngoingCheckpointResultSnapshot(args.ongoingCompactResult)
  ) {
    if (
      !compactFrozenKeyFiguresSupportPreferences(
        args.ongoingCompactResult.keyFigures,
        prefs,
      )
    ) {
      return "result_settings_need_rerun"
    }
  }

  if (
    args.singleDraftResult &&
    isSingleDraftResultSnapshot(args.singleDraftResult)
  ) {
    const activeId = args.singleDraftResult.activeProjectIdAtRun
    const compactProject = args.singleDraftResult.byProjectId[activeId]
    if (
      compactProject &&
      !compactFrozenKeyFiguresSupportPreferences(
        compactProject.keyFigures,
        prefs,
      )
    ) {
      return "result_settings_need_rerun"
    }
  }

  return null
}

/** True when the current authoritative result source may be archived. */
export function canArchiveCurrentResults(args: {
  analysisId?: string | null
  checkpointId?: string | null
  projects: readonly Project[]
  projectResults: readonly ProjectResult[]
  lastSimulatedInputSignature: string
  simulationState?: LiveSimulationState | null
  ongoingCompactResult?: OngoingCheckpointResultSnapshotV1 | null
  singleDraftResult?: SingleDraftResultSnapshotV1 | null
  resultPreferences?: ResultPreferencesV1 | null
}): boolean {
  return getArchiveBlockReason(args) === null
}
