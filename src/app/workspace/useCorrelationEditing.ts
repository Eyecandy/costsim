import { useCallback, useEffect } from "react"
import { CORRELATION_SAVE_CONFIRM_MS } from "@/domain/simulation/costCorrelationSummaries"
import { getSelectedGroupCorrelationState, type Project } from "@/domain/analysis/project"
import type { useGuidedFocusState } from "@/app/workspace/useGuidedFocusState"

type GuidedFocusState = ReturnType<typeof useGuidedFocusState>

/** Pending-rho/selection helpers and the saved/removed flash timer for Correlation mode. */
export function useCorrelationEditing({
  guidedFocusState,
}: {
  guidedFocusState: GuidedFocusState
}) {
  const {
    correlationSaveConfirmTimerRef,
    setCorrelationEditBlocked,
    setCorrelationFeedbackKind,
    setCorrelationPendingMixed,
    setCorrelationPendingRho,
    setCorrelationSaveConfirmVisible,
    setCorrelationSelectedCostIds,
  } = guidedFocusState

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
    [
      clearCorrelationSaveConfirm,
      correlationSaveConfirmTimerRef,
      setCorrelationFeedbackKind,
      setCorrelationSaveConfirmVisible,
    ],
  )

  const clearCorrelationEditingState = useCallback(() => {
    setCorrelationSelectedCostIds([])
    setCorrelationPendingRho(0)
    setCorrelationPendingMixed(false)
    setCorrelationEditBlocked(false)
  }, [
    setCorrelationEditBlocked,
    setCorrelationPendingMixed,
    setCorrelationPendingRho,
    setCorrelationSelectedCostIds,
  ])

  useEffect(() => {
    return () => {
      if (correlationSaveConfirmTimerRef.current !== null) {
        clearTimeout(correlationSaveConfirmTimerRef.current)
      }
    }
  }, [correlationSaveConfirmTimerRef])

  return {
    clearCorrelationEditingState,
    clearCorrelationSaveConfirm,
    flashCorrelationFeedback,
    syncCorrelationPendingFromSelection,
  }
}
