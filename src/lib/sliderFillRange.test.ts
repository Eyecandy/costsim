import { describe, expect, it } from "vitest"

import { sliderFillRangePct } from "@/lib/sliderFillRange"

describe("sliderFillRangePct", () => {
  it("fills impact from 0 up to the selected percent", () => {
    expect(sliderFillRangePct(0, 0, 100, 0)).toEqual({ startPct: 0, endPct: 0 })
    expect(sliderFillRangePct(60, 0, 100, 0)).toEqual({ startPct: 0, endPct: 60 })
    expect(sliderFillRangePct(100, 0, 100, 0)).toEqual({ startPct: 0, endPct: 100 })
  })

  it("fills correlation from zero toward the selected signed value", () => {
    expect(sliderFillRangePct(0, -0.9, 0.9, 0)).toEqual({
      startPct: 50,
      endPct: 50,
    })
    expect(sliderFillRangePct(0.6, -0.9, 0.9, 0)).toEqual({
      startPct: 50,
      endPct: ((0.6 - -0.9) / 1.8) * 100,
    })
    expect(sliderFillRangePct(-0.6, -0.9, 0.9, 0)).toEqual({
      startPct: ((-0.6 - -0.9) / 1.8) * 100,
      endPct: 50,
    })
    expect(sliderFillRangePct(0.9, -0.9, 0.9, 0)).toEqual({
      startPct: 50,
      endPct: 100,
    })
    expect(sliderFillRangePct(-0.9, -0.9, 0.9, 0)).toEqual({
      startPct: 0,
      endPct: 50,
    })
  })

  it("does not treat correlation zero as a half-filled left-to-right bar", () => {
    const fill = sliderFillRangePct(0, -0.9, 0.9, 0)
    expect(fill.endPct - fill.startPct).toBe(0)
    expect(fill.startPct).toBe(50)
  })
})
