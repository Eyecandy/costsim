/** Per-project simulation run token — unique for every completed main simulation run. */
export type SimulationRunIdByProjectId = Readonly<Record<string, string>>

export function createSimulationRunIdsForProjects(
  projectIds: readonly string[],
  batchSeq: number,
): Record<string, string> {
  return Object.fromEntries(projectIds.map((projectId) => [projectId, `${batchSeq}:${projectId}`]))
}

/** Stable key for detecting when any displayed project's simulation run changed. */
export function simulationRunKeyForProjects(
  projectIds: readonly string[],
  simulationRunIdByProjectId: SimulationRunIdByProjectId,
): string {
  return JSON.stringify(
    projectIds.map((projectId) => [projectId, simulationRunIdByProjectId[projectId] ?? ""]),
  )
}

export function getSimulationRunIdForProject(
  projectId: string,
  simulationRunIdByProjectId: SimulationRunIdByProjectId,
): string {
  return simulationRunIdByProjectId[projectId] ?? ""
}
