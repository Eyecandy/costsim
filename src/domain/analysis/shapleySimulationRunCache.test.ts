import { describe, expect, it } from "vitest"

import {
  computeShapleyAttribution,
  type ShapleyAttributionResult,
} from "@/domain/simulation/shapleyAttribution"
import {
  isShapleyCacheEntryValid,
  resolveShapleyProjectStatus,
  type ShapleyCacheEntry,
} from "@/domain/simulation/lazyShapleyAttribution"
import {
  createSimulationRunIdsForProjects,
  simulationRunKeyForProjects,
} from "@/domain/simulation/simulationRunId"
import { shapleyInputSignature } from "@/domain/simulation/shapleyInputSignature"
import { createProject } from "@/domain/analysis/project"

function mockCacheEntry(
  result: ShapleyAttributionResult,
  inputSignature: string,
  simulationRunId: string,
): ShapleyCacheEntry {
  return { result, inputSignature, simulationRunId }
}

function mockResult(estimatedP50: number): ShapleyAttributionResult {
  const estimatedP85 = estimatedP50 + 12
  return {
    baseCost: 100,
    estimatedP50,
    estimatedP85,
    expectedAddition: estimatedP50 - 100,
    uncertaintyReserve: estimatedP85 - estimatedP50,
    contributions: [],
    expectedAdditionDecomposition: {
      startValue: 100,
      endValue: estimatedP50,
      contributions: [],
    },
    uncertaintyReserveDecomposition: {
      startValue: estimatedP50,
      endValue: estimatedP85,
      contributions: [],
    },
    diagnostics: {} as ShapleyAttributionResult["diagnostics"],
  }
}

describe("Shapley cache invalidation by simulationRunId", () => {
  const project = createProject({ id: "p1", name: "Project 1" })
  const inputSignature = shapleyInputSignature(project)
  const run1 = createSimulationRunIdsForProjects(["p1"], 1)["p1"]!
  const run2 = createSimulationRunIdsForProjects(["p1"], 2)["p1"]!

  it("A: cache is valid when input signature and simulationRunId both match", () => {
    const entry = mockCacheEntry(mockResult(200), inputSignature, run1)
    expect(isShapleyCacheEntryValid(entry, inputSignature, run1)).toBe(true)
    expect(
      resolveShapleyProjectStatus(
        "p1",
        inputSignature,
        run1,
        { p1: entry },
        null,
        {},
        false,
      ),
    ).toBe("ready")
  })

  it("B: identical inputs with a new simulationRunId invalidates the previous cache", () => {
    const entry = mockCacheEntry(mockResult(200), inputSignature, run1)

    expect(isShapleyCacheEntryValid(entry, inputSignature, run2)).toBe(false)
    expect(
      resolveShapleyProjectStatus(
        "p1",
        inputSignature,
        run2,
        { p1: entry },
        null,
        {},
        false,
      ),
    ).toBe("idle")
  })

  it("C: recalculated Shapley uses the new mainSimulationP50 for the new run", () => {
    const mainP50Run1 = 210
    const mainP50Run2 = 225

    const run1Result = computeShapleyAttribution({
      costTriangles: [{ min: 80, mode: 100, max: 140 }],
      costIds: ["c1"],
      costNames: ["Cost"],
      drivers: [],
      driverIds: [],
      driverNames: [],
      incurredCosts: 0,
      seed: 7,
      config: { permutations: 40, runsPerSubset: 1500, convergenceBatchSize: 20 },
      mainSimulationP50: mainP50Run1,
    })
    const run2Result = computeShapleyAttribution({
      costTriangles: [{ min: 80, mode: 100, max: 140 }],
      costIds: ["c1"],
      costNames: ["Cost"],
      drivers: [],
      driverIds: [],
      driverNames: [],
      incurredCosts: 0,
      seed: 7,
      config: { permutations: 40, runsPerSubset: 1500, convergenceBatchSize: 20 },
      mainSimulationP50: mainP50Run2,
    })

    expect(run1Result.estimatedP50).toBe(mainP50Run1)
    expect(run2Result.estimatedP50).toBe(mainP50Run2)
    expect(
      Math.abs(run1Result.baseCost + run1Result.expectedAddition - mainP50Run1),
    ).toBeLessThan(1e-9)
    expect(
      Math.abs(run2Result.baseCost + run2Result.expectedAddition - mainP50Run2),
    ).toBeLessThan(1e-9)
  })

  it("keeps cache valid when neither inputs nor simulationRunId change", () => {
    const entry = mockCacheEntry(mockResult(200), inputSignature, run1)
    expect(isShapleyCacheEntryValid(entry, inputSignature, run1)).toBe(true)
    expect(simulationRunKeyForProjects(["p1"], { p1: run1 })).toBe(
      simulationRunKeyForProjects(["p1"], { p1: run1 }),
    )
  })

  it("invalidates when project inputs change even if simulationRunId is unchanged", () => {
    const entry = mockCacheEntry(mockResult(200), inputSignature, run1)
    const changedSignature = shapleyInputSignature({
      ...project,
      costRows: [
        {
          ...project.costRows[0]!,
          likely: "101",
        },
      ],
    })
    expect(isShapleyCacheEntryValid(entry, changedSignature, run1)).toBe(false)
  })

  it("isolates multi-project cache entries by project-specific simulationRunId", () => {
    const runIds = createSimulationRunIdsForProjects(["p1", "p2"], 3)
    const entryP1 = mockCacheEntry(mockResult(200), inputSignature, runIds.p1!)
    const entryP2 = mockCacheEntry(mockResult(300), inputSignature, runIds.p2!)

    expect(isShapleyCacheEntryValid(entryP1, inputSignature, runIds.p1!)).toBe(
      true,
    )
    expect(isShapleyCacheEntryValid(entryP2, inputSignature, runIds.p2!)).toBe(
      true,
    )
    expect(isShapleyCacheEntryValid(entryP1, inputSignature, runIds.p2!)).toBe(
      false,
    )

    const nextRunIds = createSimulationRunIdsForProjects(["p1", "p2"], 4)
    expect(
      isShapleyCacheEntryValid(entryP1, inputSignature, nextRunIds.p1!),
    ).toBe(false)
    expect(
      isShapleyCacheEntryValid(entryP2, inputSignature, nextRunIds.p2!),
    ).toBe(false)
  })

  it("changes simulationRunKey when any project receives a new simulation run", () => {
    const before = createSimulationRunIdsForProjects(["p1", "p2"], 5)
    const after = createSimulationRunIdsForProjects(["p1", "p2"], 6)
    expect(simulationRunKeyForProjects(["p1", "p2"], before)).not.toBe(
      simulationRunKeyForProjects(["p1", "p2"], after),
    )
  })

  it("rejects cache entries with empty simulationRunId", () => {
    const entry = mockCacheEntry(mockResult(200), inputSignature, run1)
    expect(isShapleyCacheEntryValid(entry, inputSignature, "")).toBe(false)
  })
})
