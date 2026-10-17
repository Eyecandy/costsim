/**
 * Result Preferences persistence adapter (MVP: localStorage).
 *
 * Consumers should use these functions only — not localStorage directly —
 * so a future user/org backend can replace this module without rewriting
 * Key Figures / S-curve UI.
 */
import { loadFromStorage, saveToStorage } from "@/persistence/storage"
import {
  DEFAULT_RESULT_PREFERENCES,
  normalizeResultPreferences,
  type ResultPreferencesV1,
  cloneResultPreferences,
} from "@/domain/results/resultPreferences"

/** Versioned storage key — local device default only (not project/share data). */
export const RESULT_PREFERENCES_STORAGE_KEY =
  "cost-simulator:v1:resultPreferences" as const

export function loadResultPreferences(): ResultPreferencesV1 {
  const raw = loadFromStorage<unknown | null>(
    RESULT_PREFERENCES_STORAGE_KEY,
    null,
  )
  if (raw === null) {
    return cloneResultPreferences(DEFAULT_RESULT_PREFERENCES)
  }
  return normalizeResultPreferences(raw)
}

export function saveResultPreferences(
  preferences: ResultPreferencesV1,
): void {
  const normalized = normalizeResultPreferences(preferences)
  saveToStorage(RESULT_PREFERENCES_STORAGE_KEY, normalized)
}

export function resetResultPreferences(): ResultPreferencesV1 {
  const defaults = cloneResultPreferences(DEFAULT_RESULT_PREFERENCES)
  saveToStorage(RESULT_PREFERENCES_STORAGE_KEY, defaults)
  return defaults
}
