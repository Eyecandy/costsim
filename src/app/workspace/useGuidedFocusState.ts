import { useCallback, useRef, useState } from "react"
import type { GuidedInputDialogHandle } from "@/features/guided-input/GuidedInputDialog"
import type { FocusModeShellHandle } from "@/features/focus-mode/FocusModeShell"
import type { GuidedInputKind } from "@/domain/guided/guidedInput"
import type { GuidedResumeAfter, GuidedResumeState } from "@/domain/guided/guidedWorkflow"
import type { GuidedFocusChromeMeta } from "@/domain/guided/guidedFocusChrome"
import type { FocusUserPhase, FocusUserPhaseInput } from "@/domain/guided/focusPhaseNav"
import type { GuidedSemanticResume } from "@/persistence/focusSessionResume"

export function useGuidedFocusState() {
  const [impactModeActive, setImpactModeActive] = useState(false)
  const [impactSelectedDriverId, setImpactSelectedDriverId] = useState<
    string | null
  >(null)
  const [correlationModeActive, setCorrelationModeActive] = useState(false)
  const [defineModeActive, setDefineModeActive] = useState(false)
  const [defineSelectedRowId, setDefineSelectedRowId] = useState<string | null>(
    null,
  )
  const [guidedInputKind, setGuidedInputKind] = useState<GuidedInputKind | null>(
    null,
  )
  const [guidedInputStartIndex, setGuidedInputStartIndex] = useState(0)
  /**
   * Primary Focus entry lands on the Focus-mode intro; local Input shortcuts
   * keep their own starting phase (null).
   */
  const [guidedStartPhase, setGuidedStartPhase] = useState<"focusIntro" | null>(
    null,
  )
  /** UI-only pause/resume after Adjust correlation/impact (not persisted). */
  const [guidedResume, setGuidedResume] = useState<GuidedResumeState | null>(
    null,
  )
  /** Phase to land on when reopening Guided Input after a detour. */
  const [guidedResumePhase, setGuidedResumePhase] = useState<
    GuidedResumeAfter | null
  >(null)
  const [correlationSelectedCostIds, setCorrelationSelectedCostIds] = useState<
    string[]
  >([])
  const [correlationPendingRho, setCorrelationPendingRho] = useState(0)
  const [correlationPendingMixed, setCorrelationPendingMixed] = useState(false)
  const [correlationEditBlocked, setCorrelationEditBlocked] = useState(false)
  const [correlationSaveConfirmVisible, setCorrelationSaveConfirmVisible] =
    useState(false)
  const [correlationFeedbackKind, setCorrelationFeedbackKind] = useState<
    "saved" | "removed" | null
  >(null)
  const correlationSaveConfirmTimerRef = useRef<ReturnType<
    typeof setTimeout
  > | null>(null)
  const impactEditingAreaRef = useRef<HTMLDivElement>(null)
  /**
   * Presentation-only: when stale, optionally reveal existing green changed-field
   * highlighting. Never persisted; resets when stale notice clears.
   */
  const [showStaleInputChanges, setShowStaleInputChanges] = useState(false)
  /**
   * Presentation-only Focus surface: Guided Focus Input and/or Focus Results.
   * Never persisted.
   */
  const [focusView, setFocusView] = useState<"input" | "results" | null>(null)
  const focusViewRef = useRef<"input" | "results" | null>(null)
  focusViewRef.current = focusView
  /** Ephemeral Focus Results step index (not persisted). */
  const [focusResultStepIndex, setFocusResultStepIndex] = useState(0)
  /** Furthest Focus phase reached this session (navigation history only). */
  const [furthestReachedFocusPhase, setFurthestReachedFocusPhase] =
    useState<FocusUserPhase | null>(null)
  /** Phase-overview land target when (re)opening Guided Input. */
  const [guidedLandFocusPhase, setGuidedLandFocusPhase] =
    useState<FocusUserPhaseInput | null>(null)
  /** Session reload land: Guided phase + optional row id. */
  const [guidedSemanticResume, setGuidedSemanticResume] =
    useState<GuidedSemanticResume | null>(null)
  /** When Guided Simulation invokes Run, open Focus Results on success. */
  const pendingFocusResultsAfterGuidedRunRef = useRef(false)
  /** Ensures Focus sessionStorage restore runs once after library hydration. */
  const didAttemptFocusSessionResumeRef = useRef(false)
  const prevFocusViewForResumeClearRef = useRef<"input" | "results" | null>(
    null,
  )
  /** Stable Focus host — owns browser fullscreen across Input → Results. */
  const focusShellRef = useRef<FocusModeShellHandle | null>(null)
  /** Guided Input step navigation for the unified Focus session. */
  const guidedDialogRef = useRef<GuidedInputDialogHandle | null>(null)
  const [focusPortalTarget, setFocusPortalTarget] = useState<HTMLElement | null>(
    null,
  )
  const [guidedFocusChromeMeta, setGuidedFocusChromeMeta] =
    useState<GuidedFocusChromeMeta | null>(null)
  const handleGuidedFocusChromeMeta = useCallback(
    (meta: GuidedFocusChromeMeta | null) => {
      setGuidedFocusChromeMeta((prev) => {
        if (prev === meta) return prev
        if (prev == null || meta == null) return meta
        if (
          prev.title === meta.title &&
          prev.progressLabel === meta.progressLabel &&
          prev.projectName === meta.projectName &&
          prev.projectIndex === meta.projectIndex &&
          prev.workflowPhase === meta.workflowPhase &&
          prev.workflowRowId === meta.workflowRowId &&
          prev.helpTopic === meta.helpTopic &&
          prev.canGoPrevious === meta.canGoPrevious &&
          prev.canGoNext === meta.canGoNext &&
          prev.nextLabel === meta.nextLabel &&
          JSON.stringify(prev.secondaryFooter) ===
            JSON.stringify(meta.secondaryFooter)
        ) {
          return prev
        }
        return meta
      })
    },
    [],
  )

  return {
    correlationEditBlocked,
    correlationFeedbackKind,
    correlationModeActive,
    correlationPendingMixed,
    correlationPendingRho,
    correlationSaveConfirmTimerRef,
    correlationSaveConfirmVisible,
    correlationSelectedCostIds,
    defineModeActive,
    defineSelectedRowId,
    didAttemptFocusSessionResumeRef,
    focusPortalTarget,
    focusResultStepIndex,
    focusShellRef,
    focusView,
    focusViewRef,
    furthestReachedFocusPhase,
    guidedDialogRef,
    guidedFocusChromeMeta,
    guidedInputKind,
    guidedInputStartIndex,
    guidedLandFocusPhase,
    guidedResume,
    guidedResumePhase,
    guidedSemanticResume,
    guidedStartPhase,
    handleGuidedFocusChromeMeta,
    impactEditingAreaRef,
    impactModeActive,
    impactSelectedDriverId,
    pendingFocusResultsAfterGuidedRunRef,
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
    showStaleInputChanges,
  }
}
