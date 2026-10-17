import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { join } from "node:path"

import {
  canRequestFullscreen,
  getFullscreenElement,
  isElementFullscreen,
} from "@/persistence/browserFullscreen"
import { repoRoot as root } from "@/test-utils/repoRoot"


describe("browserFullscreen helpers", () => {
  it("exports safe no-document fallbacks", () => {
    // In jsdom/vitest, document exists but typically no fullscreen element.
    expect(getFullscreenElement()).toBeNull()
    expect(isElementFullscreen(null)).toBe(false)
    expect(canRequestFullscreen(null)).toBe(false)
  })

  it("Guided Focus mode requests fullscreen from the user gesture", () => {
    const dialog = readFileSync(
      join(root, "src/features/guided-input/GuidedInputDialog.tsx"),
      "utf8",
    )
    expect(dialog).toContain("requestElementFullscreen")
    expect(dialog).toContain("exitFullscreenIfNeeded")
    expect(dialog).toContain("subscribeFullscreenChange")
    expect(dialog).toContain("enterFocusMode")
    expect(dialog).toContain("focusRootRef")
    // Escape while browser fullscreen keeps in-app Focus.
    // Prefer shared Focus host when embedded; fall back to Guided's own root.
    expect(dialog).toContain("focusPortalTarget?.closest")
    expect(dialog).toContain(
      "isElementFullscreen(host instanceof Element ? host : null)",
    )
    expect(dialog).toMatch(
      /isElementFullscreen\(host instanceof Element \? host : null\)[\s\S]*?return/,
    )
  })

  it("Focus Results shell reuses the same fullscreen helpers", () => {
    const shell = readFileSync(
      join(root, "src/features/focus-mode/FocusModeShell.tsx"),
      "utf8",
    )
    expect(shell).toContain("requestElementFullscreen")
    expect(shell).toContain("exitFullscreenIfNeeded")
    expect(shell).toContain("subscribeFullscreenChange")
    expect(shell).toContain('data-focus-mode-fullscreen-toggle=""')
    expect(shell).toMatch(
      /isElementFullscreen\(focusRootRef\.current\)[\s\S]*?return/,
    )
  })
})
