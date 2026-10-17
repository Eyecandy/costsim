import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"

import { computeSCurveDisplaySeries } from "@/lib/sCurveDisplay"
import {
  clientPointToViewBox,
  costFromPlotX,
  cumulativeProbabilityAtCost,
  formatSCurveCost,
  formatSCurveHoverCost,
  hoverRowsAtCost,
  isInsideSCurvePlot,
  plotXFromCost,
  resolveSCurveCostDisplayScale,
  resolveSCurveHoverCostScale,
  scurveTooltipPlacement,
  sortFiniteValues,
  wholePercentileLabel,
} from "@/lib/sCurveHover"

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = join(__dirname, "../..")

function sCurveSource() {
  return readFileSync(join(repoRoot, "src/components/ResultsSCurve.tsx"), "utf8")
}

function hoverSource() {
  return readFileSync(join(repoRoot, "src/lib/sCurveHover.ts"), "utf8")
}

function resultsPanelSource() {
  return readFileSync(join(repoRoot, "src/components/ResultsPanel.tsx"), "utf8")
}

describe("expanded S-curve hover", () => {
  it("A: hover interaction exists only in expanded S-curve", () => {
    const src = sCurveSource()
    expect(src).toContain('data-scurve-hover-capture=""')
    expect(src).toContain("{expanded ? (")
    expect(src).toContain("if (!expanded) return")
    expect(src).toContain("if (!expanded) return []")
    expect(resultsPanelSource()).toContain("<ResultsSCurve")
    expect(resultsPanelSource()).toContain("series={cdfSeries}")
    expect(resultsPanelSource()).toContain("onExpand={() => setExpandedChart({ kind: \"scurve\" })}")
    expect(resultsPanelSource()).toMatch(
      /expandedChart\?\.kind === "scurve"[\s\S]*?<ResultsSCurve[\s\S]*?expanded/,
    )
    expect(src).not.toContain("onMouseMove")
    expect(src).toContain("onPointerMove={updateHoverFromPointer}")
    expect(src).toContain("onPointerLeave={clearHover}")
  })

  it("B: hover x-position maps correctly to a cost value", () => {
    const axisMin = 100
    const axisMax = 200
    const midX = plotXFromCost(150, axisMin, axisMax)
    expect(costFromPlotX(midX, axisMin, axisMax)).toBeCloseTo(150, 8)
    expect(costFromPlotX(plotXFromCost(100, axisMin, axisMax), axisMin, axisMax)).toBeCloseTo(
      100,
      8,
    )
    const svg = { left: 40, top: 10, width: 400, height: 300 }
    const point = clientPointToViewBox(40 + 200, 10 + 150, svg)
    expect(point).toEqual({ x: 100, y: 75 })
  })

  it("C: all visible projects are evaluated at the same cost", () => {
    const rows = hoverRowsAtCost(
      [
        { id: "a", label: "Prosjekt A", sortedValues: [10, 20, 30, 40] },
        { id: "b", label: "Prosjekt B", sortedValues: [15, 25, 35, 45] },
      ],
      30,
    )
    expect(rows).toHaveLength(2)
    expect(rows[0]!.probability).toBe(cumulativeProbabilityAtCost([10, 20, 30, 40], 30))
    expect(rows[1]!.probability).toBe(cumulativeProbabilityAtCost([15, 25, 35, 45], 30))
  })

  it("D: probability lookup uses sorted simulation data, not the display series", () => {
    const src = hoverSource()
    expect(src).toContain("while (lo < hi)")
    expect(src).toContain(">>> 1")
    expect(src).not.toContain("computeSCurveDisplaySeries")
    expect(sCurveSource()).toContain("sortFiniteValues(c.values)")
    expect(sCurveSource()).toContain("hoverRowsAtCost(hoverProjects, inspectionCost)")

    const full = Array.from({ length: 20_000 }, (_, i) => i + 1)
    const shuffled = full.slice().reverse()
    const sorted = sortFiniteValues(shuffled)
    expect(sorted[0]).toBe(1)
    expect(sorted[sorted.length - 1]).toBe(20_000)
    const pFull = cumulativeProbabilityAtCost(sorted, 10_000)
    expect(pFull).toBe(10_000 / 20_000)
    const display = computeSCurveDisplaySeries(full)
    expect(display.length).toBeLessThan(sorted.length / 10)
  })

  it("E: known synthetic distributions return expected percentile values", () => {
    const uniform = Array.from({ length: 100 }, (_, i) => i + 1)
    expect(wholePercentileLabel(cumulativeProbabilityAtCost(uniform, 72))).toBe(
      "P72",
    )
    expect(wholePercentileLabel(cumulativeProbabilityAtCost(uniform, 61))).toBe(
      "P61",
    )
  })

  it("F: below-range cost returns approximately P0", () => {
    const values = [10, 20, 30]
    expect(cumulativeProbabilityAtCost(values, 0)).toBe(0)
    expect(wholePercentileLabel(0)).toBe("P0")
  })

  it("G: above-range cost returns approximately P100", () => {
    const values = [10, 20, 30]
    expect(cumulativeProbabilityAtCost(values, 100)).toBe(1)
    expect(wholePercentileLabel(1)).toBe("P100")
    expect(wholePercentileLabel(1.2)).toBe("P100")
  })

  it("H: crosshair disappears when pointer leaves plot", () => {
    const src = sCurveSource()
    expect(src).toContain("onPointerLeave={clearHover}")
    expect(src).toContain("if (pinnedCost !== null) return")
    expect(src).toContain("setHoverCost(null)")
    expect(src).toContain("inspectionCost !== null")
    expect(src).toContain('data-scurve-crosshair=""')
    expect(isInsideSCurvePlot(10, 17.2)).toBe(true)
    expect(isInsideSCurvePlot(9, 40)).toBe(false)
  })

  it("I: project markers disappear when pointer leaves plot", () => {
    const src = sCurveSource()
    expect(src).toContain("data-scurve-hover-marker")
    expect(src).toContain("onPointerCancel={clearHover}")
    expect(src).toContain("costFromClientPoint")
  })

  it("J: tooltip preserves project ordering", () => {
    const rows = hoverRowsAtCost(
      [
        { id: "z", label: "Last in id, first in chart", sortedValues: [1, 2] },
        { id: "a", label: "Second", sortedValues: [1, 2] },
        { id: "m", label: "Third", sortedValues: [1, 2] },
      ],
      1,
    )
    expect(rows.map((r) => r.id)).toEqual(["z", "a", "m"])
    expect(rows.map((r) => r.label)).toEqual([
      "Last in id, first in chart",
      "Second",
      "Third",
    ])
  })

  it("K: NO/EN formatting remains correct", () => {
    const scaleM = resolveSCurveCostDisplayScale(10_000_000, 400_000_000)
    expect(scaleM.unitSuffix).toBe("M")
    expect(formatSCurveCost(225_000_000, scaleM, "no")).toBe("225,0 M")
    expect(formatSCurveCost(225_000_000, scaleM, "en")).toBe("225.0 M")
    expect(formatSCurveCost(3_400_000, scaleM, "no")).toBe("3,4 M")
    const scaleK = resolveSCurveCostDisplayScale(10_000, 900_000)
    expect(scaleK.unitSuffix).toBe("k")
    expect(formatSCurveCost(850_000, scaleK, "en")).toBe("850.0 k")
    expect(formatSCurveCost(850_000, scaleK, "no")).toBe("850,0 k")
    // Deprecated aliases remain wired
    expect(resolveSCurveHoverCostScale(10_000, 900_000)).toEqual(scaleK)
    expect(formatSCurveHoverCost(850_000, scaleK, "en")).toBe("850.0 k")
  })

  it("uses one shared scale for ticks, P50/P85 labels, and hover", () => {
    const abs = resolveSCurveCostDisplayScale(1_000, 8_000)
    expect(abs.kind).toBe("absolute")
    const absEn = formatSCurveCost(4_350, abs, "en")
    const absNo = formatSCurveCost(4_350, abs, "no")
    expect(absEn).not.toMatch(/[kM]/)
    expect(absNo).not.toMatch(/[kM]/)
    expect(absEn).toContain("4")
    expect(absEn).toContain("350")
    expect(absNo).toContain(",")

    const thousands = resolveSCurveCostDisplayScale(10_000, 200_000)
    expect(thousands.kind).toBe("thousands")
    const tick = formatSCurveCost(120_000, thousands, "en")
    const p50 = formatSCurveCost(140_700, thousands, "en")
    const p85 = formatSCurveCost(180_000, thousands, "en")
    const selected = formatSCurveCost(160_000, thousands, "en")
    expect(tick).toBe("120.0 k")
    expect(p50).toBe("140.7 k")
    expect(p85).toBe("180.0 k")
    expect(selected).toBe("160.0 k")
    expect(tick.endsWith(" k")).toBe(true)
    expect(p50.endsWith(" k")).toBe(true)
    expect(formatSCurveCost(120_000, thousands, "no")).toBe("120,0 k")

    const millions = resolveSCurveCostDisplayScale(5_000_000, 40_000_000)
    expect(millions.kind).toBe("millions")
    expect(formatSCurveCost(12_000_000, millions, "en")).toBe("12.0 M")
    expect(formatSCurveCost(14_700_000, millions, "en")).toBe("14.7 M")
    expect(formatSCurveCost(14_700_000, millions, "no")).toBe("14,7 M")
    // Billion-scale stays in millions (no bn unit)
    const bnAsM = formatSCurveCost(1_200_000_000, millions, "en")
    expect(bnAsM.endsWith(" M")).toBe(true)
    expect(bnAsM).toMatch(/1.?200/)
    expect(bnAsM).not.toMatch(/bn|B\b|mrd/i)

    // Multi-project: one scale from shared domain, not per project value
    const shared = resolveSCurveCostDisplayScale(50_000, 900_000)
    expect(shared.kind).toBe("thousands")
    expect(formatSCurveCost(80_000, shared, "en").endsWith(" k")).toBe(true)
    expect(formatSCurveCost(850_000, shared, "en").endsWith(" k")).toBe(true)
  })

  it("S-curve x-axis uses shared scale formatter; formatMillionsCompact is gone", () => {
    const src = sCurveSource()
    expect(src).toContain("resolveSCurveCostDisplayScale")
    expect(src).toContain("formatSCurveCost")
    expect(src).toContain("costDisplayScale")
    expect(src).toContain(
      "formatSCurveCost(tick, costDisplayScale, language)",
    )
    expect(src).not.toContain("formatMillionsCompact")
    expect(src).not.toContain("value / 1_000_000")
    expect(hoverSource()).toContain("resolveSCurveCostDisplayScale")
    expect(hoverSource()).toContain("formatSCurveCost")
  })

  it("L: hover does not trigger simulation or Shapley recalculation", () => {
    expect(hoverSource()).not.toContain("simulation")
    expect(hoverSource()).not.toContain("shapley")
    expect(sCurveSource()).not.toContain("requestCalculation")
    expect(sCurveSource()).not.toContain("runSimulation")
    expect(sCurveSource()).not.toContain("useLazyShapley")
    expect(sCurveSource()).toContain("updateHoverFromPointer")
    expect(scurveTooltipPlacement(plotXFromCost(190, 0, 200))).toBe("left")
    expect(scurveTooltipPlacement(plotXFromCost(40, 0, 200))).toBe("right")
  })
})
