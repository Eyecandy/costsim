import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { join } from "node:path"

import {
  buildWaterfallChartLayout,
  valueToX,
} from "@/domain/results/waterfallLayout"
import { groupWaterfallContributors } from "@/domain/results/waterfallContributors"
import { repoRoot as root } from "@/test-utils/repoRoot"


function attributionSource() {
  return readFileSync(
    join(root, "src/features/results/AttributionWaterfall.tsx"),
    "utf8",
  )
}

describe("Contribution waterfall expanded bracket alignment", () => {
  it("A: reference bracket and bars share one plot grid (same column tracks)", () => {
    const src = attributionSource()
    expect(src).toContain("WATERFALL_PLOT_GRID_COMPACT")
    expect(src).toContain("WATERFALL_PLOT_GRID_EXPANDED")
    expect(src).toContain('data-waterfall-plot-grid=""')
    expect(src).toContain('data-waterfall-reference-bracket=""')
    // Single shared grid — not separate reference vs bars grids with divergent columns.
    expect(src).not.toContain('data-waterfall-plot-grid="reference"')
    expect(src).not.toContain('data-waterfall-plot-grid="bars"')
    // Expanded label widening applies via the shared expanded token only.
    expect(src).toContain(
      'expanded ? WATERFALL_PLOT_GRID_EXPANDED : WATERFALL_PLOT_GRID_COMPACT',
    )
    expect(src).toContain(
      "minmax(0,1fr)_minmax(0,1.35fr)_minmax(5.5rem,auto)",
    )
    expect(src).toContain(
      "minmax(0,1.15fr)_minmax(0,1.35fr)_minmax(5.5rem,auto)",
    )
    // No leftover divergent inline bar-only expanded grid.
    expect(src).not.toMatch(
      /contributionRows[\s\S]{0,400}\[grid-template-columns:minmax\(0,1\.15fr\)/,
    )
  })

  it("B: bracket endpoints and bar endpoints use the same plotLeft/plotWidth mapping", () => {
    const displayRows = groupWaterfallContributors(
      [
        { type: "cost", id: "a", name: "A", contribution: 1_200_000 },
        { type: "cost", id: "b", name: "B", contribution: 800_000 },
        { type: "driver", id: "c", name: "C", contribution: 600_000 },
      ],
      { maxIndividual: 6, otherLabel: "Other" },
    )
    const layout = buildWaterfallChartLayout(200_000_000, 202_600_000, displayRows)
    const PLOT_LEFT = 2
    const PLOT_WIDTH = 96

    const bracketStart = valueToX(
      layout.startValue,
      layout.domainMin,
      layout.domainMax,
      PLOT_LEFT,
      PLOT_WIDTH,
    )
    const bracketEnd = valueToX(
      layout.endValue,
      layout.domainMin,
      layout.domainMax,
      PLOT_LEFT,
      PLOT_WIDTH,
    )
    const firstBarBefore = valueToX(
      layout.contributionRows[0]!.cumulativeBefore,
      layout.domainMin,
      layout.domainMax,
      PLOT_LEFT,
      PLOT_WIDTH,
    )
    const lastBarAfter = valueToX(
      layout.contributionRows.at(-1)!.cumulativeAfter,
      layout.domainMin,
      layout.domainMax,
      PLOT_LEFT,
      PLOT_WIDTH,
    )

    expect(firstBarBefore).toBeCloseTo(bracketStart, 9)
    expect(lastBarAfter).toBeCloseTo(bracketEnd, 9)
  })

  it("C: scaling plot width moves bracket and bars consistently", () => {
    const displayRows = groupWaterfallContributors(
      [{ type: "cost", id: "a", name: "A", contribution: 2 }],
      { maxIndividual: 6, otherLabel: "Other" },
    )
    const layout = buildWaterfallChartLayout(100, 102, displayRows)

    const narrow = {
      start: valueToX(layout.startValue, layout.domainMin, layout.domainMax, 2, 48),
      end: valueToX(layout.endValue, layout.domainMin, layout.domainMax, 2, 48),
      bar: valueToX(
        layout.contributionRows[0]!.cumulativeAfter,
        layout.domainMin,
        layout.domainMax,
        2,
        48,
      ),
    }
    const wide = {
      start: valueToX(layout.startValue, layout.domainMin, layout.domainMax, 2, 96),
      end: valueToX(layout.endValue, layout.domainMin, layout.domainMax, 2, 96),
      bar: valueToX(
        layout.contributionRows[0]!.cumulativeAfter,
        layout.domainMin,
        layout.domainMax,
        2,
        96,
      ),
    }

    // Doubling plot width doubles distances from plotLeft.
    expect(wide.start - 2).toBeCloseTo((narrow.start - 2) * 2, 9)
    expect(wide.end - 2).toBeCloseTo((narrow.end - 2) * 2, 9)
    expect(wide.bar - 2).toBeCloseTo((narrow.bar - 2) * 2, 9)
    expect(wide.bar).toBeCloseTo(wide.end, 9)
  })

  it("D: expanded waterfall still reuses AttributionWaterfall (no separate expanded geometry)", () => {
    const panel = readFileSync(join(root, "src/features/results/ResultsPanel.tsx"), "utf8")
    expect(panel).toMatch(
      /expandedChart\?\.kind === "expectedAddition"[\s\S]*?expanded/,
    )
    expect(panel).toMatch(
      /expandedChart\?\.kind === "uncertaintyReserve"[\s\S]*?expanded/,
    )
    const src = attributionSource()
    expect(src).toContain("expanded?: boolean")
    expect(src).toContain("PLOT_LEFT")
    expect(src).toContain("PLOT_WIDTH")
  })
})
