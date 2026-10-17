import { describe, expect, it } from "vitest"

import {
  computeShapleyAttribution,
  DEFAULT_SHAPLEY_ATTRIBUTION_CONFIG,
  type ShapleyAttributionInput,
} from "@/domain/simulation/shapleyAttribution"
import type { TriangularParams } from "@/domain/simulation/simulation"

function makeCost(index: number): TriangularParams {
  const mode = 1_000_000 + index * 50_000
  return {
    min: mode * 0.85,
    mode,
    max: mode * 1.2,
  }
}

function makeDriver(index: number): TriangularParams {
  return {
    min: -8 - index,
    mode: 0,
    max: 10 + index,
  }
}

function buildSyntheticProject(nCosts: number, nDrivers: number): ShapleyAttributionInput {
  const costTriangles = Array.from({ length: nCosts }, (_, i) => makeCost(i))
  const drivers = Array.from({ length: nDrivers }, (_, i) => makeDriver(i))
  const driverImpacts = costTriangles.map((_, c) =>
    drivers.map((_, d) => ((c + d) % 3 === 0 ? 50 : 100)),
  )
  const n = nCosts
  const corr = Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => {
      if (i === j) return 1
      return 0.15 + ((0.03 * Math.abs(i - j)) % 0.5)
    }),
  )
  return {
    costTriangles,
    costIds: costTriangles.map((_, i) => `cost-${i}`),
    costNames: costTriangles.map((_, i) => `Cost ${i + 1}`),
    drivers,
    driverIds: drivers.map((_, i) => `driver-${i}`),
    driverNames: drivers.map((_, i) => `Driver ${i + 1}`),
    driverImpacts,
    costCorrelation: nCosts > 1 ? corr : undefined,
    incurredCosts: 250_000,
    seed: 9001,
    config: DEFAULT_SHAPLEY_ATTRIBUTION_CONFIG,
  }
}

type BenchRow = {
  players: number
  nCosts: number
  nDrivers: number
  runtimeMs: number
  subsetsEvaluated: number
  cacheHits: number
  additivityResidual: number
  reserveAdditivityResidual: number
  convergenceMaxAbsDelta: number | null
  approximateMemoryMb: number | null
}

function runBench(nCosts: number, nDrivers: number): BenchRow {
  const result = computeShapleyAttribution(buildSyntheticProject(nCosts, nDrivers))
  return {
    players: nCosts + nDrivers,
    nCosts,
    nDrivers,
    runtimeMs: result.diagnostics.calculationTimeMs,
    subsetsEvaluated: result.diagnostics.subsetsEvaluated,
    cacheHits: result.diagnostics.cacheHits,
    additivityResidual: result.diagnostics.additivityResidual,
    reserveAdditivityResidual: result.diagnostics.reserveAdditivityResidual,
    convergenceMaxAbsDelta: result.diagnostics.convergenceMaxAbsDelta,
    approximateMemoryMb:
      result.diagnostics.approximateMemoryBytes == null
        ? null
        : result.diagnostics.approximateMemoryBytes / (1024 * 1024),
  }
}

describe("Shapley performance benchmark", () => {
  it("benchmarks 10 / 20 / 32 player synthetic projects", () => {
    const rows = [runBench(6, 4), runBench(12, 8), runBench(20, 12)]

    console.table(rows)

    for (const row of rows) {
      expect(Math.abs(row.additivityResidual)).toBeLessThan(1e-8)
      expect(Math.abs(row.reserveAdditivityResidual ?? 0)).toBeLessThan(1e-8)
      expect(row.runtimeMs).toBeGreaterThan(0)
      expect(row.subsetsEvaluated).toBeGreaterThan(0)
    }

    expect(rows[2]!.players).toBe(32)
  }, 120_000)
})
