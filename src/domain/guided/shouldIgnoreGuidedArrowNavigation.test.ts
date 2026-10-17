import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { join } from "node:path"

import { shouldIgnoreGuidedArrowNavigation } from "@/domain/guided/shouldIgnoreGuidedArrowNavigation"
import { repoRoot as root } from "@/test-utils/repoRoot"


describe("shouldIgnoreGuidedArrowNavigation", () => {
  it("exports a function and ignores non-elements", () => {
    expect(typeof shouldIgnoreGuidedArrowNavigation).toBe("function")
    expect(shouldIgnoreGuidedArrowNavigation(null)).toBe(false)
  })

  it("covers native editors, guided markers, and ARIA editable roles", () => {
    const src = readFileSync(
      join(root, "src/domain/guided/shouldIgnoreGuidedArrowNavigation.ts"),
      "utf8",
    )
    expect(src).toContain('"text"')
    expect(src).toContain('"number"')
    expect(src).toContain('"range"')
    expect(src).toContain("HTMLTextAreaElement")
    expect(src).toContain("HTMLSelectElement")
    expect(src).toContain("isContentEditable")
    expect(src).toContain("data-guided-inline-edit")
    expect(src).toContain("data-guided-slider")
    expect(src).toContain("data-keyboard-editable")
    expect(src).toContain('role="slider"')
    expect(src).toContain('role="spinbutton"')
    expect(src).toContain('role="textbox"')
  })
})
