import {
  ARCHIVE_MODEL_VERSION,
  type ArchivedAnalysisSnapshotV1,
} from "@/domain/analysis/archivedAnalysisSnapshot"
import {
  assertNoHeavyValuesInCompact,
  buildCompactProjectResult,
  type CompactFrozenKeyFiguresV1,
  type CompactSCurveV1,
} from "@/domain/analysis/compactAnalysisResult"
import type { DeterministicTornadoRow } from "@/domain/simulation/deterministicTornado"
import type { Project } from "@/domain/analysis/project"
import {
  resolveResultView,
  type ResolvedResultView,
  type ResultPreferencesV1,
} from "@/domain/results/resultPreferences"
import type { ShapleyAttributionResult } from "@/domain/simulation/shapleyAttribution"
import type { ProjectResult } from "@/simulation.worker"
import { buildSimulationInputSignature } from "@/domain/simulation/simulationInputSignature"

export const ONGOING_CHECKPOINT_RESULT_SCHEMA_VERSION = 1 as const
export const ONGOING_CHECKPOINT_RESULT_KIND =
  "ongoing_checkpoint_result_v1" as const

export type OngoingFrozenKeyFiguresV1 = CompactFrozenKeyFiguresV1

export type OngoingCheckpointResultSnapshotV1 = {
  kind: typeof ONGOING_CHECKPOINT_RESULT_KIND
  schemaVersion: typeof ONGOING_CHECKPOINT_RESULT_SCHEMA_VERSION
  modelVersion: string
  computedAt: string
  simulationCount: number
  inputSignature: string
  analysisId: string
  checkpointId: string
  activeProjectId: string
  incurredCosts: number
  simulatedBaseCost: number | null
  keyFigures: OngoingFrozenKeyFiguresV1
  sCurve: CompactSCurveV1
  tornado: DeterministicTornadoRow[] | null
  contribution: ShapleyAttributionResult | null
  resultPreferences: ResultPreferencesV1
  resultView: ResolvedResultView
  /**
   * Full projects at the successful simulation (or createNext inheritance).
   * Restores green-cell / Undo after reload. Optional for legacy snapshots.
   */
  projectsAtRun?: Project[]
  simulationRunIdByProjectId?: Record<string, string>
}

export type BuildOngoingCheckpointResultSnapshotInput = {
  analysisId: string
  checkpointId: string
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
  contribution?: ShapleyAttributionResult | null
  computedAt?: string
  simulationRunIdByProjectId?: Readonly<Record<string, string>>
  /** Defaults to a clone of `projects`. */
  projectsAtRun?: readonly Project[]
}

export function isOngoingCheckpointResultSnapshot(
  value: unknown,
): value is OngoingCheckpointResultSnapshotV1 {
  if (!value || typeof value !== "object") return false
  const o = value as Record<string, unknown>
  return (
    o.kind === ONGOING_CHECKPOINT_RESULT_KIND &&
    o.schemaVersion === ONGOING_CHECKPOINT_RESULT_SCHEMA_VERSION &&
    typeof o.analysisId === "string" &&
    typeof o.checkpointId === "string" &&
    typeof o.activeProjectId === "string" &&
    typeof o.inputSignature === "string" &&
    typeof o.keyFigures === "object" &&
    o.keyFigures !== null &&
    typeof o.sCurve === "object" &&
    o.sCurve !== null &&
    Array.isArray((o.sCurve as Record<string, unknown>).points)
  )
}

export function isLegacyHeavyArchivedSnapshot(
  value: unknown,
): value is ArchivedAnalysisSnapshotV1 {
  if (!value || typeof value !== "object") return false
  const o = value as Record<string, unknown>
  return Array.isArray(o.projectResults) && Array.isArray(o.projectsAtArchive)
}

export function buildOngoingCheckpointResultSnapshot(
  input: BuildOngoingCheckpointResultSnapshotInput,
): OngoingCheckpointResultSnapshotV1 {
  const project =
    input.projects.find((p) => p.id === input.activeProjectId) ??
    input.projects[0]
  const projectId = project?.id ?? input.activeProjectId
  const result = input.projectResults.find((r) => r.projectId === projectId)
  const resultPreferences = structuredClone(input.resultPreferences)
  const resultView =
    structuredClone(input.resultView) ?? resolveResultView(resultPreferences)
  if (!project || !result) {
    throw new Error("Cannot compact Ongoing result without active project result")
  }
  const compact = buildCompactProjectResult({
    project,
    result,
    simulatedBaseCost:
      input.simulatedBaseCostByProjectId[projectId] ?? null,
    resultView,
    contribution:
      input.contribution ??
      input.shapleyByProjectId?.[projectId] ??
      null,
  })

  const snapshot: OngoingCheckpointResultSnapshotV1 = {
    kind: ONGOING_CHECKPOINT_RESULT_KIND,
    schemaVersion: ONGOING_CHECKPOINT_RESULT_SCHEMA_VERSION,
    modelVersion: ARCHIVE_MODEL_VERSION,
    computedAt: input.computedAt ?? new Date().toISOString(),
    simulationCount: input.simulationCount,
    inputSignature: input.inputSignature,
    analysisId: input.analysisId,
    checkpointId: input.checkpointId,
    activeProjectId: projectId,
    incurredCosts: compact.incurredCosts,
    simulatedBaseCost: compact.simulatedBaseCost,
    keyFigures: compact.keyFigures,
    sCurve: compact.sCurve,
    tornado: compact.tornado,
    contribution: compact.contribution,
    resultPreferences,
    resultView,
    projectsAtRun: structuredClone(
      input.projectsAtRun ?? input.projects,
    ) as Project[],
    ...(input.simulationRunIdByProjectId
      ? {
          simulationRunIdByProjectId: {
            ...input.simulationRunIdByProjectId,
          },
        }
      : {}),
  }
  assertNoHeavyValuesInOngoingSnapshot(snapshot)
  return snapshot
}

export function cloneOngoingCheckpointResultSnapshotForNextCheckpoint(
  snapshot: OngoingCheckpointResultSnapshotV1,
  ownership: { analysisId: string; checkpointId: string },
): OngoingCheckpointResultSnapshotV1 {
  return {
    ...structuredClone(snapshot),
    analysisId: ownership.analysisId,
    checkpointId: ownership.checkpointId,
  }
}

/**
 * Freeze an already-valid compact tip/draft as the immutable archived snapshot.
 * When `resultPreferences` is provided (caller must ensure analytics support),
 * presentation + preference fields are updated without recomputing analytics.
 */
export function freezeOngoingCompactForArchive(
  snapshot: OngoingCheckpointResultSnapshotV1,
  args?: { computedAt?: string; resultPreferences?: ResultPreferencesV1 },
): OngoingCheckpointResultSnapshotV1 {
  const frozen = {
    ...structuredClone(snapshot),
    computedAt: args?.computedAt ?? new Date().toISOString(),
  }
  if (args?.resultPreferences) {
    frozen.resultPreferences = structuredClone(args.resultPreferences)
    frozen.resultView = resolveResultView(frozen.resultPreferences)
  }
  assertNoHeavyValuesInOngoingSnapshot(frozen)
  return frozen
}

export function legacyHeavyToOngoingCompact(args: {
  snapshot: ArchivedAnalysisSnapshotV1
  analysisId: string
  checkpointId: string
  projects?: readonly Project[]
}): OngoingCheckpointResultSnapshotV1 {
  const { snapshot } = args
  return buildOngoingCheckpointResultSnapshot({
    analysisId: args.analysisId,
    checkpointId: args.checkpointId,
    projects: args.projects ?? snapshot.projectsAtArchive,
    activeProjectId: snapshot.activeProjectIdAtRun,
    projectResults: snapshot.projectResults,
    simulatedBaseCostByProjectId: snapshot.simulatedBaseCostByProjectId,
    inputSignature: buildSimulationInputSignature(
      args.projects ?? snapshot.projectsAtArchive,
    ),
    simulationCount: snapshot.simulationCount,
    resultPreferences: snapshot.resultPreferences,
    resultView: snapshot.resultView,
    shapleyByProjectId: snapshot.shapleyByProjectId,
    computedAt: snapshot.archivedAt,
  })
}

export function extractKeyFigureFromOngoingSnapshot(
  snapshot: OngoingCheckpointResultSnapshotV1,
  metricId: string,
): number | null {
  const keyFigures = snapshot.keyFigures
  const direct = keyFigures[metricId as keyof OngoingFrozenKeyFiguresV1]
  if (typeof direct === "number") return direct
  const match = /^p(\d+)$/.exec(metricId)
  if (match) return keyFigures.percentiles[match[1]!] ?? null
  return null
}

/** Throws when a compact Ongoing payload accidentally contains heavy samples. */
export function assertNoHeavyValuesInOngoingSnapshot(
  snapshot: OngoingCheckpointResultSnapshotV1,
): void {
  assertNoHeavyValuesInCompact(snapshot)
}
