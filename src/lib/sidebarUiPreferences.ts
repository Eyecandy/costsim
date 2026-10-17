/**
 * Device-only UI preference for Analysis sidebar pin state.
 * Not part of AnalysisDocument / share / archive.
 */

import { loadFromStorage, saveToStorage } from "@/lib/storage"

export const SIDEBAR_UI_PREFERENCES_KEY =
  "cost-simulator:v1:sidebarUiPreferences" as const

export type SidebarUiPreferences = {
  version: 1
  pinned: boolean
}

const DEFAULT: SidebarUiPreferences = {
  version: 1,
  pinned: false,
}

export function loadSidebarPinned(): boolean {
  const raw = loadFromStorage<unknown | null>(SIDEBAR_UI_PREFERENCES_KEY, null)
  if (
    raw &&
    typeof raw === "object" &&
    (raw as SidebarUiPreferences).version === 1 &&
    typeof (raw as SidebarUiPreferences).pinned === "boolean"
  ) {
    return (raw as SidebarUiPreferences).pinned
  }
  return DEFAULT.pinned
}

export function saveSidebarPinned(pinned: boolean): void {
  const next: SidebarUiPreferences = { version: 1, pinned }
  saveToStorage(SIDEBAR_UI_PREFERENCES_KEY, next)
}
