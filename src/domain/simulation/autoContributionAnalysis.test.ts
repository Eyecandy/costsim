import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

import { messages } from "@/i18n/messages"
import {
  ShapleyRequestQueue,
  shouldAutoRequestShapleyCalculation,
  type ShapleyCacheEntry,
} from "@/domain/simulation/lazyShapleyAttribution"
import type { ShapleyAttributionResult } from "@/domain/simulation/shapleyAttribution"
import { repoRoot } from "@/test-utils/repoRoot"


function hookSource() {
  return readFileSync(
    join(repoRoot, "src/lib/useLazyShapleyAttribution.ts"),
    "utf8",
  )
}

function panelSource() {
  return readFileSync(
    join(repoRoot, "src/components/ResultsPanel.tsx"),
    "utf8",
  )
}

function appSource() {
  return readFileSync(join(repoRoot, "src/App.tsx"), "utf8")
}

const emptyResult = {
  contributions: [],
} as unknown as ShapleyAttributionResult

function cacheEntry(
  partial: Partial<ShapleyCacheEntry> = {},
): ShapleyCacheEntry {
  return {
    result: emptyResult,
    inputSignature: "sig",
    simulationRunId: "run-1",
    ...partial,
  }
}

describe("automatic Contribution Analysis after simulation", () => {
  it("A: successful main simulation auto-starts Contribution Analysis", () => {
    const hook = hookSource()
    expect(hook).toContain("shouldAutoRequestShapleyCalculation")
    expect(hook).toContain("queueRef.current.enqueue(project.id)")
    expect(hook).toContain("simulationRunKey")
    expect(hook).toContain("projectResults")
    // Auto path is in the Shapley hook, not the Monte Carlo completion path
    const app = appSource()
    const complete = app.slice(
      app.indexOf("setProjectResults(e.data.projectResults)"),
      app.indexOf("persistLastSimulationSnapshot"),
    )
    expect(complete).not.toContain("requestCalculation")
    expect(complete).not.toContain("Shapley")
    expect(complete).not.toContain("shapley")
  })

  it("B: main results remain available before Contribution finishes (separate worker)", () => {
    const app = appSource()
    expect(app).toContain("setIsRunning(false)")
    expect(app).toContain("setProjectResults(e.data.projectResults)")
    const hook = hookSource()
    expect(hook).toContain('from "@/workers/shapley.worker.ts?worker"')
    expect(hook).toContain("new ShapleyWorker()")
    expect(hook).not.toContain("new SimulationWorker")
    // Contribution loading is local to the attribution section
    const panel = panelSource()
    expect(panel).toContain("SpotlightLoadingText")
    expect(panel.indexOf("charts.sCurveTitle")).toBeLessThan(
      panel.indexOf("charts.attributionTitle"),
    )
    expect(panel.indexOf("charts.tornadoTitle")).toBeLessThan(
      panel.indexOf("charts.attributionTitle"),
    )
  })

  it("C: contribution calculation starts only once per fresh simulation state", () => {
    const queue = new ShapleyRequestQueue()
    queue.enqueue("p1")
    queue.enqueue("p1")
    expect(queue.isQueued("p1")).toBe(true)
    expect(queue.startNext()).toBe("p1")
    queue.enqueue("p1")
    expect(queue.startNext()).toBe(null)

    expect(
      shouldAutoRequestShapleyCalculation({
        inputsStale: false,
        hasSimulationValues: true,
        simulationRunId: "run-1",
        inputSignature: "sig",
        cacheEntry: cacheEntry(),
        hasError: false,
      }),
    ).toBe(false)

    const hook = hookSource()
    expect(hook).toContain("if (queueRef.current.isQueued(project.id)) continue")
  })

  it("D: new simulation guards against previous contribution overwriting new results", () => {
    const hook = hookSource()
    expect(hook).toContain("msg.simulationRunId !== currentRunId")
    expect(hook).toContain("simulationRunId: msg.simulationRunId")
    expect(hook).toContain("[simulationRunKey]")
    expect(hook).toContain("workerRef.current?.terminate()")

    const worker = readFileSync(
      join(repoRoot, "src/workers/shapley.worker.ts"),
      "utf8",
    )
    expect(worker).toContain("simulationRunId: msg.simulationRunId")

    const messages = readFileSync(
      join(repoRoot, "src/domain/simulation/shapleyWorkerMessages.ts"),
      "utf8",
    )
    expect(messages).toContain("simulationRunId: string")
  })

  it("E: stale inputs do not auto-trigger contribution before re-simulation", () => {
    expect(
      shouldAutoRequestShapleyCalculation({
        inputsStale: true,
        hasSimulationValues: true,
        simulationRunId: "run-1",
        inputSignature: "sig",
        cacheEntry: undefined,
        hasError: false,
      }),
    ).toBe(false)

    const hook = hookSource()
    expect(hook).toContain("if (inputsStale) return")
    const panel = panelSource()
    expect(panel).toContain("results.waterfallStaleInputs")
  })

  it("F/G: result renders automatically; loading does not require Calculate button", () => {
    const panel = panelSource()
    expect(panel).toContain("attributionUi.allReady")
    expect(panel).toContain("ResultsWaterfall")
    expect(panel).toContain("SpotlightLoadingText")
    expect(panel).not.toContain("results.calculateContributions")
    expect(panel).toContain("results.calculatingContributions")
  })

  it("H/I: failure exits loading and offers retry", () => {
    const panel = panelSource()
    expect(panel).toContain("attributionUi.anyError")
    expect(panel).toContain("results.tryAgain")
    expect(panel).toContain('status === "error" || status === "idle"')
    expect(messages.no.results.tryAgain).toBe("Prøv igjen")
    expect(messages.en.results.tryAgain).toBe("Try again")
    expect(messages.en.results.calculatingContributions).toBe(
      "Calculating contribution…",
    )
    expect(messages.no.results.calculatingContributions).toBe(
      "Beregner bidrag…",
    )

    expect(
      shouldAutoRequestShapleyCalculation({
        inputsStale: false,
        hasSimulationValues: true,
        simulationRunId: "run-1",
        inputSignature: "sig",
        cacheEntry: undefined,
        hasError: true,
      }),
    ).toBe(false)
  })

  it("J: multi-project contribution results stay keyed by project id", () => {
    const hook = hookSource()
    expect(hook).toContain("[msg.projectId]")
    expect(hook).toContain("project.id")
    const panel = panelSource()
    expect(panel).toContain("key={state.projectId}")
    expect(panel).toContain("getResult(project.id)")
    expect(panel).toContain("getStatus(project.id)")
  })
})
