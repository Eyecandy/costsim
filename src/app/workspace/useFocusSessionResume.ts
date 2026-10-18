import { useEffect } from "react"
import type { FocusResultSectionId } from "@/domain/guided/focusResultSteps"
import {
  clearFocusSessionResume,
  focusSessionResumeMatchesContext,
  readFocusSessionResume,
  resolveFocusResultStepIndexForResume,
  writeFocusSessionResume,
  type FocusSessionResumeV1,
} from "@/persistence/focusSessionResume"
import type { useGuidedFocusState } from "@/app/workspace/useGuidedFocusState"
import type { useLibraryAnalysisSession } from "@/features/analysis-library/useLibraryAnalysisSession"
import type { buildFocusResultSteps } from "@/domain/guided/focusResultSteps"

type GuidedFocusState = ReturnType<typeof useGuidedFocusState>

/** Clears, persists and restores the semantic Focus location for same-tab reload resume. */
export function useFocusSessionResume({
  activeProjectId,
  analysisReadOnly,
  clearStoredFocusSessionResume,
  focusResultSection,
  focusResultSteps,
  guidedFocusState,
  hasViewableResults,
  isOngoingAnalysis,
  librarySession,
}: {
  activeProjectId: string
  analysisReadOnly: boolean
  clearStoredFocusSessionResume: () => void
  focusResultSection: FocusResultSectionId | null
  focusResultSteps: ReturnType<typeof buildFocusResultSteps>
  guidedFocusState: GuidedFocusState
  hasViewableResults: boolean
  isOngoingAnalysis: boolean
  librarySession: ReturnType<typeof useLibraryAnalysisSession>
}) {
  const {
    didAttemptFocusSessionResumeRef,
    focusView,
    furthestReachedFocusPhase,
    guidedFocusChromeMeta,
    prevFocusViewForResumeClearRef,
    setFocusResultStepIndex,
    setFocusView,
    setFurthestReachedFocusPhase,
    setGuidedInputKind,
    setGuidedInputStartIndex,
    setGuidedSemanticResume,
    setGuidedStartPhase,
  } = guidedFocusState

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

    const checkpointId = isOngoingAnalysis ? (librarySession.activeCheckpoint?.id ?? null) : null

    const base: FocusSessionResumeV1 = {
      v: 1,
      analysisId,
      projectId: activeProjectId,
      checkpointId,
      focusView,
      ...(furthestReachedFocusPhase ? { furthestReachedPhase: furthestReachedFocusPhase } : {}),
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

    const checkpointId = isOngoingAnalysis ? (librarySession.activeCheckpoint?.id ?? null) : null
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
        resolveFocusResultStepIndexForResume(focusResultSteps, stored.resultSectionId),
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

  return {}
}
