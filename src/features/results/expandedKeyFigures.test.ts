import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

import { messages } from "@/i18n/messages"
import { formatKeyFigurePercent, formatKeyFigureStat } from "@/domain/results/keyFiguresDisplay"
import { repoRoot } from "@/test-utils/repoRoot"
import { readResultsPanelSource } from "@/test-utils/resultsPanelSource"

function resultsPanelSource() {
  return readResultsPanelSource()
}

function keyFiguresTableSource() {
  return readFileSync(join(repoRoot, "src/features/results/ResultsKeyFiguresTable.tsx"), "utf8")
}

describe("expanded Key Figures table", () => {
  it("A: Key Figures has an expand control", () => {
    const src = resultsPanelSource()
    const blockStart = src.indexOf('title={t("results.keyMetricsTitle")}')
    const blockEnd = src.indexOf('title={t("charts.sCurveTitle")}')
    const block = src.slice(blockStart, blockEnd)
    expect(block).toContain("onExpand=")
    expect(block).toContain('setExpandedChart({ kind: "keyFigures" })')
    expect(messages.no.charts.openLargerView).toBe("Åpne større visning")
    expect(messages.en.charts.openLargerView).toBe("Open larger view")
  })

  it("B: Clicking expand opens Key Figures in the shared expanded dialog", () => {
    const src = resultsPanelSource()
    expect(src).toContain('kind: "keyFigures"')
    expect(src).toContain("<ExpandedChartDialog")
    expect(src).toContain('expandedChart?.kind === "keyFigures"')
    expect(src).toContain('t("results.keyMetricsTitle")')
    expect(messages.no.results.keyMetricsTitle).toBe("NØKKELTALL")
    expect(messages.en.results.keyMetricsTitle).toBe("KEY FIGURES")
  })

  it("C: Expanded view uses the same values as the inline table", () => {
    const src = resultsPanelSource()
    expect(src).toContain("<ResultsKeyFiguresTable")
    expect(src).toContain("valuesByProjectId={resultsByProjectId}")
    expect(src).toContain("baseCostByProjectId={baseCostByProjectId}")
    expect(src).toContain("simulatedIncurredByProjectId={simulatedIncurredByProjectId}")
    expect(src).toContain("preferences={resultPreferences}")
    expect(src).toContain("projects={displayProjects}")
    expect(src).toContain("<ResultsKeyFiguresTable\n            projects={displayProjects}")
    expect(keyFiguresTableSource()).toContain("expanded = false")
    expect(keyFiguresTableSource()).toContain("computeUncertainDeltaWithPct")
    expect(formatKeyFigureStat(1000, "en")).toBe(formatKeyFigureStat(1000, "en"))
    expect(formatKeyFigurePercent(12.4, "en")).toBe("12.4 %")
    expect(formatKeyFigurePercent(13.3, "no")).toBe("13,3 %")
    expect(formatKeyFigurePercent(13.3, "en")).toBe("13.3 %")
  })

  it("Standard Deviation secondary line uses Expected Value relative % via same cell pattern", () => {
    const table = keyFiguresTableSource()
    expect(table).toContain("relativeStandardDeviationPercent")
    expect(table).toContain("formatKeyFigurePercent(relativePct, language)")
    expect(table).toContain("formatKeyFigurePercent(delta.percent, language)")
    expect(table).toMatch(/id: "stdDev"[\s\S]*?renderMetricValue/)
    expect(table).toMatch(/id: "expectedAddition"[\s\S]*?renderMetricValue/)
  })

  it("D: Multi-project headers render correctly", () => {
    const table = keyFiguresTableSource()
    expect(table).toContain("renderProjectHeaderLabel")
    expect(table).toContain("projectColumns.map")
    expect(table).toContain("projects.length === 1")
    expect(table).toContain("line-clamp-3")
  })

  it("A: expanded project headers use the same horizontal alignment as their values", () => {
    const table = keyFiguresTableSource()
    const metricValue = readFileSync(
      join(repoRoot, "src/features/results/KeyFigureMetricValue.tsx"),
      "utf8",
    )
    expect(table).toContain("KEY_FIGURES_METRIC_GRID_EXPANDED")
    expect(table).toContain("data-key-figures-project-header")
    expect(table).toContain("table-value text-right tabular-nums")
    expect(table).toContain("justify-self-end")
    expect(metricValue).toContain("grid-cols-[minmax(0,1fr)_8ch] gap-3")
    // Header reuses the absolute|percent grid so names track absolute values
    expect(table).toMatch(/KEY_FIGURES_METRIC_GRID_EXPANDED[\s\S]*data-key-figures-project-header/)
  })

  it("B: header/value alignment applies to every project column", () => {
    const table = keyFiguresTableSource()
    const metricValue = readFileSync(
      join(repoRoot, "src/features/results/KeyFigureMetricValue.tsx"),
      "utf8",
    )
    expect(table).toContain("projectColumns.map")
    expect(table).toContain('renderProjectHeaderLabel(p?.name ?? "", expanded)')
    expect(metricValue).toContain("grid-cols-[minmax(0,1fr)_8ch] gap-3")
    expect(table).not.toMatch(/projectColumns\.map[\s\S]{0,200}idx === 0[\s\S]{0,80}text-right/)
  })

  it("C: left-hand row-label column remains left-aligned", () => {
    const table = keyFiguresTableSource()
    expect(table).toContain('"truncate text-left"')
    expect(table).toMatch(/TableHead[\s\S]*?"truncate text-left"[\s\S]*?stickyFirstColHeadClass/)
    expect(table).toContain('"text-left break-words [overflow-wrap:anywhere]"')
  })

  it("D-inline: inline Key Figures project headers remain centered", () => {
    const table = keyFiguresTableSource()
    expect(table).toContain("text-center font-medium")
    expect(table).toContain("max-h-[2.75em] line-clamp-2")
    expect(table).toContain("if (!expanded)")
    expect(table).toContain("KEY_FIGURES_METRIC_GRID_INLINE")
    expect(table).toContain("KeyFigureMetricValue")
  })

  it("expanded header reserves the percent slot so it does not align to % text", () => {
    const table = keyFiguresTableSource()
    const headerFn = table.slice(
      table.indexOf("function renderProjectHeaderLabel"),
      table.indexOf("function ResultsKeyFiguresTable") !== -1
        ? table.indexOf("export function ResultsKeyFiguresTable")
        : table.length,
    )
    expect(headerFn).toContain("KEY_FIGURES_METRIC_GRID_EXPANDED")
    expect(headerFn).toContain("invisible")
    expect(headerFn).toContain("(0,0 %)")
    expect(headerFn).toContain("justify-self-end")
  })

  it("E: Opening/closing does not change simulation state", () => {
    const src = resultsPanelSource()
    const handlers = src.match(
      /onExpand=\{\(\) =>\s*setExpandedChart\(\{\s*kind:\s*"keyFigures"\s*\}\)\}/g,
    )
    expect(handlers?.length).toBe(2)
    expect(src).toContain(
      "const closeExpandedChart = useCallback(() => setExpandedChart(null), [])",
    )
    expect(src).not.toMatch(/kind:\s*"keyFigures"[\s\S]{0,120}requestCalculation|runSimulation/)
  })

  it("F: Parent Key Figures expander state is unchanged", () => {
    const src = resultsPanelSource()
    expect(src).toContain('onExpand={() => setExpandedChart({ kind: "keyFigures" })}')
    expect(src).not.toMatch(
      /setExpandedChart\(\{\s*kind:\s*"keyFigures"\s*\}\)[\s\S]{0,40}setKeyFiguresOpen/,
    )
    expect(src).toContain("open={keyFiguresOpen}")
    expect(src).toContain("onOpenChange={setKeyFiguresOpen}")
  })

  it("G: shared table component is reused for inline and expanded", () => {
    const src = resultsPanelSource()
    const uses = src.match(/<ResultsKeyFiguresTable/g)
    expect(uses?.length).toBe(3)
    expect(src).toContain("expanded\n          />")
    expect(keyFiguresTableSource()).toContain("data-key-figures-expanded")
  })

  it("Key Figures table does not include Risk Profile", () => {
    const table = keyFiguresTableSource()
    expect(table).not.toContain("riskProfile")
    expect(table).not.toContain("Risikoprofil")
    expect(table).toContain("keyMetrics.baseCost")
    expect(table).toContain("keyMetrics.expectedAddition")
    expect(table).toContain("keyMetrics.uncertaintyPremium")
    expect(table).toContain("formatPercentileLabel")
    expect(table).toContain("preferences")
  })
})
