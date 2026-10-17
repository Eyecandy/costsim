import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { repoRoot as root } from "@/test-utils/repoRoot"
import { readAppSource } from "@/test-utils/appSource"


function readSrc(rel: string) {
  return readFileSync(join(root, rel), "utf8")
}

describe("Focus session shared toolbar", () => {
  it("shell owns one common Fullscreen/X toolbar for Input and Results", () => {
    const shell = readSrc("src/features/focus-mode/FocusModeShell.tsx")
    expect(shell).toContain('data-focus-session-toolbar=""')
    expect(shell).toContain('data-focus-session-toolbar-common=""')
    expect(shell).toContain('data-focus-mode-fullscreen-toggle=""')
    expect(shell).toContain('data-focus-mode-close=""')
    // Toolbar is session-scoped (not dormant), not variant- or hostOnly-gated.
    const toolbarStart = shell.indexOf('data-focus-session-toolbar=""')
    const beforeHeader = shell.slice(
      toolbarStart,
      shell.indexOf('data-focus-mode-header=""'),
    )
    const toolbarBlock = beforeHeader.slice(
      0,
      beforeHeader.lastIndexOf("        ) : null}"),
    )
    expect(toolbarBlock).toContain("data-focus-mode-fullscreen-toggle")
    expect(toolbarBlock).toContain("data-focus-mode-close")
    expect(toolbarBlock).not.toContain("hostOnly")
    expect(toolbarBlock).not.toContain('variant === "results"')
  })

  it("Result Settings is parked beside common controls without flex-pushing them", () => {
    const shell = readSrc("src/features/focus-mode/FocusModeShell.tsx")
    const app = readAppSource()
    expect(shell).toContain("headerActions")
    expect(shell).toContain('data-focus-session-toolbar-extra=""')
    // Extra is absolutely positioned to the left of the common pair.
    expect(shell).toContain("right-full")
    expect(app).toContain("headerActions={")
    expect(app).toContain("ResultPreferencesPanel")
    // Results header is title-only — no flex row of settings + FS/X.
    const headerBlock = shell.slice(
      shell.indexOf("data-focus-mode-header"),
      shell.indexOf("data-focus-mode-status"),
    )
    expect(headerBlock).not.toContain("headerActions")
    expect(headerBlock).not.toContain("data-focus-mode-fullscreen-toggle")
    expect(headerBlock).not.toContain("data-focus-mode-close")
  })

  it("Guided Input does not render its own Fullscreen/X when embedded in the shell", () => {
    const guided = readSrc("src/features/guided-input/GuidedInputDialog.tsx")
    expect(guided).toContain("data-guided-embedded-in-focus-host")
    const embedBlock = guided.slice(
      guided.indexOf("Embedded Focus path"),
      guided.indexOf("Non-embedded suspend"),
    )
    expect(embedBlock).not.toContain("data-guided-focus-toggle")
    expect(embedBlock).not.toContain("data-guided-input-close")
    expect(embedBlock).not.toContain("data-guided-dialog-header")
    // Standalone Guided modal still owns its controls when not portaled.
    expect(guided).toContain('data-guided-focus-toggle=""')
    expect(guided).toContain('data-guided-input-close=""')
  })

  it("common toolbar anchor is phase-independent (no Input/Results offsets)", () => {
    const shell = readSrc("src/features/focus-mode/FocusModeShell.tsx")
    const toolbarMarker = shell.indexOf('data-focus-session-toolbar=""')
    const toolbarOuterStart = shell.lastIndexOf("<div", toolbarMarker)
    const beforeHeader = shell.slice(
      toolbarOuterStart,
      shell.indexOf('data-focus-mode-header=""'),
    )
    // Outer wrapper only — stop before nested headerActions ternary.
    const toolbarAnchor = beforeHeader.slice(
      0,
      beforeHeader.indexOf('data-focus-session-toolbar-common=""'),
    )
    expect(toolbarAnchor).toContain("absolute top-4 right-5")
    expect(toolbarAnchor).toContain("sm:right-8")
    expect(toolbarAnchor).not.toContain("hostOnly")
    expect(toolbarAnchor).not.toContain("browserFullscreen")
    expect(toolbarAnchor).not.toMatch(/top-\[|right-\[/)
  })
})
