import {
  ARCHIVE_MODEL_VERSION,
  type ArchivedAnalysisSnapshotV1,
} from "@/domain/analysis/archivedAnalysisSnapshot"
import {
  assertNoHeavyValuesInCompact,
  buildCompactProjectResult,
  type CompactProjectResultV1,
} from "@/domain/analysis/compactAnalysisResult"
import type { Project } from "@/domain/analysis/project"
import {
  resolveResultView,
  type ResolvedResultView,
  type ResultPreferencesV1,
} from "@/domain/results/resultPreferences"
import type { ShapleyAttributionResult } from "@/domain/simulation/shapleyAttribution"
import type { ProjectResult } from "@/domain/simulation/simulationTypes"

export const SINGLE_ARCHIVED_RESULT_KIND = "single_archived_result_v1" as const
export const SINGLE_ARCHIVED_RESULT_SCHEMA_VERSION = 1 as const

export type SingleAnalysisArchivedSnapshot =
  ArchivedAnalysisSnapshotV1 | SingleArchivedResultSnapshotV1

export type SingleArchivedResultSnapshotV1 = {
  kind: typeof SINGLE_ARCHIVED_RESULT_KIND
  schemaVersion: typeof SINGLE_ARCHIVED_RESULT_SCHEMA_VERSION
  modelVersion: string
  archivedAt: string
  analysisId: string
  simulationCount: number
  inputSignature: string
  projectsAtArchive: Project[]
  activeProjectIdAtRun: string
  resultPreferences: ResultPreferencesV1
  resultView: ResolvedResultView
  byProjectId: Record<string, CompactProjectResultV1>
  simulationRunIdByProjectId?: Record<string, string>
}

export type BuildSingleArchivedResultSnapshotInput = {
  analysisId: string
  projects: readonly Project[]
  activeProjectId: string
  projectResults: readonly ProjectResult[]
  simulatedBaseCostByProjectId: Readonly<Record<string, number | null>>
  inputSignature: string
  simulationCount: number
  resultPreferences: ResultPreferencesV1
  resultView?: ResolvedResultView
  shapleyByProjectId?: Readonly<Record<string, ShapleyAttributionResult | null>>
  archivedAt?: string
  simulationRunIdByProjectId?: Readonly<Record<string, string>>
}

export function isSingleArchivedResultSnapshot(
  value: unknown,
): value is SingleArchivedResultSnapshotV1 {
  if (!value || typeof value !== "object") return false
  const o = value as Record<string, unknown>
  return (
    o.kind === SINGLE_ARCHIVED_RESULT_KIND &&
    o.schemaVersion === SINGLE_ARCHIVED_RESULT_SCHEMA_VERSION &&
    typeof o.analysisId === "string" &&
    typeof o.activeProjectIdAtRun === "string" &&
    typeof o.inputSignature === "string" &&
    Array.isArray(o.projectsAtArchive) &&
    typeof o.byProjectId === "object" &&
    o.byProjectId !== null
  )
}

export function buildSingleArchivedResultSnapshot(
  input: BuildSingleArchivedResultSnapshotInput,
): SingleArchivedResultSnapshotV1 {
  const projectsAtArchive = structuredClone(input.projects) as Project[]
  const resultPreferences = structuredClone(input.resultPreferences)
  const resultView = structuredClone(input.resultView) ?? resolveResultView(resultPreferences)
  const byProjectId: Record<string, CompactProjectResultV1> = {}

  for (const project of projectsAtArchive) {
    const result = input.projectResults.find((item) => item.projectId === project.id)
    if (!result) continue
    byProjectId[project.id] = buildCompactProjectResult({
      project,
      result,
      simulatedBaseCost: input.simulatedBaseCostByProjectId[project.id] ?? null,
      resultView,
      contribution: input.shapleyByProjectId?.[project.id] ?? null,
    })
  }

  const snapshot: SingleArchivedResultSnapshotV1 = {
    kind: SINGLE_ARCHIVED_RESULT_KIND,
    schemaVersion: SINGLE_ARCHIVED_RESULT_SCHEMA_VERSION,
    modelVersion: ARCHIVE_MODEL_VERSION,
    archivedAt: input.archivedAt ?? new Date().toISOString(),
    analysisId: input.analysisId,
    simulationCount: input.simulationCount,
    inputSignature: input.inputSignature,
    projectsAtArchive,
    activeProjectIdAtRun: input.activeProjectId,
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

export function remapSingleArchivedResultSnapshot(args: {
  snapshot: SingleArchivedResultSnapshotV1
  projectIdMap: ReadonlyMap<string, string>
  projects: readonly Project[]
  activeProjectId: string
  inputSignature: string
}): SingleArchivedResultSnapshotV1 {
  const byProjectId: Record<string, CompactProjectResultV1> = {}
  for (const [oldId, result] of Object.entries(args.snapshot.byProjectId)) {
    const newId = args.projectIdMap.get(oldId) ?? oldId
    byProjectId[newId] = {
      ...structuredClone(result),
      projectId: newId,
    }
  }
  const simulationRunIdByProjectId = args.snapshot.simulationRunIdByProjectId
    ? Object.fromEntries(
        Object.entries(args.snapshot.simulationRunIdByProjectId).map(([oldId, runId]) => [
          args.projectIdMap.get(oldId) ?? oldId,
          runId,
        ]),
      )
    : undefined
  const remapped: SingleArchivedResultSnapshotV1 = {
    ...structuredClone(args.snapshot),
    projectsAtArchive: structuredClone(args.projects) as Project[],
    activeProjectIdAtRun: args.activeProjectId,
    inputSignature: args.inputSignature,
    byProjectId,
    ...(simulationRunIdByProjectId ? { simulationRunIdByProjectId } : {}),
  }
  assertNoHeavyValuesInCompact(remapped)
  return remapped
}
