import { buildSimulationProjectPayload } from "@/domain/simulation/buildSimulationProjectPayload"
import { computeShapleyAttribution } from "@/domain/simulation/shapleyAttribution"
import type { Project } from "@/domain/analysis/project"
import type { ShapleyAttributionResult } from "@/domain/simulation/shapleyAttribution"

export type ShapleyWorkerRequest = {
  type: "shapley"
  projectId: string
  simulationRunId: string
  payload: NonNullable<ReturnType<typeof buildSimulationProjectPayload>>
  mainSimulationP50: number | null
  mainSimulationP85: number | null
}

export type ShapleyWorkerSuccess = {
  type: "shapley"
  projectId: string
  simulationRunId: string
  result: ShapleyAttributionResult
}

export type ShapleyWorkerFailure = {
  type: "shapley"
  projectId: string
  simulationRunId: string
  error: string
}

export type ShapleyWorkerResponse = ShapleyWorkerSuccess | ShapleyWorkerFailure

export function buildShapleyWorkerRequest(
  project: Project,
  mainSimulationP50: number | null,
  mainSimulationP85: number | null,
  simulationRunId: string,
): ShapleyWorkerRequest | null {
  const payload = buildSimulationProjectPayload(project)
  if (!payload) return null
  return {
    type: "shapley",
    projectId: project.id,
    simulationRunId,
    payload,
    mainSimulationP50,
    mainSimulationP85,
  }
}

export function runShapleyAttributionForPayload(
  payload: ShapleyWorkerRequest["payload"],
  mainSimulationP50: number | null,
  mainSimulationP85: number | null,
): ShapleyAttributionResult {
  return computeShapleyAttribution({
    costTriangles: payload.costs,
    costIds: payload.costRowIds,
    costNames: payload.costNames,
    drivers: payload.drivers,
    driverIds: payload.driverRowIds,
    driverNames: payload.driverNames,
    driverImpacts: payload.driverImpacts,
    costCorrelation: payload.costCorrelation,
    incurredCosts: payload.incurredCosts,
    mainSimulationP50,
    mainSimulationP85,
  })
}
