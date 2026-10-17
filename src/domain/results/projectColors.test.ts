import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { join } from "node:path"

import {
  getProjectColorCssVar,
  getProjectColorHex,
  PROJECT_COLOR_CSS_VARS,
  PROJECT_COLOR_HEX,
  projectColorIndex,
} from "@/domain/results/projectColors"
import { repoRoot as root } from "@/test-utils/repoRoot"
import { readAppSource } from "@/test-utils/appSource"

describe("projectColors", () => {
  it("assigns Project 1 to the blue scurve token", () => {
    expect(getProjectColorCssVar(0)).toBe("--scurve-line-1")
    expect(PROJECT_COLOR_CSS_VARS[0]).toBe("--scurve-line-1")
    const css = readFileSync(join(root, "src/index.css"), "utf8")
    expect(css).toMatch(/--scurve-line-1:\s*oklch\(0\.54 0\.08 248\)/)
  })

  it("is deterministic by order index and wraps at 4", () => {
    expect(projectColorIndex(0)).toBe(0)
    expect(projectColorIndex(3)).toBe(3)
    expect(projectColorIndex(4)).toBe(0)
    expect(getProjectColorCssVar(1)).toBe("--scurve-line-2")
    expect(getProjectColorCssVar(5)).toBe("--scurve-line-2")
    expect(getProjectColorHex(0)).toBe(PROJECT_COLOR_HEX[0])
    expect(getProjectColorHex(0)).toBe("#47739b")
  })

  it("ResultsPanel and App resolve colors from the shared helper", () => {
    const panel = readFileSync(join(root, "src/features/results/ResultsPanel.tsx"), "utf8")
    const app = readAppSource()
    const swatch = readFileSync(join(root, "src/shared/ProjectColorSwatch.tsx"), "utf8")
    expect(panel).toContain("getProjectColorCssVar")
    expect(panel).toContain("getProjectColorHex")
    expect(panel).toContain("ProjectColorSwatch")
    expect(panel).not.toContain('["--scurve-line-1"')
    expect(panel).not.toContain('["#1d868c", "#3b82f6"')
    expect(app).toContain("ProjectColorSwatch")
    expect(swatch).toContain("data-project-color-swatch")
    expect(swatch).toContain("getProjectColorCssVar")
    expect(swatch).toContain("size-1.5")
  })

  it("Tornado and Contribution headings use ProjectColorSwatch without recoloring bars", () => {
    const panel = readFileSync(join(root, "src/features/results/ResultsPanel.tsx"), "utf8")
    const tornado = readFileSync(join(root, "src/features/results/ResultsTornado.tsx"), "utf8")
    const waterfall = readFileSync(join(root, "src/features/results/ResultsWaterfall.tsx"), "utf8")
    const reserve = readFileSync(
      join(root, "src/features/results/ResultsReserveWaterfall.tsx"),
      "utf8",
    )
    const tornadoBlock = panel.slice(
      panel.indexOf("charts.tornadoTitle"),
      panel.indexOf("charts.attributionTitle"),
    )
    const contributionBlock = panel.slice(
      panel.indexOf("charts.attributionTitle"),
      panel.indexOf("results.optionsHeading"),
    )
    expect(tornadoBlock).toContain("ProjectColorSwatch")
    expect(contributionBlock).toContain("ProjectColorSwatch")
    expect(tornado).not.toContain("getProjectColor")
    expect(tornado).not.toContain("ProjectColorSwatch")
    expect(waterfall).not.toContain("getProjectColor")
    expect(reserve).not.toContain("getProjectColor")
  })
})
