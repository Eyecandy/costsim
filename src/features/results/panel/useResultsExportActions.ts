import type { ResultPreferencesV1 } from "@/domain/results/resultPreferences"
import type { Project } from "@/domain/analysis/project"
import { useEffect, useRef, useState } from "react"

import { appFeatures } from "@/config/appVariant"
import { buildShareUrl } from "@/persistence/shareLink"
import {
  buildOngoingPdfDraftConfirmCopy,
  planOngoingPdfExport,
} from "@/pdf/ongoing/resolveOngoingPdfCutoff"
import { getProjectColorHex } from "@/domain/results/projectColors"
import { formatNumber } from "@/domain/results/formatNumber"
import {
  firstPersistedSimulationCount,
  resolveReportedSimulationCount,
} from "@/domain/simulation/simulationConfig"
import { fillUncertaintyModelCopy } from "@/domain/simulation/uncertaintyModelConfig"
import { resolveResultView } from "@/domain/results/resultPreferences"
import type { ShapleyAttributionResult } from "@/domain/simulation/shapleyAttribution"
import { buildKeyFigureMetricTableRows } from "@/domain/results/keyFiguresMetricRows"
import { buildKeyFigureMetricTableRowsFromFrozen } from "@/domain/results/keyFiguresMetricRows"
import { mapShapleyToPdfContribution } from "@/pdf/buildPdfReportModel"
import { buildOngoingPdfReportModel } from "@/pdf/ongoing/buildOngoingPdfReportModel"
import { buildAiBriefOngoingDevelopment, buildAiBriefV3 } from "@/domain/results/aiBrief"
import { profileOptionKey } from "@/i18n/messages"
import {
  STALE_ACTION_NOTICE_DISMISS_MS,
  type ResultsPanelProps,
} from "@/features/results/panel/panelTypes"
import type { ResultsDerivedData } from "@/features/results/panel/useResultsDerivedData"
import type { useI18n } from "@/i18n/useI18n"

/** Share link, PDF export and AI brief actions of the Results panel, with their notices and timers. */
export function useResultsExportActions({
  projects,
  activeProjectId,
  projectResults,
  simulatedBaseCostByProjectId,
  pdfExportBlockedStaleInputs,
  simulationCount,
  ongoingCheckpoints,
  viewedCheckpointId,
  analysisName,
  archivedSnapshot,
  ongoingCompactResult,
  singleArchivedCompact,
  singleDraftResult,
  draftResultSeed,
  analysisMode,
  ongoingLifecycle,
  checkpointComparisonResultSource,
  frozenKeyFiguresByProjectId,
  resultsByProjectId,
  baseCostByProjectId,
  simulatedIncurredByProjectId,
  compactResultByProjectId,
  tornadoRowsByProjectId,
  t,
  language,
  resultPreferences,
  archivedResultView,
  displayProjects,
  useCompactResults,
  getShapleyResult,
}: Pick<
  ResultsPanelProps,
  | "projects"
  | "activeProjectId"
  | "projectResults"
  | "simulatedBaseCostByProjectId"
  | "pdfExportBlockedStaleInputs"
  | "simulationCount"
  | "ongoingCheckpoints"
  | "viewedCheckpointId"
  | "analysisName"
> &
  Required<
    Pick<
      ResultsPanelProps,
      | "archivedSnapshot"
      | "ongoingCompactResult"
      | "singleArchivedCompact"
      | "singleDraftResult"
      | "draftResultSeed"
      | "analysisMode"
      | "ongoingLifecycle"
      | "checkpointComparisonResultSource"
    >
  > &
  Pick<
    ResultsDerivedData,
    | "frozenKeyFiguresByProjectId"
    | "resultsByProjectId"
    | "baseCostByProjectId"
    | "simulatedIncurredByProjectId"
    | "compactResultByProjectId"
    | "tornadoRowsByProjectId"
  > & {
    t: ReturnType<typeof useI18n>["t"]
    language: ReturnType<typeof useI18n>["language"]
    resultPreferences: ResultPreferencesV1
    archivedResultView: ReturnType<typeof resolveResultView> | null
    displayProjects: Project[]
    useCompactResults: boolean
    getShapleyResult: (projectId: string) => ShapleyAttributionResult | null
  }) {
  const [shareCopied, setShareCopied] = useState(false)
  const [aiBriefCopied, setAiBriefCopied] = useState(false)
  const [showPdfBlockedNotice, setShowPdfBlockedNotice] = useState(false)
  const [showOngoingPdfBlockedNotice, setShowOngoingPdfBlockedNotice] = useState(false)
  const [ongoingPdfDraftConfirm, setOngoingPdfDraftConfirm] = useState<{
    cutoffCheckpointId: string
    draftLabel: string
    cutoffLabel: string
    title: string
    message: string
  } | null>(null)
  const [showShareBlockedNotice, setShowShareBlockedNotice] = useState(false)
  const [showShareOversizedNotice, setShowShareOversizedNotice] = useState(false)
  const [showPdfShareOversizedNotice, setShowPdfShareOversizedNotice] = useState(false)
  const [showAiBriefStaleNotice, setShowAiBriefStaleNotice] = useState(false)

  const shareCopiedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const aiBriefCopiedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pdfStaleNoticeDismissRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const shareStaleNoticeDismissRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const shareOversizedNoticeDismissRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pdfShareOversizedNoticeDismissRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const aiBriefStaleNoticeDismissRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleCopyShareLink = async () => {
    if (pdfExportBlockedStaleInputs) {
      setShowShareOversizedNotice(false)
      setShowShareBlockedNotice(true)
      if (shareStaleNoticeDismissRef.current !== null) {
        clearTimeout(shareStaleNoticeDismissRef.current)
      }
      shareStaleNoticeDismissRef.current = setTimeout(() => {
        shareStaleNoticeDismissRef.current = null
        setShowShareBlockedNotice(false)
      }, STALE_ACTION_NOTICE_DISMISS_MS)
      return
    }
    if (shareStaleNoticeDismissRef.current !== null) {
      clearTimeout(shareStaleNoticeDismissRef.current)
      shareStaleNoticeDismissRef.current = null
    }
    if (shareOversizedNoticeDismissRef.current !== null) {
      clearTimeout(shareOversizedNoticeDismissRef.current)
      shareOversizedNoticeDismissRef.current = null
    }
    setShowShareBlockedNotice(false)
    setShowShareOversizedNotice(false)
    const built = await buildShareUrl({ projects, activeProjectId })
    if (!built.ok) {
      if (built.reason === "oversized") {
        setShowShareOversizedNotice(true)
        shareOversizedNoticeDismissRef.current = setTimeout(() => {
          shareOversizedNoticeDismissRef.current = null
          setShowShareOversizedNotice(false)
        }, STALE_ACTION_NOTICE_DISMISS_MS)
      }
      return
    }
    const url = built.url

    const copyWithExecCommand = (text: string): boolean => {
      const textarea = document.createElement("textarea")
      textarea.value = text
      textarea.setAttribute("readonly", "")
      textarea.style.position = "fixed"
      textarea.style.top = "0"
      textarea.style.left = "0"
      textarea.style.opacity = "0"
      document.body.appendChild(textarea)
      textarea.focus()
      textarea.select()
      textarea.setSelectionRange(0, textarea.value.length)
      const ok = document.execCommand("copy")
      document.body.removeChild(textarea)
      return ok
    }

    let copied = false
    try {
      await navigator.clipboard.writeText(url)
      copied = true
    } catch {
      copied = copyWithExecCommand(url)
    }
    if (!copied) return

    if (shareCopiedTimerRef.current !== null) {
      clearTimeout(shareCopiedTimerRef.current)
    }
    setShareCopied(true)
    shareCopiedTimerRef.current = setTimeout(() => {
      shareCopiedTimerRef.current = null
      setShareCopied(false)
    }, 2000)
  }

  const generateOngoingPdf = async (cutoffCheckpointId: string) => {
    const checkpoints = ongoingCheckpoints ?? []
    const cutoffCp = checkpoints.find((c) => c.id === cutoffCheckpointId)
    const latestSnap = cutoffCp?.archivedSnapshot
    const methodSimCount = resolveReportedSimulationCount(
      latestSnap &&
        typeof latestSnap === "object" &&
        "simulationCount" in latestSnap &&
        typeof (latestSnap as { simulationCount?: unknown }).simulationCount === "number"
        ? (latestSnap as { simulationCount: number }).simulationCount
        : undefined,
    )
    const simCountLabel = formatNumber(methodSimCount, 0, language)
    const built = buildOngoingPdfReportModel({
      analysisName: analysisName ?? "",
      lifecycle: ongoingLifecycle,
      checkpoints,
      cutoffCheckpointId,
      language,
      brandName: t("results.pdfBrandName"),
      reportKindLabel: t("results.pdfOngoingReportKindLabel"),
      keyFigureLabels: {
        baseCost: t("keyMetrics.baseCost"),
        p50: t("keyMetrics.p50"),
        p85: t("keyMetrics.p85"),
        expectedValue: t("keyMetrics.expectedValue"),
      },
      sectionLabels: {
        development: t("results.pdfOngoingDevelopmentTitle"),
        latest: t("results.pdfOngoingLatestSummaryTitle"),
        sCurve: t("charts.sCurveTitle"),
        tornado: t("charts.tornadoTitle"),
        contribution: t("results.pdfContributionTitle"),
        history: t("results.pdfOngoingHistoryTitle"),
        assumptions: t("results.pdfOngoingAssumptionsTitle"),
        method: t("results.pdfOngoingMethodTitle"),
      },
      coverCopy: {
        reportBasisArchivedOnly: t("results.pdfOngoingReportBasisArchivedOnly"),
        reportBasisWithExcludedDraft: t("results.pdfOngoingReportBasisWithExcludedDraft"),
        reportMeaning: t("results.pdfOngoingReportMeaning"),
        assumptionsContext: t("results.pdfOngoingAssumptionsContext"),
      },
      methodParagraphs: [
        fillUncertaintyModelCopy(t("results.pdfMethodParagraph1"), {
          language,
          count: simCountLabel,
        }),
        t("results.pdfMethodParagraph2"),
        t("results.pdfMethodParagraph3"),
      ],
      resolveProfileOptionLabel: (optionId) => t(profileOptionKey(optionId)),
    })
    if (!built.ok) {
      setShowOngoingPdfBlockedNotice(true)
      if (pdfStaleNoticeDismissRef.current !== null) {
        clearTimeout(pdfStaleNoticeDismissRef.current)
      }
      pdfStaleNoticeDismissRef.current = setTimeout(() => {
        pdfStaleNoticeDismissRef.current = null
        setShowOngoingPdfBlockedNotice(false)
      }, STALE_ACTION_NOTICE_DISMISS_MS)
      return
    }

    const { downloadOngoingReportPdf } = await import("@/features/results/pdfExport")
    await downloadOngoingReportPdf({ model: built.model, language, t })
  }

  const handleDownloadPdf = async () => {
    if (projects.length === 0) return

    // Ongoing PDF: route on analysisMode only — never infer from checkpoint presence.
    // Cutoff follows the currently viewed checkpoint; drafts require confirmation.
    if (analysisMode === "ongoing") {
      setShowPdfBlockedNotice(false)
      setShowOngoingPdfBlockedNotice(false)
      setOngoingPdfDraftConfirm(null)

      const plan = planOngoingPdfExport({
        checkpoints: ongoingCheckpoints ?? [],
        selectedCheckpointId: viewedCheckpointId,
      })

      if (plan.action === "block") {
        setShowOngoingPdfBlockedNotice(true)
        if (pdfStaleNoticeDismissRef.current !== null) {
          clearTimeout(pdfStaleNoticeDismissRef.current)
        }
        pdfStaleNoticeDismissRef.current = setTimeout(() => {
          pdfStaleNoticeDismissRef.current = null
          setShowOngoingPdfBlockedNotice(false)
        }, STALE_ACTION_NOTICE_DISMISS_MS)
        return
      }

      if (plan.action === "confirm") {
        const copy = buildOngoingPdfDraftConfirmCopy({
          draftSequence: plan.selectedCheckpoint.sequence,
          cutoffSequence: plan.cutoffCheckpoint.sequence,
          titleTemplate: t("results.pdfOngoingDraftNotArchivedTitle"),
          bodyTemplate: t("results.pdfOngoingDraftExportBody"),
        })
        setOngoingPdfDraftConfirm({
          cutoffCheckpointId: plan.cutoffCheckpointId,
          draftLabel: copy.draftLabel,
          cutoffLabel: copy.cutoffLabel,
          title: copy.title,
          message: copy.message,
        })
        return
      }

      await generateOngoingPdf(plan.cutoffCheckpointId)
      return
    }

    if (pdfExportBlockedStaleInputs) {
      setShowPdfBlockedNotice(true)
      if (pdfStaleNoticeDismissRef.current !== null) {
        clearTimeout(pdfStaleNoticeDismissRef.current)
      }
      pdfStaleNoticeDismissRef.current = setTimeout(() => {
        pdfStaleNoticeDismissRef.current = null
        setShowPdfBlockedNotice(false)
      }, STALE_ACTION_NOTICE_DISMISS_MS)
      return
    }
    if (pdfStaleNoticeDismissRef.current !== null) {
      clearTimeout(pdfStaleNoticeDismissRef.current)
      pdfStaleNoticeDismissRef.current = null
    }
    setShowPdfBlockedNotice(false)
    setShowOngoingPdfBlockedNotice(false)
    if (pdfShareOversizedNoticeDismissRef.current !== null) {
      clearTimeout(pdfShareOversizedNoticeDismissRef.current)
      pdfShareOversizedNoticeDismissRef.current = null
    }
    setShowPdfShareOversizedNotice(false)
    // Snapshot Result Preferences at Generate click (archived prefs when viewing archive).
    const resultViewSnapshot = archivedResultView ?? resolveResultView(resultPreferences)
    const comparisonProjects = displayProjects

    const rowLabels = {
      baseCost: t("keyMetrics.baseCost"),
      expectedAddition: t("keyMetrics.expectedAddition"),
      expectedValue: t("keyMetrics.expectedValue"),
      uncertaintyPremium: t("keyMetrics.uncertaintyPremium"),
      stdDev: t("keyMetrics.stdDev"),
      probabilityAtBaseCost: t("keyMetrics.probabilityAtBaseCost"),
      probabilityBelowCostLevel: t("keyMetrics.probabilityBelowWithAmount"),
      locked: t("results.locked"),
    }
    const rows = useCompactResults
      ? buildKeyFigureMetricTableRowsFromFrozen({
          resultView: resultViewSnapshot,
          projectIds: comparisonProjects.map((project) => project.id),
          frozenByProjectId: frozenKeyFiguresByProjectId,
          language,
          labels: rowLabels,
        })
      : buildKeyFigureMetricTableRows({
          resultView: resultViewSnapshot,
          projects: comparisonProjects,
          valuesByProjectId: resultsByProjectId,
          baseCostByProjectId,
          simulatedIncurredByProjectId,
          language,
          labels: rowLabels,
        })

    let shareLinkAppendix: {
      url: string
      linkLabel: string
    } | null = null
    let shareUnavailableNote: string | null = null
    if (appFeatures.allowShareLink) {
      const built = await buildShareUrl({ projects, activeProjectId })
      if (!built.ok) {
        if (built.reason === "oversized") {
          setShowPdfShareOversizedNotice(true)
          pdfShareOversizedNoticeDismissRef.current = setTimeout(() => {
            pdfShareOversizedNoticeDismissRef.current = null
            setShowPdfShareOversizedNotice(false)
          }, STALE_ACTION_NOTICE_DISMISS_MS)
          shareUnavailableNote = t("results.pdfShareUnavailableNote")
        }
        // Continue PDF without a share link — never embed a broken/oversized URL.
      } else {
        const trimmed = built.url.trim()
        if (trimmed) {
          shareLinkAppendix = {
            url: trimmed,
            linkLabel: t("results.pdfShareLinkAnchorText"),
          }
        }
      }
    }

    const contributionBlocks = comparisonProjects.flatMap((project) => {
      const existing = getShapleyResult(project.id)
      if (!existing) return []
      return [mapShapleyToPdfContribution(project.name, existing)]
    })

    const reportedSimulationCount = resolveReportedSimulationCount(
      firstPersistedSimulationCount(
        singleArchivedCompact,
        singleDraftResult,
        archivedSnapshot,
        draftResultSeed,
        { simulationCount },
      ),
    )
    const simCountLabel = formatNumber(reportedSimulationCount, 0, language)
    const methodParagraphs = [
      fillUncertaintyModelCopy(t("results.pdfMethodParagraph1"), {
        language,
        count: simCountLabel,
      }),
      t("results.pdfMethodParagraph2"),
      t("results.pdfMethodParagraph3"),
    ]

    const { downloadProjectReportPdf } = await import("@/features/results/pdfExport")
    await downloadProjectReportPdf({
      language,
      t,
      comparisonProjects,
      rows,
      sCurvePercentiles: resultViewSnapshot.sCurve.percentiles,
      sCurveSeries: comparisonProjects.map((project, idx) => ({
        id: project.id,
        label: project.name,
        ...(compactResultByProjectId.has(project.id)
          ? {
              displayPoints: compactResultByProjectId.get(project.id)!.sCurve.points,
            }
          : { values: resultsByProjectId.get(project.id) ?? [] }),
        color: getProjectColorHex(idx),
      })),
      tornadoProjects: comparisonProjects.map((project) => ({
        projectName: project.name,
        rows: (tornadoRowsByProjectId.get(project.id) ?? []).map((row) => ({
          name: row.name,
          lowImpact: row.lowImpact,
          highImpact: row.highImpact,
        })),
      })),
      contributionBlocks,
      methodParagraphs,
      shareLinkAppendix,
      shareUnavailableNote,
    })
  }

  const handleCopyAiBriefPackage = async () => {
    if (projects.length === 0) return
    if (pdfExportBlockedStaleInputs) {
      setShowAiBriefStaleNotice(true)
      if (aiBriefStaleNoticeDismissRef.current !== null) {
        clearTimeout(aiBriefStaleNoticeDismissRef.current)
      }
      aiBriefStaleNoticeDismissRef.current = setTimeout(() => {
        aiBriefStaleNoticeDismissRef.current = null
        setShowAiBriefStaleNotice(false)
      }, STALE_ACTION_NOTICE_DISMISS_MS)
      return
    }
    if (aiBriefStaleNoticeDismissRef.current !== null) {
      clearTimeout(aiBriefStaleNoticeDismissRef.current)
      aiBriefStaleNoticeDismissRef.current = null
    }
    setShowAiBriefStaleNotice(false)
    setShowPdfBlockedNotice(false)
    // Snapshot Result Preferences at Generate click (archived prefs when viewing archive).
    const resultViewSnapshot = archivedResultView ?? resolveResultView(resultPreferences)
    const contributionAnalysisByProjectId: Record<string, ShapleyAttributionResult> = {}
    for (const project of projects) {
      const existing = getShapleyResult(project.id)
      if (existing) contributionAnalysisByProjectId[project.id] = existing
    }
    const ongoingDevelopment =
      analysisMode === "ongoing" &&
      viewedCheckpointId &&
      ongoingCheckpoints &&
      ongoingCheckpoints.length > 0
        ? buildAiBriefOngoingDevelopment({
            checkpoints: ongoingCheckpoints,
            viewedCheckpointId,
            viewedResultSource: checkpointComparisonResultSource,
          })
        : null
    const brief = buildAiBriefV3({
      language,
      projects,
      activeProjectId,
      projectResults,
      simulatedBaseCostByProjectId,
      simulationCount: resolveReportedSimulationCount(
        firstPersistedSimulationCount(
          singleArchivedCompact,
          singleDraftResult,
          archivedSnapshot,
          draftResultSeed,
          ongoingCompactResult,
          { simulationCount },
        ),
      ),
      contributionAnalysisByProjectId,
      resultView: resultViewSnapshot,
      ongoingCompactResult,
      compactByProjectId: Object.fromEntries(compactResultByProjectId),
      ongoingDevelopment,
    })
    const promptBase = t("results.aiBriefClipboardPrompt")
    const prompt =
      analysisMode === "ongoing"
        ? `${promptBase}\n\n${t("results.aiBriefClipboardPromptOngoingAddendum")}`
        : promptBase
    const json = JSON.stringify(brief, null, 2)
    const payload = `${prompt}\n\n\`\`\`json\n${json}\n\`\`\``

    const copyWithExecCommand = (text: string): boolean => {
      const textarea = document.createElement("textarea")
      textarea.value = text
      textarea.setAttribute("readonly", "")
      textarea.style.position = "fixed"
      textarea.style.top = "0"
      textarea.style.left = "0"
      textarea.style.opacity = "0"
      document.body.appendChild(textarea)
      textarea.focus()
      textarea.select()
      textarea.setSelectionRange(0, textarea.value.length)
      const ok = document.execCommand("copy")
      document.body.removeChild(textarea)
      return ok
    }

    let copied = false
    try {
      await navigator.clipboard.writeText(payload)
      copied = true
    } catch {
      copied = copyWithExecCommand(payload)
    }
    if (!copied) return

    if (aiBriefCopiedTimerRef.current !== null) {
      clearTimeout(aiBriefCopiedTimerRef.current)
    }
    setAiBriefCopied(true)
    aiBriefCopiedTimerRef.current = setTimeout(() => {
      aiBriefCopiedTimerRef.current = null
      setAiBriefCopied(false)
    }, 2000)
  }

  useEffect(() => {
    return () => {
      if (shareCopiedTimerRef.current !== null) {
        clearTimeout(shareCopiedTimerRef.current)
      }
      if (aiBriefCopiedTimerRef.current !== null) {
        clearTimeout(aiBriefCopiedTimerRef.current)
      }
      if (pdfStaleNoticeDismissRef.current !== null) {
        clearTimeout(pdfStaleNoticeDismissRef.current)
      }
      if (shareStaleNoticeDismissRef.current !== null) {
        clearTimeout(shareStaleNoticeDismissRef.current)
      }
      if (shareOversizedNoticeDismissRef.current !== null) {
        clearTimeout(shareOversizedNoticeDismissRef.current)
      }
      if (pdfShareOversizedNoticeDismissRef.current !== null) {
        clearTimeout(pdfShareOversizedNoticeDismissRef.current)
      }
      if (aiBriefStaleNoticeDismissRef.current !== null) {
        clearTimeout(aiBriefStaleNoticeDismissRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (!pdfExportBlockedStaleInputs) {
      if (pdfStaleNoticeDismissRef.current !== null) {
        clearTimeout(pdfStaleNoticeDismissRef.current)
        pdfStaleNoticeDismissRef.current = null
      }
      if (shareStaleNoticeDismissRef.current !== null) {
        clearTimeout(shareStaleNoticeDismissRef.current)
        shareStaleNoticeDismissRef.current = null
      }
      if (aiBriefStaleNoticeDismissRef.current !== null) {
        clearTimeout(aiBriefStaleNoticeDismissRef.current)
        aiBriefStaleNoticeDismissRef.current = null
      }
      setShowPdfBlockedNotice(false)
      setShowShareBlockedNotice(false)
      setShowAiBriefStaleNotice(false)
    }
  }, [pdfExportBlockedStaleInputs])

  return {
    shareCopied,
    aiBriefCopied,
    showPdfBlockedNotice,
    showOngoingPdfBlockedNotice,
    ongoingPdfDraftConfirm,
    setOngoingPdfDraftConfirm,
    showShareBlockedNotice,
    showShareOversizedNotice,
    showPdfShareOversizedNotice,
    showAiBriefStaleNotice,
    handleCopyShareLink,
    generateOngoingPdf,
    handleDownloadPdf,
    handleCopyAiBriefPackage,
  }
}
