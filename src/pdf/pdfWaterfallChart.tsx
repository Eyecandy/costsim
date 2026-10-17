/**
 * Shared PDF waterfall chart — same Top-N + cumulative layout as the app
 * AttributionWaterfall, rendered with @react-pdf primitives.
 *
 * Default value formatting matches existing Single PDF (chart-level scale).
 * Pass `valueFormat: "adaptive"` for Ongoing / app Contribution label parity.
 */

import { Line, Rect, Svg, StyleSheet, Text, View } from "@react-pdf/renderer"
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
export const PDF_WATERFALL_VIEW_W = 100
export const PDF_WATERFALL_ROW_H = 8
export const PDF_WATERFALL_BAR_H = 2.8
/** Thin total-span summary bar (secondary to contribution bars). */
export const PDF_WATERFALL_TOTAL_BAR_H = 1.35
/** Short vertical end-caps on the total-span bar (|────|). */
export const PDF_WATERFALL_TOTAL_CAP_H = 3.2
/** Match Single PDF Contribution fills (print-safe slate / stone). */
export const PDF_WATERFALL_POS_FILL = "#64748b"
export const PDF_WATERFALL_NEG_FILL = "#a8a29e"
export const PDF_WATERFALL_TOTAL_FILL = "#94a3b8"

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

const styles = StyleSheet.create({
  waterfallHeader: {
    flexDirection: "row",
    marginBottom: 4,
    marginTop: 2,
  },
  waterfallHeaderCol: {
    width: "33.33%",
  },
  waterfallHeaderLabel: {
    fontSize: 6.5,
    color: "#64748b",
    marginBottom: 1,
  },
  waterfallHeaderValue: {
    fontSize: 7.5,
    color: "#0f172a",
    fontFamily: "NotoSans",
  },
  totalSpanRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 3,
    minHeight: 11,
  },
  waterfallRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 1.5,
    minHeight: 12,
  },
  waterfallLabel: {
    width: "28%",
    fontSize: 7,
    color: "#334155",
    paddingRight: 4,
  },
  waterfallLabelMuted: {
    color: "#64748b",
  },
  waterfallBarWrap: {
    width: "52%",
  },
  waterfallDelta: {
    width: "20%",
    fontSize: 7,
    color: "#334155",
    textAlign: "right",
  },
  totalSpanDelta: {
    width: "20%",
    fontSize: 6.5,
    color: "#64748b",
    textAlign: "right",
  },
})

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

export type PdfWaterfallChartProps = {
  waterfall: PdfContributionWaterfall
  startLabel: string
  endLabel: string
  spanLabel: string
  otherLabel: string
  language: AppLanguage
  /** Default `"chart"` preserves Single PDF formatting. */
  valueFormat?: PdfWaterfallValueFormat
  /**
   * Thin start→end summary bar above contribution rows
   * (Expected Addition / reserve span — Single + Ongoing).
   * Uses the same plot geometry as individual bars.
   */
  showTotalSpanBar?: boolean
}

export function PdfWaterfallChart({
  waterfall,
  startLabel,
  endLabel,
  spanLabel,
  otherLabel,
  language,
  valueFormat = "chart",
  showTotalSpanBar = false,
}: PdfWaterfallChartProps) {
  const { layout, formatValue, formatDelta } = preparePdfWaterfallPresentation({
    waterfall,
    otherLabel,
    language,
    valueFormat,
  })

  const totalSpan = pdfWaterfallTotalSpanBar(layout)

  return (
    <View wrap={false}>
      <View style={styles.waterfallHeader}>
        <View style={styles.waterfallHeaderCol}>
          <Text style={styles.waterfallHeaderLabel}>{startLabel}</Text>
          <Text style={styles.waterfallHeaderValue}>
            {formatValue(layout.startValue)}
          </Text>
        </View>
        <View style={[styles.waterfallHeaderCol, { alignItems: "center" }]}>
          <Text style={[styles.waterfallHeaderLabel, { textAlign: "center" }]}>
            {spanLabel}
          </Text>
          <Text style={[styles.waterfallHeaderValue, { textAlign: "center" }]}>
            {formatDelta(layout.spanTotal)}
          </Text>
        </View>
        <View style={[styles.waterfallHeaderCol, { alignItems: "flex-end" }]}>
          <Text style={[styles.waterfallHeaderLabel, { textAlign: "right" }]}>
            {endLabel}
          </Text>
          <Text style={[styles.waterfallHeaderValue, { textAlign: "right" }]}>
            {formatValue(layout.endValue)}
          </Text>
        </View>
      </View>

      {showTotalSpanBar ? (
        <View style={styles.totalSpanRow} wrap={false}>
          {/* Same 28% / 52% / 20% columns + same SVG viewBox as contribution rows. */}
          <View style={styles.waterfallLabel} />
          <View style={styles.waterfallBarWrap}>
            <Svg
              viewBox={`0 0 ${PDF_WATERFALL_VIEW_W} ${PDF_WATERFALL_ROW_H}`}
              style={{ width: "100%", height: 11 }}
            >
              <Rect
                x={totalSpan.x}
                y={(PDF_WATERFALL_ROW_H - PDF_WATERFALL_TOTAL_BAR_H) / 2}
                width={totalSpan.width}
                height={PDF_WATERFALL_TOTAL_BAR_H}
                fill={PDF_WATERFALL_TOTAL_FILL}
                fillOpacity={0.45}
              />
              {/* End markers at exact startX / endX — same geometry as the bar. */}
              <Line
                x1={totalSpan.xStart}
                x2={totalSpan.xStart}
                y1={(PDF_WATERFALL_ROW_H - PDF_WATERFALL_TOTAL_CAP_H) / 2}
                y2={(PDF_WATERFALL_ROW_H + PDF_WATERFALL_TOTAL_CAP_H) / 2}
                stroke={PDF_WATERFALL_TOTAL_FILL}
                strokeWidth={0.55}
              />
              <Line
                x1={totalSpan.xEnd}
                x2={totalSpan.xEnd}
                y1={(PDF_WATERFALL_ROW_H - PDF_WATERFALL_TOTAL_CAP_H) / 2}
                y2={(PDF_WATERFALL_ROW_H + PDF_WATERFALL_TOTAL_CAP_H) / 2}
                stroke={PDF_WATERFALL_TOTAL_FILL}
                strokeWidth={0.55}
              />
            </Svg>
          </View>
          <Text style={styles.totalSpanDelta}>
            {formatDelta(layout.spanTotal)}
          </Text>
        </View>
      ) : null}

      {layout.contributionRows.map((row) => {
        const xBefore = pdfWaterfallValueToX(row.cumulativeBefore, layout)
        const xAfter = pdfWaterfallValueToX(row.cumulativeAfter, layout)
        const x = Math.min(xBefore, xAfter)
        const w = Math.max(Math.abs(xAfter - xBefore), 0.4)
        return (
          <View key={row.key} style={styles.waterfallRow} wrap={false}>
            <Text
              style={[
                styles.waterfallLabel,
                ...(row.key === "__other__" ? [styles.waterfallLabelMuted] : []),
              ]}
            >
              {row.label}
            </Text>
            <View style={styles.waterfallBarWrap}>
              <Svg
                viewBox={`0 0 ${PDF_WATERFALL_VIEW_W} ${PDF_WATERFALL_ROW_H}`}
                style={{ width: "100%", height: 11 }}
              >
                <Line
                  x1={xBefore}
                  x2={xBefore}
                  y1={0.8}
                  y2={PDF_WATERFALL_ROW_H - 0.8}
                  stroke="#cbd5e1"
                  strokeWidth={0.35}
                  strokeDasharray="0.8,0.8"
                />
                <Rect
                  x={x}
                  y={(PDF_WATERFALL_ROW_H - PDF_WATERFALL_BAR_H) / 2}
                  width={w}
                  height={PDF_WATERFALL_BAR_H}
                  fill={
                    row.contribution >= 0
                      ? PDF_WATERFALL_POS_FILL
                      : PDF_WATERFALL_NEG_FILL
                  }
                  fillOpacity={0.62}
                />
              </Svg>
            </View>
            <Text style={styles.waterfallDelta}>
              {formatDelta(row.contribution)}
            </Text>
          </View>
        )
      })}
    </View>
  )
}
