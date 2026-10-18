import { useCallback, useEffect } from "react"
import type { useGuidedFocusState } from "@/app/workspace/useGuidedFocusState"

type GuidedFocusState = ReturnType<typeof useGuidedFocusState>

/** Toolbar toggles for Impact, Correlation and Define mode, plus the outside-click exit. */
export function useEditingModeToggles({
  clearCorrelationEditingState,
  clearCorrelationSaveConfirm,
  guidedFocusState,
}: {
  clearCorrelationEditingState: () => void
  clearCorrelationSaveConfirm: () => void
  guidedFocusState: GuidedFocusState
}) {
  const {
    correlationModeActive,
    defineModeActive,
    impactEditingAreaRef,
    impactModeActive,
    setCorrelationModeActive,
    setDefineModeActive,
    setDefineSelectedRowId,
    setGuidedInputKind,
    setGuidedResume,
    setGuidedResumePhase,
    setImpactModeActive,
    setImpactSelectedDriverId,
  } = guidedFocusState

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

  return { handleCorrelationModeToggle, handleDefineModeToggle, handleImpactModeToggle }
}
