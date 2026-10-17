import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { join } from "node:path"

import { computeEmpiricalCdf } from "@/domain/simulation/cdf"
import { percentile } from "@/domain/simulation/stats"
import {
  SCURVE_ASPECT_RATIO,
  SCURVE_CURVE_STROKE_LINECAP,
  SCURVE_CURVE_STROKE_LINEJOIN,
  SCURVE_CURVE_STROKE_WIDTH,
  SCURVE_DISPLAY_POINT_TARGET,
  SCURVE_EXPANDED_SHELL_CLASS,
  SCURVE_INLINE_SHELL_CLASS,
  SCURVE_VIEWBOX_HEIGHT,
  SCURVE_VIEWBOX_WIDTH,
  computeSCurveDisplaySeries,
  downsampleCdfPointsForDisplay,
} from "@/domain/results/sCurveDisplay"
import { repoRoot } from "@/test-utils/repoRoot"
import { readAppSource } from "@/test-utils/appSource"


function appSource() {
  return readAppSource()
}

function sCurveSource() {
  return readFileSync(join(repoRoot, "src/features/results/ResultsSCurve.tsx"), "utf8")
}

function pdfSource() {
  return readFileSync(
    join(repoRoot, "src/pdf/ProjectReportDocument.tsx"),
    "utf8",
  )
}

function makeSortedValues(n: number): number[] {
  return Array.from({ length: n }, (_, i) => i + 1)
}

describe("S-curve display series", () => {
  it("A: App wires main simulation from simulationConfig.mainRuns", () => {
    expect(appSource()).toContain(
      'import { simulationConfig } from "@/domain/simulation/simulationConfig"',
    )
    expect(appSource()).toContain("const runs = simulationConfig.mainRuns")
    expect(appSource()).not.toContain("useState(20_000)")
  })

  it("B: S-curve display series contains substantially fewer points than the full result", () => {
    const values = makeSortedValues(20_000)
    const full = computeEmpiricalCdf(values)
    const display = computeSCurveDisplaySeries(values)
    expect(full.length).toBe(20_001)
    expect(display.length).toBeLessThanOrEqual(SCURVE_DISPLAY_POINT_TARGET)
    expect(display.length).toBeGreaterThanOrEqual(500)
    expect(display.length).toBeLessThan(full.length / 10)
  })

  it("C: display-series reduction is deterministic", () => {
    const values = [9, 1, 4, 4, 8, 2, 15, 3, 7, 6]
    const a = computeSCurveDisplaySeries(values, 6)
    const b = computeSCurveDisplaySeries(values, 6)
    expect(a).toEqual(b)
  })

  it("D: display-series x-values remain ordered", () => {
    const display = computeSCurveDisplaySeries(makeSortedValues(5_000), 800)
    for (let i = 1; i < display.length; i++) {
      expect(display[i]!.x).toBeGreaterThanOrEqual(display[i - 1]!.x)
    }
  })

  it("E: display-series probability values remain monotonic", () => {
    const display = computeSCurveDisplaySeries(makeSortedValues(5_000), 800)
    for (let i = 1; i < display.length; i++) {
      expect(display[i]!.y).toBeGreaterThanOrEqual(display[i - 1]!.y)
    }
  })

  it("F: first/last relevant distribution points remain represented", () => {
    const values = makeSortedValues(20_000)
    const full = computeEmpiricalCdf(values)
    const display = computeSCurveDisplaySeries(values)
    expect(display[0]).toEqual(full[0])
    expect(display[display.length - 1]).toEqual(full[full.length - 1])
    const tiny = downsampleCdfPointsForDisplay(
      [
        { x: 10, y: 0 },
        { x: 20, y: 1 },
      ],
      800,
    )
    expect(tiny).toHaveLength(2)
  })

  it("G: percentile calculations remain on simulation totals", () => {
    const values = makeSortedValues(20_000)
    expect(percentile(values, 50)).toBe(percentile(values, 50))
    expect(percentile(values, 85)).toBe(percentile(values, 85))
    const src = sCurveSource()
    expect(src).toContain("buildClassicGuides")
    expect(readFileSync(join(repoRoot, "src/domain/results/sCurveClassicGuides.ts"), "utf8")).toContain(
      "percentile(s.values, p)",
    )
    expect(src).not.toContain("percentile(c.points")
    expect(pdfSource()).toContain("percentile(series.values, p)")
    expect(pdfSource()).toContain("sCurveMarkerPercentiles")
  })

  it("H: Classic percentile guides keep thin dashed styling", () => {
    const src = sCurveSource()
    expect(src).toContain("chartPercentileGuideOpacity(g.percentile)")
    expect(src).toContain("CHART_SECONDARY_STROKE_WIDTH")
    expect(src).toContain("strokeDasharray={g.dash}")
    expect(src).toContain("data-scurve-classic-guides")
    expect(src).not.toContain("data-scurve-minimal")
    expect(pdfSource()).toContain("PDF_SCURVE_GUIDE_STROKE_WIDTH")
    expect(pdfSource()).toContain("strokeDasharray={g.dash}")
    expect(pdfSource()).toContain("buildPdfClassicGuides")
    expect(pdfSource()).not.toContain("layoutPdfSCurveMarkers")
    const classic = readFileSync(
      join(repoRoot, "src/pdf/pdfSCurveClassic.ts"),
      "utf8",
    )
    expect(classic).toContain("PDF_SCURVE_GUIDE_STROKE_WIDTH = 0.65")
  })

  it("I: S-curve project colors use shared project identity tokens", () => {
    const src = sCurveSource()
    const panel = readFileSync(
      join(repoRoot, "src/features/results/ResultsPanel.tsx"),
      "utf8",
    )
    expect(src).toContain("`var(${c.colorVar})`")
    expect(src).toContain("var(--muted-foreground)")
    expect(src).toContain('emphasis === "reference"')
    expect(src).toContain("ProjectColorCssVar")
    expect(panel).toContain("getProjectColorCssVar")
    expect(pdfSource()).toContain("stroke={curve.color}")
  })

  it("app and PDF share the simplified display series; PDF keeps display stroke constant", () => {
    expect(sCurveSource()).toContain("computeSCurveDisplaySeries")
    expect(pdfSource()).toContain("computeSCurveDisplaySeries")
    expect(sCurveSource()).toContain("CHART_PRIMARY_STROKE_WIDTH")
    expect(pdfSource()).toContain("SCURVE_CURVE_STROKE_WIDTH")
    expect(sCurveSource()).toContain("SCURVE_CURVE_STROKE_LINECAP")
    expect(sCurveSource()).toContain("SCURVE_CURVE_STROKE_LINEJOIN")
    expect(SCURVE_CURVE_STROKE_WIDTH).toBe(1.25)
    expect(SCURVE_CURVE_STROKE_LINECAP).toBe("butt")
    expect(SCURVE_CURVE_STROKE_LINEJOIN).toBe("miter")
    expect(sCurveSource()).not.toContain('strokeLinecap="round"')
    expect(sCurveSource()).not.toContain('strokeLinejoin="round"')
  })

  it("J: inline and expanded plot aspect ratios are approximately the same", () => {
    expect(SCURVE_ASPECT_RATIO).toBeCloseTo(4 / 3, 5)
    expect(SCURVE_VIEWBOX_WIDTH / SCURVE_VIEWBOX_HEIGHT).toBeCloseTo(4 / 3, 5)
    expect(SCURVE_INLINE_SHELL_CLASS).toContain("max-w-[min(100%,36rem)]")
    expect(SCURVE_EXPANDED_SHELL_CLASS).toContain("max-w-[min(100%,48rem)]")
    const src = sCurveSource()
    expect(src).toContain("SCURVE_INLINE_SHELL_CLASS")
    expect(src).toContain("SCURVE_EXPANDED_SHELL_CLASS")
    expect(src).toContain('preserveAspectRatio="xMidYMid meet"')
    expect(src).toContain("SCURVE_PLOT_ASPECT_CLASS")
    expect(src).not.toContain("data-scurve-h-scroll")
    expect(pdfSource()).toContain("SCURVE_ASPECT_RATIO")
    expect(pdfSource()).toContain("Math.round(CHART_W / SCURVE_ASPECT_RATIO)")
  })

  it("K: expanded view no longer becomes disproportionately wide/flat", () => {
    expect(SCURVE_EXPANDED_SHELL_CLASS).toContain("max-w-[min(100%,48rem)]")
    expect(SCURVE_EXPANDED_SHELL_CLASS).toContain("mx-auto")
    expect(sCurveSource()).not.toContain('h-[min(58vh,32rem)] w-full')
    expect(sCurveSource()).not.toContain("h-54 w-full")
    expect(SCURVE_INLINE_SHELL_CLASS).toContain("max-w-[min(100%,36rem)]")
  })
})
