import { useCallback, useEffect, useMemo, useState } from "react"

import { Button, buttonVariants } from "@/shared/ui/button"
import { type Project } from "@/domain/analysis/project"
import { appFeatures } from "@/config/appVariant"
import { projectsFromLegacySignature } from "@/domain/analysis/projectsPayload"
import { useI18n } from "@/i18n/useI18n"
import { Card, CardContent } from "@/shared/ui/card"
import { ResultsDevelopmentChart } from "@/features/results/ResultsDevelopmentChart"
import { ResultsSCurve } from "@/features/results/ResultsSCurve"
import { CheckpointComparisonSection } from "@/features/results/CheckpointComparisonSection"
import { ConfirmDialog } from "@/shared/ConfirmDialog"
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
import { ResultsTornado } from "@/features/results/ResultsTornado"
import { ExpandedChartDialog } from "@/features/results/ExpandedChartDialog"
import { useLazyShapleyAttribution } from "@/features/results/useLazyShapleyAttribution"
import { resolveSCurvePercentiles } from "@/domain/results/resultPreferences"
import {
  shouldShowResultSettingsEditor,
  shouldUseCompactResultAnalytics,
} from "@/domain/results/resultSettingsPresentation"
import type { ShapleyAttributionResult } from "@/domain/simulation/shapleyAttribution"
import { Check, Play } from "lucide-react"
import { SectionExpander } from "@/shared/SectionExpander"
import { SpotlightLoadingText } from "@/shared/SpotlightLoadingText"
import { simulationRunKeyForProjects } from "@/domain/simulation/simulationRunId"
import type { FocusResultSectionId } from "@/domain/guided/focusResultSteps"
import {
  type ExpandedResultChart,
  type ResultsPanelProps,
} from "@/features/results/panel/panelTypes"
import { resolveAttributionUi } from "@/features/results/panel/attributionUi"
import { useResultsDerivedData } from "@/features/results/panel/useResultsDerivedData"
import { useResultsExportActions } from "@/features/results/panel/useResultsExportActions"

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
  const useArchivedResults = Boolean(analysisArchivedView && archivedSnapshot)
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
      ? (ongoingCompactResult ?? singleArchivedCompact ?? singleDraftResult)!.resultPreferences
      : useArchivedResults
        ? archivedSnapshot!.resultPreferences
        : liveResultPreferences
  const archivedResultView = resultSettingsEditable
    ? null
    : useCompactResults
      ? (ongoingCompactResult ?? singleArchivedCompact ?? singleDraftResult)!.resultView
      : useArchivedResults
        ? archivedSnapshot!.resultView
        : null
  const useSeededShapley = Boolean(draftResultSeed) && !useArchivedResults && !singleDraftResult
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
    const baseline = projectsFromLegacySignature(lastSimulatedInputSignature)
    if (baseline) return baseline
    return projects
  }, [projects, projectResults.length, lastSimulatedProjects, lastSimulatedInputSignature])
  const [resultsExpanderOpen, setResultsExpanderOpen] = useState(true)
  const [keyFiguresOpen, setKeyFiguresOpen] = useState(true)
  const [developmentOpen, setDevelopmentOpen] = useState(true)
  const [sCurveOpen, setSCurveOpen] = useState(true)
  const [tornadoOpen, setTornadoOpen] = useState(true)
  const [contributionOpen, setContributionOpen] = useState(true)
  const [exportOpen, setExportOpen] = useState(false)
  const [expandedChart, setExpandedChart] = useState<ExpandedResultChart | null>(null)
  /** Ephemeral S-curve legend multi-select; shared with expanded view; not persisted. */
  const [sCurveSelectedProjectIds, setSCurveSelectedProjectIds] = useState<readonly string[]>([])
  const toggleSCurveProjectSelection = useCallback((projectId: string) => {
    setSCurveSelectedProjectIds((prev) => toggleSelectedProjectId(prev, projectId))
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
    // intentional: a new simulation run re-opens every section
    /* eslint-disable react-hooks/set-state-in-effect */
    setKeyFiguresOpen(true)
    setSCurveOpen(true)
    setTornadoOpen(true)
    setContributionOpen(true)
    setExportOpen(false)
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [resultsLayoutResetKey])

  const {
    baseCostByProjectId,
    resultsByProjectId,
    compactResultByProjectId,
    frozenKeyFiguresByProjectId,
    simulatedIncurredByProjectId,
    developmentSeries,
    cdfSeries,
    tornadoRowsByProjectId,
    tornadoDisplayScaleByProjectId,
    sharedTornadoLayout,
    sharedTornadoSymmetricMaxAbs,
  } = useResultsDerivedData({
    projects,
    simulatedBaseCostByProjectId,
    projectResults,
    useCompactResults,
    useArchivedResults,
    archivedSnapshot,
    singleDraftResult,
    singleArchivedCompact,
    ongoingCompactResult,
    ongoingCheckpoints,
    viewedCheckpointId,
    checkpointComparisonResultSource,
    resultPreferences,
    displayProjects,
    t,
  })

  const { requestCalculation, getStatus, getResult, getError } = useLazyShapleyAttribution({
    displayProjects,
    projectResults,
    simulationRunIdByProjectId,
    // Keep archived / persisted Contribution from running live Shapley.
    inputsStale:
      pdfExportBlockedStaleInputs || analysisArchivedView || useCompactResults || useSeededShapley,
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
        (project) => (compactResultByProjectId.get(project.id)?.contribution ?? null) === null,
      )
    }
    if (!useArchivedResults || !archivedSnapshot) return false
    if (displayProjects.length === 0) return true
    return displayProjects.every(
      (project) => (archivedSnapshot.shapleyByProjectId[project.id] ?? null) === null,
    )
  }, [
    archivedSnapshot,
    displayProjects,
    compactResultByProjectId,
    useArchivedResults,
    useCompactResults,
  ])

  const attributionUi = useMemo(
    () =>
      resolveAttributionUi({
        archivedSnapshot,
        compactResultByProjectId,
        displayProjects,
        draftResultSeed,
        getError,
        getResult,
        getStatus,
        useArchivedResults,
        useCompactResults,
        useSeededShapley,
      }),
    [
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
    ],
  )

  const {
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
  } = useResultsExportActions({
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
  })

  useEffect(() => {
    if (projectResults.length > 0) {
      // intentional: results arriving expands the Results section
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setResultsExpanderOpen(true)
    }
  }, [projectResults])

  const inFocusStep = focusSection != null
  const showFocusSection = (id: FocusResultSectionId) => !inFocusStep || focusSection === id

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
                    <p className="section-body">{t("helper.resultsKeyMetrics")}</p>
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
                    <p className="section-body">{t("checkpoints.developmentHelper")}</p>
                    {developmentSeries.points.length === 0 ? (
                      <p className="section-body text-muted-foreground/85" role="status">
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
                    <p className="section-body">{t("charts.sCurveSubtitle")}</p>
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
                    <p className="section-body">{t("charts.tornadoSubtitle")}</p>
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
              {showFocusSection("contribution") && appFeatures.showExpectedAddition ? (
                <SectionExpander
                  title={t("charts.attributionTitle")}
                  defaultOpen
                  open
                  onOpenChange={() => {}}
                  headerClassName="px-0 py-1"
                  titleClassName="text-[11px]"
                >
                  <div className="space-y-2">
                    <p className="section-body">{t("charts.attributionSubtitle")}</p>

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
                                <span className="min-w-0 truncate">{state.projectName}</span>
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
                <div className="mx-auto flex max-w-3xl flex-col gap-6" data-focus-next-steps="">
                  <p className="m-0 font-sans text-[14px] leading-relaxed text-foreground">
                    {t("inputs.focusNextStepsBody")}
                  </p>

                  <section className="space-y-3" data-focus-next-steps-continue="">
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
                      {onRequestArchiveAndCreateNext && !analysisArchivedView ? (
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

                  <section className="space-y-3" data-focus-next-steps-use-results="">
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
                <div className="flex shrink-0 items-center gap-0.5" data-results-header-actions="">
                  {onOpenFocusResults && !focusResultsActive ? (
                    <button
                      type="button"
                      className={buttonVariants({
                        variant: "ghost",
                        size: "icon-sm",
                        className: "text-muted-foreground hover:text-foreground",
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
                {ongoingCheckpoints && viewedCheckpointId && checkpointComparisonResultSource ? (
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
                    <p className="section-body">{t("helper.resultsKeyMetrics")}</p>
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

                {ongoingCheckpoints && viewedCheckpointId && checkpointComparisonResultSource ? (
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
                      <p className="section-body">{t("checkpoints.developmentHelper")}</p>
                      {developmentSeries.points.length === 0 ? (
                        <p className="section-body text-muted-foreground/85" role="status">
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
                    <p className="section-body">{t("charts.sCurveSubtitle")}</p>
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
                    <p className="section-body">{t("charts.tornadoSubtitle")}</p>
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
                      <p className="section-body">{t("charts.attributionSubtitle")}</p>

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
                                  <span className="min-w-0 truncate">{state.projectName}</span>
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
                    {projectIndex >= 0 ? <ProjectColorSwatch projectIndex={projectIndex} /> : null}
                    <span className="min-w-0 truncate">{expandedChart.projectName}</span>
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
            displayScale={tornadoDisplayScaleByProjectId.get(expandedChart.projectId)}
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
