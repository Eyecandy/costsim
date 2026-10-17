import { describe, expect, it } from "vitest"

import {
  collectWaterfallDisplayValues,
  formatWaterfallSignedDeltaWithScale,
  formatWaterfallValueWithScale,
  resolveWaterfallDisplayScale,
} from "@/lib/formatWaterfallValue"

describe("waterfall chart-level formatting", () => {
  it("uses one millions unit for all rows in a large project waterfall", () => {
    const scale = resolveWaterfallDisplayScale([
      202_000_000,
      202_834_534,
      620_000,
      1_260_000,
      12_440_000,
    ])

    expect(scale.kind).toBe("millions")
    expect(formatWaterfallValueWithScale(620_000, scale, "en")).toBe("0.6 M")
    expect(formatWaterfallValueWithScale(1_260_000, scale, "en")).toBe("1.3 M")
    expect(formatWaterfallValueWithScale(12_440_000, scale, "en")).toBe("12.4 M")
    expect(formatWaterfallValueWithScale(202_834_534, scale, "en")).toBe(
      "202.8 M",
    )
    expect(formatWaterfallSignedDeltaWithScale(620_000, scale, "en")).toBe(
      "+0.6 M",
    )
  })

  it("adds extra precision for small non-zero million-scale contributions", () => {
    const scale = resolveWaterfallDisplayScale([200_000_000, 200_040_000, 40_000])

    expect(formatWaterfallSignedDeltaWithScale(40_000, scale, "en")).toBe(
      "+0.04 M",
    )
    expect(formatWaterfallSignedDeltaWithScale(40_000, scale, "no")).toBe(
      "+0,04 M",
    )
  })

  it("uses a smaller common unit for genuinely small projects", () => {
    const values = collectWaterfallDisplayValues({
      startValue: 420_000,
      endValue: 437_500,
      contributions: [12_500, -5000, 10_000],
    })
    const scale = resolveWaterfallDisplayScale(values)

    expect(scale.kind).toBe("thousands")
    expect(formatWaterfallValueWithScale(420_000, scale, "en")).toBe("420.0 k")
    expect(formatWaterfallSignedDeltaWithScale(12_500, scale, "en")).toBe(
      "+12.5 k",
    )
  })
})
