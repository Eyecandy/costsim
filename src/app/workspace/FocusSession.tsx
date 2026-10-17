import type { ProjectResult } from "@/domain/simulation/simulationTypes"
import { GuidedPhaseInfo } from "@/features/guided-input/GuidedPhaseInfo"
import { FocusModeShell } from "@/features/focus-mode/FocusModeShell"
import { FocusPhaseNav } from "@/features/focus-mode/FocusPhaseNav"
import { ResultsPanel } from "@/features/results/ResultsPanel"
import { ResultPreferencesPanel } from "@/features/results/ResultPreferencesPanel"
import { Button, buttonVariants } from "@/shared/ui/button"
import { focusResultSectionTitleKey } from "@/domain/guided/focusResultSteps"
import { canFocusNavigateNextResults } from "@/domain/guided/focusSessionNavigation"
import { shouldShowFocusPhaseNav } from "@/domain/guided/focusPhaseNav"
import { FOCUS_SESSION_FOOTER_NAV_BUTTON_CLASS } from "@/domain/guided/focusSessionFrame"
import { shouldShowResultSettingsEditor } from "@/domain/results/resultSettingsPresentation"
import type { Project } from "@/domain/analysis/project"
import { cn } from "@/shared/utils"
import { ProjectColorSwatch } from "@/shared/ProjectColorSwatch"
import { useI18n } from "@/i18n/useI18n"
import {
  isOngoingCheckpointResultSnapshot,
  type OngoingCheckpointResultSnapshotV1,
} from "@/domain/analysis/ongoingCheckpointResultSnapshot"
import {
  isSingleArchivedResultSnapshot,
  type SingleArchivedResultSnapshotV1,
} from "@/domain/analysis/singleArchivedResultSnapshot"
import type { SingleDraftResultSnapshotV1 } from "@/domain/analysis/singleDraftResultSnapshot"
import {
  SIMULATION_NOTICE_TEXT_CLASS,
  NOTICE_WORD_GREEN_CLASS,
} from "@/app/workspace/layoutClasses"
import { noticeWithColorWord } from "@/app/workspace/workspaceHelpers"
import type { ResultPreferencesV1 } from "@/domain/results/resultPreferences"
import type { useGuidedFocusSession } from "@/app/workspace/useGuidedFocusSession"
import type { useGuidedFocusState } from "@/app/workspace/useGuidedFocusState"
import type { useLibraryAnalysisSession } from "@/features/analysis-library/useLibraryAnalysisSession"

export function FocusSession({
  activeProject,
  activeProjectId,
  addKeyFigurePercentile,
  addSCurvePercentile,
  analysisReadOnly,
  checkpointComparisonResultSource,
  guidedFocusSession,
  guidedFocusState,
  handleRevertInputsToLastSimulation,
  hasViewableResults,
  isOngoingAnalysis,
  lastSimulatedInputSignature,
  lastSimulatedProjects,
  librarySession,
  ongoingCompactResult,
  projectResults,
  projects,
  removeKeyFigurePercentile,
  removeSCurvePercentile,
  replacePreferences,
  requestArchiveCheckpoint,
  requestFinishOngoingAnalysis,
  resetToDefaults,
  resultPreferences,
  runs,
  saveAsDefault,
  showStaleInputNotice,
  simulatedBaseCostByProjectId,
  simulationRunIdByProjectId,
  singleArchivedCompact,
  singleDraftCompact,
}: {
  activeProject: Project
  activeProjectId: string
  addKeyFigurePercentile: (p: number) => void
  addSCurvePercentile: (p: number) => void
  analysisReadOnly: boolean
  checkpointComparisonResultSource: { resultsComparable: boolean; compact?: OngoingCheckpointResultSnapshotV1 | undefined; projectResults: ProjectResult[]; simulatedBaseCostByProjectId: Record<string, number | null>; } | null
  guidedFocusSession: ReturnType<typeof useGuidedFocusSession>
  guidedFocusState: ReturnType<typeof useGuidedFocusState>
  handleRevertInputsToLastSimulation: () => void
  hasViewableResults: boolean
  isOngoingAnalysis: boolean
  lastSimulatedInputSignature: string
  lastSimulatedProjects: Project[]
  librarySession: ReturnType<typeof useLibraryAnalysisSession>
  ongoingCompactResult: OngoingCheckpointResultSnapshotV1 | null
  projectResults: ProjectResult[]
  projects: Project[]
  removeKeyFigurePercentile: (p: number) => void
  removeSCurvePercentile: (p: number) => void
  replacePreferences: (next: ResultPreferencesV1) => void
  requestArchiveCheckpoint: () => void
  requestFinishOngoingAnalysis: () => void
  resetToDefaults: () => void
  resultPreferences: ResultPreferencesV1
  runs: number
  saveAsDefault: () => void
  showStaleInputNotice: boolean
  simulatedBaseCostByProjectId: Record<string, number | null>
  simulationRunIdByProjectId: Record<string, string>
  singleArchivedCompact: SingleArchivedResultSnapshotV1 | null
  singleDraftCompact: SingleDraftResultSnapshotV1 | null
}) {
  const { language, t } = useI18n()
  const {
    focusResultStepIndex,
    focusShellRef,
    focusView,
    furthestReachedFocusPhase,
    guidedFocusChromeMeta,
    guidedInputKind,
    showStaleInputChanges,
  } = guidedFocusState
  const {
    currentFocusUserPhase,
    exitFocusMode,
    focusResultSection,
    focusResultSteps,
    handleFocusReviewInput,
    handleFocusShowChanges,
    handoffGuidedToAddDrivers,
    handoffGuidedToCorrelation,
    handoffGuidedToImpact,
    navigateFocusNext,
    navigateFocusPrevious,
    navigateToFocusUserPhase,
  } = guidedFocusSession
  return (
    <>
      {(Boolean(guidedInputKind && !analysisReadOnly) ||
        (focusView === "results" &&
          hasViewableResults &&
          focusResultSection !== null)) && (
        <FocusModeShell
          ref={focusShellRef}
          open={focusView !== null}
          keepMounted={Boolean(guidedInputKind && !analysisReadOnly)}
          title={
            focusView === "results" && focusResultSection
              ? t(focusResultSectionTitleKey(focusResultSection))
              : focusView === "input"
                ? (guidedFocusChromeMeta?.title ?? "")
                : ""
          }
          subtitle={
            focusView === "results" && activeProject ? (
              <p
                className="m-0 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5"
                data-focus-results-project-context=""
              >
                <span className="inline-flex min-w-0 items-center gap-1.5">
                  <ProjectColorSwatch
                    projectIndex={Math.max(
                      0,
                      projects.findIndex((p) => p.id === activeProject.id),
                    )}
                  />
                  <span className="min-w-0 truncate" title={activeProject.name}>
                    {activeProject.name}
                  </span>
                </span>
                <span
                  className="shrink-0 text-muted-foreground/70"
                  data-focus-results-context=""
                >
                  {t("inputs.focusResultsContext")}
                </span>
              </p>
            ) : focusView === "input" && guidedFocusChromeMeta ? (
              <p
                className="m-0 flex min-w-0 items-center gap-1.5"
                data-guided-project-context=""
              >
                <ProjectColorSwatch
                  projectIndex={guidedFocusChromeMeta.projectIndex}
                />
                <span
                  className="min-w-0 truncate"
                  title={guidedFocusChromeMeta.projectName}
                >
                  {guidedFocusChromeMeta.projectName}
                </span>
              </p>
            ) : undefined
          }
          headerHelp={
            focusView === "input" &&
            guidedFocusChromeMeta?.helpTopic &&
            guidedFocusChromeMeta.helpContent ? (
              <GuidedPhaseInfo
                topic={guidedFocusChromeMeta.helpTopic}
                content={guidedFocusChromeMeta.helpContent}
              />
            ) : null
          }
          headerAuxiliary={
            shouldShowFocusPhaseNav({
              focusView,
              guidedWorkflowPhase: guidedFocusChromeMeta?.workflowPhase,
            }) && currentFocusUserPhase ? (
              <FocusPhaseNav
                currentPhase={currentFocusUserPhase}
                furthestReached={furthestReachedFocusPhase}
                itemProgressLabel={
                  focusView === "input"
                    ? guidedFocusChromeMeta?.progressLabel || undefined
                    : undefined
                }
                onSelectPhase={navigateToFocusUserPhase}
                t={t}
              />
            ) : focusView === "input" &&
              guidedFocusChromeMeta?.progressLabel ? (
              <span data-guided-progress="">
                {guidedFocusChromeMeta.progressLabel}
              </span>
            ) : null
          }
          onExitFocus={exitFocusMode}
          onNavigatePrevious={
            focusView !== null ? navigateFocusPrevious : undefined
          }
          onNavigateNext={
            focusView !== null ? navigateFocusNext : undefined
          }
          canNavigateNext={
            focusView === "results"
              ? canFocusNavigateNextResults(
                  focusResultStepIndex,
                  focusResultSteps.length,
                )
              : focusView === "input"
                ? Boolean(guidedFocusChromeMeta?.canGoNext)
                : false
          }
          canNavigatePrevious={
            focusView === "results"
              ? true
              : focusView === "input"
                ? Boolean(guidedFocusChromeMeta?.canGoPrevious)
                : false
          }
          surfaceAttr={
            focusView === "results"
              ? "data-focus-results-surface"
              : "data-focus-input-surface"
          }
          headerActions={
            focusView === "results" &&
            shouldShowResultSettingsEditor({
              analysisArchivedView: analysisReadOnly,
              useArchivedResults: Boolean(
                analysisReadOnly && librarySession.archivedSnapshot,
              ),
            }) ? (
              <ResultPreferencesPanel
                preferences={resultPreferences}
                onChange={replacePreferences}
                onAddKeyFigurePercentile={addKeyFigurePercentile}
                onRemoveKeyFigurePercentile={removeKeyFigurePercentile}
                onAddSCurvePercentile={addSCurvePercentile}
                onRemoveSCurvePercentile={removeSCurvePercentile}
                onSaveAsDefault={saveAsDefault}
                onReset={resetToDefaults}
              />
            ) : null
          }
          status={
            focusView === "results" && showStaleInputNotice ? (
              <div
                className="flex min-w-0 flex-col gap-1"
                data-focus-stale-notice=""
              >
                <p className="font-sans text-xs font-medium leading-snug text-foreground/85">
                  {t("projects.staleInputsTitle")}
                </p>
                <p
                  className={cn(
                    SIMULATION_NOTICE_TEXT_CLASS,
                    "min-w-0 break-words",
                  )}
                >
                  {showStaleInputChanges
                    ? noticeWithColorWord(
                        t("projects.staleInputsNoticeWithChanges"),
                        language === "no" ? "Grønne" : "Green",
                        NOTICE_WORD_GREEN_CLASS,
                      )
                    : t("projects.staleInputsNotice")}
                </p>
                <div className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1">
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    className="h-auto min-h-0 w-fit shrink-0 self-start px-0 py-0 text-xs leading-snug"
                    aria-pressed={showStaleInputChanges}
                    onClick={handleFocusShowChanges}
                    data-focus-show-changes=""
                  >
                    {t("projects.showInputChanges")}
                  </Button>
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    className="h-auto min-h-0 w-fit shrink-0 self-start px-0 py-0 text-xs leading-snug"
                    onClick={handleRevertInputsToLastSimulation}
                  >
                    {t("projects.revertInputChanges")}
                  </Button>
                </div>
              </div>
            ) : null
          }
          footer={
            focusView === "results" ? (
              <div
                className="flex w-full items-center justify-between gap-3"
                data-focus-results-nav=""
              >
                <button
                  type="button"
                  className={buttonVariants({
                    variant: "ghost",
                    className: FOCUS_SESSION_FOOTER_NAV_BUTTON_CLASS,
                  })}
                  onClick={navigateFocusPrevious}
                  data-focus-results-previous=""
                  data-focus-session-previous=""
                  data-focus-back-to-input={
                    focusResultStepIndex <= 0 ? "" : undefined
                  }
                >
                  {focusResultStepIndex <= 0
                    ? t("inputs.focusBackToInput")
                    : t("inputs.guidedPrevious")}
                </button>
                {focusResultStepIndex >= focusResultSteps.length - 1 ? (
                  <button
                    type="button"
                    className={buttonVariants({
                      variant: "ghost",
                      className: FOCUS_SESSION_FOOTER_NAV_BUTTON_CLASS,
                    })}
                    onClick={exitFocusMode}
                    data-focus-session-exit=""
                    data-focus-results-exit=""
                  >
                    {t("inputs.focusSessionExit")}
                  </button>
                ) : (
                  <button
                    type="button"
                    className={buttonVariants({
                      variant: "ghost",
                      className: FOCUS_SESSION_FOOTER_NAV_BUTTON_CLASS,
                    })}
                    onClick={navigateFocusNext}
                    data-focus-results-next=""
                    data-focus-session-next=""
                  >
                    {t("inputs.guidedNext")}
                  </button>
                )}
              </div>
            ) : focusView === "input" && guidedFocusChromeMeta ? (
              <div
                className="flex w-full items-center justify-between gap-3"
                data-focus-input-nav=""
              >
                <button
                  type="button"
                  disabled={!guidedFocusChromeMeta.canGoPrevious}
                  className={buttonVariants({
                    variant: "ghost",
                    className: FOCUS_SESSION_FOOTER_NAV_BUTTON_CLASS,
                  })}
                  onClick={navigateFocusPrevious}
                  data-focus-session-previous=""
                  data-guided-previous=""
                >
                  {t("inputs.guidedPrevious")}
                </button>
                <div className="flex flex-wrap items-center justify-end gap-2">
                  {guidedFocusChromeMeta.secondaryFooter?.kind ===
                  "adjustCorrelation" ? (
                    <button
                      type="button"
                      className={buttonVariants({
                        variant: "ghost",
                        className: FOCUS_SESSION_FOOTER_NAV_BUTTON_CLASS,
                      })}
                      onClick={handoffGuidedToCorrelation}
                      data-guided-adjust-correlation=""
                    >
                      {guidedFocusChromeMeta.secondaryFooter.label}
                    </button>
                  ) : null}
                  {guidedFocusChromeMeta.secondaryFooter?.kind ===
                  "adjustImpact" ? (
                    <button
                      type="button"
                      className={buttonVariants({
                        variant: "ghost",
                        className: FOCUS_SESSION_FOOTER_NAV_BUTTON_CLASS,
                      })}
                      onClick={handoffGuidedToImpact}
                      data-guided-adjust-impact=""
                    >
                      {guidedFocusChromeMeta.secondaryFooter.label}
                    </button>
                  ) : null}
                  {guidedFocusChromeMeta.secondaryFooter?.kind ===
                  "addDrivers" ? (
                    <button
                      type="button"
                      className={buttonVariants({
                        variant: "ghost",
                        className: FOCUS_SESSION_FOOTER_NAV_BUTTON_CLASS,
                      })}
                      onClick={handoffGuidedToAddDrivers}
                      data-guided-add-drivers=""
                    >
                      {guidedFocusChromeMeta.secondaryFooter.label}
                    </button>
                  ) : null}
                  <button
                    type="button"
                    disabled={!guidedFocusChromeMeta.canGoNext}
                    className={buttonVariants({
                      variant: "ghost",
                      className: FOCUS_SESSION_FOOTER_NAV_BUTTON_CLASS,
                    })}
                    onClick={navigateFocusNext}
                    data-focus-session-next=""
                    data-guided-next=""
                  >
                    {guidedFocusChromeMeta.nextLabel}
                  </button>
                </div>
              </div>
            ) : null
          }
        >
          {focusView === "results" &&
          hasViewableResults &&
          focusResultSection ? (
            <ResultsPanel
              projects={projects}
              activeProjectId={activeProjectId}
              projectResults={projectResults}
              simulatedBaseCostByProjectId={simulatedBaseCostByProjectId}
              lastSimulatedInputSignature={lastSimulatedInputSignature}
              lastSimulatedProjects={lastSimulatedProjects}
              simulationRunIdByProjectId={simulationRunIdByProjectId}
              simulationCount={runs}
              pdfExportBlockedStaleInputs={showStaleInputNotice}
              analysisArchivedView={analysisReadOnly}
              archivedSnapshot={
                librarySession.archivedSnapshot &&
                !isOngoingCheckpointResultSnapshot(
                  librarySession.archivedSnapshot,
                ) &&
                !isSingleArchivedResultSnapshot(
                  librarySession.archivedSnapshot,
                )
                  ? librarySession.archivedSnapshot
                  : null
              }
              ongoingCompactResult={
                ongoingCompactResult ??
                (isOngoingAnalysis &&
                librarySession.ongoingDraftResult &&
                librarySession.docMeta?.id ===
                  librarySession.ongoingDraftResult.analysisId &&
                librarySession.activeCheckpoint?.id ===
                  librarySession.ongoingDraftResult.checkpointId
                  ? librarySession.ongoingDraftResult
                  : null)
              }
              singleArchivedCompact={singleArchivedCompact}
              singleDraftResult={
                singleDraftCompact ?? librarySession.singleDraftResult
              }
              draftResultSeed={librarySession.draftResultSeed}
              onContributionReady={
                isOngoingAnalysis
                  ? librarySession.attachOngoingDraftContribution
                  : librarySession.attachSingleDraftContribution
              }
              liveResultPreferences={resultPreferences}
              replacePreferences={replacePreferences}
              saveAsDefault={saveAsDefault}
              resetToDefaults={resetToDefaults}
              addKeyFigurePercentile={addKeyFigurePercentile}
              removeKeyFigurePercentile={removeKeyFigurePercentile}
              addSCurvePercentile={addSCurvePercentile}
              removeSCurvePercentile={removeSCurvePercentile}
              onRequestArchiveAndCreateNext={
                isOngoingAnalysis && librarySession.canArchive
                  ? requestArchiveCheckpoint
                  : undefined
              }
              onRequestFinishOngoingAnalysis={
                librarySession.canCompleteOngoingAnalysis
                  ? requestFinishOngoingAnalysis
                  : undefined
              }
              analysisMode={librarySession.analysisMode}
              ongoingCheckpoints={
                isOngoingAnalysis
                  ? librarySession.ongoing?.checkpoints
                  : undefined
              }
              viewedCheckpointId={
                isOngoingAnalysis
                  ? librarySession.ongoing?.activeCheckpointId
                  : undefined
              }
              analysisName={librarySession.docMeta?.name}
              ongoingLifecycle={
                isOngoingAnalysis
                  ? librarySession.ongoing?.lifecycle
                  : undefined
              }
              checkpointComparisonResultSource={
                checkpointComparisonResultSource
              }
              focusResultsActive
              focusSection={focusResultSection}
              onFocusReviewInput={handleFocusReviewInput}
            />
          ) : null}
        </FocusModeShell>
      )}
    </>
  )
}
