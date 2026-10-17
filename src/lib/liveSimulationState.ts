/**
 * Live simulation context + canonical result validity.
 *
 * Simulation results belong to (analysisId, checkpointId, inputSignature).
 * Single Analysis uses checkpointId = null.
 */

import type { ProjectResult } from "@/simulation.worker"
import { buildSimulationInputSignature } from "@/lib/simulationInputSignature"
import type { Project } from "@/lib/project"
import { parseProjectsPayload } from "@/lib/storage"
import {
  isOngoingCheckpointResultSnapshot,
  type OngoingCheckpointResultSnapshotV1,
} from "@/lib/ongoingCheckpointResultSnapshot"
import {
  isSingleDraftResultSnapshot,
  type SingleDraftResultSnapshotV1,
} from "@/lib/singleDraftResultSnapshot"

export type LiveSimulationState = {
  analysisId: string | null
  /** null for Single Analysis; Ongoing uses active checkpoint id at run start. */
  checkpointId: string | null
  inputSignature: string
  projectResults: readonly ProjectResult[]
  simulatedBaseCostByProjectId: Record<string, number | null>
  activeProjectIdAtRun: string
  simulationCount: number
  /**
   * Full projects captured at run/seed time — presentation and cell diffs only.
   * Validity always uses inputSignature, never this field.
   */
  projectsAtRun: readonly Project[]
}

export type LiveResultValidityKind =
  | "none"
  | "valid"
  | "stale"
  | "wrong_analysis"
  | "wrong_checkpoint"

export type LiveResultValidity = {
  kind: LiveResultValidityKind
}

export function emptyLiveSimulationState(
  partial?: Partial<LiveSimulationState>,
): LiveSimulationState {
  return {
    analysisId: null,
    checkpointId: null,
    inputSignature: "",
    projectResults: [],
    simulatedBaseCostByProjectId: {},
    activeProjectIdAtRun: "",
    simulationCount: 0,
    projectsAtRun: [],
    ...partial,
  }
}

/**
 * Normalize a stored signature (legacy full-projects JSON or canonical) to the
 * canonical analytical signature for comparison.
 */
export function coerceSimulationInputSignature(signature: string): string {
  const trimmed = signature.trim()
  if (!trimmed) return ""
  try {
    const parsed = JSON.parse(trimmed)
    const projects = parseProjectsPayload(parsed)
    if (projects && projects.length > 0) {
      return buildSimulationInputSignature(projects)
    }
  } catch {
    /* already canonical or opaque */
  }
  return trimmed
}

export function hasLiveSimulationResults(
  state: LiveSimulationState | null | undefined,
): boolean {
  return Boolean(
    state &&
      state.projectResults.length > 0 &&
      state.inputSignature.trim() !== "",
  )
}

function compactDraftResultValidity(args: {
  analysisId: string | null
  checkpointId: string | null
  currentProjects: readonly Project[]
  compact: OngoingCheckpointResultSnapshotV1
}): LiveResultValidity {
  if (
    args.analysisId != null &&
    args.analysisId !== args.compact.analysisId
  ) {
    return { kind: "wrong_analysis" }
  }
  if (args.checkpointId !== args.compact.checkpointId) {
    return { kind: "wrong_checkpoint" }
  }
  const currentSig = buildSimulationInputSignature(args.currentProjects)
  const storedSig = coerceSimulationInputSignature(args.compact.inputSignature)
  if (currentSig !== storedSig) {
    return { kind: "stale" }
  }
  return { kind: "valid" }
}

function singleDraftResultValidity(args: {
  analysisId: string | null
  currentProjects: readonly Project[]
  draft: SingleDraftResultSnapshotV1
}): LiveResultValidity {
  if (
    args.analysisId != null &&
    args.analysisId !== args.draft.analysisId
  ) {
    return { kind: "wrong_analysis" }
  }
  const currentSig = buildSimulationInputSignature(args.currentProjects)
  const storedSig = coerceSimulationInputSignature(args.draft.inputSignature)
  if (currentSig !== storedSig) {
    return { kind: "stale" }
  }
  return { kind: "valid" }
}

/**
 * Authoritative result validity for the current editor context.
 * Prefers live Monte Carlo arrays when present; otherwise evaluates a
 * matching Ongoing or Single compact draft result (reload path).
 */
export function getLiveResultValidity(args: {
  analysisId: string | null
  checkpointId: string | null
  currentProjects: readonly Project[]
  simulationState: LiveSimulationState | null | undefined
  ongoingCompactResult?: OngoingCheckpointResultSnapshotV1 | null
  singleDraftResult?: SingleDraftResultSnapshotV1 | null
}): LiveResultValidity {
  const sim = args.simulationState
  if (hasLiveSimulationResults(sim)) {
    if (
      args.analysisId != null &&
      sim!.analysisId != null &&
      args.analysisId !== sim!.analysisId
    ) {
      return { kind: "wrong_analysis" }
    }
    if (args.checkpointId !== sim!.checkpointId) {
      return { kind: "wrong_checkpoint" }
    }
    const currentSig = buildSimulationInputSignature(args.currentProjects)
    const storedSig = coerceSimulationInputSignature(sim!.inputSignature)
    if (currentSig !== storedSig) {
      return { kind: "stale" }
    }
    return { kind: "valid" }
  }

  const compact = args.ongoingCompactResult
  if (compact && isOngoingCheckpointResultSnapshot(compact)) {
    return compactDraftResultValidity({
      analysisId: args.analysisId,
      checkpointId: args.checkpointId,
      currentProjects: args.currentProjects,
      compact,
    })
  }

  const singleDraft = args.singleDraftResult
  if (
    singleDraft &&
    isSingleDraftResultSnapshot(singleDraft) &&
    args.checkpointId == null
  ) {
    return singleDraftResultValidity({
      analysisId: args.analysisId,
      currentProjects: args.currentProjects,
      draft: singleDraft,
    })
  }

  return { kind: "none" }
}

export function isLiveResultValid(
  args: Parameters<typeof getLiveResultValidity>[0],
): boolean {
  return getLiveResultValidity(args).kind === "valid"
}
