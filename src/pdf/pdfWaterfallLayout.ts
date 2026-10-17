import type { AppLanguage } from "@/domain/results/formatNumber"
import {
  formatAdaptiveMonetarySignedDelta,
  formatAdaptiveMonetaryValue,
  formatWaterfallSignedDeltaWithScale,
  formatWaterfallValueWithScale,
  resolveWaterfallDisplayScale,
  collectWaterfallDisplayValues,
} from "@/domain/results/formatWaterfallValue"
import {
  buildWaterfallChartLayout,
  valueToX,
  type WaterfallChartLayout,
} from "@/domain/results/waterfallLayout"
import {
  DEFAULT_WATERFALL_TOP_N,
  groupWaterfallContributors,
  type WaterfallDisplayRow,
} from "@/domain/results/waterfallContributors"
import type { PdfContributionWaterfall } from "@/pdf/buildPdfReportModel"

export const PDF_WATERFALL_PLOT_LEFT = 2

export const PDF_WATERFALL_PLOT_RIGHT = 98

export const PDF_WATERFALL_PLOT_WIDTH =
  PDF_WATERFALL_PLOT_RIGHT - PDF_WATERFALL_PLOT_LEFT

export type PdfWaterfallValueFormat = "chart" | "adaptive"

export type PreparePdfWaterfallPresentationInput = {
  waterfall: PdfContributionWaterfall
  otherLabel: string
  language: AppLanguage
  valueFormat?: PdfWaterfallValueFormat
  maxIndividual?: number
}

export type PreparedPdfWaterfallPresentation = {
  displayRows: WaterfallDisplayRow[]
  layout: WaterfallChartLayout
  formatValue: (value: number) => string
  formatDelta: (value: number) => string
  /** Formatted labels for assertions / deterministic render checks. */
  formatted: {
    start: string
    end: string
    span: string
    rows: Array<{ id: string; name: string; delta: string }>
  }
}

/**
 * Pure presentation prep shared by PDF renderers and regression tests.
 * Does not recompute Shapley — only Top-N grouping + cumulative layout + format.
 */
export function preparePdfWaterfallPresentation(
  input: PreparePdfWaterfallPresentationInput,
): PreparedPdfWaterfallPresentation {
  const valueFormat = input.valueFormat ?? "chart"
  const maxIndividual = input.maxIndividual ?? DEFAULT_WATERFALL_TOP_N
  const displayRows = groupWaterfallContributors(
    input.waterfall.contributions.map((c) => ({
      id: c.id,
      name: c.name,
      contribution: c.contribution,
      type: c.type ?? "cost",
    })),
    { otherLabel: input.otherLabel, maxIndividual },
  )
  const layout = buildWaterfallChartLayout(
    input.waterfall.startValue,
    input.waterfall.endValue,
    displayRows,
  )

  let formatValue: (value: number) => string
  let formatDelta: (value: number) => string
  if (valueFormat === "adaptive") {
    formatValue = (value) =>
      formatAdaptiveMonetaryValue(value, input.language)
    formatDelta = (value) =>
      formatAdaptiveMonetarySignedDelta(value, input.language)
  } else {
    const displayScale = resolveWaterfallDisplayScale(
      collectWaterfallDisplayValues({
        startValue: input.waterfall.startValue,
        endValue: input.waterfall.endValue,
        contributions: displayRows.map((row) => row.contribution),
      }),
    )
    formatValue = (value) =>
      formatWaterfallValueWithScale(value, displayScale, input.language)
    formatDelta = (value) =>
      formatWaterfallSignedDeltaWithScale(value, displayScale, input.language)
  }

  return {
    displayRows,
    layout,
    formatValue,
    formatDelta,
    formatted: {
      start: formatValue(layout.startValue),
      end: formatValue(layout.endValue),
      span: formatDelta(layout.spanTotal),
      rows: displayRows.map((row) => ({
        id: row.id,
        name: row.name,
        delta: formatDelta(row.contribution),
      })),
    },
  }
}

/** Map start/end (or any layout value) into the shared PDF plot x-space. */
export function pdfWaterfallValueToX(
  value: number,
  layout: Pick<WaterfallChartLayout, "domainMin" | "domainMax">,
): number {
  return valueToX(
    value,
    layout.domainMin,
    layout.domainMax,
    PDF_WATERFALL_PLOT_LEFT,
    PDF_WATERFALL_PLOT_WIDTH,
  )
}

/**
 * Total-span summary bar geometry — identical valueToX / plot width as
 * contribution bars. Spans layout.startValue → layout.endValue.
 */
export function pdfWaterfallTotalSpanBar(layout: WaterfallChartLayout): {
  xStart: number
  xEnd: number
  x: number
  width: number
} {
  const xStart = pdfWaterfallValueToX(layout.startValue, layout)
  const xEnd = pdfWaterfallValueToX(layout.endValue, layout)
  const x = Math.min(xStart, xEnd)
  const width = Math.max(Math.abs(xEnd - xStart), 0.4)
  return { xStart, xEnd, x, width }
}

/** @deprecated Prefer pdfWaterfallTotalSpanBar. */
export function pdfWaterfallSpanBracketX(layout: WaterfallChartLayout): {
  xStart: number
  xEnd: number
} {
  const { xStart, xEnd } = pdfWaterfallTotalSpanBar(layout)
  return { xStart, xEnd }
}
