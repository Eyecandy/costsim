import { Document, Link, Page, Text, View } from "@react-pdf/renderer"
import { useMemo } from "react"
import { computeSCurveDisplaySeries } from "@/domain/results/sCurveDisplay"
import { percentile } from "@/domain/simulation/stats"
import { resolvePdfAmountScale } from "@/pdf/buildPdfReportModel"
import {
  PDF_A4_PAGE_SIZE,
  PDF_CHAPTER_IDS,
  PDF_SECTION_IDS,
  buildPdfTocChapters,
  formatPdfCoverProjectContext,
  resolvePdfCoverLayout,
} from "@/pdf/pdfCoverLayout"
import type { ProjectReportDocumentProps } from "@/pdf/report/reportTypes"
import { styles } from "@/pdf/report/projectReportStyles"
import { TORNADO_BAR_START_X, TORNADO_BAR_END_X } from "@/pdf/report/projectReportChartConstants"
import { generateXAxisTicks } from "@/pdf/report/pdfReportHelpers"
import {
  PdfPageFooter,
  CoverKeyFigures,
  TocBlock,
  ChapterTitle,
  SectionTitle,
} from "@/pdf/report/PdfCoverParts"
import { SCurveSection } from "@/pdf/report/SCurveSection"
import { TornadoSection } from "@/pdf/report/TornadoSection"
import { CostItemBlocks, DriverBlocks, ImpactOverridesTable } from "@/pdf/report/PdfItemBlocks"
import { CorrelationBlock } from "@/pdf/report/CorrelationBlock"
import { ContributionSection } from "@/pdf/report/ContributionSection"

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
