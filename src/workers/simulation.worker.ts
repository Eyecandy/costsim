/// <reference lib="webworker" />

import { simulateAggregateCostWithDriversValuesAndSeries } from "@/domain/simulation/simulation"
import type {
  ProjectResult,
  SimulationWorkerMessage,
  SimulationWorkerResult,
} from "@/domain/simulation/simulationTypes"

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
