import { describe, expect, it } from "vitest"

import { computeTornadoSharedSymmetricMaxAbs } from "@/components/ResultsTornado"
import {
  TORNADO_BALANCED_GRID_TEMPLATE_COLUMNS,
  TORNADO_CENTER_X,
  TORNADO_EXPANDED_INNER_MAX_CLASS,
  TORNADO_EXPANDED_ROW_PX,
  TORNADO_INLINE_GRID_TEMPLATE_COLUMNS,
  TORNADO_ROW_PX,
  tornadoBarLength,
  tornadoBarRect,
  tornadoModeMetrics,
  tornadoPlotRegionStyle,
  tornadoPreserveAspectRatio,
  tornadoValueToX,
} from "@/lib/tornadoLayout"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = join(__dirname, "../..")

function tornadoSource() {
  return readFileSync(
    join(repoRoot, "src/components/ResultsTornado.tsx"),
    "utf8",
  )
}

describe("expanded Tornado balanced layout", () => {
  it("A: expanded shell is capped; plot does not use a dominating fixed width", () => {
    const expanded = tornadoModeMetrics(true)
    expect(expanded.plotWidthPx).toBeNull()
    expect(TORNADO_EXPANDED_INNER_MAX_CLASS).toContain("max-w-[min(100%,56rem)]")
    expect(tornadoSource()).toContain("TORNADO_EXPANDED_INNER_MAX_CLASS")
    expect(tornadoSource()).not.toContain("data-tornado-plot-width")
  })

  it("B: name and plot use equal flexible tracks with a small gap", () => {
    const expanded = tornadoModeMetrics(true)
    const inline = tornadoModeMetrics(false)
    expect(expanded.gridTemplateColumns).toBe(
      TORNADO_BALANCED_GRID_TEMPLATE_COLUMNS,
    )
    expect(inline.gridTemplateColumns).toBe(
      TORNADO_INLINE_GRID_TEMPLATE_COLUMNS,
    )
    expect(expanded.gridTemplateColumns).toBe(
      "minmax(0, 1fr) minmax(0, 1fr)",
    )
    const src = tornadoSource()
    expect(src).toContain("TORNADO_COLUMN_GAP_CLASS")
    expect(src).toContain("gap-x-3")
    expect(src).toContain('data-tornado-balanced-columns="true"')
    expect(src).not.toContain("w-fit")
  })

  it("C: expanded enlarges the whole figure (row/bar/label), not only bar length", () => {
    const inline = tornadoModeMetrics(false)
    const expanded = tornadoModeMetrics(true)
    expect(inline.rowPx).toBe(TORNADO_ROW_PX)
    expect(expanded.rowPx).toBe(TORNADO_EXPANDED_ROW_PX)
    expect(expanded.rowPx).toBeGreaterThan(inline.rowPx)
    expect(expanded.barH).toBeGreaterThan(inline.barH)
    expect(expanded.labelFontSize).toBeGreaterThan(inline.labelFontSize)
    expect(tornadoSource()).toContain('data-tornado-name-col=""')
    expect(tornadoSource()).toContain("text-[13px]")
  })

  it("D: 50/50 relationship stays stable as shell width changes (equal fr tracks)", () => {
    const expanded = tornadoModeMetrics(true)
    expect(expanded.gridTemplateColumns).toBe(
      "minmax(0, 1fr) minmax(0, 1fr)",
    )
    expect(expanded.fillShellWidth).toBe(true)
  })

  it("E: value labels stay in the plot SVG (no separate flexible value column)", () => {
    const src = tornadoSource()
    expect(src).toContain("formatTornadoImpactLabel")
    expect(src).toContain("gridTemplateColumns: metrics.gridTemplateColumns")
    expect(src).not.toContain("minmax(5.5rem")
  })

  it("F: zero remains centered; equal magnitudes keep equal lengths", () => {
    expect(TORNADO_CENTER_X).toBe(50)
    const halfSpan = 40
    expect(tornadoValueToX(0, 10, halfSpan)).toBe(TORNADO_CENTER_X)
    expect(tornadoBarLength(-5, 10, halfSpan)).toBe(
      tornadoBarLength(5, 10, halfSpan),
    )
    const neg = tornadoBarRect(-5, 10, halfSpan)
    const pos = tornadoBarRect(5, 10, halfSpan)
    expect(neg?.w).toBe(pos?.w)
  })

  it("G: multi-project common scale helper remains unchanged", () => {
    const shared = computeTornadoSharedSymmetricMaxAbs([
      [
        {
          name: "A",
          type: "cost",
          sourceSeriesIndex: 0,
          lowImpact: -8,
          highImpact: 12,
          spread: 20,
        },
      ],
      [
        {
          name: "B",
          type: "driver",
          sourceSeriesIndex: 1,
          lowImpact: -20,
          highImpact: 4,
          spread: 24,
        },
      ],
    ])
    expect(shared).toBe(20)
    expect(tornadoPreserveAspectRatio(false)).toBe("none")
    expect(tornadoPlotRegionStyle(true).width).toBe("100%")
  })
})
