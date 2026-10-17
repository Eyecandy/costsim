import { useCallback, useState } from "react"

import {
  DEFAULT_RESULT_PREFERENCES,
  addKeyFigurePercentile,
  addSCurvePercentile,
  cloneResultPreferences,
  normalizeResultPreferences,
  removeKeyFigurePercentile,
  removeSCurvePercentile,
  type ResultPreferencesV1,
} from "@/domain/results/resultPreferences"
import {
  loadResultPreferences,
  resetResultPreferences,
  saveResultPreferences,
} from "@/persistence/resultPreferencesStorage"

/**
 * Session draft vs persisted device default.
 * Panel edits update the draft immediately (live preview).
 * `saveAsDefault` writes through the storage adapter for future sessions.
 */
export function useResultPreferences() {
  const [preferences, setPreferences] = useState<ResultPreferencesV1>(() =>
    loadResultPreferences(),
  )

  const replacePreferences = useCallback((next: ResultPreferencesV1) => {
    setPreferences(normalizeResultPreferences(next))
  }, [])

  const patchPreferences = useCallback(
    (updater: (prev: ResultPreferencesV1) => ResultPreferencesV1) => {
      setPreferences((prev) => normalizeResultPreferences(updater(prev)))
    },
    [],
  )

  const saveAsDefault = useCallback(() => {
    saveResultPreferences(preferences)
  }, [preferences])

  const resetToDefaults = useCallback(() => {
    const defaults = cloneResultPreferences(DEFAULT_RESULT_PREFERENCES)
    setPreferences(defaults)
  }, [])

  const resetSavedAndCurrent = useCallback(() => {
    const defaults = resetResultPreferences()
    setPreferences(defaults)
  }, [])

  return {
    preferences,
    replacePreferences,
    patchPreferences,
    saveAsDefault,
    resetToDefaults,
    resetSavedAndCurrent,
    addKeyFigurePercentile: (p: number) =>
      patchPreferences((prev) => addKeyFigurePercentile(prev, p)),
    removeKeyFigurePercentile: (p: number) =>
      patchPreferences((prev) => removeKeyFigurePercentile(prev, p)),
    addSCurvePercentile: (p: number) =>
      patchPreferences((prev) => addSCurvePercentile(prev, p)),
    removeSCurvePercentile: (p: number) =>
      patchPreferences((prev) => removeSCurvePercentile(prev, p)),
  }
}
