import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

import { positionDefinePopover } from "@/components/DefineRowPopover"
import {
  costRowHasDefinition,
  driverRowHasDefinition,
  withCostDescription,
  withDriverDescription,
} from "@/lib/rowDefinitions"
import type { CostElementRow, DriverRow } from "@/lib/tableRows"
import { shouldShowDefineSelectHint } from "@/components/ScenarioPercentTable"

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = join(__dirname, "../..")

function scenarioTableSource() {
  return readFileSync(
    join(repoRoot, "src/components/ScenarioPercentTable.tsx"),
    "utf8",
  )
}

function popoverSource() {
  return readFileSync(
    join(repoRoot, "src/components/DefineRowPopover.tsx"),
    "utf8",
  )
}

function costRow(partial: Partial<CostElementRow> & { id: string }): CostElementRow {
  return {
    name: "Bygning",
    optimistic: "-10",
    likely: "100",
    pessimistic: "20",
    ...partial,
  }
}

function driverRow(partial: Partial<DriverRow> & { id: string }): DriverRow {
  return {
    name: "Marked",
    optimistic: "-5",
    likely: "0",
    pessimistic: "10",
    ...partial,
  }
}

describe("Define row-anchored popover UX", () => {
  it("A: Definition mode helper remains when no row selected", () => {
    expect(
      shouldShowDefineSelectHint({
        defineModeActive: true,
        selectedRowId: null,
      }),
    ).toBe(true)
    expect(scenarioTableSource()).toContain("inputs.defineSelectHint")
    expect(scenarioTableSource()).toContain("defineMode.onSelectRow")
  })

  it("B: Undefined rows have no definition icon; row select opens popover", () => {
    const undefinedCost = costRow({ id: "c1" })
    expect(costRowHasDefinition(undefinedCost)).toBe(false)
    const src = scenarioTableSource()
    expect(src).toContain("data-define-row-anchor")
    expect(src).toContain("DefineRowPopover")
    expect(src).toContain("defineMode.onSelectRow(dataRow.id)")
    // No "+" entry affordance for undefined rows.
    expect(src).not.toMatch(/define-indicator[\s\S]*Plus/)
  })

  it("C: Saving a valid definition marks the row defined (icon semantics)", () => {
    const before = costRow({ id: "c1" })
    expect(costRowHasDefinition(before)).toBe(false)
    const after = withCostDescription(before, "Fasade og bæresystem")
    expect(costRowHasDefinition(after)).toBe(true)
    expect(after.description).toBe("Fasade og bæresystem")
    expect(scenarioTableSource()).toContain("defineMode.onClearSelection()")
    expect(scenarioTableSource()).toContain("withCostDescription")
  })

  it("D: Defined-row icon supports hover preview and click-to-edit", () => {
    const src = scenarioTableSource()
    expect(src).toContain("data-define-indicator")
    expect(src).toContain("scheduleDefinePreviewOpen")
    expect(src).toContain("DefineRowPreviewTooltip")
    expect(src).toContain("onClick={(event) => {")
    expect(src).toContain("defineMode.onSelectRow(row.id)")
    expect(popoverSource()).toContain("data-define-row-preview")
    const defined = costRow({ id: "c1", description: "Existing note" })
    expect(costRowHasDefinition(defined)).toBe(true)
    expect(defined.description).toBe("Existing note")
  })

  it("E: Cancel clears selection without requiring a save mutation path", () => {
    const src = scenarioTableSource()
    expect(src).toContain("onCancel={() => defineMode.onClearSelection()}")
    const row = costRow({ id: "c1", description: "Keep" })
    // Cancel does not call withCostDescription — draft discard only.
    expect(costRowHasDefinition(row)).toBe(true)
    expect(row.description).toBe("Keep")
  })

  it("F: Leaving Definition mode closes editor/preview wiring", () => {
    const src = scenarioTableSource()
    expect(src).toContain("if (defineMode?.active) return")
    expect(src).toContain("setDefinePreviewRowId(null)")
    expect(src).toContain("defineSelectedRow && defineMode?.active")
  })

  it("G: Below-table editor surface is removed", () => {
    const src = scenarioTableSource()
    expect(src).toContain("DefineRowPopover")
    expect(popoverSource()).toContain("data-define-row-popover")
    // Editor is no longer a direct sibling block below the grid host.
    expect(src).not.toMatch(
      /<\/div>\s*\{defineSelectedRow && defineMode\?\.active \? \(\s*variant === "costMixed"/,
    )
    expect(src).not.toMatch(
      /className="mt-2 space-y-2 rounded-md border border-border\/80 bg-card/,
    )
  })

  it("H: Cost and driver both use the popover editor", () => {
    const src = scenarioTableSource()
    expect(src).toContain('kind="cost"')
    expect(src).toContain('kind="driver"')
    expect(src).toContain("withDriverDescription")
    expect(src).toContain("withDriverUncertaintyNotes")
    expect(src).toContain('popoverKind=')
    expect(src).toContain(
      "w-[min(40rem,calc(100vw-1.5rem))] max-h-[min(70vh,36rem)] overflow-y-auto",
    )
    expect(driverRowHasDefinition(driverRow({ id: "d1" }))).toBe(false)
    expect(
      driverRowHasDefinition(
        withDriverDescription(driverRow({ id: "d1" }), "Markedseffekter"),
      ),
    ).toBe(true)
  })

  it("I: Definition data semantics unchanged", () => {
    const cost = withCostDescription(costRow({ id: "c1" }), "  note  ")
    expect(cost.description).toBe("note")
    const cleared = withCostDescription(cost, "   ")
    expect(cleared.description).toBeUndefined()
    expect(costRowHasDefinition(cleared)).toBe(false)
  })

  it("Popover prefers the right side when space allows", () => {
    const anchor = {
      top: 100,
      left: 100,
      right: 120,
      bottom: 134,
      width: 20,
      height: 34,
      x: 100,
      y: 100,
      toJSON() {
        return this
      },
    } as DOMRect
    const pos = positionDefinePopover(anchor, 200, 120, {
      width: 1200,
      height: 800,
    })
    expect(pos.left).toBeGreaterThanOrEqual(anchor.right)
    expect(pos.top).toBeGreaterThanOrEqual(0)
  })

  it("Portal targets #portal to avoid grid clipping", () => {
    expect(popoverSource()).toContain('getElementById("portal")')
    expect(popoverSource()).toContain("createPortal")
  })
})
