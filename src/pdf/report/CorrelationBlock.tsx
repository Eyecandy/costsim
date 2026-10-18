import { Text, View } from "@react-pdf/renderer"
import { type AppLanguage } from "@/domain/results/formatNumber"
import {
  formatPdfCorrelationGroupSummary,
  formatPdfRho,
  pdfCorrelationCellFill,
  type PdfCorrelationSection,
} from "@/pdf/buildPdfReportModel"
import { PAGE_CONTENT_WIDTH, styles } from "@/pdf/report/projectReportStyles"

export function CorrelationBlock({
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
