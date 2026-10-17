import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import {
  CHART_AXIS_STROKE_CLASS,
  CHART_AXIS_STROKE_WIDTH,
  CHART_CLASSIC_GUIDE_STROKE_OPACITY,
  CHART_CLASSIC_MARKER_FILL_OPACITY,
  CHART_GRID_STROKE_CLASS,
  CHART_GRID_STROKE_WIDTH,
  CHART_HTML_LEGEND_TEXT_CLASS,
  CHART_PRIMARY_ANNOTATION_FILL_CLASS,
  CHART_PRIMARY_ANNOTATION_FILL_OPACITY,
  CHART_PRIMARY_STROKE_WIDTH,
  CHART_SECONDARY_STROKE_WIDTH,
  CHART_SVG_ANNOTATION_FONT_SIZE,
  CHART_SVG_DATA_LABEL_FONT_SIZE,
  CHART_SVG_TICK_FONT_SIZE,
  CHART_TICK_FILL_CLASS,
  chartPercentileGuideOpacity,
} from "@/lib/chartPresentation"
import {
  SCURVE_CURVE_STROKE_WIDTH,
  SCURVE_EXPANDED_SHELL_CLASS,
  SCURVE_INLINE_SHELL_CLASS,
  SCURVE_ASPECT_RATIO,
} from "@/lib/sCurveDisplay"
import { SCURVE_PROJECT_DIM_OPACITY } from "@/lib/sCurveProjectEmphasis"

const repoRoot = join(__dirname, "../..")

function readSrc(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8")
}

describe("chartPresentation", () => {
  it("keeps curves slim and guides secondary to labels", () => {
    expect(CHART_PRIMARY_STROKE_WIDTH).toBe(SCURVE_CURVE_STROKE_WIDTH)
    expect(CHART_PRIMARY_STROKE_WIDTH).toBeLessThanOrEqual(1.3)
    expect(CHART_SECONDARY_STROKE_WIDTH).toBeLessThan(CHART_PRIMARY_STROKE_WIDTH)
    expect(CHART_GRID_STROKE_WIDTH).toBeLessThanOrEqual(
      CHART_SECONDARY_STROKE_WIDTH,
    )
    expect(CHART_AXIS_STROKE_WIDTH).toBeGreaterThan(CHART_GRID_STROKE_WIDTH)
    // Restrained middle ground — not near-invisible, not dominant
    expect(CHART_CLASSIC_GUIDE_STROKE_OPACITY).toBeGreaterThanOrEqual(0.35)
    expect(CHART_CLASSIC_GUIDE_STROKE_OPACITY).toBeLessThanOrEqual(0.55)
  })

  it("keeps P50 prominence at least equal to P85", () => {
    expect(chartPercentileGuideOpacity(50)).toBe(
      chartPercentileGuideOpacity(85),
    )
    expect(chartPercentileGuideOpacity(50)).toBe(
      CHART_CLASSIC_GUIDE_STROKE_OPACITY,
    )
  })

  it("keeps highlighted y-axis percentiles the same size as P25/P75 ticks", () => {
    expect(CHART_SVG_TICK_FONT_SIZE).toBe(3.45)
    expect(CHART_SVG_ANNOTATION_FONT_SIZE).toBe(CHART_SVG_TICK_FONT_SIZE)
    expect(CHART_SVG_DATA_LABEL_FONT_SIZE).toBeGreaterThanOrEqual(3.2)
    expect(CHART_TICK_FILL_CLASS).toMatch(/\/(8|9)\d|foreground/)
    expect(CHART_PRIMARY_ANNOTATION_FILL_CLASS).toContain("foreground")
    expect(CHART_PRIMARY_ANNOTATION_FILL_OPACITY).toBeGreaterThanOrEqual(0.9)
    expect(CHART_GRID_STROKE_CLASS).toContain("border")
    expect(CHART_AXIS_STROKE_CLASS).toContain("border")
    expect(CHART_HTML_LEGEND_TEXT_CLASS).toContain("text-[11px]")
    // Guides stay below the previous heavy clarity pass
    expect(CHART_CLASSIC_GUIDE_STROKE_OPACITY).toBeLessThan(0.6)
    expect(CHART_CLASSIC_MARKER_FILL_OPACITY).toBeLessThan(0.7)
  })

  it("renders Classic highlighted percentiles at tick font size", () => {
    const scurve = readSrc("src/components/ResultsSCurve.tsx")
    // Classic Y annotations use tick size, not a larger size
    expect(scurve).toMatch(
      /data-scurve-classic-y-label[\s\S]*?fontSize=\{CHART_SVG_TICK_FONT_SIZE\}|fontSize=\{CHART_SVG_TICK_FONT_SIZE\}[\s\S]*?data-scurve-classic-y-label/,
    )
    expect(scurve).not.toMatch(
      /data-scurve-classic-y-label[\s\S]{0,120}fontSize=\{CHART_SVG_ANNOTATION_FONT_SIZE\}/,
    )
    // Emphasis without size: stronger fill class / weight / guide tokens still present
    expect(scurve).toContain("CHART_PRIMARY_ANNOTATION_FILL_CLASS")
    expect(scurve).toContain("chartPercentileGuideOpacity")
    expect(scurve).toContain("fontWeight={500}")
  })

  it("enlarges the S-curve plot shell while keeping 4:3 aspect", () => {
    expect(SCURVE_ASPECT_RATIO).toBeCloseTo(4 / 3, 5)
    expect(SCURVE_INLINE_SHELL_CLASS).toContain("max-w-[min(100%,36rem)]")
    expect(SCURVE_EXPANDED_SHELL_CLASS).toContain("max-w-[min(100%,48rem)]")
    expect(SCURVE_INLINE_SHELL_CLASS).toContain("mx-auto")
    expect(SCURVE_EXPANDED_SHELL_CLASS).toContain("mx-auto")
    const scurve = readSrc("src/components/ResultsSCurve.tsx")
    expect(scurve).toContain("SCURVE_INLINE_SHELL_CLASS")
    expect(scurve).toContain("SCURVE_EXPANDED_SHELL_CLASS")
    expect(scurve).toContain("SCURVE_PLOT_ASPECT_CLASS")
    expect(scurve).not.toContain("aspectRatio:")
    expect(scurve).not.toContain("data-scurve-h-scroll")
    // Breathing room around the larger plot
    expect(scurve).toContain('bg-muted/20 p-3')
    expect(scurve).toContain("p-4 sm:p-5")
  })

  it("is consumed by the S-curve for Classic, ticks, and grid", () => {
    const scurve = readSrc("src/components/ResultsSCurve.tsx")
    expect(scurve).toContain("CHART_PRIMARY_STROKE_WIDTH")
    expect(scurve).toContain("CHART_SECONDARY_STROKE_WIDTH")
    expect(scurve).not.toContain("CHART_MINIMAL")
    expect(scurve).toContain("CHART_TICK_FILL_CLASS")
    expect(scurve).toContain("CHART_SVG_TICK_FONT_SIZE")
    expect(scurve).toContain("CHART_GRID_STROKE_WIDTH")
    expect(scurve).toContain("CHART_GRID_STROKE_CLASS")
    expect(scurve).toContain("chartPercentileGuideOpacity")
    expect(scurve).not.toContain("strokeOpacity={0.28}")
    expect(scurve).not.toContain("0.32 + (markerIndex")
    expect(scurve).not.toContain("fill-muted-foreground/45")
    expect(scurve).not.toContain("text-border/30")
  })

  it("keeps Focus and normal Results on the same S-curve component", () => {
    const panel = readSrc("src/components/ResultsPanel.tsx")
    const matches = panel.match(/<ResultsSCurve/g) ?? []
    expect(matches.length).toBeGreaterThanOrEqual(2)
    expect(panel).toContain('expandedChart?.kind === "scurve"')
  })

  it("does not dim non-emphasized projects below guide readability floor", () => {
    expect(SCURVE_PROJECT_DIM_OPACITY).toBeGreaterThanOrEqual(0.4)
    expect(SCURVE_PROJECT_DIM_OPACITY).toBeLessThan(1)
    expect(
      SCURVE_PROJECT_DIM_OPACITY * CHART_CLASSIC_GUIDE_STROKE_OPACITY,
    ).toBeLessThan(SCURVE_PROJECT_DIM_OPACITY)
  })

  it("leaves PDF on the shared display stroke constant", () => {
    expect(SCURVE_CURVE_STROKE_WIDTH).toBe(1.25)
    const pdf = readSrc("src/pdf/ongoing/ongoingPdfCharts.tsx")
    expect(pdf).toContain("SCURVE_CURVE_STROKE_WIDTH")
    expect(pdf).not.toContain("CHART_PRIMARY_STROKE_WIDTH")
  })

  it("does not alter Tornado / waterfall / development bar presentation", () => {
    expect(readSrc("src/components/ResultsTornado.tsx")).toContain(
      "fillOpacity={0.58}",
    )
    expect(readSrc("src/components/AttributionWaterfall.tsx")).toContain(
      "fillOpacity={0.62}",
    )
    const development = readSrc("src/components/ResultsDevelopmentChart.tsx")
    expect(development).not.toContain("chartPresentation")
  })
})
