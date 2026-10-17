import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

import {
  brandPrimaryButtonClass,
  brandPrimaryTextClass,
} from "@/lib/brand"

const root = join(dirname(fileURLToPath(import.meta.url)), "../..")

function readSrc(rel: string) {
  return readFileSync(join(root, rel), "utf8")
}

describe("Focus presentation / fullscreen continuity", () => {
  it("A: Focus Simulation run uses shared brand primary button token", () => {
    const guided = readSrc("src/components/GuidedInputDialog.tsx")
    const app = readSrc("src/App.tsx")
    const brand = readSrc("src/lib/brand.ts")
    expect(brand).toContain("brandPrimaryButtonClass")
    expect(brandPrimaryButtonClass).toContain("bg-[#1d868c]")
    expect(guided).toContain("brandPrimaryButtonClass")
    expect(app).toContain("brandPrimaryButtonClass")
    expect(guided).toContain("data-guided-simulation-run")
    // No Focus-only hardcoded fill beside the shared token.
    expect(guided).not.toMatch(
      /data-guided-simulation-run[\s\S]{0,400}bg-\[#1d868c\]/,
    )
    expect(brandPrimaryTextClass).toContain("text-[#1d868c]")
  })

  it("B/C: Guided fullscreen icon follows browserFullscreen, not focusMode", () => {
    const guided = readSrc("src/components/GuidedInputDialog.tsx")
    const toggleStart = guided.lastIndexOf("ref={focusToggleRef}")
    const toggle = guided.slice(
      toggleStart,
      guided.indexOf("data-guided-input-close", toggleStart),
    )
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
    const shell = readSrc("src/components/FocusModeShell.tsx")
    expect(shell).toContain("aria-pressed={browserFullscreen}")
    expect(shell).toContain("isElementFullscreen(focusRootRef.current)")
    expect(shell).toContain("data-focus-mode-fullscreen-toggle")
    expect(shell).toContain("Minimize2")
    expect(shell).toContain("Maximize2")
  })

  it("G/H: Focus portal target stays for whole session (no Results→Input remount flash)", () => {
    const app = readSrc("src/App.tsx")
    expect(app).toContain(
      "Keep the Focus content portal target for the whole Focus session",
    )
    expect(app).toContain("focusView === null")
    expect(app).toContain(
      "focusView !== null ? focusPortalTarget : null",
    )
    expect(app).not.toContain(
      'focusView === "input" ? focusPortalTarget : null',
    )
    expect(app).not.toContain("if (focusView !== \"input\")")
  })
})
