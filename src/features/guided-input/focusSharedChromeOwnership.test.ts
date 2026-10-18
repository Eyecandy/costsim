import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { join } from "node:path"

import {
  FOCUS_SESSION_CONTENT_CLASS,
  FOCUS_SESSION_FOOTER_CLASS,
  FOCUS_SESSION_HEADER_AUX_CLASS,
  FOCUS_SESSION_HEADER_CLASS,
  FOCUS_SESSION_HEADER_TITLE_CLASS,
} from "@/domain/guided/focusSessionFrame"
import { repoRoot as root } from "@/test-utils/repoRoot"
import { readAppSource } from "@/test-utils/appSource"
import { readGuidedInputSource } from "@/test-utils/guidedInputSource"

function readSrc(rel: string) {
  return readFileSync(join(root, rel), "utf8")
}

describe("Focus shared session chrome ownership", () => {
  it("A/B: shell header and footer always exist for Input and Results", () => {
    const shell = readSrc("src/features/focus-mode/FocusModeShell.tsx")
    const app = readAppSource()
    expect(shell).toContain('data-focus-mode-header=""')
    expect(shell).toContain('data-focus-mode-footer=""')
    expect(shell).toContain("FOCUS_SESSION_HEADER_CLASS")
    expect(shell).toContain("FOCUS_SESSION_FOOTER_CLASS")
    // No hostOnly gate on header/footer.
    expect(shell).not.toContain("!hostOnly")
    expect(shell).not.toContain('variant === "hostOnly"')
    expect(app).not.toContain('variant={focusView === "results" ? "results" : "hostOnly"}')
    // App supplies footer for both phases.
    expect(app).toContain('data-focus-results-nav=""')
    expect(app).toContain('data-focus-input-nav=""')
  })

  it("C: embedded Guided omits its own header/footer/FS chrome", () => {
    const guided = readGuidedInputSource()
    expect(guided).toContain("data-guided-embedded-in-focus-host")
    expect(guided).toContain("if (focusPortalTarget) return null")
    // Embedded path portals body only — no dialogSurface wrapper with header.
    const embedStart = guided.indexOf("Embedded Focus path: body-only into the shared shell")
    expect(embedStart).toBeGreaterThan(-1)
    const embedBlock = guided.slice(embedStart, guided.indexOf("Non-embedded suspend", embedStart))
    expect(embedBlock).toContain("data-guided-dialog-body")
    expect(embedBlock).toContain("renderBody()")
    expect(embedBlock).not.toContain("data-guided-dialog-header")
    expect(embedBlock).not.toContain("renderFooter()")
    expect(embedBlock).not.toContain("data-guided-focus-toggle")
    expect(embedBlock).not.toContain("data-guided-input-close")
  })

  it("D: standalone Guided retains its own chrome", () => {
    const guided = readGuidedInputSource()
    expect(guided).toContain('data-guided-dialog-header=""')
    expect(guided).toContain('data-guided-dialog-footer=""')
    expect(guided).toContain('data-guided-focus-toggle=""')
    expect(guided).toContain('data-guided-input-close=""')
    // Standalone path still portals to document.body with full surface.
    expect(guided).toContain("data-guided-input-surface")
    expect(guided).toContain("document.body")
  })

  it("keeps Guided mounted (soft-suspend) across Input → Results → Input", () => {
    const guided = readGuidedInputSource()
    const app = readAppSource()
    expect(guided).toContain('data-guided-soft-suspend={suspend ? "true" : undefined}')
    expect(guided).toContain("inert: true")
    expect(guided).toContain("aria-hidden={suspend ? true : undefined}")
    expect(guided).toContain('suspend && "hidden"')
    // Must not hard-unmount the embedded path via return null.
    expect(guided).not.toContain("if (suspend) return null\n\n  const dialogSurface")
    const embedPath = guided.slice(
      guided.indexOf("Embedded Focus path"),
      guided.indexOf("Non-embedded suspend"),
    )
    expect(embedPath).not.toContain("return null")
    expect(app).toContain('suspend={focusView === "results"}')
    expect(app).toContain("focusView !== null ? focusPortalTarget : null")
  })

  it("shared geometry contracts — one header/content/footer class set", () => {
    const shell = readSrc("src/features/focus-mode/FocusModeShell.tsx")
    expect(FOCUS_SESSION_HEADER_CLASS).toContain("px-5 py-4")
    expect(FOCUS_SESSION_HEADER_CLASS).toContain("flex-col")
    expect(FOCUS_SESSION_HEADER_TITLE_CLASS).toContain("pr-20")
    expect(FOCUS_SESSION_HEADER_AUX_CLASS).toContain("min-h-[1.25rem]")
    expect(FOCUS_SESSION_CONTENT_CLASS).toContain("px-5 py-6")
    expect(FOCUS_SESSION_FOOTER_CLASS).toContain("border-t")
    expect(shell).toContain("FOCUS_SESSION_HEADER_CLASS")
    expect(shell).toContain("FOCUS_SESSION_HEADER_TITLE_CLASS")
    expect(shell).toContain("FOCUS_SESSION_HEADER_AUX_CLASS")
    expect(shell).toContain("FOCUS_SESSION_CONTENT_CLASS")
    expect(shell).toContain("data-focus-mode-header-aux")
    expect(shell).toContain("data-focus-mode-header-titles")
    // No phase-specific chrome wrapper offsets.
    expect(shell).not.toMatch(/hostOnly[\s\S]{0,80}mt-|results[\s\S]{0,80}pt-/)
  })

  it("Guided publishes chrome metadata; App does not redefine Guided steps", () => {
    const guided = readGuidedInputSource()
    const app = readAppSource()
    const meta = readSrc("src/domain/guided/guidedFocusChrome.ts")
    expect(meta).toContain("GuidedFocusChromeMeta")
    expect(guided).toContain("onFocusChromeMetaChange")
    expect(guided).toContain("focusChromeMeta")
    expect(app).toContain("onFocusChromeMetaChange={handleGuidedFocusChromeMeta}")
    expect(app).toContain("guidedFocusChromeMeta")
    expect(app).toContain("headerAuxiliary")
    // Progress remains Guided-owned labels.
    expect(app).toContain("data-guided-progress")
    expect(guided).toContain("formatGuidedPhaseProgress")
  })
})
