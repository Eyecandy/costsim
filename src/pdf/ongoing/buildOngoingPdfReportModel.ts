/**
 * Pure Ongoing PDF report-model builder.
 * Official content = archived/frozen checkpoints only. Never live/draft results.
 * Does not run Monte Carlo / Shapley.
 */

import type {
  AnalysisCheckpoint,
  OngoingAnalysisLifecycle,
} from "@/domain/analysis/analysisCheckpoint"
import { resultSourceFromArchivedSnapshot } from "@/domain/analysis/checkpointComparison"
import { buildPdfAssumptionTexts, mapShapleyToPdfContribution } from "@/pdf/buildPdfReportModel"
import type { AppLanguage } from "@/domain/results/formatNumber"
import { mean } from "@/domain/simulation/stats"
import { computeSCurveDisplaySeries } from "@/domain/results/sCurveDisplay"
import { getProjectColorHex } from "@/domain/results/projectColors"
import type { Project } from "@/domain/analysis/project"
import {
  collectProjectProfileSummaryOptionIds,
  formatProjectProfileSummaryText,
} from "@/domain/analysis/projectProfile"
import {
  isLegacyHeavyArchivedSnapshot,
  isOngoingCheckpointResultSnapshot,
} from "@/domain/analysis/ongoingCheckpointResultSnapshot"
import {
  buildOngoingDevelopmentSeries,
  extractDevelopmentMetrics,
  type OngoingDevelopmentSeries,
} from "@/domain/analysis/ongoingDevelopmentSeries"
import { formatPdfAbsoluteAmount, resolvePdfAmountScale, type PdfAmountScale } from "@/pdf/shared"
import {
  filterCheckpointsUpToCutoff,
  ongoingPdfCheckpointDisplayLabel,
} from "@/pdf/ongoing/resolveOngoingPdfCutoff"
import {
  ONGOING_PDF_REPORT_KIND,
  ONGOING_PDF_SECTION_IDS,
  type BuildOngoingPdfReportModelResult,
  type OngoingPdfComparisonSection,
  type OngoingPdfCover,
  type OngoingPdfFrozenSource,
  type OngoingPdfHistoryRow,
  type OngoingPdfKeyFigureChange,
  type OngoingPdfKeyFigureMetricId,
  type OngoingPdfKeyFigures,
  type OngoingPdfLatestDetail,
  type OngoingPdfReportModel,
  type OngoingPdfTocEntry,
} from "@/pdf/ongoing/ongoingPdfTypes"

export type OngoingPdfKeyFigureLabels = {
  baseCost: string
  p50: string
  p85: string
  expectedValue: string
}

export type OngoingPdfSectionLabels = {
  development: string
  latest: string
  sCurve: string
  tornado: string
  contribution: string
  history: string
  assumptions: string
  method: string
}

/** Localized cover / assumptions copy templates filled at build time. */
export type OngoingPdfCoverCopy = {
  /** "Report basis: Archived checkpoints up to and including {cutoffLabel}." */
  reportBasisArchivedOnly: string
  /**
   * "Report basis: Archived checkpoints up to and including {cutoffLabel}.
   * {draftLabel} is active and is not included in the report."
   */
  reportBasisWithExcludedDraft: string
  /** Concise Ongoing semantics (not technical method). */
  reportMeaning: string
  /**
   * "The assumptions below apply to {cutoffLabel}, the latest archived
   * checkpoint included in the report."
   */
  assumptionsContext: string
}

export type BuildOngoingPdfReportModelInput = {
  analysisName: string
  analysisId?: string
  lifecycle: OngoingAnalysisLifecycle
  checkpoints: readonly AnalysisCheckpoint[]
  /**
   * Explicit PDF cutoff — only archived checkpoints with sequence ≤ this
   * checkpoint are included. Required for historically correct reports.
   */
  cutoffCheckpointId: string
  language: AppLanguage
  brandName: string
  reportKindLabel: string
  keyFigureLabels: OngoingPdfKeyFigureLabels
  sectionLabels: OngoingPdfSectionLabels
  coverCopy: OngoingPdfCoverCopy
  methodParagraphs: string[]
  /** Resolve profile option IDs → localized labels for cover context. */
  resolveProfileOptionLabel?: (optionId: string) => string
  /** Defaults to now. Injected for deterministic tests. */
  generatedAt?: Date | string
}

const METRIC_IDS: OngoingPdfKeyFigureMetricId[] = ["baseCost", "p50", "p85", "expectedValue"]

function fillTemplate(template: string, vars: Record<string, string>): string {
  let out = template
  for (const [key, value] of Object.entries(vars)) {
    out = out.replaceAll(`{${key}}`, value)
  }
  return out
}

function formatAmount(value: number | null, language: AppLanguage, scale: PdfAmountScale): string {
  if (value === null || !Number.isFinite(value)) return "—"
  return formatPdfAbsoluteAmount(value, language, scale)
}

function formatSignedChange(
  value: number | null,
  language: AppLanguage,
  scale: PdfAmountScale,
): string {
  if (value === null || !Number.isFinite(value)) return "—"
  const body = formatPdfAbsoluteAmount(Math.abs(value), language, scale)
  if (value > 0) return `+${body}`
  if (value < 0) return `−${body}`
  return body
}

function metricValue(
  figures: OngoingPdfKeyFigures,
  id: OngoingPdfKeyFigureMetricId,
): number | null {
  return figures[id]
}

function labelFor(labels: OngoingPdfKeyFigureLabels, id: OngoingPdfKeyFigureMetricId): string {
  return labels[id]
}

function scaleForFigures(
  ...figureSets: Array<OngoingPdfKeyFigures | null | undefined>
): PdfAmountScale {
  const amounts: number[] = []
  for (const figures of figureSets) {
    if (!figures) continue
    for (const id of METRIC_IDS) {
      const v = figures[id]
      if (v !== null && Number.isFinite(v)) amounts.push(v)
    }
  }
  return resolvePdfAmountScale(amounts)
}

function frozenProject(checkpoint: AnalysisCheckpoint): Project | null {
  const snap = checkpoint.archivedSnapshot
  if (isOngoingCheckpointResultSnapshot(snap)) {
    return (
      snap.projectsAtRun?.find((p) => p.id === snap.activeProjectId) ??
      snap.projectsAtRun?.[0] ??
      checkpoint.workspace.projects.find((p) => p.id === snap.activeProjectId) ??
      checkpoint.workspace.projects[0] ??
      null
    )
  }
  if (isLegacyHeavyArchivedSnapshot(snap)) {
    return (
      snap.projectsAtArchive.find((p) => p.id === snap.activeProjectIdAtRun) ??
      snap.projectsAtArchive[0] ??
      null
    )
  }
  return checkpoint.workspace.projects[0] ?? null
}

function projectNameFromCheckpoint(checkpoint: AnalysisCheckpoint): string | null {
  const project = frozenProject(checkpoint)
  const name = project?.name?.trim()
  return name || null
}

function frozenSourceOf(checkpoint: AnalysisCheckpoint): OngoingPdfFrozenSource | null {
  const snap = checkpoint.archivedSnapshot
  if (!snap) return null
  if (isOngoingCheckpointResultSnapshot(snap)) return "compact"
  if (isLegacyHeavyArchivedSnapshot(snap)) return "legacy"
  return null
}

/**
 * Key figures from the checkpoint's own archived snapshot only.
 */
export function extractFrozenPdfKeyFigures(
  checkpoint: AnalysisCheckpoint,
): OngoingPdfKeyFigures | null {
  if (checkpoint.status !== "archived" || !checkpoint.archivedSnapshot) {
    return null
  }
  const source = resultSourceFromArchivedSnapshot(checkpoint)
  if (!source) return null

  const snap = checkpoint.archivedSnapshot
  let projectId: string | null = null
  if (isOngoingCheckpointResultSnapshot(snap)) {
    projectId = snap.activeProjectId
  } else if (isLegacyHeavyArchivedSnapshot(snap)) {
    projectId = snap.activeProjectIdAtRun ?? snap.projectsAtArchive[0]?.id ?? null
  }
  if (!projectId) return null

  if (isOngoingCheckpointResultSnapshot(snap)) {
    return {
      baseCost: snap.keyFigures.baseCost,
      p50: snap.keyFigures.percentiles["50"] ?? null,
      p85: snap.keyFigures.percentiles["85"] ?? null,
      expectedValue: snap.keyFigures.expectedValue,
    }
  }

  const metrics = extractDevelopmentMetrics(source, projectId)
  const pr = source.projectResults.find((r) => r.projectId === projectId)
  const expectedValue = pr && pr.values.length > 0 ? mean(pr.values) : null
  if (
    metrics.baseCost === null &&
    metrics.p50 === null &&
    metrics.p85 === null &&
    expectedValue === null
  ) {
    return null
  }
  return {
    baseCost: metrics.baseCost,
    p50: metrics.p50,
    p85: metrics.p85,
    expectedValue: expectedValue !== null && Number.isFinite(expectedValue) ? expectedValue : null,
  }
}

function buildFormattedRows(
  figures: OngoingPdfKeyFigures,
  language: AppLanguage,
  labels: OngoingPdfKeyFigureLabels,
  scale: PdfAmountScale,
) {
  return METRIC_IDS.map((id) => ({
    label: labelFor(labels, id),
    value: formatAmount(metricValue(figures, id), language, scale),
  }))
}

function buildChangeRows(
  previous: OngoingPdfKeyFigures,
  current: OngoingPdfKeyFigures,
  language: AppLanguage,
  labels: OngoingPdfKeyFigureLabels,
): OngoingPdfKeyFigureChange[] {
  const scale = scaleForFigures(previous, current)
  return METRIC_IDS.map((id) => {
    const prev = metricValue(previous, id)
    const cur = metricValue(current, id)
    const change =
      prev !== null && cur !== null && Number.isFinite(prev) && Number.isFinite(cur)
        ? cur - prev
        : null
    return {
      metricId: id,
      label: labelFor(labels, id),
      previous: prev,
      current: cur,
      change,
      previousFormatted: formatAmount(prev, language, scale),
      currentFormatted: formatAmount(cur, language, scale),
      changeFormatted: formatSignedChange(change, language, scale),
    }
  })
}

function buildProjectContext(
  checkpoint: AnalysisCheckpoint,
  resolveProfileOptionLabel?: (optionId: string) => string,
): string | null {
  const project = frozenProject(checkpoint)
  const name = project?.name?.trim() || null
  const ids = collectProjectProfileSummaryOptionIds(project?.profile)
  const profileLabels = resolveProfileOptionLabel
    ? ids.map(resolveProfileOptionLabel).filter((s) => s.trim() !== "")
    : []
  const summary = formatProjectProfileSummaryText(profileLabels)
  const parts = [name, summary].filter((p): p is string => Boolean(p && p.trim()))
  if (parts.length === 0) return null
  return parts.join(" · ")
}

/**
 * Active draft after the report cutoff — excluded from official PDF content.
 */
export function findExcludedDraftAfterCutoff(
  checkpoints: readonly AnalysisCheckpoint[],
  cutoffSequence: number,
): AnalysisCheckpoint | null {
  const drafts = [...checkpoints]
    .filter((c) => c.status === "draft" && c.sequence > cutoffSequence)
    .sort((a, b) => a.sequence - b.sequence)
  return drafts[0] ?? null
}

function buildLatestDetail(
  checkpoint: AnalysisCheckpoint,
  figures: OngoingPdfKeyFigures,
  language: AppLanguage,
  labels: OngoingPdfKeyFigureLabels,
  assumptionsContextTemplate: string,
  cutoffDisplayLabel: string,
): OngoingPdfLatestDetail {
  const scale = scaleForFigures(figures)
  const project = frozenProject(checkpoint)
  const projectName = project?.name?.trim() || "—"
  const snap = checkpoint.archivedSnapshot

  let sCurve: OngoingPdfLatestDetail["sCurve"] = null
  let tornado: OngoingPdfLatestDetail["tornado"] = null
  let contribution: OngoingPdfLatestDetail["contribution"] = null
  let simulationCount: number | null = null
  const assumptions: string[] = project ? buildPdfAssumptionTexts(project) : []
  const assumptionsContextText =
    assumptions.length > 0
      ? fillTemplate(assumptionsContextTemplate, {
          cutoffLabel: cutoffDisplayLabel,
        })
      : null

  if (isOngoingCheckpointResultSnapshot(snap)) {
    simulationCount = snap.simulationCount
    const markerPercentiles = [...snap.resultView.sCurve.percentiles].filter(
      (p) => Number.isFinite(p) && p >= 1 && p <= 99,
    )
    const markers = markerPercentiles.flatMap((p) => {
      const value = snap.keyFigures.percentiles[String(p)]
      if (value === undefined || !Number.isFinite(value)) return []
      return [{ percentile: p, value }]
    })
    if (snap.sCurve.points.length > 0) {
      sCurve = {
        points: snap.sCurve.points.map((p) => ({ x: p.x, y: p.y })),
        color: getProjectColorHex(0),
        label: projectName,
        markerPercentiles,
        markers,
      }
    }
    if (snap.tornado && snap.tornado.length > 0) {
      tornado = snap.tornado.map((row) => ({
        name: row.name,
        lowImpact: row.lowImpact,
        highImpact: row.highImpact,
      }))
    }
    if (snap.contribution) {
      contribution = mapShapleyToPdfContribution(projectName, snap.contribution)
    }
  } else if (isLegacyHeavyArchivedSnapshot(snap)) {
    simulationCount = snap.simulationCount
    const projectId = snap.activeProjectIdAtRun
    const pr = snap.projectResults.find((r) => r.projectId === projectId)
    if (pr && pr.values.length > 0) {
      const points = computeSCurveDisplaySeries(pr.values)
      const markerPercentiles = [...snap.resultView.sCurve.percentiles].filter(
        (p) => Number.isFinite(p) && p >= 1 && p <= 99,
      )
      const markers = markerPercentiles.flatMap((p) => {
        const value = p === 50 ? figures.p50 : p === 85 ? figures.p85 : null
        if (value === null || !Number.isFinite(value)) return []
        return [{ percentile: p, value }]
      })
      if (points.length > 0) {
        sCurve = {
          points,
          color: getProjectColorHex(0),
          label: projectName,
          markerPercentiles,
          markers,
        }
      }
    }
    const tornadoRows = snap.tornadoByProjectId[projectId]
    if (tornadoRows && tornadoRows.length > 0) {
      tornado = tornadoRows.map((row) => ({
        name: row.name,
        lowImpact: row.lowImpact,
        highImpact: row.highImpact,
      }))
    }
    const shapley = snap.shapleyByProjectId[projectId]
    if (shapley) {
      contribution = mapShapleyToPdfContribution(projectName, shapley)
    }
  }

  return {
    checkpointId: checkpoint.id,
    sequence: checkpoint.sequence,
    name: checkpoint.name,
    archivedAt: checkpoint.archivedAt ?? null,
    keyFigures: figures,
    keyFigureRows: buildFormattedRows(figures, language, labels, scale),
    sCurve,
    tornado,
    contribution,
    assumptions,
    assumptionsContextText,
    simulationCount,
  }
}

function buildTocEntries(
  sectionLabels: OngoingPdfSectionLabels,
  detail: OngoingPdfLatestDetail,
): OngoingPdfTocEntry[] {
  const latestSubs: Array<{
    id: (typeof ONGOING_PDF_SECTION_IDS)[keyof typeof ONGOING_PDF_SECTION_IDS]
    label: string
  }> = []
  if (detail.sCurve) {
    latestSubs.push({
      id: ONGOING_PDF_SECTION_IDS.sCurve,
      label: sectionLabels.sCurve,
    })
  }
  if (detail.tornado && detail.tornado.length > 0) {
    latestSubs.push({
      id: ONGOING_PDF_SECTION_IDS.tornado,
      label: sectionLabels.tornado,
    })
  }
  if (detail.contribution) {
    latestSubs.push({
      id: ONGOING_PDF_SECTION_IDS.contribution,
      label: sectionLabels.contribution,
    })
  }

  const entries: OngoingPdfTocEntry[] = [
    {
      id: ONGOING_PDF_SECTION_IDS.development,
      label: sectionLabels.development,
    },
  ]
  if (detail.assumptions.length > 0) {
    entries.push({
      id: ONGOING_PDF_SECTION_IDS.assumptions,
      label: sectionLabels.assumptions,
    })
  }
  entries.push({
    id: ONGOING_PDF_SECTION_IDS.latest,
    label: sectionLabels.latest,
    ...(latestSubs.length > 0 ? { subsections: latestSubs } : {}),
  })
  entries.push({
    id: ONGOING_PDF_SECTION_IDS.history,
    label: sectionLabels.history,
  })
  entries.push({
    id: ONGOING_PDF_SECTION_IDS.method,
    label: sectionLabels.method,
  })
  return entries
}

function buildCover(
  latest: AnalysisCheckpoint,
  latestFigures: OngoingPdfKeyFigures,
  comparison: OngoingPdfComparisonSection | null,
  history: OngoingPdfHistoryRow[],
  detail: OngoingPdfLatestDetail,
  language: AppLanguage,
  labels: OngoingPdfKeyFigureLabels,
  sectionLabels: OngoingPdfSectionLabels,
  reportBasisText: string,
  reportMeaningText: string,
  resolveProfileOptionLabel?: (optionId: string) => string,
): OngoingPdfCover {
  const scale = scaleForFigures(latestFigures)

  const archivedDates = history
    .map((h) => h.archivedAt)
    .filter((d): d is string => Boolean(d))
    .sort()

  return {
    projectContext: buildProjectContext(latest, resolveProfileOptionLabel),
    reportBasisText,
    reportMeaningText,
    currentStatus: latestFigures,
    currentStatusRows: buildFormattedRows(latestFigures, language, labels, scale),
    comparison,
    checkpointContext: {
      latestSequence: latest.sequence,
      latestName: latest.name,
      archivedCount: history.length,
      periodStartIso: archivedDates[0] ?? null,
      periodEndIso: archivedDates[archivedDates.length - 1] ?? null,
    },
    tocEntries: buildTocEntries(sectionLabels, detail),
  }
}

/**
 * Build archived-only development series for the PDF (historically deterministic).
 */
export function buildOngoingPdfDevelopmentSeries(
  checkpoints: readonly AnalysisCheckpoint[],
): OngoingDevelopmentSeries {
  return buildOngoingDevelopmentSeries({ checkpoints })
}

export function buildOngoingPdfReportModel(
  input: BuildOngoingPdfReportModelInput,
): BuildOngoingPdfReportModelResult {
  const cutoffScoped = filterCheckpointsUpToCutoff(input.checkpoints, input.cutoffCheckpointId)
  if (cutoffScoped.length === 0) {
    return { ok: false, reason: "no_archived_checkpoints" }
  }

  const ordered = [...cutoffScoped].sort((a, b) => a.sequence - b.sequence)
  const archived = ordered.filter((c) => c.status === "archived")
  if (archived.length === 0) {
    return { ok: false, reason: "no_archived_checkpoints" }
  }

  const withFrozen = archived.filter((c) => extractFrozenPdfKeyFigures(c) !== null)
  if (withFrozen.length === 0) {
    return { ok: false, reason: "no_frozen_results" }
  }

  // Cutoff id must resolve to the last frozen archived checkpoint in scope.
  // If the caller passed a draft id or unknown id, filter empties / fails above;
  // if they passed an archived id without frozen data, use last frozen ≤ scope.
  const cutoffExplicit = withFrozen.find((c) => c.id === input.cutoffCheckpointId)
  const latestArchived = cutoffExplicit ?? withFrozen[withFrozen.length - 1]!
  const previousArchived = (() => {
    const idx = withFrozen.findIndex((c) => c.id === latestArchived.id)
    return idx > 0 ? withFrozen[idx - 1]! : null
  })()
  const latestFigures = extractFrozenPdfKeyFigures(latestArchived)!
  const previousFigures = previousArchived ? extractFrozenPdfKeyFigures(previousArchived) : null

  const cutoffDisplayLabel = ongoingPdfCheckpointDisplayLabel(latestArchived.sequence)

  const excludedDraftCp = findExcludedDraftAfterCutoff(input.checkpoints, latestArchived.sequence)
  const excludedDraft = excludedDraftCp
    ? {
        checkpointId: excludedDraftCp.id,
        sequence: excludedDraftCp.sequence,
        name: excludedDraftCp.name,
        displayLabel: ongoingPdfCheckpointDisplayLabel(excludedDraftCp.sequence),
      }
    : null

  const reportBasisText = excludedDraft
    ? fillTemplate(input.coverCopy.reportBasisWithExcludedDraft, {
        cutoffLabel: cutoffDisplayLabel,
        draftLabel: excludedDraft.displayLabel,
      })
    : fillTemplate(input.coverCopy.reportBasisArchivedOnly, {
        cutoffLabel: cutoffDisplayLabel,
      })

  const history: OngoingPdfHistoryRow[] = withFrozen.map((cp) => ({
    id: cp.id,
    sequence: cp.sequence,
    name: cp.name,
    archivedAt: cp.archivedAt ?? null,
    keyFigures: extractFrozenPdfKeyFigures(cp)!,
    frozenSource: frozenSourceOf(cp)!,
  }))

  const latestDetail = buildLatestDetail(
    latestArchived,
    latestFigures,
    input.language,
    input.keyFigureLabels,
    input.coverCopy.assumptionsContext,
    cutoffDisplayLabel,
  )

  let comparison: OngoingPdfComparisonSection | null = null
  if (previousArchived && previousFigures) {
    comparison = {
      previous: {
        id: previousArchived.id,
        sequence: previousArchived.sequence,
        name: previousArchived.name,
      },
      current: {
        id: latestArchived.id,
        sequence: latestArchived.sequence,
        name: latestArchived.name,
      },
      rows: buildChangeRows(previousFigures, latestFigures, input.language, input.keyFigureLabels),
    }
  }

  const cover = buildCover(
    latestArchived,
    latestFigures,
    comparison,
    history,
    latestDetail,
    input.language,
    input.keyFigureLabels,
    input.sectionLabels,
    reportBasisText,
    input.coverCopy.reportMeaning,
    input.resolveProfileOptionLabel,
  )

  const generatedAt =
    typeof input.generatedAt === "string"
      ? input.generatedAt
      : (input.generatedAt ?? new Date()).toISOString()

  // Development from cutoff-scoped checkpoints only (drafts without live source skipped).
  const development = buildOngoingPdfDevelopmentSeries(ordered)

  const model: OngoingPdfReportModel = {
    kind: ONGOING_PDF_REPORT_KIND,
    analysis: {
      name: input.analysisName.trim() || "—",
      lifecycle: input.lifecycle,
      ...(input.analysisId ? { analysisId: input.analysisId } : {}),
    },
    metadata: {
      generatedAtIso: generatedAt,
      language: input.language,
      brandName: input.brandName,
      reportKindLabel: input.reportKindLabel,
    },
    cutoff: {
      checkpointId: latestArchived.id,
      sequence: latestArchived.sequence,
      name: latestArchived.name,
      displayLabel: cutoffDisplayLabel,
    },
    excludedDraft,
    cover,
    development,
    latestDetail,
    history,
    methodParagraphs: [...input.methodParagraphs],
  }

  return { ok: true, model }
}

/** @deprecated transitional — use history / cover instead. */
export function projectNameFromCheckpointForTests(checkpoint: AnalysisCheckpoint): string | null {
  return projectNameFromCheckpoint(checkpoint)
}
