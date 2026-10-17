import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

import { shouldIgnoreFocusArrowNavigation } from "@/lib/shouldIgnoreFocusArrowNavigation"

const root = join(dirname(fileURLToPath(import.meta.url)), "../..")

describe("shouldIgnoreFocusArrowNavigation", () => {
  it("exports a function and reuses Guided editable-control rules", () => {
    expect(typeof shouldIgnoreFocusArrowNavigation).toBe("function")
    expect(shouldIgnoreFocusArrowNavigation(null)).toBe(false)
    const src = readFileSync(
      join(root, "src/lib/shouldIgnoreFocusArrowNavigation.ts"),
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
