import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

import {
  FOCUS_SESSION_CARD_CLASS,
  FOCUS_SESSION_CARD_FULLSCREEN_CLASS,
  FOCUS_SESSION_CONTENT_CLASS,
  FOCUS_SESSION_FOOTER_CLASS,
  FOCUS_SESSION_FOOTER_NAV_BUTTON_CLASS,
  FOCUS_SESSION_HEADER_AUX_CLASS,
  FOCUS_SESSION_HEADER_CLASS,
  FOCUS_SESSION_HEADER_TITLE_CLASS,
} from "@/lib/focusSessionFrame"

const root = join(dirname(fileURLToPath(import.meta.url)), "../..")

function readSrc(rel: string) {
  return readFileSync(join(root, rel), "utf8")
}

describe("focusSessionFrame", () => {
  it("A: exports one contained Focus card contract", () => {
    expect(FOCUS_SESSION_CARD_CLASS).toBe(
      "h-[min(92vh,48rem)] w-[min(96vw,60rem)]",
    )
    expect(FOCUS_SESSION_CARD_FULLSCREEN_CLASS).toBe(
      "h-[min(100%,56rem)] w-[min(100%,80rem)]",
    )
  })

  it("B/G: Shell and Guided both import the shared contract — no Results-only size", () => {
    const shell = readSrc("src/components/FocusModeShell.tsx")
    const guided = readSrc("src/components/GuidedInputDialog.tsx")
    expect(shell).toContain("FOCUS_SESSION_CARD_CLASS")
    expect(shell).toContain("FOCUS_SESSION_CARD_FULLSCREEN_CLASS")
    expect(guided).toContain("FOCUS_SESSION_CARD_CLASS")
    expect(guided).toContain("FOCUS_SESSION_CARD_FULLSCREEN_CLASS")
    expect(shell).not.toContain("h-[min(96vh,56rem)] w-[min(96vw,76rem)]")
    expect(guided).not.toContain("h-[min(96vh,56rem)] w-[min(96vw,76rem)]")
  })

  it("E/F: Fullscreen is explicit via browserFullscreen branch only", () => {
    const shell = readSrc("src/components/FocusModeShell.tsx")
    const sizeBlock = shell.slice(
      shell.indexOf("Shared Focus frame"),
      shell.indexOf("data-focus-frame-contract"),
    )
    expect(sizeBlock).toContain("browserFullscreen")
    expect(sizeBlock).toContain("FOCUS_SESSION_CARD_FULLSCREEN_CLASS")
    expect(sizeBlock).toContain("FOCUS_SESSION_CARD_CLASS")
    expect(sizeBlock).not.toContain('variant === "results"')
  })

  it("exports shared Focus footer chrome contracts", () => {
    expect(FOCUS_SESSION_FOOTER_CLASS).toContain("sm:px-8")
    expect(FOCUS_SESSION_FOOTER_NAV_BUTTON_CLASS).toContain(
      "text-muted-foreground",
    )
  })

  it("exports shared header and content frame contracts", () => {
    expect(FOCUS_SESSION_HEADER_CLASS).toContain("flex-col")
    expect(FOCUS_SESSION_HEADER_CLASS).toContain("px-5 py-4")
    expect(FOCUS_SESSION_HEADER_CLASS).not.toContain("pr-24")
    expect(FOCUS_SESSION_HEADER_TITLE_CLASS).toContain("pr-20")
    expect(FOCUS_SESSION_HEADER_AUX_CLASS).toContain("min-h-[1.25rem]")
    expect(FOCUS_SESSION_HEADER_AUX_CLASS).toContain("w-full")
    expect(FOCUS_SESSION_CONTENT_CLASS).toContain("px-5 py-6")
  })
})
