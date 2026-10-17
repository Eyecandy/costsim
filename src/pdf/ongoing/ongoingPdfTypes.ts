/**
 * Ongoing Analysis PDF report model — decision-support IA.
 *
 * Cover = report basis + comparison + development snapshot + navigation.
 * Body = Development → Assumptions (if any) → Latest detail → History → Method.
 * Official content = archived/frozen checkpoints only (never active draft).
 */

import type {
  CheckpointStatus,
  OngoingAnalysisLifecycle,
} from "@/lib/analysisCheckpoint"
import type { AppLanguage } from "@/domain/results/formatNumber"
import type { OngoingDevelopmentSeries } from "@/lib/ongoingDevelopmentSeries"
import type { PdfContributionBlock } from "@/pdf/buildPdfReportModel"

export const ONGOING_PDF_REPORT_KIND = "ongoing_pdf_report_v1" as const

/** Internal link destinations for Ongoing PDF TOC. */
export const ONGOING_PDF_SECTION_IDS = {
  development: "ongoing-pdf-development",
  latest: "ongoing-pdf-latest",
  sCurve: "ongoing-pdf-s-curve",
  tornado: "ongoing-pdf-tornado",
  contribution: "ongoing-pdf-contribution",
  history: "ongoing-pdf-history",
  assumptions: "ongoing-pdf-assumptions",
  method: "ongoing-pdf-method",
} as const

export type OngoingPdfSectionId =
  (typeof ONGOING_PDF_SECTION_IDS)[keyof typeof ONGOING_PDF_SECTION_IDS]

export type OngoingPdfFrozenSource = "compact" | "legacy"

export type OngoingPdfKeyFigureMetricId =
  | "baseCost"
  | "p50"
  | "p85"
  | "expectedValue"

export type OngoingPdfKeyFigures = {
  baseCost: number | null
  p50: number | null
  p85: number | null
  expectedValue: number | null
}

export type OngoingPdfFormattedRow = {
  label: string
  value: string
}

export type OngoingPdfKeyFigureChange = {
  metricId: OngoingPdfKeyFigureMetricId
  label: string
  previous: number | null
  current: number | null
  /** current − previous; null if either side missing. */
  change: number | null
  previousFormatted: string
  currentFormatted: string
  changeFormatted: string
}

export type OngoingPdfTocEntry = {
  id: OngoingPdfSectionId
  label: string
  subsections?: Array<{ id: OngoingPdfSectionId; label: string }>
}

export type OngoingPdfComparisonSection = {
  previous: { id: string; sequence: number; name: string }
  current: { id: string; sequence: number; name: string }
  rows: OngoingPdfKeyFigureChange[]
}

export type OngoingPdfCover = {
  /** Project name + optional profile summary (localized at build). */
  projectContext: string | null
  /** Explicit report basis / cutoff (and excluded draft when relevant). */
  reportBasisText: string
  /** Concise Ongoing-report semantics — not the technical method text. */
  reportMeaningText: string
  currentStatus: OngoingPdfKeyFigures
  currentStatusRows: OngoingPdfFormattedRow[]
  /**
   * Checkpoint comparison (previous / current / delta) when ≥2 archived
   * checkpoints are in the report cutoff. Null for a single checkpoint.
   */
  comparison: OngoingPdfComparisonSection | null
  checkpointContext: {
    latestSequence: number
    latestName: string
    archivedCount: number
    periodStartIso: string | null
    periodEndIso: string | null
  }
  /** Only sections that will render. */
  tocEntries: OngoingPdfTocEntry[]
}

export type OngoingPdfSCurve = {
  points: Array<{ x: number; y: number }>
  color: string
  label: string
  markerPercentiles: number[]
  markers: Array<{ percentile: number; value: number }>
}

export type OngoingPdfTornadoRow = {
  name: string
  lowImpact: number
  highImpact: number
}

export type OngoingPdfLatestDetail = {
  checkpointId: string
  sequence: number
  name: string
  archivedAt: string | null
  keyFigures: OngoingPdfKeyFigures
  keyFigureRows: OngoingPdfFormattedRow[]
  sCurve: OngoingPdfSCurve | null
  tornado: OngoingPdfTornadoRow[] | null
  contribution: PdfContributionBlock | null
  /** Frozen assumptions from the cutoff checkpoint project. */
  assumptions: string[]
  /** Localized context line when assumptions are present. */
  assumptionsContextText: string | null
  simulationCount: number | null
}

export type OngoingPdfHistoryRow = {
  id: string
  sequence: number
  name: string
  archivedAt: string | null
  keyFigures: OngoingPdfKeyFigures
  frozenSource: OngoingPdfFrozenSource
}

/** @deprecated Prefer cover / history — kept for transitional callers. */
export type OngoingPdfCheckpoint = {
  id: string
  sequence: number
  name: string
  status: CheckpointStatus
  createdAt: string
  archivedAt: string | null
  isLatestArchived: boolean
  projectName: string | null
  hasFrozenResults: boolean
  keyFigures: OngoingPdfKeyFigures | null
  frozenSource: OngoingPdfFrozenSource | null
}

/** @deprecated Use OngoingPdfComparisonSection / cover.comparison. */
export type OngoingPdfChangeSection = OngoingPdfComparisonSection

export type OngoingPdfReportModel = {
  kind: typeof ONGOING_PDF_REPORT_KIND
  analysis: {
    name: string
    lifecycle: OngoingAnalysisLifecycle
    analysisId?: string
  }
  metadata: {
    generatedAtIso: string
    language: AppLanguage
    brandName: string
    reportKindLabel: string
  }
  /**
   * Explicit report cutoff — latest archived checkpoint included in this PDF.
   * All sections are derived from checkpoints with sequence ≤ this checkpoint.
   */
  cutoff: {
    checkpointId: string
    sequence: number
    name: string
    displayLabel: string
  }
  /**
   * Active draft beyond the cutoff, when present and excluded from the report.
   * Null when the export has no relevant excluded draft.
   */
  excludedDraft: {
    checkpointId: string
    sequence: number
    name: string
    displayLabel: string
  } | null
  cover: OngoingPdfCover
  development: OngoingDevelopmentSeries
  latestDetail: OngoingPdfLatestDetail
  /** Archived checkpoints with frozen results only, sequence order. */
  history: OngoingPdfHistoryRow[]
  methodParagraphs: string[]
  /**
   * Extension slots for future sections without reshaping the core model.
   */
  extensions?: {
    selectedCheckpointIds?: string[]
    includeDraftInDevelopment?: boolean
  }
}

export type OngoingPdfBuildFailureReason =
  | "no_archived_checkpoints"
  | "no_frozen_results"

export type BuildOngoingPdfReportModelResult =
  | { ok: true; model: OngoingPdfReportModel }
  | { ok: false; reason: OngoingPdfBuildFailureReason }
