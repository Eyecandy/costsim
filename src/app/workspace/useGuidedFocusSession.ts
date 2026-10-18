import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  type Dispatch,
  type SetStateAction,
} from "react"
import type { ProjectResult } from "@/domain/simulation/simulationTypes"
import type { GuidedInputKind } from "@/domain/guided/guidedInput"
import { resolveFocusNext, resolveFocusPrevious } from "@/domain/guided/focusSessionNavigation"
import {
  advanceFurthestFocusPhase,
  getFocusUserPhase,
  isFocusPhaseReached,
  type FocusUserPhase,
} from "@/domain/guided/focusPhaseNav"
import { clearFocusSessionResume } from "@/persistence/focusSessionResume"
import type { Project } from "@/domain/analysis/project"
import { parseDriverForSimulation } from "@/domain/results/tableRows"
import type { useGuidedFocusState } from "@/app/workspace/useGuidedFocusState"
import type { useLibraryAnalysisSession } from "@/features/analysis-library/useLibraryAnalysisSession"
import { useCorrelationEditing } from "@/app/workspace/useCorrelationEditing"
import { useCorrelationGroupEditing } from "@/app/workspace/useCorrelationGroupEditing"
import { useEditingModeToggles } from "@/app/workspace/useEditingModeToggles"
import { useFocusResultSteps } from "@/app/workspace/useFocusResultSteps"
import { useFocusSessionResume } from "@/app/workspace/useFocusSessionResume"
import { useGuidedHandoff } from "@/app/workspace/useGuidedHandoff"

export function useGuidedFocusSession({
  activeProject,
  activeProjectId,
  analysisReadOnly,
  guidedFocusState,
  hasViewableResults,
  isOngoingAnalysis,
  librarySession,
  projectResults,
  setProjects,
  showStaleInputNotice,
}: {
  activeProject: Project | null
  activeProjectId: string
  analysisReadOnly: boolean
  guidedFocusState: ReturnType<typeof useGuidedFocusState>
  hasViewableResults: boolean
  isOngoingAnalysis: boolean
  librarySession: ReturnType<typeof useLibraryAnalysisSession>
  projectResults: ProjectResult[]
  setProjects: Dispatch<SetStateAction<Project[]>>
  showStaleInputNotice: boolean
}) {
  const {
    correlationModeActive,
    defineModeActive,
    focusResultStepIndex,
    focusShellRef,
    focusView,
    furthestReachedFocusPhase,
    guidedDialogRef,
    guidedFocusChromeMeta,
    guidedInputKind,
    impactModeActive,
    impactSelectedDriverId,
    setCorrelationModeActive,
    setDefineModeActive,
    setDefineSelectedRowId,
    setFocusPortalTarget,
    setFocusResultStepIndex,
    setFocusView,
    setFurthestReachedFocusPhase,
    setGuidedInputKind,
    setGuidedInputStartIndex,
    setGuidedLandFocusPhase,
    setGuidedResume,
    setGuidedResumePhase,
    setGuidedSemanticResume,
    setGuidedStartPhase,
    setImpactModeActive,
    setImpactSelectedDriverId,
    setShowStaleInputChanges,
  } = guidedFocusState

  const impactSelectedDriverRow = useMemo(() => {
    if (!impactModeActive || !activeProject || impactSelectedDriverId === null) {
      return null
    }
    const index = activeProject.driverRows.findIndex((r) => r.id === impactSelectedDriverId)
    if (index < 0) return null
    const row = activeProject.driverRows[index]!
    if (parseDriverForSimulation(row) === null) return null
    return {
      row,
      label: row.name.trim() || `Driver ${index + 1}`,
    }
  }, [impactModeActive, activeProject, impactSelectedDriverId])

  const {
    clearCorrelationEditingState,
    clearCorrelationSaveConfirm,
    flashCorrelationFeedback,
    syncCorrelationPendingFromSelection,
  } = useCorrelationEditing({ guidedFocusState })

  useEffect(() => {
    if (!impactModeActive) setImpactSelectedDriverId(null)
  }, [impactModeActive, setImpactSelectedDriverId])

  useEffect(() => {
    if (!defineModeActive) setDefineSelectedRowId(null)
  }, [defineModeActive, setDefineSelectedRowId])

  useEffect(() => {
    if (!correlationModeActive) {
      clearCorrelationEditingState()
      clearCorrelationSaveConfirm()
    }
  }, [correlationModeActive, clearCorrelationEditingState, clearCorrelationSaveConfirm])

  useEffect(() => {
    setImpactSelectedDriverId(null)
    setDefineSelectedRowId(null)
    setGuidedInputKind(null)
    setGuidedResume(null)
    setGuidedResumePhase(null)
    clearCorrelationEditingState()
    clearCorrelationSaveConfirm()
  }, [
    activeProjectId,
    clearCorrelationEditingState,
    clearCorrelationSaveConfirm,
    setDefineSelectedRowId,
    setGuidedInputKind,
    setGuidedResume,
    setGuidedResumePhase,
    setImpactSelectedDriverId,
  ])

  /** Clear Guided/Impact/Correlation/Define when viewing an archived analysis. */
  useEffect(() => {
    if (!analysisReadOnly) return
    setImpactModeActive(false)
    setImpactSelectedDriverId(null)
    setCorrelationModeActive(false)
    setDefineModeActive(false)
    setDefineSelectedRowId(null)
    setGuidedInputKind(null)
    setGuidedResume(null)
    setGuidedResumePhase(null)
    clearCorrelationEditingState()
    clearCorrelationSaveConfirm()
  }, [
    analysisReadOnly,
    clearCorrelationEditingState,
    clearCorrelationSaveConfirm,
    setCorrelationModeActive,
    setDefineModeActive,
    setDefineSelectedRowId,
    setGuidedInputKind,
    setGuidedResume,
    setGuidedResumePhase,
    setImpactModeActive,
    setImpactSelectedDriverId,
  ])

  const clearStoredFocusSessionResume = useCallback(() => {
    const analysisId = librarySession.analysisId
    if (analysisId) clearFocusSessionResume(analysisId)
  }, [librarySession.analysisId])

  const closeGuidedInput = useCallback(() => {
    setGuidedInputKind(null)
    setGuidedStartPhase(null)
    setGuidedResumePhase(null)
    setGuidedSemanticResume(null)
    // Closing Guided Input abandons any pending detour resume.
    setGuidedResume(null)
    setFocusView((prev) => {
      if (prev === "input") {
        clearStoredFocusSessionResume()
        return null
      }
      return prev
    })
  }, [
    clearStoredFocusSessionResume,
    setFocusView,
    setGuidedInputKind,
    setGuidedResume,
    setGuidedResumePhase,
    setGuidedSemanticResume,
    setGuidedStartPhase,
  ])

  const openGuidedInput = useCallback(
    (kind: GuidedInputKind, startIndex = 0, options?: { startPhase?: "focusIntro" | null }) => {
      if (analysisReadOnly) return
      setGuidedStartPhase(options?.startPhase ?? null)
      setImpactModeActive(false)
      setImpactSelectedDriverId(null)
      setCorrelationModeActive(false)
      setDefineModeActive(false)
      setDefineSelectedRowId(null)
      clearCorrelationEditingState()
      clearCorrelationSaveConfirm()
      setGuidedResume(null)
      setGuidedResumePhase(null)
      setGuidedInputStartIndex(startIndex)
      setGuidedInputKind(kind)
      // Enter shared Focus session immediately so Input uses the shell-owned
      // lightweight footer from the first paint (same as after Results round-trip).
      // Standalone Guided modal (heavy Next) is not used for normal Input opens.
      setFocusView("input")
    },
    [
      analysisReadOnly,
      clearCorrelationEditingState,
      clearCorrelationSaveConfirm,
      setCorrelationModeActive,
      setDefineModeActive,
      setDefineSelectedRowId,
      setFocusView,
      setGuidedInputKind,
      setGuidedInputStartIndex,
      setGuidedResume,
      setGuidedResumePhase,
      setGuidedStartPhase,
      setImpactModeActive,
      setImpactSelectedDriverId,
    ],
  )

  /**
   * Primary Focus mode entry (INPUT column header). Starts at the Focus-mode
   * intro, ahead of Project profile and the rest of the guided sequence.
   */
  const openFocusModePrimary = useCallback(() => {
    if (analysisReadOnly) return
    openGuidedInput("cost", 0, { startPhase: "focusIntro" })
  }, [analysisReadOnly, openGuidedInput])

  const {
    handleGuidedLandFocusPhaseApplied,
    handleGuidedResumeApplied,
    handleGuidedSemanticResumeApplied,
    handoffGuidedToAddCostItems,
    handoffGuidedToAddDrivers,
    handoffGuidedToCorrelation,
    handoffGuidedToImpact,
    returnToGuidedReview,
  } = useGuidedHandoff({
    activeProject,
    activeProjectId,
    clearCorrelationEditingState,
    clearCorrelationSaveConfirm,
    guidedFocusState,
  })

  const { handleCorrelationModeToggle, handleDefineModeToggle, handleImpactModeToggle } =
    useEditingModeToggles({
      clearCorrelationEditingState,
      clearCorrelationSaveConfirm,
      guidedFocusState,
    })

  const {
    handleCostCorrelationGroupApply,
    handleCorrelationPendingChange,
    handleOpenCorrelationSummary,
    handleRemoveCorrelationSummary,
    handleToggleCorrelationCost,
    savedCorrelationSummaries,
  } = useCorrelationGroupEditing({
    activeProject,
    analysisReadOnly,
    clearCorrelationEditingState,
    clearCorrelationSaveConfirm,
    flashCorrelationFeedback,
    guidedFocusState,
    setProjects,
    syncCorrelationPendingFromSelection,
  })

  const activeCostCorrelationPrep = useMemo(() => {
    if (!activeProject) return undefined
    return projectResults.find((r) => r.projectId === activeProject.id)?.costCorrelationPrep
  }, [activeProject, projectResults])

  const currentFocusUserPhase = useMemo(
    () =>
      getFocusUserPhase({
        focusView,
        guidedWorkflowPhase: guidedFocusChromeMeta?.workflowPhase,
      }),
    [focusView, guidedFocusChromeMeta?.workflowPhase],
  )

  // Monotonic session unlock from canonical current phase (not validity).
  // Clearing on focusView === null resets history for a new Focus session.
  useLayoutEffect(() => {
    if (focusView === null) {
      setFurthestReachedFocusPhase(null)
      setGuidedLandFocusPhase(null)
      return
    }
    setFurthestReachedFocusPhase((prev) => advanceFurthestFocusPhase(prev, currentFocusUserPhase))
  }, [focusView, currentFocusUserPhase, setFurthestReachedFocusPhase, setGuidedLandFocusPhase])

  const navigateToFocusUserPhase = useCallback(
    (phase: FocusUserPhase) => {
      const allowed =
        isFocusPhaseReached(phase, furthestReachedFocusPhase) || phase === currentFocusUserPhase
      if (!allowed) return

      if (phase === "results") {
        if (!hasViewableResults) return
        setFocusResultStepIndex(0)
        setFocusView("results")
        return
      }

      setFocusView("input")
      if (!guidedInputKind && !analysisReadOnly) {
        setGuidedLandFocusPhase(phase)
        openGuidedInput("cost")
        return
      }
      setGuidedLandFocusPhase(phase)
      guidedDialogRef.current?.goToFocusUserPhase(phase)
    },
    [
      furthestReachedFocusPhase,
      currentFocusUserPhase,
      hasViewableResults,
      guidedInputKind,
      analysisReadOnly,
      openGuidedInput,
      guidedDialogRef,
      setFocusResultStepIndex,
      setFocusView,
      setGuidedLandFocusPhase,
    ],
  )

  /** Exit the entire Focus session (Input + Results). Never lands on Focus Input. */
  const exitFocusMode = useCallback(() => {
    focusShellRef.current?.exitFullscreen()
    clearStoredFocusSessionResume()
    setFocusView(null)
    setFocusResultStepIndex(0)
    setFurthestReachedFocusPhase(null)
    setGuidedLandFocusPhase(null)
    setGuidedSemanticResume(null)
    setGuidedResumePhase(null)
    setGuidedResume(null)
    setGuidedInputKind(null)
  }, [
    clearStoredFocusSessionResume,
    focusShellRef,
    setFocusResultStepIndex,
    setFocusView,
    setFurthestReachedFocusPhase,
    setGuidedInputKind,
    setGuidedLandFocusPhase,
    setGuidedResume,
    setGuidedResumePhase,
    setGuidedSemanticResume,
  ])

  const openFocusResults = useCallback(() => {
    if (!hasViewableResults) return
    setFocusResultStepIndex(0)
    setFocusView("results")
  }, [hasViewableResults, setFocusResultStepIndex, setFocusView])

  const continueFromSimulationToResults = useCallback(() => {
    if (!hasViewableResults) return
    setFocusResultStepIndex(0)
    setFocusView("results")
  }, [hasViewableResults, setFocusResultStepIndex, setFocusView])

  /**
   * Cross Results → Input at Simulation (first-class Focus step).
   * Always land on Simulation — never skip to Impact / prior Input steps.
   */
  const backToFocusInput = useCallback(() => {
    setFocusView("input")
    if (!guidedInputKind && !analysisReadOnly) {
      openGuidedInput("cost")
    }
    // Belt-and-suspenders: resume effect + imperative handle.
    setGuidedResumePhase("simulation")
    guidedDialogRef.current?.goToSimulation()
  }, [
    guidedInputKind,
    analysisReadOnly,
    openGuidedInput,
    guidedDialogRef,
    setFocusView,
    setGuidedResumePhase,
  ])

  /**
   * Stale "Show changes": enable existing green highlighting, exit Focus,
   * and return to the normal app Input view (not Focus Input).
   */
  const handleFocusShowChanges = useCallback(() => {
    setShowStaleInputChanges(true)
    focusShellRef.current?.exitFullscreen()
    clearStoredFocusSessionResume()
    setFocusView(null)
    setFocusResultStepIndex(0)
    setFurthestReachedFocusPhase(null)
    setGuidedLandFocusPhase(null)
    setGuidedSemanticResume(null)
    setGuidedResumePhase(null)
    setGuidedResume(null)
    setGuidedInputKind(null)
  }, [
    clearStoredFocusSessionResume,
    focusShellRef,
    setFocusResultStepIndex,
    setFocusView,
    setFurthestReachedFocusPhase,
    setGuidedInputKind,
    setGuidedLandFocusPhase,
    setGuidedResume,
    setGuidedResumePhase,
    setGuidedSemanticResume,
    setShowStaleInputChanges,
  ])

  /** Next Steps: exit Focus to normal Input without enabling green highlighting. */
  const handleFocusReviewInput = useCallback(() => {
    focusShellRef.current?.exitFullscreen()
    clearStoredFocusSessionResume()
    setFocusView(null)
    setFocusResultStepIndex(0)
    setFurthestReachedFocusPhase(null)
    setGuidedLandFocusPhase(null)
    setGuidedSemanticResume(null)
    setGuidedResumePhase(null)
    setGuidedResume(null)
    setGuidedInputKind(null)
  }, [
    clearStoredFocusSessionResume,
    focusShellRef,
    setFocusResultStepIndex,
    setFocusView,
    setFurthestReachedFocusPhase,
    setGuidedInputKind,
    setGuidedLandFocusPhase,
    setGuidedResume,
    setGuidedResumePhase,
    setGuidedSemanticResume,
  ])

  useLayoutEffect(() => {
    // Keep the Focus content portal target for the whole Focus session
    // (Input and Results). Clearing it on Results caused Guided to briefly
    // remount as a standalone Focus overlay when returning to Input.
    if (focusView === null) {
      setFocusPortalTarget(null)
      return
    }
    const sync = () => {
      setFocusPortalTarget(focusShellRef.current?.getContentElement() ?? null)
    }
    sync()
    const id = window.requestAnimationFrame(sync)
    return () => window.cancelAnimationFrame(id)
  }, [focusView, guidedInputKind, focusShellRef, setFocusPortalTarget])

  useEffect(() => {
    if (!showStaleInputNotice) {
      setShowStaleInputChanges(false)
    }
  }, [showStaleInputNotice, setShowStaleInputChanges])

  const { focusResultSection, focusResultSteps } = useFocusResultSteps({
    guidedFocusState,
    hasViewableResults,
    isOngoingAnalysis,
    librarySession,
  })

  useFocusSessionResume({
    activeProjectId,
    analysisReadOnly,
    clearStoredFocusSessionResume,
    focusResultSection,
    focusResultSteps,
    guidedFocusState,
    hasViewableResults,
    isOngoingAnalysis,
    librarySession,
  })

  /** One Previous action for the whole Focus session (buttons + arrows). */
  const navigateFocusPrevious = useCallback(() => {
    if (focusView === "results") {
      const action = resolveFocusPrevious({
        focusView: "results",
        focusResultStepIndex,
      })
      if (action.kind === "enterInputFromResults") {
        backToFocusInput()
        return
      }
      if (action.kind === "resultStep") {
        setFocusResultStepIndex(action.index)
      }
      return
    }
    if (focusView === "input") {
      guidedDialogRef.current?.goPrevious()
    }
  }, [focusView, focusResultStepIndex, backToFocusInput, guidedDialogRef, setFocusResultStepIndex])

  /** One Next action for the whole Focus session (buttons + arrows). */
  const navigateFocusNext = useCallback(() => {
    if (focusView === "results") {
      const action = resolveFocusNext({
        focusView: "results",
        focusResultStepIndex,
        resultStepCount: focusResultSteps.length,
        canEnterResults: hasViewableResults,
      })
      if (action.kind === "resultStep") {
        setFocusResultStepIndex(action.index)
      }
      return
    }
    if (focusView === "input") {
      // Guided goNext / Simulation → Results via onContinueToResults.
      guidedDialogRef.current?.goNext()
    }
  }, [
    focusView,
    focusResultStepIndex,
    focusResultSteps.length,
    hasViewableResults,
    guidedDialogRef,
    setFocusResultStepIndex,
  ])

  return {
    activeCostCorrelationPrep,
    closeGuidedInput,
    continueFromSimulationToResults,
    currentFocusUserPhase,
    exitFocusMode,
    focusResultSection,
    focusResultSteps,
    handleCorrelationModeToggle,
    handleCorrelationPendingChange,
    handleCostCorrelationGroupApply,
    handleDefineModeToggle,
    handleFocusReviewInput,
    handleFocusShowChanges,
    handleGuidedLandFocusPhaseApplied,
    handleGuidedResumeApplied,
    handleGuidedSemanticResumeApplied,
    handleImpactModeToggle,
    handleOpenCorrelationSummary,
    handleRemoveCorrelationSummary,
    handleToggleCorrelationCost,
    handoffGuidedToAddCostItems,
    handoffGuidedToAddDrivers,
    handoffGuidedToCorrelation,
    handoffGuidedToImpact,
    impactSelectedDriverRow,
    navigateFocusNext,
    navigateFocusPrevious,
    navigateToFocusUserPhase,
    openFocusModePrimary,
    openFocusResults,
    openGuidedInput,
    returnToGuidedReview,
    savedCorrelationSummaries,
  }
}
