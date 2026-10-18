import { useCallback } from "react"
import type { Project } from "@/domain/analysis/project"
import type { useGuidedFocusState } from "@/app/workspace/useGuidedFocusState"

type GuidedFocusState = ReturnType<typeof useGuidedFocusState>

/** Pause Guided Input for a table/mode detour and return to it, keeping resume context. */
export function useGuidedHandoff({
  activeProject,
  activeProjectId,
  clearCorrelationEditingState,
  clearCorrelationSaveConfirm,
  guidedFocusState,
}: {
  activeProject: Project | null
  activeProjectId: string
  clearCorrelationEditingState: () => void
  clearCorrelationSaveConfirm: () => void
  guidedFocusState: GuidedFocusState
}) {
  const {
    guidedInputKind,
    guidedResume,
    setCorrelationModeActive,
    setDefineModeActive,
    setDefineSelectedRowId,
    setFocusView,
    setGuidedInputKind,
    setGuidedInputStartIndex,
    setGuidedLandFocusPhase,
    setGuidedResume,
    setGuidedResumePhase,
    setGuidedSemanticResume,
    setImpactModeActive,
    setImpactSelectedDriverId,
  } = guidedFocusState

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

  return {
    handleGuidedLandFocusPhaseApplied,
    handleGuidedResumeApplied,
    handleGuidedSemanticResumeApplied,
    handoffGuidedToAddCostItems,
    handoffGuidedToAddDrivers,
    handoffGuidedToCorrelation,
    handoffGuidedToImpact,
    returnToGuidedReview,
  }
}
