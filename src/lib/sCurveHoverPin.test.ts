import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

import {
  activeSCurveInspectionCost,
  plotXFromCost,
  togglePinnedCost,
} from "@/lib/sCurveHover"
import { repoRoot } from "@/test-utils/repoRoot"


function sCurveSource() {
  return readFileSync(join(repoRoot, "src/components/ResultsSCurve.tsx"), "utf8")
}

function resultsPanelSource() {
  return readFileSync(join(repoRoot, "src/components/ResultsPanel.tsx"), "utf8")
}

describe("expanded S-curve hover pin", () => {
  it("A: first click while hovering pins the current cost", () => {
    expect(togglePinnedCost(null, 225_000_000)).toBe(225_000_000)
    expect(sCurveSource()).toContain("togglePinnedCost")
    expect(sCurveSource()).toContain("handlePlotPointerDown")
    expect(sCurveSource()).toContain("setPinnedCost(nextPin)")
  })

  it("B: pinned state preserves crosshair, tooltip and project markers", () => {
    const src = sCurveSource()
    expect(src).toContain("activeSCurveInspectionCost(pinnedCost, hoverCost)")
    expect(src).toContain('data-scurve-crosshair=""')
    expect(src).toContain('data-scurve-hover-tooltip=""')
    expect(src).toContain("data-scurve-hover-marker")
    expect(src).toContain('data-scurve-pinned={isPinned ? "true" : undefined}')
    expect(
      activeSCurveInspectionCost(225_000_000, 100_000_000),
    ).toBe(225_000_000)
  })

  it("C: pointer movement while pinned does not change the pinned cost", () => {
    const src = sCurveSource()
    expect(src).toContain("if (!expanded || pinnedCost !== null) return")
    expect(togglePinnedCost(null, 50)).toBe(50)
    expect(activeSCurveInspectionCost(50, 999)).toBe(50)
  })

  it("D: pointer leaving the plot while pinned does not hide the frozen state", () => {
    const src = sCurveSource()
    expect(src).toContain("if (pinnedCost !== null) return")
    expect(src).toContain("const clearHover = useCallback")
    expect(activeSCurveInspectionCost(42, null)).toBe(42)
  })

  it("E: clicking inside the plot while pinned UNPINS rather than moving the pin", () => {
    expect(togglePinnedCost(225_000_000, 300_000_000)).toBe(null)
    expect(togglePinnedCost(100, 200)).toBe(null)
    const src = sCurveSource()
    expect(src).toContain("if (pinnedCost !== null)")
    expect(src).toContain("setPinnedCost(null)")
    expect(src).toContain("setHoverCost(costAtPointer)")
  })

  it("F: after unpinning, normal hover resumes", () => {
    expect(activeSCurveInspectionCost(null, 180)).toBe(180)
    const src = sCurveSource()
    expect(src).toContain("onPointerMove={updateHoverFromPointer}")
    expect(src).toContain("setHoverCost(costAtPointer)")
  })

  it("G: clicking outside the plot unpins", () => {
    const src = sCurveSource()
    expect(src).toContain("onPointerDownOutside")
    expect(src).toContain('document.addEventListener("pointerdown"')
    expect(src).toContain("hoverCaptureRef")
  })

  it("H: closing the modal clears pinned state", () => {
    const panel = resultsPanelSource()
    expect(panel).toContain('expandedChart?.kind === "scurve"')
    expect(panel).toMatch(
      /expandedChart\?\.kind === "scurve"[\s\S]*?<ResultsSCurve[\s\S]*?expanded/,
    )
    expect(panel).toContain("closeExpandedChart")
    // Conditional mount: unmount on close resets React state
    expect(panel).toMatch(
      /expandedChart\?\.kind === "scurve"\s*\?\s*\([\s\S]*?<ResultsSCurve[\s\S]*?expanded[\s\S]*?\)\s*:\s*null/,
    )
  })

  it("I: reopening the modal starts unpinned", () => {
    const src = sCurveSource()
    expect(src).toContain("useState<number | null>(null)")
    expect(src).toMatch(
      /const \[pinnedCost, setPinnedCost\] = useState<number \| null>\(null\)/,
    )
  })

  it("J: stored pin state is based on cost-domain value rather than raw pointer pixels", () => {
    const src = sCurveSource()
    expect(src).toContain("setPinnedCost(nextPin)")
    expect(src).toContain("plotXFromCost(inspectionCost, axisMinX, axisMaxX, chartW)")
    expect(src).not.toContain("setPinnedCost(event.clientX")
    expect(src).not.toContain("pinnedPlotX")
    const plotX = plotXFromCost(150, 100, 200)
    expect(typeof plotX).toBe("number")
    expect(togglePinnedCost(null, 150)).toBe(150)
  })

  it("K: pinning does not trigger simulation or Shapley calculation", () => {
    const src = sCurveSource()
    expect(src).not.toContain("requestCalculation")
    expect(src).not.toContain("runSimulation")
    expect(src).not.toContain("useLazyShapley")
    expect(src).toContain("togglePinnedCost")
  })

  it("L: inline S-curve remains unchanged", () => {
    const src = sCurveSource()
    const panel = resultsPanelSource()
    expect(src).toContain("if (!expanded) return")
    expect(src).toContain("if (!expanded) return []")
    expect(panel).toContain("<ResultsSCurve")
    expect(panel).toContain("series={cdfSeries}")
    expect(panel).toContain(
      'onExpand={() => setExpandedChart({ kind: "scurve" })}',
    )
    expect(panel).not.toMatch(
      /<ResultsSCurve[\s\S]*expanded[\s\S]*onExpand[\s\S]*series=\{cdfSeries\} expanded \/>/,
    )
  })

  it("Escape while pinned unpins before closing the modal", () => {
    const src = sCurveSource()
    expect(src).toContain('event.key !== "Escape"')
    expect(src).toContain("stopImmediatePropagation")
    expect(src).toContain('window.addEventListener("keydown", onKeyDown, true)')
  })
})
