/**
 * Ongoing Analysis PDF — decision-support information architecture.
 *
 * PAGE 1: Cover (report basis, meaning, comparison, development, TOC)
 * Then: Development → Assumptions (if any) → Latest (KF + S-curve) →
 *       Tornado [new page] → Contribution [new page] → History → Method
 *
 * Uses @react-pdf Link + id destinations (same pattern as Single PDF).
 */

import { useMemo } from "react"
import {
  Document,
  Link,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer"
import type { AppLanguage } from "@/domain/results/formatNumber"
import { formatPdfAbsoluteAmount, resolvePdfAmountScale } from "@/pdf/shared"
import { PDF_A4_PAGE_SIZE } from "@/pdf/shared"
import {
  ONGOING_PDF_SECTION_IDS,
  type OngoingPdfReportModel,
  type OngoingPdfTocEntry,
} from "@/pdf/ongoing/ongoingPdfTypes"
import {
  OngoingPdfContributionCharts,
  OngoingPdfDevelopmentChart,
  OngoingPdfSCurveChart,
  OngoingPdfTornadoChart,
} from "@/pdf/ongoing/ongoingPdfCharts"

export type OngoingReportDocumentLabels = {
  generatedAtLabel: string
  contentsTitle: string
  currentStatusTitle: string
  comparisonTitle: string
  developmentTitle: string
  latestSummaryTitle: string
  historyTitle: string
  assumptionsTitle: string
  assumptionsContextFallback: string
  methodTitle: string
  colSequence: string
  colName: string
  colArchivedAt: string
  colPrevious: string
  colLatest: string
  colChange: string
  colBaseCost: string
  colP50: string
  colP85: string
  colExpectedValue: string
  metricLabel: string
  valueLabel: string
  lifecycleActive: string
  lifecycleCompleted: string
  footerText: string
  emptyDevelopment: string
  checkpointContextLabel: string
  archivedCountLabel: string
  periodLabel: string
  sCurveTitle: string
  sCurveFootnote: string
  tornadoTitle: string
  tornadoExplanation: string
  contributionTitle: string
  contributionExpectedLabel: string
  contributionReserveLabel: string
  contributionBaseCostLabel: string
  contributionP50Label: string
  contributionP85Label: string
  contributionOtherLabel: string
}

export type OngoingReportDocumentProps = {
  model: OngoingPdfReportModel
  labels: OngoingReportDocumentLabels
  generatedAtDisplay: string
}

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
  kindLabel: {
    fontSize: 11,
    fontFamily: "NotoSans",
    fontWeight: "bold",
    color: "#334155",
    marginBottom: 4,
  },
  meta: {
    fontSize: 9,
    color: "#64748b",
    marginBottom: 2,
  },
  projectContext: {
    fontSize: 9,
    color: "#475569",
    marginBottom: 4,
  },
  reportBasis: {
    fontSize: 9,
    color: "#334155",
    marginTop: 6,
    marginBottom: 2,
    lineHeight: 1.35,
  },
  reportMeaning: {
    fontSize: 8.5,
    color: "#64748b",
    marginBottom: 4,
    lineHeight: 1.35,
  },
  sectionTitle: {
    fontSize: 11,
    fontFamily: "NotoSans",
    fontWeight: "bold",
    color: "#0f172a",
    marginBottom: 6,
    marginTop: 8,
  },
  chapterTitle: {
    fontSize: 13,
    fontFamily: "NotoSans",
    fontWeight: "bold",
    color: "#0f172a",
    marginBottom: 8,
  },
  coverBlock: {
    marginTop: 8,
  },
  tableHeader: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#cbd5e1",
    paddingBottom: 4,
    marginBottom: 2,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 3,
    borderBottomWidth: 0.5,
    borderBottomColor: "#e2e8f0",
  },
  th: {
    fontSize: 8,
    fontFamily: "NotoSans",
    fontWeight: "bold",
    color: "#475569",
  },
  td: {
    fontSize: 9,
    color: "#1f2937",
  },
  footer: {
    position: "absolute",
    bottom: 28,
    left: 44,
    right: 44,
    fontSize: 8,
    color: "#94a3b8",
  },
  empty: {
    fontSize: 9,
    color: "#64748b",
    marginTop: 4,
  },
  tocTitle: {
    fontSize: 10,
    fontFamily: "NotoSans",
    fontWeight: "bold",
    color: "#0f172a",
    marginBottom: 4,
    marginTop: 10,
  },
  tocLink: {
    textDecoration: "none",
    color: "#1f2937",
  },
  tocRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginBottom: 2.5,
  },
  tocLabel: {
    fontSize: 9,
    color: "#1f2937",
  },
  tocSubLabel: {
    fontSize: 8,
    color: "#64748b",
    paddingLeft: 10,
  },
  tocDots: {
    flexGrow: 1,
    borderBottomWidth: 0.5,
    borderBottomColor: "#cbd5e1",
    borderStyle: "dotted",
    marginHorizontal: 4,
    marginBottom: 2,
  },
  tocPage: {
    fontSize: 8,
    color: "#64748b",
    minWidth: 14,
    textAlign: "right",
  },
  contextLine: {
    fontSize: 8,
    color: "#64748b",
    marginTop: 2,
  },
  assumptionsContext: {
    fontSize: 8.5,
    color: "#64748b",
    marginBottom: 8,
    lineHeight: 1.35,
  },
  methodPara: {
    fontSize: 9,
    color: "#334155",
    marginBottom: 6,
    lineHeight: 1.35,
  },
  assumptionItem: {
    fontSize: 9,
    color: "#1f2937",
    marginBottom: 3,
  },
})

function formatDateLabel(iso: string | null, language: AppLanguage): string {
  if (!iso) return "—"
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return "—"
  return d.toLocaleDateString(language === "no" ? "nb-NO" : "en-GB")
}

function PageFooter({ text }: { text: string }) {
  return (
    <Text style={styles.footer} fixed>
      {text}
    </Text>
  )
}

function ChapterHeading({
  id,
  label,
  pageRefs,
}: {
  id: string
  label: string
  pageRefs: Map<string, number>
}) {
  return (
    <Text
      id={id}
      style={styles.chapterTitle}
      render={({ pageNumber }) => {
        pageRefs.set(id, pageNumber)
        return label
      }}
    />
  )
}

function SectionHeading({
  id,
  label,
  pageRefs,
}: {
  id: string
  label: string
  pageRefs: Map<string, number>
}) {
  return (
    <Text
      id={id}
      style={styles.sectionTitle}
      render={({ pageNumber }) => {
        pageRefs.set(id, pageNumber)
        return label
      }}
    />
  )
}

function TocBlock({
  title,
  entries,
  pageRefs,
}: {
  title: string
  entries: OngoingPdfTocEntry[]
  pageRefs: Map<string, number>
}) {
  return (
    <View wrap={false}>
      <Text style={styles.tocTitle}>{title}</Text>
      {entries.map((entry) => (
        <View key={entry.id} wrap={false}>
          <Link src={`#${entry.id}`} style={styles.tocLink}>
            <View style={styles.tocRow} wrap={false}>
              <Text style={styles.tocLabel}>{entry.label}</Text>
              <View style={styles.tocDots} />
              <Text
                style={styles.tocPage}
                render={() => {
                  const n = pageRefs.get(entry.id)
                  return n != null ? String(n) : "—"
                }}
              />
            </View>
          </Link>
          {entry.subsections?.map((sub) => (
            <Link key={sub.id} src={`#${sub.id}`} style={styles.tocLink}>
              <View style={styles.tocRow} wrap={false}>
                <Text style={styles.tocSubLabel}>{sub.label}</Text>
                <View style={styles.tocDots} />
                <Text
                  style={styles.tocPage}
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

function KeyFiguresTable({
  rows,
  metricLabel,
  valueLabel,
}: {
  rows: Array<{ label: string; value: string }>
  metricLabel: string
  valueLabel: string
}) {
  return (
    <View>
      <View style={styles.tableHeader}>
        <Text style={[styles.th, { width: "55%" }]}>{metricLabel}</Text>
        <Text style={[styles.th, { width: "45%" }]}>{valueLabel}</Text>
      </View>
      {rows.map((row) => (
        <View key={row.label} style={styles.tableRow} wrap={false}>
          <Text style={[styles.td, { width: "55%" }]}>{row.label}</Text>
          <Text style={[styles.td, { width: "45%" }]}>{row.value}</Text>
        </View>
      ))}
    </View>
  )
}

export function OngoingReportDocument({
  model,
  labels,
  generatedAtDisplay,
}: OngoingReportDocumentProps) {
  const pageRefs = useMemo(() => new Map<string, number>(), [])
  const language = model.metadata.language
  const lifecycleLabel =
    model.analysis.lifecycle === "completed"
      ? labels.lifecycleCompleted
      : labels.lifecycleActive
  const cover = model.cover
  const detail = model.latestDetail
  const hasAssumptions = detail.assumptions.length > 0
  const historyAmounts = model.history.flatMap((h) =>
    [
      h.keyFigures.baseCost,
      h.keyFigures.p50,
      h.keyFigures.p85,
      h.keyFigures.expectedValue,
    ].filter((v): v is number => v !== null && Number.isFinite(v)),
  )
  const historyScale = resolvePdfAmountScale(historyAmounts)
  const developmentSeriesLabels = {
    baseCost: labels.colBaseCost,
    p50: labels.colP50,
    p85: labels.colP85,
  }

  return (
    <Document>
      {/* PAGE 1 — Cover: basis → comparison → development → TOC */}
      <Page size={PDF_A4_PAGE_SIZE} wrap style={styles.page}>
        <View wrap={false}>
          <Text style={styles.brand}>{model.metadata.brandName}</Text>
          <Text style={styles.title}>{model.analysis.name}</Text>
          <Text style={styles.kindLabel}>{model.metadata.reportKindLabel}</Text>
          {cover.projectContext ? (
            <Text style={styles.projectContext}>{cover.projectContext}</Text>
          ) : null}
          <Text style={styles.meta}>
            {labels.generatedAtLabel}: {generatedAtDisplay}
          </Text>
          <Text style={styles.meta}>{lifecycleLabel}</Text>

          <Text style={styles.reportBasis}>{cover.reportBasisText}</Text>
          <Text style={styles.reportMeaning}>{cover.reportMeaningText}</Text>

          {cover.comparison ? (
            <View style={styles.coverBlock} wrap={false}>
              <Text style={styles.sectionTitle}>{labels.comparisonTitle}</Text>
              <Text style={styles.meta}>
                CP{cover.comparison.previous.sequence} ·{" "}
                {cover.comparison.previous.name}
                {" → "}
                CP{cover.comparison.current.sequence} ·{" "}
                {cover.comparison.current.name}
              </Text>
              <View style={styles.tableHeader}>
                <Text style={[styles.th, { width: "28%" }]}>
                  {labels.metricLabel}
                </Text>
                <Text style={[styles.th, { width: "24%" }]}>
                  {labels.colPrevious}
                </Text>
                <Text style={[styles.th, { width: "24%" }]}>
                  {labels.colLatest}
                </Text>
                <Text style={[styles.th, { width: "24%" }]}>
                  {labels.colChange}
                </Text>
              </View>
              {cover.comparison.rows.map((row) => (
                <View key={row.metricId} style={styles.tableRow} wrap={false}>
                  <Text style={[styles.td, { width: "28%" }]}>{row.label}</Text>
                  <Text style={[styles.td, { width: "24%" }]}>
                    {row.previousFormatted}
                  </Text>
                  <Text style={[styles.td, { width: "24%" }]}>
                    {row.currentFormatted}
                  </Text>
                  <Text style={[styles.td, { width: "24%" }]}>
                    {row.changeFormatted}
                  </Text>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.coverBlock}>
              <Text style={styles.sectionTitle}>{labels.currentStatusTitle}</Text>
              <KeyFiguresTable
                rows={cover.currentStatusRows}
                metricLabel={labels.metricLabel}
                valueLabel={labels.valueLabel}
              />
            </View>
          )}

          <View style={styles.coverBlock} wrap={false}>
            <Text style={styles.sectionTitle}>{labels.developmentTitle}</Text>
            <OngoingPdfDevelopmentChart
              series={model.development}
              language={language}
              labels={developmentSeriesLabels}
            />
          </View>

          <Text style={styles.contextLine}>
            {labels.checkpointContextLabel}: CP
            {cover.checkpointContext.latestSequence} ·{" "}
            {cover.checkpointContext.latestName}
          </Text>
          <Text style={styles.contextLine}>
            {labels.archivedCountLabel}: {cover.checkpointContext.archivedCount}
            {cover.checkpointContext.periodStartIso ||
            cover.checkpointContext.periodEndIso
              ? ` · ${labels.periodLabel}: ${formatDateLabel(cover.checkpointContext.periodStartIso, language)} – ${formatDateLabel(cover.checkpointContext.periodEndIso, language)}`
              : ""}
          </Text>

          <TocBlock
            title={labels.contentsTitle}
            entries={cover.tocEntries}
            pageRefs={pageRefs}
          />
        </View>
        <PageFooter text={labels.footerText} />
      </Page>

      {/* Development */}
      <Page size={PDF_A4_PAGE_SIZE} wrap style={styles.page}>
        <ChapterHeading
          id={ONGOING_PDF_SECTION_IDS.development}
          label={labels.developmentTitle}
          pageRefs={pageRefs}
        />
        {model.development.points.length === 0 ? (
          <Text style={styles.empty}>{labels.emptyDevelopment}</Text>
        ) : (
          <>
            <OngoingPdfDevelopmentChart
              series={model.development}
              language={language}
              labels={developmentSeriesLabels}
            />
            <View style={styles.tableHeader}>
              <Text style={[styles.th, { width: "10%" }]}>
                {labels.colSequence}
              </Text>
              <Text style={[styles.th, { width: "30%" }]}>{labels.colName}</Text>
              <Text style={[styles.th, { width: "20%" }]}>
                {labels.colBaseCost}
              </Text>
              <Text style={[styles.th, { width: "20%" }]}>{labels.colP50}</Text>
              <Text style={[styles.th, { width: "20%" }]}>{labels.colP85}</Text>
            </View>
            {model.development.points.map((point) => (
              <View
                key={point.checkpointId}
                style={styles.tableRow}
                wrap={false}
              >
                <Text style={[styles.td, { width: "10%" }]}>
                  CP{point.sequence}
                </Text>
                <Text style={[styles.td, { width: "30%" }]}>{point.name}</Text>
                <Text style={[styles.td, { width: "20%" }]}>
                  {point.baseCost === null
                    ? "—"
                    : formatPdfAbsoluteAmount(
                        point.baseCost,
                        language,
                        historyScale,
                      )}
                </Text>
                <Text style={[styles.td, { width: "20%" }]}>
                  {point.p50 === null
                    ? "—"
                    : formatPdfAbsoluteAmount(
                        point.p50,
                        language,
                        historyScale,
                      )}
                </Text>
                <Text style={[styles.td, { width: "20%" }]}>
                  {point.p85 === null
                    ? "—"
                    : formatPdfAbsoluteAmount(
                        point.p85,
                        language,
                        historyScale,
                      )}
                </Text>
              </View>
            ))}
          </>
        )}
        <PageFooter text={labels.footerText} />
      </Page>

      {/* Assumptions — cutoff frozen only; omit when empty */}
      {hasAssumptions ? (
        <Page size={PDF_A4_PAGE_SIZE} wrap style={styles.page}>
          <ChapterHeading
            id={ONGOING_PDF_SECTION_IDS.assumptions}
            label={labels.assumptionsTitle}
            pageRefs={pageRefs}
          />
          <Text style={styles.assumptionsContext}>
            {detail.assumptionsContextText ?? labels.assumptionsContextFallback}
          </Text>
          {detail.assumptions.map((text, idx) => (
            <Text key={`a-${idx}`} style={styles.assumptionItem}>
              • {text}
            </Text>
          ))}
          <PageFooter text={labels.footerText} />
        </Page>
      ) : null}

      {/* Latest archived checkpoint — key figures + S-curve */}
      <Page size={PDF_A4_PAGE_SIZE} wrap style={styles.page}>
        <ChapterHeading
          id={ONGOING_PDF_SECTION_IDS.latest}
          label={labels.latestSummaryTitle}
          pageRefs={pageRefs}
        />
        <Text style={styles.meta}>
          CP{detail.sequence} · {detail.name}
        </Text>
        {detail.archivedAt ? (
          <Text style={styles.meta}>
            {labels.colArchivedAt}:{" "}
            {formatDateLabel(detail.archivedAt, language)}
          </Text>
        ) : null}

        <Text style={styles.sectionTitle}>{labels.currentStatusTitle}</Text>
        <KeyFiguresTable
          rows={detail.keyFigureRows}
          metricLabel={labels.metricLabel}
          valueLabel={labels.valueLabel}
        />

        {detail.sCurve ? (
          <View>
            <SectionHeading
              id={ONGOING_PDF_SECTION_IDS.sCurve}
              label={labels.sCurveTitle}
              pageRefs={pageRefs}
            />
            <OngoingPdfSCurveChart
              series={detail.sCurve}
              language={language}
              footnote={labels.sCurveFootnote.replace(
                "{percentiles}",
                detail.sCurve.markerPercentiles
                  .map((p) => `P${p}`)
                  .join(language === "no" ? ", " : ", "),
              )}
            />
          </View>
        ) : null}

        <PageFooter text={labels.footerText} />
      </Page>

      {/* Tornado — always starts on a new page */}
      {detail.tornado && detail.tornado.length > 0 ? (
        <Page size={PDF_A4_PAGE_SIZE} wrap style={styles.page}>
          <ChapterHeading
            id={ONGOING_PDF_SECTION_IDS.tornado}
            label={labels.tornadoTitle}
            pageRefs={pageRefs}
          />
          <Text style={styles.empty}>{labels.tornadoExplanation}</Text>
          <OngoingPdfTornadoChart rows={detail.tornado} language={language} />
          <PageFooter text={labels.footerText} />
        </Page>
      ) : null}

      {/* Contribution — always starts on a new page */}
      {detail.contribution ? (
        <Page size={PDF_A4_PAGE_SIZE} wrap style={styles.page}>
          <ChapterHeading
            id={ONGOING_PDF_SECTION_IDS.contribution}
            label={labels.contributionTitle}
            pageRefs={pageRefs}
          />
          <OngoingPdfContributionCharts
            block={detail.contribution}
            expectedLabel={labels.contributionExpectedLabel}
            reserveLabel={labels.contributionReserveLabel}
            baseCostLabel={labels.contributionBaseCostLabel}
            p50Label={labels.contributionP50Label}
            p85Label={labels.contributionP85Label}
            otherLabel={labels.contributionOtherLabel}
            language={language}
          />
          <PageFooter text={labels.footerText} />
        </Page>
      ) : null}

      {/* Checkpoint history */}
      <Page size={PDF_A4_PAGE_SIZE} wrap style={styles.page}>
        <ChapterHeading
          id={ONGOING_PDF_SECTION_IDS.history}
          label={labels.historyTitle}
          pageRefs={pageRefs}
        />
        <View style={styles.tableHeader}>
          <Text style={[styles.th, { width: "8%" }]}>{labels.colSequence}</Text>
          <Text style={[styles.th, { width: "22%" }]}>{labels.colName}</Text>
          <Text style={[styles.th, { width: "14%" }]}>
            {labels.colArchivedAt}
          </Text>
          <Text style={[styles.th, { width: "14%" }]}>
            {labels.colBaseCost}
          </Text>
          <Text style={[styles.th, { width: "14%" }]}>{labels.colP50}</Text>
          <Text style={[styles.th, { width: "14%" }]}>{labels.colP85}</Text>
          <Text style={[styles.th, { width: "14%" }]}>
            {labels.colExpectedValue}
          </Text>
        </View>
        {model.history.map((row) => (
          <View key={row.id} style={styles.tableRow} wrap={false}>
            <Text style={[styles.td, { width: "8%" }]}>CP{row.sequence}</Text>
            <Text style={[styles.td, { width: "22%" }]}>{row.name}</Text>
            <Text style={[styles.td, { width: "14%" }]}>
              {formatDateLabel(row.archivedAt, language)}
            </Text>
            <Text style={[styles.td, { width: "14%" }]}>
              {row.keyFigures.baseCost === null
                ? "—"
                : formatPdfAbsoluteAmount(
                    row.keyFigures.baseCost,
                    language,
                    historyScale,
                  )}
            </Text>
            <Text style={[styles.td, { width: "14%" }]}>
              {row.keyFigures.p50 === null
                ? "—"
                : formatPdfAbsoluteAmount(
                    row.keyFigures.p50,
                    language,
                    historyScale,
                  )}
            </Text>
            <Text style={[styles.td, { width: "14%" }]}>
              {row.keyFigures.p85 === null
                ? "—"
                : formatPdfAbsoluteAmount(
                    row.keyFigures.p85,
                    language,
                    historyScale,
                  )}
            </Text>
            <Text style={[styles.td, { width: "14%" }]}>
              {row.keyFigures.expectedValue === null
                ? "—"
                : formatPdfAbsoluteAmount(
                    row.keyFigures.expectedValue,
                    language,
                    historyScale,
                  )}
            </Text>
          </View>
        ))}
        <PageFooter text={labels.footerText} />
      </Page>

      {/* Method — technical reference near the end */}
      <Page size={PDF_A4_PAGE_SIZE} wrap style={styles.page}>
        <ChapterHeading
          id={ONGOING_PDF_SECTION_IDS.method}
          label={labels.methodTitle}
          pageRefs={pageRefs}
        />
        {model.methodParagraphs.map((para, idx) => (
          <Text key={`m-${idx}`} style={styles.methodPara}>
            {para}
          </Text>
        ))}
        <PageFooter text={labels.footerText} />
      </Page>
    </Document>
  )
}
