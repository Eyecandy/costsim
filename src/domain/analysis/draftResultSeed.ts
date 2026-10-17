import type { ArchivedAnalysisSnapshotV1 } from "@/domain/analysis/archivedAnalysisSnapshot"
import {
  assertNoHeavyValuesInCompact,
  buildCompactProjectResult,
  type CompactProjectResultV1,
} from "@/domain/analysis/compactAnalysisResult"
import type {
  ResolvedResultView,
  ResultPreferencesV1,
} from "@/domain/results/resultPreferences"
import type { ShapleyAttributionResult, ShapleyContribution } from "@/domain/simulation/shapleyAttribution"
import type { ProjectResult } from "@/simulation.worker"

export const DRAFT_RESULT_SEED_VERSION = 1 as const

/**
 * Remapped archive results seeded onto a new draft created via "Create new version".
 * Cleared after a successful new simulation on that draft.
 * Does not make the draft archived — status remains draft and editable.
 */
export type DraftResultSeedV1 = {
  v: typeof DRAFT_RESULT_SEED_VERSION
  /** Canonical simulation input signature of the cloned workspace until first model edit. */
  inputSignature: string
  simulationCount: number
  projectResults: ProjectResult[]
  simulatedBaseCostByProjectId: Record<string, number | null>
  resultPreferences: ResultPreferencesV1
  resultView: ResolvedResultView
  shapleyByProjectId: Record<string, ShapleyAttributionResult | null>
  /** Compact carry-forward used by new versions of compact Single archives. */
  compactByProjectId?: Record<string, CompactProjectResultV1>
}

function remapContribution(
  c: ShapleyContribution,
  rowIdMap: ReadonlyMap<string, string>,
): ShapleyContribution {
  return { ...c, id: rowIdMap.get(c.id) ?? c.id }
}

export function remapShapleyResult(
  result: ShapleyAttributionResult | null,
  rowIdMap: ReadonlyMap<string, string>,
): ShapleyAttributionResult | null {
  if (!result) return null
  const remapList = (list: readonly ShapleyContribution[] | undefined) =>
    (list ?? []).map((c) => remapContribution(c, rowIdMap))
  return {
    ...result,
    contributions: remapList(result.contributions),
    expectedAdditionDecomposition: result.expectedAdditionDecomposition
      ? {
          ...result.expectedAdditionDecomposition,
          contributions: remapList(
            result.expectedAdditionDecomposition.contributions,
          ),
        }
      : result.expectedAdditionDecomposition,
    uncertaintyReserveDecomposition: result.uncertaintyReserveDecomposition
      ? {
          ...result.uncertaintyReserveDecomposition,
          contributions: remapList(
            result.uncertaintyReserveDecomposition.contributions,
          ),
        }
      : result.uncertaintyReserveDecomposition,
  }
}

export function buildDraftCompactSeedFromSingleArchive(args: {
  snapshot: import("@/domain/analysis/singleArchivedResultSnapshot").SingleArchivedResultSnapshotV1
  projectIdMap: ReadonlyMap<string, string>
  rowIdMap: ReadonlyMap<string, string>
  inputSignature: string
}): DraftResultSeedV1 {
  const compactByProjectId: Record<string, CompactProjectResultV1> = {}
  const simulatedBaseCostByProjectId: Record<string, number | null> = {}
  const shapleyByProjectId: Record<string, ShapleyAttributionResult | null> = {}
  for (const [oldId, compact] of Object.entries(args.snapshot.byProjectId)) {
    const projectId = args.projectIdMap.get(oldId) ?? oldId
    const contribution = remapShapleyResult(compact.contribution, args.rowIdMap)
    compactByProjectId[projectId] = {
      ...structuredClone(compact),
      projectId,
      contribution,
    }
    simulatedBaseCostByProjectId[projectId] = compact.simulatedBaseCost
    shapleyByProjectId[projectId] = contribution
  }
  return {
    v: DRAFT_RESULT_SEED_VERSION,
    inputSignature: args.inputSignature,
    simulationCount: args.snapshot.simulationCount,
    projectResults: [],
    simulatedBaseCostByProjectId,
    resultPreferences: structuredClone(args.snapshot.resultPreferences),
    resultView: structuredClone(args.snapshot.resultView),
    shapleyByProjectId,
    compactByProjectId,
  }
}

/**
 * Builds a draft seed from a legacy heavy archived snapshot.
 * Converts display data to compact form so create-new-version does not
 * re-persist 20k Monte Carlo arrays into the new draft.
 * Does not run Monte Carlo or Shapley.
 */
export function buildDraftResultSeedFromArchive(args: {
  snapshot: ArchivedAnalysisSnapshotV1
  /** old project id → new project id */
  projectIdMap: ReadonlyMap<string, string>
  /** old cost/driver row id → new row id */
  rowIdMap: ReadonlyMap<string, string>
  /** Signature of the cloned workspace (canonical analytical signature). */
  inputSignature: string
}): DraftResultSeedV1 {
  const { snapshot, projectIdMap, rowIdMap, inputSignature } = args
  const compactByProjectId: Record<string, CompactProjectResultV1> = {}
  const simulatedBaseCostByProjectId: Record<string, number | null> = {}
  const shapleyByProjectId: Record<string, ShapleyAttributionResult | null> =
    {}

  for (const project of snapshot.projectsAtArchive) {
    const result = snapshot.projectResults.find(
      (item) => item.projectId === project.id,
    )
    if (!result) continue
    const projectId = projectIdMap.get(project.id) ?? project.id
    const contribution = remapShapleyResult(
      snapshot.shapleyByProjectId[project.id] ?? null,
      rowIdMap,
    )
    const frozenTornado = snapshot.tornadoByProjectId[project.id]
    const compact = buildCompactProjectResult({
      project,
      result,
      simulatedBaseCost:
        snapshot.simulatedBaseCostByProjectId[project.id] ?? null,
      resultView: snapshot.resultView,
      contribution,
    })
    compactByProjectId[projectId] = {
      ...compact,
      projectId,
      contribution,
      tornado:
        frozenTornado !== undefined
          ? structuredClone(frozenTornado)
          : compact.tornado,
    }
    simulatedBaseCostByProjectId[projectId] = compact.simulatedBaseCost
    shapleyByProjectId[projectId] = contribution
  }

  const seed: DraftResultSeedV1 = {
    v: DRAFT_RESULT_SEED_VERSION,
    inputSignature,
    simulationCount: snapshot.simulationCount,
    projectResults: [],
    simulatedBaseCostByProjectId,
    resultPreferences: structuredClone(snapshot.resultPreferences),
    resultView: structuredClone(snapshot.resultView),
    shapleyByProjectId,
    compactByProjectId,
  }
  assertNoHeavyValuesInCompact(seed)
  return seed
}
