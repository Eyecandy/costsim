/**
 * Ongoing Analysis checkpoints — linear history for one project over time.
 *
 * Project stage lives in Project Profile (workspace), not duplicated here.
 *
 * ID policy when cloning checkpoint N → N+1:
 * - Preserve Project.id (same alternative followed over time)
 * - Preserve cost row IDs and driver row IDs (enables future “same item, changed values” diffs)
 * - Regenerate only the new checkpoint’s own id / sequence / timestamps
 *
 * Deliberately NOT implemented yet: change-diff UI, trends, benchmarks,
 * completion of the whole ongoing analysis, branching histories.
 */

import { newId } from "@/domain/results/tableRows"
import type { ArchivedAnalysisSnapshotV1 } from "@/lib/archivedAnalysisSnapshot"
import type { AnalysisWorkspacePayload } from "@/lib/analysisDocument"
import type { Project } from "@/lib/project"
import { PROJECT_NAME_MAX_LENGTH } from "@/lib/project"
import { cloneProjectProfile } from "@/lib/projectProfile"
import {
  cloneOngoingCheckpointResultSnapshotForNextCheckpoint,
  isLegacyHeavyArchivedSnapshot,
  isOngoingCheckpointResultSnapshot,
  legacyHeavyToOngoingCompact,
  type OngoingCheckpointResultSnapshotV1,
} from "@/lib/ongoingCheckpointResultSnapshot"
import { createBlankWorkspaceRuntimeState } from "@/lib/workspaceReset"

/** Prototype-safe ceiling; easy to raise/remove when backend storage arrives. */
export const MAX_CHECKPOINTS = 24

export type CheckpointStatus = "draft" | "archived"

/** Top-level ongoing analysis lifecycle (distinct from checkpoint archive). */
export type OngoingAnalysisLifecycle = "active" | "completed"

export type AnalysisCheckpoint = {
  id: string
  /** 1-based linear sequence. */
  sequence: number
  /** User-defined display name / decision point. */
  name: string
  status: CheckpointStatus
  createdAt: string
  archivedAt?: string | null
  /**
   * Reserved for future optional classification (e.g. decision gate).
   * Not required and unused in the skeleton.
   */
  checkpointType?: string
  /** Analytical inputs for this point in time (exactly one Project). */
  workspace: AnalysisWorkspacePayload
  /** Frozen results when the checkpoint is archived. */
  archivedSnapshot?:
    | ArchivedAnalysisSnapshotV1
    | OngoingCheckpointResultSnapshotV1
}

export type OngoingAnalysisState = {
  lifecycle: OngoingAnalysisLifecycle
  activeCheckpointId: string
  checkpoints: AnalysisCheckpoint[]
}

export type CreateNextCheckpointBlockReason =
  | "has_draft"
  | "source_not_archived"
  | "missing_snapshot"
  | "at_limit"
  | "lifecycle_completed"
  | "empty"

export function defaultCheckpointName(sequence: number): string {
  return `Checkpoint ${sequence}`
}

/**
 * Deep-clone workspace while preserving project and row IDs.
 * Do NOT use duplicateProject / cloneProjectsWithMaps here — those regenerate row IDs.
 */
export function cloneWorkspacePreservingIds(
  workspace: AnalysisWorkspacePayload,
): AnalysisWorkspacePayload {
  return {
    activeProjectId: workspace.activeProjectId,
    projects: workspace.projects.map((p) => cloneProjectPreservingIds(p)),
  }
}

/** Exported for tests / future diff prep — preserves Project.id and all row IDs. */
export function cloneProjectPreservingIds(source: Project): Project {
  return {
    ...source,
    costRows: source.costRows.map((r) => ({ ...r })),
    driverRows: source.driverRows.map((r) => ({ ...r })),
    driverImpacts: source.driverImpacts
      ? Object.fromEntries(
          Object.entries(source.driverImpacts).map(([d, byCost]) => [
            d,
            { ...byCost },
          ]),
        )
      : undefined,
    costCorrelations: source.costCorrelations
      ? Object.fromEntries(
          Object.entries(source.costCorrelations).map(([a, byB]) => [
            a,
            { ...byB },
          ]),
        )
      : undefined,
    assumptions: source.assumptions?.map((a) => ({ ...a })),
    profile: cloneProjectProfile(source.profile),
  }
}

/** Ongoing analyses always operate on exactly one Project alternative. */
export function ensureSingleProjectWorkspace(
  workspace: AnalysisWorkspacePayload,
): AnalysisWorkspacePayload {
  const first = workspace.projects[0]
  if (!first) {
    const blank = createBlankWorkspaceRuntimeState()
    return {
      projects: blank.projects,
      activeProjectId: blank.activeProjectId,
    }
  }
  return {
    projects: [first],
    activeProjectId: first.id,
  }
}

export function createInitialCheckpoint(
  workspace: AnalysisWorkspacePayload,
  options?: {
    name?: string
    createdAt?: string
    sequence?: number
  },
): AnalysisCheckpoint {
  const sequence = options?.sequence ?? 1
  const createdAt = options?.createdAt ?? new Date().toISOString()
  const single = ensureSingleProjectWorkspace(workspace)
  return {
    id: newId(),
    sequence,
    name: (options?.name?.trim() || defaultCheckpointName(sequence)).slice(
      0,
      80,
    ),
    status: "draft",
    createdAt,
    archivedAt: null,
    workspace: cloneWorkspacePreservingIds(single),
  }
}

export function createInitialOngoingState(
  workspace: AnalysisWorkspacePayload,
  options?: { checkpointName?: string; createdAt?: string },
): OngoingAnalysisState {
  const checkpoint = createInitialCheckpoint(workspace, {
    name: options?.checkpointName,
    createdAt: options?.createdAt,
  })
  return {
    lifecycle: "active",
    activeCheckpointId: checkpoint.id,
    checkpoints: [checkpoint],
  }
}

/** Exact active checkpoint — no silent fallback to checkpoints[0]. */
export function getActiveCheckpoint(
  ongoing: OngoingAnalysisState | undefined,
): AnalysisCheckpoint | undefined {
  if (!ongoing) return undefined
  return ongoing.checkpoints.find((c) => c.id === ongoing.activeCheckpointId)
}

/**
 * Load/recovery only: when activeCheckpointId is corrupt, use first checkpoint.
 * Do not call during normal editing/autosave.
 */
export function resolveActiveCheckpointOnLoad(
  ongoing: OngoingAnalysisState,
): AnalysisCheckpoint {
  return (
    ongoing.checkpoints.find((c) => c.id === ongoing.activeCheckpointId) ??
    ongoing.checkpoints[0]!
  )
}

export function getDraftCheckpoints(
  ongoing: OngoingAnalysisState,
): AnalysisCheckpoint[] {
  return ongoing.checkpoints.filter((c) => c.status === "draft")
}

export function hasDraftCheckpoint(ongoing: OngoingAnalysisState): boolean {
  return getDraftCheckpoints(ongoing).length > 0
}

/** Highest-sequence checkpoint (linear tip of the history). */
export function getLatestCheckpoint(
  ongoing: OngoingAnalysisState,
): AnalysisCheckpoint | undefined {
  if (ongoing.checkpoints.length === 0) return undefined
  return [...ongoing.checkpoints].sort((a, b) => a.sequence - b.sequence).at(
    -1,
  )
}

/** Write current workspace back into the active draft checkpoint. */
export function syncActiveCheckpointWorkspace(
  ongoing: OngoingAnalysisState,
  workspace: AnalysisWorkspacePayload,
): OngoingAnalysisState {
  const activeId = ongoing.activeCheckpointId
  const single = ensureSingleProjectWorkspace(workspace)
  return {
    ...ongoing,
    checkpoints: ongoing.checkpoints.map((c) =>
      c.id === activeId && c.status === "draft"
        ? {
            ...c,
            workspace: cloneWorkspacePreservingIds(single),
          }
        : c,
    ),
  }
}

/**
 * Mark a checkpoint archived with a frozen snapshot.
 * Does not create the next checkpoint and does not complete the ongoing analysis.
 */
export function archiveCheckpoint(
  ongoing: OngoingAnalysisState,
  checkpointId: string,
  snapshot: ArchivedAnalysisSnapshotV1 | OngoingCheckpointResultSnapshotV1,
  archivedAt: string = new Date().toISOString(),
): OngoingAnalysisState {
  return {
    ...ongoing,
    checkpoints: ongoing.checkpoints.map((c) =>
      c.id === checkpointId
        ? {
            ...c,
            status: "archived" as const,
            archivedAt,
            archivedSnapshot: snapshot,
            workspace: isLegacyHeavyArchivedSnapshot(snapshot)
              ? ensureSingleProjectWorkspace({
                  projects: snapshot.projectsAtArchive,
                  activeProjectId:
                    snapshot.activeProjectIdAtRun ||
                    snapshot.projectsAtArchive[0]?.id ||
                    c.workspace.activeProjectId,
                })
              : c.workspace,
          }
        : c,
    ),
  }
}

export function selectCheckpoint(
  ongoing: OngoingAnalysisState,
  checkpointId: string,
): OngoingAnalysisState | null {
  if (!ongoing.checkpoints.some((c) => c.id === checkpointId)) return null
  return { ...ongoing, activeCheckpointId: checkpointId }
}

/** Primary stage option id from the checkpoint's single project profile. */
export function checkpointPrimaryStageId(
  checkpoint: AnalysisCheckpoint,
): string | undefined {
  return checkpoint.workspace.projects[0]?.profile?.phase
}

export function getCreateNextCheckpointBlockReason(
  ongoing: OngoingAnalysisState | undefined,
): CreateNextCheckpointBlockReason | null {
  if (!ongoing || ongoing.checkpoints.length === 0) return "empty"
  if (ongoing.lifecycle === "completed") return "lifecycle_completed"
  if (ongoing.checkpoints.length >= MAX_CHECKPOINTS) return "at_limit"
  if (hasDraftCheckpoint(ongoing)) return "has_draft"
  const latest = getLatestCheckpoint(ongoing)
  if (!latest || latest.status !== "archived") return "source_not_archived"
  if (!latest.archivedSnapshot) return "missing_snapshot"
  return null
}

export function canCreateNextCheckpoint(
  ongoing: OngoingAnalysisState | undefined,
): boolean {
  return getCreateNextCheckpointBlockReason(ongoing) === null
}

/**
 * Why deleting the tip draft checkpoint is blocked.
 * Only the currently viewed tip draft with an archived predecessor may be deleted.
 * This never deletes the AnalysisDocument.
 */
export type DeleteActiveDraftCheckpointBlockReason =
  | "empty"
  | "lifecycle_completed"
  | "not_draft"
  | "not_tip"
  | "not_active"
  | "no_archived_predecessor"

export function getDeleteActiveDraftCheckpointBlockReason(
  ongoing: OngoingAnalysisState | undefined,
): DeleteActiveDraftCheckpointBlockReason | null {
  if (!ongoing || ongoing.checkpoints.length === 0) return "empty"
  if (ongoing.lifecycle === "completed") return "lifecycle_completed"
  const active = getActiveCheckpoint(ongoing)
  if (!active) return "empty"
  if (active.id !== ongoing.activeCheckpointId) return "not_active"
  if (active.status !== "draft") return "not_draft"
  const tip = getLatestCheckpoint(ongoing)
  if (!tip || tip.id !== active.id) return "not_tip"
  const hasArchivedPredecessor = ongoing.checkpoints.some(
    (c) => c.id !== active.id && c.status === "archived",
  )
  if (!hasArchivedPredecessor) return "no_archived_predecessor"
  return null
}

export function canDeleteActiveDraftCheckpoint(
  ongoing: OngoingAnalysisState | undefined,
): boolean {
  return getDeleteActiveDraftCheckpointBlockReason(ongoing) === null
}

export type DeleteActiveDraftCheckpointResult =
  | {
      ok: true
      ongoing: OngoingAnalysisState
      deletedCheckpointId: string
      restoredCheckpoint: AnalysisCheckpoint
    }
  | { ok: false; reason: DeleteActiveDraftCheckpointBlockReason }

/**
 * Remove only the active tip draft checkpoint; restore previous archived tip.
 * Does not mutate archived checkpoints, document identity, Trash, or deletedAt.
 * Lifecycle stays active.
 */
export function deleteActiveDraftCheckpoint(
  ongoing: OngoingAnalysisState,
): DeleteActiveDraftCheckpointResult {
  const block = getDeleteActiveDraftCheckpointBlockReason(ongoing)
  if (block) return { ok: false, reason: block }

  const tip = getLatestCheckpoint(ongoing)!
  const remaining = ongoing.checkpoints.filter((c) => c.id !== tip.id)
  const restored = [...remaining].sort((a, b) => a.sequence - b.sequence).at(
    -1,
  )
  if (!restored || restored.status !== "archived") {
    return { ok: false, reason: "no_archived_predecessor" }
  }

  return {
    ok: true,
    ongoing: {
      lifecycle: "active",
      activeCheckpointId: restored.id,
      checkpoints: remaining,
    },
    deletedCheckpointId: tip.id,
    restoredCheckpoint: restored,
  }
}

/**
 * Why finishing the whole Ongoing Analysis is blocked.
 * Distinct from checkpoint-archive block reasons.
 */
export type CompleteOngoingAnalysisBlockReason =
  | "not_found"
  | "not_draft"
  | "not_ongoing"
  | "missing_ongoing"
  | "lifecycle_completed"
  | "empty"
  | "latest_not_archived"
  | "has_draft"

/**
 * Preconditions for finishing an Ongoing Analysis (not archiving a checkpoint).
 * Latest tip must already be archived; never auto-archives.
 */
export function getCompleteOngoingAnalysisBlockReason(args: {
  status?: string | null
  analysisMode?: string | null
  ongoing?: OngoingAnalysisState | null
} | null | undefined): CompleteOngoingAnalysisBlockReason | null {
  if (!args) return "not_found"
  if (args.status !== "draft") return "not_draft"
  if (args.analysisMode !== "ongoing") return "not_ongoing"
  const ongoing = args.ongoing
  if (!ongoing) return "missing_ongoing"
  if (ongoing.lifecycle === "completed") return "lifecycle_completed"
  if (ongoing.checkpoints.length === 0) return "empty"
  if (hasDraftCheckpoint(ongoing)) return "has_draft"
  const latest = getLatestCheckpoint(ongoing)
  if (!latest || latest.status !== "archived" || !latest.archivedSnapshot) {
    return "latest_not_archived"
  }
  return null
}

/**
 * Mark the Ongoing Analysis lifecycle completed. Does not mutate checkpoints,
 * snapshots, or activeCheckpointId. Caller sets AnalysisDocument.status.
 */
export function completeOngoingAnalysis(
  ongoing: OngoingAnalysisState,
): OngoingAnalysisState {
  if (ongoing.lifecycle === "completed") return ongoing
  return {
    ...ongoing,
    lifecycle: "completed",
  }
}

function frozenWorkspaceFromCheckpoint(
  checkpoint: AnalysisCheckpoint,
): AnalysisWorkspacePayload {
  if (
    checkpoint.workspace.projects.length > 0
  ) {
    return ensureSingleProjectWorkspace(checkpoint.workspace)
  }
  if (
    checkpoint.archivedSnapshot &&
    isLegacyHeavyArchivedSnapshot(checkpoint.archivedSnapshot)
  ) {
    return ensureSingleProjectWorkspace({
      projects: checkpoint.archivedSnapshot.projectsAtArchive,
      activeProjectId: checkpoint.archivedSnapshot.activeProjectIdAtRun,
    })
  }
  return ensureSingleProjectWorkspace(checkpoint.workspace)
}

/** Identity maps — IDs are intentionally unchanged across checkpoints. */
export function buildPreservedIdMaps(
  workspace: AnalysisWorkspacePayload,
): {
  projectIdMap: Map<string, string>
  rowIdMap: Map<string, string>
} {
  const projectIdMap = new Map<string, string>()
  const rowIdMap = new Map<string, string>()
  for (const p of workspace.projects) {
    projectIdMap.set(p.id, p.id)
    for (const r of p.costRows) rowIdMap.set(r.id, r.id)
    for (const r of p.driverRows) rowIdMap.set(r.id, r.id)
  }
  return { projectIdMap, rowIdMap }
}

export type CreateNextCheckpointResult =
  | {
      ok: true
      ongoing: OngoingAnalysisState
      newCheckpoint: AnalysisCheckpoint
      sourceCheckpoint: AnalysisCheckpoint
      inheritedResult: OngoingCheckpointResultSnapshotV1
    }
  | { ok: false; reason: CreateNextCheckpointBlockReason }

/**
 * Ongoing CP2+: display Project.name from the AnalysisDocument name.
 * Does not touch IDs or analytical fields. No-op when name is empty.
 */
export function applyOngoingAnalysisNameToWorkspace(
  workspace: AnalysisWorkspacePayload,
  analysisName: string | undefined,
): AnalysisWorkspacePayload {
  const name = analysisName?.trim().slice(0, PROJECT_NAME_MAX_LENGTH)
  if (!name) return workspace
  return {
    activeProjectId: workspace.activeProjectId,
    projects: workspace.projects.map((p, index) =>
      index === 0 ? { ...p, name } : p,
    ),
  }
}

/**
 * Create Checkpoint N+1 from the latest archived checkpoint.
 * Preserves Project.id and all cost/driver row IDs for future diffs.
 * When `analysisName` is provided (Ongoing Analysis document name), the
 * cloned Project.name is set to that value — archived history is untouched.
 */
export function createNextCheckpoint(
  ongoing: OngoingAnalysisState,
  options?: {
    name?: string
    createdAt?: string
    analysisName?: string
    analysisId?: string
  },
): CreateNextCheckpointResult {
  const block = getCreateNextCheckpointBlockReason(ongoing)
  if (block) return { ok: false, reason: block }

  const source = getLatestCheckpoint(ongoing)!
  const snapshot = source.archivedSnapshot!
  const sequence = source.sequence + 1
  const createdAt = options?.createdAt ?? new Date().toISOString()
  const sourceWorkspace = frozenWorkspaceFromCheckpoint(source)
  const workspace = applyOngoingAnalysisNameToWorkspace(
    cloneWorkspacePreservingIds(sourceWorkspace),
    options?.analysisName,
  )
  const newCheckpoint: AnalysisCheckpoint = {
    id: newId(),
    sequence,
    name: (options?.name?.trim() || defaultCheckpointName(sequence)).slice(
      0,
      80,
    ),
    status: "draft",
    createdAt,
    archivedAt: null,
    workspace,
  }
  const analysisId =
    options?.analysisId ??
    (isOngoingCheckpointResultSnapshot(snapshot) ? snapshot.analysisId : "")
  const inheritedResult = isOngoingCheckpointResultSnapshot(snapshot)
    ? cloneOngoingCheckpointResultSnapshotForNextCheckpoint(snapshot, {
        analysisId,
        checkpointId: newCheckpoint.id,
      })
    : legacyHeavyToOngoingCompact({
        snapshot,
        analysisId,
        checkpointId: newCheckpoint.id,
        projects: sourceWorkspace.projects,
      })
  const nextOngoing: OngoingAnalysisState = {
    ...ongoing,
    activeCheckpointId: newCheckpoint.id,
    checkpoints: [...ongoing.checkpoints, newCheckpoint],
  }
  return {
    ok: true,
    ongoing: nextOngoing,
    newCheckpoint,
    sourceCheckpoint: source,
    inheritedResult,
  }
}

/**
 * Future plug-in: create Ongoing Analysis from an archived Single Analysis.
 *
 * Required later:
 * - if one alternative → use it
 * - if multiple → caller chooses which Project becomes the starting project
 * - original archived Single Analysis remains unchanged
 */
export function planOngoingFromSingleArchiveProjects(
  sourceProjects: readonly Project[],
  selectedProjectId: string,
  options?: { checkpointName?: string; createdAt?: string },
): {
  workspace: AnalysisWorkspacePayload
  ongoing: OngoingAnalysisState
} | null {
  const selected = sourceProjects.find((p) => p.id === selectedProjectId)
  if (!selected) return null
  const workspace: AnalysisWorkspacePayload = {
    projects: [cloneProjectPreservingIds(selected)],
    activeProjectId: selected.id,
  }
  const ongoing = createInitialOngoingState(workspace, options)
  return {
    workspace: ongoing.checkpoints[0]!.workspace,
    ongoing,
  }
}

export function normalizeOngoingState(
  raw: unknown,
): OngoingAnalysisState | undefined {
  if (!raw || typeof raw !== "object") return undefined
  const o = raw as Record<string, unknown>
  if (!Array.isArray(o.checkpoints) || o.checkpoints.length === 0) {
    return undefined
  }
  const checkpoints: AnalysisCheckpoint[] = []
  for (const item of o.checkpoints) {
    if (!item || typeof item !== "object") continue
    const c = item as Record<string, unknown>
    if (typeof c.id !== "string" || !c.id) continue
    if (typeof c.sequence !== "number" || !Number.isFinite(c.sequence)) continue
    if (typeof c.name !== "string") continue
    if (c.status !== "draft" && c.status !== "archived") continue
    if (typeof c.createdAt !== "string") continue
    const ws = c.workspace as AnalysisWorkspacePayload | undefined
    if (!ws?.projects || !Array.isArray(ws.projects) || ws.projects.length === 0) {
      continue
    }
    const single = ensureSingleProjectWorkspace({
      projects: ws.projects,
      activeProjectId: ws.activeProjectId || ws.projects[0]!.id,
    })
    checkpoints.push({
      id: c.id,
      sequence: Math.max(1, Math.floor(c.sequence)),
      name: c.name.trim() || defaultCheckpointName(Math.floor(c.sequence)),
      status: c.status,
      createdAt: c.createdAt,
      archivedAt:
        typeof c.archivedAt === "string" ? c.archivedAt : null,
      ...(typeof c.checkpointType === "string"
        ? { checkpointType: c.checkpointType }
        : {}),
      workspace: single,
      ...(c.archivedSnapshot && typeof c.archivedSnapshot === "object"
        ? {
            archivedSnapshot: c.archivedSnapshot as
              | ArchivedAnalysisSnapshotV1
              | OngoingCheckpointResultSnapshotV1,
          }
        : {}),
    })
  }
  if (checkpoints.length === 0) return undefined
  checkpoints.sort((a, b) => a.sequence - b.sequence)
  // Soft-cap: keep first MAX_CHECKPOINTS if corrupt data exceeds the limit.
  const capped = checkpoints.slice(0, MAX_CHECKPOINTS)
  const activeCheckpointId =
    typeof o.activeCheckpointId === "string" &&
    capped.some((c) => c.id === o.activeCheckpointId)
      ? o.activeCheckpointId
      : capped[0]!.id
  const lifecycle: OngoingAnalysisLifecycle =
    o.lifecycle === "completed" ? "completed" : "active"
  return { lifecycle, activeCheckpointId, checkpoints: capped }
}
