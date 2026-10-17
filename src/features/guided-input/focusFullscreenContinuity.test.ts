import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { join } from "node:path"

import { brandPrimaryButtonClass, brandPrimaryTextClass } from "@/shared/brand"
import { repoRoot as root } from "@/test-utils/repoRoot"
import { readAppSource } from "@/test-utils/appSource"

function readSrc(rel: string) {
  return readFileSync(join(root, rel), "utf8")
}

describe("Focus presentation / fullscreen continuity", () => {
  it("A: Focus Simulation run uses shared brand primary button token", () => {
    const guided = readSrc("src/features/guided-input/GuidedInputDialog.tsx")
    const app = readAppSource()
    const brand = readSrc("src/shared/brand.ts")
    expect(brand).toContain("brandPrimaryButtonClass")
    expect(brandPrimaryButtonClass).toContain("bg-[#1d868c]")
    expect(guided).toContain("brandPrimaryButtonClass")
    expect(app).toContain("brandPrimaryButtonClass")
    expect(guided).toContain("data-guided-simulation-run")
    // No Focus-only hardcoded fill beside the shared token.
    expect(guided).not.toMatch(/data-guided-simulation-run[\s\S]{0,400}bg-\[#1d868c\]/)
    expect(brandPrimaryTextClass).toContain("text-[#1d868c]")
  })

  it("B/C: Guided fullscreen icon follows browserFullscreen, not focusMode", () => {
    const guided = readSrc("src/features/guided-input/GuidedInputDialog.tsx")
    const toggleStart = guided.lastIndexOf("ref={focusToggleRef}")
    const toggle = guided.slice(toggleStart, guided.indexOf("data-guided-input-close", toggleStart))
    expect(toggle).toContain("browserFullscreen")
    expect(toggle).toContain("Minimize2")
    expect(toggle).toContain("Maximize2")
    expect(toggle).toContain("aria-pressed={browserFullscreen}")
    expect(toggle).not.toContain("aria-pressed={focusMode}")
    expect(toggle).toContain("onRequestFocusFullscreen")
    expect(toggle).toContain("onExitFocusFullscreen")
    // Icon branch is fullscreen-driven, not focusMode-driven.
    expect(toggle).toContain("{browserFullscreen ? (")
    expect(toggle).not.toContain("{focusMode ? (")
  })

  it("D/E: Shell fullscreen toggle also uses real browserFullscreen", () => {
    const shell = readSrc("src/features/focus-mode/FocusModeShell.tsx")
    expect(shell).toContain("aria-pressed={browserFullscreen}")
    expect(shell).toContain("isElementFullscreen(focusRootRef.current)")
    expect(shell).toContain("data-focus-mode-fullscreen-toggle")
    expect(shell).toContain("Minimize2")
    expect(shell).toContain("Maximize2")
  })

  it("G/H: Focus portal target stays for whole session (no Results→Input remount flash)", () => {
    const app = readAppSource()
    expect(app).toContain("Keep the Focus content portal target for the whole Focus session")
    expect(app).toContain("focusView === null")
    expect(app).toContain("focusView !== null ? focusPortalTarget : null")
    expect(app).not.toContain('focusView === "input" ? focusPortalTarget : null')
    expect(app).not.toContain('if (focusView !== "input")')
  })
})
