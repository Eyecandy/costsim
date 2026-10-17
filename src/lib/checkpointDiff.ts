/**
 * Future checkpoint-to-checkpoint comparison boundary.
 *
 * Do not build the change-dashboard UI here. Helpers extract comparable slices
 * so later diffs can detect added/removed/changed costs, drivers, impacts,
 * correlations, assumptions, Project Profile, and results — relying on stable
 * row IDs preserved by createNextCheckpoint / cloneWorkspacePreservingIds.
 */

import type { AnalysisCheckpoint } from "@/lib/analysisCheckpoint"
import type { Project } from "@/lib/project"
import type { ProjectProfile } from "@/lib/projectProfile"

export type CheckpointAnalyticalSlice = {
  checkpointId: string
  sequence: number
  projectId: string | undefined
  costRowIds: string[]
  driverRowIds: string[]
  costById: Record<string, Project["costRows"][number]>
  driverById: Record<string, Project["driverRows"][number]>
  driverImpacts: Project["driverImpacts"]
  costCorrelations: Project["costCorrelations"]
  assumptions: Project["assumptions"]
  profile: ProjectProfile | undefined
  hasArchivedResults: boolean
  resultInputSignature: string | undefined
}

export function extractCheckpointAnalyticalSlice(
  checkpoint: AnalysisCheckpoint,
): CheckpointAnalyticalSlice {
  const project = checkpoint.workspace.projects[0]
  const costById: CheckpointAnalyticalSlice["costById"] = {}
  const driverById: CheckpointAnalyticalSlice["driverById"] = {}
  for (const row of project?.costRows ?? []) costById[row.id] = { ...row }
  for (const row of project?.driverRows ?? []) driverById[row.id] = { ...row }
  return {
    checkpointId: checkpoint.id,
    sequence: checkpoint.sequence,
    projectId: project?.id,
    costRowIds: (project?.costRows ?? []).map((r) => r.id),
    driverRowIds: (project?.driverRows ?? []).map((r) => r.id),
    costById,
    driverById,
    driverImpacts: project?.driverImpacts
      ? structuredClone(project.driverImpacts)
      : undefined,
    costCorrelations: project?.costCorrelations
      ? structuredClone(project.costCorrelations)
      : undefined,
    assumptions: project?.assumptions?.map((a) => ({ ...a })),
    profile: project?.profile ? structuredClone(project.profile) : undefined,
    hasArchivedResults: Boolean(checkpoint.archivedSnapshot),
    resultInputSignature: checkpoint.archivedSnapshot?.inputSignature,
  }
}

/** Consecutive pair (N-1, N) for a later checkpoint id — null if missing. */
export function getPrecedingCheckpointPair(
  checkpoints: readonly AnalysisCheckpoint[],
  laterCheckpointId: string,
): { earlier: AnalysisCheckpoint; later: AnalysisCheckpoint } | null {
  const ordered = [...checkpoints].sort((a, b) => a.sequence - b.sequence)
  const laterIndex = ordered.findIndex((c) => c.id === laterCheckpointId)
  if (laterIndex <= 0) return null
  return {
    earlier: ordered[laterIndex - 1]!,
    later: ordered[laterIndex]!,
  }
}

export type RowIdDiff = {
  shared: string[]
  onlyEarlier: string[]
  onlyLater: string[]
}

export function diffRowIds(
  earlierIds: readonly string[],
  laterIds: readonly string[],
): RowIdDiff {
  const earlier = new Set(earlierIds)
  const later = new Set(laterIds)
  const shared: string[] = []
  const onlyEarlier: string[] = []
  const onlyLater: string[] = []
  for (const id of earlierIds) {
    if (later.has(id)) shared.push(id)
    else onlyEarlier.push(id)
  }
  for (const id of laterIds) {
    if (!earlier.has(id)) onlyLater.push(id)
  }
  return { shared, onlyEarlier, onlyLater }
}
