/**
 * Analysis-name UX for Start Ongoing from archived Single.
 * Pure helpers so conflict/default-name behavior is unit-testable without React.
 */

import {
  hasAnalysisNameConflict,
  type AnalysisNameOccupant,
} from "@/lib/analysisNameUniqueness"

/** Default analysis name from the selected alternative (project) name. */
export function proposeStartOngoingAnalysisName(
  alternativeName: string,
  fallbackName = "",
): string {
  const fromAlt = alternativeName.trim()
  return (fromAlt || fallbackName.trim()).slice(0, 120)
}

export type StartOngoingNameState = {
  selectedProjectId: string | null
  name: string
  nameManuallyEdited: boolean
}

export function initStartOngoingNameState(
  alternatives: readonly { id: string; name: string }[],
): StartOngoingNameState {
  const first = alternatives[0]
  return {
    selectedProjectId: first?.id ?? null,
    name: first ? proposeStartOngoingAnalysisName(first.name) : "",
    nameManuallyEdited: false,
  }
}

/**
 * Selecting another alternative updates the proposed name only when the user
 * has not already edited the Analysis Name field.
 */
export function applyAlternativeSelection(
  state: StartOngoingNameState,
  nextId: string,
  alternatives: readonly { id: string; name: string }[],
): StartOngoingNameState {
  if (state.nameManuallyEdited) {
    return { ...state, selectedProjectId: nextId }
  }
  const alt = alternatives.find((a) => a.id === nextId)
  return {
    selectedProjectId: nextId,
    name: alt ? proposeStartOngoingAnalysisName(alt.name) : state.name,
    nameManuallyEdited: false,
  }
}

export function applyManualNameEdit(
  state: StartOngoingNameState,
  name: string,
): StartOngoingNameState {
  return { ...state, name, nameManuallyEdited: true }
}

export type StartOngoingSubmitBlock =
  | "empty_name"
  | "no_selection"
  | "duplicate_name"

export function validateStartOngoingSubmit(args: {
  name: string
  selectedProjectId: string | null
  folderId: string | null
  analyses: readonly AnalysisNameOccupant[]
}): "ok" | StartOngoingSubmitBlock {
  if (!args.selectedProjectId) return "no_selection"
  if (!args.name.trim()) return "empty_name"
  if (
    hasAnalysisNameConflict({
      name: args.name,
      folderId: args.folderId,
      analyses: args.analyses,
    })
  ) {
    return "duplicate_name"
  }
  return "ok"
}
