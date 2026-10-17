/**
 * Ongoing PDF chart primitives — visual language aligned with Single PDF,
 * owned by the Ongoing composition layer (not ProjectReportDocument).
 */

import {
  Circle,
  Line,
  Path,
  Rect,
  Svg,
  Text as SvgText,
  View,
  StyleSheet,
  Text,
} from "@react-pdf/renderer"
import type { AppLanguage } from "@/domain/results/formatNumber"
import {
  SCURVE_ASPECT_RATIO,
  SCURVE_CURVE_STROKE_LINECAP,
  SCURVE_CURVE_STROKE_LINEJOIN,
  SCURVE_CURVE_STROKE_WIDTH,
} from "@/domain/results/sCurveDisplay"
import {
  PDF_SCURVE_GUIDE_STROKE_WIDTH,
  PDF_SCURVE_LABEL_FONT,
  PDF_SCURVE_MARKER_RADIUS,
  PDF_SCURVE_TICK_FONT,
  PDF_SCURVE_Y_TICKS,
  buildPdfClassicGuides,
  formatPdfSCurveCost,
  layoutPdfClassicOrdinaryYTicks,
  layoutPdfClassicXCostLabels,
  layoutPdfClassicYLabels,
  resolvePdfSCurveCostScale,
  shouldHidePdfOrdinaryXTick,
  uniquePdfMarkerPercentiles,
  type PdfSCurveGeometry,
} from "@/pdf/pdfSCurveClassic"
import {
  formatPdfAbsoluteAmount,
  resolvePdfAmountScale,
  type PdfContributionBlock,
} from "@/pdf/buildPdfReportModel"
import { PdfWaterfallChart } from "@/pdf/pdfWaterfallChart"
import type { OngoingDevelopmentSeries } from "@/lib/ongoingDevelopmentSeries"
import type {
  OngoingPdfSCurve,
  OngoingPdfTornadoRow,
} from "@/pdf/ongoing/ongoingPdfTypes"

const styles = StyleSheet.create({
  chartWrap: { marginTop: 6, marginBottom: 8 },
  footnote: { fontSize: 7.5, color: "#64748b", marginTop: 4 },
  legendRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 4,
    marginBottom: 2,
  },
  legendItem: { flexDirection: "row", alignItems: "center" },
  legendSwatch: { width: 10, height: 2, marginRight: 4 },
  legendText: { fontSize: 7, color: "#475569" },
  waterfallTitle: {
    fontSize: 9,
    fontFamily: "NotoSans",
    fontWeight: "bold",
    color: "#334155",
    marginBottom: 4,
    marginTop: 8,
  },
})

const CHART_W = 520
const CHART_H = Math.round(CHART_W / SCURVE_ASPECT_RATIO)
const CHART_PAD_Y = 30
const CHART_RIGHT_MARGIN = 14
const CHART_LEFT_AXIS = 44
const CHART_PLOT_LEFT = CHART_LEFT_AXIS
const CHART_PLOT_RIGHT = CHART_W - CHART_RIGHT_MARGIN
const CHART_INNER_W = CHART_PLOT_RIGHT - CHART_PLOT_LEFT
/** Classic S-curve has no top label band — small headroom only. */
const CURVE_TOP_PAD = 28
const CHART_PLOT_TOP = CURVE_TOP_PAD
const CHART_PLOT_BOTTOM = CHART_H - CHART_PAD_Y
const CHART_INNER_H = CHART_PLOT_BOTTOM - CHART_PLOT_TOP
const CHART_GRID_STROKE = "#e8edf3"
const CHART_Y_PROB_TICKS = PDF_SCURVE_Y_TICKS
const SCURVE_LABEL_FONT = PDF_SCURVE_LABEL_FONT
const SCURVE_PDF_GEOMETRY: PdfSCurveGeometry = {
  plotLeft: CHART_PLOT_LEFT,
  plotRight: CHART_PLOT_RIGHT,
  plotTop: CHART_PLOT_TOP,
  plotBottom: CHART_PLOT_BOTTOM,
}

const TORNADO_W = 520
const TORNADO_LABEL_COL_W = Math.round(TORNADO_W * 0.33)
const TORNADO_BAR_PAD_X = 8
const TORNADO_VALUE_LABEL_GUTTER = 34
const TORNADO_BAR_START_X =
  TORNADO_LABEL_COL_W + TORNADO_BAR_PAD_X + TORNADO_VALUE_LABEL_GUTTER
const TORNADO_BAR_END_X =
  TORNADO_W - TORNADO_BAR_PAD_X - TORNADO_VALUE_LABEL_GUTTER
const TORNADO_ZERO_X = (TORNADO_BAR_START_X + TORNADO_BAR_END_X) / 2
const TORNADO_ROW_H = 16
const TORNADO_BAR_H = 6
const TORNADO_P10_COLOR = "#7a9181"
const TORNADO_P90_COLOR = "#7680ac"

const DEV_W = 507
const DEV_H = 88
const DEV_PAD_L = 28
const DEV_PAD_R = 8
const DEV_PAD_T = 10
const DEV_PAD_B = 18
const DEV_COLORS = {
  baseCost: "#64748b",
  p50: "#1d868c",
  p85: "#7680ac",
} as const

function pathFromPoints(
  points: Array<{ x: number; y: number }>,
  minX: number,
  maxX: number,
): string {
  if (points.length === 0) return ""
  const spanX = maxX - minX || 1
  return points
    .map((p, idx) => {
      const nx = (p.x - minX) / spanX
      const x = CHART_PLOT_LEFT + nx * CHART_INNER_W
      const y = CHART_PLOT_BOTTOM - p.y * CHART_INNER_H
      return `${idx === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`
    })
    .join(" ")
}

function xForValue(value: number, minX: number, maxX: number): number {
  const spanX = maxX - minX || 1
  return CHART_PLOT_LEFT + ((value - minX) / spanX) * CHART_INNER_W
}

function niceTickStep(rough: number): number {
  if (!Number.isFinite(rough) || rough <= 0) return 1
  const exp = Math.floor(Math.log10(rough))
  const f = rough / 10 ** exp
  const nf = f < 1.5 ? 1 : f < 3.5 ? 2 : f < 7.5 ? 5 : 10
  return nf * 10 ** exp
}

function generateXAxisTicks(minX: number, maxX: number): number[] {
  const span = maxX - minX || 1
  const step = niceTickStep(span / 5)
  const ticks: number[] = []
  const start = Math.floor(minX / step) * step
  const end = Math.ceil(maxX / step) * step
  let guard = 0
  for (let x = start; x <= end + step * 1e-6 && guard < 16; x += step, guard++) {
    ticks.push(x)
  }
  return ticks
}

export function OngoingPdfSCurveChart({
  series,
  language,
  footnote,
}: {
  series: OngoingPdfSCurve
  language: AppLanguage
  footnote?: string
}) {
  const points = series.points
  if (points.length === 0) return null
  let minX = Number.POSITIVE_INFINITY
  let maxX = Number.NEGATIVE_INFINITY
  for (const p of points) {
    if (p.x < minX) minX = p.x
    if (p.x > maxX) maxX = p.x
  }
  if (!Number.isFinite(minX) || !Number.isFinite(maxX) || minX === maxX) {
    minX = (Number.isFinite(minX) ? minX : 0) - 1
    maxX = (Number.isFinite(maxX) ? maxX : 0) + 1
  }
  const ticks = generateXAxisTicks(minX, maxX)
  const d = pathFromPoints(points, minX, maxX)
  // Classic semantics: one chart-level cost scale for ticks AND percentile costs.
  const costScale = resolvePdfSCurveCostScale(minX, maxX)
  const guides = buildPdfClassicGuides({
    curves: [
      {
        id: "ongoing",
        color: series.color,
        index: 0,
        markers: series.markers,
      },
    ],
    minX,
    maxX,
    geometry: SCURVE_PDF_GEOMETRY,
  })
  const yEmphasized = layoutPdfClassicYLabels(
    uniquePdfMarkerPercentiles([series]),
    SCURVE_PDF_GEOMETRY,
  )
  const yOrdinaryTicks = layoutPdfClassicOrdinaryYTicks(
    yEmphasized,
    SCURVE_PDF_GEOMETRY,
  )
  const xCostLabels = layoutPdfClassicXCostLabels({
    guides,
    scale: costScale,
    language,
    geometry: SCURVE_PDF_GEOMETRY,
  })

  return (
    <View style={styles.chartWrap} wrap={false}>
      <Svg
        viewBox={`0 0 ${CHART_W} ${CHART_H}`}
        style={{ width: CHART_W, height: CHART_H }}
      >
        {CHART_Y_PROB_TICKS.map((p) => {
          const y = CHART_PLOT_BOTTOM - p * CHART_INNER_H
          return (
            <Line
              key={`yg-${p}`}
              x1={CHART_PLOT_LEFT}
              y1={y}
              x2={CHART_PLOT_RIGHT}
              y2={y}
              stroke={CHART_GRID_STROKE}
              strokeWidth={0.55}
            />
          )
        })}
        {ticks.map((tick) => {
          const x = xForValue(tick, minX, maxX)
          return (
            <Line
              key={`xg-${tick}`}
              x1={x}
              y1={CHART_PLOT_TOP}
              x2={x}
              y2={CHART_PLOT_BOTTOM}
              stroke={CHART_GRID_STROKE}
              strokeWidth={0.55}
            />
          )
        })}
        {d ? (
          <Path
            d={d}
            stroke={series.color}
            strokeWidth={SCURVE_CURVE_STROKE_WIDTH}
            strokeLinecap={SCURVE_CURVE_STROKE_LINECAP}
            strokeLinejoin={SCURVE_CURVE_STROKE_LINEJOIN}
            fill="none"
          />
        ) : null}
        {guides.flatMap((g) => [
          <Path
            key={`p${g.percentile}-lguide`}
            d={g.path}
            stroke={g.color}
            strokeWidth={PDF_SCURVE_GUIDE_STROKE_WIDTH}
            strokeDasharray={g.dash}
            fill="none"
          />,
          <Circle
            key={`p${g.percentile}-dot`}
            cx={g.x}
            cy={g.y}
            r={PDF_SCURVE_MARKER_RADIUS}
            fill={g.color}
          />,
        ])}
        {yOrdinaryTicks.map((tick) => (
          <SvgText
            key={tick.key}
            x={CHART_PLOT_LEFT - 4}
            y={tick.y}
            dominantBaseline="middle"
            style={{ fontSize: PDF_SCURVE_TICK_FONT, fill: "#7c8796" }}
            textAnchor="end"
          >
            {tick.text}
          </SvgText>
        ))}
        {yEmphasized.map((label) => (
          <SvgText
            key={label.key}
            x={label.x}
            y={label.labelY}
            dominantBaseline="middle"
            style={{ fontSize: SCURVE_LABEL_FONT, fill: series.color }}
            textAnchor="end"
          >
            {label.text}
          </SvgText>
        ))}
        {ticks.map((tick) => {
          const tickText = formatPdfSCurveCost(tick, costScale, language)
          const x = xForValue(tick, minX, maxX)
          if (
            shouldHidePdfOrdinaryXTick({
              tickX: x,
              tickText,
              customLabels: xCostLabels,
              fontSize: PDF_SCURVE_TICK_FONT,
            })
          ) {
            return null
          }
          return (
            <SvgText
              key={`xt-${tick}`}
              x={x}
              y={CHART_PLOT_BOTTOM + 11}
              style={{ fontSize: PDF_SCURVE_TICK_FONT, fill: "#7c8796" }}
              textAnchor="middle"
            >
              {tickText}
            </SvgText>
          )
        })}
        {xCostLabels.map((label) => (
          <SvgText
            key={`${label.key}-xcost`}
            x={label.x}
            y={label.y}
            style={{ fontSize: SCURVE_LABEL_FONT, fill: label.color }}
            textAnchor="middle"
          >
            {label.text}
          </SvgText>
        ))}
      </Svg>
      {footnote ? <Text style={styles.footnote}>{footnote}</Text> : null}
    </View>
  )
}

export function OngoingPdfTornadoChart({
  rows,
  language,
}: {
  rows: OngoingPdfTornadoRow[]
  language: AppLanguage
}) {
  if (rows.length === 0) return null
  let maxAbs = 0
  for (const row of rows) {
    maxAbs = Math.max(maxAbs, Math.abs(row.lowImpact), Math.abs(row.highImpact))
  }
  if (maxAbs <= 0) maxAbs = 1
  const half = (TORNADO_BAR_END_X - TORNADO_BAR_START_X) / 2
  const scale = (v: number) => (v / maxAbs) * half
  const height = rows.length * TORNADO_ROW_H + 8
  const amountScale = resolvePdfAmountScale(
    rows.flatMap((r) => [r.lowImpact, r.highImpact]),
  )

  return (
    <View style={styles.chartWrap} wrap={false}>
      <Svg
        viewBox={`0 0 ${TORNADO_W} ${height}`}
        style={{ width: TORNADO_W, height }}
      >
        <Line
          x1={TORNADO_ZERO_X}
          y1={0}
          x2={TORNADO_ZERO_X}
          y2={height}
          stroke="#cbd5e1"
          strokeWidth={0.8}
        />
        {rows.map((row, i) => {
          const y = i * TORNADO_ROW_H + (TORNADO_ROW_H - TORNADO_BAR_H) / 2
          const lowW = Math.abs(scale(row.lowImpact))
          const highW = Math.abs(scale(row.highImpact))
          const name =
            row.name.length > 28 ? `${row.name.slice(0, 27)}…` : row.name
          return [
            <SvgText
              key={`${row.name}-${i}-n`}
              x={8}
              y={y + TORNADO_BAR_H}
              style={{ fontSize: 8, fill: "#334155" }}
            >
              {name}
            </SvgText>,
            <Rect
              key={`${row.name}-${i}-l`}
              x={TORNADO_ZERO_X - lowW}
              y={y}
              width={lowW}
              height={TORNADO_BAR_H}
              fill={TORNADO_P10_COLOR}
            />,
            <Rect
              key={`${row.name}-${i}-h`}
              x={TORNADO_ZERO_X}
              y={y}
              width={highW}
              height={TORNADO_BAR_H}
              fill={TORNADO_P90_COLOR}
            />,
            <SvgText
              key={`${row.name}-${i}-lv`}
              x={TORNADO_ZERO_X - lowW - 4}
              y={y + TORNADO_BAR_H}
              style={{ fontSize: 6, fill: "#64748b", textAnchor: "end" }}
            >
              {formatPdfAbsoluteAmount(row.lowImpact, language, amountScale)}
            </SvgText>,
            <SvgText
              key={`${row.name}-${i}-hv`}
              x={TORNADO_ZERO_X + highW + 4}
              y={y + TORNADO_BAR_H}
              style={{ fontSize: 6, fill: "#64748b" }}
            >
              {formatPdfAbsoluteAmount(row.highImpact, language, amountScale)}
            </SvgText>,
          ]
        })}
      </Svg>
    </View>
  )
}

/**
 * Contribution charts — same presentation prep as the app AttributionWaterfall
 * (Top-6+|Other, cumulative geometry, adaptive monetary labels), rendered via
 * the shared PDF waterfall primitive.
 */
export function OngoingPdfContributionCharts({
  block,
  expectedLabel,
  reserveLabel,
  baseCostLabel,
  p50Label,
  p85Label,
  otherLabel,
  language,
}: {
  block: PdfContributionBlock
  expectedLabel: string
  reserveLabel: string
  baseCostLabel: string
  p50Label: string
  p85Label: string
  otherLabel: string
  language: AppLanguage
}) {
  return (
    <View>
      <Text style={styles.waterfallTitle}>{expectedLabel}</Text>
      <PdfWaterfallChart
        waterfall={block.expectedAddition}
        startLabel={baseCostLabel}
        endLabel={p50Label}
        spanLabel={expectedLabel}
        otherLabel={otherLabel}
        language={language}
        valueFormat="adaptive"
        showTotalSpanBar
      />
      <Text style={[styles.waterfallTitle, { marginTop: 10 }]}>
        {reserveLabel}
      </Text>
      <PdfWaterfallChart
        waterfall={block.uncertaintyReserve}
        startLabel={p50Label}
        endLabel={p85Label}
        spanLabel={reserveLabel}
        otherLabel={otherLabel}
        language={language}
        valueFormat="adaptive"
        showTotalSpanBar
      />
    </View>
  )
}

/** Compact cover / section development sparkline for Base / P50 / P85. */
export function OngoingPdfDevelopmentChart({
  series,
  language,
  labels,
}: {
  series: OngoingDevelopmentSeries
  language: AppLanguage
  labels: { baseCost: string; p50: string; p85: string }
}) {
  const points = series.points
  if (points.length === 0) return null

  const values = points.flatMap((p) =>
    [p.baseCost, p.p50, p.p85].filter(
      (v): v is number => v !== null && Number.isFinite(v),
    ),
  )
  if (values.length === 0) return null
  let minY = Math.min(...values)
  let maxY = Math.max(...values)
  if (minY === maxY) {
    minY -= 1
    maxY += 1
  }
  const plotW = DEV_W - DEV_PAD_L - DEV_PAD_R
  const plotH = DEV_H - DEV_PAD_T - DEV_PAD_B
  const n = points.length
  const xAt = (i: number) =>
    DEV_PAD_L + (n === 1 ? plotW / 2 : (i / (n - 1)) * plotW)
  const yAt = (v: number) =>
    DEV_PAD_T + plotH - ((v - minY) / (maxY - minY || 1)) * plotH

  const linePath = (key: "baseCost" | "p50" | "p85"): string | null => {
    const coords: Array<{ x: number; y: number }> = []
    points.forEach((p, i) => {
      const v = p[key]
      if (v === null || !Number.isFinite(v)) return
      coords.push({ x: xAt(i), y: yAt(v) })
    })
    if (coords.length === 0) return null
    return coords
      .map(
        (c, i) =>
          `${i === 0 ? "M" : "L"} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`,
      )
      .join(" ")
  }

  return (
    <View style={styles.chartWrap} wrap={false}>
      <View style={styles.legendRow}>
        {(
          [
            ["baseCost", labels.baseCost, DEV_COLORS.baseCost],
            ["p50", labels.p50, DEV_COLORS.p50],
            ["p85", labels.p85, DEV_COLORS.p85],
          ] as const
        ).map(([k, label, color]) => (
          <View key={k} style={styles.legendItem}>
            <View style={[styles.legendSwatch, { backgroundColor: color }]} />
            <Text style={styles.legendText}>{label}</Text>
          </View>
        ))}
      </View>
      <Svg
        viewBox={`0 0 ${DEV_W} ${DEV_H}`}
        style={{ width: DEV_W, height: DEV_H }}
      >
        <Line
          x1={DEV_PAD_L}
          y1={DEV_PAD_T + plotH}
          x2={DEV_PAD_L + plotW}
          y2={DEV_PAD_T + plotH}
          stroke="#e2e8f0"
          strokeWidth={0.7}
        />
        {(
          [
            ["baseCost", DEV_COLORS.baseCost],
            ["p50", DEV_COLORS.p50],
            ["p85", DEV_COLORS.p85],
          ] as const
        ).map(([key, color]) => {
          const d = linePath(key)
          return d ? (
            <Path key={key} d={d} stroke={color} strokeWidth={1.4} fill="none" />
          ) : null
        })}
        {points.map((p, i) => (
          <SvgText
            key={p.checkpointId}
            x={xAt(i)}
            y={DEV_H - 4}
            style={{ fontSize: 6.5, fill: "#64748b", textAnchor: "middle" }}
          >
            {`CP${p.sequence}`}
          </SvgText>
        ))}
        <SvgText
          x={2}
          y={DEV_PAD_T + 4}
          style={{ fontSize: 6, fill: "#94a3b8" }}
        >
          {formatPdfAbsoluteAmount(
            maxY,
            language,
            resolvePdfAmountScale([maxY]),
          )}
        </SvgText>
        <SvgText
          x={2}
          y={DEV_PAD_T + plotH}
          style={{ fontSize: 6, fill: "#94a3b8" }}
        >
          {formatPdfAbsoluteAmount(
            minY,
            language,
            resolvePdfAmountScale([minY]),
          )}
        </SvgText>
      </Svg>
    </View>
  )
}
