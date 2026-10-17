import type {
  AnalysisDocument,
  AnalysisFolder,
  AnalysisSummary,
  CreateAnalysisInput,
} from "@/domain/analysis/analysisDocument"
import type { SingleAnalysisArchivedSnapshot } from "@/domain/analysis/singleArchivedResultSnapshot"
import { getLocalAnalysisLibraryRepository } from "@/lib/localAnalysisLibraryRepository"

export type ArchiveAnalysisArgs = {
  analysisId: string
  snapshot: SingleAnalysisArchivedSnapshot
}

export type CreateDraftFromArchivedArgs = {
  archivedId: string
  /** Display name for the new draft. */
  name: string
}

export type CreateOngoingFromArchivedSingleArgs = {
  archivedId: string
  /** Required when the source has more than one alternative. */
  selectedProjectId: string
  /** Optional override; defaults to the selected project name. */
  name?: string
  checkpointName?: string
}

/**
 * Backend-replaceable Analysis Library API.
 * UI must depend on this interface only — never localStorage.
 */
export interface AnalysisLibraryRepository {
  /** Active (non-trashed) analyses only. May purge expired Trash first. */
  listSummaries(): Promise<AnalysisSummary[]>
  /** Soft-deleted analyses only. May purge expired Trash first. */
  listTrash(): Promise<AnalysisSummary[]>
  listFolders(): Promise<AnalysisFolder[]>
  get(id: string): Promise<AnalysisDocument | null>

  create(input: CreateAnalysisInput): Promise<AnalysisDocument>
  /** Draft analytical content + metadata. Rejects if archived or trashed. */
  saveDraft(doc: AnalysisDocument): Promise<void>
  /** Metadata-only updates allowed on archived docs (e.g. lastOpenedAt, name display). */
  touchMetadata(
    id: string,
    patch: Partial<Pick<AnalysisDocument, "lastOpenedAt" | "name" | "folderId">>,
    /**
     * When the caller already loaded this document (e.g. session open),
     * pass it to avoid a redundant full-document parse for lastOpenedAt/name/move.
     */
    options?: { knownDocument?: AnalysisDocument },
  ): Promise<void>

  archive(args: ArchiveAnalysisArgs): Promise<AnalysisDocument>
  /**
   * Finish an active Ongoing Analysis after its latest checkpoint is archived.
   * Sets ongoing.lifecycle = completed and AnalysisDocument.status = archived.
   * Does not mutate checkpoint history or re-run simulations.
   */
  completeOngoingAnalysis(analysisId: string): Promise<AnalysisDocument>
  createDraftFromArchived(
    args: CreateDraftFromArchivedArgs,
  ): Promise<AnalysisDocument>
  /**
   * New Ongoing Analysis from an archived Single (copy/import).
   * Source remains archived and unchanged.
   */
  createOngoingFromArchivedSingle(
    args: CreateOngoingFromArchivedSingleArgs,
  ): Promise<AnalysisDocument>

  /** Soft-delete — sets deletedAt; recoverable from Trash. */
  moveToTrash(id: string): Promise<void>
  /** Clear deletedAt; keep draft/archive status and folder when possible. */
  restore(id: string): Promise<void>
  /** Irreversible removal of body + index entry. */
  deletePermanently(id: string): Promise<void>
  /** Permanently delete every currently trashed analysis. */
  emptyTrash(): Promise<void>

  createFolder(name: string): Promise<AnalysisFolder>
  renameFolder(id: string, name: string): Promise<AnalysisFolder>
  /**
   * Deletes an empty folder only. Throws if any active (non-trashed) analysis
   * still references the folder. Soft-deleted analyses do not block deletion;
   * restore falls back to ungrouped if the folder no longer exists.
   * Never cascade-deletes or relocates active analyses.
   */
  deleteFolder(id: string): Promise<void>
}

let overrideRepo: AnalysisLibraryRepository | null = null

export function getAnalysisLibraryRepository(): AnalysisLibraryRepository {
  return overrideRepo ?? getLocalAnalysisLibraryRepository()
}

/** Test helper — not for production UI. */
export function setAnalysisLibraryRepositoryForTests(
  repo: AnalysisLibraryRepository | null,
): void {
  overrideRepo = repo
}
