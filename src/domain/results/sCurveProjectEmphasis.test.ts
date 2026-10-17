import { describe, expect, it } from "vitest"

import {
  isSCurveProjectEmphasized,
  SCURVE_PROJECT_DIM_OPACITY,
  SCURVE_PROJECT_FULL_OPACITY,
  sCurveProjectLayerOpacity,
  toggleSelectedProjectId,
} from "@/domain/results/sCurveProjectEmphasis"

const ids = ["A", "B", "C", "D"] as const

function opacityMap(selected: readonly string[], hovered: string | null): Record<string, number> {
  return Object.fromEntries(ids.map((id) => [id, sCurveProjectLayerOpacity(id, selected, hovered)]))
}

describe("sCurveProjectEmphasis", () => {
  it("hover-only: emphasizes hovered project, restores all on leave", () => {
    expect(opacityMap([], null)).toEqual({
      A: 1,
      B: 1,
      C: 1,
      D: 1,
    })
    expect(opacityMap([], "A")).toEqual({
      A: 1,
      B: SCURVE_PROJECT_DIM_OPACITY,
      C: SCURVE_PROJECT_DIM_OPACITY,
      D: SCURVE_PROJECT_DIM_OPACITY,
    })
  })

  it("single click-select + hover temporarily adds hovered", () => {
    expect(opacityMap(["A"], null)).toEqual({
      A: 1,
      B: SCURVE_PROJECT_DIM_OPACITY,
      C: SCURVE_PROJECT_DIM_OPACITY,
      D: SCURVE_PROJECT_DIM_OPACITY,
    })
    expect(opacityMap(["A"], "B")).toEqual({
      A: 1,
      B: 1,
      C: SCURVE_PROJECT_DIM_OPACITY,
      D: SCURVE_PROJECT_DIM_OPACITY,
    })
  })

  it("multi-select A+C, hover B, leave restores A+C", () => {
    expect(opacityMap(["A", "C"], null)).toEqual({
      A: 1,
      B: SCURVE_PROJECT_DIM_OPACITY,
      C: 1,
      D: SCURVE_PROJECT_DIM_OPACITY,
    })
    expect(opacityMap(["A", "C"], "B")).toEqual({
      A: 1,
      B: 1,
      C: 1,
      D: SCURVE_PROJECT_DIM_OPACITY,
    })
  })

  it("hovering an already-selected project keeps selection emphasis", () => {
    expect(isSCurveProjectEmphasized("A", ["A", "C"], "A")).toBe(true)
    expect(isSCurveProjectEmphasized("C", ["A", "C"], "A")).toBe(true)
    expect(isSCurveProjectEmphasized("B", ["A", "C"], "A")).toBe(false)
  })

  it("toggle adds and removes; empty returns to hover-only", () => {
    let selected = toggleSelectedProjectId([], "A")
    expect(selected).toEqual(["A"])
    selected = toggleSelectedProjectId(selected, "C")
    expect(selected).toEqual(["A", "C"])
    selected = toggleSelectedProjectId(selected, "A")
    expect(selected).toEqual(["C"])
    selected = toggleSelectedProjectId(selected, "C")
    expect(selected).toEqual([])
    expect(sCurveProjectLayerOpacity("B", selected, null)).toBe(SCURVE_PROJECT_FULL_OPACITY)
  })
})
