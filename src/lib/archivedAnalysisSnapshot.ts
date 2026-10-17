import type { DeterministicTornadoRow } from "@/domain/simulation/deterministicTornado"
import type { Project } from "@/lib/project"
import type {
  ResolvedResultView,
  ResultPreferencesV1,
} from "@/lib/resultPreferences"
import type { ShapleyAttributionResult } from "@/domain/simulation/shapleyAttribution"
import type { ProjectResult } from "@/simulation.worker"

export const ARCHIVED_ANALYSIS_SNAPSHOT_VERSION = 1 as const

/**
 * Compact-enough freeze of an accepted analysis result set.
 * Reuses ProjectResult.values (S-curve / KF / Shapley reconciliation) with
 * slimmed inputSeries (empty factor samples) — same approach as lastSimulationSnapshot.
 * Does NOT store ephemeral UI (zoom, hover, Guided, Focus, expanders).
 */
export type ArchivedAnalysisSnapshotV1 = {
  v: typeof ARCHIVED_ANALYSIS_SNAPSHOT_VERSION
  archivedAt: string
  schemaVersion: typeof ARCHIVED_ANALYSIS_SNAPSHOT_VERSION
  /** Lightweight model generation tag for traceability (app + snapshot schema). */
  modelVersion: string
  simulationCount: number
  /** Canonical simulation input signature (analytical fields) at simulation/archive. */
  inputSignature: string
  projectsAtArchive: Project[]
  activeProjectIdAtRun: string
  simulatedBaseCostByProjectId: Record<string, number | null>
  /** Slimmed ProjectResult[] (totals kept; factor sample arrays emptied). */
  projectResults: ProjectResult[]
  /** Device-agnostic prefs that governed presentation at archive time. */
  resultPreferences: ResultPreferencesV1
  /** Frozen resolved presentation at archive time. */
  resultView: ResolvedResultView
  tornadoByProjectId: Record<string, DeterministicTornadoRow[]>
  /**
   * Shapley/Contribution results when available at archive time.
   * Missing/null → Contribution UI must not invent a new calculation as "archived".
   */
  shapleyByProjectId: Record<string, ShapleyAttributionResult | null>
}

export const ARCHIVE_MODEL_VERSION = "cost-simulator-archive-v1" as const

export function slimProjectResultsForArchive(
  projectResults: readonly ProjectResult[],
): ProjectResult[] {
  return projectResults.map((pr) => ({
    ...pr,
    inputSeries: pr.inputSeries.map((s) => ({ ...s, values: [] })),
  }))
}
