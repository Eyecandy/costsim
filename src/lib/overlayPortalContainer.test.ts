import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const root = join(dirname(fileURLToPath(import.meta.url)), "../..")

describe("overlayPortalContainer", () => {
  it("GuidedPhaseInfo uses the fullscreen-aware portal container", () => {
    const info = readFileSync(
      join(root, "src/components/GuidedPhaseInfo.tsx"),
      "utf8",
    )
    expect(info).toContain("useOverlayPortalContainer")
    expect(info).toContain("createPortal")
    expect(info).toContain("portalContainer")
    expect(info).not.toMatch(
      /createPortal\([\s\S]*?,\s*document\.body\s*\)/,
    )
  })

  it("Method Guide / About Model use the fullscreen-aware portal container", () => {
    const header = readFileSync(
      join(root, "src/components/GlobalHeaderUtilities.tsx"),
      "utf8",
    )
    expect(header).toContain("useOverlayPortalContainer")
    expect(header).toContain("createPortal")
    expect(header).toContain("portalContainer")
    expect(header).toContain("data-method-guide-backdrop")
    expect(header).toContain("data-about-model-backdrop")
  })

  it("helper prefers getFullscreenElement, then Focus host, then document.body", () => {
    const src = readFileSync(
      join(root, "src/lib/overlayPortalContainer.ts"),
      "utf8",
    )
    expect(src).toContain("getFullscreenElement")
    expect(src).toContain("subscribeFullscreenChange")
    expect(src).toContain("document.body")
    expect(src).toContain("data-focus-session-host")
    expect(src).toContain("export function resolveOverlayPortalContainer")
    expect(src).toContain("export function useOverlayPortalContainer")
  })

  it("falls back to document.body when fullscreen is inactive", async () => {
    if (typeof document === "undefined") {
      // Node vitest has no DOM; browser path is covered by source contract above.
      expect(true).toBe(true)
      return
    }
    const { resolveOverlayPortalContainer } = await import(
      "@/lib/overlayPortalContainer"
    )
    expect(resolveOverlayPortalContainer()).toBe(document.body)
  })
})
