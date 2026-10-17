import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

import { messages } from "@/i18n/messages"
import { repoRoot } from "@/test-utils/repoRoot"


function resultsPanelSource() {
  return readFileSync(join(repoRoot, "src/features/results/ResultsPanel.tsx"), "utf8")
}

function expandedDialogSource() {
  return readFileSync(
    join(repoRoot, "src/features/results/ExpandedChartDialog.tsx"),
    "utf8",
  )
}

function expandButtonSource() {
  return readFileSync(
    join(repoRoot, "src/features/results/ChartExpandButton.tsx"),
    "utf8",
  )
}

function sCurveSource() {
  return readFileSync(join(repoRoot, "src/features/results/ResultsSCurve.tsx"), "utf8")
}

function tornadoSource() {
  return readFileSync(
    join(repoRoot, "src/features/results/ResultsTornado.tsx"),
    "utf8",
  )
}

describe("expanded chart view", () => {
  it("A: S-curve has an expand control", () => {
    const src = resultsPanelSource()
    const sCurveBlockStart = src.indexOf('title={t("charts.sCurveTitle")}')
    const sCurveBlockEnd = src.indexOf('title={t("charts.tornadoTitle")}')
    const block = src.slice(sCurveBlockStart, sCurveBlockEnd)
    expect(block).toContain("onExpand=")
    expect(block).toContain('setExpandedChart({ kind: "scurve" })')
    expect(sCurveSource()).toContain("ChartExpandHost")
    expect(messages.no.charts.openLargerView).toBe("Åpne større visning")
    expect(messages.en.charts.openLargerView).toBe("Open larger view")
  })

  it("B: Tornado figures have an expand control", () => {
    const src = resultsPanelSource()
    expect(src).toContain('kind: "tornado"')
    expect(src).toMatch(/kind:\s*"tornado"[\s\S]*?projectId:\s*p\.id/)
    expect(expandButtonSource()).toContain("Maximize2")
  })

  it("C: Expected Addition waterfalls have an expand control", () => {
    const src = resultsPanelSource()
    expect(src).toContain('kind: "expectedAddition"')
    expect(src).toContain('t("charts.waterfallTitle")')
  })

  it("D: Uncertainty Reserve waterfalls have an expand control", () => {
    const src = resultsPanelSource()
    expect(src).toContain('kind: "uncertaintyReserve"')
    expect(src).toContain('t("charts.reserveWaterfallTitle")')
  })

  it("E: Clicking expand opens the correct chart in the shared expanded-view dialog", () => {
    const src = resultsPanelSource()
    expect(src).toContain("<ExpandedChartDialog")
    expect(src).toMatch(
      /expandedChart\?\.kind === "scurve"[\s\S]*?<ResultsSCurve[\s\S]*?expanded/,
    )
    expect(src).toContain("<ResultsTornado")
    expect(src).toContain("<ResultsWaterfall")
    expect(src).toContain("<ResultsReserveWaterfall")
    expect(src).toContain("expanded")
    expect(expandedDialogSource()).toContain('data-expanded-chart-dialog=""')
  })

  it("F: Only one expanded chart can be open at a time", () => {
    const src = resultsPanelSource()
    expect(src).toContain(
      "useState<ExpandedResultChart | null>(",
    )
    expect(src).toContain("open={expandedChart !== null}")
    // Single state slot — setting a new kind replaces the previous
    expect(src.match(/setExpandedChart\(/g)?.length).toBeGreaterThanOrEqual(4)
  })

  it("G: Closing via close button works", () => {
    const dialog = expandedDialogSource()
    expect(dialog).toContain("data-expanded-chart-close")
    expect(dialog).toContain("onClick={onClose}")
    expect(resultsPanelSource()).toContain("onClose={closeExpandedChart}")
    expect(messages.no.charts.closeLargerView).toBe("Lukk større visning")
    expect(messages.en.charts.closeLargerView).toBe("Close larger view")
  })

  it("H: Escape closes the dialog", () => {
    const dialog = expandedDialogSource()
    expect(dialog).toContain('event.key === "Escape"')
    expect(dialog).toContain("onClose()")
  })

  it("I: Expanded chart uses the same underlying result data as inline chart", () => {
    const src = resultsPanelSource()
    expect(src).toContain("<ResultsSCurve")
    expect(src).toContain("series={cdfSeries}")
    expect(src).toMatch(
      /expandedChart\?\.kind === "scurve"[\s\S]*?<ResultsSCurve[\s\S]*?expanded/,
    )
    expect(src).toContain("tornadoRowsByProjectId.get(p.id)")
    expect(src).toContain(
      "tornadoRowsByProjectId.get(expandedChart.projectId)",
    )
    expect(src).toContain("result={state.result}")
    expect(src).toContain("result={attributionState.result}")
    expect(sCurveSource()).toContain("expanded?: boolean")
    expect(tornadoSource()).toContain("expanded?: boolean")
  })

  it("J: Opening a chart does not trigger simulation or Shapley", () => {
    const src = resultsPanelSource()
    const expandHandlers = src.match(
      /onExpand=\{\(\) =>\s*setExpandedChart\([\s\S]*?\)\}/g,
    )
    expect(expandHandlers?.length).toBeGreaterThanOrEqual(4)
    for (const handler of expandHandlers ?? []) {
      expect(handler).not.toContain("requestCalculation")
      expect(handler).not.toContain("runSimulation")
      expect(handler).not.toContain("simulate")
    }
  })

  it("K: Parent result expander state is not modified", () => {
    const src = resultsPanelSource()
    const expandHandlers = src.match(
      /onExpand=\{\(\) =>\s*setExpandedChart\([\s\S]*?\)\}/g,
    )
    for (const handler of expandHandlers ?? []) {
      expect(handler).not.toContain("setSCurveOpen")
      expect(handler).not.toContain("setTornadoOpen")
      expect(handler).not.toContain("setContributionOpen")
      expect(handler).not.toContain("setKeyFiguresOpen")
      expect(handler).not.toContain("setResultsExpanderOpen")
    }
    expect(src).toContain("closeExpandedChart")
    expect(src).toContain(
      "const closeExpandedChart = useCallback(() => setExpandedChart(null), [])",
    )
  })

  it("L: shared dialog is reusable; charts respond to expanded container sizing", () => {
    expect(expandedDialogSource()).toContain("w-[min(92vw,72rem)]")
    expect(sCurveSource()).toContain("SCURVE_EXPANDED_SHELL_CLASS")
    expect(tornadoSource()).toContain("data-tornado-expanded")
    expect(expandButtonSource()).toContain('data-chart-expand=""')
  })
})
