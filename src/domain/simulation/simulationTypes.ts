import type { SimulationInputSeriesItem, TriangularParams } from "@/domain/simulation/simulation"
import type { CostCorrelationPrepResult } from "@/domain/simulation/costCorrelation"

export type SimulationCostInput = TriangularParams
export type SimulationDriverInput = TriangularParams

export type SimulationProjectPayload = {
  projectId: string
  incurredCosts: number
  costs: SimulationCostInput[]
  drivers: SimulationDriverInput[]
  /** `[costIndex][driverIndex]` impact 0–100. Omitted → all 100%. */
  driverImpacts?: number[][]
  /** Latent Gaussian-copula ρ between cost items. Omitted → independent. */
  costCorrelation?: number[][]
  costRowIds: string[]
  costNames: string[]
  driverRowIds: string[]
  driverNames: string[]
}

export type SimulationWorkerMessage = {
  runs: number
  projects: SimulationProjectPayload[]
}

export type ProjectResult = {
  projectId: string
  /** Fixed incurred costs used when this simulation run was generated. */
  incurredCosts: number
  values: number[]
  inputSeries: SimulationInputSeriesItem[]
  /** Present on new runs; omitted in older persisted snapshots. */
  costCorrelationPrep?: CostCorrelationPrepResult
}

export type SimulationWorkerResult = {
  projectResults: ProjectResult[]
}
