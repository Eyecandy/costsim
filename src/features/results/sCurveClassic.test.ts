import { describe, expect, it } from "vitest"

import {
  buildClassicGuides,
  classicXLabelY,
  classicYLabelX,
  CLASSIC_VIEWBOX_PAD_BOTTOM,
  CLASSIC_VIEWBOX_PAD_LEFT,
  CLASSIC_X_CUSTOM_LANE_BASE,
  formatSCurveYAxisPercentileTick,
  layoutClassicXAxisLabels,
  layoutClassicYAxisLabels,
  shouldHideOrdinaryXTickLabel,
  shouldHideOrdinaryYTickLabel,
} from "@/domain/results/sCurveClassicGuides"
import { plotYFromProbability } from "@/domain/results/sCurveHover"
import {
  DEFAULT_RESULT_PREFERENCES,
  normalizeResultPreferences,
} from "@/domain/results/resultPreferences"
import { messages } from "@/i18n/messages"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { repoRoot } from "@/test-utils/repoRoot"

function readSrc(rel: string) {
  return readFileSync(join(repoRoot, rel), "utf8")
}

describe("legacy S-curve displayMode preference", () => {
  it("ignores and strips legacy displayMode on normalize", () => {
    const minimal = normalizeResultPreferences({
      ...DEFAULT_RESULT_PREFERENCES,
      sCurve: {
        ...DEFAULT_RESULT_PREFERENCES.sCurve,
        displayMode: "minimal",
      },
    })
    expect("displayMode" in minimal.sCurve).toBe(false)
    expect(minimal).toEqual(DEFAULT_RESULT_PREFERENCES)

    const garbage = normalizeResultPreferences({
      sCurve: { displayMode: 42, percentiles: [50, 85] },
    })
    expect("displayMode" in garbage.sCurve).toBe(false)
  })

  it("does not include displayMode in defaults", () => {
    expect("displayMode" in DEFAULT_RESULT_PREFERENCES.sCurve).toBe(false)
  })
})

describe("classic S-curve guides", () => {
  const series = [
    {
      id: "a",
      values: [100, 200, 300, 400, 500],
      colorVar: "--scurve-line-1" as const,
      index: 0,
    },
    {
      id: "b",
      values: [150, 250, 350, 450, 550],
      colorVar: "--scurve-line-2" as const,
      index: 1,
    },
  ]

  it("builds L-guide coordinates for arbitrary percentiles", () => {
    const guides = buildClassicGuides({
      series,
      markerPercentiles: [15, 50, 85],
      axisMinX: 50,
      axisMaxX: 600,
    })
    expect(guides).toHaveLength(6)
    const a50 = guides.find((g) => g.projectId === "a" && g.percentile === 50)
    expect(a50).toBeDefined()
    expect(a50!.cost).toBe(300)
    expect(a50!.y).toBeCloseTo(plotYFromProbability(0.5), 6)
    expect(a50!.x).toBeGreaterThan(0)
  })

  it("supports multiple projects with distinct costs at the same percentile", () => {
    const guides = buildClassicGuides({
      series,
      markerPercentiles: [50],
      axisMinX: 50,
      axisMaxX: 600,
    })
    const a = guides.find((g) => g.projectId === "a")!
    const b = guides.find((g) => g.projectId === "b")!
    expect(a.cost).not.toBe(b.cost)
    expect(a.x).not.toBe(b.x)
    expect(a.y).toBeCloseTo(b.y, 6)
    expect(a.colorVar).toBe("--scurve-line-1")
    expect(b.colorVar).toBe("--scurve-line-2")
  })

  it("uses one Y-axis label per percentile and separates close labels via outer lanes", () => {
    const labels = layoutClassicYAxisLabels([84, 85])
    expect(labels).toHaveLength(2)
    const p84 = labels.find((l) => l.percentile === 84)!
    const p85 = labels.find((l) => l.percentile === 85)!
    expect(p84.y).toBeCloseTo(plotYFromProbability(0.84), 6)
    expect(p85.y).toBeCloseTo(plotYFromProbability(0.85), 6)
    // Prefer outer lane over moving along the data axis.
    expect(p84.lane !== p85.lane || Math.abs(p84.labelY - p85.labelY) >= 4.2).toBe(true)
    // Lane 0 aligns with ordinary tick text; lane 1 is further outward.
    expect(classicYLabelX(10, 0)).toBe(10 - 1.5)
    expect(classicYLabelX(10, 1)).toBeLessThan(classicYLabelX(10, 0))
    expect(labels.every((l) => l.text.startsWith("P"))).toBe(true)
  })

  it("staggers close X-axis cost labels into outer rows below tick lane", () => {
    const guides = buildClassicGuides({
      series,
      markerPercentiles: [50, 51],
      axisMinX: 50,
      axisMaxX: 600,
    })
    const labels = layoutClassicXAxisLabels(guides)
    expect(labels.some((l) => l.row > 0)).toBe(true)
    expect(classicXLabelY(144, 0)).toBe(144 + CLASSIC_X_CUSTOM_LANE_BASE)
    expect(classicXLabelY(144, 1)).toBeGreaterThan(classicXLabelY(144, 0))
  })

  it("stress: 2 projects × P15/P50/P85 yields 3 Y labels and 6 X labels", () => {
    const guides = buildClassicGuides({
      series,
      markerPercentiles: [15, 50, 85],
      axisMinX: 50,
      axisMaxX: 600,
    })
    expect(guides).toHaveLength(6)
    const yLabels = layoutClassicYAxisLabels([15, 50, 85])
    expect(yLabels).toHaveLength(3)
    const xLabels = layoutClassicXAxisLabels(guides)
    expect(xLabels).toHaveLength(6)
  })

  it("hides ordinary Y tick text when it overlaps or duplicates a custom P label", () => {
    const custom = layoutClassicYAxisLabels([50, 85])
    expect(
      shouldHideOrdinaryYTickLabel({
        tickY: plotYFromProbability(0.5),
        tickText: "P50",
        padX: 10,
        customLabels: custom,
        tickPercentile: 50,
      }),
    ).toBe(true)
    expect(
      shouldHideOrdinaryYTickLabel({
        tickY: plotYFromProbability(0),
        tickText: "P0",
        padX: 10,
        customLabels: custom,
        tickPercentile: 0,
      }),
    ).toBe(false)
    // Semantic duplicate: same Pxx even if boxes would not collide
    expect(
      shouldHideOrdinaryYTickLabel({
        tickY: plotYFromProbability(0.85),
        tickText: "P85",
        padX: 10,
        customLabels: custom,
        tickPercentile: 85,
      }),
    ).toBe(true)
  })

  it("formats ordinary Y-axis ticks as shared P-notation (no %)", () => {
    expect(formatSCurveYAxisPercentileTick(0)).toBe("P0")
    expect(formatSCurveYAxisPercentileTick(0.25)).toBe("P25")
    expect(formatSCurveYAxisPercentileTick(0.5)).toBe("P50")
    expect(formatSCurveYAxisPercentileTick(0.75)).toBe("P75")
    expect(formatSCurveYAxisPercentileTick(1)).toBe("P100")
    for (const p of [0, 0.25, 0.5, 0.75, 1] as const) {
      expect(formatSCurveYAxisPercentileTick(p)).not.toContain("%")
      expect(formatSCurveYAxisPercentileTick(p).startsWith("P")).toBe(true)
    }
  })

  it("keeps P50/P85 annotations on the same P-notation as axis ticks", () => {
    const yLabels = layoutClassicYAxisLabels([50, 85, 90])
    expect(yLabels.map((l) => l.text).sort()).toEqual(["P50", "P85", "P90"])
    expect(yLabels.every((l) => /^P\d+$/.test(l.text))).toBe(true)
    expect(yLabels.every((l) => !l.text.includes("%"))).toBe(true)
  })

  it("S-curve renders Y ticks via shared P-notation helper", () => {
    const scurve = readSrc("src/features/results/ResultsSCurve.tsx")
    expect(scurve).toContain("formatSCurveYAxisPercentileTick")
    expect(scurve).toContain("tickPercentile")
    expect(scurve).not.toContain("${Math.round(tick * 100)}%")
    expect(scurve).toContain("data-scurve-y-tick-p={tickPercentile}")
  })

  it("hides ordinary X tick text when it overlaps a custom cost label", () => {
    const guides = buildClassicGuides({
      series,
      markerPercentiles: [50],
      axisMinX: 50,
      axisMaxX: 600,
    })
    const labels = layoutClassicXAxisLabels(guides).map((label) => ({
      text: "300",
      x: label.x,
      y: classicXLabelY(144, label.row),
      fontSize: 3.35,
    }))
    const hitX = labels[0]!.x
    expect(
      shouldHideOrdinaryXTickLabel({
        tickX: hitX,
        tickY: 144 + 1.8,
        tickText: "300",
        customLabels: labels,
      }),
    ).toBe(true)
    expect(
      shouldHideOrdinaryXTickLabel({
        tickX: hitX + 40,
        tickY: 144 + 1.8,
        tickText: "500",
        customLabels: labels,
      }),
    ).toBe(false)
  })
})

describe("S-curve Classic-only wiring", () => {
  it("has no display-mode or horizontal-zoom controls and does not re-simulate", () => {
    const scurve = readSrc("src/features/results/ResultsSCurve.tsx")
    const panel = readSrc("src/features/results/ResultsPanel.tsx")
    expect(scurve).toContain("shouldHideOrdinaryYTickLabel")
    expect(scurve).toContain("shouldHideOrdinaryXTickLabel")
    expect(scurve).toContain("classicYLabelX")
    expect(scurve).toContain("classicXLabelY")
    expect(scurve).toContain("CLASSIC_VIEWBOX_PAD_LEFT")
    expect(scurve).toContain('data-scurve-classic-guides=""')
    expect(scurve).not.toContain("displayMode")
    expect(scurve).not.toContain("minimal")
    expect(scurve).not.toContain("horizontalScale")
    expect(scurve).not.toContain("SCurveDisplayModeMenu")
    expect(scurve).not.toContain("SCurveHorizontalZoomControl")
    expect(scurve).not.toContain("runSimulation")
    expect(scurve).not.toContain("requestCalculation")
    expect(panel).not.toContain("displayMode")
    expect(panel).not.toContain("onDisplayModeChange")
    expect(panel).not.toContain("sCurveHorizontalScale")
    expect(panel).not.toContain("horizontalScale=")
    expect(CLASSIC_VIEWBOX_PAD_LEFT).toBeGreaterThan(0)
    expect(CLASSIC_VIEWBOX_PAD_BOTTOM).toBeGreaterThan(0)
  })

  it("uses a fixed viewBox width (no zoom scaling)", () => {
    const scurve = readSrc("src/features/results/ResultsSCurve.tsx")
    expect(scurve).toContain("const CHART_W = SCURVE_VIEWBOX_WIDTH")
    expect(scurve).toContain("const chartW = CHART_W")
    expect(scurve).toContain("X_TICK_APPROX_COUNT")
  })

  it("has no removed i18n keys", () => {
    for (const lang of ["no", "en"] as const) {
      const charts = messages[lang].charts as Record<string, unknown>
      expect(charts.sCurveDisplay).toBeUndefined()
      expect(charts.sCurveDisplayMinimal).toBeUndefined()
      expect(charts.sCurveDisplayClassic).toBeUndefined()
      expect(charts.sCurveHorizontalZoom).toBeUndefined()
      expect(charts.sCurveHorizontalZoomReset).toBeUndefined()
    }
  })
})

describe("S-curve legend project highlight", () => {
  it("combines ephemeral hover with shared click multi-select", () => {
    const scurve = readSrc("src/features/results/ResultsSCurve.tsx")
    const panel = readSrc("src/features/results/ResultsPanel.tsx")
    const css = readSrc("src/index.css")
    const emphasis = readSrc("src/domain/results/sCurveProjectEmphasis.ts")

    expect(scurve).toContain("hoveredProjectId")
    expect(scurve).toContain("setHoveredProjectId")
    expect(scurve).toContain("selectedProjectIds")
    expect(scurve).toContain("onToggleProjectSelection")
    expect(scurve).toContain("sCurveProjectLayerOpacity")
    expect(scurve).toContain("aria-pressed={isSelected}")
    expect(scurve).toContain("onClick={() => onToggleProjectSelection?.(c.id)}")
    expect(scurve).toContain("onMouseEnter={() => setHoveredProjectId(c.id)}")
    expect(scurve).toContain("onMouseLeave={() => setHoveredProjectId(null)}")
    expect(scurve).toContain("onFocus={() => setHoveredProjectId(c.id)}")
    expect(scurve).toContain("onBlur={() => setHoveredProjectId(null)}")
    expect(scurve).toContain('className="scurve-project-layer"')
    expect(scurve).toContain("projectLayerOpacity(c.id)")
    expect(scurve).toContain('emphasis === "reference"')
    expect(scurve).toContain("data-scurve-emphasis")

    expect(emphasis).toContain("isSCurveProjectEmphasized")
    expect(emphasis).toContain("SCURVE_PROJECT_DIM_OPACITY = 0.45")
    expect(emphasis).toContain("toggleSelectedProjectId")

    // Shared Classic Y labels stay outside project opacity wrappers
    const classicYBlock = scurve.match(/\{classicYLabels\.map\(\(label\) => \([\s\S]*?\)\)\}/)?.[0]
    expect(classicYBlock).toBeTruthy()
    expect(classicYBlock!).toContain("data-scurve-classic-y-label")
    expect(classicYBlock!).not.toContain("projectLayerOpacity")

    // Selection lifted to ResultsPanel so expand shares state
    expect(panel).toContain("sCurveSelectedProjectIds")
    expect(panel).toContain("toggleSCurveProjectSelection")
    expect(panel).toContain("clearSCurveProjectSelection")
    expect(panel).toContain('document.addEventListener("pointerdown"')
    expect(panel).toContain('target.closest("[data-scurve-legend]")')
    expect(panel).toMatch(/if \(sCurveSelectedProjectIds\.length === 0\) return/)
    expect(panel).toMatch(
      /selectedProjectIds=\{sCurveSelectedProjectIds\}[\s\S]*?onToggleProjectSelection=\{toggleSCurveProjectSelection\}/,
    )
    expect(panel).toMatch(/expanded[\s\S]*?selectedProjectIds=\{sCurveSelectedProjectIds\}/)
    expect(panel).not.toMatch(/sCurveSelectedProjectIds[\s\S]{0,120}(localStorage|saveAsDefault)/)
    expect(scurve).toContain('data-scurve-legend=""')

    // Not persisted in chart component
    expect(scurve).not.toMatch(
      /hoveredProjectId[\s\S]{0,200}(localStorage|resultPreferences|saveAsDefault)/,
    )
    expect(scurve).not.toMatch(
      /selectedProjectIds[\s\S]{0,200}(localStorage|resultPreferences|saveAsDefault)/,
    )

    expect(css).toContain(".scurve-project-layer")
    expect(css).toContain("transition: opacity 150ms ease-out")
    expect(css).toContain(".scurve-legend-item")
    expect(css).toContain(".scurve-legend-item--selected")
    expect(css).toContain(".scurve-legend-label")
    expect(css).toContain("max-width: 13ch")
    expect(css).toContain("text-overflow: ellipsis")
    expect(scurve).toContain("title={c.label}")
    expect(scurve).toContain("aria-label={c.label}")
    expect(scurve).toContain('className="scurve-legend-label"')
    expect(scurve).toContain('showExpand && "pr-9"')
  })
})
