import {
  Circle,
  Document,
  Line,
  Link,
  Page,
  Path,
  Rect,
  Svg,
  StyleSheet,
  Text,
  Text as SvgText,
  View,
} from "@react-pdf/renderer"
import { useMemo } from "react"
import {
  SCURVE_ASPECT_RATIO,
  SCURVE_CURVE_STROKE_LINECAP,
  SCURVE_CURVE_STROKE_LINEJOIN,
  SCURVE_CURVE_STROKE_WIDTH,
  computeSCurveDisplaySeries,
} from "@/domain/results/sCurveDisplay"
import { formatNumber, type AppLanguage } from "@/domain/results/formatNumber"
import { percentile } from "@/domain/simulation/stats"
import {
  formatPdfAbsoluteAmount,
  formatPdfCorrelationGroupSummary,
  formatPdfRho,
  formatPdfSignedPct,
  pdfCorrelationCellFill,
  resolvePdfAmountScale,
  type PdfAmountScale,
  type PdfContributionBlock,
  type PdfCorrelationSection,
  type PdfCostItemBlock,
  type PdfDriverBlock,
  type PdfImpactOverride,
} from "@/pdf/buildPdfReportModel"
import { PdfWaterfallChart } from "@/pdf/pdfWaterfallChart"
import {
  PDF_SCURVE_GUIDE_STROKE_WIDTH,
  PDF_SCURVE_LABEL_FONT,
  PDF_SCURVE_MARKER_RADIUS,
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
  PDF_A4_PAGE_SIZE,
  PDF_CHAPTER_IDS,
  PDF_SECTION_IDS,
  buildPdfTocChapters,
  formatPdfCoverProjectContext,
  resolvePdfCoverLayout,
  splitPdfMetricValueParts,
  type PdfCoverLayout,
} from "@/pdf/pdfCoverLayout"

type ReportRow = {
  label: string
  values: string[]
}

type ReportColumn = {
  label: string
}

export type PdfProjectBasis = {
  projectName: string
  assumptions: string[]
  costItems: PdfCostItemBlock[]
  drivers: PdfDriverBlock[]
  impactOverrides: PdfImpactOverride[]
  correlation: PdfCorrelationSection
}

type ProjectReportDocumentProps = {
  brandName: string
  title: string
  /** Project display names for cover context and Key Figures columns. */
  projectNames: string[]
  generatedAtLabel: string
  contentsTitle: string
  metricsTitle: string
  metricColumnLabel: string
  columns: ReportColumn[]
  rows: ReportRow[]
  sCurveTitle: string
  sCurveFootnote: string
  sCurveSeries: Array<{
    id: string
    label: string
    values?: readonly number[]
    displayPoints?: readonly { x: number; y: number }[]
    color: string
  }>
  /**
   * Active S-curve marker percentiles from the current Result View snapshot.
   * Defaults to P50/P85 for older call sites / sample PDFs.
   */
  sCurveMarkerPercentiles?: readonly number[]
  uncertaintyPictureTitle: string
  tornadoTitle: string
  tornadoExplanation: string
  tornadoProjects: Array<{
    projectName: string
    rows: Array<{
      name: string
      lowImpact: number
      highImpact: number
    }>
  }>
  contributionTitle: string
  contributionExpectedLabel: string
  contributionReserveLabel: string
  contributionBaseCostLabel: string
  contributionP50Label: string
  contributionP85Label: string
  contributionOtherLabel: string
  contributionBlocks: PdfContributionBlock[]
  analysisBasisTitle: string
  assumptionsTitle: string
  assumptionsEmptyText: string
  estimateUncertaintyTitle: string
  driversTitle: string
  definitionLabel: string
  mostLikelyLabel: string
  impactTitle: string
  impactDefaultNote: string
  impactNoOverrides: string
  impactColDriver: string
  impactColCost: string
  impactColPct: string
  correlationTitle: string
  correlationNone: string
  correlationUnlistedNote: string
  correlationColA: string
  correlationColB: string
  correlationColRho: string
  projectsBasis: PdfProjectBasis[]
  modelRelationshipsTitle: string
  methodTitle: string
  methodParagraphs: string[]
  openAnalysisTitle: string
  openAnalysisHelper: string
  resultsSectionLabel: string
  shareLinkAppendix?: {
    url: string
    linkLabel: string
  } | null
  shareUnavailableNote?: string | null
  footerText?: string
  language: AppLanguage
}

const PAGE_CONTENT_WIDTH = 507
const METRIC_NAME_COL_WIDTH = 140

/**
 * Shared page chrome for cover + body.
 * Outer margins match across the whole report (A4 content width ≈ 595.28 − 2×44).
 */
const styles = StyleSheet.create({
  page: {
    paddingTop: 40,
    paddingRight: 44,
    paddingBottom: 56,
    paddingLeft: 44,
    fontSize: 10,
    fontFamily: "NotoSans",
    color: "#1f2937",
  },
  brand: {
    fontSize: 8,
    fontFamily: "NotoSans",
    fontWeight: "bold",
    color: "#1d868c",
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.7,
  },
  title: {
    fontSize: 17,
    fontFamily: "NotoSans",
    fontWeight: "bold",
    marginBottom: 3,
    color: "#0f172a",
  },
  projectNames: {
    fontSize: 10,
    fontFamily: "NotoSans",
    color: "#475569",
    marginBottom: 2,
    lineHeight: 1.3,
  },
  meta: {
    fontSize: 8.5,
    color: "#64748b",
    marginBottom: 12,
  },
  coverMetricsBlock: {
    marginBottom: 4,
  },
  coverMetricsGroup: {
    marginBottom: 8,
  },
  tocTitle: {
    fontSize: 9,
    fontFamily: "NotoSans",
    fontWeight: "bold",
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginBottom: 6,
  },
  tocLink: {
    textDecoration: "none",
    color: "#334155",
  },
  tocRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginBottom: 4,
  },
  tocLabel: {
    fontSize: 9,
    color: "#334155",
    fontFamily: "NotoSans",
  },
  tocDots: {
    flexGrow: 1,
    borderBottomWidth: 0.6,
    borderBottomColor: "#cbd5e1",
    borderBottomStyle: "dotted",
    marginHorizontal: 4,
    marginBottom: 2,
    minWidth: 12,
  },
  tocPage: {
    fontSize: 9,
    color: "#64748b",
    fontFamily: "NotoSans",
    width: 18,
    textAlign: "right",
  },
  tocSubRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginBottom: 2,
    paddingLeft: 12,
  },
  tocSubLabel: {
    fontSize: 7.5,
    color: "#64748b",
  },
  tocSubPage: {
    fontSize: 7.5,
    color: "#94a3b8",
    width: 18,
    textAlign: "right",
  },
  factorFieldLabel: {
    fontSize: 7,
    color: "#94a3b8",
    marginTop: 3,
    marginBottom: 1,
    textTransform: "uppercase",
    letterSpacing: 0.2,
  },
  percentileRow: {
    flexDirection: "row",
    marginTop: 5,
    width: "100%",
  },
  percentileCell: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
    paddingRight: 8,
  },
  percentileLabel: {
    fontSize: 7,
    color: "#94a3b8",
    textTransform: "uppercase",
    letterSpacing: 0.2,
    marginBottom: 2,
  },
  percentileValue: {
    fontSize: 9,
    color: "#0f172a",
  },
  methodPara: {
    fontSize: 9,
    color: "#475569",
    lineHeight: 1.45,
    marginBottom: 6,
    width: PAGE_CONTENT_WIDTH,
  },
  sectionTitle: {
    fontSize: 9.5,
    fontFamily: "NotoSans",
    fontWeight: "bold",
    marginBottom: 8,
    marginTop: 2,
    textTransform: "uppercase",
    color: "#334155",
    letterSpacing: 0.3,
  },
  /** Shared typography for all numbered chapter headings (01–06). */
  majorSectionTitle: {
    fontSize: 12,
    fontFamily: "NotoSans",
    fontWeight: "bold",
    marginBottom: 10,
    marginTop: 2,
    color: "#0f172a",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  projectHeading: {
    fontSize: 10.5,
    fontFamily: "NotoSans",
    fontWeight: "bold",
    color: "#1e293b",
    marginBottom: 8,
    marginTop: 8,
  },
  sectionBlock: {
    marginBottom: 12,
  },
  sectionFootnote: {
    fontSize: 7.5,
    color: "#64748b",
    marginTop: 5,
    lineHeight: 1.35,
  },
  bodyMuted: {
    fontSize: 8.5,
    color: "#64748b",
    lineHeight: 1.4,
    marginBottom: 6,
  },
  bodyText: {
    fontSize: 9,
    color: "#374151",
    lineHeight: 1.4,
    marginBottom: 4,
  },
  table: {
    width: PAGE_CONTENT_WIDTH,
    borderTopWidth: 0.75,
    borderTopColor: "#cbd5e1",
    borderBottomWidth: 0.75,
    borderBottomColor: "#cbd5e1",
  },
  row: {
    flexDirection: "row",
    alignItems: "stretch",
    borderBottomWidth: 0.5,
    borderBottomColor: "#e2e8f0",
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  headerRow: {
    backgroundColor: "#f8fafc",
  },
  headerCell: {
    fontFamily: "NotoSans",
    fontWeight: "bold",
    color: "#475569",
    fontSize: 8,
  },
  metricNameCell: {
    width: METRIC_NAME_COL_WIDTH,
    flexGrow: 0,
    flexShrink: 0,
    justifyContent: "center",
    paddingVertical: 6,
    paddingHorizontal: 6,
  },
  metricValueCell: {
    flexGrow: 1,
    flexShrink: 1,
    alignItems: "flex-end",
    justifyContent: "center",
    paddingVertical: 6,
    paddingHorizontal: 6,
  },
  metricLabel: {
    fontSize: 9,
    color: "#334155",
  },
  metricValue: {
    fontSize: 9,
    textAlign: "right",
    color: "#0f172a",
    fontFamily: "NotoSans",
    fontWeight: "normal",
  },
  legendRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 4,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 10,
    marginBottom: 2,
  },
  legendDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    marginRight: 4,
  },
  legendText: {
    fontSize: 8,
    color: "#475569",
  },
  chartWrap: {
    width: "100%",
    marginTop: 2,
  },
  tornadoProjectBlock: {
    marginBottom: 12,
  },
  tornadoProjectTitle: {
    fontSize: 9,
    fontFamily: "NotoSans",
    fontWeight: "bold",
    color: "#334155",
    marginBottom: 4,
  },
  tornadoProjectHint: {
    marginBottom: 4,
  },
  tornadoProjectHintRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  tornadoProjectHintItem: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 10,
  },
  tornadoProjectHintPill: {
    width: 8,
    height: 5,
    borderRadius: 1,
    marginRight: 3,
  },
  tornadoProjectHintText: {
    fontSize: 7.5,
    color: "#64748b",
  },
  tornadoChartWrap: {
    width: "100%",
  },
  noDataText: {
    fontSize: 9,
    color: "#94a3b8",
  },
  factorBlock: {
    marginBottom: 0,
    paddingTop: 6,
    paddingBottom: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: "#e8edf3",
  },
  factorName: {
    fontSize: 10,
    fontFamily: "NotoSans",
    fontWeight: "bold",
    color: "#0f172a",
    marginBottom: 2,
  },
  factorDescription: {
    fontSize: 8.5,
    color: "#64748b",
    lineHeight: 1.35,
    marginBottom: 3,
  },
  factorAssessmentLabel: {
    fontSize: 7,
    color: "#94a3b8",
    marginTop: 2,
    marginBottom: 1,
    textTransform: "uppercase",
    letterSpacing: 0.2,
  },
  factorAssessment: {
    fontSize: 8.5,
    color: "#475569",
    lineHeight: 1.35,
    marginBottom: 4,
  },
  factorMeta: {
    fontSize: 8,
    color: "#334155",
    marginTop: 2,
  },
  assumptionItem: {
    fontSize: 9,
    color: "#374151",
    lineHeight: 1.4,
    marginBottom: 3,
  },
  compactTable: {
    width: PAGE_CONTENT_WIDTH,
    borderTopWidth: 0.6,
    borderTopColor: "#cbd5e1",
    borderBottomWidth: 0.6,
    borderBottomColor: "#cbd5e1",
    marginTop: 4,
    marginBottom: 4,
  },
  compactHeader: {
    flexDirection: "row",
    backgroundColor: "#f8fafc",
    borderBottomWidth: 0.5,
    borderBottomColor: "#e2e8f0",
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  compactRow: {
    flexDirection: "row",
    borderBottomWidth: 0.4,
    borderBottomColor: "#eef2f6",
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  compactCell: {
    fontSize: 8,
    color: "#334155",
  },
  compactCellBold: {
    fontSize: 8,
    fontFamily: "NotoSans",
    fontWeight: "bold",
    color: "#475569",
  },
  contribBlock: {
    marginBottom: 10,
  },
  contribSubtitle: {
    fontSize: 8.5,
    fontFamily: "NotoSans",
    fontWeight: "bold",
    color: "#475569",
    marginBottom: 3,
    marginTop: 4,
  },
  methodBullet: {
    fontSize: 8.5,
    color: "#475569",
    lineHeight: 1.4,
    marginBottom: 3,
  },
  openBlock: {
    marginTop: 6,
    paddingTop: 10,
    borderTopWidth: 0.75,
    borderTopColor: "#cbd5e1",
  },
  openLink: {
    fontSize: 8,
    color: "#1d868c",
    fontFamily: "NotoSans",
    fontWeight: "normal",
    marginTop: 6,
    textDecoration: "underline",
  },
  corrSummary: {
    fontSize: 8,
    color: "#475569",
    marginBottom: 6,
    lineHeight: 1.35,
  },
  corrMatrix: {
    marginTop: 2,
    marginBottom: 4,
  },
  corrMatrixRow: {
    flexDirection: "row",
  },
  corrCorner: {
    width: 72,
    height: 16,
  },
  corrHeaderCell: {
    width: 36,
    height: 28,
    justifyContent: "flex-end",
    paddingBottom: 2,
    borderBottomWidth: 0.4,
    borderBottomColor: "#cbd5e1",
  },
  corrHeaderText: {
    fontSize: 5.5,
    color: "#64748b",
    textAlign: "center",
  },
  corrRowLabel: {
    width: 72,
    height: 14,
    justifyContent: "center",
    paddingRight: 3,
    borderRightWidth: 0.4,
    borderRightColor: "#cbd5e1",
  },
  corrRowLabelText: {
    fontSize: 6,
    color: "#475569",
    textAlign: "right",
  },
  corrCell: {
    width: 36,
    height: 14,
    justifyContent: "center",
    alignItems: "center",
    borderBottomWidth: 0.3,
    borderBottomColor: "#e8edf3",
    borderRightWidth: 0.3,
    borderRightColor: "#e8edf3",
  },
  corrCellText: {
    fontSize: 6.5,
    color: "#334155",
    textAlign: "center",
  },
  pageFooterLeft: {
    position: "absolute",
    bottom: 20,
    left: 44,
    fontSize: 7,
    color: "#cbd5e1",
  },
  pageFooterRight: {
    position: "absolute",
    bottom: 20,
    right: 44,
    fontSize: 7,
    color: "#cbd5e1",
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
const CURVE_BOTTOM_PAD = CHART_PAD_Y
const CHART_PLOT_TOP = CURVE_TOP_PAD
const CHART_PLOT_BOTTOM = CHART_H - CURVE_BOTTOM_PAD
const CHART_INNER_H = CHART_PLOT_BOTTOM - CHART_PLOT_TOP
const CHART_GRID_STROKE = "#e8edf3"
const CHART_GRID_WIDTH = 0.55
const CHART_AXIS_TICK_FONT = 7
const CHART_AXIS_TICK_FILL = "#7c8796"
const CHART_AXIS_EMPHASIS_FILL = "#334155"
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
const TORNADO_BAR_COL_X = TORNADO_LABEL_COL_W
const TORNADO_BAR_PAD_X = 8
const TORNADO_VALUE_LABEL_GUTTER = 34
const TORNADO_BAR_START_X = TORNADO_BAR_COL_X + TORNADO_BAR_PAD_X + TORNADO_VALUE_LABEL_GUTTER
const TORNADO_BAR_END_X = TORNADO_W - TORNADO_BAR_PAD_X - TORNADO_VALUE_LABEL_GUTTER
const TORNADO_ZERO_X = (TORNADO_BAR_START_X + TORNADO_BAR_END_X) / 2
const TORNADO_ROW_H = 16
const TORNADO_BAR_H = 6
const TORNADO_LABEL_X = 8
const TORNADO_FONT_SIZE = 7
const TORNADO_FACTOR_FONT_SIZE = 8
const TORNADO_BAR_RADIUS = TORNADO_BAR_H / 2
const TORNADO_VALUE_LABEL_GAP = 6
const TORNADO_VALUE_LABEL_PAD = 3
const TORNADO_P10_COLOR = "#7a9181"
const TORNADO_P90_COLOR = "#7680ac"

/** Place S-curve on page 1 only when the metrics table stays compact. */
export const PDF_COVER_ALWAYS_ONE_PAGE = true

/** @deprecated S-curve is never on the cover; kept only if external imports remain. */
export const PDF_SCURVE_ON_PAGE1_MAX_PROJECTS = 0

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
  const nx = (value - minX) / spanX
  return CHART_PLOT_LEFT + nx * CHART_INNER_W
}

function yForProbability(p: number): number {
  return CHART_PLOT_BOTTOM - p * CHART_INNER_H
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
  let step = niceTickStep(span / 7)
  let start = Math.floor(minX / step) * step
  let end = Math.ceil(maxX / step) * step
  const ticks: number[] = []
  let guard = 0
  for (let x = start; x <= end + step * 1e-6 && guard < 24; x += step, guard++) {
    ticks.push(x)
  }
  if (ticks.length > 12) {
    step *= 2
    start = Math.floor(minX / step) * step
    end = Math.ceil(maxX / step) * step
    ticks.length = 0
    guard = 0
    for (let x = start; x <= end + step * 1e-6 && guard < 24; x += step, guard++) {
      ticks.push(x)
    }
  }
  return ticks
}

function formatSignedMillions(value: number): string {
  if (!Number.isFinite(value)) return "—"
  const sign = value >= 0 ? "+" : "-"
  const millions = Math.abs(value) / 1_000_000
  const rounded = millions < 0.05 ? 0 : Math.round(millions * 10) / 10
  const body = formatNumber(rounded, Number.isInteger(rounded) ? 0 : 1, "en")
  return `${sign}${body}M`
}

function PdfPageFooter({ footerText }: { footerText?: string }) {
  return (
    <>
      <Text fixed style={styles.pageFooterLeft}>
        {footerText ?? ""}
      </Text>
      <Text
        fixed
        style={styles.pageFooterRight}
        render={({ pageNumber, totalPages }) => `${pageNumber}/${totalPages}`}
      />
    </>
  )
}

function MetricsTable({
  metricColumnLabel,
  columns,
  rows,
  layout,
}: {
  metricColumnLabel: string
  columns: ReportColumn[]
  rows: ReportRow[]
  layout: PdfCoverLayout
}) {
  const safeProjectCount = Math.max(columns.length, 1)
  const nameW = layout.metricNameColWidth
  const valueColWidth = (PAGE_CONTENT_WIDTH - nameW) / safeProjectCount
  const fontSize = layout.metricFontSize
  const padV = layout.cellPaddingVertical
  const padH = layout.cellPaddingHorizontal

  return (
    <View style={styles.table} wrap={false}>
      <View style={[styles.row, styles.headerRow]} wrap={false}>
        <View
          style={[
            styles.metricNameCell,
            {
              width: nameW,
              paddingVertical: padV,
              paddingHorizontal: padH,
            },
          ]}
        >
          <Text style={[styles.headerCell, { fontSize }]} wrap={false}>
            {metricColumnLabel}
          </Text>
        </View>
        {columns.map((column, idx) => (
          <View
            key={`${column.label}-${idx}`}
            style={[
              styles.metricValueCell,
              {
                width: valueColWidth,
                flexGrow: 0,
                paddingVertical: padV,
                paddingHorizontal: padH,
              },
            ]}
          >
            <Text
              style={[styles.headerCell, { fontSize, textAlign: "right" }]}
              wrap={layout.allowHeaderWrap}
            >
              {column.label}
            </Text>
          </View>
        ))}
      </View>
      {rows.map((row, rowIdx) => (
        <View
          key={`${row.label}-${rowIdx}`}
          style={rowIdx === rows.length - 1 ? [styles.row, styles.rowLast] : styles.row}
          wrap={false}
        >
          <View
            style={[
              styles.metricNameCell,
              {
                width: nameW,
                paddingVertical: padV,
                paddingHorizontal: padH,
              },
            ]}
          >
            <Text style={[styles.metricLabel, { fontSize }]} wrap={false}>
              {row.label}
            </Text>
          </View>
          {row.values.map((value, idx) => {
            const parts = splitPdfMetricValueParts(value)
            return (
              <View
                key={`${row.label}-v-${idx}`}
                style={[
                  styles.metricValueCell,
                  {
                    width: valueColWidth,
                    flexGrow: 0,
                    paddingVertical: padV,
                    paddingHorizontal: padH,
                  },
                ]}
              >
                <Text style={[styles.metricValue, { fontSize }]} wrap={false}>
                  {parts.absolute}
                </Text>
                {parts.percent ? (
                  <Text
                    style={[
                      styles.metricValue,
                      { fontSize: layout.metricPctFontSize, marginTop: 1 },
                    ]}
                    wrap={false}
                  >
                    {parts.percent}
                  </Text>
                ) : null}
              </View>
            )
          })}
        </View>
      ))}
    </View>
  )
}

function CoverKeyFigures({
  metricColumnLabel,
  columns,
  rows,
  metricsTitle,
  layout,
}: {
  metricColumnLabel: string
  columns: ReportColumn[]
  rows: ReportRow[]
  metricsTitle: string
  layout: PdfCoverLayout
}) {
  return (
    <View style={styles.coverMetricsBlock} wrap={false}>
      <Text style={styles.sectionTitle}>{metricsTitle}</Text>
      <MetricsTable
        metricColumnLabel={metricColumnLabel}
        columns={columns}
        rows={rows}
        layout={layout}
      />
    </View>
  )
}

function TocBlock({
  title,
  chapters,
  pageRefs,
  layout,
}: {
  title: string
  chapters: ReturnType<typeof buildPdfTocChapters>
  pageRefs: Map<string, number>
  layout: PdfCoverLayout
}) {
  return (
    <View style={{ marginTop: layout.tocTopMargin }} wrap={false}>
      <Text style={styles.tocTitle}>{title}</Text>
      {chapters.map((chapter) => (
        <View key={chapter.id} wrap={false}>
          <Link src={`#${chapter.id}`} style={styles.tocLink}>
            <View style={[styles.tocRow, { marginBottom: layout.tocRowGap }]} wrap={false}>
              <Text style={styles.tocLabel}>{chapter.label}</Text>
              <View style={styles.tocDots} />
              <Text
                style={styles.tocPage}
                render={() => {
                  const n = pageRefs.get(chapter.id)
                  return n != null ? String(n) : "—"
                }}
              />
            </View>
          </Link>
          {chapter.subsections?.map((sub) => (
            <Link key={sub.id} src={`#${sub.id}`} style={styles.tocLink}>
              <View
                style={[styles.tocSubRow, { marginBottom: Math.max(1.5, layout.tocRowGap - 1) }]}
                wrap={false}
              >
                <Text style={styles.tocSubLabel}>{sub.label}</Text>
                <View style={styles.tocDots} />
                <Text
                  style={styles.tocSubPage}
                  render={() => {
                    const n = pageRefs.get(sub.id)
                    return n != null ? String(n) : "—"
                  }}
                />
              </View>
            </Link>
          ))}
        </View>
      ))}
    </View>
  )
}

function ChapterTitle({
  id,
  label,
  pageRefs,
  minPresenceAhead,
}: {
  id: string
  label: string
  pageRefs: Map<string, number>
  minPresenceAhead?: number
}) {
  return (
    <Text
      id={id}
      style={styles.majorSectionTitle}
      minPresenceAhead={minPresenceAhead}
      render={({ pageNumber }) => {
        pageRefs.set(id, pageNumber)
        return label
      }}
    />
  )
}

function SectionTitle({
  id,
  label,
  pageRefs,
  minPresenceAhead = 72,
}: {
  id?: string
  label: string
  pageRefs?: Map<string, number>
  minPresenceAhead?: number
}) {
  if (id && pageRefs) {
    return (
      <Text
        id={id}
        style={styles.sectionTitle}
        minPresenceAhead={minPresenceAhead}
        wrap={false}
        render={({ pageNumber }) => {
          pageRefs.set(id, pageNumber)
          return label
        }}
      />
    )
  }
  return (
    <Text style={styles.sectionTitle} minPresenceAhead={minPresenceAhead} wrap={false}>
      {label}
    </Text>
  )
}

function SCurveSection({
  title,
  footnote,
  curves,
  minX,
  maxX,
  sCurveXAxisTicks,
  language,
  pageRefs,
}: {
  title: string
  footnote: string
  curves: Array<{
    id: string
    label: string
    color: string
    points: Array<{ x: number; y: number }>
    markers: Array<{ percentile: number; value: number }>
  }>
  minX: number
  maxX: number
  sCurveXAxisTicks: number[]
  language: AppLanguage
  pageRefs?: Map<string, number>
}) {
  const multi = curves.length > 1
  // Classic semantics: one chart-level cost scale for ticks AND percentile costs.
  const costScale = resolvePdfSCurveCostScale(minX, maxX)
  const guides = buildPdfClassicGuides({
    curves: curves.map((curve, index) => ({
      id: curve.id,
      color: curve.color,
      index,
      markers: curve.markers,
    })),
    minX,
    maxX,
    geometry: SCURVE_PDF_GEOMETRY,
  })
  const yEmphasized = layoutPdfClassicYLabels(
    uniquePdfMarkerPercentiles(curves),
    SCURVE_PDF_GEOMETRY,
  )
  const yOrdinaryTicks = layoutPdfClassicOrdinaryYTicks(yEmphasized, SCURVE_PDF_GEOMETRY)
  const xCostLabels = layoutPdfClassicXCostLabels({
    guides,
    scale: costScale,
    language,
    geometry: SCURVE_PDF_GEOMETRY,
  })
  const yEmphasizedFill = multi ? CHART_AXIS_EMPHASIS_FILL : curves[0]?.color

  return (
    <View style={styles.sectionBlock} wrap={false}>
      <SectionTitle id={PDF_SECTION_IDS.sCurve} label={title} pageRefs={pageRefs} />
      {curves.length > 0 ? (
        <>
          {multi ? (
            <View style={styles.legendRow}>
              {curves.map((curve) => (
                <View key={curve.id} style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: curve.color }]} />
                  <Text style={styles.legendText}>{curve.label}</Text>
                </View>
              ))}
            </View>
          ) : null}
          <View style={styles.chartWrap}>
            <Svg
              width="100%"
              height={CHART_H * (PAGE_CONTENT_WIDTH / CHART_W)}
              viewBox={`0 0 ${CHART_W} ${CHART_H}`}
            >
              {CHART_Y_PROB_TICKS.map((p) => (
                <Line
                  key={`yg-${p}`}
                  x1={CHART_PLOT_LEFT}
                  x2={CHART_PLOT_RIGHT}
                  y1={yForProbability(p)}
                  y2={yForProbability(p)}
                  stroke={CHART_GRID_STROKE}
                  strokeWidth={CHART_GRID_WIDTH}
                />
              ))}
              {sCurveXAxisTicks.map((xv) => (
                <Line
                  key={`xg-${xv}`}
                  x1={xForValue(xv, minX, maxX)}
                  x2={xForValue(xv, minX, maxX)}
                  y1={CHART_PLOT_TOP}
                  y2={CHART_PLOT_BOTTOM}
                  stroke={CHART_GRID_STROKE}
                  strokeWidth={CHART_GRID_WIDTH}
                />
              ))}
              {curves.map((curve) => (
                <Path
                  key={`${curve.id}-path`}
                  d={pathFromPoints(curve.points, minX, maxX)}
                  stroke={curve.color}
                  strokeWidth={SCURVE_CURVE_STROKE_WIDTH}
                  strokeLinecap={SCURVE_CURVE_STROKE_LINECAP}
                  strokeLinejoin={SCURVE_CURVE_STROKE_LINEJOIN}
                  fill="none"
                />
              ))}
              {guides.flatMap((g) => [
                <Path
                  key={`${g.projectId}-p${g.percentile}-lguide`}
                  d={g.path}
                  stroke={g.color}
                  strokeWidth={PDF_SCURVE_GUIDE_STROKE_WIDTH}
                  strokeDasharray={g.dash}
                  fill="none"
                />,
                <Circle
                  key={`${g.projectId}-p${g.percentile}-dot`}
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
                  style={{ fontSize: CHART_AXIS_TICK_FONT, fill: CHART_AXIS_TICK_FILL }}
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
                  style={{ fontSize: SCURVE_LABEL_FONT, fill: yEmphasizedFill }}
                  textAnchor="end"
                >
                  {label.text}
                </SvgText>
              ))}
              {sCurveXAxisTicks.map((xv) => {
                const tickText = formatPdfSCurveCost(xv, costScale, language)
                const tickX = xForValue(xv, minX, maxX)
                if (
                  shouldHidePdfOrdinaryXTick({
                    tickX,
                    tickText,
                    customLabels: xCostLabels,
                    fontSize: CHART_AXIS_TICK_FONT,
                  })
                ) {
                  return null
                }
                return (
                  <SvgText
                    key={`xlab-${xv}`}
                    x={tickX}
                    y={CHART_PLOT_BOTTOM + 11}
                    style={{ fontSize: CHART_AXIS_TICK_FONT, fill: CHART_AXIS_TICK_FILL }}
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
          </View>
        </>
      ) : (
        <Text style={styles.noDataText}>No S-curve data available.</Text>
      )}
      <Text style={styles.sectionFootnote}>{footnote}</Text>
    </View>
  )
}

function TornadoSection({
  title,
  explanation,
  tornadoProjects,
  tornadoScale,
  pageRefs,
}: {
  title: string
  explanation: string
  tornadoProjects: ProjectReportDocumentProps["tornadoProjects"]
  tornadoScale: (value: number) => number
  pageRefs?: Map<string, number>
}) {
  return (
    <View style={styles.sectionBlock}>
      <SectionTitle id={PDF_SECTION_IDS.tornado} label={title} pageRefs={pageRefs} />
      <Text style={styles.bodyMuted}>{explanation}</Text>
      {tornadoProjects.map((project, projectIdx) => {
        const chartHeight = Math.max(1, project.rows.length) * TORNADO_ROW_H
        return (
          <View
            key={`${project.projectName}-${projectIdx}`}
            style={styles.tornadoProjectBlock}
            wrap={false}
          >
            <Text style={styles.tornadoProjectTitle}>{project.projectName}</Text>
            <View style={[styles.tornadoProjectHint, styles.tornadoProjectHintRow]}>
              <View style={styles.tornadoProjectHintItem}>
                <View
                  style={[styles.tornadoProjectHintPill, { backgroundColor: TORNADO_P10_COLOR }]}
                />
                <Text style={styles.tornadoProjectHintText}>P10</Text>
              </View>
              <View style={styles.tornadoProjectHintItem}>
                <View
                  style={[styles.tornadoProjectHintPill, { backgroundColor: TORNADO_P90_COLOR }]}
                />
                <Text style={styles.tornadoProjectHintText}>P90</Text>
              </View>
            </View>
            {project.rows.length > 0 ? (
              <View style={styles.tornadoChartWrap}>
                <Svg
                  width="100%"
                  height={chartHeight * (PAGE_CONTENT_WIDTH / TORNADO_W)}
                  viewBox={`0 0 ${TORNADO_W} ${chartHeight}`}
                >
                  <Line
                    x1={TORNADO_ZERO_X}
                    x2={TORNADO_ZERO_X}
                    y1={0}
                    y2={chartHeight}
                    stroke="#cbd5e1"
                    strokeWidth={0.9}
                  />
                  {project.rows.flatMap((row, rowIdx) => {
                    const y = rowIdx * TORNADO_ROW_H + (TORNADO_ROW_H - TORNADO_BAR_H) / 2
                    const leftW = Math.max(0, Math.abs(tornadoScale(row.lowImpact)))
                    const rightW = Math.max(0, Math.abs(tornadoScale(row.highImpact)))
                    const lowLabelX = Math.max(
                      TORNADO_BAR_START_X + TORNADO_VALUE_LABEL_PAD,
                      TORNADO_ZERO_X - leftW - TORNADO_VALUE_LABEL_GAP,
                    )
                    const highLabelX = Math.min(
                      TORNADO_BAR_END_X - TORNADO_VALUE_LABEL_PAD,
                      TORNADO_ZERO_X + rightW + TORNADO_VALUE_LABEL_GAP,
                    )
                    const keyBase = `${project.projectName}-${row.name}-${rowIdx}`
                    return [
                      <Rect
                        key={`${keyBase}-lo`}
                        x={TORNADO_ZERO_X - leftW}
                        y={y}
                        width={leftW}
                        height={TORNADO_BAR_H}
                        rx={TORNADO_BAR_RADIUS}
                        ry={TORNADO_BAR_RADIUS}
                        fill={TORNADO_P10_COLOR}
                      />,
                      <SvgText
                        key={`${keyBase}-lo-lab`}
                        x={lowLabelX}
                        y={y + TORNADO_BAR_H / 2}
                        style={{ fontSize: TORNADO_FONT_SIZE, fill: "#475569" }}
                        textAnchor="end"
                        dominantBaseline="middle"
                      >
                        {formatSignedMillions(row.lowImpact)}
                      </SvgText>,
                      <Rect
                        key={`${keyBase}-hi`}
                        x={TORNADO_ZERO_X}
                        y={y}
                        width={rightW}
                        height={TORNADO_BAR_H}
                        rx={TORNADO_BAR_RADIUS}
                        ry={TORNADO_BAR_RADIUS}
                        fill={TORNADO_P90_COLOR}
                        fillOpacity={0.58}
                      />,
                      <SvgText
                        key={`${keyBase}-hi-lab`}
                        x={highLabelX}
                        y={y + TORNADO_BAR_H / 2}
                        style={{ fontSize: TORNADO_FONT_SIZE, fill: "#475569" }}
                        textAnchor="start"
                        dominantBaseline="middle"
                      >
                        {formatSignedMillions(row.highImpact)}
                      </SvgText>,
                      <SvgText
                        key={`${keyBase}-name`}
                        x={TORNADO_LABEL_X}
                        y={y + TORNADO_BAR_H / 2}
                        style={{ fontSize: TORNADO_FACTOR_FONT_SIZE, fill: "#374151" }}
                        dominantBaseline="middle"
                      >
                        {row.name.length > 36 ? `${row.name.slice(0, 35)}…` : row.name}
                      </SvgText>,
                    ]
                  })}
                </Svg>
              </View>
            ) : (
              <Text style={styles.noDataText}>No tornado data available.</Text>
            )}
          </View>
        )
      })}
    </View>
  )
}

function PercentileTriplet({
  p10Value,
  mostLikelyValue,
  p90Value,
  mostLikelyLabel,
}: {
  p10Value: string
  mostLikelyValue: string
  p90Value: string
  mostLikelyLabel: string
}) {
  return (
    <View style={styles.percentileRow} wrap={false}>
      <View style={styles.percentileCell}>
        <Text style={styles.percentileLabel} wrap={false}>
          P10
        </Text>
        <Text style={styles.percentileValue} wrap={false}>
          {p10Value}
        </Text>
      </View>
      <View style={styles.percentileCell}>
        <Text style={styles.percentileLabel} wrap={false}>
          {mostLikelyLabel}
        </Text>
        <Text style={styles.percentileValue} wrap={false}>
          {mostLikelyValue}
        </Text>
      </View>
      <View style={styles.percentileCell}>
        <Text style={styles.percentileLabel} wrap={false}>
          P90
        </Text>
        <Text style={styles.percentileValue} wrap={false}>
          {p90Value}
        </Text>
      </View>
    </View>
  )
}

function CostItemBlocks({
  items,
  language,
  amountScale,
  mostLikelyLabel,
}: {
  items: PdfCostItemBlock[]
  language: AppLanguage
  amountScale: PdfAmountScale
  mostLikelyLabel: string
}) {
  return (
    <>
      {items.map((item, idx) => (
        <View
          key={`${item.name}-${idx}`}
          style={styles.factorBlock}
          wrap={false}
          minPresenceAhead={72}
        >
          <Text style={styles.factorName} wrap={false}>
            {item.name}
          </Text>
          {item.description ? (
            <Text style={styles.factorDescription}>{item.description}</Text>
          ) : null}
          <PercentileTriplet
            mostLikelyLabel={mostLikelyLabel}
            p10Value={formatPdfSignedPct(item.optimisticPct, language)}
            mostLikelyValue={formatPdfAbsoluteAmount(item.mostLikely, language, amountScale)}
            p90Value={formatPdfSignedPct(item.pessimisticPct, language)}
          />
        </View>
      ))}
    </>
  )
}

function DriverBlocks({
  items,
  language,
  definitionLabel,
  mostLikelyLabel,
}: {
  items: PdfDriverBlock[]
  language: AppLanguage
  definitionLabel: string
  mostLikelyLabel: string
}) {
  return (
    <>
      {items.map((item, idx) => (
        <View
          key={`${item.name}-${idx}`}
          style={styles.factorBlock}
          wrap={false}
          minPresenceAhead={84}
        >
          <Text style={styles.factorName} wrap={false}>
            {item.name}
          </Text>
          {item.description ? (
            <View wrap={false}>
              <Text style={styles.factorFieldLabel}>{definitionLabel}</Text>
              <Text style={styles.factorDescription}>{item.description}</Text>
            </View>
          ) : null}
          <PercentileTriplet
            mostLikelyLabel={mostLikelyLabel}
            p10Value={formatPdfSignedPct(item.optimisticPct, language)}
            mostLikelyValue={formatPdfSignedPct(item.mostLikely, language)}
            p90Value={formatPdfSignedPct(item.pessimisticPct, language)}
          />
        </View>
      ))}
    </>
  )
}

function ImpactOverridesTable({
  overrides,
  defaultNote,
  noOverrides,
  colDriver,
  colCost,
  colPct,
}: {
  overrides: PdfImpactOverride[]
  defaultNote: string
  noOverrides: string
  colDriver: string
  colCost: string
  colPct: string
}) {
  const driverW = PAGE_CONTENT_WIDTH * 0.34
  const costW = PAGE_CONTENT_WIDTH * 0.46
  const pctW = PAGE_CONTENT_WIDTH * 0.2

  return (
    <View>
      <Text style={styles.bodyMuted}>{defaultNote}</Text>
      {overrides.length === 0 ? (
        <Text style={styles.bodyText}>{noOverrides}</Text>
      ) : (
        <View style={styles.compactTable} wrap={false}>
          <View style={styles.compactHeader} wrap={false}>
            <Text style={[styles.compactCellBold, { width: driverW }]} wrap={false}>
              {colDriver}
            </Text>
            <Text style={[styles.compactCellBold, { width: costW }]} wrap={false}>
              {colCost}
            </Text>
            <Text
              style={[styles.compactCellBold, { width: pctW, textAlign: "right" }]}
              wrap={false}
            >
              {colPct}
            </Text>
          </View>
          {overrides.map((row, idx) => (
            <View
              key={`${row.driverName}-${row.costItemName}-${idx}`}
              style={styles.compactRow}
              wrap={false}
            >
              <Text style={[styles.compactCell, { width: driverW }]} wrap={false}>
                {row.driverName}
              </Text>
              <Text style={[styles.compactCell, { width: costW }]} wrap={false}>
                {row.costItemName}
              </Text>
              <Text style={[styles.compactCell, { width: pctW, textAlign: "right" }]} wrap={false}>
                {`${row.impactPct} %`}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  )
}

function CorrelationBlock({
  section,
  noneText,
  unlistedNote,
  colA,
  colB,
  colRho,
  language,
}: {
  section: PdfCorrelationSection
  noneText: string
  unlistedNote: string
  colA: string
  colB: string
  colRho: string
  language: AppLanguage
}) {
  if (section.kind === "none") {
    return <Text style={styles.bodyText}>{noneText}</Text>
  }

  const summary =
    section.groupSummary != null
      ? formatPdfCorrelationGroupSummary(section.groupSummary, language)
      : null

  if (section.kind === "pairs") {
    const aW = PAGE_CONTENT_WIDTH * 0.4
    const bW = PAGE_CONTENT_WIDTH * 0.4
    const rW = PAGE_CONTENT_WIDTH * 0.2
    return (
      <View wrap={false}>
        {summary ? <Text style={styles.corrSummary}>{summary}</Text> : null}
        <View style={styles.compactTable}>
          <View style={styles.compactHeader} wrap={false}>
            <Text style={[styles.compactCellBold, { width: aW }]} wrap={false}>
              {colA}
            </Text>
            <Text style={[styles.compactCellBold, { width: bW }]} wrap={false}>
              {colB}
            </Text>
            <Text style={[styles.compactCellBold, { width: rW, textAlign: "right" }]} wrap={false}>
              {colRho}
            </Text>
          </View>
          {section.pairs.map((p, idx) => (
            <View
              key={`${p.costItemAName}-${p.costItemBName}-${idx}`}
              style={styles.compactRow}
              wrap={false}
            >
              <Text style={[styles.compactCell, { width: aW }]} wrap={false}>
                {p.costItemAName}
              </Text>
              <Text style={[styles.compactCell, { width: bW }]} wrap={false}>
                {p.costItemBName}
              </Text>
              <Text style={[styles.compactCell, { width: rW, textAlign: "right" }]} wrap={false}>
                {formatPdfRho(p.rho, language)}
              </Text>
            </View>
          ))}
        </View>
        <Text style={styles.sectionFootnote}>{unlistedNote}</Text>
      </View>
    )
  }

  const n = section.names.length
  const labelW = Math.min(
    56,
    Math.max(28, Math.floor(PAGE_CONTENT_WIDTH * (n >= 12 ? 0.08 : 0.12))),
  )
  const cellW = Math.max(16, Math.floor((PAGE_CONTENT_WIDTH - labelW) / Math.max(n, 1)))
  const headerFont = n > 12 ? 4 : n > 9 ? 4.5 : 5.5
  const cellFont = n > 12 ? 5 : n > 9 ? 5.5 : 6.5
  const rowH = n > 12 ? 10 : n > 9 ? 11 : 13
  const maxLabelChars = n > 12 ? 5 : n > 9 ? 7 : 10

  return (
    <View wrap={false}>
      {summary ? <Text style={styles.corrSummary}>{summary}</Text> : null}
      <View style={styles.corrMatrix}>
        <View style={styles.corrMatrixRow}>
          <View style={[styles.corrCorner, { width: labelW, height: rowH + 10 }]} />
          {section.names.map((name, j) => (
            <View
              key={`h-${j}`}
              style={[styles.corrHeaderCell, { width: cellW, height: rowH + 10 }]}
            >
              <Text style={[styles.corrHeaderText, { fontSize: headerFont }]}>
                {name.length > maxLabelChars ? `${name.slice(0, maxLabelChars - 1)}…` : name}
              </Text>
            </View>
          ))}
        </View>
        {section.names.map((rowName, i) => (
          <View key={`r-${i}`} style={styles.corrMatrixRow}>
            <View style={[styles.corrRowLabel, { width: labelW, height: rowH }]}>
              <Text style={[styles.corrRowLabelText, { fontSize: headerFont }]}>
                {rowName.length > maxLabelChars + 2
                  ? `${rowName.slice(0, maxLabelChars + 1)}…`
                  : rowName}
              </Text>
            </View>
            {section.names.map((_, j) => {
              const v = section.cells[i]?.[j] ?? (i === j ? 1 : 0)
              const fill = pdfCorrelationCellFill(v)
              return (
                <View
                  key={`c-${i}-${j}`}
                  style={[
                    styles.corrCell,
                    {
                      width: cellW,
                      height: rowH,
                      ...(fill ? { backgroundColor: fill } : {}),
                    },
                  ]}
                >
                  <Text style={[styles.corrCellText, { fontSize: cellFont }]}>
                    {formatPdfRho(v, language)}
                  </Text>
                </View>
              )
            })}
          </View>
        ))}
      </View>
      <Text style={styles.sectionFootnote}>{unlistedNote}</Text>
    </View>
  )
}

function ContributionSection({
  title,
  expectedLabel,
  reserveLabel,
  baseCostLabel,
  p50Label,
  p85Label,
  otherLabel,
  blocks,
  language,
  pageRefs,
}: {
  title: string
  expectedLabel: string
  reserveLabel: string
  baseCostLabel: string
  p50Label: string
  p85Label: string
  otherLabel: string
  blocks: PdfContributionBlock[]
  language: AppLanguage
  pageRefs?: Map<string, number>
}) {
  if (blocks.length === 0) return null
  return (
    <View style={styles.sectionBlock}>
      <SectionTitle id={PDF_SECTION_IDS.contribution} label={title} pageRefs={pageRefs} />
      {blocks.map((block, idx) => (
        <View key={`${block.projectName}-${idx}`} style={styles.contribBlock} wrap={false}>
          <Text style={styles.tornadoProjectTitle}>{block.projectName}</Text>
          <Text style={styles.contribSubtitle}>{expectedLabel}</Text>
          <PdfWaterfallChart
            waterfall={block.expectedAddition}
            startLabel={baseCostLabel}
            endLabel={p50Label}
            spanLabel={expectedLabel}
            otherLabel={otherLabel}
            language={language}
            showTotalSpanBar
          />
          <Text style={[styles.contribSubtitle, { marginTop: 8 }]}>{reserveLabel}</Text>
          <PdfWaterfallChart
            waterfall={block.uncertaintyReserve}
            startLabel={p50Label}
            endLabel={p85Label}
            spanLabel={reserveLabel}
            otherLabel={otherLabel}
            language={language}
            showTotalSpanBar
          />
        </View>
      ))}
    </View>
  )
}

export function ProjectReportDocument({
  brandName,
  title,
  projectNames,
  generatedAtLabel,
  contentsTitle,
  metricsTitle,
  metricColumnLabel,
  columns,
  rows,
  sCurveTitle,
  sCurveFootnote,
  sCurveSeries,
  uncertaintyPictureTitle,
  tornadoTitle,
  tornadoExplanation,
  tornadoProjects,
  contributionTitle,
  contributionExpectedLabel,
  contributionReserveLabel,
  contributionBaseCostLabel,
  contributionP50Label,
  contributionP85Label,
  contributionOtherLabel,
  contributionBlocks,
  analysisBasisTitle,
  assumptionsTitle,
  assumptionsEmptyText,
  estimateUncertaintyTitle,
  driversTitle,
  definitionLabel,
  mostLikelyLabel,
  impactTitle,
  impactDefaultNote,
  impactNoOverrides,
  impactColDriver,
  impactColCost,
  impactColPct,
  correlationTitle,
  correlationNone,
  correlationUnlistedNote,
  correlationColA,
  correlationColB,
  correlationColRho,
  projectsBasis,
  modelRelationshipsTitle,
  methodTitle,
  methodParagraphs,
  openAnalysisTitle,
  openAnalysisHelper,
  resultsSectionLabel,
  shareLinkAppendix = null,
  shareUnavailableNote = null,
  footerText,
  language,
  sCurveMarkerPercentiles = [50, 85],
}: ProjectReportDocumentProps) {
  // Persists across react-pdf's two layout passes for TOC page numbers.
  const pageRefs = useMemo(() => new Map<string, number>(), [])

  const markerLevels = sCurveMarkerPercentiles.filter(
    (p) => Number.isFinite(p) && p >= 1 && p <= 99,
  )

  const curves = sCurveSeries
    .map((series) => {
      const values = series.values ?? series.displayPoints?.map((point) => point.x) ?? []
      const points =
        series.displayPoints?.map((point) => ({ ...point })) ?? computeSCurveDisplaySeries(values)
      if (points.length === 0) return null
      const markers = markerLevels.flatMap((p) => {
        const value = series.values ? percentile(series.values, p) : percentile(values, p)
        if (value === null) return []
        return [{ percentile: p, value }]
      })
      return {
        ...series,
        points,
        markers,
      }
    })
    .filter(
      (series): series is NonNullable<typeof series> => series !== null && series.points.length > 0,
    )

  let minX = Number.POSITIVE_INFINITY
  let maxX = Number.NEGATIVE_INFINITY
  for (const curve of curves) {
    for (const point of curve.points) {
      if (point.x < minX) minX = point.x
      if (point.x > maxX) maxX = point.x
    }
  }
  if (!Number.isFinite(minX) || !Number.isFinite(maxX)) {
    minX = 0
    maxX = 1
  } else if (minX === maxX) {
    minX -= 1
    maxX += 1
  }

  const sCurveXAxisTicks = generateXAxisTicks(minX, maxX)

  let tornadoSharedMaxAbs = 0
  for (const project of tornadoProjects) {
    for (const row of project.rows) {
      const maxAbs = Math.max(Math.abs(row.lowImpact), Math.abs(row.highImpact))
      if (maxAbs > tornadoSharedMaxAbs) tornadoSharedMaxAbs = maxAbs
    }
  }
  if (tornadoSharedMaxAbs <= 0) tornadoSharedMaxAbs = 1
  const tornadoScale = (value: number) => {
    const halfWidth = (TORNADO_BAR_END_X - TORNADO_BAR_START_X) / 2
    return (value / tornadoSharedMaxAbs) * halfWidth
  }

  const multiProject = projectsBasis.length > 1
  const coverLayout = resolvePdfCoverLayout(Math.max(columns.length, projectNames.length, 1))
  const coverContext = formatPdfCoverProjectContext(projectNames, language)
  const tocChapters = buildPdfTocChapters({
    resultsLabel: resultsSectionLabel,
    sCurveLabel: sCurveTitle,
    uncertaintyLabel: uncertaintyPictureTitle,
    tornadoLabel: tornadoTitle,
    contributionLabel: contributionTitle,
    assumptionsLabel: assumptionsTitle,
    analysisBasisLabel: analysisBasisTitle,
    estimateUncertaintyLabel: estimateUncertaintyTitle,
    driversLabel: driversTitle,
    modelRelationshipsLabel: modelRelationshipsTitle,
    impactLabel: impactTitle,
    correlationLabel: correlationTitle,
    methodLabel: methodTitle,
  })

  return (
    <Document>
      {/* Cover — executive summary + TOC; full A4; content stays on one page */}
      <Page size={PDF_A4_PAGE_SIZE} wrap style={styles.page}>
        {/*
          Page uses wrap so MediaBox stays full A4 height.
          Inner wrap={false} keeps the cover block together on page 1
          (adaptive layout guarantees it fits; do not let cover spill).
        */}
        <View wrap={false}>
          <Text style={styles.brand}>{brandName}</Text>
          <Text style={styles.title}>{title}</Text>
          {coverContext ? <Text style={styles.projectNames}>{coverContext}</Text> : null}
          <Text style={styles.meta}>{generatedAtLabel}</Text>

          <CoverKeyFigures
            metricsTitle={metricsTitle}
            metricColumnLabel={metricColumnLabel}
            columns={columns}
            rows={rows}
            layout={coverLayout}
          />

          <TocBlock
            title={contentsTitle}
            chapters={tocChapters}
            pageRefs={pageRefs}
            layout={coverLayout}
          />
        </View>

        <PdfPageFooter footerText={footerText} />
      </Page>

      {/* 01 Resultater — S-curve */}
      <Page size={PDF_A4_PAGE_SIZE} wrap style={styles.page}>
        <ChapterTitle
          id={PDF_CHAPTER_IDS.results}
          label={resultsSectionLabel}
          pageRefs={pageRefs}
        />
        <SCurveSection
          title={sCurveTitle}
          footnote={sCurveFootnote}
          curves={curves}
          minX={minX}
          maxX={maxX}
          sCurveXAxisTicks={sCurveXAxisTicks}
          language={language}
          pageRefs={pageRefs}
        />
        <PdfPageFooter footerText={footerText} />
      </Page>

      {/* 02 Usikkerhetsbilde */}
      <Page size={PDF_A4_PAGE_SIZE} wrap style={styles.page}>
        <ChapterTitle
          id={PDF_CHAPTER_IDS.uncertainty}
          label={uncertaintyPictureTitle}
          pageRefs={pageRefs}
        />

        <TornadoSection
          title={tornadoTitle}
          explanation={tornadoExplanation}
          tornadoProjects={tornadoProjects}
          tornadoScale={tornadoScale}
          pageRefs={pageRefs}
        />

        <ContributionSection
          title={contributionTitle}
          expectedLabel={contributionExpectedLabel}
          reserveLabel={contributionReserveLabel}
          baseCostLabel={contributionBaseCostLabel}
          p50Label={contributionP50Label}
          p85Label={contributionP85Label}
          otherLabel={contributionOtherLabel}
          blocks={contributionBlocks}
          language={language}
          pageRefs={pageRefs}
        />

        <PdfPageFooter footerText={footerText} />
      </Page>

      {/* 03 Forutsetninger + 04 Analysegrunnlag + 05 Modellforhold + 06 Om analysen */}
      <Page size={PDF_A4_PAGE_SIZE} wrap style={styles.page}>
        <ChapterTitle
          id={PDF_CHAPTER_IDS.assumptions}
          label={assumptionsTitle}
          pageRefs={pageRefs}
        />

        {projectsBasis.map((project, pIdx) => {
          const hasAssumptions = project.assumptions.length > 0
          const [firstAssumption, ...restAssumptions] = project.assumptions
          return (
            <View key={`${project.projectName}-assumptions-${pIdx}`} style={styles.sectionBlock}>
              <View wrap={false} minPresenceAhead={48}>
                {multiProject ? (
                  <Text style={styles.projectHeading}>{project.projectName}</Text>
                ) : null}
                {hasAssumptions ? (
                  <Text style={styles.assumptionItem}>{`•  ${firstAssumption}`}</Text>
                ) : (
                  <Text style={styles.assumptionItem}>{assumptionsEmptyText}</Text>
                )}
              </View>
              {restAssumptions.map((text, aIdx) => (
                <Text key={`a-${pIdx}-${aIdx + 1}`} style={styles.assumptionItem}>
                  {`•  ${text}`}
                </Text>
              ))}
            </View>
          )
        })}

        <ChapterTitle
          id={PDF_CHAPTER_IDS.analysisBasis}
          label={analysisBasisTitle}
          pageRefs={pageRefs}
          minPresenceAhead={80}
        />

        {projectsBasis.map((project, pIdx) => {
          const amountScale = resolvePdfAmountScale(project.costItems.map((c) => c.mostLikely))
          return (
            <View key={`${project.projectName}-basis-${pIdx}`}>
              {multiProject ? (
                <Text style={styles.projectHeading} minPresenceAhead={40}>
                  {project.projectName}
                </Text>
              ) : null}

              {project.costItems.length > 0 ? (
                <View style={styles.sectionBlock}>
                  <SectionTitle
                    id={pIdx === 0 ? PDF_SECTION_IDS.estimateUncertainty : undefined}
                    label={estimateUncertaintyTitle}
                    pageRefs={pIdx === 0 ? pageRefs : undefined}
                  />
                  <CostItemBlocks
                    items={project.costItems}
                    language={language}
                    amountScale={amountScale}
                    mostLikelyLabel={mostLikelyLabel}
                  />
                </View>
              ) : null}

              {project.drivers.length > 0 ? (
                <View style={styles.sectionBlock}>
                  <SectionTitle
                    id={pIdx === 0 ? PDF_SECTION_IDS.drivers : undefined}
                    label={driversTitle}
                    pageRefs={pIdx === 0 ? pageRefs : undefined}
                  />
                  <DriverBlocks
                    items={project.drivers}
                    language={language}
                    definitionLabel={definitionLabel}
                    mostLikelyLabel={mostLikelyLabel}
                  />
                </View>
              ) : null}
            </View>
          )
        })}

        <ChapterTitle
          id={PDF_CHAPTER_IDS.modelRelationships}
          label={modelRelationshipsTitle}
          pageRefs={pageRefs}
          minPresenceAhead={80}
        />

        <View style={styles.sectionBlock}>
          <SectionTitle
            id={PDF_SECTION_IDS.impact}
            label={impactTitle}
            pageRefs={pageRefs}
            minPresenceAhead={48}
          />
          {projectsBasis.map((project, pIdx) => (
            <View key={`${project.projectName}-impact-${pIdx}`} wrap={false} minPresenceAhead={64}>
              {multiProject ? (
                <Text style={styles.projectHeading}>{project.projectName}</Text>
              ) : null}
              <ImpactOverridesTable
                overrides={project.impactOverrides}
                defaultNote={impactDefaultNote}
                noOverrides={impactNoOverrides}
                colDriver={impactColDriver}
                colCost={impactColCost}
                colPct={impactColPct}
              />
            </View>
          ))}
        </View>

        <View style={styles.sectionBlock}>
          <SectionTitle
            id={PDF_SECTION_IDS.correlation}
            label={correlationTitle}
            pageRefs={pageRefs}
            minPresenceAhead={72}
          />
          {projectsBasis.map((project, pIdx) => (
            <View
              key={`${project.projectName}-corr-${pIdx}`}
              wrap={false}
              minPresenceAhead={project.correlation.kind === "matrix" ? 280 : 72}
            >
              {multiProject ? (
                <Text style={styles.projectHeading}>{project.projectName}</Text>
              ) : null}
              <CorrelationBlock
                section={project.correlation}
                noneText={correlationNone}
                unlistedNote={correlationUnlistedNote}
                colA={correlationColA}
                colB={correlationColB}
                colRho={correlationColRho}
                language={language}
              />
            </View>
          ))}
        </View>

        <View style={styles.sectionBlock} wrap={false} minPresenceAhead={120}>
          <ChapterTitle id={PDF_CHAPTER_IDS.method} label={methodTitle} pageRefs={pageRefs} />
          {methodParagraphs.map((para, idx) => (
            <Text key={`m-${idx}`} style={styles.methodPara}>
              {para}
            </Text>
          ))}
        </View>

        <View style={styles.openBlock} wrap={false} minPresenceAhead={80}>
          <Text style={styles.sectionTitle}>{openAnalysisTitle}</Text>
          <Text style={styles.bodyMuted}>{openAnalysisHelper}</Text>
          {shareLinkAppendix ? (
            <Link src={shareLinkAppendix.url} style={styles.openLink}>
              {shareLinkAppendix.linkLabel}
            </Link>
          ) : shareUnavailableNote ? (
            <Text style={styles.bodyText}>{shareUnavailableNote}</Text>
          ) : null}
        </View>

        <PdfPageFooter footerText={footerText} />
      </Page>
    </Document>
  )
}
