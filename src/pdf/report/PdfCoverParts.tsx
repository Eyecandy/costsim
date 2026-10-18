import { Link, Text, View } from "@react-pdf/renderer"
import {
  type buildPdfTocChapters,
  splitPdfMetricValueParts,
  type PdfCoverLayout,
} from "@/pdf/pdfCoverLayout"
import type { ReportRow, ReportColumn } from "@/pdf/report/reportTypes"
import { PAGE_CONTENT_WIDTH, styles } from "@/pdf/report/projectReportStyles"

export function PdfPageFooter({ footerText }: { footerText?: string }) {
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

export function MetricsTable({
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

export function CoverKeyFigures({
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

export function TocBlock({
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

export function ChapterTitle({
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

export function SectionTitle({
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
