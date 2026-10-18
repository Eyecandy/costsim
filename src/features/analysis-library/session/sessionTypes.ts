import type { AnalysisMode, AnalysisStatus } from "@/domain/analysis/analysisDocument"
import {
  type AnalysisCheckpoint,
  type CompleteOngoingAnalysisBlockReason,
  type CreateNextCheckpointBlockReason,
  type DeleteActiveDraftCheckpointBlockReason,
  type OngoingAnalysisState,
} from "@/domain/analysis/analysisCheckpoint"
import { type ArchiveBlockReason } from "@/domain/analysis/buildArchivedAnalysisSnapshot"
import type { DraftResultSeedV1 } from "@/domain/analysis/draftResultSeed"
import type { Project } from "@/domain/analysis/project"
import { type ResultPreferencesV1 } from "@/domain/results/resultPreferences"
import type { AnalysisDocument } from "@/domain/analysis/analysisDocument"
import type { ProjectResult } from "@/domain/simulation/simulationTypes"
import { type OngoingCheckpointResultSnapshotV1 } from "@/domain/analysis/ongoingCheckpointResultSnapshot"
import { type SingleAnalysisArchivedSnapshot } from "@/domain/analysis/singleArchivedResultSnapshot"
import { type SingleDraftResultSnapshotV1 } from "@/domain/analysis/singleDraftResultSnapshot"

export type CommitOngoingDraftResultInput = {
  analysisId: string
  checkpointId: string
  projects: readonly Project[]
  activeProjectId: string
  projectResults: readonly ProjectResult[]
  simulatedBaseCostByProjectId: Readonly<Record<string, number | null>>
  inputSignature: string
  simulationCount: number
  resultPreferences: ResultPreferencesV1
  simulationRunIdByProjectId: Readonly<Record<string, string>>
}

export type CommitSingleDraftResultInput = {
  analysisId: string
  projects: readonly Project[]
  activeProjectId: string
  projectResults: readonly ProjectResult[]
  simulatedBaseCostByProjectId: Readonly<Record<string, number | null>>
  inputSignature: string
  simulationCount: number
  resultPreferences: ResultPreferencesV1
  simulationRunIdByProjectId: Readonly<Record<string, string>>
}

export type LibrarySaveStatus = "idle" | "saving" | "saved" | "error" | "error_quota"

export type ArchiveCurrentResult =
  { ok: true; doc: AnalysisDocument } | { ok: false; reason: ArchiveBlockReason }

export type ArchiveCheckpointResult =
  { ok: true; ongoing: OngoingAnalysisState } | { ok: false; reason: ArchiveBlockReason }

export type CreateNextCheckpointSessionResult =
  | {
      ok: true
      ongoing: OngoingAnalysisState
      newCheckpoint: AnalysisCheckpoint
    }
  | {
      ok: false
      reason: CreateNextCheckpointBlockReason | "persistence_failed"
    }

/**
 * Deletes only the tip draft checkpoint inside an Ongoing Analysis.
 * Never moves the AnalysisDocument to Trash or sets deletedAt.
 */
export type DeleteActiveDraftCheckpointSessionResult =
  | {
      ok: true
      ongoing: OngoingAnalysisState
      restoredCheckpoint: AnalysisCheckpoint
      deletedCheckpointId: string
    }
  | {
      ok: false
      reason: DeleteActiveDraftCheckpointBlockReason | "persistence_failed"
    }

export type CompleteOngoingAnalysisResult =
  | { ok: true; doc: AnalysisDocument }
  | { ok: false; reason: CompleteOngoingAnalysisBlockReason | "persistence_failed" }

export type LibrarySessionArgs = {
  projects: Project[]
  activeProjectId: string
  setProjects: (projects: Project[] | ((prev: Project[]) => Project[])) => void
  setActiveProjectId: (id: string) => void
  projectResults: ProjectResult[]
  simulatedBaseCostByProjectId: Record<string, number | null>
  lastSimulatedInputSignature: string
  simulationCount: number
  simulationRunIdByProjectId?: Readonly<Record<string, string>>
  resultPreferences: ResultPreferencesV1
  /** Live simulation ownership (analysis + checkpoint at run). */
  liveSimulationAnalysisId?: string | null
  liveSimulationCheckpointId?: string | null
  applyArchivedResults: (source: { archivedSnapshot?: SingleAnalysisArchivedSnapshot }) => void
  applyOngoingCompactResult: (snapshot: OngoingCheckpointResultSnapshotV1) => void
  applySingleDraftResult: (snapshot: SingleDraftResultSnapshotV1) => void
  applyDraftResultSeed: (seed: DraftResultSeedV1) => void
  clearResults: () => void
  /** Hydrate App Result Settings after compact/archive apply (draft presentation). */
  replacePreferences: (next: ResultPreferencesV1) => void
}

export type LibraryDocMeta = {
  id: string
  name: string
  status: AnalysisStatus
  folderId: string | null
  analysisMode: AnalysisMode
  previousVersionId?: string
}

/** Live App result/input state for archive eligibility (avoids stale closures). */
export type LiveArchiveState = {
  projects: Project[]
  activeProjectId: string
  projectResults: ProjectResult[]
  simulatedBaseCostByProjectId: Record<string, number | null>
  lastSimulatedInputSignature: string
  simulationCount: number
  resultPreferences: ResultPreferencesV1
  simulationRunIdByProjectId: Readonly<Record<string, string>>
  liveSimulationAnalysisId: string | null
  liveSimulationCheckpointId: string | null
}
