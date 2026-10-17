import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

import {
  calibrateTriangularFromPercentiles,
  triangularCdf,
  triangularParamsFromPercentiles,
} from "@/lib/triangularCalibration"
import {
  costAbsoluteLikelyToTriangular,
  triangularQuantile,
} from "@/simulation"
import { messages } from "@/i18n/messages"
import {
  parseCostForSimulation,
  parseDriverForSimulation,
  driverLikelyOutsideSpan,
  driverCalibratedSupportInvalid,
  type ScenarioRow,
} from "@/lib/tableRows"
import { percentile } from "@/lib/stats"

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = join(__dirname, "../..")

function row(partial: Partial<ScenarioRow> & Pick<ScenarioRow, "optimistic" | "likely" | "pessimistic">): ScenarioRow {
  return {
    id: "t",
    name: "x",
    ...partial,
  }
}

describe("calibrateTriangularFromPercentiles", () => {
  it("A: analytically satisfies CDF(p10)=0.1 and CDF(p90)=0.9", () => {
    const cases: [number, number, number][] = [
      [-16, 0, 16],
      [80, 100, 140],
      [90, 100, 110],
      [50, 100, 200],
      [-16, 0, 16],
    ]
    for (const [p10, mode, p90] of cases) {
      const c = calibrateTriangularFromPercentiles(p10, mode, p90)
      expect(c).not.toBeNull()
      expect(triangularCdf(p10, c!.low, c!.mode, c!.high)).toBeCloseTo(0.1, 8)
      expect(triangularCdf(p90, c!.low, c!.mode, c!.high)).toBeCloseTo(0.9, 8)
      expect(c!.mode).toBe(mode)
      expect(c!.low).toBeLessThan(p10)
      expect(c!.high).toBeGreaterThan(p90)
    }
  })

  it("B: symmetric -16/0/+16 matches closed-form support ≈ ±28.94", () => {
    const c = calibrateTriangularFromPercentiles(-16, 0, 16)!
    const closed = 16 / (1 - Math.sqrt(0.2))
    expect(c.low).toBeCloseTo(-closed, 8)
    expect(c.high).toBeCloseTo(closed, 8)
    expect(c.low).toBeCloseTo(-28.94427190999916, 6)
    expect(c.high).toBeCloseTo(28.94427190999916, 6)
  })

  it("C: asymmetric 80/100/140 calibrates beyond hard bounds", () => {
    const c = calibrateTriangularFromPercentiles(80, 100, 140)!
    expect(c.low).toBeLessThan(80)
    expect(c.high).toBeGreaterThan(140)
    expect(c.mode).toBe(100)
    expect(triangularCdf(80, c.low, c.mode, c.high)).toBeCloseTo(0.1, 8)
    expect(triangularCdf(140, c.low, c.mode, c.high)).toBeCloseTo(0.9, 8)
    // Asymmetry: upper span from mode larger than lower → high-mode > mode-low
    expect(c.high - 100).toBeGreaterThan(100 - c.low)
  })

  it("D: narrow lower / wide upper span", () => {
    const c = calibrateTriangularFromPercentiles(95, 100, 160)!
    expect(triangularCdf(95, c.low, c.mode, c.high)).toBeCloseTo(0.1, 8)
    expect(triangularCdf(160, c.low, c.mode, c.high)).toBeCloseTo(0.9, 8)
    expect(c.high - 100).toBeGreaterThan(100 - c.low)
  })

  it("E: wide lower / narrow upper span", () => {
    const c = calibrateTriangularFromPercentiles(40, 100, 110)!
    expect(triangularCdf(40, c.low, c.mode, c.high)).toBeCloseTo(0.1, 8)
    expect(triangularCdf(110, c.low, c.mode, c.high)).toBeCloseTo(0.9, 8)
    expect(100 - c.low).toBeGreaterThan(c.high - 100)
  })

  it("rejects invalid order and non-finite inputs", () => {
    expect(calibrateTriangularFromPercentiles(140, 100, 80)).toBeNull()
    expect(calibrateTriangularFromPercentiles(1, 0, 2)).toBeNull()
    expect(calibrateTriangularFromPercentiles(-2, 0, -1)).toBeNull()
    expect(calibrateTriangularFromPercentiles(Number.NaN, 100, 140)).toBeNull()
    expect(calibrateTriangularFromPercentiles(80, 100, Number.POSITIVE_INFINITY)).toBeNull()
  })

  it("A: 80/100/140 remains valid", () => {
    const c = calibrateTriangularFromPercentiles(80, 100, 140)
    expect(c).not.toBeNull()
  })

  it("B: 0/0/1 mode-at-P10 calibrates with CDF checks", () => {
    const c = calibrateTriangularFromPercentiles(0, 0, 1)!
    expect(c.mode).toBe(0)
    expect(c.low).toBeLessThan(0)
    expect(c.high).toBeGreaterThan(1)
    expect(c.low).toBeCloseTo(-1 / 6, 10)
    expect(c.high).toBeCloseTo(1.5, 10)
    expect(triangularCdf(0, c.low, c.mode, c.high)).toBeCloseTo(0.1, 10)
    expect(triangularCdf(1, c.low, c.mode, c.high)).toBeCloseTo(0.9, 10)
  })

  it("C: -1/0/0 mode-at-P90 calibrates with CDF checks", () => {
    const c = calibrateTriangularFromPercentiles(-1, 0, 0)!
    expect(c.mode).toBe(0)
    expect(c.low).toBeLessThan(-1)
    expect(c.high).toBeGreaterThan(0)
    expect(c.low).toBeCloseTo(-1.5, 10)
    expect(c.high).toBeCloseTo(1 / 6, 10)
    expect(triangularCdf(-1, c.low, c.mode, c.high)).toBeCloseTo(0.1, 10)
    expect(triangularCdf(0, c.low, c.mode, c.high)).toBeCloseTo(0.9, 10)
  })

  it("D: 0/0/0 point mass", () => {
    expect(calibrateTriangularFromPercentiles(0, 0, 0)).toEqual({
      low: 0,
      mode: 0,
      high: 0,
    })
    expect(triangularParamsFromPercentiles(0, 0, 0)).toEqual({
      min: 0,
      mode: 0,
      max: 0,
    })
  })

  it("E: 1/0/2 is invalid (mode below P10)", () => {
    expect(calibrateTriangularFromPercentiles(1, 0, 2)).toBeNull()
  })

  it("F: -2/0/-1 is invalid (mode above P90)", () => {
    expect(calibrateTriangularFromPercentiles(-2, 0, -1)).toBeNull()
  })

  it("G: NaN / Infinity invalid", () => {
    expect(calibrateTriangularFromPercentiles(Number.NaN, 0, 1)).toBeNull()
    expect(calibrateTriangularFromPercentiles(0, 0, Number.POSITIVE_INFINITY)).toBeNull()
  })

  it("point mass when all three equal", () => {
    expect(calibrateTriangularFromPercentiles(50, 50, 50)).toEqual({
      low: 50,
      mode: 50,
      high: 50,
    })
  })
})

describe("boundary ordering through parsers", () => {
  it("driver 0/0/1 parses successfully", () => {
    const params = parseDriverForSimulation(
      row({ optimistic: "0", likely: "0", pessimistic: "1" }),
    )
    expect(params).not.toBeNull()
    expect(params!.mode).toBe(0)
    expect(params!.min).toBeLessThan(0)
    expect(params!.max).toBeGreaterThan(1)
  })

  it("driver -1/0/0 parses successfully", () => {
    const params = parseDriverForSimulation(
      row({ optimistic: "-1", likely: "0", pessimistic: "0" }),
    )
    expect(params).not.toBeNull()
    expect(triangularCdf(-1, params!.min, params!.mode, params!.max)).toBeCloseTo(
      0.1,
      10,
    )
    expect(triangularCdf(0, params!.min, params!.mode, params!.max)).toBeCloseTo(
      0.9,
      10,
    )
  })

  it("equality is not flagged as outside span", () => {
    expect(
      driverLikelyOutsideSpan(
        row({ optimistic: "0", likely: "0", pessimistic: "1" }),
      ),
    ).toBe(false)
    expect(
      driverLikelyOutsideSpan(
        row({ optimistic: "-1", likely: "0", pessimistic: "0" }),
      ),
    ).toBe(false)
    expect(
      driverLikelyOutsideSpan(
        row({ optimistic: "1", likely: "0", pessimistic: "2" }),
      ),
    ).toBe(true)
  })

  it("ordered driver with calibrated support ≤ −100 is rejected separately", () => {
    // mode-at-P10: dL = R/6 ≥ 100 ⇒ R ≥ 600
    const extreme = row({ optimistic: "0", likely: "0", pessimistic: "600" })
    expect(driverLikelyOutsideSpan(extreme)).toBe(false)
    expect(driverCalibratedSupportInvalid(extreme)).toBe(true)
    expect(parseDriverForSimulation(extreme)).toBeNull()
    expect(
      driverCalibratedSupportInvalid(
        row({ optimistic: "0", likely: "0", pessimistic: "1" }),
      ),
    ).toBe(false)
  })

  it("driver calibrated-support error uses plain-language NO/EN copy with name slot", () => {
    expect(messages.no.inputs.driverCalibratedSupportInvalid).toBe(
      "Spennet for «{driverName}» går for langt mot nedsiden. Sett den optimistiske verdien nærmere mest sannsynlig.",
    )
    expect(messages.en.inputs.driverCalibratedSupportInvalid).toBe(
      'The range for “{driverName}” extends too far on the downside. Move the optimistic value closer to the most likely value.',
    )
    expect(
      messages.no.inputs.driverCalibratedSupportInvalid.replace(
        "{driverName}",
        "test 2",
      ),
    ).toBe(
      "Spennet for «test 2» går for langt mot nedsiden. Sett den optimistiske verdien nærmere mest sannsynlig.",
    )
    expect(messages.no.inputs.driverCalibratedSupportInvalid).not.toMatch(
      /multiplikator|kalibrert|≤\s*−100/i,
    )
    expect(messages.en.inputs.driverCalibratedSupportInvalid).not.toMatch(
      /multiplier|calibrated|≤\s*-100/i,
    )
  })

  it("cost item allows mode at P10 (0% optimistic)", () => {
    const params = costAbsoluteLikelyToTriangular({
      base: 100,
      optimisticPercent: 0,
      pessimisticPercent: 40,
    })
    expect(params).not.toBeNull()
    expect(params!.mode).toBe(100)
    expect(params!.min).toBeLessThan(100)
    expect(params!.max).toBeGreaterThan(140)
    expect(triangularCdf(100, params!.min, params!.mode, params!.max)).toBeCloseTo(
      0.1,
      8,
    )
  })
})

describe("user-input conversion paths", () => {
  it("F: cost items calibrate P10/mode/P90 from O/M/P percents", () => {
    const params = costAbsoluteLikelyToTriangular({
      base: 100,
      optimisticPercent: -20,
      pessimisticPercent: 40,
    })!
    expect(params.min).toBeLessThan(80)
    expect(params.mode).toBe(100)
    expect(params.max).toBeGreaterThan(140)
    expect(triangularCdf(80, params.min, params.mode, params.max)).toBeCloseTo(0.1, 8)
    expect(triangularCdf(140, params.min, params.mode, params.max)).toBeCloseTo(0.9, 8)

    const fromRow = parseCostForSimulation(
      row({ optimistic: "-20", likely: "100", pessimistic: "40" }),
    )
    expect(fromRow).toEqual(params)
  })

  it("E-driver: driver percents calibrate as P10/mode/P90", () => {
    const params = parseDriverForSimulation(
      row({ optimistic: "-16", likely: "0", pessimistic: "16" }),
    )!
    const closed = 16 / (1 - Math.sqrt(0.2))
    expect(params.min).toBeCloseTo(-closed, 8)
    expect(params.max).toBeCloseTo(closed, 8)
    expect(triangularCdf(-16, params.min, params.mode, params.max)).toBeCloseTo(0.1, 8)
    expect(triangularCdf(16, params.min, params.mode, params.max)).toBeCloseTo(0.9, 8)
  })

  it("does not treat user P10/P90 as hard min/max", () => {
    const oldStyle = { min: 80, mode: 100, max: 140 }
    const calibrated = triangularParamsFromPercentiles(80, 100, 140)!
    expect(calibrated.min).not.toBe(oldStyle.min)
    expect(calibrated.max).not.toBe(oldStyle.max)
    expect(calibrated.min).toBeLessThan(80)
    expect(calibrated.max).toBeGreaterThan(140)
  })
})

describe("sampling uses calibrated marginals", () => {
  it("C/D: deterministic quantile grid recovers empirical P10/P90", () => {
    const params = triangularParamsFromPercentiles(80, 100, 140)!
    const n = 20_000
    const samples = Array.from({ length: n }, (_, i) =>
      triangularQuantile(params.min, params.mode, params.max, (i + 0.5) / n),
    )
    expect(percentile(samples, 10)).toBeCloseTo(80, 1)
    expect(percentile(samples, 90)).toBeCloseTo(140, 1)
  })

  it("G: Shapley path imports triangularQuantile on TriangularParams (shared marginal)", () => {
    const shapley = readFileSync(
      join(repoRoot, "src/lib/shapleyAttribution.ts"),
      "utf8",
    )
    expect(shapley).toContain("triangularQuantile(tri.min, tri.mode, tri.max")
    expect(shapley).toContain('from "@/simulation"')
    // Payload build must go through calibrated parsers
    const payload = readFileSync(
      join(repoRoot, "src/lib/buildSimulationProjectPayload.ts"),
      "utf8",
    )
    expect(payload).toMatch(/parseCostForSimulation|parseDriverForSimulation/)
  })

  it("J: conversion helpers no longer assign user P10/P90 as min/max", () => {
    const sim = readFileSync(join(repoRoot, "src/simulation.ts"), "utf8")
    const table = readFileSync(join(repoRoot, "src/lib/tableRows.ts"), "utf8")
    expect(sim).toContain("triangularParamsFromPercentiles")
    expect(sim).not.toContain("const min = Math.min(vOpt, vLike, vPes)")
    expect(table).toContain("triangularParamsFromPercentiles")
    expect(table).not.toContain("return { min: minPct, mode: like, max: maxPct }")
  })
})
