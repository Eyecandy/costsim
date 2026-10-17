import { beforeEach, describe, expect, it, vi } from "vitest"

import {
  loadSidebarPinned,
  saveSidebarPinned,
  SIDEBAR_UI_PREFERENCES_KEY,
} from "@/lib/sidebarUiPreferences"

describe("sidebarUiPreferences", () => {
  let store: Record<string, string>

  beforeEach(() => {
    store = {}
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => store[key] ?? null,
      setItem: (key: string, value: string) => {
        store[key] = value
      },
      removeItem: (key: string) => {
        delete store[key]
      },
    })
  })

  it("defaults to unpinned", () => {
    expect(loadSidebarPinned()).toBe(false)
  })

  it("persists pin preference locally", () => {
    saveSidebarPinned(true)
    expect(store[SIDEBAR_UI_PREFERENCES_KEY]).toBeTruthy()
    expect(loadSidebarPinned()).toBe(true)
    saveSidebarPinned(false)
    expect(loadSidebarPinned()).toBe(false)
  })
})
