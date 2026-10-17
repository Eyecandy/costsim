import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { join } from "node:path"

import { shouldIgnoreFocusArrowNavigation } from "@/features/focus-mode/shouldIgnoreFocusArrowNavigation"
import { repoRoot as root } from "@/test-utils/repoRoot"


describe("shouldIgnoreFocusArrowNavigation", () => {
  it("exports a function and reuses Guided editable-control rules", () => {
    expect(typeof shouldIgnoreFocusArrowNavigation).toBe("function")
    expect(shouldIgnoreFocusArrowNavigation(null)).toBe(false)
    const src = readFileSync(
      join(root, "src/features/focus-mode/shouldIgnoreFocusArrowNavigation.ts"),
      "utf8",
    )
    expect(src).toContain("shouldIgnoreGuidedArrowNavigation")
    expect(src).toContain("data-expanded-chart-dialog")
    expect(src).toContain("data-result-preferences-panel")
    expect(src).toContain("data-result-preferences-trigger")
    expect(src).toContain('role="menu"')
    expect(src).toContain('role="listbox"')
    expect(src).toContain('role="combobox"')
    expect(src).toContain("data-confirm-dialog")
  })
})
