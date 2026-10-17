import { describe, expect, it } from "vitest"

import { computeShapleyAttribution } from "@/domain/simulation/shapleyAttribution"
import { percentile } from "@/domain/simulation/stats"
import {
  simulateAggregateCostWithDriversValuesAndSeries,
  type TriangularParams,
} from "@/simulation"

const MAIN_RUNS = 20_000
const SHAPLEY_PERMUTATIONS = 100
const DRAWS_TO_TEST = [3000, 5000, 10_000] as const

type ProjectSpec = {
  label: "small" | "medium" | "large"
  nCosts: number
  nDrivers: number
  costMode: (index: number) => number
  incurredCosts: number
}

function makeCost(mode: number): TriangularParams {
  return { min: mode * 0.85, mode, max: mode * 1.2 }
}

function makeDriver(index: number): TriangularParams {
  return { min: -8 - index, mode: 0, max: 10 + index }
}

function buildInput(spec: ProjectSpec, runsPerSubset: number) {
  const costTriangles = Array.from({ length: spec.nCosts }, (_, i) =>
    makeCost(spec.costMode(i)),
  )
  const drivers = Array.from({ length: spec.nDrivers }, (_, i) =>
    makeDriver(i),
  )
  const driverImpacts = costTriangles.map((_, c) =>
    drivers.map((_, d) => (c + d) % 3 === 0 ? 50 : 100),
  )
  const n = spec.nCosts
  const corr =
    n > 1
      ? Array.from({ length: n }, (_, i) =>
          Array.from({ length: n }, (_, j) => {
            if (i === j) return 1
            return 0.15 + (0.03 * Math.abs(i - j)) % 0.5
          }),
        )
      : undefined

  return {
    costTriangles,
    costIds: costTriangles.map((_, i) => `cost-${i}`),
    costNames: costTriangles.map((_, i) => `Cost ${i + 1}`),
    drivers,
    driverIds: drivers.map((_, i) => `driver-${i}`),
    driverNames: drivers.map((_, i) => `Driver ${i + 1}`),
    driverImpacts,
    costCorrelation: corr,
    incurredCosts: spec.incurredCosts,
    seed: 4242,
    config: {
      permutations: SHAPLEY_PERMUTATIONS,
      runsPerSubset,
      convergenceBatchSize: 50,
    },
  }
}

const PROJECTS: ProjectSpec[] = [
  {
    label: "small",
    nCosts: 3,
    nDrivers: 2,
    costMode: (i) => 80_000 + i * 15_000,
    incurredCosts: 25_000,
  },
  {
    label: "medium",
    nCosts: 8,
    nDrivers: 4,
    costMode: (i) => 2_500_000 + i * 250_000,
    incurredCosts: 500_000,
  },
  {
    label: "large",
    nCosts: 14,
    nDrivers: 6,
    costMode: (i) => 12_000_000 + i * 800_000,
    incurredCosts: 2_500_000,
  },
]

type ComparisonRow = {
  project: string
  drawsPerSubset: number
  mainP50: number
  shapleyP50: number
  absDiff: number
  relDiffPct: number
  shapleyRuntimeMs: number
  mainRuntimeMs: number
}

function runComparison(
  spec: ProjectSpec,
  drawsPerSubset: number,
): ComparisonRow {
  const input = buildInput(spec, drawsPerSubset)
  const mainStarted = performance.now()
  const { values } = simulateAggregateCostWithDriversValuesAndSeries({
    runs: MAIN_RUNS,
    costTriangles: input.costTriangles,
    drivers: input.drivers,
    driverImpacts: input.driverImpacts,
    costCorrelation: input.costCorrelation,
    costNames: input.costNames,
    driverNames: input.driverNames,
    incurredCosts: input.incurredCosts,
  })
  const mainRuntimeMs = performance.now() - mainStarted
  const mainP50 = percentile(values, 50) ?? NaN

  const shapleyResult = computeShapleyAttribution(input)
  const shapleyP50 = shapleyResult.estimatedP50
  const absDiff = shapleyP50 - mainP50
  const relDiffPct = mainP50 !== 0 ? (absDiff / mainP50) * 100 : 0

  return {
    project: spec.label,
    drawsPerSubset,
    mainP50,
    shapleyP50,
    absDiff,
    relDiffPct,
    shapleyRuntimeMs: shapleyResult.diagnostics.calculationTimeMs,
    mainRuntimeMs,
  }
}

describe("Shapley P50 vs main simulation comparison", () => {
  it("compares P50 alignment at 3000 / 5000 / 10000 draws per subset", () => {
    const rows: ComparisonRow[] = []
    for (const spec of PROJECTS) {
      for (const draws of DRAWS_TO_TEST) {
        rows.push(runComparison(spec, draws))
      }
    }

    // eslint-disable-next-line no-console
    console.table(
      rows.map((row) => ({
        project: row.project,
        draws: row.drawsPerSubset,
        mainP50: Math.round(row.mainP50),
        shapleyP50: Math.round(row.shapleyP50),
        absDiff: Math.round(row.absDiff),
        relDiffPct: Number(row.relDiffPct.toFixed(4)),
        shapleyMs: Math.round(row.shapleyRuntimeMs),
        mainMs: Math.round(row.mainRuntimeMs),
      })),
    )

    for (const row of rows) {
      expect(Number.isFinite(row.mainP50)).toBe(true)
      expect(Number.isFinite(row.shapleyP50)).toBe(true)
      expect(Math.abs(row.relDiffPct)).toBeLessThan(5)
    }
  }, 300_000)
})
