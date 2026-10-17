import { newId } from "@/domain/results/tableRows"
import {
  ANALYSIS_DOCUMENT_SCHEMA_VERSION,
  DEFAULT_ANALYSIS_MODE,
  isAnalysisTrashed,
  isTrashExpired,
  normalizeAnalysisMode,
  nowIso,
  toAnalysisSummary,
  type AnalysisDocument,
  type AnalysisFolder,
  type AnalysisSummary,
  type CreateAnalysisInput,
  type LibraryIndexV1,
} from "@/domain/analysis/analysisDocument"
import type {
  ArchiveAnalysisArgs,
  AnalysisLibraryRepository,
  CreateDraftFromArchivedArgs,
  CreateOngoingFromArchivedSingleArgs,
} from "@/lib/analysisLibraryRepository"
import { cloneProjectsWithMaps } from "@/domain/analysis/cloneAnalysisWorkspace"
import {
  buildDraftCompactSeedFromSingleArchive,
  buildDraftResultSeedFromArchive,
} from "@/domain/analysis/draftResultSeed"
import { buildSingleDraftFromCompactSeed } from "@/domain/analysis/singleDraftResultSnapshot"
import {
  completeOngoingAnalysis as completeOngoingLifecycle,
  createInitialOngoingState,
  ensureSingleProjectWorkspace,
  getCompleteOngoingAnalysisBlockReason,
  getLatestCheckpoint,
  normalizeOngoingState,
} from "@/domain/analysis/analysisCheckpoint"
import { isLegacyHeavyArchivedSnapshot } from "@/domain/analysis/ongoingCheckpointResultSnapshot"
import { isSingleArchivedResultSnapshot } from "@/domain/analysis/singleArchivedResultSnapshot"
import {
  ANALYSIS_NAME_CONFLICT_ERROR,
  ANALYSIS_NAME_CONFLICT_ON_MOVE_ERROR,
  hasAnalysisNameConflict,
  throwAnalysisNameConflict,
  type AnalysisNameOccupant,
} from "@/domain/analysis/analysisNameUniqueness"
import { planCreateOngoingFromArchivedSingle } from "@/domain/analysis/createOngoingFromArchivedSingle"

export const LIBRARY_STORAGE_KEYS = {
  index: "cost-simulator:library:v1:index",
  analysisPrefix: "cost-simulator:library:v1:analysis:",
} as const

/** Classifies durable localStorage write failures for user-facing save status. */
export type PersistenceFailureKind = "quota" | "generic"

export class AnalysisPersistenceError extends Error {
  readonly failureKind: PersistenceFailureKind

  constructor(
    message: string,
    failureKind: PersistenceFailureKind = "generic",
  ) {
    super(message)
    this.name = "AnalysisPersistenceError"
    this.failureKind = failureKind
  }
}

export function isAnalysisPersistenceError(
  error: unknown,
): error is AnalysisPersistenceError {
  return error instanceof AnalysisPersistenceError
}

export function isQuotaExceededStorageError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false
  const name = (error as { name?: string }).name
  if (name === "QuotaExceededError" || name === "NS_ERROR_DOM_QUOTA_REACHED") {
    return true
  }
  const code = (error as { code?: number }).code
  return code === 22
}

export function librarySaveStatusFromError(
  error: unknown,
): "error_quota" | "error" {
  if (
    isAnalysisPersistenceError(error) &&
    error.failureKind === "quota"
  ) {
    return "error_quota"
  }
  if (isQuotaExceededStorageError(error)) {
    return "error_quota"
  }
  return "error"
}

let lastWriteFailureKind: PersistenceFailureKind = "generic"

function throwPersistFailed(message: string): never {
  throw new AnalysisPersistenceError(message, lastWriteFailureKind)
}

function analysisKey(id: string): string {
  return `${LIBRARY_STORAGE_KEYS.analysisPrefix}${id}`
}

const memoryStore = new Map<string, string>()

/** Test-only: increments on every full AnalysisDocument body load/parse. */
let __fullDocumentLoadCountForTests = 0

export function __resetFullDocumentLoadCountForTests(): void {
  __fullDocumentLoadCountForTests = 0
}

export function __getFullDocumentLoadCountForTests(): number {
  return __fullDocumentLoadCountForTests
}

function readJson<T>(key: string, fallback: T): T {
  try {
    if (typeof localStorage !== "undefined") {
      const raw = localStorage.getItem(key)
      if (raw == null || raw.trim() === "") return fallback
      return JSON.parse(raw) as T
    }
    const raw = memoryStore.get(key)
    if (raw == null || raw.trim() === "") return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

/** Returns true only when the configured storage backend accepted the write. */
export function writeJson(key: string, value: unknown): boolean {
  try {
    const serialized = JSON.stringify(value)
    if (typeof localStorage !== "undefined") {
      try {
        localStorage.setItem(key, serialized)
        memoryStore.delete(key)
        return true
      } catch (error) {
        lastWriteFailureKind = isQuotaExceededStorageError(error)
          ? "quota"
          : "generic"
        // Optional same-tab emergency copy; never report it as durable success.
        memoryStore.set(key, serialized)
        return false
      }
    }
    memoryStore.set(key, serialized)
    return true
  } catch {
    lastWriteFailureKind = "generic"
    return false
  }
}

function removeKey(key: string): void {
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.removeItem(key)
    }
  } catch {
    /* ignore */
  }
  memoryStore.delete(key)
}

function emptyIndex(): LibraryIndexV1 {
  return { v: 1, folders: [], analysisIds: [], summaries: {} }
}

function loadIndex(): LibraryIndexV1 {
  const raw = readJson<LibraryIndexV1 | null>(LIBRARY_STORAGE_KEYS.index, null)
  if (!raw || raw.v !== 1 || !Array.isArray(raw.folders) || !Array.isArray(raw.analysisIds)) {
    return emptyIndex()
  }
  return raw
}

function saveIndex(index: LibraryIndexV1): boolean {
  return writeJson(LIBRARY_STORAGE_KEYS.index, index)
}

function ensureSummariesMap(index: LibraryIndexV1): Record<string, AnalysisSummary> {
  if (!index.summaries || typeof index.summaries !== "object") {
    index.summaries = {}
  }
  return index.summaries
}

/**
 * Ensure every analysisId has a lightweight summary entry.
 * Legacy indexes without summaries are rebuilt once from document bodies.
 * After rebuild, list paths never need full-document loads.
 */
function ensureIndexSummaries(index: LibraryIndexV1): LibraryIndexV1 {
  const summaries = ensureSummariesMap(index)
  let dirty = false
  for (const id of index.analysisIds) {
    if (summaries[id]) continue
    const doc = loadDoc(id)
    if (!doc) {
      dirty = true
      continue
    }
    summaries[id] = toAnalysisSummary(doc)
    dirty = true
  }
  // Drop orphan summary entries.
  for (const id of Object.keys(summaries)) {
    if (!index.analysisIds.includes(id)) {
      delete summaries[id]
      dirty = true
    }
  }
  // Drop missing bodies from the id list.
  const keepIds = index.analysisIds.filter((id) => Boolean(summaries[id]))
  if (keepIds.length !== index.analysisIds.length) {
    index.analysisIds = keepIds
    dirty = true
  }
  if (dirty) {
    saveIndex(index)
  }
  return index
}

function upsertSummary(index: LibraryIndexV1, doc: AnalysisDocument): void {
  const summaries = ensureSummariesMap(index)
  summaries[doc.id] = toAnalysisSummary(doc)
}

function removeSummary(index: LibraryIndexV1, id: string): void {
  if (!index.summaries) return
  delete index.summaries[id]
}

/** Persist body + keep Library summary index in sync. */
function saveDocAndSyncSummary(doc: AnalysisDocument): boolean {
  if (!saveDoc(doc)) return false
  const index = loadIndex()
  if (!index.analysisIds.includes(doc.id)) {
    index.analysisIds = [doc.id, ...index.analysisIds]
  }
  upsertSummary(index, doc)
  return saveIndex(index)
}

function loadDoc(id: string): AnalysisDocument | null {
  __fullDocumentLoadCountForTests += 1
  const raw = readJson<AnalysisDocument | null>(analysisKey(id), null)
  if (!raw || typeof raw !== "object") return null
  if (raw.schemaVersion !== ANALYSIS_DOCUMENT_SCHEMA_VERSION) return null
  if (raw.status !== "draft" && raw.status !== "archived") return null
  if (!raw.workspace?.projects || !raw.workspace.activeProjectId) return null
  if (
    !Array.isArray(raw.workspace.projects) ||
    raw.workspace.projects.length === 0
  ) {
    return null
  }
  const analysisMode = normalizeAnalysisMode(
    (raw as { analysisMode?: unknown }).analysisMode,
  )
  const ongoing =
    analysisMode === "ongoing"
      ? normalizeOngoingState((raw as { ongoing?: unknown }).ongoing)
      : undefined

  // Ongoing without valid checkpoint state → treat as single (safe fallback).
  if (analysisMode === "ongoing" && !ongoing) {
    return {
      ...raw,
      analysisMode: DEFAULT_ANALYSIS_MODE,
      ongoing: undefined,
    }
  }

  if (ongoing) {
    const active =
      ongoing.checkpoints.find((c) => c.id === ongoing.activeCheckpointId) ??
      ongoing.checkpoints[0]!
    return {
      ...raw,
      analysisMode: "ongoing",
      ongoing,
      workspace: ensureSingleProjectWorkspace(active.workspace),
    }
  }

  return {
    ...raw,
    analysisMode,
    ongoing: undefined,
  }
}

function saveDoc(doc: AnalysisDocument): boolean {
  return writeJson(analysisKey(doc.id), doc)
}

function assertDraft(doc: AnalysisDocument): void {
  if (doc.status === "archived") {
    throw new Error("Cannot modify archived analysis content")
  }
}

function assertNotTrashed(doc: AnalysisDocument): void {
  if (isAnalysisTrashed(doc)) {
    throw new Error("Cannot modify analysis in Trash")
  }
}

/** Visible (non-trashed) analyses for folder-scoped name uniqueness. */
function listVisibleNameOccupants(): AnalysisNameOccupant[] {
  const index = ensureIndexSummaries(loadIndex())
  const out: AnalysisNameOccupant[] = []
  for (const id of index.analysisIds) {
    const summary = index.summaries?.[id]
    if (!summary || isAnalysisTrashed(summary)) continue
    out.push({
      id: summary.id,
      name: summary.name,
      folderId: summary.folderId ?? null,
    })
  }
  return out
}

function assertUniqueAnalysisName(args: {
  name: string
  folderId: string | null
  excludeId?: string | null
  onMove?: boolean
}): void {
  if (
    hasAnalysisNameConflict({
      name: args.name,
      folderId: args.folderId,
      analyses: listVisibleNameOccupants(),
      excludeId: args.excludeId,
    })
  ) {
    throwAnalysisNameConflict(
      args.onMove
        ? ANALYSIS_NAME_CONFLICT_ON_MOVE_ERROR
        : ANALYSIS_NAME_CONFLICT_ERROR,
    )
  }
}

function removePermanently(id: string): void {
  removeKey(analysisKey(id))
  const index = loadIndex()
  index.analysisIds = index.analysisIds.filter((x) => x !== id)
  removeSummary(index, id)
  saveIndex(index)
}

/** Purge Trash items older than retention; keep index/body consistent. */
function purgeExpiredTrash(): void {
  const index = ensureIndexSummaries(loadIndex())
  const keep: string[] = []
  let dirty = false
  for (const id of index.analysisIds) {
    const summary = index.summaries?.[id]
    if (!summary) {
      dirty = true
      continue
    }
    if (
      isAnalysisTrashed(summary) &&
      summary.deletedAt &&
      isTrashExpired(summary.deletedAt)
    ) {
      removeKey(analysisKey(id))
      removeSummary(index, id)
      dirty = true
      continue
    }
    keep.push(id)
  }
  if (keep.length !== index.analysisIds.length) {
    index.analysisIds = keep
    dirty = true
  }
  if (dirty) {
    saveIndex(index)
  }
}

class LocalAnalysisLibraryRepository implements AnalysisLibraryRepository {
  async listSummaries(): Promise<AnalysisSummary[]> {
    purgeExpiredTrash()
    const index = ensureIndexSummaries(loadIndex())
    const out: AnalysisSummary[] = []
    for (const id of index.analysisIds) {
      const summary = index.summaries?.[id]
      if (!summary || isAnalysisTrashed(summary)) continue
      out.push({ ...summary })
    }
    return out
  }

  async listTrash(): Promise<AnalysisSummary[]> {
    purgeExpiredTrash()
    const index = ensureIndexSummaries(loadIndex())
    const out: AnalysisSummary[] = []
    for (const id of index.analysisIds) {
      const summary = index.summaries?.[id]
      if (!summary || !isAnalysisTrashed(summary)) continue
      out.push({ ...summary })
    }
    out.sort(
      (a, b) =>
        new Date(b.deletedAt ?? 0).getTime() -
        new Date(a.deletedAt ?? 0).getTime(),
    )
    return out
  }

  async listFolders(): Promise<AnalysisFolder[]> {
    return loadIndex().folders.slice()
  }

  async get(id: string): Promise<AnalysisDocument | null> {
    return loadDoc(id)
  }

  async create(input: CreateAnalysisInput): Promise<AnalysisDocument> {
    const ts = nowIso()
    const analysisMode = normalizeAnalysisMode(
      input.analysisMode ?? DEFAULT_ANALYSIS_MODE,
    )
    let workspace = {
      projects: input.workspace.projects,
      activeProjectId: input.workspace.activeProjectId,
    }
    let ongoing: AnalysisDocument["ongoing"]
    if (analysisMode === "ongoing") {
      const state = createInitialOngoingState(workspace, {
        checkpointName: input.initialCheckpointName,
        createdAt: ts,
      })
      ongoing = state
      workspace = ensureSingleProjectWorkspace(state.checkpoints[0]!.workspace)
    }
    const doc: AnalysisDocument = {
      id: newId(),
      name: input.name.trim() || "Untitled",
      folderId: input.folderId ?? null,
      status: "draft",
      analysisMode,
      ...(ongoing ? { ongoing } : {}),
      createdAt: ts,
      updatedAt: ts,
      lastOpenedAt: ts,
      schemaVersion: ANALYSIS_DOCUMENT_SCHEMA_VERSION,
      deletedAt: null,
      workspace,
    }
    if (
      !Array.isArray(doc.workspace.projects) ||
      doc.workspace.projects.length === 0 ||
      !doc.workspace.activeProjectId
    ) {
      throw new Error("Cannot create analysis with empty workspace")
    }
    assertUniqueAnalysisName({
      name: doc.name,
      folderId: doc.folderId,
    })
    const index = loadIndex()
    index.analysisIds = [doc.id, ...index.analysisIds.filter((x) => x !== doc.id)]
    upsertSummary(index, doc)
    const savedBody = saveDoc(doc)
    const savedIndex = saveIndex(index)
    // Authoritative round-trip: never return an id that get() cannot resolve.
    const verified = loadDoc(doc.id)
    if (!savedBody || !savedIndex || !verified) {
      removeKey(analysisKey(doc.id))
      throw new Error("Failed to persist new analysis")
    }
    return verified
  }

  async saveDraft(doc: AnalysisDocument): Promise<void> {
    const existing = loadDoc(doc.id)
    if (!existing) throw new Error("Analysis not found")
    assertNotTrashed(existing)
    assertDraft(existing)
    if (doc.status !== "draft") {
      throw new Error("saveDraft requires status draft")
    }
    if (isAnalysisTrashed(doc)) {
      throw new Error("Cannot saveDraft a trashed analysis")
    }
    const analysisMode = normalizeAnalysisMode(doc.analysisMode)
    // Persistence only: do not sync workspace into checkpoints or change
    // activeCheckpointId. Session/domain layer must supply a coherent document.
    let ongoing = analysisMode === "ongoing" ? doc.ongoing : undefined
    let workspace = {
      projects: doc.workspace.projects,
      activeProjectId: doc.workspace.activeProjectId,
    }
    if (analysisMode === "ongoing" && ongoing) {
      workspace = ensureSingleProjectWorkspace(workspace)
    } else {
      ongoing = undefined
    }
    const next: AnalysisDocument = {
      ...doc,
      status: "draft",
      analysisMode,
      ...(ongoing ? { ongoing } : { ongoing: undefined }),
      workspace,
      deletedAt: null,
      archivedSnapshot: undefined,
      updatedAt: nowIso(),
      schemaVersion: ANALYSIS_DOCUMENT_SCHEMA_VERSION,
    }
    // TOCTOU: a concurrent archive may have landed between the checks above and
    // this write. Never overwrite an archived document with a stale draft.
    const latest = loadDoc(doc.id)
    if (!latest || latest.status !== "draft") {
      throw new Error("Cannot modify archived analysis content")
    }
    assertNotTrashed(latest)
    if (!saveDoc(next)) {
      throwPersistFailed("Failed to persist draft analysis")
    }
    const index = loadIndex()
    if (!index.analysisIds.includes(next.id)) {
      index.analysisIds = [next.id, ...index.analysisIds]
    }
    upsertSummary(index, next)
    if (!saveIndex(index)) {
      throwPersistFailed("Failed to persist library index")
    }
  }

  async touchMetadata(
    id: string,
    patch: Partial<Pick<AnalysisDocument, "lastOpenedAt" | "name" | "folderId">>,
    options?: { knownDocument?: AnalysisDocument },
  ): Promise<void> {
    const nameOrFolderTouched =
      patch.name !== undefined || patch.folderId !== undefined
    const lastOpenedOnly =
      patch.lastOpenedAt !== undefined && !nameOrFolderTouched

    const existing =
      options?.knownDocument && options.knownDocument.id === id
        ? options.knownDocument
        : loadDoc(id)
    if (!existing) throw new Error("Analysis not found")
    assertNotTrashed(existing)

    const nextName =
      patch.name !== undefined ? patch.name.trim() || existing.name : existing.name
    const nextFolderId =
      patch.folderId !== undefined ? patch.folderId : (existing.folderId ?? null)

    if (nameOrFolderTouched) {
      const folderChanging =
        patch.folderId !== undefined &&
        (patch.folderId ?? null) !== (existing.folderId ?? null)
      const nameChanging =
        patch.name !== undefined &&
        nextName.trim().toLowerCase() !== existing.name.trim().toLowerCase()
      assertUniqueAnalysisName({
        name: nextName,
        folderId: nextFolderId,
        excludeId: existing.id,
        onMove: folderChanging && !nameChanging,
      })
    }

    const next: AnalysisDocument = {
      ...existing,
      ...(patch.name !== undefined ? { name: nextName } : {}),
      ...(patch.folderId !== undefined ? { folderId: patch.folderId } : {}),
      ...(patch.lastOpenedAt !== undefined
        ? { lastOpenedAt: patch.lastOpenedAt }
        : {}),
      updatedAt: nameOrFolderTouched ? nowIso() : existing.updatedAt,
    }

    // lastOpenedAt-only: prefer index summary update; rewrite body once without
    // a second load when the caller already supplied knownDocument.
    if (lastOpenedOnly) {
      const index = loadIndex()
      if (!index.analysisIds.includes(id)) {
        index.analysisIds = [id, ...index.analysisIds]
      }
      upsertSummary(index, next)
      if (!saveIndex(index)) {
        throw new Error("Failed to persist library summary")
      }
      // Keep document contract in sync with one write (no extra loadDoc).
      if (!saveDoc(next)) {
        throw new Error("Failed to persist lastOpenedAt")
      }
      return
    }

    if (!saveDocAndSyncSummary(next)) {
      throw new Error("Failed to persist analysis metadata")
    }
  }

  async archive(args: ArchiveAnalysisArgs): Promise<AnalysisDocument> {
    const existing = loadDoc(args.analysisId)
    if (!existing) throw new Error("Analysis not found")
    assertNotTrashed(existing)
    assertDraft(existing)
    const ts = nowIso()
    const {
      draftResultSeed: _seed,
      ongoingDraftResult: _ongoingDraftResult,
      singleDraftResult: _singleDraftResult,
      ...withoutSeed
    } = existing
    let workspace = {
      projects: args.snapshot.projectsAtArchive,
      activeProjectId: args.snapshot.activeProjectIdAtRun,
    }
    let ongoing = existing.ongoing
    if (existing.analysisMode === "ongoing" && ongoing) {
      workspace = ensureSingleProjectWorkspace(workspace)
      // Archive freezes document-level workspace from the snapshot; do not
      // reinterpret which checkpoint is active.
    } else {
      ongoing = undefined
    }
    const next: AnalysisDocument = {
      ...withoutSeed,
      status: "archived",
      analysisMode: normalizeAnalysisMode(existing.analysisMode),
      ...(ongoing ? { ongoing } : { ongoing: undefined }),
      updatedAt: ts,
      archivedSnapshot: args.snapshot,
      workspace,
    }
    // Final guard against a stale draft write winning the race.
    const latest = loadDoc(args.analysisId)
    if (!latest || latest.status !== "draft") {
      throw new Error("Cannot archive: analysis is no longer a draft")
    }
    if (!saveDoc(next)) {
      throw new Error("Failed to persist archived analysis")
    }
    const index = loadIndex()
    upsertSummary(index, next)
    if (!saveIndex(index)) {
      throw new Error("Failed to persist library summary after archive")
    }
    const verified = loadDoc(next.id)
    if (!verified || verified.status !== "archived") {
      throw new Error("Archive did not persist")
    }
    return verified
  }

  async completeOngoingAnalysis(analysisId: string): Promise<AnalysisDocument> {
    const existing = loadDoc(analysisId)
    if (!existing) throw new Error("Analysis not found")
    assertNotTrashed(existing)
    const block = getCompleteOngoingAnalysisBlockReason({
      status: existing.status,
      analysisMode: existing.analysisMode,
      ongoing: existing.ongoing,
    })
    if (block) {
      throw new Error(`Cannot complete ongoing analysis: ${block}`)
    }
    const ongoing = existing.ongoing!
    const latest = getLatestCheckpoint(ongoing)!
    const snapshot = latest.archivedSnapshot!
    const completedOngoing = completeOngoingLifecycle(ongoing)
    const ts = nowIso()
    const { draftResultSeed: _seed, ...withoutSeed } = existing
    const next: AnalysisDocument = {
      ...withoutSeed,
      status: "archived",
      analysisMode: "ongoing",
      ongoing: completedOngoing,
      updatedAt: ts,
      // Document-level freeze mirrors the tip; checkpoint snapshots stay authoritative.
      archivedSnapshot: isLegacyHeavyArchivedSnapshot(snapshot)
        ? snapshot
        : undefined,
      workspace: isLegacyHeavyArchivedSnapshot(snapshot)
        ? ensureSingleProjectWorkspace({
            projects: snapshot.projectsAtArchive,
            activeProjectId: snapshot.activeProjectIdAtRun,
          })
        : ensureSingleProjectWorkspace(latest.workspace),
    }
    const latestDoc = loadDoc(analysisId)
    if (!latestDoc || latestDoc.status !== "draft") {
      throw new Error("Cannot complete: analysis is no longer a draft")
    }
    if (latestDoc.ongoing?.lifecycle === "completed") {
      throw new Error("Cannot complete: analysis lifecycle already completed")
    }
    if (!saveDoc(next)) {
      throw new Error("Failed to persist completed ongoing analysis")
    }
    const index = loadIndex()
    upsertSummary(index, next)
    if (!saveIndex(index)) {
      throw new Error("Failed to persist library summary after complete")
    }
    const verified = loadDoc(next.id)
    if (
      !verified ||
      verified.status !== "archived" ||
      verified.ongoing?.lifecycle !== "completed"
    ) {
      throw new Error("Complete ongoing analysis did not persist")
    }
    return verified
  }

  async createDraftFromArchived(
    args: CreateDraftFromArchivedArgs,
  ): Promise<AnalysisDocument> {
    const archived = loadDoc(args.archivedId)
    if (!archived) throw new Error("Analysis not found")
    if (archived.status !== "archived") {
      throw new Error("Source must be archived")
    }
    assertNotTrashed(archived)
    const ts = nowIso()
    const sourceProjects = archived.workspace.projects
    const activeIndex = Math.max(
      0,
      sourceProjects.findIndex((p) => p.id === archived.workspace.activeProjectId),
    )
    const { projects: cloned, projectIdMap, rowIdMap } =
      cloneProjectsWithMaps(sourceProjects)
    const active = cloned[activeIndex]?.id ?? cloned[0]?.id
    if (!active) throw new Error("Empty workspace")

    const snapshot = archived.archivedSnapshot
    const draftResultSeed = snapshot
      ? isSingleArchivedResultSnapshot(snapshot)
        ? buildDraftCompactSeedFromSingleArchive({
            snapshot,
            projectIdMap,
            rowIdMap,
            inputSignature: JSON.stringify(cloned),
          })
        : buildDraftResultSeedFromArchive({
            snapshot,
            projectIdMap,
            rowIdMap,
            inputSignature: JSON.stringify(cloned),
          })
      : undefined

    const analysisMode = normalizeAnalysisMode(archived.analysisMode)
    let workspace = {
      projects: cloned,
      activeProjectId: active,
    }
    let ongoing: AnalysisDocument["ongoing"]
    if (analysisMode === "ongoing") {
      // New draft version: restart Ongoing at Checkpoint 1 from archived workspace.
      // Full history cloning across versions is deferred.
      workspace = ensureSingleProjectWorkspace(workspace)
      ongoing = createInitialOngoingState(workspace, { createdAt: ts })
      workspace = ongoing.checkpoints[0]!.workspace
    }

    const singleDraftResult =
      analysisMode === "single" && draftResultSeed?.compactByProjectId
        ? buildSingleDraftFromCompactSeed({
            analysisId: "", // filled after id assignment below
            inputSignature: draftResultSeed.inputSignature,
            simulationCount: draftResultSeed.simulationCount,
            activeProjectId: active,
            resultPreferences: draftResultSeed.resultPreferences,
            resultView: draftResultSeed.resultView,
            byProjectId: draftResultSeed.compactByProjectId,
            projectsAtRun: cloned,
          })
        : undefined

    const newDocId = newId()
    const doc: AnalysisDocument = {
      id: newDocId,
      name: args.name.trim() || archived.name,
      folderId: archived.folderId,
      status: "draft",
      analysisMode,
      ...(ongoing ? { ongoing } : {}),
      createdAt: ts,
      updatedAt: ts,
      lastOpenedAt: ts,
      schemaVersion: ANALYSIS_DOCUMENT_SCHEMA_VERSION,
      deletedAt: null,
      previousVersionId: archived.id,
      workspace,
      ...(draftResultSeed ? { draftResultSeed } : {}),
      ...(singleDraftResult
        ? {
            singleDraftResult: {
              ...singleDraftResult,
              analysisId: newDocId,
            },
          }
        : {}),
    }
    assertUniqueAnalysisName({
      name: doc.name,
      folderId: doc.folderId ?? null,
    })
    const index = loadIndex()
    index.analysisIds = [doc.id, ...index.analysisIds]
    upsertSummary(index, doc)
    const savedBody = saveDoc(doc)
    const savedIndex = saveIndex(index)
    const verified = loadDoc(doc.id)
    if (!savedBody || !savedIndex || !verified) {
      removeKey(analysisKey(doc.id))
      throw new Error("Failed to persist new draft version")
    }
    return verified
  }

  async createOngoingFromArchivedSingle(
    args: CreateOngoingFromArchivedSingleArgs,
  ): Promise<AnalysisDocument> {
    const source = loadDoc(args.archivedId)
    if (!source) throw new Error("Analysis not found")
    assertNotTrashed(source)
    if (source.status !== "archived") {
      throw new Error("Source must be archived")
    }
    if (normalizeAnalysisMode(source.analysisMode) !== "single") {
      throw new Error("Source must be a Single Analysis")
    }

    // Snapshot source bytes before planning — create must never rewrite the archive.
    const sourceBefore = JSON.stringify(source)
    const newAnalysisId = newId()

    const planned = planCreateOngoingFromArchivedSingle(source, {
      selectedProjectId: args.selectedProjectId,
      name: args.name,
      checkpointName: args.checkpointName,
      targetAnalysisId: newAnalysisId,
    })
    if (!planned.ok) {
      throw new Error(`Cannot start ongoing analysis: ${planned.reason}`)
    }

    const { plan } = planned
    const ts = nowIso()
    const doc: AnalysisDocument = {
      id: newAnalysisId,
      name: plan.name,
      folderId: plan.folderId,
      status: "draft",
      analysisMode: "ongoing",
      ongoing: structuredClone(plan.ongoing),
      createdAt: ts,
      updatedAt: ts,
      lastOpenedAt: ts,
      schemaVersion: ANALYSIS_DOCUMENT_SCHEMA_VERSION,
      deletedAt: null,
      sourceAnalysisId: plan.sourceAnalysisId,
      sourceProjectId: plan.sourceProjectId,
      workspace: ensureSingleProjectWorkspace(
        structuredClone(plan.workspace),
      ),
    }
    if (doc.id === source.id) {
      throw new Error("New ongoing analysis must use a distinct id")
    }
    assertUniqueAnalysisName({
      name: doc.name,
      folderId: doc.folderId ?? null,
    })

    const index = loadIndex()
    index.analysisIds = [doc.id, ...index.analysisIds]
    upsertSummary(index, doc)
    const savedBody = saveDoc(doc)
    const savedIndex = saveIndex(index)
    if (!savedBody || !savedIndex) {
      throw new Error("Failed to persist ongoing analysis")
    }

    const sourceAfter = loadDoc(args.archivedId)
    if (!sourceAfter || JSON.stringify(sourceAfter) !== sourceBefore) {
      throw new Error("Source archived analysis was mutated unexpectedly")
    }

    const verified = loadDoc(doc.id)
    if (!verified) throw new Error("Failed to persist ongoing analysis")
    if (verified.analysisMode !== "ongoing") {
      throw new Error("Persisted document is not ongoing")
    }
    return verified
  }

  async moveToTrash(id: string): Promise<void> {
    const existing = loadDoc(id)
    if (!existing) throw new Error("Analysis not found")
    if (isAnalysisTrashed(existing)) return
    const next = {
      ...existing,
      deletedAt: nowIso(),
    }
    if (!saveDocAndSyncSummary(next)) {
      throw new Error("Failed to move analysis to trash")
    }
  }

  async restore(id: string): Promise<void> {
    const existing = loadDoc(id)
    if (!existing) throw new Error("Analysis not found")
    if (!isAnalysisTrashed(existing)) return
    const index = loadIndex()
    const folderStillExists =
      existing.folderId == null ||
      index.folders.some((f) => f.id === existing.folderId)
    const next = {
      ...existing,
      deletedAt: null,
      folderId: folderStillExists ? existing.folderId : null,
    }
    if (!saveDocAndSyncSummary(next)) {
      throw new Error("Failed to restore analysis")
    }
  }

  async deletePermanently(id: string): Promise<void> {
    removePermanently(id)
  }

  async emptyTrash(): Promise<void> {
    purgeExpiredTrash()
    const index = ensureIndexSummaries(loadIndex())
    const keep: string[] = []
    for (const id of index.analysisIds) {
      const summary = index.summaries?.[id]
      if (!summary) continue
      if (isAnalysisTrashed(summary)) {
        removeKey(analysisKey(id))
        removeSummary(index, id)
        continue
      }
      keep.push(id)
    }
    index.analysisIds = keep
    saveIndex(index)
  }

  async createFolder(name: string): Promise<AnalysisFolder> {
    const ts = nowIso()
    const folder: AnalysisFolder = {
      id: newId(),
      name: name.trim() || "Folder",
      createdAt: ts,
      updatedAt: ts,
    }
    const index = loadIndex()
    index.folders = [...index.folders, folder]
    saveIndex(index)
    return folder
  }

  async renameFolder(id: string, name: string): Promise<AnalysisFolder> {
    const index = loadIndex()
    const idx = index.folders.findIndex((f) => f.id === id)
    if (idx < 0) throw new Error("Folder not found")
    const next: AnalysisFolder = {
      ...index.folders[idx]!,
      name: name.trim() || index.folders[idx]!.name,
      updatedAt: nowIso(),
    }
    index.folders = index.folders.map((f) => (f.id === id ? next : f))
    saveIndex(index)
    return next
  }

  async deleteFolder(id: string): Promise<void> {
    const index = ensureIndexSummaries(loadIndex())
    if (!index.folders.some((f) => f.id === id)) {
      throw new Error("Folder not found")
    }
    // Active (non-trashed) analyses block deletion. Soft-deleted docs may still
    // reference the folder; restore falls back to ungrouped if the folder is gone.
    for (const analysisId of index.analysisIds) {
      const summary = index.summaries?.[analysisId]
      if (
        summary &&
        summary.folderId === id &&
        !isAnalysisTrashed(summary)
      ) {
        throw new Error("Folder is not empty")
      }
    }
    index.folders = index.folders.filter((f) => f.id !== id)
    saveIndex(index)
  }
}

let singleton: LocalAnalysisLibraryRepository | null = null

export function getLocalAnalysisLibraryRepository(): AnalysisLibraryRepository {
  if (!singleton) singleton = new LocalAnalysisLibraryRepository()
  return singleton
}

/** Clears all library keys — tests only. */
export function clearLocalAnalysisLibraryStorageForTests(): void {
  const index = loadIndex()
  for (const id of index.analysisIds) {
    removeKey(analysisKey(id))
  }
  removeKey(LIBRARY_STORAGE_KEYS.index)
  memoryStore.clear()
  singleton = null
  __fullDocumentLoadCountForTests = 0
}

/** Test helper — write a raw body (e.g. legacy without analysisMode). */
export function __seedRawAnalysisDocForTests(
  id: string,
  raw: unknown,
): void {
  writeJson(analysisKey(id), raw)
  const index = loadIndex()
  if (!index.analysisIds.includes(id)) {
    index.analysisIds = [id, ...index.analysisIds]
  }
  const doc = loadDoc(id)
  if (doc) {
    upsertSummary(index, doc)
  }
  saveIndex(index)
}

/** Test helper — advance trash expiry checks with a custom clock via doc.deletedAt. */
export function __purgeExpiredTrashForTests(): void {
  purgeExpiredTrash()
}

/** Test helper — set deletedAt without going through moveToTrash. */
export function __setDeletedAtForTests(id: string, deletedAt: string): void {
  const doc = loadDoc(id)
  if (!doc) throw new Error("Analysis not found")
  saveDocAndSyncSummary({ ...doc, deletedAt })
}
