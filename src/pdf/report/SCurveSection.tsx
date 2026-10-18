import { Circle, Line, Path, Svg, Text, Text as SvgText, View } from "@react-pdf/renderer"
import {
  SCURVE_CURVE_STROKE_LINECAP,
  SCURVE_CURVE_STROKE_LINEJOIN,
  SCURVE_CURVE_STROKE_WIDTH,
} from "@/domain/results/sCurveDisplay"
import { type AppLanguage } from "@/domain/results/formatNumber"
import {
  PDF_SCURVE_GUIDE_STROKE_WIDTH,
  PDF_SCURVE_MARKER_RADIUS,
  buildPdfClassicGuides,
  formatPdfSCurveCost,
  layoutPdfClassicOrdinaryYTicks,
  layoutPdfClassicXCostLabels,
  layoutPdfClassicYLabels,
  resolvePdfSCurveCostScale,
  shouldHidePdfOrdinaryXTick,
  uniquePdfMarkerPercentiles,
} from "@/pdf/pdfSCurveClassic"
import { PDF_SECTION_IDS } from "@/pdf/pdfCoverLayout"
import { PAGE_CONTENT_WIDTH, styles } from "@/pdf/report/projectReportStyles"
import {
  CHART_W,
  CHART_H,
  CHART_PLOT_LEFT,
  CHART_PLOT_RIGHT,
  CHART_PLOT_TOP,
  CHART_PLOT_BOTTOM,
  CHART_GRID_STROKE,
  CHART_GRID_WIDTH,
  CHART_AXIS_TICK_FONT,
  CHART_AXIS_TICK_FILL,
  CHART_AXIS_EMPHASIS_FILL,
  CHART_Y_PROB_TICKS,
  SCURVE_LABEL_FONT,
  SCURVE_PDF_GEOMETRY,
  xForValue,
  yForProbability,
  pathFromPoints,
} from "@/pdf/report/projectReportChartConstants"
import { SectionTitle } from "@/pdf/report/PdfCoverParts"

export function SCurveSection({
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
  curves: {
    id: string
    label: string
    color: string
    points: { x: number; y: number }[]
    markers: { percentile: number; value: number }[]
  }[]
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
