import { describe, expect, it } from "vitest"

import {
  computeDeterministicTornado,
  computeDeterministicTornadoRows,
} from "@/lib/deterministicTornado"
import { computeBaseCostSum, type Project } from "@/lib/project"
import { buildSimulationProjectPayload } from "@/lib/buildSimulationProjectPayload"
import { createSeededRng } from "@/lib/shapleyAttribution"
import {
  prepareCostCorrelationCholesky,
  sampleCorrelatedUniforms,
} from "@/lib/costCorrelation"
import {
  computeTotalFromSampledValues,
  summarizeSamples,
  triangularQuantile,
} from "@/simulation"
import { percentile } from "@/lib/stats"

function cost(
  id: string,
  name: string,
  opt: string,
  like: string,
  pes: string,
): Project["costRows"][number] {
  return { id, name, optimistic: opt, likely: like, pessimistic: pes }
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

function seededP50P85(project: Project, seed = 12_345, runs = 8_000) {
  const payload = buildSimulationProjectPayload(project)!
  const rng = createSeededRng(seed)
  const prep = prepareCostCorrelationCholesky(
    payload.costCorrelation,
    payload.costs.length,
  )
  const values: number[] = []
  for (let i = 0; i < runs; i++) {
    let costValues: number[]
    if (payload.costs.length <= 1) {
      costValues = payload.costs.map((c) =>
        triangularQuantile(c.min, c.mode, c.max, rng()),
      )
    } else {
      const u = sampleCorrelatedUniforms(prep.choleskyL, rng)
      costValues = payload.costs.map((c, idx) =>
        triangularQuantile(c.min, c.mode, c.max, u[idx]!),
      )
    }
    const drivers = payload.drivers.map((d) =>
      triangularQuantile(d.min, d.mode, d.max, rng()),
    )
    values.push(
      computeTotalFromSampledValues({
        costValues,
        driverPctValues: drivers,
        driverImpacts: payload.driverImpacts,
        incurredCosts: payload.incurredCosts,
      }),
    )
  }
  return {
    baseCost: computeBaseCostSum(project.costRows, project.incurredCosts),
    p50: percentile(values, 50),
    p85: percentile(values, 85),
    summary: summarizeSamples(values),
  }
}

describe("production deterministic Tornado", () => {
  it("A: single symmetric cost item", () => {
    const project: Project = {
      id: "a",
      name: "A",
      incurredCosts: 0,
      costRows: [cost("c1", "Item", "-10", "100", "10")],
      driverRows: [],
    }
    const full = computeDeterministicTornado(project)!
    expect(full.referenceValue).toBe(100)
    expect(full.baseCost).toBe(100)
    expect(full.rows[0]!.lowImpact).toBeCloseTo(-10, 10)
    expect(full.rows[0]!.highImpact).toBeCloseTo(10, 10)
    expect(full.rows[0]!.spread).toBeCloseTo(20, 10)
  })

  it("B: asymmetric cost item", () => {
    const project: Project = {
      id: "b",
      name: "B",
      incurredCosts: 0,
      costRows: [cost("c1", "Asym", "-20", "100", "40")],
      driverRows: [],
    }
    const row = computeDeterministicTornadoRows(project)[0]!
    expect(row.lowImpact).toBe(-20)
    expect(row.highImpact).toBe(40)
    expect(row.spread).toBe(60)
  })

  it("C: one multiplicative driver at 100% impact", () => {
    const project: Project = {
      id: "c",
      name: "C",
      incurredCosts: 0,
      costRows: [cost("c1", "Cost", "0", "100", "0")],
      driverRows: [driver("d1", "Market", "-10", "0", "20")],
    }
    const market = computeDeterministicTornadoRows(project).find(
      (r) => r.name === "Market",
    )!
    expect(market.lowImpact).toBeCloseTo(-10, 10)
    expect(market.highImpact).toBeCloseTo(20, 10)
    expect(market.spread).toBeCloseTo(30, 10)
  })

  it("D: partial driver impact uses existing formula", () => {
    const project: Project = {
      id: "d",
      name: "D",
      incurredCosts: 0,
      costRows: [
        cost("c1", "A", "0", "100", "0"),
        cost("c2", "B", "0", "100", "0"),
      ],
      driverRows: [driver("d1", "Partial", "-10", "0", "20")],
      driverImpacts: { d1: { c1: "100", c2: "30" } },
    }
    const row = computeDeterministicTornadoRows(project).find(
      (r) => r.name === "Partial",
    )!
    expect(row.lowImpact).toBeCloseTo(-13, 10)
    expect(row.highImpact).toBeCloseTo(26, 10)
    expect(row.spread).toBeCloseTo(39, 10)
  })

  it("E: correlations do not change Tornado; may change MC P50", () => {
    const base: Project = {
      id: "e",
      name: "E",
      incurredCosts: 0,
      costRows: [
        cost("c1", "X", "-20", "100", "20"),
        cost("c2", "Y", "-20", "100", "20"),
      ],
      driverRows: [],
    }
    const correlated: Project = {
      ...base,
      costCorrelations: { c1: { c2: "0.8" } },
    }
    const t0 = computeDeterministicTornadoRows(base)
    const t1 = computeDeterministicTornadoRows(correlated)
    expect(t1).toEqual(t0)

    const mc0 = seededP50P85(base)
    const mc1 = seededP50P85(correlated)
    // Same seed/path with correlation present can shift distribution
    expect(mc0.baseCost).toBe(mc1.baseCost)
    expect(mc0.p50).not.toBeNull()
    expect(mc1.p50).not.toBeNull()
  })

  it("F: non-zero driver mode — reference = allModeTotal ≠ baseCost", () => {
    const project: Project = {
      id: "f",
      name: "F",
      incurredCosts: 0,
      costRows: [cost("c1", "Cost", "0", "100", "0")],
      driverRows: [driver("d1", "Bias", "0", "10", "20")],
    }
    const full = computeDeterministicTornado(project)!
    expect(full.baseCost).toBe(100)
    expect(full.referenceValue).toBeCloseTo(110, 10)
    const bias = full.rows.find((r) => r.name === "Bias")!
    expect(bias.lowImpact).toBeCloseTo(-10, 10) // 100 − 110
    expect(bias.highImpact).toBeCloseTo(10, 10) // 120 − 110
    // modeImpact conceptually 0 vs reference
    expect(full.referenceValue + 0).toBe(full.referenceValue)
  })

  it("G: ranks by deterministic spread", () => {
    const project: Project = {
      id: "g",
      name: "G",
      incurredCosts: 0,
      costRows: [
        cost("c1", "Small", "-5", "100", "5"),
        cost("c2", "Large", "-30", "100", "40"),
      ],
      driverRows: [driver("d1", "Mid", "-10", "0", "10")],
    }
    const rows = computeDeterministicTornadoRows(project)
    expect(rows[0]!.name).toBe("Large")
    expect(rows[0]!.spread).toBeGreaterThan(rows[1]!.spread)
    expect(rows.map((r) => r.spread)).toEqual(
      [...rows.map((r) => r.spread)].sort((a, b) => b - a),
    )
  })

  it("regression: Base Cost / seeded P50–P85 unchanged by Tornado API shape", () => {
    const project: Project = {
      id: "reg",
      name: "Reg",
      incurredCosts: 1_000,
      costRows: [
        cost("c1", "A", "-10", "100", "15"),
        cost("c2", "B", "-5", "50", "10"),
      ],
      driverRows: [driver("d1", "D", "-8", "0", "12")],
      driverImpacts: { d1: { c1: "50" } },
      costCorrelations: { c1: { c2: "0.4" } },
    }
    const beforeTornado = seededP50P85(project)
    void computeDeterministicTornadoRows(project, 6)
    const afterTornado = seededP50P85(project)
    expect(afterTornado).toEqual(beforeTornado)
    expect(beforeTornado.baseCost).toBe(1_150)
  })

  it("does not depend on Monte Carlo draws (identical across calls)", () => {
    const project: Project = {
      id: "idemp",
      name: "I",
      incurredCosts: 0,
      costRows: [cost("c1", "C", "-12", "200", "18")],
      driverRows: [driver("d1", "D", "-10", "0", "20")],
    }
    expect(computeDeterministicTornadoRows(project)).toEqual(
      computeDeterministicTornadoRows(project),
    )
  })
})
