import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import { Button, buttonVariants } from "@/shared/ui/button"
import { type Project } from "@/domain/analysis/project"
import { appFeatures } from "@/config/appVariant"
import { buildShareUrl } from "@/persistence/shareLink"
import { parseProjectsPayload } from "@/domain/analysis/projectsPayload"
import { useI18n } from "@/i18n/useI18n"
import type { ProjectResult } from "@/domain/simulation/simulationTypes"
import { Card, CardContent } from "@/shared/ui/card"
import {
  computeDeterministicTornadoRows,
  type DeterministicTornadoRow,
} from "@/domain/simulation/deterministicTornado"
import { ResultsDevelopmentChart } from "@/features/results/ResultsDevelopmentChart"
import { ResultsSCurve } from "@/features/results/ResultsSCurve"
import { CheckpointComparisonSection } from "@/features/results/CheckpointComparisonSection"
import type { AnalysisCheckpoint } from "@/domain/analysis/analysisCheckpoint"
import type { AnalysisMode } from "@/domain/analysis/analysisDocument"
import {
  compareCheckpoints,
  type CheckpointResultSource,
} from "@/domain/analysis/checkpointComparison"
import {
  formatCheckpointLegendLabel,
} from "@/domain/analysis/checkpointComparisonPresentation"
import { listVisibleComparableKeyFigureRowIds } from "@/domain/results/keyFigureVisibility"
import { ConfirmDialog } from "@/shared/ConfirmDialog"
import {
  buildOngoingPdfDraftConfirmCopy,
  planOngoingPdfExport,
} from "@/pdf/ongoing/resolveOngoingPdfCutoff"
import { ResultsWaterfall } from "@/features/results/ResultsWaterfall"
import { ResultsReserveWaterfall } from "@/features/results/ResultsReserveWaterfall"
import { ResultsKeyFiguresTable } from "@/features/results/ResultsKeyFiguresTable"
import { ResultPreferencesPanel } from "@/features/results/ResultPreferencesPanel"
import { ProjectColorSwatch } from "@/shared/ProjectColorSwatch"
import {
  FOCUS_NEXT_STEPS_ACTION_CLASS,
  FOCUS_NEXT_STEPS_ACTION_COL_CLASS,
} from "@/domain/guided/focusSessionFrame"
import { toggleSelectedProjectId } from "@/domain/results/sCurveProjectEmphasis"
import {
  getProjectColorCssVar,
  getProjectColorHex,
} from "@/domain/results/projectColors"
import { ResultsTornado } from "@/features/results/ResultsTornado"
import { buildTornadoSharedLayout, computeTornadoSharedSymmetricMaxAbs } from "@/features/results/tornadoShared"
import { ExpandedChartDialog } from "@/features/results/ExpandedChartDialog"
import { formatNumber } from "@/domain/results/formatNumber"
import {
  firstPersistedSimulationCount,
  resolveReportedSimulationCount,
} from "@/domain/simulation/simulationConfig"
import { fillUncertaintyModelCopy } from "@/domain/simulation/uncertaintyModelConfig"
import { resolveTornadoDisplayScales } from "@/domain/results/formatWaterfallValue"
import { useLazyShapleyAttribution } from "@/features/results/useLazyShapleyAttribution"
import {
  resolveSCurvePercentiles,
  resolveResultView,
  type ResultPreferencesV1,
} from "@/domain/results/resultPreferences"
import {
  shouldShowResultSettingsEditor,
  shouldUseCompactResultAnalytics,
} from "@/domain/results/resultSettingsPresentation"
import type { ArchivedAnalysisSnapshotV1 } from "@/domain/analysis/archivedAnalysisSnapshot"
import type { DraftResultSeedV1 } from "@/domain/analysis/draftResultSeed"
import type { ShapleyAttributionResult } from "@/domain/simulation/shapleyAttribution"
import { buildOngoingDevelopmentSeries } from "@/domain/analysis/ongoingDevelopmentSeries"
import { buildKeyFigureMetricTableRows } from "@/domain/results/keyFiguresMetricRows"
import { buildKeyFigureMetricTableRowsFromFrozen } from "@/domain/results/keyFiguresMetricRows"
import type { OngoingCheckpointResultSnapshotV1 } from "@/domain/analysis/ongoingCheckpointResultSnapshot"
import type { CompactProjectResultV1 } from "@/domain/analysis/compactAnalysisResult"
import type { SingleArchivedResultSnapshotV1 } from "@/domain/analysis/singleArchivedResultSnapshot"
import type { SingleDraftResultSnapshotV1 } from "@/domain/analysis/singleDraftResultSnapshot"
import { Check, Play } from "lucide-react"
import { mapShapleyToPdfContribution } from "@/pdf/buildPdfReportModel"
import { buildOngoingPdfReportModel } from "@/pdf/ongoing/buildOngoingPdfReportModel"
import {
  buildAiBriefOngoingDevelopment,
  buildAiBriefV3,
} from "@/domain/results/aiBrief"
import { SectionExpander } from "@/shared/SectionExpander"
import { SpotlightLoadingText } from "@/shared/SpotlightLoadingText"
import { simulationRunKeyForProjects } from "@/domain/simulation/simulationRunId"
import type { FocusResultSectionId } from "@/domain/guided/focusResultSteps"

/** Auto-dismiss for stale-input notices under PDF / share / AI brief actions. */
const STALE_ACTION_NOTICE_DISMISS_MS = 4000

type ExpandedResultChart =
  | { kind: "keyFigures" }
  | { kind: "development" }
  | { kind: "scurve" }
  | { kind: "tornado"; projectId: string; projectName: string }
  | { kind: "expectedAddition"; projectId: string; projectName: string }
  | { kind: "uncertaintyReserve"; projectId: string; projectName: string }

type ResultsPanelProps = {
  projects: Project[]
  activeProjectId: string
  projectResults: ProjectResult[]
  simulatedBaseCostByProjectId: Record<string, number | null>
  /** Canonical analytical signature from the last completed simulation. */
  lastSimulatedInputSignature: string
  /** Full projects captured at last simulation — Results display baseline. */
  lastSimulatedProjects?: readonly Project[]
  /** Per-project run token from the last completed main simulation. */
  simulationRunIdByProjectId: Readonly<Record<string, string>>
  /** Matches `runs` sent to the simulation worker (Monte Carlo draws per project). */
  simulationCount: number
  /** True when live `projects` no longer match the last completed simulation (same as stale notice). */
  pdfExportBlockedStaleInputs: boolean
  /** When true, do not compute new Contribution/Shapley (archived snapshot view). */
  analysisArchivedView?: boolean
  /** Frozen archive payload; used when `analysisArchivedView` is true. */
  archivedSnapshot?: ArchivedAnalysisSnapshotV1 | null
  ongoingCompactResult?: OngoingCheckpointResultSnapshotV1 | null
  singleArchivedCompact?: SingleArchivedResultSnapshotV1 | null
  singleDraftResult?: SingleDraftResultSnapshotV1 | null
  /**
   * Remapped results from "Create new version". While present, Contribution
   * uses seeded Shapley (no live recomputation) until cleared after re-sim.
   */
  draftResultSeed?: DraftResultSeedV1 | null
  /** Live session Result Preferences (single source of truth from App). */
  liveResultPreferences: ResultPreferencesV1
  replacePreferences: (next: ResultPreferencesV1) => void
  saveAsDefault: () => void
  resetToDefaults: () => void
  addKeyFigurePercentile: (p: number) => void
  removeKeyFigurePercentile: (p: number) => void
  addSCurvePercentile: (p: number) => void
  removeSCurvePercentile: (p: number) => void
  /**
   * Ongoing Analysis only: same archive entry as the analysis actions menu.
   * When omitted (Single / read-only), the Results shortcut is hidden.
   */
  onRequestArchiveAndCreateNext?: () => void
  /**
   * Active Ongoing Analysis only: finish whole analysis after tip is archived.
   * Shown even while viewing an archived checkpoint (document still draft).
   */
  onRequestFinishOngoingAnalysis?: () => void
  /**
   * Domain analysis mode — PDF export routes on this explicitly
   * (not on presence of `ongoingCheckpoints`).
   */
  analysisMode?: AnalysisMode
  /**
   * Ongoing Analysis only: checkpoint list + viewed id for comparison layer.
   * Omitted for Single Analysis — comparison section is not shown.
   */
  ongoingCheckpoints?: readonly AnalysisCheckpoint[]
  viewedCheckpointId?: string
  /** Display name of the open analysis (PDF cover). */
  analysisName?: string
  /** Ongoing lifecycle for PDF metadata; ignored for Single. */
  ongoingLifecycle?: "active" | "completed"
  /**
   * Hydrated results for the viewed checkpoint (live or archived).
   * `resultsComparable` must be false when live inputs are stale.
   */
  checkpointComparisonResultSource?: CheckpointResultSource | null
  /**
   * Ongoing live tip: when Contribution finishes, attach it to the compact
   * draft snapshot for reload continuity (no full MC arrays).
   */
  onContributionReady?: (
    projectId: string,
    contribution: ShapleyAttributionResult,
    simulationRunId: string,
  ) => void
  /**
   * Open Results inside Focus mode (presentation only).
   * When omitted, the Focus entry control is hidden.
   */
  onOpenFocusResults?: () => void
  /** When true, Results are rendered inside Focus — hide the Focus entry control. */
  focusResultsActive?: boolean
  /**
   * When set, render only this analytical section (Focus stepwise Results).
   * Presentation-only; does not change analytical state.
   */
  focusSection?: FocusResultSectionId | null
  /** Focus Next Steps: exit Focus to normal Input. */
  onFocusReviewInput?: () => void
}

export function ResultsPanel({
  projects,
  activeProjectId,
  projectResults,
  simulatedBaseCostByProjectId,
  lastSimulatedInputSignature,
  lastSimulatedProjects = [],
  simulationRunIdByProjectId,
  simulationCount,
  pdfExportBlockedStaleInputs,
  analysisArchivedView = false,
  archivedSnapshot = null,
  ongoingCompactResult = null,
  singleArchivedCompact = null,
  singleDraftResult = null,
  draftResultSeed = null,
  liveResultPreferences,
  replacePreferences,
  saveAsDefault,
  resetToDefaults,
  addKeyFigurePercentile,
  removeKeyFigurePercentile,
  addSCurvePercentile,
  removeSCurvePercentile,
  onRequestArchiveAndCreateNext,
  onRequestFinishOngoingAnalysis,
  analysisMode = "single",
  ongoingCheckpoints,
  viewedCheckpointId,
  analysisName,
  ongoingLifecycle = "active",
  checkpointComparisonResultSource = null,
  onContributionReady,
  onOpenFocusResults,
  focusResultsActive = false,
  focusSection = null,
  onFocusReviewInput,
}: ResultsPanelProps) {
  const { t, language } = useI18n()
  const useArchivedResults = Boolean(
    analysisArchivedView && archivedSnapshot,
  )
  // Live MC arrays win over persisted draft compact (reload fallback only).
  const useCompactResults = shouldUseCompactResultAnalytics({
    projectResults,
    ongoingCompactResult,
    singleArchivedCompact,
    singleDraftResult,
  })
  const resultSettingsEditable = shouldShowResultSettingsEditor({
    analysisArchivedView,
    useArchivedResults,
  })
  // Editable drafts always edit App/live prefs. Compact/archive snapshots keep
  // frozen interpretation for read-only views only.
  const resultPreferences = resultSettingsEditable
    ? liveResultPreferences
    : useCompactResults
      ? (ongoingCompactResult ?? singleArchivedCompact ?? singleDraftResult)!
          .resultPreferences
      : useArchivedResults
        ? archivedSnapshot!.resultPreferences
        : liveResultPreferences
  const archivedResultView =
    resultSettingsEditable
      ? null
      : useCompactResults
        ? (ongoingCompactResult ?? singleArchivedCompact ?? singleDraftResult)!
            .resultView
        : useArchivedResults
          ? archivedSnapshot!.resultView
          : null
  const useSeededShapley =
    Boolean(draftResultSeed) && !useArchivedResults && !singleDraftResult
  const sCurveMarkerPercentiles = useMemo(
    () =>
      archivedResultView
        ? archivedResultView.sCurve.percentiles
        : resolveSCurvePercentiles(resultPreferences),
    [archivedResultView, resultPreferences],
  )

  /** Results UI (key metrics, charts, PDF) — project set from last completed simulation until rerun. */
  const displayProjects = useMemo(() => {
    if (projectResults.length === 0) {
      return projects
    }
    if (lastSimulatedProjects.length > 0) {
      return lastSimulatedProjects as Project[]
    }
    // Legacy: signature held full projects JSON.
    if (lastSimulatedInputSignature === "") return projects
    try {
      const baseline = parseProjectsPayload(JSON.parse(lastSimulatedInputSignature))
      if (baseline) return baseline
    } catch {
      /* canonical signature is not full projects */
    }
    return projects
  }, [
    projects,
    projectResults.length,
    lastSimulatedProjects,
    lastSimulatedInputSignature,
  ])
  const [shareCopied, setShareCopied] = useState(false)
  const [aiBriefCopied, setAiBriefCopied] = useState(false)
  const [showPdfBlockedNotice, setShowPdfBlockedNotice] = useState(false)
  const [showOngoingPdfBlockedNotice, setShowOngoingPdfBlockedNotice] =
    useState(false)
  const [ongoingPdfDraftConfirm, setOngoingPdfDraftConfirm] = useState<{
    cutoffCheckpointId: string
    draftLabel: string
    cutoffLabel: string
    title: string
    message: string
  } | null>(null)
  const [showShareBlockedNotice, setShowShareBlockedNotice] = useState(false)
  const [showShareOversizedNotice, setShowShareOversizedNotice] = useState(false)
  const [showPdfShareOversizedNotice, setShowPdfShareOversizedNotice] =
    useState(false)
  const [showAiBriefStaleNotice, setShowAiBriefStaleNotice] = useState(false)
  const [resultsExpanderOpen, setResultsExpanderOpen] = useState(true)
  const [keyFiguresOpen, setKeyFiguresOpen] = useState(true)
  const [developmentOpen, setDevelopmentOpen] = useState(true)
  const [sCurveOpen, setSCurveOpen] = useState(true)
  const [tornadoOpen, setTornadoOpen] = useState(true)
  const [contributionOpen, setContributionOpen] = useState(true)
  const [exportOpen, setExportOpen] = useState(false)
  const [expandedChart, setExpandedChart] = useState<ExpandedResultChart | null>(
    null,
  )
  /** Ephemeral S-curve legend multi-select; shared with expanded view; not persisted. */
  const [sCurveSelectedProjectIds, setSCurveSelectedProjectIds] = useState<
    readonly string[]
  >([])
  const toggleSCurveProjectSelection = useCallback((projectId: string) => {
    setSCurveSelectedProjectIds((prev) =>
      toggleSelectedProjectId(prev, projectId),
    )
  }, [])
  const clearSCurveProjectSelection = useCallback(() => {
    setSCurveSelectedProjectIds([])
  }, [])

  // Clear persistent legend multi-select on outside pointerdown (not on legend buttons).
  useEffect(() => {
    if (sCurveSelectedProjectIds.length === 0) return
    const onPointerDownOutside = (event: PointerEvent) => {
      const target = event.target
      if (!(target instanceof Element)) return
      if (target.closest("[data-scurve-legend]")) return
      clearSCurveProjectSelection()
    }
    document.addEventListener("pointerdown", onPointerDownOutside)
    return () => document.removeEventListener("pointerdown", onPointerDownOutside)
  }, [sCurveSelectedProjectIds.length, clearSCurveProjectSelection])

  const closeExpandedChart = useCallback(() => setExpandedChart(null), [])
  const resultsLayoutResetKey = useMemo(
    () =>
      simulationRunKeyForProjects(
        displayProjects.map((project) => project.id),
        simulationRunIdByProjectId,
      ),
    [displayProjects, simulationRunIdByProjectId],
  )

  useEffect(() => {
    setKeyFiguresOpen(true)
    setSCurveOpen(true)
    setTornadoOpen(true)
    setContributionOpen(true)
    setExportOpen(false)
  }, [resultsLayoutResetKey])

  const shareCopiedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const aiBriefCopiedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pdfStaleNoticeDismissRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const shareStaleNoticeDismissRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const shareOversizedNoticeDismissRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  )
  const pdfShareOversizedNoticeDismissRef = useRef<
    ReturnType<typeof setTimeout> | null
  >(null)
  const aiBriefStaleNoticeDismissRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const baseCostByProjectId = useMemo(() => {
    const m = new Map<string, number | null>()
    for (const p of projects) {
      m.set(p.id, simulatedBaseCostByProjectId[p.id] ?? null)
    }
    return m
  }, [projects, simulatedBaseCostByProjectId])

  const resultsByProjectId = useMemo(() => {
    return new Map(projectResults.map((r) => [r.projectId, r.values]))
  }, [projectResults])
  const compactResultByProjectId = useMemo(() => {
    const map = new Map<string, CompactProjectResultV1>()
    if (!useCompactResults) return map
    if (singleDraftResult) {
      for (const [projectId, result] of Object.entries(
        singleDraftResult.byProjectId,
      )) {
        map.set(projectId, result)
      }
    }
    if (singleArchivedCompact) {
      for (const [projectId, result] of Object.entries(
        singleArchivedCompact.byProjectId,
      )) {
        map.set(projectId, result)
      }
    }
    if (ongoingCompactResult) {
      map.set(ongoingCompactResult.activeProjectId, {
        projectId: ongoingCompactResult.activeProjectId,
        incurredCosts: ongoingCompactResult.incurredCosts,
        simulatedBaseCost: ongoingCompactResult.simulatedBaseCost,
        keyFigures: ongoingCompactResult.keyFigures,
        sCurve: ongoingCompactResult.sCurve,
        tornado: ongoingCompactResult.tornado,
        contribution: ongoingCompactResult.contribution,
      })
    }
    return map
  }, [
    ongoingCompactResult,
    singleArchivedCompact,
    singleDraftResult,
    useCompactResults,
  ])
  const frozenKeyFiguresByProjectId = useMemo(() => {
    const map = new Map()
    for (const [projectId, result] of compactResultByProjectId) {
      map.set(projectId, result.keyFigures)
    }
    return map
  }, [compactResultByProjectId])

  const simulatedIncurredByProjectId = useMemo(() => {
    const map = new Map(
      projectResults.map((r) => [r.projectId, r.incurredCosts]),
    )
    for (const [projectId, result] of compactResultByProjectId) {
      map.set(projectId, result.incurredCosts)
    }
    return map
  }, [compactResultByProjectId, projectResults])

  const checkpointComparison = useMemo(() => {
    if (
      !ongoingCheckpoints ||
      !viewedCheckpointId ||
      !checkpointComparisonResultSource
    ) {
      return null
    }
    return compareCheckpoints({
      checkpoints: ongoingCheckpoints,
      viewedCheckpointId,
      viewedResultSource: checkpointComparisonResultSource,
      keyFigureMetricIds: listVisibleComparableKeyFigureRowIds(
        resultPreferences.keyFigures,
      ),
      probabilityBelowAmount:
        resultPreferences.keyFigures.probabilityBelowCostLevel.amount,
    })
  }, [
    ongoingCheckpoints,
    viewedCheckpointId,
    checkpointComparisonResultSource,
    resultPreferences,
  ])

  /**
   * Live tip source only while viewing a draft checkpoint. Archived navigation
   * must not depend on changing viewed result identity (history is frozen).
   */
  const viewedDraftCheckpointId = useMemo(() => {
    if (!ongoingCheckpoints || !viewedCheckpointId) return null
    const cp = ongoingCheckpoints.find((c) => c.id === viewedCheckpointId)
    return cp?.status === "draft" ? viewedCheckpointId : null
  }, [ongoingCheckpoints, viewedCheckpointId])

  const developmentLiveResultSource = viewedDraftCheckpointId
    ? checkpointComparisonResultSource
    : null

  const developmentSeries = useMemo(() => {
    if (!ongoingCheckpoints || ongoingCheckpoints.length === 0) return null
    return buildOngoingDevelopmentSeries({
      checkpoints: ongoingCheckpoints,
      viewedCheckpointId: viewedDraftCheckpointId,
      viewedResultSource: developmentLiveResultSource,
    })
  }, [
    ongoingCheckpoints,
    viewedDraftCheckpointId,
    developmentLiveResultSource,
  ])

  const cdfSeries = useMemo(() => {
    const primary = displayProjects.map((p, i) => ({
      id: p.id,
      label: p.name,
      values: resultsByProjectId.get(p.id) ?? [],
      ...(compactResultByProjectId.has(p.id)
        ? {
            displayPoints: compactResultByProjectId.get(p.id)!.sCurve.points,
            values: undefined,
          }
        : {}),
      colorVar: getProjectColorCssVar(i),
      emphasis: "primary" as const,
    }))
    const previous =
      checkpointComparison?.kind === "comparison"
        ? checkpointComparison.extensions?.sCurve?.previous
        : undefined
    if (
      !previous ||
      ((!previous.values || previous.values.length === 0) &&
        (!previous.displayPoints || previous.displayPoints.length === 0))
    ) return primary
    return [
      ...primary,
      {
        id: `checkpoint-ref-${previous.checkpointId}`,
        label: formatCheckpointLegendLabel(
          previous.sequence,
          t("checkpoints.sequenceLabel"),
        ),
        values: previous.values,
        displayPoints: previous.displayPoints,
        colorVar: getProjectColorCssVar(0),
        emphasis: "reference" as const,
      },
    ]
  }, [
    displayProjects,
    resultsByProjectId,
    compactResultByProjectId,
    checkpointComparison,
    t,
  ])

  const tornadoRowsByProjectId = useMemo(() => {
    const m = new Map<string, DeterministicTornadoRow[]>()
    if (useCompactResults) {
      for (const [projectId, result] of compactResultByProjectId) {
        m.set(projectId, result.tornado ?? [])
      }
      return m
    }
    if (useArchivedResults && archivedSnapshot) {
      for (const p of displayProjects) {
        m.set(p.id, archivedSnapshot.tornadoByProjectId[p.id] ?? [])
      }
      return m
    }
    for (const p of displayProjects) {
      const pr = projectResults.find((r) => r.projectId === p.id)
      m.set(
        p.id,
        pr && pr.values.length > 0
          ? computeDeterministicTornadoRows(p, 6)
          : [],
      )
    }
    return m
  }, [
    archivedSnapshot,
    displayProjects,
    projectResults,
    useArchivedResults,
    useCompactResults,
    compactResultByProjectId,
  ])

  const tornadoRowsGroups = useMemo(
    () => displayProjects.map((p) => tornadoRowsByProjectId.get(p.id) ?? []),
    [displayProjects, tornadoRowsByProjectId],
  )
  const tornadoDisplayScales = useMemo(
    () => resolveTornadoDisplayScales(tornadoRowsGroups),
    [tornadoRowsGroups],
  )
  const tornadoDisplayScaleByProjectId = useMemo(() => {
    const m = new Map<string, (typeof tornadoDisplayScales)[number]>()
    displayProjects.forEach((project, index) => {
      const scale = tornadoDisplayScales[index]
      if (scale) m.set(project.id, scale)
    })
    return m
  }, [displayProjects, tornadoDisplayScales])
  const sharedTornadoLayout = useMemo(
    () => buildTornadoSharedLayout(tornadoRowsGroups, tornadoDisplayScales),
    [tornadoRowsGroups, tornadoDisplayScales],
  )
  const sharedTornadoSymmetricMaxAbs = useMemo(
    () => computeTornadoSharedSymmetricMaxAbs(tornadoRowsGroups),
    [tornadoRowsGroups],
  )

  const {
    requestCalculation,
    getStatus,
    getResult,
    getError,
  } = useLazyShapleyAttribution({
    displayProjects,
    projectResults,
    simulationRunIdByProjectId,
    // Keep archived / persisted Contribution from running live Shapley.
    inputsStale:
      pdfExportBlockedStaleInputs ||
      analysisArchivedView ||
      useCompactResults ||
      useSeededShapley,
  })

  const getShapleyResult = useCallback(
    (projectId: string): ShapleyAttributionResult | null => {
      if (useArchivedResults && archivedSnapshot) {
        return archivedSnapshot.shapleyByProjectId[projectId] ?? null
      }
      if (useCompactResults) {
        return compactResultByProjectId.get(projectId)?.contribution ?? null
      }
      if (useSeededShapley && draftResultSeed) {
        return draftResultSeed.shapleyByProjectId[projectId] ?? null
      }
      return getResult(projectId)
    },
    [
      archivedSnapshot,
      draftResultSeed,
      getResult,
      useArchivedResults,
      useCompactResults,
      compactResultByProjectId,
      useSeededShapley,
    ],
  )

  // Persist Contribution into the compact Ongoing draft once live Shapley is ready.
  useEffect(() => {
    if (
      !onContributionReady ||
      useCompactResults ||
      useArchivedResults ||
      useSeededShapley ||
      pdfExportBlockedStaleInputs
    ) {
      return
    }
    for (const project of displayProjects) {
      const result = getResult(project.id)
      const runId = simulationRunIdByProjectId[project.id] ?? ""
      if (result && runId) onContributionReady(project.id, result, runId)
    }
  }, [
    displayProjects,
    getResult,
    onContributionReady,
    pdfExportBlockedStaleInputs,
    useArchivedResults,
    useCompactResults,
    useSeededShapley,
    simulationRunIdByProjectId,
  ])

  const archivedContributionMissing = useMemo(() => {
    if (useCompactResults) {
      return displayProjects.every(
        (project) =>
          (compactResultByProjectId.get(project.id)?.contribution ?? null) ===
          null,
      )
    }
    if (!useArchivedResults || !archivedSnapshot) return false
    if (displayProjects.length === 0) return true
    return displayProjects.every(
      (project) =>
        (archivedSnapshot.shapleyByProjectId[project.id] ?? null) === null,
    )
  }, [
    archivedSnapshot,
    displayProjects,
    compactResultByProjectId,
    useArchivedResults,
    useCompactResults,
  ])

  const attributionUi = useMemo(() => {
    if (useCompactResults) {
      const states = displayProjects.map((project) => {
        const result =
          compactResultByProjectId.get(project.id)?.contribution ?? null
        return {
          projectId: project.id,
          projectName: project.name,
          status: (result ? "ready" : "idle") as "ready" | "idle",
          result,
          error: null as string | null,
        }
      })
      return {
        states,
        allReady: states.some((state) => state.result !== null),
        anyCalculating: false,
        anyIdle: states.some((state) => state.result === null),
        anyError: false,
        firstError: null as string | null,
      }
    }
    if (useArchivedResults && archivedSnapshot) {
      const states = displayProjects.map((project) => {
        const result =
          archivedSnapshot.shapleyByProjectId[project.id] ?? null
        return {
          projectId: project.id,
          projectName: project.name,
          status: (result ? "ready" : "idle") as "ready" | "idle",
          result,
          error: null as string | null,
        }
      })
      return {
        states,
        allReady:
          states.length > 0 &&
          states.some((state) => state.result !== null),
        anyCalculating: false,
        anyIdle: states.some((state) => state.result === null),
        anyError: false,
        firstError: null as string | null,
      }
    }

    if (useSeededShapley && draftResultSeed) {
      const states = displayProjects.map((project) => {
        const result =
          draftResultSeed.shapleyByProjectId[project.id] ?? null
        return {
          projectId: project.id,
          projectName: project.name,
          status: (result ? "ready" : "idle") as "ready" | "idle",
          result,
          error: null as string | null,
        }
      })
      return {
        states,
        allReady:
          states.length > 0 &&
          states.some((state) => state.result !== null),
        anyCalculating: false,
        anyIdle: states.some((state) => state.result === null),
        anyError: false,
        firstError: null as string | null,
      }
    }

    const states = displayProjects.map((project) => ({
      projectId: project.id,
      projectName: project.name,
      status: getStatus(project.id),
      result: getResult(project.id),
      error: getError(project.id),
    }))

    return {
      states,
      allReady:
        states.length > 0 &&
        states.every(
          (state) => state.status === "ready" && state.result !== null,
        ),
      anyCalculating: states.some((state) => state.status === "calculating"),
      anyIdle: states.some((state) => state.status === "idle"),
      anyError: states.some((state) => state.status === "error"),
      firstError:
        states.find((state) => state.error)?.error ??
        states.find((state) => state.status === "error")?.error ??
        null,
    }
  }, [
    archivedSnapshot,
    displayProjects,
    draftResultSeed,
    getError,
    getResult,
    getStatus,
    useArchivedResults,
    useCompactResults,
    useSeededShapley,
    compactResultByProjectId,
  ])

  useEffect(() => {
    if (typeof window === "undefined") return
    if (!sessionStorage.getItem("DEBUG_TORNADO")) return
    for (const p of displayProjects) {
      const rows = tornadoRowsByProjectId.get(p.id) ?? []
      // eslint-disable-next-line no-console -- opt-in via sessionStorage DEBUG_TORNADO
      console.info("[DEBUG_TORNADO]", {
        projectId: p.id,
        projectName: p.name,
        method: "deterministic-one-at-a-time",
        tornadoRowLabels: rows.map((r) => ({
          name: r.name,
          type: r.type,
          sourceSeriesIndex: r.sourceSeriesIndex,
          lowImpact: r.lowImpact,
          highImpact: r.highImpact,
          spread: r.spread,
        })),
      })
    }
  }, [displayProjects, tornadoRowsByProjectId])

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
        typeof (latestSnap as { simulationCount?: unknown }).simulationCount ===
          "number"
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
        reportBasisArchivedOnly: t(
          "results.pdfOngoingReportBasisArchivedOnly",
        ),
        reportBasisWithExcludedDraft: t(
          "results.pdfOngoingReportBasisWithExcludedDraft",
        ),
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
      resolveProfileOptionLabel: (optionId) =>
        t(`projectProfile.options.${optionId}`),
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

    const { downloadOngoingReportPdf } = await import(
      "@/features/results/pdfExport"
    )
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
    const resultViewSnapshot =
      archivedResultView ?? resolveResultView(resultPreferences)
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

    const { downloadProjectReportPdf } = await import(
      "@/features/results/pdfExport"
    )
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
              displayPoints:
                compactResultByProjectId.get(project.id)!.sCurve.points,
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
    const resultViewSnapshot =
      archivedResultView ?? resolveResultView(resultPreferences)
    const contributionAnalysisByProjectId: Record<
      string,
      ShapleyAttributionResult
    > = {}
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
    const promptKey =
      language === "no"
        ? "results.aiBriefClipboardPromptNo"
        : "results.aiBriefClipboardPromptEn"
    const promptBase = t(promptKey)
    const prompt =
      analysisMode === "ongoing"
        ? `${promptBase}\n\n${t(
            language === "no"
              ? "results.aiBriefClipboardPromptOngoingAddendumNo"
              : "results.aiBriefClipboardPromptOngoingAddendumEn",
          )}`
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
    if (projectResults.length > 0) {
      setResultsExpanderOpen(true)
    }
  }, [projectResults])

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

  const inFocusStep = focusSection != null
  const showFocusSection = (id: FocusResultSectionId) =>
    !inFocusStep || focusSection === id

  return (
    <>
      <Card
        data-results-card={inFocusStep ? undefined : ""}
        data-focus-results-step={inFocusStep ? "" : undefined}
        data-focus-result-section={focusSection ?? undefined}
        className={
          inFocusStep
            ? "mx-auto h-fit w-full max-w-3xl border-0 bg-transparent shadow-none ring-0"
            : "h-fit border border-border bg-[var(--km-surface)] ring-0 [--km-surface:color-mix(in_oklab,var(--color-muted)_35%,var(--color-background))]"
        }
      >
        <CardContent className={inFocusStep ? "space-y-6 p-0" : "space-y-6 p-4"}>
          {inFocusStep ? (
            <div className="space-y-6" data-focus-results-body="">
              {showFocusSection("keyFigures") ? (
          <SectionExpander
            title={t("results.keyMetricsTitle")}
            defaultOpen
            open
            onOpenChange={() => {}}
            headerClassName="px-0 py-1"
            titleClassName="text-[11px]"
          >
          <div className="space-y-2">
            <p className="section-body">
              {t("helper.resultsKeyMetrics")}
            </p>
          <ResultsKeyFiguresTable
            projects={displayProjects}
            valuesByProjectId={resultsByProjectId}
            baseCostByProjectId={baseCostByProjectId}
            simulatedIncurredByProjectId={simulatedIncurredByProjectId}
            preferences={resultPreferences}
            frozenKeyFiguresByProjectId={frozenKeyFiguresByProjectId}
            expandLabel={t("charts.openLargerView")}
            onExpand={() => setExpandedChart({ kind: "keyFigures" })}
          />
        </div>
          </SectionExpander>
              ) : null}
              {showFocusSection("development") && developmentSeries ? (
            <SectionExpander
              title={t("checkpoints.developmentTitle")}
              defaultOpen
              open
              onOpenChange={() => {}}
              headerClassName="px-0 py-1"
              titleClassName="text-[11px]"
            >
              <div className="space-y-2" data-ongoing-development-section="">
                <p className="section-body">
                  {t("checkpoints.developmentHelper")}
                </p>
                {developmentSeries.points.length === 0 ? (
                  <p
                    className="section-body text-muted-foreground/85"
                    role="status"
                  >
                    {t("checkpoints.developmentEmpty")}
                  </p>
                ) : (
                  <ResultsDevelopmentChart
                    series={developmentSeries}
                    expandLabel={t("charts.openLargerView")}
                    onExpand={() => setExpandedChart({ kind: "development" })}
                  />
                )}
              </div>
            </SectionExpander>
              ) : null}
              {showFocusSection("scurve") ? (
        <SectionExpander
          title={t("charts.sCurveTitle")}
          defaultOpen
          open
          onOpenChange={() => {}}
          headerClassName="px-0 py-1"
          titleClassName="text-[11px]"
        >
        <div className="space-y-2">
            <p className="section-body">
              {t("charts.sCurveSubtitle")}
            </p>
          <ResultsSCurve
            series={cdfSeries}
            markerPercentiles={sCurveMarkerPercentiles}
            expandLabel={t("charts.openLargerView")}
            onExpand={() => setExpandedChart({ kind: "scurve" })}
            selectedProjectIds={sCurveSelectedProjectIds}
            onToggleProjectSelection={toggleSCurveProjectSelection}
          />
        </div>
        </SectionExpander>
              ) : null}
              {showFocusSection("tornado") ? (
        <SectionExpander
          title={t("charts.tornadoTitle")}
          defaultOpen
          open
          onOpenChange={() => {}}
          headerClassName="px-0 py-1"
          titleClassName="text-[11px]"
        >
        <div className="space-y-2">
          <p className="section-body">
            {t("charts.tornadoSubtitle")}
          </p>
          <div className="space-y-6">
            {displayProjects.map((p, projectIndex) => {
              const pr = projectResults.find((r) => r.projectId === p.id)
              const rows = tornadoRowsByProjectId.get(p.id) ?? []
              const tornadoRemountKey = pr
                ? `${p.id}\u001f${rows.map((r) => `${r.type}\u001e${r.name}\u001e${r.spread}`).join("\u001d")}`
                : `${p.id}\u001fnone`
              return (
                <div key={p.id} className="space-y-2">
                  <h3 className="section-heading flex min-w-0 items-center gap-1.5 text-[11px] normal-case tracking-normal">
                    <ProjectColorSwatch projectIndex={projectIndex} />
                    <span className="min-w-0 truncate">{p.name}</span>
                  </h3>
                  <ResultsTornado
                    key={tornadoRemountKey}
                    rows={tornadoRowsByProjectId.get(p.id) ?? []}
                    layout={sharedTornadoLayout}
                    sharedSymmetricMaxAbs={sharedTornadoSymmetricMaxAbs}
                    displayScale={tornadoDisplayScaleByProjectId.get(p.id)}
                    expandLabel={t("charts.openLargerView")}
                    onExpand={() =>
                      setExpandedChart({
                        kind: "tornado",
                        projectId: p.id,
                        projectName: p.name,
                      })
                    }
                  />
                </div>
              )
            })}
          </div>
        </div>
        </SectionExpander>
              ) : null}
              {showFocusSection("contribution") &&
              appFeatures.showExpectedAddition ? (
          <SectionExpander
            title={t("charts.attributionTitle")}
            defaultOpen
            open
            onOpenChange={() => {}}
            headerClassName="px-0 py-1"
            titleClassName="text-[11px]"
          >
            <div className="space-y-2">
              <p className="section-body">
                {t("charts.attributionSubtitle")}
              </p>

              {!attributionUi.allReady ? (
                <div className="pt-1">
                  {archivedContributionMissing ? (
                    <p className="section-body text-[11px] text-muted-foreground/85">
                      {t("results.archivedContributionNotStored")}
                    </p>
                  ) : pdfExportBlockedStaleInputs ? (
                    <p className="section-body text-[11px] text-muted-foreground/85">
                      {t("results.waterfallStaleInputs")}
                    </p>
                  ) : attributionUi.anyError ? (
                    <div className="space-y-2">
                      <p
                        className="section-body text-[11px] text-destructive/90"
                        role="alert"
                      >
                        {attributionUi.firstError ?? t("results.waterfallError")}
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          for (const project of displayProjects) {
                            const status = getStatus(project.id)
                            if (status === "error" || status === "idle") {
                              requestCalculation(project.id)
                            }
                          }
                        }}
                      >
                        {t("results.tryAgain")}
                      </Button>
                    </div>
                  ) : (
                    <SpotlightLoadingText
                      text={t("results.calculatingContributions")}
                      className="section-body text-[11px]"
                      data-contribution-loading=""
                    />
                  )}
                </div>
              ) : (
                <div className="space-y-8 pt-1">
                  {attributionUi.states.map((state, projectIndex) =>
                    state.result ? (
                      <div key={state.projectId} className="space-y-4">
                        <h3 className="section-heading flex min-w-0 items-center gap-1.5 text-[11px] normal-case tracking-normal">
                          <ProjectColorSwatch projectIndex={projectIndex} />
                          <span className="min-w-0 truncate">
                            {state.projectName}
                          </span>
                        </h3>
                        <div className="space-y-5">
                          <div className="space-y-2">
                            <h4 className="section-heading text-[10px]">
                                {t("charts.waterfallTitle")}
                              </h4>
                            <ResultsWaterfall
                              result={state.result}
                              baseCostLabel={t("keyMetrics.baseCost")}
                              p50Label={t("keyMetrics.p50")}
                              expectedAdditionLabel={t("keyMetrics.expectedAddition")}
                              otherLabel={t("results.waterfallOther")}
                              expandLabel={t("charts.openLargerView")}
                              onExpand={() =>
                                  setExpandedChart({
                                    kind: "expectedAddition",
                                    projectId: state.projectId,
                                    projectName: state.projectName,
                                  })
                              }
                            />
                          </div>

                          <div className="space-y-2">
                            <h4 className="section-heading text-[10px]">
                                {t("charts.reserveWaterfallTitle")}
                              </h4>
                            <ResultsReserveWaterfall
                              result={state.result}
                              p50Label={t("keyMetrics.p50")}
                              p85Label={t("keyMetrics.p85")}
                              uncertaintyReserveLabel={t("keyMetrics.uncertaintyReserve")}
                              otherLabel={t("results.waterfallOther")}
                              expandLabel={t("charts.openLargerView")}
                              onExpand={() =>
                                  setExpandedChart({
                                    kind: "uncertaintyReserve",
                                    projectId: state.projectId,
                                    projectName: state.projectName,
                                  })
                              }
                            />
                          </div>
                        </div>
                      </div>
                    ) : null,
                  )}
                </div>
              )}
            </div>
          </SectionExpander>
              ) : null}
              {showFocusSection("nextSteps") ? (
                <div
                  className="mx-auto flex max-w-3xl flex-col gap-6"
                  data-focus-next-steps=""
                >
                  <p className="m-0 font-sans text-[14px] leading-relaxed text-foreground">
                    {t("inputs.focusNextStepsBody")}
                  </p>

                  <section
                    className="space-y-3"
                    data-focus-next-steps-continue=""
                  >
                    <h3 className="m-0 font-sans text-[12px] font-semibold tracking-wide text-muted-foreground">
                      {t("inputs.focusContinueWorkingHeading")}
                    </h3>
                    <div className="space-y-2">
                      {onFocusReviewInput && !analysisArchivedView ? (
                        <div className="rounded-md border border-border/50 bg-background/70 p-3">
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                            <div className="min-w-0 space-y-0.5">
                              <p className="m-0 font-sans text-[13px] font-medium text-foreground">
                                {t("inputs.focusReviewInput")}
                              </p>
                              <p className="m-0 font-sans text-[12px] leading-snug text-muted-foreground">
                                {t("inputs.focusReviewInputHelper")}
                              </p>
                            </div>
                            <div className={FOCUS_NEXT_STEPS_ACTION_COL_CLASS}>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className={FOCUS_NEXT_STEPS_ACTION_CLASS}
                                onClick={onFocusReviewInput}
                                data-focus-next-steps-review-input=""
                              >
                                {t("inputs.focusReviewInput")}
                              </Button>
                            </div>
                          </div>
                        </div>
                      ) : null}
                      {onRequestArchiveAndCreateNext &&
                      !analysisArchivedView ? (
                        <div className="rounded-md border border-border/50 bg-background/70 p-3">
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                            <div className="min-w-0 space-y-0.5">
                              <p className="m-0 font-sans text-[13px] font-medium text-foreground">
                                {t("inputs.focusArchiveCheckpoint")}
                              </p>
                              <p className="m-0 font-sans text-[12px] leading-snug text-muted-foreground">
                                {t("inputs.focusArchiveCheckpointHelper")}
                              </p>
                            </div>
                            <div className={FOCUS_NEXT_STEPS_ACTION_COL_CLASS}>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className={FOCUS_NEXT_STEPS_ACTION_CLASS}
                                onClick={onRequestArchiveAndCreateNext}
                                data-focus-next-steps-archive=""
                                data-archive-and-create-next=""
                              >
                                {t("inputs.focusArchiveCheckpoint")}
                              </Button>
                            </div>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </section>

                  <section
                    className="space-y-3"
                    data-focus-next-steps-use-results=""
                  >
                    <h3 className="m-0 font-sans text-[12px] font-semibold tracking-wide text-muted-foreground">
                      {t("inputs.focusUseResultsHeading")}
                    </h3>
                    <div className="space-y-2">
                      <div
                        className="rounded-md border border-border/50 bg-background/70 p-3"
                        data-focus-next-steps-pdf-row=""
                      >
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                          <div className="min-w-0 space-y-0.5">
                            <p className="m-0 font-sans text-[13px] font-medium text-foreground">
                              {t("results.downloadPdf")}
                            </p>
                            <p className="m-0 font-sans text-[12px] leading-snug text-muted-foreground">
                              {t("inputs.focusDownloadPdfHelper")}
                            </p>
                          </div>
                          <div className={FOCUS_NEXT_STEPS_ACTION_COL_CLASS}>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className={FOCUS_NEXT_STEPS_ACTION_CLASS}
                              onClick={() => void handleDownloadPdf()}
                              data-focus-next-steps-pdf=""
                            >
                              {t("results.downloadPdf")}
                            </Button>
                          </div>
                        </div>
                        {showPdfBlockedNotice ? (
                          <p
                            className="mt-2 text-xs leading-snug text-muted-foreground/80"
                            role="status"
                          >
                            {t("results.pdfExportBlockedStaleInputs")}
                          </p>
                        ) : null}
                        {showOngoingPdfBlockedNotice ? (
                          <p
                            className="mt-2 text-xs leading-snug text-muted-foreground/80"
                            role="status"
                          >
                            {t("results.pdfOngoingExportBlockedNoArchived")}
                          </p>
                        ) : null}
                      </div>

                      {appFeatures.allowShareLink ? (
                        <div
                          className="rounded-md border border-border/50 bg-background/70 p-3"
                          data-focus-next-steps-share-row=""
                        >
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                            <div className="min-w-0 space-y-0.5">
                              <p className="m-0 font-sans text-[13px] font-medium text-foreground">
                                {t("inputs.focusShareLinkTitle")}
                              </p>
                              <p className="m-0 font-sans text-[12px] leading-snug text-muted-foreground">
                                {t("inputs.focusShareLinkHelper")}
                              </p>
                            </div>
                            <div className={FOCUS_NEXT_STEPS_ACTION_COL_CLASS}>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className={FOCUS_NEXT_STEPS_ACTION_CLASS}
                                onClick={() => void handleCopyShareLink()}
                                data-focus-next-steps-share=""
                              >
                                <span className="relative inline-flex w-full items-center justify-center">
                                  <span
                                    className={
                                      shareCopied ? "invisible" : "visible"
                                    }
                                  >
                                    {t("results.copyShareLink")}
                                  </span>
                                  {shareCopied ? (
                                    <span
                                      className="absolute inset-0 inline-flex items-center justify-center"
                                      aria-live="polite"
                                    >
                                      <Check
                                        className="size-3.5"
                                        aria-hidden
                                      />
                                    </span>
                                  ) : null}
                                </span>
                              </Button>
                            </div>
                          </div>
                          {showShareBlockedNotice ? (
                            <p
                              className="mt-2 text-xs leading-snug text-muted-foreground/80"
                              role="status"
                            >
                              {t("results.shareLinkBlockedStaleInputs")}
                            </p>
                          ) : null}
                          {showShareOversizedNotice ? (
                            <p
                              className="mt-2 text-xs leading-snug text-muted-foreground/80"
                              role="status"
                            >
                              {t("results.shareLinkTooLarge")}
                            </p>
                          ) : null}
                        </div>
                      ) : null}

                      <div
                        className="rounded-md border border-border/50 bg-background/70 p-3"
                        data-focus-next-steps-ai-row=""
                      >
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                          <div className="min-w-0 space-y-0.5">
                            <p className="m-0 font-sans text-[13px] font-medium text-foreground">
                              {t("inputs.focusAiBriefTitle")}
                            </p>
                            <p className="m-0 font-sans text-[12px] leading-snug text-muted-foreground">
                              {t("inputs.focusAiBriefHelper")}
                            </p>
                          </div>
                          <div className={FOCUS_NEXT_STEPS_ACTION_COL_CLASS}>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className={FOCUS_NEXT_STEPS_ACTION_CLASS}
                              onClick={() => void handleCopyAiBriefPackage()}
                              data-focus-next-steps-ai-brief=""
                            >
                              <span className="relative inline-flex w-full items-center justify-center">
                                <span
                                  className={
                                    aiBriefCopied ? "invisible" : "visible"
                                  }
                                >
                                  {t("results.copyAiBrief")}
                                </span>
                                {aiBriefCopied ? (
                                  <span
                                    className="absolute inset-0 inline-flex items-center justify-center"
                                    aria-live="polite"
                                  >
                                    <Check className="size-3.5" aria-hidden />
                                  </span>
                                ) : null}
                              </span>
                            </Button>
                          </div>
                        </div>
                        {showAiBriefStaleNotice ? (
                          <p
                            className="mt-2 text-xs leading-snug text-muted-foreground/80"
                            role="status"
                          >
                            {t("results.aiBriefBlockedStaleInputs")}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </section>
                </div>
              ) : null}
            </div>
          ) : (
          <SectionExpander
            title={t("results.resultsHeading")}
            defaultOpen
            open={resultsExpanderOpen}
            onOpenChange={setResultsExpanderOpen}
            headerClassName="px-0"
            bodyClassName="pt-5"
            headerTrailing={
              <div
                className="flex shrink-0 items-center gap-0.5"
                data-results-header-actions=""
              >
                {onOpenFocusResults && !focusResultsActive ? (
                  <button
                    type="button"
                    className={buttonVariants({
                      variant: "ghost",
                      size: "icon-sm",
                      className:
                        "text-muted-foreground hover:text-foreground",
                    })}
                    aria-label={t("inputs.openFocusMode")}
                    title={t("inputs.openFocusMode")}
                    onClick={onOpenFocusResults}
                    data-results-focus-toggle=""
                  >
                    <Play className="size-4" aria-hidden />
                  </button>
                ) : null}
                {resultSettingsEditable ? (
                  <ResultPreferencesPanel
                    preferences={resultPreferences}
                    onChange={replacePreferences}
                    onAddKeyFigurePercentile={addKeyFigurePercentile}
                    onRemoveKeyFigurePercentile={removeKeyFigurePercentile}
                    onAddSCurvePercentile={addSCurvePercentile}
                    onRemoveSCurvePercentile={removeSCurvePercentile}
                    onSaveAsDefault={saveAsDefault}
                    onReset={resetToDefaults}
                    compactDerivedMetricsDeferred={useCompactResults}
                  />
                ) : null}
              </div>
            }
          >
        <div className="space-y-6 [&>div:not(:first-child)]:pt-3">
          {ongoingCheckpoints &&
          viewedCheckpointId &&
          checkpointComparisonResultSource ? (
            <CheckpointComparisonSection
              slot="context"
              checkpoints={ongoingCheckpoints}
              viewedCheckpointId={viewedCheckpointId}
              viewedResultSource={checkpointComparisonResultSource}
              resultPreferences={resultPreferences}
            />
          ) : null}
          <SectionExpander
            title={t("results.keyMetricsTitle")}
            defaultOpen
            open={keyFiguresOpen}
            onOpenChange={setKeyFiguresOpen}
            headerClassName="px-0 py-1"
            titleClassName="text-[11px]"
          >
          <div className="space-y-2">
            <p className="section-body">
              {t("helper.resultsKeyMetrics")}
            </p>
          <ResultsKeyFiguresTable
            projects={displayProjects}
            valuesByProjectId={resultsByProjectId}
            baseCostByProjectId={baseCostByProjectId}
            simulatedIncurredByProjectId={simulatedIncurredByProjectId}
            preferences={resultPreferences}
            frozenKeyFiguresByProjectId={frozenKeyFiguresByProjectId}
            expandLabel={t("charts.openLargerView")}
            onExpand={() => setExpandedChart({ kind: "keyFigures" })}
          />
        </div>
          </SectionExpander>

          {ongoingCheckpoints &&
          viewedCheckpointId &&
          checkpointComparisonResultSource ? (
            <CheckpointComparisonSection
              slot="change"
              checkpoints={ongoingCheckpoints}
              viewedCheckpointId={viewedCheckpointId}
              viewedResultSource={checkpointComparisonResultSource}
              resultPreferences={resultPreferences}
            />
          ) : null}

          {developmentSeries ? (
            <SectionExpander
              title={t("checkpoints.developmentTitle")}
              defaultOpen
              open={developmentOpen}
              onOpenChange={setDevelopmentOpen}
              headerClassName="px-0 py-1"
              titleClassName="text-[11px]"
            >
              <div className="space-y-2" data-ongoing-development-section="">
                <p className="section-body">
                  {t("checkpoints.developmentHelper")}
                </p>
                {developmentSeries.points.length === 0 ? (
                  <p
                    className="section-body text-muted-foreground/85"
                    role="status"
                  >
                    {t("checkpoints.developmentEmpty")}
                  </p>
                ) : (
                  <ResultsDevelopmentChart
                    series={developmentSeries}
                    expandLabel={t("charts.openLargerView")}
                    onExpand={() => setExpandedChart({ kind: "development" })}
                  />
                )}
              </div>
            </SectionExpander>
          ) : null}

        <SectionExpander
          title={t("charts.sCurveTitle")}
          defaultOpen
          open={sCurveOpen}
          onOpenChange={setSCurveOpen}
          headerClassName="px-0 py-1"
          titleClassName="text-[11px]"
        >
        <div className="space-y-2">
            <p className="section-body">
              {t("charts.sCurveSubtitle")}
            </p>
          <ResultsSCurve
            series={cdfSeries}
            markerPercentiles={sCurveMarkerPercentiles}
            expandLabel={t("charts.openLargerView")}
            onExpand={() => setExpandedChart({ kind: "scurve" })}
            selectedProjectIds={sCurveSelectedProjectIds}
            onToggleProjectSelection={toggleSCurveProjectSelection}
          />
        </div>
        </SectionExpander>

        <SectionExpander
          title={t("charts.tornadoTitle")}
          defaultOpen
          open={tornadoOpen}
          onOpenChange={setTornadoOpen}
          headerClassName="px-0 py-1"
          titleClassName="text-[11px]"
        >
        <div className="space-y-2">
          <p className="section-body">
            {t("charts.tornadoSubtitle")}
          </p>
          <div className="space-y-5 pt-1">
            {displayProjects.map((p, projectIndex) => {
              const pr = projectResults.find((r) => r.projectId === p.id)
              const rows = tornadoRowsByProjectId.get(p.id) ?? []
              const tornadoRemountKey = pr
                ? `${p.id}\u001f${rows.map((r) => `${r.type}\u001e${r.name}\u001e${r.spread}`).join("\u001d")}`
                : `${p.id}\u001fnone`
              return (
                <div key={p.id} className="space-y-2">
                    <h4 className="section-heading flex min-w-0 items-center gap-1.5 text-[11px] normal-case tracking-normal">
                      <ProjectColorSwatch projectIndex={projectIndex} />
                      <span className="min-w-0 truncate">{p.name}</span>
                    </h4>
                  <ResultsTornado
                    key={tornadoRemountKey}
                    rows={tornadoRowsByProjectId.get(p.id) ?? []}
                    layout={sharedTornadoLayout}
                    sharedSymmetricMaxAbs={sharedTornadoSymmetricMaxAbs}
                    displayScale={tornadoDisplayScaleByProjectId.get(p.id)}
                    expandLabel={t("charts.openLargerView")}
                    onExpand={() =>
                      setExpandedChart({
                        kind: "tornado",
                        projectId: p.id,
                        projectName: p.name,
                      })
                    }
                  />
                </div>
              )
            })}
          </div>
        </div>
        </SectionExpander>

        {appFeatures.showExpectedAddition ? (
          <SectionExpander
            title={t("charts.attributionTitle")}
            defaultOpen
            open={contributionOpen}
            onOpenChange={setContributionOpen}
            headerClassName="px-0 py-1"
            titleClassName="text-[11px]"
          >
            <div className="space-y-2">
              <p className="section-body">
                {t("charts.attributionSubtitle")}
              </p>

              {!attributionUi.allReady ? (
                <div className="pt-1">
                  {archivedContributionMissing ? (
                    <p className="section-body text-[11px] text-muted-foreground/85">
                      {t("results.archivedContributionNotStored")}
                    </p>
                  ) : pdfExportBlockedStaleInputs ? (
                    <p className="section-body text-[11px] text-muted-foreground/85">
                      {t("results.waterfallStaleInputs")}
                    </p>
                  ) : attributionUi.anyError ? (
                    <div className="space-y-2">
                      <p
                        className="section-body text-[11px] text-destructive/90"
                        role="alert"
                      >
                        {attributionUi.firstError ?? t("results.waterfallError")}
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          for (const project of displayProjects) {
                            const status = getStatus(project.id)
                            if (status === "error" || status === "idle") {
                              requestCalculation(project.id)
                            }
                          }
                        }}
                      >
                        {t("results.tryAgain")}
                      </Button>
                    </div>
                  ) : (
                    <SpotlightLoadingText
                      text={t("results.calculatingContributions")}
                      className="section-body text-[11px]"
                      data-contribution-loading=""
                    />
                  )}
                </div>
              ) : (
                <div className="space-y-8 pt-1">
                  {attributionUi.states.map((state, projectIndex) =>
                    state.result ? (
                      <div key={state.projectId} className="space-y-4">
                        <h3 className="section-heading flex min-w-0 items-center gap-1.5 text-[11px] normal-case tracking-normal">
                          <ProjectColorSwatch projectIndex={projectIndex} />
                          <span className="min-w-0 truncate">
                            {state.projectName}
                          </span>
                        </h3>
                        <div className="space-y-5">
                          <div className="space-y-2">
                            <h4 className="section-heading text-[10px]">
                                {t("charts.waterfallTitle")}
                              </h4>
                            <ResultsWaterfall
                              result={state.result}
                              baseCostLabel={t("keyMetrics.baseCost")}
                              p50Label={t("keyMetrics.p50")}
                              expectedAdditionLabel={t("keyMetrics.expectedAddition")}
                              otherLabel={t("results.waterfallOther")}
                              expandLabel={t("charts.openLargerView")}
                              onExpand={() =>
                                  setExpandedChart({
                                    kind: "expectedAddition",
                                    projectId: state.projectId,
                                    projectName: state.projectName,
                                  })
                              }
                            />
                          </div>

                          <div className="space-y-2">
                            <h4 className="section-heading text-[10px]">
                                {t("charts.reserveWaterfallTitle")}
                              </h4>
                            <ResultsReserveWaterfall
                              result={state.result}
                              p50Label={t("keyMetrics.p50")}
                              p85Label={t("keyMetrics.p85")}
                              uncertaintyReserveLabel={t("keyMetrics.uncertaintyReserve")}
                              otherLabel={t("results.waterfallOther")}
                              expandLabel={t("charts.openLargerView")}
                              onExpand={() =>
                                  setExpandedChart({
                                    kind: "uncertaintyReserve",
                                    projectId: state.projectId,
                                    projectName: state.projectName,
                                  })
                              }
                            />
                          </div>
                        </div>
                      </div>
                    ) : null,
                  )}
                </div>
              )}
            </div>
          </SectionExpander>
        ) : null}

        {appFeatures.allowShareLink ? (
          <SectionExpander
            title={t("results.optionsHeading")}
            defaultOpen={false}
            open={exportOpen}
            onOpenChange={setExportOpen}
            headerClassName="px-0 py-1"
            titleClassName="text-[11px]"
          >
            <div className="space-y-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:items-stretch">
              <div className="flex h-full min-w-0 flex-col rounded-md border border-border/50 bg-background/70 p-3">
                <div className="flex h-full flex-col gap-2">
                  <div className="space-y-1">
                    <h4 className="font-sans text-[11px] font-semibold tracking-wide text-muted-foreground">
                      {t("results.actionsHeading")}
                    </h4>
                    <p className="section-body text-[11px] text-muted-foreground/80">
                      {t("results.actionsHelperText")}
                    </p>
                  </div>
                  <div className="mt-auto flex flex-col gap-2">
                  <div className="flex flex-nowrap items-stretch gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 min-w-0 flex-1 font-sans text-xs font-medium"
                      onClick={() => void handleDownloadPdf()}
                    >
                      {t("results.downloadPdf")}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 min-w-0 flex-1 font-sans text-xs font-medium"
                      onClick={() => void handleCopyShareLink()}
                    >
                      <span className="relative inline-flex w-full items-center justify-center">
                        <span className={shareCopied ? "invisible" : "visible"}>
                          {t("results.copyShareLink")}
                        </span>
                        {shareCopied ? (
                          <span
                            className="absolute inset-0 inline-flex items-center justify-center"
                            aria-live="polite"
                          >
                            <Check className="size-3.5" aria-hidden />
                          </span>
                        ) : null}
                      </span>
                    </Button>
                  </div>
                  {showPdfBlockedNotice ? (
                    <p
                      className="text-xs leading-snug text-muted-foreground/80"
                      role="status"
                    >
                      {t("results.pdfExportBlockedStaleInputs")}
                    </p>
                  ) : null}
                  {showOngoingPdfBlockedNotice ? (
                    <p
                      className="text-xs leading-snug text-muted-foreground/80"
                      role="status"
                    >
                      {t("results.pdfOngoingExportBlockedNoArchived")}
                    </p>
                  ) : null}
                  {showShareBlockedNotice ? (
                    <p
                      className="text-xs leading-snug text-muted-foreground/80"
                      role="status"
                    >
                      {t("results.shareLinkBlockedStaleInputs")}
                    </p>
                  ) : null}
                  {showShareOversizedNotice || showPdfShareOversizedNotice ? (
                    <p
                      className="text-xs leading-snug text-muted-foreground/80"
                      role="status"
                    >
                      {t("results.shareLinkTooLarge")}
                    </p>
                  ) : null}
                  </div>
                </div>
              </div>

              <div className="flex h-full min-w-0 flex-col rounded-md border border-border/50 bg-background/70 p-3">
                <div className="flex h-full flex-col gap-2">
                  <div className="space-y-1">
                    <h4 className="font-sans text-[11px] font-semibold tracking-wide text-muted-foreground">
                      {t("results.aiAnalyzeHeading")}
                    </h4>
                    <p className="section-body text-[11px] text-muted-foreground/80">
                      {t("results.aiAnalyzeHelper")}
                    </p>
                  </div>
                  <div className="mt-auto flex flex-col gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 w-full font-sans text-xs font-medium"
                    onClick={() => void handleCopyAiBriefPackage()}
                  >
                    <span className="relative inline-flex w-full items-center justify-center">
                      <span className={aiBriefCopied ? "invisible" : "visible"}>
                        {t("results.copyAiBrief")}
                      </span>
                      {aiBriefCopied ? (
                        <span
                          className="absolute inset-0 inline-flex items-center justify-center"
                          aria-live="polite"
                        >
                          <Check className="size-3.5" aria-hidden />
                        </span>
                      ) : null}
                    </span>
                  </Button>
                  {showAiBriefStaleNotice ? (
                    <p
                      className="text-xs leading-snug text-muted-foreground/80"
                      role="status"
                    >
                      {t("results.aiBriefBlockedStaleInputs")}
                    </p>
                  ) : null}
                  </div>
                </div>
              </div>
            </div>

            {!analysisArchivedView && onRequestArchiveAndCreateNext ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="flex min-w-0 flex-col rounded-md border border-border/50 bg-background/70 p-3">
                  <div className="flex flex-col gap-2">
                    <div className="space-y-1">
                      <h4 className="font-sans text-[11px] font-semibold tracking-wide text-muted-foreground">
                        {t("checkpoints.archiveAndCreateNextHeading")}
                      </h4>
                      <p className="section-body text-[11px] text-muted-foreground/80">
                        {t("checkpoints.archiveAndCreateNextHelper")}
                      </p>
                    </div>
                    <div className="mt-auto flex flex-col gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        data-archive-and-create-next=""
                        className="h-8 w-full font-sans text-xs font-medium hover:border-[#1d868c]/40 hover:bg-[#1d868c]/[0.04] hover:text-foreground active:border-[#1d868c]/45 active:bg-[#1d868c]/[0.08] focus-visible:border-[#1d868c]/35 focus-visible:ring-[#1d868c]/15"
                        onClick={onRequestArchiveAndCreateNext}
                      >
                        {t("checkpoints.archiveAndCreateNextAction")}
                      </Button>
                    </div>
                  </div>
                </div>
                <div aria-hidden="true" />
              </div>
            ) : null}
            {onRequestFinishOngoingAnalysis ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="flex min-w-0 flex-col rounded-md border border-border/50 bg-background/70 p-3">
                  <div className="flex flex-col gap-2">
                    <div className="space-y-1">
                      <h4 className="font-sans text-[11px] font-semibold tracking-wide text-muted-foreground">
                        {t("checkpoints.finishOngoingHeading")}
                      </h4>
                      <p className="section-body text-[11px] text-muted-foreground/80">
                        {t("checkpoints.finishOngoingHelper")}
                      </p>
                    </div>
                    <div className="mt-auto flex flex-col gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        data-finish-ongoing-analysis=""
                        className="h-8 w-full font-sans text-xs font-medium hover:border-[#1d868c]/40 hover:bg-[#1d868c]/[0.04] hover:text-foreground active:border-[#1d868c]/45 active:bg-[#1d868c]/[0.08] focus-visible:border-[#1d868c]/35 focus-visible:ring-[#1d868c]/15"
                        onClick={onRequestFinishOngoingAnalysis}
                      >
                        {t("checkpoints.finishOngoingAction")}
                      </Button>
                    </div>
                  </div>
                </div>
                <div aria-hidden="true" />
              </div>
            ) : null}
            </div>
          </SectionExpander>
        ) : null}
        </div>
          </SectionExpander>
          )}
        </CardContent>
      </Card>
      <ExpandedChartDialog
        open={expandedChart !== null}
        title={
          expandedChart?.kind === "keyFigures"
            ? t("results.keyMetricsTitle")
            : expandedChart?.kind === "development"
              ? t("checkpoints.developmentTitle")
            : expandedChart?.kind === "scurve"
              ? t("charts.sCurveTitle")
              : expandedChart?.kind === "tornado"
                ? t("charts.tornadoTitle")
                : expandedChart?.kind === "expectedAddition"
                  ? t("charts.waterfallTitle")
                  : expandedChart?.kind === "uncertaintyReserve"
                    ? t("charts.reserveWaterfallTitle")
                    : ""
        }
        subtitle={
          expandedChart &&
          expandedChart.kind !== "scurve" &&
          expandedChart.kind !== "keyFigures" &&
          expandedChart.kind !== "development"
            ? (() => {
                const projectIndex = displayProjects.findIndex(
                  (p) => p.id === expandedChart.projectId,
                )
                return (
                  <>
                    {projectIndex >= 0 ? (
                      <ProjectColorSwatch projectIndex={projectIndex} />
                    ) : null}
                    <span className="min-w-0 truncate">
                      {expandedChart.projectName}
                    </span>
                  </>
                )
              })()
            : null
        }
        closeLabel={t("charts.closeLargerView")}
        onClose={closeExpandedChart}
      >
        {expandedChart?.kind === "keyFigures" ? (
          <ResultsKeyFiguresTable
            projects={displayProjects}
            valuesByProjectId={resultsByProjectId}
            baseCostByProjectId={baseCostByProjectId}
            simulatedIncurredByProjectId={simulatedIncurredByProjectId}
            preferences={resultPreferences}
            frozenKeyFiguresByProjectId={frozenKeyFiguresByProjectId}
            expanded
          />
        ) : null}
        {expandedChart?.kind === "development" && developmentSeries ? (
          <ResultsDevelopmentChart series={developmentSeries} />
        ) : null}
        {expandedChart?.kind === "scurve" ? (
          <ResultsSCurve
            series={cdfSeries}
            markerPercentiles={sCurveMarkerPercentiles}
            expanded
            selectedProjectIds={sCurveSelectedProjectIds}
            onToggleProjectSelection={toggleSCurveProjectSelection}
          />
        ) : null}
        {expandedChart?.kind === "tornado" ? (
          <ResultsTornado
            rows={tornadoRowsByProjectId.get(expandedChart.projectId) ?? []}
            layout={sharedTornadoLayout}
            sharedSymmetricMaxAbs={sharedTornadoSymmetricMaxAbs}
            displayScale={tornadoDisplayScaleByProjectId.get(
              expandedChart.projectId,
            )}
            expanded
          />
        ) : null}
        {expandedChart?.kind === "expectedAddition"
          ? (() => {
              const attributionState = attributionUi.states.find(
                (s) => s.projectId === expandedChart.projectId,
              )
              if (!attributionState?.result) {
                return (
                  <p className="section-body text-[11px] text-muted-foreground/80">
                    {t("empty.noData")}
                  </p>
                )
              }
              return (
                <ResultsWaterfall
                  result={attributionState.result}
                  baseCostLabel={t("keyMetrics.baseCost")}
                  p50Label={t("keyMetrics.p50")}
                  expectedAdditionLabel={t("keyMetrics.expectedAddition")}
                  otherLabel={t("results.waterfallOther")}
                  expanded
                />
              )
            })()
          : null}
        {expandedChart?.kind === "uncertaintyReserve"
          ? (() => {
              const attributionState = attributionUi.states.find(
                (s) => s.projectId === expandedChart.projectId,
              )
              if (!attributionState?.result) {
                return (
                  <p className="section-body text-[11px] text-muted-foreground/80">
                    {t("empty.noData")}
                  </p>
                )
              }
              return (
                <ResultsReserveWaterfall
                  result={attributionState.result}
                  p50Label={t("keyMetrics.p50")}
                  p85Label={t("keyMetrics.p85")}
                  uncertaintyReserveLabel={t("keyMetrics.uncertaintyReserve")}
                  otherLabel={t("results.waterfallOther")}
                  expanded
                />
              )
            })()
          : null}
      </ExpandedChartDialog>
      <ConfirmDialog
        open={ongoingPdfDraftConfirm !== null}
        title={ongoingPdfDraftConfirm?.title}
        message={ongoingPdfDraftConfirm?.message ?? ""}
        cancelLabel={t("results.pdfOngoingDraftExportCancel")}
        confirmLabel={t("results.pdfOngoingDraftExportContinue")}
        onCancel={() => setOngoingPdfDraftConfirm(null)}
        onConfirm={() => {
          const cutoffId = ongoingPdfDraftConfirm?.cutoffCheckpointId
          setOngoingPdfDraftConfirm(null)
          if (!cutoffId) return
          void generateOngoingPdf(cutoffId)
        }}
      />
    </>
  )
}
