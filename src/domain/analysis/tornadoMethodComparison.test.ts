import { describe, expect, it } from "vitest"

import {
  computeCrystalBallTornadoReference,
  costUserPercentileAbsolutes,
} from "@/domain/simulation/crystalBallTornadoReference"
import { computeMonteCarloConditionalTornadoRows } from "@/domain/simulation/monteCarloConditionalTornado"
import { buildSimulationProjectPayload } from "@/domain/simulation/buildSimulationProjectPayload"
import { createSeededRng } from "@/domain/simulation/shapleyAttribution"
import {
  sampleCorrelatedUniforms,
  prepareCostCorrelationCholesky,
} from "@/domain/simulation/costCorrelation"
import { percentile } from "@/domain/simulation/stats"
import type { Project } from "@/domain/analysis/project"
import {
  computeTotalFromSampledValues,
  triangularQuantile,
  type SimulationInputSeriesItem,
  type TriangularParams,
} from "@/domain/simulation/simulation"

/**
 * Seeded mirror of production series simulation for reproducible MC Tornado
 * comparisons. Does not change the production worker path.
 */
function simulateSeededClean(opts: {
  runs: number
  seed: number
  costTriangles: TriangularParams[]
  drivers: TriangularParams[]
  driverImpacts?: readonly (readonly number[])[]
  costCorrelation?: number[][]
  costNames?: readonly string[]
  driverNames?: readonly string[]
  incurredCosts?: number
}): { values: number[]; inputSeries: SimulationInputSeriesItem[] } {
  const rng = createSeededRng(opts.seed)
  const incurred = Number.isFinite(opts.incurredCosts) ? Math.max(0, opts.incurredCosts!) : 0
  const values: number[] = new Array(opts.runs)
  const costSamples: number[][] = opts.costTriangles.map(() => new Array(opts.runs))
  const driverSamples: number[][] = opts.drivers.map(() => new Array(opts.runs))
  const costCorrelationPrep = prepareCostCorrelationCholesky(
    opts.costCorrelation,
    opts.costTriangles.length,
  )

  for (let i = 0; i < opts.runs; i++) {
    let costValues: number[]
    if (opts.costTriangles.length <= 1) {
      costValues = opts.costTriangles.map((c) => triangularQuantile(c.min, c.mode, c.max, rng()))
    } else {
      const uniforms = sampleCorrelatedUniforms(costCorrelationPrep.choleskyL, rng)
      costValues = opts.costTriangles.map((c, idx) =>
        triangularQuantile(c.min, c.mode, c.max, uniforms[idx]!),
      )
    }
    for (let c = 0; c < opts.costTriangles.length; c++) {
      costSamples[c]![i] = costValues[c]!
    }
    const driverPctValues: number[] = []
    for (let d = 0; d < opts.drivers.length; d++) {
      const t = opts.drivers[d]!
      const p = triangularQuantile(t.min, t.mode, t.max, rng())
      driverSamples[d]![i] = p
      driverPctValues.push(p)
    }
    values[i] = computeTotalFromSampledValues({
      costValues,
      driverPctValues,
      driverImpacts: opts.driverImpacts,
      incurredCosts: incurred,
    })
  }

  return {
    values,
    inputSeries: [
      ...costSamples.map((s, i) => ({
        name: opts.costNames?.[i]?.trim() || `Kost ${i + 1}`,
        type: "cost" as const,
        values: s,
      })),
      ...driverSamples.map((s, i) => ({
        name: opts.driverNames?.[i]?.trim() || `Driver ${i + 1}`,
        type: "driver" as const,
        values: s,
      })),
    ],
  }
}

type ComparisonRow = {
  factor: string
  mcLow: number
  mcHigh: number
  mcSpread: number
  detLow: number
  detMode: number
  detHigh: number
  detSpread: number
  mcRank: number
  detRank: number
}

function compareProject(
  project: Project,
  runs = 20_000,
  seed = 42_424,
): {
  rows: ComparisonRow[]
  baseCost: number
  totalAllAtMode: number
  mcBaselineP50: number | null
} {
  const payload = buildSimulationProjectPayload(project)
  if (!payload) throw new Error("invalid project payload")
  const sim = simulateSeededClean({
    runs,
    seed,
    costTriangles: payload.costs,
    drivers: payload.drivers,
    driverImpacts: payload.driverImpacts,
    costCorrelation: payload.costCorrelation,
    costNames: payload.costNames,
    driverNames: payload.driverNames,
    incurredCosts: payload.incurredCosts,
  })
  const mcRows = computeMonteCarloConditionalTornadoRows(sim.values, sim.inputSeries, 12)
  const det = computeCrystalBallTornadoReference(project, 12)
  if (!det) throw new Error("deterministic reference failed")

  const mcBaselineP50 = percentile(sim.values, 50)

  const allNames = new Set([...mcRows.map((r) => r.name), ...det.rows.map((r) => r.name)])
  const rows: ComparisonRow[] = []
  for (const name of allNames) {
    const mc = mcRows.find((r) => r.name === name)
    const d = det.rows.find((r) => r.name === name)
    rows.push({
      factor: name,
      mcLow: mc?.lowImpact ?? NaN,
      mcHigh: mc?.highImpact ?? NaN,
      mcSpread: mc?.spread ?? NaN,
      detLow: d?.lowImpact ?? NaN,
      detMode: d?.modeImpact ?? NaN,
      detHigh: d?.highImpact ?? NaN,
      detSpread: d?.spread ?? NaN,
      mcRank: mc ? mcRows.indexOf(mc) + 1 : -1,
      detRank: d ? det.rows.indexOf(d) + 1 : -1,
    })
  }
  rows.sort((a, b) => (b.detSpread || 0) - (a.detSpread || 0))
  return {
    rows,
    baseCost: det.baseCost,
    totalAllAtMode: det.totalAllAtMode,
    mcBaselineP50,
  }
}

function round1(n: number): number {
  return Math.round(n * 10) / 10
}

function cost(
  id: string,
  name: string,
  optPct: string,
  likely: string,
  pesPct: string,
): Project["costRows"][number] {
  return { id, name, optimistic: optPct, likely, pessimistic: pesPct }
}

function driver(
  id: string,
  name: string,
  opt: string,
  like: string,
  pes: string,
): Project["driverRows"][number] {
  return { id, name, optimistic: opt, likely: like, pessimistic: pes }
}

describe("Tornado method comparison (MC conditional vs Crystal Ball–style)", () => {
  it("documents current MC tornado baseline = P50 of totals", () => {
    const project: Project = {
      id: "p",
      name: "A",
      incurredCosts: 0,
      costRows: [cost("c1", "Item", "-10", "100", "10")],
      driverRows: [],
    }
    const cmp = compareProject(project)
    expect(cmp.mcBaselineP50).not.toBeNull()
    expect(Math.abs(cmp.mcBaselineP50! - 100)).toBeLessThan(2)
  })

  it("CASE A – single symmetric cost item", () => {
    const project: Project = {
      id: "a",
      name: "A",
      incurredCosts: 0,
      costRows: [cost("c1", "Item", "-10", "100", "10")],
      driverRows: [],
    }
    const abs = costUserPercentileAbsolutes(project.costRows[0]!)!
    expect(abs.p10).toBeCloseTo(90, 10)
    expect(abs.mode).toBe(100)
    expect(abs.p90).toBeCloseTo(110, 10)

    const det = computeCrystalBallTornadoReference(project)!
    expect(det.baseCost).toBe(100)
    expect(det.totalAllAtMode).toBe(100)
    expect(det.rows[0]!.lowImpact).toBeCloseTo(-10, 10)
    expect(det.rows[0]!.modeImpact).toBeCloseTo(0, 10)
    expect(det.rows[0]!.highImpact).toBeCloseTo(10, 10)
    expect(det.rows[0]!.spread).toBeCloseTo(20, 10)

    const cmp = compareProject(project)
    const row = cmp.rows.find((r) => r.factor === "Item")!
    // Isolated symmetric factor: MC conditional ≈ deterministic
    expect(Math.abs(row.mcLow - row.detLow)).toBeLessThan(4)
    expect(Math.abs(row.mcHigh - row.detHigh)).toBeLessThan(4)
    expect(Math.abs(row.mcSpread - row.detSpread)).toBeLessThan(6)
    console.log("CASE A", {
      det: { low: row.detLow, high: row.detHigh, spread: row.detSpread },
      mc: {
        low: round1(row.mcLow),
        high: round1(row.mcHigh),
        spread: round1(row.mcSpread),
      },
    })
  })

  it("CASE B – asymmetric cost item", () => {
    const project: Project = {
      id: "b",
      name: "B",
      incurredCosts: 0,
      costRows: [cost("c1", "Asym", "-20", "100", "40")],
      driverRows: [],
    }
    const det = computeCrystalBallTornadoReference(project)!
    expect(det.rows[0]).toMatchObject({
      lowImpact: -20,
      modeImpact: 0,
      highImpact: 40,
      spread: 60,
    })
    const cmp = compareProject(project)
    const row = cmp.rows[0]!
    expect(row.detSpread).toBe(60)
    // Skewed triangular + P50 baseline (≠ Base under skew) → MC spread can
    // differ materially from isolated P10/P90-vs-Base bars.
    expect(Number.isFinite(row.mcSpread)).toBe(true)
    expect(Math.abs(row.mcSpread - 60)).toBeGreaterThan(5)
    console.log("CASE B", {
      det: { low: -20, high: 40, spread: 60 },
      mc: {
        low: round1(row.mcLow),
        high: round1(row.mcHigh),
        spread: round1(row.mcSpread),
        baselineP50: round1(cmp.mcBaselineP50!),
        baseCost: cmp.baseCost,
      },
    })
  })

  it("CASE C – one multiplicative driver at 100% impact", () => {
    const project: Project = {
      id: "c",
      name: "C",
      incurredCosts: 0,
      costRows: [cost("c1", "Cost", "0", "100", "0")],
      driverRows: [driver("d1", "Market", "-10", "0", "20")],
    }
    const det = computeCrystalBallTornadoReference(project)!
    const dRow = det.rows.find((r) => r.name === "Market")!
    expect(dRow.lowImpact).toBeCloseTo(-10, 10)
    expect(dRow.modeImpact).toBeCloseTo(0, 10)
    expect(dRow.highImpact).toBeCloseTo(20, 10)
    expect(dRow.spread).toBeCloseTo(30, 10)
    const cRow = det.rows.find((r) => r.name === "Cost")!
    expect(cRow.spread).toBeCloseTo(0, 10)

    const cmp = compareProject(project)
    const mcDriver = cmp.rows.find((r) => r.factor === "Market")!
    expect(Number.isFinite(mcDriver.mcSpread)).toBe(true)
    // Fixed cost at mode: MC should still be in the same ballpark as det.
    expect(Math.abs(mcDriver.mcSpread - 30)).toBeLessThan(12)
    console.log("CASE C", {
      detDriver: { low: -10, high: 20, spread: 30 },
      mcDriver: {
        low: round1(mcDriver.mcLow),
        high: round1(mcDriver.mcHigh),
        spread: round1(mcDriver.mcSpread),
      },
    })
  })

  it("CASE D – driver partial impact 100% / 30%", () => {
    const project: Project = {
      id: "d",
      name: "D",
      incurredCosts: 0,
      costRows: [cost("c1", "A", "0", "100", "0"), cost("c2", "B", "0", "100", "0")],
      driverRows: [driver("d1", "Partial", "-10", "0", "20")],
      driverImpacts: { d1: { c1: "100", c2: "30" } },
    }
    const det = computeCrystalBallTornadoReference(project)!
    expect(det.baseCost).toBe(200)
    const dRow = det.rows.find((r) => r.name === "Partial")!
    expect(dRow.lowImpact).toBeCloseTo(-13, 10)
    expect(dRow.highImpact).toBeCloseTo(26, 10)
    expect(dRow.spread).toBeCloseTo(39, 10)

    const cmp = compareProject(project)
    const mc = cmp.rows.find((r) => r.factor === "Partial")!
    expect(Number.isFinite(mc.mcSpread)).toBe(true)
    expect(Math.abs(mc.mcSpread - 39)).toBeLessThan(15)
    console.log("CASE D", {
      det: { low: -13, high: 26, spread: 39 },
      mc: {
        low: round1(mc.mcLow),
        high: round1(mc.mcHigh),
        spread: round1(mc.mcSpread),
      },
    })
  })

  it("CASE E – correlated cost items: MC bars absorb dependence; det ignores it", () => {
    const project: Project = {
      id: "e",
      name: "E",
      incurredCosts: 0,
      costRows: [
        cost("c1", "X", "-20", "100", "20"),
        cost("c2", "Y", "-20", "100", "20"),
        cost("c3", "Z", "-10", "50", "10"),
      ],
      driverRows: [],
      costCorrelations: {
        c1: { c2: "0.8", c3: "0.5" },
        c2: { c3: "0.5" },
      },
    }
    const det = computeCrystalBallTornadoReference(project)!
    const xDet = det.rows.find((r) => r.name === "X")!
    const yDet = det.rows.find((r) => r.name === "Y")!
    expect(xDet.spread).toBeCloseTo(yDet.spread, 10)
    expect(xDet.spread).toBeCloseTo(40, 10)

    const cmp = compareProject(project, 30_000, 99_001)
    const xMc = cmp.rows.find((r) => r.factor === "X")!
    const yMc = cmp.rows.find((r) => r.factor === "Y")!
    expect(xMc.mcSpread).toBeGreaterThan(xDet.spread + 5)
    console.log("CASE E", {
      detX: { low: xDet.lowImpact, high: xDet.highImpact, spread: xDet.spread },
      detY: { low: yDet.lowImpact, high: yDet.highImpact, spread: yDet.spread },
      mcX: {
        low: round1(xMc.mcLow),
        high: round1(xMc.mcHigh),
        spread: round1(xMc.mcSpread),
      },
      mcY: {
        low: round1(yMc.mcLow),
        high: round1(yMc.mcHigh),
        spread: round1(yMc.mcSpread),
      },
    })
  })

  it("CASE F – multiple drivers: MC co-movement vs isolated det", () => {
    const project: Project = {
      id: "f",
      name: "F",
      incurredCosts: 0,
      costRows: [cost("c1", "Cost", "-5", "100", "5")],
      driverRows: [driver("d1", "D1", "-10", "0", "20"), driver("d2", "D2", "-15", "0", "15")],
    }
    const det = computeCrystalBallTornadoReference(project)!
    const d1Det = det.rows.find((r) => r.name === "D1")!
    const d2Det = det.rows.find((r) => r.name === "D2")!
    expect(d1Det.spread).toBeCloseTo(30, 8)
    expect(d2Det.spread).toBeCloseTo(30, 8)

    const cmp = compareProject(project, 25_000, 7_777)
    console.log("CASE F", {
      det: cmp.rows.map((r) => ({
        f: r.factor,
        detSpread: round1(r.detSpread),
        mcSpread: round1(r.mcSpread),
        detRank: r.detRank,
        mcRank: r.mcRank,
      })),
      baseCost: cmp.baseCost,
      totalAllAtMode: cmp.totalAllAtMode,
    })
    expect(cmp.rows.every((r) => Number.isFinite(r.mcSpread))).toBe(true)
  })

  it("non-zero driver mode: totalAllAtMode ≠ baseCost; impacts vs reference", () => {
    const project: Project = {
      id: "mode",
      name: "Mode",
      incurredCosts: 0,
      costRows: [cost("c1", "Cost", "0", "100", "0")],
      driverRows: [driver("d1", "Bias", "0", "10", "20")],
    }
    const det = computeCrystalBallTornadoReference(project)!
    expect(det.baseCost).toBe(100)
    expect(det.totalAllAtMode).toBeCloseTo(110, 10)
    const d = det.rows.find((r) => r.name === "Bias")!
    expect(d.modeImpact).toBeCloseTo(0, 10)
    expect(d.lowImpact).toBeCloseTo(-10, 10)
    expect(d.highImpact).toBeCloseTo(10, 10)
  })
})
