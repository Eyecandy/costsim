import { describe, expect, it } from "vitest"

import {
  formatWaterfallValueWithScale,
  resolveWaterfallDisplayScale,
} from "@/domain/results/formatWaterfallValue"

describe("P50 display diagnosis", () => {
  it("formats user-reported main P50 and infers Shapley display range", () => {
    const mainP50 = 202_773_993
    const scale = resolveWaterfallDisplayScale([200_000_000, mainP50, 1_000_000])

    const formattedMainNo = formatWaterfallValueWithScale(mainP50, scale, "no")
    const formattedMainEn = formatWaterfallValueWithScale(mainP50, scale, "en")

    // eslint-disable-next-line no-console
    console.log({
      mainP50,
      formattedMainNo,
      formattedMainEn,
      shapleyWouldShow202_7_ifValueInRange: "[202_650_000, 202_750_000)",
    })

    expect(formattedMainNo).toBe("202,8 M")
    expect(formattedMainEn).toBe("202.8 M")

    // Values that round to 202.7 M at one decimal
    expect(formatWaterfallValueWithScale(202_700_000, scale, "no")).toBe("202,7 M")
    expect(formatWaterfallValueWithScale(202_749_999, scale, "no")).toBe("202,7 M")
    expect(formatWaterfallValueWithScale(202_750_000, scale, "no")).toBe("202,8 M")
    expect(formatWaterfallValueWithScale(202_773_993, scale, "no")).toBe("202,8 M")
  })
})
