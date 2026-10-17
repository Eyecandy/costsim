import type { OngoingCheckpointResultSnapshotV1 } from "@/lib/ongoingCheckpointResultSnapshot"
import { getSimulationRunIdForProject } from "@/lib/simulationRunId"

export function simulationRunIdForSnapshot(
  snapshot: OngoingCheckpointResultSnapshotV1,
): string {
  return getSimulationRunIdForProject(
    snapshot.activeProjectId,
    snapshot.simulationRunIdByProjectId ?? {},
  )
}

/**
 * Pick the Ongoing draft compact to persist.
 *
 * Session/ref is the durable authority once an explicit result commit (or
 * createNext inheritance) has updated it. Do NOT order by simulationRunId
 * batchSeq — that counter lives in App `runSeqRef` and resets on reload.
 *
 * Race protection for stale queued saves comes from reading
 * `ongoingDraftResultRef.current` at save execution time, not from comparing
 * session-local batch numbers to disk.
 */
export function pickAuthoritativeOngoingDraftResult(
  fromSession: OngoingCheckpointResultSnapshotV1 | null | undefined,
  fromDisk: OngoingCheckpointResultSnapshotV1 | undefined,
): OngoingCheckpointResultSnapshotV1 | undefined {
  if (fromSession) return fromSession
  return fromDisk
}

export function ongoingDraftResultIdentityMatches(args: {
  snapshot: OngoingCheckpointResultSnapshotV1
  analysisId: string
  checkpointId: string
  activeProjectId: string
  inputSignature: string
  simulationRunId: string
}): boolean {
  const { snapshot } = args
  if (snapshot.analysisId !== args.analysisId) return false
  if (snapshot.checkpointId !== args.checkpointId) return false
  if (snapshot.activeProjectId !== args.activeProjectId) return false
  if (snapshot.inputSignature !== args.inputSignature) return false
  const runId = simulationRunIdForSnapshot(snapshot)
  if (!args.simulationRunId || !runId) return false
  return runId === args.simulationRunId
}
