import type { Project } from "@/domain/analysis/project"
import type { SingleAnalysisArchivedSnapshot } from "@/domain/analysis/singleArchivedResultSnapshot"
import type { DraftResultSeedV1 } from "@/domain/analysis/draftResultSeed"
import type { OngoingAnalysisState } from "@/domain/analysis/analysisCheckpoint"
import type { OngoingCheckpointResultSnapshotV1 } from "@/domain/analysis/ongoingCheckpointResultSnapshot"
import type { ResultPreferencesV1 } from "@/domain/results/resultPreferences"
import type { SingleDraftResultSnapshotV1 } from "@/domain/analysis/singleDraftResultSnapshot"

export const ANALYSIS_DOCUMENT_SCHEMA_VERSION = 1 as const

/** Soft-deleted analyses remain recoverable for this many days. */
export const TRASH_RETENTION_DAYS = 30

export type AnalysisStatus = "draft" | "archived"

/**
 * AnalysisDocument-level mode.
 * - single: current multi-alternative analysis behavior
 * - ongoing: linear checkpoints over one project (skeleton; see analysisCheckpoint.ts)
 */
export type AnalysisMode = "single" | "ongoing"

export const DEFAULT_ANALYSIS_MODE: AnalysisMode = "single"

export const ANALYSIS_MODE_IDS = ["single", "ongoing"] as const satisfies readonly AnalysisMode[]

/** Legacy / unknown values → single (current analysis behavior). */
export function normalizeAnalysisMode(raw: unknown): AnalysisMode {
  return raw === "ongoing" ? "ongoing" : DEFAULT_ANALYSIS_MODE
}

export type AnalysisFolder = {
  id: string
  name: string
  createdAt: string
  updatedAt: string
}

export type AnalysisWorkspacePayload = {
  projects: Project[]
  activeProjectId: string
}

/**
 * Persisted library aggregate: one analysis workspace (1–N alternatives as Project[]).
 * Draft = editable + autosaved. Archived = immutable inputs + frozen result snapshot.
 * Soft-deleted when `deletedAt` is set (Trash); orthogonal to draft/archived status.
 */
export type AnalysisDocument = {
  id: string
  name: string
  folderId: string | null
  status: AnalysisStatus
  /**
   * Document-level analysis mode. Defaults to `"single"` for legacy documents.
   * `"ongoing"` uses {@link ongoing} checkpoint state (one project over time).
   */
  analysisMode: AnalysisMode
  /**
   * Present when `analysisMode === "ongoing"`.
   * `workspace` mirrors the active checkpoint for existing autosave/session paths.
   */
  ongoing?: OngoingAnalysisState
  createdAt: string
  updatedAt: string
  lastOpenedAt: string
  schemaVersion: typeof ANALYSIS_DOCUMENT_SCHEMA_VERSION
  /** Soft-delete timestamp; null/undefined = not in Trash. */
  deletedAt?: string | null
  /** Optional link when created via "Create new version" from an archived analysis. */
  previousVersionId?: string
  /**
   * Provenance when started via "Start ongoing analysis" from an archived Single.
   * Source document is never mutated.
   */
  sourceAnalysisId?: string
  /** Selected alternative (Project.id) from the source Single Analysis. */
  sourceProjectId?: string
  workspace: AnalysisWorkspacePayload
  archivedSnapshot?: SingleAnalysisArchivedSnapshot
  /** Compact result continuity for the active Ongoing draft checkpoint. */
  ongoingDraftResult?: OngoingCheckpointResultSnapshotV1
  /** Compact result continuity for an editable Single Analysis draft. */
  singleDraftResult?: SingleDraftResultSnapshotV1
  /**
   * Editable Result Settings for the open draft (presentation only).
   * Separate from frozen `resultPreferences` / `resultView` on compact result
   * snapshots so post-simulation preference edits survive leave/reopen without
   * mutating frozen Key Figure / S-curve analytics.
   */
  draftResultPreferences?: ResultPreferencesV1
  /**
   * When created via "Create new version", remapped archived results so the
   * draft can show the same Results until the first successful re-simulation.
   * Cleared after a new Monte Carlo run on this draft.
   */
  draftResultSeed?: DraftResultSeedV1
}

export type AnalysisSummary = {
  id: string
  name: string
  folderId: string | null
  status: AnalysisStatus
  /** Document-level mode; legacy summaries default via {@link toAnalysisSummary}. */
  analysisMode: AnalysisMode
  createdAt: string
  updatedAt: string
  lastOpenedAt: string
  archivedAt?: string
  deletedAt?: string | null
}

export type CreateAnalysisInput = {
  name: string
  folderId?: string | null
  /** Defaults to `"single"` when omitted. */
  analysisMode?: AnalysisMode
  /** Optional display name for Checkpoint 1 when mode is ongoing. */
  initialCheckpointName?: string
  workspace: AnalysisWorkspacePayload
}

export type LibraryIndexV1 = {
  v: 1
  folders: AnalysisFolder[]
  /** Ordered list of analysis ids for quick listing (bodies live in separate keys). */
  analysisIds: string[]
  /**
   * Lightweight Library rows keyed by analysis id.
   * Preferred source for listSummaries / listTrash / name-uniqueness occupants.
   * Optional for legacy indexes; rebuilt once from bodies when missing.
   */
  summaries?: Record<string, AnalysisSummary>
}

export function isAnalysisTrashed(doc: {
  deletedAt?: string | null
}): boolean {
  return typeof doc.deletedAt === "string" && doc.deletedAt.length > 0
}

export function isTrashExpired(
  deletedAt: string,
  nowMs: number = Date.now(),
): boolean {
  const t = new Date(deletedAt).getTime()
  if (!Number.isFinite(t)) return false
  return nowMs - t >= TRASH_RETENTION_DAYS * 24 * 60 * 60 * 1000
}

export function toAnalysisSummary(doc: AnalysisDocument): AnalysisSummary {
  return {
    id: doc.id,
    name: doc.name,
    folderId: doc.folderId,
    status: doc.status,
    analysisMode: normalizeAnalysisMode(doc.analysisMode),
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
    lastOpenedAt: doc.lastOpenedAt,
    archivedAt:
      doc.status === "archived"
        ? (doc.archivedSnapshot?.archivedAt ?? doc.updatedAt)
        : undefined,
    deletedAt: doc.deletedAt ?? null,
  }
}

export function nowIso(): string {
  return new Date().toISOString()
}
