import type { ComponentProps } from "react"
import { pdf } from "@react-pdf/renderer"

import type { Language } from "@/i18n/I18nProvider"
import type { useI18n } from "@/i18n/useI18n"
import type { Project } from "@/domain/analysis/project"
import { ProjectReportDocument } from "@/pdf/ProjectReportDocument"
import {
  buildPdfAssumptionTexts,
  buildPdfCorrelationSection,
  buildPdfCostItemBlocks,
  buildPdfDriverBlocks,
  buildPdfImpactOverrides,
} from "@/pdf/buildPdfReportModel"
import { ensurePdfFonts } from "@/pdf/pdfFonts"
import { OngoingReportDocument } from "@/pdf/ongoing/OngoingReportDocument"

/**
 * PDF rendering and download for the Results panel. Kept in its own module so
 * the PDF renderer is loaded only when someone actually exports (ResultsPanel
 * imports this file dynamically).
 */

type Translate = ReturnType<typeof useI18n>["t"]
type ProjectReportProps = ComponentProps<typeof ProjectReportDocument>
type OngoingPdfReportModel = ComponentProps<typeof OngoingReportDocument>["model"]

function downloadBlob(blob: Blob, fileName: string) {
  const link = document.createElement("a")
  const objectUrl = URL.createObjectURL(blob)
  link.href = objectUrl
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(objectUrl)
}

export async function downloadOngoingReportPdf({
  model,
  language,
  t,
}: {
  model: OngoingPdfReportModel
  language: Language
  t: Translate
}) {
  await ensurePdfFonts()
  const generatedAtDisplay = new Date(
    model.metadata.generatedAtIso,
  ).toLocaleDateString(language === "no" ? "nb-NO" : "en-GB")
  const blob = await pdf(
    <OngoingReportDocument
      model={model}
      generatedAtDisplay={generatedAtDisplay}
      labels={{
        generatedAtLabel: t("results.pdfGeneratedAtLabel"),
        contentsTitle: t("results.pdfContentsTitle"),
        currentStatusTitle: t("results.pdfOngoingCurrentStatusTitle"),
        comparisonTitle: t("results.pdfOngoingComparisonTitle"),
        developmentTitle: t("results.pdfOngoingDevelopmentTitle"),
        latestSummaryTitle: t("results.pdfOngoingLatestSummaryTitle"),
        historyTitle: t("results.pdfOngoingHistoryTitle"),
        assumptionsTitle: t("results.pdfOngoingAssumptionsTitle"),
        assumptionsContextFallback: t("results.pdfOngoingAssumptionsContext"),
        methodTitle: t("results.pdfOngoingMethodTitle"),
        colSequence: t("results.pdfOngoingColSequence"),
        colName: t("results.pdfOngoingColName"),
        colArchivedAt: t("results.pdfOngoingColArchivedAt"),
        colPrevious: t("results.pdfOngoingColPrevious"),
        colLatest: t("results.pdfOngoingColLatest"),
        colChange: t("results.pdfOngoingColChange"),
        colBaseCost: t("keyMetrics.baseCost"),
        colP50: t("keyMetrics.p50"),
        colP85: t("keyMetrics.p85"),
        colExpectedValue: t("keyMetrics.expectedValue"),
        metricLabel: t("results.pdfMetricsColMetric"),
        valueLabel: t("results.pdfMetricsColValue"),
        lifecycleActive: t("results.pdfOngoingLifecycleActive"),
        lifecycleCompleted: t("results.pdfOngoingLifecycleCompleted"),
        footerText: t("results.pdfFooter"),
        emptyDevelopment: t("results.pdfOngoingEmptyDevelopment"),
        checkpointContextLabel: t("results.pdfOngoingCheckpointContextLabel"),
        archivedCountLabel: t("results.pdfOngoingArchivedCountLabel"),
        periodLabel: t("results.pdfOngoingPeriodLabel"),
        sCurveTitle: t("charts.sCurveTitle"),
        sCurveFootnote: t("results.pdfSCurveFootnote"),
        tornadoTitle: t("charts.tornadoTitle"),
        tornadoExplanation: t("results.pdfTornadoExplanation"),
        contributionTitle: t("results.pdfContributionTitle"),
        contributionExpectedLabel: t("results.pdfContributionExpected"),
        contributionReserveLabel: t("results.pdfContributionReserve"),
        contributionBaseCostLabel: t("keyMetrics.baseCost"),
        contributionP50Label: t("keyMetrics.p50"),
        contributionP85Label: t("keyMetrics.p85"),
        contributionOtherLabel: t("results.waterfallOther"),
      }}
    />,
  ).toBlob()

  downloadBlob(
    blob,
    language === "no"
      ? "lopende-analyse-rapport.pdf"
      : "ongoing-analysis-report.pdf",
  )
}

export async function downloadProjectReportPdf({
  language,
  t,
  comparisonProjects,
  rows,
  sCurvePercentiles,
  sCurveSeries,
  tornadoProjects,
  contributionBlocks,
  methodParagraphs,
  shareLinkAppendix,
  shareUnavailableNote,
}: {
  language: Language
  t: Translate
  comparisonProjects: Project[]
  rows: ProjectReportProps["rows"]
  sCurvePercentiles: number[]
  sCurveSeries: ProjectReportProps["sCurveSeries"]
  tornadoProjects: ProjectReportProps["tornadoProjects"]
  contributionBlocks: ProjectReportProps["contributionBlocks"]
  methodParagraphs: string[]
  shareLinkAppendix: ProjectReportProps["shareLinkAppendix"]
  shareUnavailableNote: string | null
}) {
  const metricColumns = comparisonProjects.map((project) => ({
    label: project.name,
  }))

  await ensurePdfFonts()

  const blob = await pdf(
    <ProjectReportDocument
      brandName={t("results.pdfBrandName")}
      title={t("results.pdfReportTitle")}
      projectNames={comparisonProjects.map((p) => p.name)}
      generatedAtLabel={`${t("results.pdfGeneratedAtLabel")}: ${new Date().toLocaleDateString(language === "no" ? "nb-NO" : "en-GB")}`}
      resultsSectionLabel={t("results.pdfResultsSectionLabel")}
      contentsTitle={t("results.pdfContentsTitle")}
      metricsTitle={t("results.keyMetricsTitle")}
      metricColumnLabel={t("results.pdfMetricsColMetric")}
      columns={metricColumns}
      rows={rows}
      sCurveTitle={t("charts.sCurveTitle")}
      sCurveFootnote={t("results.pdfSCurveFootnote").replace(
        "{percentiles}",
        sCurvePercentiles
          .map((p) => `P${p}`)
          .join(language === "no" ? ", " : ", "),
      )}
      sCurveSeries={sCurveSeries}
      sCurveMarkerPercentiles={sCurvePercentiles}
      uncertaintyPictureTitle={t("results.pdfUncertaintyPictureTitle")}
      tornadoTitle={t("charts.tornadoTitle")}
      tornadoExplanation={t("results.pdfTornadoExplanation")}
      tornadoProjects={tornadoProjects}
      contributionTitle={t("results.pdfContributionTitle")}
      contributionExpectedLabel={t("results.pdfContributionExpected")}
      contributionReserveLabel={t("results.pdfContributionReserve")}
      contributionBaseCostLabel={t("keyMetrics.baseCost")}
      contributionP50Label={t("keyMetrics.p50")}
      contributionP85Label={t("keyMetrics.p85")}
      contributionOtherLabel={t("results.waterfallOther")}
      contributionBlocks={contributionBlocks}
      analysisBasisTitle={t("results.pdfAnalysisBasisTitle")}
      assumptionsTitle={t("results.pdfAssumptionsTitle")}
      assumptionsEmptyText={t("results.pdfAssumptionsEmpty")}
      estimateUncertaintyTitle={t("results.pdfEstimateUncertaintyTitle")}
      driversTitle={t("results.pdfDriversTitle")}
      definitionLabel={t("results.pdfDefinitionLabel")}
      mostLikelyLabel={t("results.pdfMostLikelyLabel")}
      modelRelationshipsTitle={t("results.pdfModelRelationshipsTitle")}
      impactTitle={t("results.pdfImpactTitle")}
      impactDefaultNote={t("results.pdfImpactDefaultNote")}
      impactNoOverrides={t("results.pdfImpactNoOverrides")}
      impactColDriver={t("results.pdfImpactColDriver")}
      impactColCost={t("results.pdfImpactColCost")}
      impactColPct={t("results.pdfImpactColPct")}
      correlationTitle={t("results.pdfCorrelationTitle")}
      correlationNone={t("results.pdfCorrelationNone")}
      correlationUnlistedNote={t("results.pdfCorrelationUnlistedNote")}
      correlationColA={t("results.pdfCorrelationColA")}
      correlationColB={t("results.pdfCorrelationColB")}
      correlationColRho={t("results.pdfCorrelationColRho")}
      projectsBasis={comparisonProjects.map((project) => ({
        projectName: project.name,
        assumptions: buildPdfAssumptionTexts(project),
        costItems: buildPdfCostItemBlocks(project),
        drivers: buildPdfDriverBlocks(project),
        impactOverrides: buildPdfImpactOverrides(project),
        correlation: buildPdfCorrelationSection(project),
      }))}
      methodTitle={t("results.pdfMethodTitle")}
      methodParagraphs={methodParagraphs}
      openAnalysisTitle={t("results.pdfOpenAnalysisTitle")}
      openAnalysisHelper={t("results.pdfOpenAnalysisHelper")}
      shareLinkAppendix={shareLinkAppendix}
      shareUnavailableNote={shareUnavailableNote}
      footerText={t("results.pdfFooter")}
      language={language}
    />,
  ).toBlob()

  downloadBlob(
    blob,
    language === "no" ? "usikkerhetsrapport.pdf" : "uncertainty-report.pdf",
  )
}
