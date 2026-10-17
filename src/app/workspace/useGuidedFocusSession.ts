import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  type Dispatch,
  type SetStateAction,
} from "react"
import type { ProjectResult } from "@/domain/simulation/simulationTypes"
import {
  CORRELATION_SAVE_CONFIRM_MS,
  deriveSavedCorrelationSummaries,
} from "@/domain/simulation/costCorrelationSummaries"
import type { GuidedInputKind } from "@/domain/guided/guidedInput"
import { buildFocusResultSteps, type FocusResultSectionId } from "@/domain/guided/focusResultSteps"
import { resolveFocusNext, resolveFocusPrevious } from "@/domain/guided/focusSessionNavigation"
import {
  advanceFurthestFocusPhase,
  getFocusUserPhase,
  isFocusPhaseReached,
  type FocusUserPhase,
} from "@/domain/guided/focusPhaseNav"
import {
  clearFocusSessionResume,
  focusSessionResumeMatchesContext,
  readFocusSessionResume,
  resolveFocusResultStepIndexForResume,
  writeFocusSessionResume,
  type FocusSessionResumeV1,
} from "@/persistence/focusSessionResume"
import {
  patchProjectCostCorrelationGroup,
  isCostCorrelationGroupPatchValid,
  getSelectedGroupCorrelationState,
  type Project,
} from "@/domain/analysis/project"
import { parseCostForSimulation, parseDriverForSimulation } from "@/domain/results/tableRows"
import { appFeatures } from "@/config/appVariant"
import type { useGuidedFocusState } from "@/app/workspace/useGuidedFocusState"
import type { useLibraryAnalysisSession } from "@/features/analysis-library/useLibraryAnalysisSession"

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
  activeProject: Project
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
    correlationPendingMixed,
    correlationPendingRho,
    correlationSaveConfirmTimerRef,
    correlationSelectedCostIds,
    defineModeActive,
    didAttemptFocusSessionResumeRef,
    focusResultStepIndex,
    focusShellRef,
    focusView,
    furthestReachedFocusPhase,
    guidedDialogRef,
    guidedFocusChromeMeta,
    guidedInputKind,
    guidedResume,
    impactEditingAreaRef,
    impactModeActive,
    impactSelectedDriverId,
    prevFocusViewForResumeClearRef,
    setCorrelationEditBlocked,
    setCorrelationFeedbackKind,
    setCorrelationModeActive,
    setCorrelationPendingMixed,
    setCorrelationPendingRho,
    setCorrelationSaveConfirmVisible,
    setCorrelationSelectedCostIds,
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
    if (
      !impactModeActive ||
      !activeProject ||
      impactSelectedDriverId === null
    ) {
      return null
    }
    const index = activeProject.driverRows.findIndex(
      (r) => r.id === impactSelectedDriverId,
    )
    if (index < 0) return null
    const row = activeProject.driverRows[index]!
    if (parseDriverForSimulation(row) === null) return null
    return {
      row,
      label: row.name.trim() || `Driver ${index + 1}`,
    }
  }, [impactModeActive, activeProject, impactSelectedDriverId])

  const syncCorrelationPendingFromSelection = useCallback(
    (selectedIds: readonly string[], correlations: Project["costCorrelations"]) => {
      const state = getSelectedGroupCorrelationState(correlations, selectedIds)
      if (state.kind === "uniform") {
        setCorrelationPendingRho(state.value)
        setCorrelationPendingMixed(false)
      } else if (state.kind === "mixed") {
        setCorrelationPendingRho(0)
        setCorrelationPendingMixed(true)
      } else {
        setCorrelationPendingRho(0)
        setCorrelationPendingMixed(false)
      }
    },
    [setCorrelationPendingMixed, setCorrelationPendingRho],
  )

  const clearCorrelationSaveConfirm = useCallback(() => {
    if (correlationSaveConfirmTimerRef.current !== null) {
      clearTimeout(correlationSaveConfirmTimerRef.current)
      correlationSaveConfirmTimerRef.current = null
    }
    setCorrelationSaveConfirmVisible(false)
    setCorrelationFeedbackKind(null)
  }, [correlationSaveConfirmTimerRef, setCorrelationFeedbackKind, setCorrelationSaveConfirmVisible])

  const flashCorrelationFeedback = useCallback(
    (kind: "saved" | "removed") => {
      clearCorrelationSaveConfirm()
      setCorrelationFeedbackKind(kind)
      setCorrelationSaveConfirmVisible(true)
      correlationSaveConfirmTimerRef.current = setTimeout(() => {
        correlationSaveConfirmTimerRef.current = null
        setCorrelationSaveConfirmVisible(false)
        setCorrelationFeedbackKind(null)
      }, CORRELATION_SAVE_CONFIRM_MS)
    },
    [clearCorrelationSaveConfirm, correlationSaveConfirmTimerRef, setCorrelationFeedbackKind, setCorrelationSaveConfirmVisible],
  )

  const clearCorrelationEditingState = useCallback(() => {
    setCorrelationSelectedCostIds([])
    setCorrelationPendingRho(0)
    setCorrelationPendingMixed(false)
    setCorrelationEditBlocked(false)
  }, [setCorrelationEditBlocked, setCorrelationPendingMixed, setCorrelationPendingRho, setCorrelationSelectedCostIds])

  useEffect(() => {
    return () => {
      if (correlationSaveConfirmTimerRef.current !== null) {
        clearTimeout(correlationSaveConfirmTimerRef.current)
      }
    }
  }, [correlationSaveConfirmTimerRef])

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
  }, [
    correlationModeActive,
    clearCorrelationEditingState,
    clearCorrelationSaveConfirm,
  ])

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
  }, [clearStoredFocusSessionResume, setFocusView, setGuidedInputKind, setGuidedResume, setGuidedResumePhase, setGuidedSemanticResume, setGuidedStartPhase])

  const openGuidedInput = useCallback((
    kind: GuidedInputKind,
    startIndex = 0,
    options?: { startPhase?: "focusIntro" | null },
  ) => {
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
  }, [analysisReadOnly, clearCorrelationEditingState, clearCorrelationSaveConfirm, setCorrelationModeActive, setDefineModeActive, setDefineSelectedRowId, setFocusView, setGuidedInputKind, setGuidedInputStartIndex, setGuidedResume, setGuidedResumePhase, setGuidedStartPhase, setImpactModeActive, setImpactSelectedDriverId])

  /**
   * Primary Focus mode entry (INPUT column header). Starts at the Focus-mode
   * intro, ahead of Project profile and the rest of the guided sequence.
   */
  const openFocusModePrimary = useCallback(() => {
    if (analysisReadOnly) return
    openGuidedInput("cost", 0, { startPhase: "focusIntro" })
  }, [analysisReadOnly, openGuidedInput])

  /** Guided handoff: pause for Cost Items table editing; keep resume context. */
  const handoffGuidedToAddCostItems = useCallback(() => {
    if (!activeProject || !guidedInputKind) return
    setGuidedResume({
      after: "costItems",
      entry: guidedInputKind,
      projectId: activeProject.id,
    })
    setGuidedResumePhase(null)
    setGuidedInputKind(null)
    setFocusView((prev) => (prev === "input" ? null : prev))
    setImpactModeActive(false)
    setImpactSelectedDriverId(null)
    setDefineModeActive(false)
    setDefineSelectedRowId(null)
    clearCorrelationEditingState()
    clearCorrelationSaveConfirm()
    setCorrelationModeActive(false)
  }, [
    activeProject,
    guidedInputKind,
    clearCorrelationEditingState,
    clearCorrelationSaveConfirm,
    setCorrelationModeActive,
    setDefineModeActive,
    setDefineSelectedRowId,
    setFocusView,
    setGuidedInputKind,
    setGuidedResume,
    setGuidedResumePhase,
    setImpactModeActive,
    setImpactSelectedDriverId,
  ])

  /** Guided handoff: pause for Drivers table editing; keep resume context. */
  const handoffGuidedToAddDrivers = useCallback(() => {
    if (!activeProject || !guidedInputKind) return
    setGuidedResume({
      after: "drivers",
      entry: guidedInputKind,
      projectId: activeProject.id,
    })
    setGuidedResumePhase(null)
    setGuidedInputKind(null)
    setFocusView((prev) => (prev === "input" ? null : prev))
    setCorrelationModeActive(false)
    setDefineModeActive(false)
    setDefineSelectedRowId(null)
    clearCorrelationEditingState()
    clearCorrelationSaveConfirm()
    setImpactSelectedDriverId(null)
    setImpactModeActive(false)
  }, [
    activeProject,
    guidedInputKind,
    clearCorrelationEditingState,
    clearCorrelationSaveConfirm,
    setCorrelationModeActive,
    setDefineModeActive,
    setDefineSelectedRowId,
    setFocusView,
    setGuidedInputKind,
    setGuidedResume,
    setGuidedResumePhase,
    setImpactModeActive,
    setImpactSelectedDriverId,
  ])

  /** Guided handoff: pause for Correlation editing; keep resume context. */
  const handoffGuidedToCorrelation = useCallback(() => {
    if (!activeProject || !guidedInputKind) return
    setGuidedResume({
      after: "correlation",
      entry: guidedInputKind,
      projectId: activeProject.id,
    })
    setGuidedResumePhase(null)
    setGuidedInputKind(null)
    setFocusView((prev) => (prev === "input" ? null : prev))
    setImpactModeActive(false)
    setImpactSelectedDriverId(null)
    setDefineModeActive(false)
    setDefineSelectedRowId(null)
    clearCorrelationEditingState()
    clearCorrelationSaveConfirm()
    setCorrelationModeActive(true)
  }, [
    activeProject,
    guidedInputKind,
    clearCorrelationEditingState,
    clearCorrelationSaveConfirm,
    setCorrelationModeActive,
    setDefineModeActive,
    setDefineSelectedRowId,
    setFocusView,
    setGuidedInputKind,
    setGuidedResume,
    setGuidedResumePhase,
    setImpactModeActive,
    setImpactSelectedDriverId,
  ])

  /** Guided handoff: pause for Driver Impact editing; keep resume context. */
  const handoffGuidedToImpact = useCallback(() => {
    if (!activeProject || !guidedInputKind) return
    setGuidedResume({
      after: "impact",
      entry: guidedInputKind,
      projectId: activeProject.id,
    })
    setGuidedResumePhase(null)
    setGuidedInputKind(null)
    setFocusView((prev) => (prev === "input" ? null : prev))
    setCorrelationModeActive(false)
    setDefineModeActive(false)
    setDefineSelectedRowId(null)
    clearCorrelationEditingState()
    clearCorrelationSaveConfirm()
    setImpactSelectedDriverId(null)
    setImpactModeActive(true)
  }, [
    activeProject,
    guidedInputKind,
    clearCorrelationEditingState,
    clearCorrelationSaveConfirm,
    setCorrelationModeActive,
    setDefineModeActive,
    setDefineSelectedRowId,
    setFocusView,
    setGuidedInputKind,
    setGuidedResume,
    setGuidedResumePhase,
    setImpactModeActive,
    setImpactSelectedDriverId,
  ])

  /** Explicit return from Correlation/Impact detour into Guided Input. */
  const returnToGuidedReview = useCallback(() => {
    if (!guidedResume || !activeProjectId) {
      setGuidedResume(null)
      return
    }
    if (guidedResume.projectId !== activeProjectId) {
      setGuidedResume(null)
      return
    }
    const { after, entry } = guidedResume
    setCorrelationModeActive(false)
    setImpactModeActive(false)
    setImpactSelectedDriverId(null)
    setDefineModeActive(false)
    setDefineSelectedRowId(null)
    clearCorrelationEditingState()
    clearCorrelationSaveConfirm()
    // Keep guidedResume until Guided Input has applied the target step, then
    // clear via onResumeApplied. Clearing phase too early resets to page 1.
    setGuidedResumePhase(after)
    setGuidedInputStartIndex(0)
    setGuidedInputKind(entry)
    // Resume into shared Focus Input chrome (lightweight footer), not the
    // standalone Guided modal.
    setFocusView("input")
  }, [
    guidedResume,
    activeProjectId,
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
    setImpactModeActive,
    setImpactSelectedDriverId,
  ])

  const handleGuidedResumeApplied = useCallback(() => {
    setGuidedResume(null)
    setGuidedResumePhase(null)
  }, [setGuidedResume, setGuidedResumePhase])

  const handleGuidedLandFocusPhaseApplied = useCallback(() => {
    setGuidedLandFocusPhase(null)
  }, [setGuidedLandFocusPhase])

  const handleGuidedSemanticResumeApplied = useCallback(() => {
    setGuidedSemanticResume(null)
  }, [setGuidedSemanticResume])

  const handleImpactModeToggle = () => {
    // Allowed when archived for inspection; mutation handlers stay guarded.
    setImpactModeActive((prev) => {
      const next = !prev
      if (next) {
        // Direct toolbar open — not a guided detour.
        setGuidedResume(null)
        setGuidedResumePhase(null)
        setCorrelationModeActive(false)
        setDefineModeActive(false)
        setDefineSelectedRowId(null)
        setGuidedInputKind(null)
        clearCorrelationEditingState()
        clearCorrelationSaveConfirm()
      } else {
        setImpactSelectedDriverId(null)
        // Closing Impact via toolbar abandons impact resume.
        setGuidedResume((r) => (r?.after === "impact" ? null : r))
      }
      return next
    })
  }

  const handleCorrelationModeToggle = () => {
    // Allowed when archived for inspection; mutation handlers stay guarded.
    setCorrelationModeActive((prev) => {
      const next = !prev
      if (next) {
        // Direct toolbar open — not a guided detour.
        setGuidedResume(null)
        setGuidedResumePhase(null)
        setImpactModeActive(false)
        setImpactSelectedDriverId(null)
        setDefineModeActive(false)
        setDefineSelectedRowId(null)
        setGuidedInputKind(null)
        clearCorrelationEditingState()
        clearCorrelationSaveConfirm()
      } else {
        clearCorrelationEditingState()
        clearCorrelationSaveConfirm()
        // Closing Correlation via toolbar abandons correlation resume.
        setGuidedResume((r) => (r?.after === "correlation" ? null : r))
      }
      return next
    })
  }

  const handleDefineModeToggle = () => {
    // Allowed when archived for inspection; save path stays guarded.
    setDefineModeActive((prev) => {
      const next = !prev
      if (next) {
        setGuidedResume(null)
        setGuidedResumePhase(null)
        setImpactModeActive(false)
        setImpactSelectedDriverId(null)
        setCorrelationModeActive(false)
        setGuidedInputKind(null)
        clearCorrelationEditingState()
        clearCorrelationSaveConfirm()
      } else {
        setDefineSelectedRowId(null)
      }
      return next
    })
  }

  /** Outside-click exit for Impact, Correlation, and Define (does not abandon guided resume). */
  const deactivateEditingModes = useCallback(() => {
    setImpactModeActive(false)
    setCorrelationModeActive(false)
    setDefineModeActive(false)
  }, [setCorrelationModeActive, setDefineModeActive, setImpactModeActive])

  useEffect(() => {
    if (!impactModeActive && !correlationModeActive && !defineModeActive) return
    const onDocMouseDown = (event: MouseEvent) => {
      const target = event.target
      if (!(target instanceof Node)) return
      if (impactEditingAreaRef.current?.contains(target)) return
      const portal = document.getElementById("portal")
      if (portal?.contains(target)) return
      deactivateEditingModes()
    }
    document.addEventListener("mousedown", onDocMouseDown)
    return () => document.removeEventListener("mousedown", onDocMouseDown)
  }, [
    impactModeActive,
    correlationModeActive,
    defineModeActive,
    deactivateEditingModes,
    impactEditingAreaRef,
  ])

  const validSimCostRows = useMemo(() => {
    if (!activeProject) return []
    return activeProject.costRows.filter(
      (row) => parseCostForSimulation(row) !== null,
    )
  }, [activeProject])

  useEffect(() => {
    if (!correlationModeActive || !activeProject) return
    const validIds = new Set(
      activeProject.costRows
        .filter((row) => parseCostForSimulation(row) !== null)
        .map((row) => row.id),
    )
    setCorrelationSelectedCostIds((prev) => {
      const next = prev.filter((id) => validIds.has(id))
      if (next.length === prev.length && next.every((id, i) => id === prev[i])) {
        return prev
      }
      syncCorrelationPendingFromSelection(next, activeProject.costCorrelations)
      return next
    })
  }, [
    correlationModeActive,
    activeProject,
    syncCorrelationPendingFromSelection,
    setCorrelationSelectedCostIds,
  ])

  const handleToggleCorrelationCost = useCallback(
    (costRowId: string) => {
      if (!correlationModeActive || !activeProject) return
      if (
        activeProject.costRows.find((r) => r.id === costRowId) === undefined
      ) {
        return
      }
      if (
        parseCostForSimulation(
          activeProject.costRows.find((r) => r.id === costRowId)!,
        ) === null
      ) {
        return
      }
      setCorrelationSelectedCostIds((prev) => {
        const next = prev.includes(costRowId)
          ? prev.filter((id) => id !== costRowId)
          : [...prev, costRowId]
        syncCorrelationPendingFromSelection(
          next,
          activeProject.costCorrelations,
        )
        setCorrelationEditBlocked(false)
        return next
      })
    },
    [
      correlationModeActive,
      activeProject,
      syncCorrelationPendingFromSelection,
      setCorrelationEditBlocked,
      setCorrelationSelectedCostIds,
    ],
  )

  const handleCorrelationPendingChange = useCallback((value: number) => {
    setCorrelationPendingRho(value)
    setCorrelationPendingMixed(false)
    setCorrelationEditBlocked(false)
  }, [setCorrelationEditBlocked, setCorrelationPendingMixed, setCorrelationPendingRho])

  const handleOpenCorrelationSummary = useCallback(
    (rowIds: readonly string[]) => {
      if (!correlationModeActive || !activeProject) return
      const validIds = new Set(
        activeProject.costRows
          .filter((row) => parseCostForSimulation(row) !== null)
          .map((row) => row.id),
      )
      const next = rowIds.filter((id) => validIds.has(id))
      if (next.length < 2) return
      setCorrelationSelectedCostIds(next)
      syncCorrelationPendingFromSelection(next, activeProject.costCorrelations)
      setCorrelationEditBlocked(false)
      clearCorrelationSaveConfirm()
    },
    [
      correlationModeActive,
      activeProject,
      syncCorrelationPendingFromSelection,
      clearCorrelationSaveConfirm,
      setCorrelationEditBlocked,
      setCorrelationSelectedCostIds,
    ],
  )

  const handleRemoveCorrelationSummary = useCallback(
    (rowIds: readonly string[]) => {
      if (analysisReadOnly) return
      if (!correlationModeActive || !activeProject) return
      if (rowIds.length < 2) return
      if (
        !isCostCorrelationGroupPatchValid(
          validSimCostRows,
          activeProject.costCorrelations,
          rowIds,
          "0",
        )
      ) {
        setCorrelationEditBlocked(true)
        return
      }
      setCorrelationEditBlocked(false)
      setProjects((prev) =>
        patchProjectCostCorrelationGroup(
          prev,
          activeProject.id,
          rowIds,
          "0",
        ),
      )
      clearCorrelationEditingState()
      flashCorrelationFeedback("removed")
    },
    [
      analysisReadOnly,
      correlationModeActive,
      activeProject,
      validSimCostRows,
      clearCorrelationEditingState,
      flashCorrelationFeedback,
      setCorrelationEditBlocked,
      setProjects,
    ],
  )

  const handleCostCorrelationGroupApply = useCallback(() => {
    if (analysisReadOnly) return
    if (!activeProject) return
    if (correlationSelectedCostIds.length < 2) return
    if (correlationPendingMixed) return
    const raw = String(correlationPendingRho)
    if (
      !isCostCorrelationGroupPatchValid(
        validSimCostRows,
        activeProject.costCorrelations,
        correlationSelectedCostIds,
        raw,
      )
    ) {
      setCorrelationEditBlocked(true)
      return
    }
    setCorrelationEditBlocked(false)
    setProjects((prev) =>
      patchProjectCostCorrelationGroup(
        prev,
        activeProject.id,
        correlationSelectedCostIds,
        raw,
      ),
    )
    clearCorrelationEditingState()
    flashCorrelationFeedback("saved")
  }, [
    analysisReadOnly,
    activeProject,
    correlationSelectedCostIds,
    correlationPendingRho,
    correlationPendingMixed,
    validSimCostRows,
    clearCorrelationEditingState,
    flashCorrelationFeedback,
    setCorrelationEditBlocked,
    setProjects,
  ])

  const savedCorrelationSummaries = useMemo(() => {
    if (!correlationModeActive || !activeProject) return []
    return deriveSavedCorrelationSummaries(
      validSimCostRows,
      activeProject.costCorrelations,
    )
  }, [correlationModeActive, activeProject, validSimCostRows])

  const activeCostCorrelationPrep = useMemo(() => {
    if (!activeProject) return undefined
    return projectResults.find((r) => r.projectId === activeProject.id)
      ?.costCorrelationPrep
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
    setFurthestReachedFocusPhase((prev) =>
      advanceFurthestFocusPhase(prev, currentFocusUserPhase),
    )
  }, [focusView, currentFocusUserPhase, setFurthestReachedFocusPhase, setGuidedLandFocusPhase])

  const navigateToFocusUserPhase = useCallback(
    (phase: FocusUserPhase) => {
      const allowed =
        isFocusPhaseReached(phase, furthestReachedFocusPhase) ||
        phase === currentFocusUserPhase
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
  }, [clearStoredFocusSessionResume, focusShellRef, setFocusResultStepIndex, setFocusView, setFurthestReachedFocusPhase, setGuidedInputKind, setGuidedLandFocusPhase, setGuidedResume, setGuidedResumePhase, setGuidedSemanticResume])

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
  }, [guidedInputKind, analysisReadOnly, openGuidedInput, guidedDialogRef, setFocusView, setGuidedResumePhase])

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
  }, [clearStoredFocusSessionResume, focusShellRef, setFocusResultStepIndex, setFocusView, setFurthestReachedFocusPhase, setGuidedInputKind, setGuidedLandFocusPhase, setGuidedResume, setGuidedResumePhase, setGuidedSemanticResume, setShowStaleInputChanges])

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
  }, [clearStoredFocusSessionResume, focusShellRef, setFocusResultStepIndex, setFocusView, setFurthestReachedFocusPhase, setGuidedInputKind, setGuidedLandFocusPhase, setGuidedResume, setGuidedResumePhase, setGuidedSemanticResume])

  useLayoutEffect(() => {
    // Keep the Focus content portal target for the whole Focus session
    // (Input and Results). Clearing it on Results caused Guided to briefly
    // remount as a standalone Focus overlay when returning to Input.
    if (focusView === null) {
      setFocusPortalTarget(null)
      return
    }
    const sync = () => {
      setFocusPortalTarget(
        focusShellRef.current?.getContentElement() ?? null,
      )
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

  /** Stable identity for Ongoing comparison / Development tip — not prefs/UI. */
  const focusResultSteps = useMemo(
    () =>
      buildFocusResultSteps({
        includeDevelopment: Boolean(
          isOngoingAnalysis &&
            librarySession.ongoing?.checkpoints &&
            librarySession.ongoing.checkpoints.length > 0,
        ),
        includeContribution: appFeatures.showExpectedAddition,
      }),
    [
      isOngoingAnalysis,
      librarySession.ongoing?.checkpoints,
    ],
  )

  const focusResultSection: FocusResultSectionId | null =
    focusView === "results" && hasViewableResults
      ? (focusResultSteps[
          Math.min(
            Math.max(0, focusResultStepIndex),
            Math.max(0, focusResultSteps.length - 1),
          )
        ] ?? focusResultSteps[0] ?? null)
      : null

  // Clear sessionStorage when Focus fully exits (not Input ↔ Results).
  useEffect(() => {
    const prev = prevFocusViewForResumeClearRef.current
    prevFocusViewForResumeClearRef.current = focusView
    if (prev !== null && focusView === null) {
      clearStoredFocusSessionResume()
    }
  }, [focusView, clearStoredFocusSessionResume, prevFocusViewForResumeClearRef])

  // Persist semantic Focus location for same-tab reload resume.
  useEffect(() => {
    if (!librarySession.ready) return
    const analysisId = librarySession.analysisId
    if (!analysisId || focusView === null) return
    if (!activeProjectId) return

    const checkpointId = isOngoingAnalysis
      ? (librarySession.activeCheckpoint?.id ?? null)
      : null

    const base: FocusSessionResumeV1 = {
      v: 1,
      analysisId,
      projectId: activeProjectId,
      checkpointId,
      focusView,
      ...(furthestReachedFocusPhase
        ? { furthestReachedPhase: furthestReachedFocusPhase }
        : {}),
    }

    if (focusView === "input") {
      const phase = guidedFocusChromeMeta?.workflowPhase
      if (!phase) return
      writeFocusSessionResume({
        ...base,
        guidedPhase: phase,
        ...(guidedFocusChromeMeta.workflowRowId
          ? { guidedRowId: guidedFocusChromeMeta.workflowRowId }
          : {}),
      })
      return
    }

    if (focusView === "results" && focusResultSection) {
      writeFocusSessionResume({
        ...base,
        resultSectionId: focusResultSection,
      })
    }
  }, [
    librarySession.ready,
    librarySession.analysisId,
    librarySession.activeCheckpoint?.id,
    isOngoingAnalysis,
    focusView,
    activeProjectId,
    furthestReachedFocusPhase,
    guidedFocusChromeMeta?.workflowPhase,
    guidedFocusChromeMeta?.workflowRowId,
    focusResultSection,
  ])

  // Restore Focus after library hydration (once per page load).
  useEffect(() => {
    if (!librarySession.ready) return
    if (didAttemptFocusSessionResumeRef.current) return
    didAttemptFocusSessionResumeRef.current = true

    const analysisId = librarySession.analysisId
    if (!analysisId || !activeProjectId) return

    const stored = readFocusSessionResume(analysisId)
    if (!stored) return

    const checkpointId = isOngoingAnalysis
      ? (librarySession.activeCheckpoint?.id ?? null)
      : null
    if (
      !focusSessionResumeMatchesContext(stored, {
        analysisId,
        projectId: activeProjectId,
        checkpointId,
        isOngoing: isOngoingAnalysis,
      })
    ) {
      clearFocusSessionResume(analysisId)
      return
    }

    if (stored.furthestReachedPhase) {
      setFurthestReachedFocusPhase(stored.furthestReachedPhase)
    }

    let view = stored.focusView
    let guidedPhase = stored.guidedPhase
    let guidedRowId = stored.guidedRowId

    if (view === "results" && !hasViewableResults) {
      view = "input"
      guidedPhase = "simulation"
      guidedRowId = undefined
    }

    if (view === "results") {
      setFocusResultStepIndex(
        resolveFocusResultStepIndexForResume(
          focusResultSteps,
          stored.resultSectionId,
        ),
      )
      setFocusView("results")
      return
    }

    if (analysisReadOnly) {
      clearFocusSessionResume(analysisId)
      return
    }

    setGuidedSemanticResume(
      guidedPhase
        ? {
            phase: guidedPhase,
            ...(guidedRowId ? { rowId: guidedRowId } : {}),
          }
        : { phase: "assumptions" },
    )
    setGuidedStartPhase(guidedPhase === "focusIntro" ? "focusIntro" : null)
    setGuidedInputStartIndex(0)
    setGuidedInputKind("cost")
    setFocusView("input")
  }, [
    librarySession.ready,
    librarySession.analysisId,
    librarySession.activeCheckpoint?.id,
    isOngoingAnalysis,
    activeProjectId,
    hasViewableResults,
    analysisReadOnly,
    focusResultSteps,
    didAttemptFocusSessionResumeRef,
    setFocusResultStepIndex,
    setFocusView,
    setFurthestReachedFocusPhase,
    setGuidedInputKind,
    setGuidedInputStartIndex,
    setGuidedSemanticResume,
    setGuidedStartPhase,
  ])

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
