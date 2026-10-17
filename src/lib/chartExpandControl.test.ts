import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

import {
  CHART_EXPAND_OFFSET_CLASS,
  CHART_EXPAND_RESERVE_TOP_CLASS,
} from "@/components/ChartExpandButton"
import { repoRoot } from "@/test-utils/repoRoot"


function readSrc(rel: string) {
  return readFileSync(join(repoRoot, rel), "utf8")
}

describe("integrated chart expand control", () => {
  it("A: all expandable visualizations still have an expand control", () => {
    const panel = readSrc("src/components/ResultsPanel.tsx")
    expect(panel).toContain('onExpand={() => setExpandedChart({ kind: "keyFigures" })}')
    expect(panel).toContain('onExpand={() => setExpandedChart({ kind: "scurve" })}')
    expect(panel).toContain('kind: "tornado"')
    expect(panel).toContain('kind: "expectedAddition"')
    expect(panel).toContain('kind: "uncertaintyReserve"')
    expect((panel.match(/onExpand=\{/g) ?? []).length).toBeGreaterThanOrEqual(5)
  })

  it("B: S-curve, Tornado, both waterfall types and Key Figures use the new integrated positioning", () => {
    const host = readSrc("src/components/ChartExpandButton.tsx")
    expect(host).toContain("export function ChartExpandHost")
    expect(host).toContain(CHART_EXPAND_OFFSET_CLASS)
    expect(readSrc("src/components/ResultsSCurve.tsx")).toContain("ChartExpandHost")
    expect(readSrc("src/components/ResultsTornado.tsx")).toContain("ChartExpandHost")
    expect(readSrc("src/components/AttributionWaterfall.tsx")).toContain(
      "ChartExpandHost",
    )
    expect(readSrc("src/components/AttributionWaterfall.tsx")).toContain(
      "reserveTop={showExpand}",
    )
    expect(readSrc("src/components/AttributionWaterfall.tsx")).not.toContain(
      "referenceLegendStart",
    )
    expect(readSrc("src/components/AttributionWaterfall.tsx")).not.toContain(
      "axisBreakMessage",
    )
    expect(readSrc("src/components/ResultsKeyFiguresTable.tsx")).toContain(
      "ChartExpandHost",
    )
    expect(readSrc("src/components/ResultsWaterfall.tsx")).toContain("expandLabel")
    expect(readSrc("src/components/ResultsReserveWaterfall.tsx")).toContain(
      "expandLabel",
    )
  })

  it("C: the control remains present at rest", () => {
    const css = readSrc("src/index.css")
    expect(css).toContain(".chart-expand-control")
    expect(css).toContain("opacity: 0.4")
    expect(readSrc("src/components/ChartExpandButton.tsx")).toContain(
      "data-chart-expand=\"\"",
    )
    expect(readSrc("src/components/ChartExpandButton.tsx")).not.toContain(
      "opacity-0",
    )
  })

  it("D: parent visualization hover changes the control to its emphasized state", () => {
    const css = readSrc("src/index.css")
    expect(css).toContain(".group\\/chart-expand:hover .chart-expand-control")
    expect(css).toContain("opacity: 0.9")
    expect(readSrc("src/components/ChartExpandButton.tsx")).toContain(
      "group/chart-expand",
    )
  })

  it("E: keyboard focus makes the control clearly visible", () => {
    const css = readSrc("src/index.css")
    expect(css).toContain(".chart-expand-control:focus-visible")
    expect(css).toContain("opacity: 1")
    expect(readSrc("src/components/ui/button.tsx")).toContain(
      "focus-visible:ring-ring/50",
    )
  })

  it("F: the control remains usable without hover capability", () => {
    const css = readSrc("src/index.css")
    expect(css).toContain("@media (hover: none)")
    expect(css).toMatch(/@media \(hover: none\) \{[\s\S]*opacity: 0\.9/)
  })

  it("G: clicking the control still opens the correct expanded content", () => {
    const panel = readSrc("src/components/ResultsPanel.tsx")
    expect(panel).toContain("<ResultsSCurve")
    expect(panel).toContain('setExpandedChart({ kind: "scurve" })')
    expect(panel).toContain('kind: "keyFigures"')
    expect(panel).toContain('kind: "tornado"')
    expect(panel).toContain('kind: "expectedAddition"')
    expect(panel).toContain('kind: "uncertaintyReserve"')
    expect(panel).toContain("<ExpandedChartDialog")
  })

  it("H: chart click/hover interaction is not blocked by the control wrapper", () => {
    const host = readSrc("src/components/ChartExpandButton.tsx")
    expect(host).toContain("pointer-events-none absolute")
    expect(host).toContain("pointer-events-auto")
    expect(host).toContain("data-chart-expand-slot")
  })

  it("I: S-curve crosshair/hover still works outside the button itself", () => {
    const scurve = readSrc("src/components/ResultsSCurve.tsx")
    expect(scurve).toContain('data-scurve-hover-capture=""')
    expect(scurve).toContain("onPointerMove={updateHoverFromPointer}")
    expect(scurve).toContain("ChartExpandHost")
    expect(scurve).not.toContain("data-scurve-hover-capture=\"\" onClick")
  })

  it("uses shared offset, reserved table space, and opacity-only motion", () => {
    expect(CHART_EXPAND_OFFSET_CLASS).toBe("top-0 right-1.5")
    expect(CHART_EXPAND_OFFSET_CLASS).toContain("right-1.5")
    expect(CHART_EXPAND_OFFSET_CLASS).not.toContain("top-1.5")
    expect(readSrc("src/components/ChartExpandButton.tsx")).toContain(
      "group/chart-expand relative",
    )
    expect(CHART_EXPAND_RESERVE_TOP_CLASS).toBe("pt-7")
    expect(readSrc("src/components/ResultsKeyFiguresTable.tsx")).toContain(
      "reserveTop={showExpand}",
    )
    expect(readSrc("src/components/ChartExpandButton.tsx")).toContain(
      "toolbarLeading",
    )
    const css = readSrc("src/index.css")
    expect(css).toContain("transition: opacity 200ms ease-out")
    expect(css).toMatch(
      /@media \(prefers-reduced-motion: reduce\) \{\s*\.chart-expand-control \{\s*transition: none/,
    )
    expect(css).not.toMatch(/\.chart-expand-control \{[^}]*transform/)
  })
})
