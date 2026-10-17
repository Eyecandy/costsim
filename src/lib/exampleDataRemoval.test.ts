import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { join } from "node:path"

import { featureConfigByVariant } from "@/config/appVariant"
import { messages } from "@/i18n/messages"
import { repoRoot } from "@/test-utils/repoRoot"


function scenarioTableSource() {
  return readFileSync(
    join(repoRoot, "src/components/ScenarioPercentTable.tsx"),
    "utf8",
  )
}

function appVariantSource() {
  return readFileSync(join(repoRoot, "src/config/appVariant.ts"), "utf8")
}

describe("Example Data removal / toolbar order", () => {
  it("Example Data control is no longer rendered", () => {
    const src = scenarioTableSource()
    expect(src).not.toContain("WandSparkles")
    expect(src).not.toContain("applyExampleRows")
    expect(src).not.toContain("showExampleDataButton")
    expect(src).not.toContain("COST_EXAMPLE_ROWS")
    expect(src).not.toContain("DRIVER_EXAMPLE_ROWS")
    expect(src).not.toContain("exampleDataTooltip")
    expect(src).not.toContain('t("inputs.exampleData')
  })

  it("no Example Data tooltip/menu/i18n remains", () => {
    expect(messages.no.inputs).not.toHaveProperty("exampleDataButtonLabel")
    expect(messages.no.inputs).not.toHaveProperty("exampleDataTooltipCost")
    expect(messages.no.inputs).not.toHaveProperty("exampleDataTooltipDrivers")
    expect(messages.no.inputs).not.toHaveProperty("exampleDataConfirmReplace")
    expect(messages.en.inputs).not.toHaveProperty("exampleDataButtonLabel")
    expect(messages.en.inputs).not.toHaveProperty("exampleDataTooltipCost")
    expect(messages.en.inputs).not.toHaveProperty("exampleDataTooltipDrivers")
    expect(messages.en.inputs).not.toHaveProperty("exampleDataConfirmReplace")
    expect(appVariantSource()).not.toContain("showExampleDataButtons")
    expect(featureConfigByVariant.pilot).not.toHaveProperty(
      "showExampleDataButtons",
    )
    expect(featureConfigByVariant.public_mvp).not.toHaveProperty(
      "showExampleDataButtons",
    )
  })

  it("remaining toolbar controls still render", () => {
    const src = scenarioTableSource()
    expect(src).toContain('t("inputs.openFocusMode")')
    expect(src).toContain('t("expanders.define")')
    expect(src).toContain('t("expanders.costCorrelation")')
    expect(src).toContain('t("expanders.driverImpact")')
    expect(src).toContain('t("inputs.clearTableTooltip")')
    expect(src).toContain('t("inputs.addRow")')
    expect(src).toContain('t("inputs.deleteSelectedRow")')
    expect(src).toContain("Play")
    expect(src).toContain("FileText")
    expect(src).toContain("Link2")
    expect(src).toContain("SlidersHorizontal")
    expect(src).toContain("Trash2")
    expect(src).toContain("Plus")
    expect(src).toContain("Minus")
    expect(src).toContain("onDeleteSelectedRow")
  })

  it("remaining toolbar order is unchanged", () => {
    const src = scenarioTableSource()
    const toolbarStart = src.indexOf('className="flex shrink-0 items-center gap-2"')
    expect(toolbarStart).toBeGreaterThan(-1)
    // Include enough of the toolbar block for all right-side actions
    const toolbar = src.slice(toolbarStart, toolbarStart + 8000)

    const order = [
      't("inputs.openFocusMode")',
      't("expanders.define")',
      't("expanders.costCorrelation")',
      't("expanders.driverImpact")',
      't("inputs.clearTableTooltip")',
      't("inputs.addRow")',
      "onDeleteSelectedRow",
    ]
    let prev = -1
    for (const marker of order) {
      const idx = toolbar.indexOf(marker)
      expect(idx, marker).toBeGreaterThan(prev)
      prev = idx
    }
    expect(toolbar).not.toContain("WandSparkles")
    expect(toolbar).not.toContain("applyExampleRows")
  })

  it("existing toolbar modes still wired", () => {
    const src = scenarioTableSource()
    expect(src).toContain("guidedInputMode.onOpen")
    expect(src).toContain("defineMode.onToggle")
    expect(src).toContain("costCorrelationMode.onToggle")
    expect(src).toContain("driverImpactMode.onToggle")
    expect(src).toContain("clearTableRows")
    expect(src).toContain("onRowAppended")
    expect(src).toContain("onDeleteSelectedRow")
  })
})
