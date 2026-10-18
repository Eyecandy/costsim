import { Line, Rect, Svg, Text, Text as SvgText, View } from "@react-pdf/renderer"
import { PDF_SECTION_IDS } from "@/pdf/pdfCoverLayout"
import type { ProjectReportDocumentProps } from "@/pdf/report/reportTypes"
import { PAGE_CONTENT_WIDTH, styles } from "@/pdf/report/projectReportStyles"
import {
  TORNADO_W,
  TORNADO_BAR_START_X,
  TORNADO_BAR_END_X,
  TORNADO_ZERO_X,
  TORNADO_ROW_H,
  TORNADO_BAR_H,
  TORNADO_LABEL_X,
  TORNADO_FONT_SIZE,
  TORNADO_FACTOR_FONT_SIZE,
  TORNADO_BAR_RADIUS,
  TORNADO_VALUE_LABEL_GAP,
  TORNADO_VALUE_LABEL_PAD,
  TORNADO_P10_COLOR,
  TORNADO_P90_COLOR,
} from "@/pdf/report/projectReportChartConstants"
import { formatSignedMillions } from "@/pdf/report/pdfReportHelpers"
import { SectionTitle } from "@/pdf/report/PdfCoverParts"

export function TornadoSection({
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
