/**
 * Start a new Ongoing Analysis from an archived Single Analysis.
 *
 * Copy/import only — never mutates the source document.
 *
 * ID policy:
 * - Preserved: selected Project.id, cost row IDs, driver row IDs (baseline for diffs)
 * - Regenerated: AnalysisDocument.id, Checkpoint 1 id / timestamps
 *
 * Checkpoint 1 is initialized as archived with a filtered frozen snapshot when
 * available, so it is the historical baseline and Create next works without
 * forcing a re-simulation of the imported state.
 */

import type {
  AnalysisDocument,
  AnalysisWorkspacePayload,
} from "@/lib/analysisDocument"
import { isAnalysisTrashed } from "@/lib/analysisDocument"
import type { ArchivedAnalysisSnapshotV1 } from "@/lib/archivedAnalysisSnapshot"
import {
  archiveCheckpoint,
  planOngoingFromSingleArchiveProjects,
  type AnalysisCheckpoint,
  type OngoingAnalysisState,
} from "@/lib/analysisCheckpoint"
import type { Project } from "@/lib/project"
import {
  isSingleArchivedResultSnapshot,
  type SingleAnalysisArchivedSnapshot,
} from "@/lib/singleArchivedResultSnapshot"
import type { OngoingCheckpointResultSnapshotV1 } from "@/lib/ongoingCheckpointResultSnapshot"
import { buildSimulationInputSignature } from "@/domain/simulation/simulationInputSignature"

export type StartOngoingFromArchivedSingleBlockReason =
  | "not_found"
  | "trashed"
  | "not_archived"
  | "not_single"
  | "empty"
  | "project_not_found"
  | "need_selection"

export type StartOngoingFromArchivedSinglePlan = {
  name: string
  folderId: string | null
  workspace: AnalysisWorkspacePayload
  ongoing: OngoingAnalysisState
  sourceAnalysisId: string
  sourceProjectId: string
  /** Filtered freeze for Checkpoint 1 — null when source had no snapshot. */
  checkpointSnapshot: AnalysisCheckpoint["archivedSnapshot"] | null
}

export type StartOngoingFromArchivedSingleResult =
  | { ok: true; plan: StartOngoingFromArchivedSinglePlan }
  | {
      ok: false
      reason: StartOngoingFromArchivedSingleBlockReason
      /** Present when reason is need_selection. */
      projects?: readonly Project[]
    }

/** Deep clone so the new Ongoing doc never shares mutable refs with the source. */
function cloneIsolated<T>(value: T): T {
  return structuredClone(value)
}

/** Authoritative alternatives on an archived Single (snapshot first, else workspace). */
export function resolveArchivedSingleAlternatives(
  source: Pick<AnalysisDocument, "archivedSnapshot" | "workspace">,
): readonly Project[] {
  const fromSnap = source.archivedSnapshot?.projectsAtArchive
  if (fromSnap && fromSnap.length > 0) return fromSnap
  return source.workspace.projects
}

/** True when the library action should be offered. */
export function canStartOngoingFromArchivedSingle(
  doc: Pick<AnalysisDocument, "status" | "analysisMode" | "deletedAt">,
): boolean {
  return (
    !isAnalysisTrashed(doc) &&
    doc.status === "archived" &&
    doc.analysisMode === "single"
  )
}

/**
 * Slice a multi-project archive freeze down to one alternative.
 * Preserves project/row IDs; does not re-run simulation.
 * Returns a deep clone — safe to attach to a new document.
 */
export function filterArchivedSnapshotToProject(
  snapshot: ArchivedAnalysisSnapshotV1,
  projectId: string,
  ownership?: { analysisId: string; checkpointId: string },
): ArchivedAnalysisSnapshotV1 | null
export function filterArchivedSnapshotToProject(
  snapshot: SingleAnalysisArchivedSnapshot,
  projectId: string,
  ownership?: { analysisId: string; checkpointId: string },
): ArchivedAnalysisSnapshotV1 | OngoingCheckpointResultSnapshotV1 | null
export function filterArchivedSnapshotToProject(
  snapshot: SingleAnalysisArchivedSnapshot,
  projectId: string,
  ownership?: { analysisId: string; checkpointId: string },
): ArchivedAnalysisSnapshotV1 | OngoingCheckpointResultSnapshotV1 | null {
  const project = snapshot.projectsAtArchive.find((p) => p.id === projectId)
  if (!project) return null
  const projectsAtArchive = [cloneIsolated(project)]
  if (isSingleArchivedResultSnapshot(snapshot)) {
    const compact = snapshot.byProjectId[projectId]
    if (!compact) return null
    return {
      kind: "ongoing_checkpoint_result_v1",
      schemaVersion: 1,
      modelVersion: snapshot.modelVersion,
      computedAt: snapshot.archivedAt,
      simulationCount: snapshot.simulationCount,
      inputSignature: buildSimulationInputSignature(projectsAtArchive),
      analysisId: ownership?.analysisId ?? snapshot.analysisId,
      checkpointId: ownership?.checkpointId ?? "",
      activeProjectId: projectId,
      incurredCosts: compact.incurredCosts,
      simulatedBaseCost: compact.simulatedBaseCost,
      keyFigures: cloneIsolated(compact.keyFigures),
      sCurve: cloneIsolated(compact.sCurve),
      tornado: cloneIsolated(compact.tornado),
      contribution: cloneIsolated(compact.contribution),
      resultPreferences: cloneIsolated(snapshot.resultPreferences),
      resultView: cloneIsolated(snapshot.resultView),
      ...(snapshot.simulationRunIdByProjectId?.[projectId]
        ? {
            simulationRunIdByProjectId: {
              [projectId]: snapshot.simulationRunIdByProjectId[projectId]!,
            },
          }
        : {}),
    }
  }
  return {
    v: snapshot.v,
    archivedAt: snapshot.archivedAt,
    schemaVersion: snapshot.schemaVersion,
    modelVersion: snapshot.modelVersion,
    simulationCount: snapshot.simulationCount,
    resultPreferences: cloneIsolated(snapshot.resultPreferences),
    resultView: snapshot.resultView,
    projectsAtArchive,
    activeProjectIdAtRun: projectId,
    inputSignature: JSON.stringify(projectsAtArchive),
    projectResults: cloneIsolated(
      snapshot.projectResults.filter((pr) => pr.projectId === projectId),
    ),
    simulatedBaseCostByProjectId: {
      [projectId]: snapshot.simulatedBaseCostByProjectId[projectId] ?? null,
    },
    tornadoByProjectId:
      projectId in snapshot.tornadoByProjectId
        ? {
            [projectId]: cloneIsolated(snapshot.tornadoByProjectId[projectId]!),
          }
        : {},
    shapleyByProjectId:
      projectId in snapshot.shapleyByProjectId
        ? {
            [projectId]: cloneIsolated(snapshot.shapleyByProjectId[projectId]!),
          }
        : {},
  }
}

/**
 * Plan a new Ongoing Analysis from an archived Single Analysis.
 * Caller persists via the library repository — source doc is never written.
 */
export function planCreateOngoingFromArchivedSingle(
  source: AnalysisDocument,
  options?: {
    selectedProjectId?: string
    name?: string
    checkpointName?: string
    createdAt?: string
    /** Owning id when the caller has already allocated the new document id. */
    targetAnalysisId?: string
  },
): StartOngoingFromArchivedSingleResult {
  if (isAnalysisTrashed(source)) {
    return { ok: false, reason: "trashed" }
  }
  if (source.status !== "archived") {
    return { ok: false, reason: "not_archived" }
  }
  if (source.analysisMode !== "single") {
    return { ok: false, reason: "not_single" }
  }

  const sourceProjects = resolveArchivedSingleAlternatives(source)

  if (!sourceProjects.length) {
    return { ok: false, reason: "empty" }
  }

  let selectedProjectId = options?.selectedProjectId
  if (!selectedProjectId) {
    if (sourceProjects.length === 1) {
      selectedProjectId = sourceProjects[0]!.id
    } else {
      return {
        ok: false,
        reason: "need_selection",
        projects: sourceProjects,
      }
    }
  }

  if (!sourceProjects.some((p) => p.id === selectedProjectId)) {
    return { ok: false, reason: "project_not_found" }
  }

  // Deep-clone sources before planning so workspace/ongoing never alias archive data.
  const isolatedProjects = sourceProjects.map((p) => cloneIsolated(p))
  const planned = planOngoingFromSingleArchiveProjects(
    isolatedProjects,
    selectedProjectId,
    {
      checkpointName: options?.checkpointName,
      createdAt: options?.createdAt,
    },
  )
  if (!planned) {
    return { ok: false, reason: "project_not_found" }
  }

  const createdAt = options?.createdAt ?? new Date().toISOString()
  let ongoing = planned.ongoing
  let checkpointSnapshot: AnalysisCheckpoint["archivedSnapshot"] | null = null

  if (source.archivedSnapshot) {
    const cp1Id = ongoing.checkpoints[0]!.id
    checkpointSnapshot = filterArchivedSnapshotToProject(
      source.archivedSnapshot,
      selectedProjectId,
      {
        analysisId: options?.targetAnalysisId ?? source.id,
        checkpointId: cp1Id,
      },
    )
    if (checkpointSnapshot) {
      ongoing = archiveCheckpoint(
        ongoing,
        cp1Id,
        checkpointSnapshot,
        createdAt,
      )
    }
  }

  const selectedName =
    planned.workspace.projects[0]?.name?.trim() || source.name

  return {
    ok: true,
    plan: {
      name: (options?.name?.trim() || selectedName || source.name).slice(0, 120),
      folderId: source.folderId,
      workspace: planned.workspace,
      ongoing,
      sourceAnalysisId: source.id,
      sourceProjectId: selectedProjectId,
      checkpointSnapshot,
    },
  }
}

/** @deprecated Prefer planCreateOngoingFromArchivedSingle — kept as thin alias. */
export function createOngoingFromArchivedSingle(
  source: AnalysisDocument,
  options?: {
    selectedProjectId?: string
    name?: string
    checkpointName?: string
    createdAt?: string
  },
): StartOngoingFromArchivedSingleResult {
  return planCreateOngoingFromArchivedSingle(source, options)
}
