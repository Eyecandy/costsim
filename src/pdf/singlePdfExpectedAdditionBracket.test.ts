/**
 * Single Analysis PDF contribution total-span brackets
 * (Expected Addition + Uncertainty Reserve) —
 * same shared PdfWaterfallChart geometry as Ongoing.
 */
import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { join } from "node:path"

import {
  formatWaterfallSignedDeltaWithScale,
  formatWaterfallValueWithScale,
  resolveWaterfallDisplayScale,
  collectWaterfallDisplayValues,
} from "@/domain/results/formatWaterfallValue"
import { mapShapleyToPdfContribution } from "@/pdf/buildPdfReportModel"
import {
  preparePdfWaterfallPresentation,
  pdfWaterfallTotalSpanBar,
  pdfWaterfallValueToX,
} from "@/pdf/pdfWaterfallLayout"
import { repoRoot } from "@/test-utils/repoRoot"
import { readPdfReportSource } from "@/test-utils/pdfReportSource"

function readSrc(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8")
}

function sampleShapley(args: {
  baseCost: number
  p50: number
  /** Selected reserve target percentile cost (not necessarily P85). */
  targetPercentileCost: number
}) {
  const expectedSum = args.p50 - args.baseCost
  const reserveSum = args.targetPercentileCost - args.p50
  return {
    baseCost: args.baseCost,
    estimatedP50: args.p50,
    estimatedP85: args.targetPercentileCost,
    expectedAddition: expectedSum,
    uncertaintyReserve: reserveSum,
    contributions: [
      { id: "c1", name: "Steel", contribution: expectedSum * 0.6, type: "cost" as const },
      { id: "d1", name: "Weather", contribution: expectedSum * 0.4, type: "driver" as const },
    ],
    expectedAdditionDecomposition: {
      startValue: args.baseCost,
      endValue: args.p50,
      contributions: [
        { id: "c1", name: "Steel", contribution: expectedSum * 0.6, type: "cost" as const },
        { id: "d1", name: "Weather", contribution: expectedSum * 0.4, type: "driver" as const },
      ],
    },
    uncertaintyReserveDecomposition: {
      startValue: args.p50,
      endValue: args.targetPercentileCost,
      contributions: [
        { id: "c1", name: "Steel", contribution: reserveSum * 0.5, type: "cost" as const },
        { id: "d1", name: "Weather", contribution: reserveSum * 0.5, type: "driver" as const },
      ],
    },
  }
}

/** Expected Addition PdfWaterfallChart call site inside Single PDF Contribution. */
function singleExpectedWaterfallCallSite(): string {
  const src = readPdfReportSource()
  const start = src.indexOf("<Text style={styles.contribSubtitle}>{expectedLabel}</Text>")
  const end = src.indexOf("<Text style={[styles.contribSubtitle, { marginTop: 8 }]}>", start)
  expect(start).toBeGreaterThan(-1)
  expect(end).toBeGreaterThan(start)
  return src.slice(start, end)
}

function singleReserveWaterfallCallSite(): string {
  const src = readPdfReportSource()
  const start = src.indexOf("<Text style={[styles.contribSubtitle, { marginTop: 8 }]}>")
  const end = src.indexOf("</View>", start)
  expect(start).toBeGreaterThan(-1)
  expect(end).toBeGreaterThan(start)
  return src.slice(start, end)
}

describe("Single PDF contribution total-span brackets", () => {
  it("Single Expected Addition and Uncertainty Reserve both enable showTotalSpanBar", () => {
    const expectedSite = singleExpectedWaterfallCallSite()
    expect(expectedSite).toContain("waterfall={block.expectedAddition}")
    expect(expectedSite).toContain("showTotalSpanBar")

    const reserveSite = singleReserveWaterfallCallSite()
    expect(reserveSite).toContain("waterfall={block.uncertaintyReserve}")
    expect(reserveSite).toContain("showTotalSpanBar")
    // Shared renderer only — no Single-only bracket geometry.
    expect(reserveSite).not.toContain("pdfWaterfallTotalSpanBar")
  })

  it("Expected Addition span = base cost → P50", () => {
    const shapley = sampleShapley({
      baseCost: 100,
      p50: 122.5,
      targetPercentileCost: 140,
    })
    const mapped = mapShapleyToPdfContribution("Alt A", shapley)
    expect(mapped.expectedAddition.startValue).toBe(100)
    expect(mapped.expectedAddition.endValue).toBe(122.5)

    const prepared = preparePdfWaterfallPresentation({
      waterfall: mapped.expectedAddition,
      otherLabel: "Other",
      language: "en",
      valueFormat: "chart",
    })
    expect(prepared.layout.startValue).toBe(100)
    expect(prepared.layout.endValue).toBe(122.5)
    expect(prepared.layout.spanTotal).toBe(22.5)

    const bar = pdfWaterfallTotalSpanBar(prepared.layout)
    expect(bar.xStart).toBe(pdfWaterfallValueToX(prepared.layout.startValue, prepared.layout))
    expect(bar.xEnd).toBe(pdfWaterfallValueToX(prepared.layout.endValue, prepared.layout))
    expect(bar.width).toBeGreaterThan(0)
  })

  it("Uncertainty Reserve span = P50 → selected target percentile (not hardcoded P85)", () => {
    // Use a non-P85 target cost so the bracket must follow decomposition endValue.
    const selectedTarget = 155.25
    const shapley = sampleShapley({
      baseCost: 100,
      p50: 122.5,
      targetPercentileCost: selectedTarget,
    })
    const mapped = mapShapleyToPdfContribution("Alt A", shapley)
    expect(mapped.uncertaintyReserve.startValue).toBe(122.5)
    expect(mapped.uncertaintyReserve.endValue).toBe(selectedTarget)
    expect(mapped.uncertaintyReserve.endValue).not.toBe(140)

    const prepared = preparePdfWaterfallPresentation({
      waterfall: mapped.uncertaintyReserve,
      otherLabel: "Other",
      language: "en",
      valueFormat: "chart",
    })
    expect(prepared.layout.startValue).toBe(122.5)
    expect(prepared.layout.endValue).toBe(selectedTarget)
    expect(prepared.layout.spanTotal).toBe(selectedTarget - 122.5)

    const bar = pdfWaterfallTotalSpanBar(prepared.layout)
    expect(bar.xStart).toBe(pdfWaterfallValueToX(prepared.layout.startValue, prepared.layout))
    expect(bar.xEnd).toBe(pdfWaterfallValueToX(prepared.layout.endValue, prepared.layout))

    // Mapper passes through decomposition endpoints — no P85 literal in path.
    const mapper = readSrc("src/pdf/buildPdfReportModel.ts")
    const reserveMap = mapper.slice(
      mapper.indexOf("uncertaintyReserve: {"),
      mapper.indexOf("uncertaintyReserve: {") + 280,
    )
    expect(reserveMap).toContain("result.uncertaintyReserveDecomposition.startValue")
    expect(reserveMap).toContain("result.uncertaintyReserveDecomposition.endValue")
    expect(reserveMap).not.toContain("estimatedP85")
  })

  it("displayed span amounts match Expected Addition and Uncertainty Reserve", () => {
    const shapley = sampleShapley({
      baseCost: 1_000_000,
      p50: 1_250_000,
      targetPercentileCost: 1_400_000,
    })
    const mapped = mapShapleyToPdfContribution("Alt A", shapley)
    const expectedPrep = preparePdfWaterfallPresentation({
      waterfall: mapped.expectedAddition,
      otherLabel: "Other",
      language: "en",
      valueFormat: "chart",
    })
    const reservePrep = preparePdfWaterfallPresentation({
      waterfall: mapped.uncertaintyReserve,
      otherLabel: "Other",
      language: "en",
      valueFormat: "chart",
    })
    expect(expectedPrep.layout.spanTotal).toBe(
      mapped.expectedAddition.endValue - mapped.expectedAddition.startValue,
    )
    expect(reservePrep.layout.spanTotal).toBe(
      mapped.uncertaintyReserve.endValue - mapped.uncertaintyReserve.startValue,
    )
    expect(expectedPrep.formatted.span).toBe(
      expectedPrep.formatDelta(expectedPrep.layout.spanTotal),
    )
    expect(reservePrep.formatted.span).toBe(reservePrep.formatDelta(reservePrep.layout.spanTotal))
  })

  it("NO/EN chart-scale formatting unchanged for Single PDF span amounts", () => {
    const waterfall = {
      startValue: 100_000_000,
      endValue: 103_729_400,
      contributions: [
        { id: "c1", name: "Steel", contribution: 2_500_000, type: "cost" as const },
        { id: "c2", name: "Concrete", contribution: 1_229_400, type: "cost" as const },
      ],
    }
    const en = preparePdfWaterfallPresentation({
      waterfall,
      otherLabel: "Other",
      language: "en",
      valueFormat: "chart",
    })
    const no = preparePdfWaterfallPresentation({
      waterfall,
      otherLabel: "Annet",
      language: "no",
      valueFormat: "chart",
    })
    const scale = resolveWaterfallDisplayScale(
      collectWaterfallDisplayValues({
        startValue: waterfall.startValue,
        endValue: waterfall.endValue,
        contributions: waterfall.contributions.map((c) => c.contribution),
      }),
    )
    expect(en.formatted.span).toBe(
      formatWaterfallSignedDeltaWithScale(en.layout.spanTotal, scale, "en"),
    )
    expect(no.formatted.span).toBe(
      formatWaterfallSignedDeltaWithScale(no.layout.spanTotal, scale, "no"),
    )
    expect(en.formatted.start).toBe(
      formatWaterfallValueWithScale(waterfall.startValue, scale, "en"),
    )
    expect(no.formatted.start).toBe(
      formatWaterfallValueWithScale(waterfall.startValue, scale, "no"),
    )
    // Single PDF Contribution keeps chart formatting (not Ongoing adaptive).
    expect(singleExpectedWaterfallCallSite()).not.toContain('valueFormat="adaptive"')
    expect(singleReserveWaterfallCallSite()).not.toContain('valueFormat="adaptive"')
  })

  it("Ongoing PDF contribution bracket wiring remains unchanged", () => {
    const ongoingCharts = readSrc("src/pdf/ongoing/ongoingPdfCharts.tsx")
    const expectedBlock = ongoingCharts.slice(
      ongoingCharts.indexOf("waterfall={block.expectedAddition}"),
      ongoingCharts.indexOf("waterfall={block.uncertaintyReserve}"),
    )
    const reserveBlock = ongoingCharts.slice(
      ongoingCharts.indexOf("waterfall={block.uncertaintyReserve}"),
      ongoingCharts.indexOf("waterfall={block.uncertaintyReserve}") + 350,
    )
    expect(expectedBlock).toContain("showTotalSpanBar")
    expect(expectedBlock).toContain('valueFormat="adaptive"')
    expect(reserveBlock).toContain("showTotalSpanBar")
    expect(reserveBlock).toContain('valueFormat="adaptive"')
    const shared = readSrc("src/pdf/pdfWaterfallChart.tsx")
    expect(shared).toContain("pdfWaterfallTotalSpanBar")
    expect(shared).toContain("PDF_WATERFALL_TOTAL_BAR_H")
    expect(shared).toContain("PDF_WATERFALL_TOTAL_CAP_H")
  })

  it("mapShapleyToPdfContribution analytics unchanged (presentation-only)", () => {
    const shapley = sampleShapley({
      baseCost: 50,
      p50: 60,
      targetPercentileCost: 70,
    })
    const mapped = mapShapleyToPdfContribution("P", shapley)
    expect(mapped.expectedAddition.startValue).toBe(shapley.baseCost)
    expect(mapped.expectedAddition.endValue).toBe(shapley.estimatedP50)
    expect(mapped.uncertaintyReserve.startValue).toBe(
      shapley.uncertaintyReserveDecomposition.startValue,
    )
    expect(mapped.uncertaintyReserve.endValue).toBe(
      shapley.uncertaintyReserveDecomposition.endValue,
    )
    const expectedSum = mapped.expectedAddition.contributions.reduce(
      (a, c) => a + c.contribution,
      0,
    )
    const reserveSum = mapped.uncertaintyReserve.contributions.reduce(
      (a, c) => a + c.contribution,
      0,
    )
    expect(mapped.expectedAddition.startValue + expectedSum).toBeCloseTo(
      mapped.expectedAddition.endValue,
      9,
    )
    expect(mapped.uncertaintyReserve.startValue + reserveSum).toBeCloseTo(
      mapped.uncertaintyReserve.endValue,
      9,
    )
  })

  it("large reserve span still maps inside plot width", () => {
    const prepared = preparePdfWaterfallPresentation({
      waterfall: {
        startValue: 50_000_000,
        endValue: 250_000_000,
        contributions: [
          { id: "c1", name: "A", contribution: 150_000_000, type: "cost" },
          { id: "c2", name: "B", contribution: 50_000_000, type: "cost" },
        ],
      },
      otherLabel: "Other",
      language: "en",
      valueFormat: "chart",
    })
    const bar = pdfWaterfallTotalSpanBar(prepared.layout)
    expect(bar.x).toBeGreaterThanOrEqual(0)
    expect(bar.x + bar.width).toBeLessThanOrEqual(100)
    expect(bar.width).toBeGreaterThan(1)
  })
})
