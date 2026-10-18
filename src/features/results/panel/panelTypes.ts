import { type Project } from "@/domain/analysis/project"
import type { ProjectResult } from "@/domain/simulation/simulationTypes"
import type { AnalysisCheckpoint } from "@/domain/analysis/analysisCheckpoint"
import type { AnalysisMode } from "@/domain/analysis/analysisDocument"
import { type CheckpointResultSource } from "@/domain/analysis/checkpointComparison"
import { type ResultPreferencesV1 } from "@/domain/results/resultPreferences"
import type { ArchivedAnalysisSnapshotV1 } from "@/domain/analysis/archivedAnalysisSnapshot"
import type { DraftResultSeedV1 } from "@/domain/analysis/draftResultSeed"
import type { ShapleyAttributionResult } from "@/domain/simulation/shapleyAttribution"
import type { OngoingCheckpointResultSnapshotV1 } from "@/domain/analysis/ongoingCheckpointResultSnapshot"
import type { SingleArchivedResultSnapshotV1 } from "@/domain/analysis/singleArchivedResultSnapshot"
import type { SingleDraftResultSnapshotV1 } from "@/domain/analysis/singleDraftResultSnapshot"
import type { FocusResultSectionId } from "@/domain/guided/focusResultSteps"

/** Auto-dismiss for stale-input notices under PDF / share / AI brief actions. */
export const STALE_ACTION_NOTICE_DISMISS_MS = 4000

export type ExpandedResultChart =
  | { kind: "keyFigures" }
  | { kind: "development" }
  | { kind: "scurve" }
  | { kind: "tornado"; projectId: string; projectName: string }
  | { kind: "expectedAddition"; projectId: string; projectName: string }
  | { kind: "uncertaintyReserve"; projectId: string; projectName: string }

export type ResultsPanelProps = {
  projects: Project[]
  activeProjectId: string
  projectResults: ProjectResult[]
  simulatedBaseCostByProjectId: Record<string, number | null>
  /** Canonical analytical signature from the last completed simulation. */
  lastSimulatedInputSignature: string
  /** Full projects captured at last simulation — Results display baseline. */
  lastSimulatedProjects?: readonly Project[]
  /** Per-project run token from the last completed main simulation. */
  simulationRunIdByProjectId: Readonly<Record<string, string>>
  /** Matches `runs` sent to the simulation worker (Monte Carlo draws per project). */
  simulationCount: number
  /** True when live `projects` no longer match the last completed simulation (same as stale notice). */
  pdfExportBlockedStaleInputs: boolean
  /** When true, do not compute new Contribution/Shapley (archived snapshot view). */
  analysisArchivedView?: boolean
  /** Frozen archive payload; used when `analysisArchivedView` is true. */
  archivedSnapshot?: ArchivedAnalysisSnapshotV1 | null
  ongoingCompactResult?: OngoingCheckpointResultSnapshotV1 | null
  singleArchivedCompact?: SingleArchivedResultSnapshotV1 | null
  singleDraftResult?: SingleDraftResultSnapshotV1 | null
  /**
   * Remapped results from "Create new version". While present, Contribution
   * uses seeded Shapley (no live recomputation) until cleared after re-sim.
   */
  draftResultSeed?: DraftResultSeedV1 | null
  /** Live session Result Preferences (single source of truth from App). */
  liveResultPreferences: ResultPreferencesV1
  replacePreferences: (next: ResultPreferencesV1) => void
  saveAsDefault: () => void
  resetToDefaults: () => void
  addKeyFigurePercentile: (p: number) => void
  removeKeyFigurePercentile: (p: number) => void
  addSCurvePercentile: (p: number) => void
  removeSCurvePercentile: (p: number) => void
  /**
   * Ongoing Analysis only: same archive entry as the analysis actions menu.
   * When omitted (Single / read-only), the Results shortcut is hidden.
   */
  onRequestArchiveAndCreateNext?: () => void
  /**
   * Active Ongoing Analysis only: finish whole analysis after tip is archived.
   * Shown even while viewing an archived checkpoint (document still draft).
   */
  onRequestFinishOngoingAnalysis?: () => void
  /**
   * Domain analysis mode — PDF export routes on this explicitly
   * (not on presence of `ongoingCheckpoints`).
   */
  analysisMode?: AnalysisMode
  /**
   * Ongoing Analysis only: checkpoint list + viewed id for comparison layer.
   * Omitted for Single Analysis — comparison section is not shown.
   */
  ongoingCheckpoints?: readonly AnalysisCheckpoint[]
  viewedCheckpointId?: string
  /** Display name of the open analysis (PDF cover). */
  analysisName?: string
  /** Ongoing lifecycle for PDF metadata; ignored for Single. */
  ongoingLifecycle?: "active" | "completed"
  /**
   * Hydrated results for the viewed checkpoint (live or archived).
   * `resultsComparable` must be false when live inputs are stale.
   */
  checkpointComparisonResultSource?: CheckpointResultSource | null
  /**
   * Ongoing live tip: when Contribution finishes, attach it to the compact
   * draft snapshot for reload continuity (no full MC arrays).
   */
  onContributionReady?: (
    projectId: string,
    contribution: ShapleyAttributionResult,
    simulationRunId: string,
  ) => void
  /**
   * Open Results inside Focus mode (presentation only).
   * When omitted, the Focus entry control is hidden.
   */
  onOpenFocusResults?: () => void
  /** When true, Results are rendered inside Focus — hide the Focus entry control. */
  focusResultsActive?: boolean
  /**
   * When set, render only this analytical section (Focus stepwise Results).
   * Presentation-only; does not change analytical state.
   */
  focusSection?: FocusResultSectionId | null
  /** Focus Next Steps: exit Focus to normal Input. */
  onFocusReviewInput?: () => void
}
