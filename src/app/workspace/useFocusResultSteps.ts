import { useMemo } from "react"
import { buildFocusResultSteps, type FocusResultSectionId } from "@/domain/guided/focusResultSteps"
import { appFeatures } from "@/config/appVariant"
import type { useGuidedFocusState } from "@/app/workspace/useGuidedFocusState"
import type { useLibraryAnalysisSession } from "@/features/analysis-library/useLibraryAnalysisSession"

type GuidedFocusState = ReturnType<typeof useGuidedFocusState>

/** The ordered Results steps of the Focus session and the section the current step maps to. */
export function useFocusResultSteps({
  guidedFocusState,
  hasViewableResults,
  isOngoingAnalysis,
  librarySession,
}: {
  guidedFocusState: GuidedFocusState
  hasViewableResults: boolean
  isOngoingAnalysis: boolean
  librarySession: ReturnType<typeof useLibraryAnalysisSession>
}) {
  const { focusResultStepIndex, focusView } = guidedFocusState

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
    [isOngoingAnalysis, librarySession.ongoing?.checkpoints],
  )

  const focusResultSection: FocusResultSectionId | null =
    focusView === "results" && hasViewableResults
      ? (focusResultSteps[
          Math.min(Math.max(0, focusResultStepIndex), Math.max(0, focusResultSteps.length - 1))
        ] ??
        focusResultSteps[0] ??
        null)
      : null

  return { focusResultSection, focusResultSteps }
}
