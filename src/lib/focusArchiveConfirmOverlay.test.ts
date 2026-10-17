import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { repoRoot as root } from "@/test-utils/repoRoot"


function readSrc(rel: string) {
  return readFileSync(join(root, rel), "utf8")
}

describe("Focus archive confirmation overlay portal", () => {
  it("A/B: overlay helper prefers fullscreen then active Focus host then body", () => {
    const helper = readSrc("src/lib/overlayPortalContainer.ts")
    expect(helper).toContain("getFullscreenElement")
    expect(helper).toContain("data-focus-session-host")
    expect(helper).toContain("data-focus-host-dormant")
    expect(helper).toContain("document.body")
    expect(helper).toContain("export function resolveOverlayPortalContainer")
    // Fullscreen checked before Focus host query.
    expect(helper.indexOf("getFullscreenElement")).toBeLessThan(
      helper.indexOf("data-focus-session-host"),
    )
  })

  it("A/B: ConfirmDialog portals via overlay helper — not hard-coded body", () => {
    const dialog = readSrc("src/components/ConfirmDialog.tsx")
    expect(dialog).toContain("useOverlayPortalContainer")
    expect(dialog).toContain("resolveOverlayPortalContainer")
    expect(dialog).toContain("createPortal")
    expect(dialog).toContain("data-confirm-dialog")
    expect(dialog).not.toMatch(
      /createPortal\([\s\S]*?,\s*document\.body\s*\)/,
    )
  })

  it("D: Archive from Next Steps still uses requestArchiveCheckpoint", () => {
    const app = readSrc("src/App.tsx")
    const panel = readSrc("src/components/ResultsPanel.tsx")
    expect(app).toContain("const requestArchiveCheckpoint = useCallback")
    expect(app).toContain("setArchiveConfirmOpen(true)")
    expect(app).toContain("onRequestArchiveAndCreateNext=")
    expect(app).toContain("requestArchiveCheckpoint")
    expect(panel).toContain("onRequestArchiveAndCreateNext")
    expect(panel).toContain("data-focus-next-steps-archive")
    // Confirm closes only archiveConfirmOpen — does not exit Focus.
    const archiveDialog = app.slice(
      app.indexOf("open={archiveConfirmOpen}"),
      app.indexOf("open={deleteCheckpointConfirmOpen}"),
    )
    expect(archiveDialog).toContain("setArchiveConfirmOpen(false)")
    expect(archiveDialog).toContain("onCancel={() => setArchiveConfirmOpen(false)}")
    expect(archiveDialog).not.toContain("exitFocusMode")
    expect(archiveDialog).not.toContain("setFocusView")
  })

  it("C/E: Cancel only closes confirm; outside Focus still uses ConfirmDialog", () => {
    const app = readSrc("src/App.tsx")
    const dialog = readSrc("src/components/ConfirmDialog.tsx")
    expect(app).toContain("open={archiveConfirmOpen}")
    expect(app).toContain("onCancel={() => setArchiveConfirmOpen(false)}")
    // Shared component — library / other callers unchanged at call sites.
    expect(dialog).toContain("onCancel")
    expect(dialog).toContain("onConfirm")
  })

  it("F: Focus arrows stay suppressed while data-confirm-dialog is open", () => {
    const ignore = readSrc("src/lib/shouldIgnoreFocusArrowNavigation.ts")
    expect(ignore).toContain('document.querySelector("[data-confirm-dialog]")')
    expect(ignore).toContain('target.closest("[data-confirm-dialog]")')
  })

  it("post-archive create-next dialog also uses overlay portal (Focus FS safe)", () => {
    const next = readSrc("src/components/CreateNextCheckpointDialog.tsx")
    expect(next).toContain("resolveOverlayPortalContainer")
    expect(next).toContain("useOverlayPortalContainer")
    expect(next).not.toMatch(
      /createPortal\([\s\S]*?,\s*document\.body\s*\)/,
    )
  })
})
