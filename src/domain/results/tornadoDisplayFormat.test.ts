import { describe, expect, it } from "vitest"

import {
  collectTornadoDisplayValues,
  collectWaterfallDisplayValues,
  formatTornadoSignedDeltaWithScale,
  formatWaterfallSignedDeltaWithScale,
  formatWaterfallValueWithScale,
  resolveTornadoDisplayScale,
  resolveTornadoDisplayScales,
  resolveWaterfallDisplayScale,
} from "@/domain/results/formatWaterfallValue"
import { computeDeterministicTornadoRows } from "@/domain/simulation/deterministicTornado"

describe("tornado k-scale formatting", () => {
  const kScale = { kind: "thousands" as const, unitSuffix: "k" as const }

  it("A: 3,202.22 in a k-scale chart → 3.2 k", () => {
    expect(formatTornadoSignedDeltaWithScale(3_202.22, kScale, "en")).toBe("+3.2 k")
    expect(formatTornadoSignedDeltaWithScale(3_202.22, kScale, "no")).toBe("+3,2 k")
  })

  it("B: 850 in a k-scale chart → 0.9 k", () => {
    expect(formatTornadoSignedDeltaWithScale(850, kScale, "en")).toBe("+0.9 k")
  })

  it("C: 420 → 0.4 k", () => {
    expect(formatTornadoSignedDeltaWithScale(420, kScale, "en")).toBe("+0.4 k")
  })

  it("D: 75 → 0.1 k", () => {
    expect(formatTornadoSignedDeltaWithScale(75, kScale, "en")).toBe("+0.1 k")
  })

  it("E: small non-zero values do not become 0.0 k", () => {
    expect(formatTornadoSignedDeltaWithScale(40, kScale, "en")).toBe("+0.04 k")
    expect(formatTornadoSignedDeltaWithScale(20, kScale, "en")).toBe("+0.02 k")
    expect(formatTornadoSignedDeltaWithScale(40, kScale, "no")).toBe("+0,04 k")
    expect(formatTornadoSignedDeltaWithScale(40, kScale, "en")).not.toBe("+0.0 k")
    expect(formatTornadoSignedDeltaWithScale(40, kScale, "en")).not.toBe("+0 k")
  })

  it("F: whole values do not get unnecessary trailing decimals", () => {
    expect(formatTornadoSignedDeltaWithScale(620_000, kScale, "en")).toBe("+620 k")
    expect(formatTornadoSignedDeltaWithScale(75_000, kScale, "en")).toBe("+75 k")
    expect(formatTornadoSignedDeltaWithScale(75_000, kScale, "no")).toBe("+75 k")
  })

  it("G: NO/EN decimal separators work correctly", () => {
    expect(formatTornadoSignedDeltaWithScale(3_200, kScale, "no")).toBe("+3,2 k")
    expect(formatTornadoSignedDeltaWithScale(3_200, kScale, "en")).toBe("+3.2 k")
    expect(formatTornadoSignedDeltaWithScale(850, kScale, "no")).toBe("+0,9 k")
  })

  it("uses k consistently for all values in a small-project Tornado", () => {
    const values = collectTornadoDisplayValues([
      { lowImpact: -3_202.22, highImpact: 2_800 },
      { lowImpact: -850, highImpact: 420 },
      { lowImpact: -75, highImpact: 40 },
    ])
    const scale = resolveTornadoDisplayScale(values)
    expect(scale.kind).toBe("thousands")

    const labels = [3_202.22, 850, 420, 75, 40].map((value) =>
      formatTornadoSignedDeltaWithScale(value, scale, "en"),
    )
    expect(labels.every((label) => label.endsWith(" k"))).toBe(true)
    expect(labels[0]).toBe("+3.2 k")
    expect(labels[1]).toBe("+0.9 k")
    expect(labels[2]).toBe("+0.4 k")
    expect(labels[3]).toBe("+0.1 k")
    expect(labels[4]).toBe("+0.04 k")
  })
})

describe("tornado adaptive value formatting", () => {
  it("H: existing million-scale Tornado formatting remains correct", () => {
    const values = collectTornadoDisplayValues([
      { lowImpact: -12_400_000, highImpact: 8_200_000 },
      { lowImpact: -620_000, highImpact: 1_260_000 },
    ])
    const scale = resolveTornadoDisplayScale(values)

    expect(scale.kind).toBe("millions")
    expect(formatTornadoSignedDeltaWithScale(12_400_000, scale, "en")).toBe("+12.4 M")
    expect(formatTornadoSignedDeltaWithScale(620_000, scale, "en")).toBe("+0.6 M")
    expect(formatTornadoSignedDeltaWithScale(3_000_000, scale, "en")).toBe("+3 M")
    expect(formatTornadoSignedDeltaWithScale(12_400_000, scale, "no")).toBe("+12,4 M")
  })

  it("shares one unit across comparable projects, but keeps per-chart units when magnitudes diverge", () => {
    const similar = resolveTornadoDisplayScales([
      [
        { lowImpact: -1_200_000, highImpact: 900_000 },
        { lowImpact: -400_000, highImpact: 250_000 },
      ],
      [
        { lowImpact: -800_000, highImpact: 700_000 },
        { lowImpact: -150_000, highImpact: 100_000 },
      ],
    ])
    expect(similar[0]?.kind).toBe("millions")
    expect(similar[1]?.kind).toBe("millions")
    expect(similar[0]).toEqual(similar[1])
    expect(formatTornadoSignedDeltaWithScale(800_000, similar[1]!, "en")).toBe("+0.8 M")

    const divergent = resolveTornadoDisplayScales([
      [
        { lowImpact: -12_000_000, highImpact: 8_000_000 },
        { lowImpact: -2_000_000, highImpact: 1_500_000 },
      ],
      [
        { lowImpact: -700, highImpact: 500 },
        { lowImpact: -200, highImpact: 150 },
      ],
    ])
    expect(divergent[0]?.kind).toBe("millions")
    expect(divergent[1]?.kind).toBe("thousands")
    expect(formatTornadoSignedDeltaWithScale(700, divergent[1]!, "en")).toBe("+0.7 k")
  })

  it("I: Tornado calculations remain unchanged by display formatting", () => {
    const project = {
      id: "p1",
      name: "P",
      incurredCosts: 0,
      costRows: [
        {
          id: "c1",
          name: "Cost A",
          optimistic: "-10",
          likely: "100000",
          pessimistic: "20",
        },
      ],
      driverRows: [
        {
          id: "d1",
          name: "Driver 1",
          optimistic: "-5",
          likely: "0",
          pessimistic: "10",
        },
      ],
    }
    const rowsA = computeDeterministicTornadoRows(project, 6)
    const rowsB = computeDeterministicTornadoRows(project, 6)
    expect(rowsA).toEqual(rowsB)
    expect(rowsA[0]?.spread).toBeGreaterThan(0)
  })
})

describe("existing waterfall formatting remains unchanged", () => {
  it("keeps previous waterfall chart-level formatting", () => {
    const scale = resolveWaterfallDisplayScale([
      202_000_000, 202_834_534, 620_000, 1_260_000, 12_440_000,
    ])
    expect(scale.kind).toBe("millions")
    expect(formatWaterfallValueWithScale(620_000, scale, "en")).toBe("0.6 M")
    expect(formatWaterfallSignedDeltaWithScale(620_000, scale, "en")).toBe("+0.6 M")

    const values = collectWaterfallDisplayValues({
      startValue: 420_000,
      endValue: 437_500,
      contributions: [12_500, -5000, 10_000],
    })
    const thousandScale = resolveWaterfallDisplayScale(values)
    expect(thousandScale.kind).toBe("thousands")
    expect(formatWaterfallValueWithScale(420_000, thousandScale, "en")).toBe("420.0 k")
  })
})
