import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

import { messages } from "@/i18n/messages"
import { FOCUS_SESSION_FOOTER_CLASS } from "@/lib/focusSessionFrame"

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = join(__dirname, "../..")

function dialogSource() {
  return readFileSync(
    join(repoRoot, "src/components/GuidedInputDialog.tsx"),
    "utf8",
  )
}

function infoSource() {
  return readFileSync(
    join(repoRoot, "src/components/GuidedPhaseInfo.tsx"),
    "utf8",
  )
}

function appSource() {
  return readFileSync(join(repoRoot, "src/App.tsx"), "utf8")
}

describe("Guided Input dialog stability and exit", () => {
  it("A: backdrop click does not close Guided Input", () => {
    const src = dialogSource()
    // Modal overlay: presentation layer must not dismiss on click.
    const modalOverlay = src.slice(
      src.lastIndexOf('role="presentation"'),
      src.lastIndexOf("document.body"),
    )
    expect(modalOverlay).toContain('data-guided-input-dialog=""')
    expect(modalOverlay).not.toContain("onClick={onClose}")
    expect(src).toContain('data-guided-input-surface=""')
    // Embedded Focus path also must not wire overlay dismiss.
    expect(src).toContain("data-guided-embedded-in-focus-host")
    const embedStart = src.indexOf("Embedded Focus path: body-only")
    const embedBlock = src.slice(
      embedStart,
      src.indexOf("Non-embedded suspend", embedStart),
    )
    expect(embedBlock).not.toContain("onClick={onClose}")
    expect(embedBlock).toContain("renderBody()")
  })

  it("B: X/Close does close Guided Input", () => {
    const src = dialogSource()
    expect(src).toContain('data-guided-input-close=""')
    expect(src).toMatch(
      /data-guided-input-close=""[\s\S]{0,220}onClick=\{handleCloseGuided\}|onClick=\{handleCloseGuided\}[\s\S]{0,220}data-guided-input-close=""/,
    )
    // Prefer explicit close button wiring.
    const closeBtn = src.slice(
      src.indexOf('data-guided-input-close=""') - 200,
      src.indexOf('data-guided-input-close=""') + 80,
    )
    expect(closeBtn).toContain("onClick={handleCloseGuided}")
  })

  it("C: intentional handoffs still pause/close the guide", () => {
    const src = dialogSource()
    expect(src).toContain("onAddCostItems")
    expect(src).toContain("onAddDrivers")
    expect(src).toContain("onAdjustCorrelation")
    expect(src).toContain("onAdjustImpact")
    expect(src).toContain('data-guided-add-cost-items=""')
    expect(src).toContain('data-guided-add-drivers=""')
    expect(src).toContain("data-guided-adjust-correlation")
    expect(src).toContain("data-guided-adjust-impact")
    const app = appSource()
    expect(app).toContain("setGuidedInputKind(null)")
    expect(app).toContain("onReturnToGuided")
  })

  it("D: return/resume still works", () => {
    const app = appSource()
    expect(app).toContain("guidedResume")
    expect(app).toContain("guidedResumePhase")
    expect(app).toContain("setGuidedInputKind(entry)")
    expect(dialogSource()).toContain("resumePhase")
    expect(dialogSource()).toContain("findGuidedWorkflowPhaseIndex")
  })

  it("E: footer/navigation remains rendered across phases", () => {
    const src = dialogSource()
    expect(src).toContain('data-guided-dialog-footer=""')
    expect(src).toContain("renderFooter()")
    expect(src).toContain('data-guided-previous=""')
    expect(src).toContain('data-guided-next=""')
    const footer = src.slice(
      src.indexOf('data-guided-dialog-footer=""') - 120,
      src.indexOf('data-guided-dialog-footer=""') + 60,
    )
    expect(footer).toContain("footerChromeClass")
    expect(src).toContain("FOCUS_SESSION_FOOTER_CLASS")
    expect(FOCUS_SESSION_FOOTER_CLASS).toContain("shrink-0")
  })

  it("F: short phases share the same stable outer dialog frame", () => {
    const src = dialogSource()
    expect(src).toContain('data-guided-dialog-frame="stable"')
    expect(src).toContain("FOCUS_SESSION_CARD_CLASS")
    const frame = readFileSync(
      join(repoRoot, "src/lib/focusSessionFrame.ts"),
      "utf8",
    )
    expect(frame).toContain("h-[min(92vh,48rem)]")
    expect(frame).toContain("w-[min(96vw,60rem)]")
    // No per-phase outer height classes on the dialog surface.
    expect(src).not.toContain("max-h-[min(94vh,48rem)]")
  })

  it("G: long phases scroll internally in the body region", () => {
    const src = dialogSource()
    expect(src).toContain('data-guided-dialog-body=""')
    expect(src).toContain("min-h-0 flex-1 overflow-auto")
    expect(src).toContain('data-guided-dialog-body=""')
  })

  it("H: Info interaction does not close the guide", () => {
    const info = infoSource()
    expect(info).toContain("event.stopPropagation()")
    expect(info).not.toContain("onClose")
    expect(dialogSource()).toContain("GuidedPhaseInfo")
  })

  it("H2: Info popover portals into fullscreen root when active", () => {
    const info = infoSource()
    expect(info).toContain("useOverlayPortalContainer")
    expect(info).toContain("portalContainer")
    expect(info).not.toMatch(
      /createPortal\([\s\S]*?,\s*document\.body\s*\)/,
    )
  })

  it("I: focus/click inside controls remains local to the surface", () => {
    const src = dialogSource()
    expect(src).toContain("onClick={(e) => e.stopPropagation()}")
    expect(src).toContain("data-guided-inline-edit")
    expect(src).toContain("GuidedRangeSlider")
    expect(src).toContain("GuidedInlineValue")
  })

  it("J: Escape exits Focus first, then closes Guided Input; backdrop does not", () => {
    const src = dialogSource()
    expect(src).toContain('event.key !== "Escape"')
    expect(src).toContain("onClose()")
    const escapeBlock = src.slice(
      src.indexOf('if (event.key !== "Escape") return'),
      src.indexOf('window.addEventListener("keydown", onKeyDown)'),
    )
    // Browser fullscreen Escape is left to the browser; in-app Focus stays.
    // Prefer shared Focus host when embedded; fall back to Guided's own root.
    expect(escapeBlock).toContain("focusPortalTarget?.closest")
    expect(escapeBlock).toContain("focusRootRef.current")
    expect(escapeBlock).toContain(
      "isElementFullscreen(host instanceof Element ? host : null)",
    )
    expect(escapeBlock).toContain("focusMode")
    expect(escapeBlock).toContain("setFocusMode(false)")
    expect(escapeBlock).toContain("onClose()")
    // Language-agnostic structure (NO/EN share the same dialog).
    expect(src).toContain('t("inputs.guidedClose")')
    expect(src).toContain('t("inputs.guidedNext")')
  })

  it("header stays shrink-0 above the scroll body", () => {
    const src = dialogSource()
    expect(src).toContain('data-guided-dialog-header=""')
    expect(src).toMatch(
      /flex shrink-0 items-start[\s\S]*?data-guided-dialog-header=""/,
    )
    expect(src).toContain('data-guided-dialog-body=""')
    expect(src).toContain("min-h-0 flex-1 overflow-auto")
  })

  it("shows active project identity above the phase heading", () => {
    const src = dialogSource()
    const app = appSource()
    expect(src).toContain('data-guided-project-context=""')
    expect(src).toContain("ProjectColorSwatch")
    expect(src).toContain("projectIndex")
    expect(src).toContain("project.name")
    // Project context precedes phase title in the standalone header block.
    const headerIdx = src.indexOf('data-guided-dialog-header=""')
    const header = src.slice(
      headerIdx,
      src.indexOf('data-guided-dialog-body=""', headerIdx),
    )
    expect(header.indexOf("data-guided-project-context")).toBeLessThan(
      header.indexOf("id={titleId}"),
    )
    expect(header.indexOf("id={titleId}")).toBeLessThan(
      header.indexOf("data-guided-progress"),
    )
    // Embedded Focus Input renders project identity in the shared shell header.
    expect(app).toContain('data-guided-project-context=""')
    expect(app).toContain("guidedFocusChromeMeta.projectIndex")
    expect(app).toContain("guidedFocusChromeMeta.projectName")
    expect(app).toContain("projectIndex={Math.max(")
    expect(app).toContain("projects.findIndex((p) => p.id === activeProject.id)")
  })

  it("Focus mode is a local presentation toggle near close", () => {
    const src = dialogSource()
    expect(src).toContain('data-guided-focus-toggle=""')
    expect(src).toContain("useState(false)")
    expect(src).toContain("setFocusMode")
    expect(src).toContain("enterFocusMode")
    expect(src).toContain("exitFocusMode")
    expect(src).toContain("requestElementFullscreen")
    expect(src).toContain("subscribeFullscreenChange")
    expect(src).toContain("Maximize2")
    expect(src).toContain("Minimize2")
    expect(src).toContain('t("inputs.guidedFocusMode")')
    expect(src).toContain('t("inputs.guidedExitFocusMode")')
    expect(src).toContain('data-guided-focus-mode={focusMode ? "true" : undefined}')
    expect(src).toContain("FOCUS_SESSION_CARD_CLASS")
    expect(src).toContain("FOCUS_SESSION_CARD_FULLSCREEN_CLASS")
    // Contained Focus card matches Guided modal — fullscreen is explicit.
    const frame = readFileSync(
      join(repoRoot, "src/lib/focusSessionFrame.ts"),
      "utf8",
    )
    expect(frame).toContain("h-[min(92vh,48rem)]")
    expect(frame).toContain("w-[min(96vw,60rem)]")
    // Dimmed app backdrop in Focus (parity with Results Focus shell).
    expect(src).toContain("bg-black/40")
    expect(src).toContain('data-guided-backdrop="dimmed"')
    // Reset when Guided closes / handoffs set open=false.
    expect(src).toMatch(/if \(!open\) \{[\s\S]*?setFocusMode\(false\)/)
    expect(src).toMatch(/if \(!open\) \{[\s\S]*?exitFullscreenIfNeeded/)
    // Not persisted.
    expect(src).not.toMatch(/localStorage[\s\S]{0,80}focusMode|focusMode[\s\S]{0,80}localStorage/)
    expect(messages.no.inputs.guidedFocusMode).toBe("Fokusmodus")
    expect(messages.en.inputs.guidedFocusMode).toBe("Focus mode")
    expect(messages.no.inputs.guidedExitFocusMode).toBe("Avslutt Fokusmodus")
    expect(messages.en.inputs.guidedExitFocusMode).toBe("Exit Focus mode")
  })

  it("ArrowLeft/ArrowRight reuse Next/Previous with editable ignore + repeat guard", () => {
    const src = dialogSource()
    expect(src).toContain('shouldIgnoreGuidedArrowNavigation')
    expect(src).toContain('event.key !== "ArrowLeft" && event.key !== "ArrowRight"')
    expect(src).toContain("event.repeat")
    expect(src).toContain("performGuidedNext")
    expect(src).toContain("goPrevious()")
    expect(src).toContain("safeIndex <= 0")
    expect(src).toContain('window.addEventListener("keydown", onKeyDown)')
    // Previous/Next buttons remain.
    expect(src).toContain("data-guided-previous")
    expect(src).toContain("data-guided-next")
    expect(src).toContain("onClick={goPrevious}")
  })
})
