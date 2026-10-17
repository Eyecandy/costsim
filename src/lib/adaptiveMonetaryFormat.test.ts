import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { join } from "node:path"

import {
  formatAdaptiveMonetarySignedDelta,
  formatAdaptiveMonetaryValue,
  formatTornadoSignedDeltaWithScale,
  resolveAdaptiveMonetaryScale,
} from "@/lib/formatWaterfallValue"
import { repoRoot } from "@/test-utils/repoRoot"


describe("Contribution Analysis adaptive monetary formatting", () => {
  it("picks unit by magnitude", () => {
    expect(resolveAdaptiveMonetaryScale(5_000).kind).toBe("thousands")
    expect(resolveAdaptiveMonetaryScale(500_000).kind).toBe("thousands")
    expect(resolveAdaptiveMonetaryScale(5_000_000).kind).toBe("millions")
    expect(resolveAdaptiveMonetaryScale(500_000_000).kind).toBe("millions")
    expect(resolveAdaptiveMonetaryScale(999).kind).toBe("absolute")
    expect(resolveAdaptiveMonetaryScale(0).kind).toBe("absolute")
  })

  it("uses M=1 decimal and k=0 decimals with normal rounding", () => {
    expect(formatAdaptiveMonetaryValue(1_900_000, "no")).toBe("1,9 M")
    expect(formatAdaptiveMonetaryValue(1_900_000, "en")).toBe("1.9 M")
    expect(formatAdaptiveMonetaryValue(1_400_000, "no")).toBe("1,4 M")
    expect(formatAdaptiveMonetaryValue(1_400_000, "en")).toBe("1.4 M")

    expect(formatAdaptiveMonetaryValue(837_400, "en")).toBe("837 k")
    expect(formatAdaptiveMonetaryValue(837_400, "no")).toBe("837 k")
    expect(formatAdaptiveMonetaryValue(759_900, "en")).toBe("760 k")
    expect(formatAdaptiveMonetaryValue(731_200, "en")).toBe("731 k")
    expect(formatAdaptiveMonetaryValue(295_800, "en")).toBe("296 k")

    expect(formatAdaptiveMonetaryValue(5_000, "en")).toBe("5 k")
    expect(formatAdaptiveMonetaryValue(5_000_000, "en")).toBe("5 M")
    expect(formatAdaptiveMonetaryValue(500_000_000, "en")).toBe("500 M")
    expect(formatAdaptiveMonetaryValue(0, "en")).toBe("0")
    expect(formatAdaptiveMonetaryValue(500, "en")).toBe("500")

    expect(formatAdaptiveMonetaryValue(5_000, "en")).not.toBe("0.005 M")
    expect(formatAdaptiveMonetaryValue(837_400, "en")).not.toBe("837.4 k")
    expect(formatAdaptiveMonetaryValue(837_400, "no")).not.toBe("837,4 k")
  })

  it("preserves signs and locales for contribution deltas", () => {
    expect(formatAdaptiveMonetarySignedDelta(1_900_000, "no")).toBe("+1,9 M")
    expect(formatAdaptiveMonetarySignedDelta(1_900_000, "en")).toBe("+1.9 M")
    expect(formatAdaptiveMonetarySignedDelta(-1_400_000, "no")).toBe("-1,4 M")
    expect(formatAdaptiveMonetarySignedDelta(-1_400_000, "en")).toBe("-1.4 M")
    expect(formatAdaptiveMonetarySignedDelta(837_400, "en")).toBe("+837 k")
    expect(formatAdaptiveMonetarySignedDelta(-759_900, "en")).toBe("-760 k")
    expect(formatAdaptiveMonetarySignedDelta(731_200, "en")).toBe("+731 k")
    expect(formatAdaptiveMonetarySignedDelta(-295_800, "en")).toBe("-296 k")
    expect(formatAdaptiveMonetarySignedDelta(837_400, "no")).toBe("+837 k")
    expect(formatAdaptiveMonetarySignedDelta(0, "en")).toBe("0")
  })

  it("handles unit boundaries around 999k / 1M", () => {
    expect(formatAdaptiveMonetarySignedDelta(999_000, "en")).toBe("+999 k")
    expect(formatAdaptiveMonetarySignedDelta(-999_000, "en")).toBe("-999 k")
    expect(formatAdaptiveMonetarySignedDelta(1_000_000, "en")).toBe("+1 M")
    expect(formatAdaptiveMonetarySignedDelta(-1_000_000, "en")).toBe("-1 M")
    expect(formatAdaptiveMonetarySignedDelta(999_400, "en")).toBe("+999 k")
    // 999.5k rounds to 1000k while still below the millions unit threshold
    expect(formatAdaptiveMonetarySignedDelta(999_500, "en")).toBe("+1,000 k")
    expect(formatAdaptiveMonetarySignedDelta(999_500, "no")).toBe("+1 000 k")
  })

  it("does not change Tornado k precision (still allows one decimal)", () => {
    const kScale = { kind: "thousands" as const, unitSuffix: "k" as const }
    expect(formatTornadoSignedDeltaWithScale(3_200, kScale, "en")).toBe(
      "+3.2 k",
    )
    expect(formatTornadoSignedDeltaWithScale(837_400, kScale, "en")).toBe(
      "+837.4 k",
    )
  })

  it("AttributionWaterfall uses adaptive helpers for all labels", () => {
    const src = readFileSync(
      join(repoRoot, "src/components/AttributionWaterfall.tsx"),
      "utf8",
    )
    expect(src).toContain("formatAdaptiveMonetaryValue")
    expect(src).toContain("formatAdaptiveMonetarySignedDelta")
    expect(src).not.toContain("resolveWaterfallDisplayScale")
    expect(src).not.toContain("formatWaterfallValueWithScale")
    expect(src).not.toContain("formatWaterfallSignedDeltaWithScale")
  })
})
