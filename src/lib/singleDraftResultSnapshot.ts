import {
  ARCHIVE_MODEL_VERSION,
} from "@/lib/archivedAnalysisSnapshot"
import {
  assertNoHeavyValuesInCompact,
  buildCompactProjectResult,
  type CompactProjectResultV1,
} from "@/lib/compactAnalysisResult"
import type { Project } from "@/lib/project"
import {
  resolveResultView,
  type ResolvedResultView,
  type ResultPreferencesV1,
} from "@/lib/resultPreferences"
import type { ShapleyAttributionResult } from "@/domain/simulation/shapleyAttribution"
import type { ProjectResult } from "@/simulation.worker"
import {
  SINGLE_ARCHIVED_RESULT_KIND,
  SINGLE_ARCHIVED_RESULT_SCHEMA_VERSION,
  type SingleArchivedResultSnapshotV1,
} from "@/lib/singleArchivedResultSnapshot"

export const SINGLE_DRAFT_RESULT_KIND = "single_draft_result_v1" as const
export const SINGLE_DRAFT_RESULT_SCHEMA_VERSION = 1 as const

/**
 * Compact persisted analytical result for an editable Single Analysis draft.
 * Workspace holds current editable inputs; `projectsAtRun` is the simulation
 * baseline for green-cell / Undo continuity after reload.
 */
export type SingleDraftResultSnapshotV1 = {
  kind: typeof SINGLE_DRAFT_RESULT_KIND
  schemaVersion: typeof SINGLE_DRAFT_RESULT_SCHEMA_VERSION
  modelVersion: string
  computedAt: string
  analysisId: string
  simulationCount: number
  inputSignature: string
  activeProjectIdAtRun: string
  /**
   * Full projects captured at the successful simulation that produced this
   * compact result. Required for changed-cell highlighting and Undo after reload.
   * Optional for legacy drafts written before this field existed.
   */
  projectsAtRun?: Project[]
  resultPreferences: ResultPreferencesV1
  resultView: ResolvedResultView
  byProjectId: Record<string, CompactProjectResultV1>
  simulationRunIdByProjectId?: Record<string, string>
}

export type BuildSingleDraftResultSnapshotInput = {
  analysisId: string
  projects: readonly Project[]
  activeProjectId: string
  projectResults: readonly ProjectResult[]
  simulatedBaseCostByProjectId: Readonly<Record<string, number | null>>
  inputSignature: string
  simulationCount: number
  resultPreferences: ResultPreferencesV1
  resultView?: ResolvedResultView
  shapleyByProjectId?: Readonly<
    Record<string, ShapleyAttributionResult | null>
  >
  computedAt?: string
  simulationRunIdByProjectId?: Readonly<Record<string, string>>
  /** Defaults to a clone of `projects` (the run that produced the result). */
  projectsAtRun?: readonly Project[]
}

export function isSingleDraftResultSnapshot(
  value: unknown,
): value is SingleDraftResultSnapshotV1 {
  if (!value || typeof value !== "object") return false
  const o = value as Record<string, unknown>
  return (
    o.kind === SINGLE_DRAFT_RESULT_KIND &&
    o.schemaVersion === SINGLE_DRAFT_RESULT_SCHEMA_VERSION &&
    typeof o.analysisId === "string" &&
    typeof o.inputSignature === "string" &&
    typeof o.activeProjectIdAtRun === "string" &&
    typeof o.byProjectId === "object" &&
    o.byProjectId !== null
  )
}

export function buildSingleDraftResultSnapshot(
  input: BuildSingleDraftResultSnapshotInput,
): SingleDraftResultSnapshotV1 {
  const resultPreferences = structuredClone(input.resultPreferences)
  const resultView =
    structuredClone(input.resultView) ?? resolveResultView(resultPreferences)
  const byProjectId: Record<string, CompactProjectResultV1> = {}

  for (const project of input.projects) {
    const result = input.projectResults.find((item) => item.projectId === project.id)
    if (!result) continue
    byProjectId[project.id] = buildCompactProjectResult({
      project,
      result,
      simulatedBaseCost:
        input.simulatedBaseCostByProjectId[project.id] ?? null,
      resultView,
      contribution: input.shapleyByProjectId?.[project.id] ?? null,
    })
  }

  const snapshot: SingleDraftResultSnapshotV1 = {
    kind: SINGLE_DRAFT_RESULT_KIND,
    schemaVersion: SINGLE_DRAFT_RESULT_SCHEMA_VERSION,
    modelVersion: ARCHIVE_MODEL_VERSION,
    computedAt: input.computedAt ?? new Date().toISOString(),
    analysisId: input.analysisId,
    simulationCount: input.simulationCount,
    inputSignature: input.inputSignature,
    activeProjectIdAtRun: input.activeProjectId,
    projectsAtRun: structuredClone(
      input.projectsAtRun ?? input.projects,
    ) as Project[],
    resultPreferences,
    resultView,
    byProjectId,
    ...(input.simulationRunIdByProjectId
      ? {
          simulationRunIdByProjectId: {
            ...input.simulationRunIdByProjectId,
          },
        }
      : {}),
  }
  assertNoHeavyValuesInCompact(snapshot)
  return snapshot
}

/** Freeze a valid Single draft compact into the archived Single compact snapshot. */
export function freezeSingleDraftForArchive(args: {
  draft: SingleDraftResultSnapshotV1
  projects: readonly Project[]
  archivedAt?: string
  /** Current editable prefs when analytics are already supported by the draft. */
  resultPreferences?: ResultPreferencesV1
}): SingleArchivedResultSnapshotV1 {
  const resultPreferences = structuredClone(
    args.resultPreferences ?? args.draft.resultPreferences,
  )
  const resultView = args.resultPreferences
    ? resolveResultView(resultPreferences)
    : structuredClone(args.draft.resultView)
  const archived: SingleArchivedResultSnapshotV1 = {
    kind: SINGLE_ARCHIVED_RESULT_KIND,
    schemaVersion: SINGLE_ARCHIVED_RESULT_SCHEMA_VERSION,
    modelVersion: ARCHIVE_MODEL_VERSION,
    archivedAt: args.archivedAt ?? new Date().toISOString(),
    analysisId: args.draft.analysisId,
    simulationCount: args.draft.simulationCount,
    inputSignature: args.draft.inputSignature,
    projectsAtArchive: structuredClone(args.projects) as Project[],
    activeProjectIdAtRun: args.draft.activeProjectIdAtRun,
    resultPreferences,
    resultView,
    byProjectId: structuredClone(args.draft.byProjectId),
    ...(args.draft.simulationRunIdByProjectId
      ? {
          simulationRunIdByProjectId: {
            ...args.draft.simulationRunIdByProjectId,
          },
        }
      : {}),
  }
  assertNoHeavyValuesInCompact(archived)
  return archived
}

export function buildSingleDraftFromCompactSeed(args: {
  analysisId: string
  inputSignature: string
  simulationCount: number
  activeProjectId: string
  resultPreferences: ResultPreferencesV1
  resultView: ResolvedResultView
  byProjectId: Record<string, CompactProjectResultV1>
  projectsAtRun: readonly Project[]
  simulationRunIdByProjectId?: Readonly<Record<string, string>>
}): SingleDraftResultSnapshotV1 {
  const snapshot: SingleDraftResultSnapshotV1 = {
    kind: SINGLE_DRAFT_RESULT_KIND,
    schemaVersion: SINGLE_DRAFT_RESULT_SCHEMA_VERSION,
    modelVersion: ARCHIVE_MODEL_VERSION,
    computedAt: new Date().toISOString(),
    analysisId: args.analysisId,
    simulationCount: args.simulationCount,
    inputSignature: args.inputSignature,
    activeProjectIdAtRun: args.activeProjectId,
    projectsAtRun: structuredClone(args.projectsAtRun) as Project[],
    resultPreferences: structuredClone(args.resultPreferences),
    resultView: structuredClone(args.resultView),
    byProjectId: structuredClone(args.byProjectId),
    ...(args.simulationRunIdByProjectId
      ? {
          simulationRunIdByProjectId: {
            ...args.simulationRunIdByProjectId,
          },
        }
      : {}),
  }
  assertNoHeavyValuesInCompact(snapshot)
  return snapshot
}

/** Session ref wins; never order by session-local batchSeq. */
export function pickAuthoritativeSingleDraftResult(
  fromSession: SingleDraftResultSnapshotV1 | null | undefined,
  fromDisk: SingleDraftResultSnapshotV1 | undefined,
): SingleDraftResultSnapshotV1 | undefined {
  if (fromSession) return fromSession
  return fromDisk
}

export function singleDraftResultIdentityMatches(args: {
  snapshot: SingleDraftResultSnapshotV1
  analysisId: string
  activeProjectId: string
  inputSignature: string
  simulationRunId: string
}): boolean {
  const { snapshot } = args
  if (snapshot.analysisId !== args.analysisId) return false
  if (snapshot.activeProjectIdAtRun !== args.activeProjectId) return false
  if (snapshot.inputSignature !== args.inputSignature) return false
  const runId =
    snapshot.simulationRunIdByProjectId?.[args.activeProjectId] ?? ""
  if (!args.simulationRunId || !runId) return false
  return runId === args.simulationRunId
}
