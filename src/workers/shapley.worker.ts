/// <reference lib="webworker" />

import { runShapleyAttributionForPayload } from "@/domain/simulation/shapleyWorkerMessages"
import type {
  ShapleyWorkerRequest,
  ShapleyWorkerResponse,
} from "@/domain/simulation/shapleyWorkerMessages"

self.onmessage = (e: MessageEvent<ShapleyWorkerRequest>) => {
  const msg = e.data
  if (msg.type !== "shapley") return

  try {
    const result = runShapleyAttributionForPayload(
      msg.payload,
      msg.mainSimulationP50,
      msg.mainSimulationP85,
    )
    const out: ShapleyWorkerResponse = {
      type: "shapley",
      projectId: msg.projectId,
      simulationRunId: msg.simulationRunId,
      result,
    }
    self.postMessage(out)
  } catch (err) {
    const out: ShapleyWorkerResponse = {
      type: "shapley",
      projectId: msg.projectId,
      simulationRunId: msg.simulationRunId,
      error: err instanceof Error ? err.message : String(err),
    }
    self.postMessage(out)
  }
}

export {}
