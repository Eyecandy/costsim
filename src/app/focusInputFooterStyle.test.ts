import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { join } from "node:path"

import { FOCUS_SESSION_FOOTER_NAV_BUTTON_CLASS } from "@/domain/guided/focusSessionFrame"
import { brandPrimaryButtonClass } from "@/shared/brand"
import { repoRoot as root } from "@/test-utils/repoRoot"
import { readAppSource } from "@/test-utils/appSource"


function readSrc(rel: string) {
  return readFileSync(join(root, rel), "utf8")
}

describe("Focus Input footer style from first open", () => {
  it("openGuidedInput enters Focus Input immediately (no standalone heavy footer first)", () => {
    const app = readAppSource()
    const openStart = app.indexOf("const openGuidedInput = useCallback")
    const openEnd = app.indexOf("}, [analysisReadOnly, clearCorrelationEditingState", openStart)
    const openBody = app.slice(openStart, openEnd)
    expect(openBody).toContain("setGuidedInputKind(kind)")
    expect(openBody).toContain('setFocusView("input")')
    // Resume from detours also re-enters Focus Input chrome.
    const resumeStart = app.indexOf("const returnToGuidedReview = useCallback")
    const resumeEnd = app.indexOf("}, [", resumeStart)
    expect(app.slice(resumeStart, resumeEnd)).toContain('setFocusView("input")')
  })

  it("initial embedded Input Focus footer uses the same lightweight nav class as Results", () => {
    const app = readAppSource()
    const inputNav = app.slice(
      app.indexOf('data-focus-input-nav=""'),
      app.indexOf("data-guided-next=\"\"", app.indexOf('data-focus-input-nav=""')) + 40,
    )
    const resultsNav = app.slice(
      app.indexOf('data-focus-results-nav=""'),
      app.indexOf("data-focus-results-next=\"\"") + 80,
    )
    expect(inputNav).toContain("FOCUS_SESSION_FOOTER_NAV_BUTTON_CLASS")
    expect(inputNav).toContain('variant: "ghost"')
    expect(inputNav).not.toContain("bg-[#1d868c]")
    expect(inputNav).not.toContain('variant: "default"')
    expect(resultsNav).toContain("FOCUS_SESSION_FOOTER_NAV_BUTTON_CLASS")
    expect(resultsNav).toContain('variant: "ghost"')
    expect(FOCUS_SESSION_FOOTER_NAV_BUTTON_CLASS).toContain("text-muted-foreground")
  })

  it("Guided does not render its own footer when embedded (shell owns style for whole session)", () => {
    const guided = readSrc("src/features/guided-input/GuidedInputDialog.tsx")
    const app = readAppSource()
    const footer = guided.slice(
      guided.indexOf("const renderFooter = () => {"),
      guided.indexOf("Embedded Focus path"),
    )
    expect(footer).toContain("if (focusPortalTarget) return null")
    expect(app).toContain('ensureFocusMode={focusView === "input"}')
    expect(app).toContain(
      "focusView !== null ? focusPortalTarget : null",
    )
  })

  it("Simulation primary run button remains brand primary (unchanged)", () => {
    const guided = readSrc("src/features/guided-input/GuidedInputDialog.tsx")
    expect(guided).toContain("brandPrimaryButtonClass")
    expect(guided).toContain('data-guided-simulation-run=""')
    expect(brandPrimaryButtonClass).toContain("bg-[#1d868c]")
    // Footer Next must not reuse the simulation primary fill when in Focus shell.
    const app = readAppSource()
    const inputNav = app.slice(
      app.indexOf('data-focus-input-nav=""'),
      app.indexOf("{focusView === \"results\" &&", app.indexOf('data-focus-input-nav=""')),
    )
    expect(inputNav).not.toContain("brandPrimaryButtonClass")
    expect(inputNav).not.toContain("bg-[#1d868c]")
  })
})
