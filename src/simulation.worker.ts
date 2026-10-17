/// <reference lib="webworker" />

import {
  simulateAggregateCostWithDriversValuesAndSeries,
  type SimulationInputSeriesItem,
} from "@/simulation"
import type { CostCorrelationPrepResult } from "@/domain/simulation/costCorrelation"

export type SimulationCostInput = import("@/simulation").TriangularParams
export type SimulationDriverInput = import("@/simulation").TriangularParams

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

self.onmessage = (e: MessageEvent<SimulationWorkerMessage>) => {
  const { runs, projects } = e.data
  const projectResults: ProjectResult[] = projects.map((job) => {
    if (job.costs.length === 0) {
      return {
        projectId: job.projectId,
        incurredCosts: job.incurredCosts,
        values: [],
        inputSeries: [],
        costCorrelationPrep: {
          choleskyL: [[1]],
          status: { kind: "identity", reason: "single_item" },
        },
      }
    }
    const { values, inputSeries, costCorrelationPrep } =
      simulateAggregateCostWithDriversValuesAndSeries({
        runs,
        costTriangles: job.costs,
        drivers: job.drivers ?? [],
        driverImpacts: job.driverImpacts,
        costCorrelation: job.costCorrelation,
        costNames: job.costNames,
        driverNames: job.driverNames,
        incurredCosts: job.incurredCosts,
      })
    return {
      projectId: job.projectId,
      incurredCosts: job.incurredCosts,
      values,
      inputSeries,
      costCorrelationPrep,
    }
  })
  const out: SimulationWorkerResult = { projectResults }
  self.postMessage(out)
}
