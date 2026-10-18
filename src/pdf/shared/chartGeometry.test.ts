import { describe, expect, it } from "vitest"

import { createChartGeometry, niceTickStep } from "@/pdf/shared/chartGeometry"

describe("niceTickStep", () => {
  it("rounds to 1, 2, 5 or 10 times a power of ten", () => {
    expect(niceTickStep(1.2)).toBe(1)
    expect(niceTickStep(2.4)).toBe(2)
    expect(niceTickStep(4)).toBe(5)
    expect(niceTickStep(8)).toBe(10)
    expect(niceTickStep(130)).toBe(100)
    expect(niceTickStep(0.03)).toBeCloseTo(0.02)
  })

  it("falls back to 1 for non-positive or non-finite input", () => {
    expect(niceTickStep(0)).toBe(1)
    expect(niceTickStep(-5)).toBe(1)
    expect(niceTickStep(Number.NaN)).toBe(1)
  })
})

describe("createChartGeometry", () => {
  const geometry = createChartGeometry({
    plotLeft: 50,
    plotBottom: 200,
    innerWidth: 400,
    innerHeight: 100,
  })

  it("maps the value range onto the plot width", () => {
    expect(geometry.xForValue(10, 10, 20)).toBe(50)
    expect(geometry.xForValue(20, 10, 20)).toBe(450)
    expect(geometry.xForValue(15, 10, 20)).toBe(250)
  })

  it("does not divide by zero when the range is empty", () => {
    expect(geometry.xForValue(5, 5, 5)).toBe(50)
  })

  it("maps probability 0 to the bottom and 1 to the top of the plot", () => {
    expect(geometry.yForProbability(0)).toBe(200)
    expect(geometry.yForProbability(1)).toBe(100)
  })

  it("builds an SVG path from points and an empty string for no points", () => {
    expect(geometry.pathFromPoints([], 0, 1)).toBe("")
    expect(
      geometry.pathFromPoints(
        [
          { x: 0, y: 0 },
          { x: 1, y: 1 },
        ],
        0,
        1,
      ),
    ).toBe("M 50.00 200.00 L 450.00 100.00")
  })
})
