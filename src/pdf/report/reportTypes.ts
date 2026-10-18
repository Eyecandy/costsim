import { type AppLanguage } from "@/domain/results/formatNumber"
import {
  type PdfContributionBlock,
  type PdfCorrelationSection,
  type PdfCostItemBlock,
  type PdfDriverBlock,
  type PdfImpactOverride,
} from "@/pdf/buildPdfReportModel"

export type ReportRow = {
  label: string
  values: string[]
}

export type ReportColumn = {
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

export type ProjectReportDocumentProps = {
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
  sCurveSeries: {
    id: string
    label: string
    values?: readonly number[]
    displayPoints?: readonly { x: number; y: number }[]
    color: string
  }[]
  /**
   * Active S-curve marker percentiles from the current Result View snapshot.
   * Defaults to P50/P85 for older call sites / sample PDFs.
   */
  sCurveMarkerPercentiles?: readonly number[]
  uncertaintyPictureTitle: string
  tornadoTitle: string
  tornadoExplanation: string
  tornadoProjects: {
    projectName: string
    rows: {
      name: string
      lowImpact: number
      highImpact: number
    }[]
  }[]
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
