import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

import {
  formatCorrelationControlValue,
  isRelationshipEditingModeActive,
  shouldShowCorrelationGroupControls,
  shouldShowCorrelationSelectInstruction,
  shouldShowRelationshipSelectHint,
} from "@/domain/results/scenarioTableModes"
import { messages } from "@/i18n/messages"
import {
  applyCostCorrelationGroupPatch,
  applyCostCorrelationPairPatch,
  buildSimulationCostCorrelationMatrix,
  getSelectedGroupCorrelationState,
  isCostCorrelationGroupPatchValid,
} from "@/domain/analysis/project"
import { repoRoot } from "@/test-utils/repoRoot"


function scenarioTableSource() {
  return readFileSync(
    join(repoRoot, "src/components/ScenarioPercentTable.tsx"),
    "utf8",
  )
}

function appSource() {
  return readFileSync(join(repoRoot, "src/App.tsx"), "utf8")
}

describe("relationship editing mode UX", () => {
  it("A: Impact active + no selected driver shows NO select hint", () => {
    expect(messages.no.inputs.driverImpactSelectHint).toBe(
      "Velg en driver for å justere påvirkning.",
    )
    expect(
      shouldShowRelationshipSelectHint({
        variant: "driverMixed",
        driverImpactMode: { active: true, selectedDriverRowId: null },
      }),
    ).toBe(true)
    expect(scenarioTableSource()).toContain('t("inputs.driverImpactSelectHint")')
  })

  it("B: selecting a driver hides the hint (sliders shown when selection present)", () => {
    expect(
      shouldShowRelationshipSelectHint({
        variant: "driverMixed",
        driverImpactMode: { active: true, selectedDriverRowId: "d1" },
      }),
    ).toBe(false)
    const src = scenarioTableSource()
    expect(src).toContain("showRelationshipSelectHint")
    expect(src).toContain("costImpactSliders.selectedDriverRowId !== null")
  })

  it("C: while Impact is active, name cells are non-editable (click/activate select only)", () => {
    expect(
      isRelationshipEditingModeActive({
        variant: "driverMixed",
        driverImpactModeActive: true,
      }),
    ).toBe(true)
    const src = scenarioTableSource()
    expect(src).toContain("relationshipEditingActive")
    expect(src).toContain("allowOverlay: !blockCellEditing")
    expect(src).toContain("readonly: blockCellEditing")
    expect(src).toContain("onCellActivated={onCellClicked}")
    // Also blocked when the analysis is archived/read-only.
    expect(src).toContain("if (readOnly || relationshipEditingActive) return")
  })

  it("D: turning Impact off restores normal name editing", () => {
    expect(
      isRelationshipEditingModeActive({
        variant: "driverMixed",
        driverImpactModeActive: false,
      }),
    ).toBe(false)
    expect(
      shouldShowRelationshipSelectHint({
        variant: "driverMixed",
        driverImpactMode: { active: false, selectedDriverRowId: null },
      }),
    ).toBe(false)
    const app = appSource()
    expect(app).toContain(
      "if (!impactModeActive) setImpactSelectedDriverId(null)",
    )
  })

  it("E: Correlation mode shows multi-select instruction when fewer than 2 selected", () => {
    expect(messages.no.inputs.costCorrelationSelectHint).toBe(
      "Velg minst to kostnadsposter.",
    )
    expect(messages.en.inputs.costCorrelationSelectHint).toBe(
      "Select at least two cost items.",
    )
    expect(
      shouldShowCorrelationSelectInstruction({
        correlationActive: true,
        selectedCount: 0,
      }),
    ).toBe(true)
    expect(
      shouldShowCorrelationSelectInstruction({
        correlationActive: true,
        selectedCount: 1,
      }),
    ).toBe(true)
    expect(
      shouldShowCorrelationSelectInstruction({
        correlationActive: true,
        selectedCount: 2,
      }),
    ).toBe(false)
    expect(scenarioTableSource()).toContain(
      't("inputs.costCorrelationSelectHint")',
    )
    expect(scenarioTableSource()).toContain("onToggleCostSelection")
  })

  it("F: 2+ selected shows shared slider + Apply; no row-level correlation sliders", () => {
    expect(
      shouldShowCorrelationGroupControls({
        correlationActive: true,
        selectedCount: 2,
      }),
    ).toBe(true)
    expect(
      shouldShowCorrelationGroupControls({
        correlationActive: true,
        selectedCount: 1,
      }),
    ).toBe(false)
    expect(messages.no.inputs.costCorrelationApply).toBe("Bruk")
    expect(messages.en.inputs.costCorrelationApply).toBe("Apply")
    expect(messages.no.inputs.costCorrelationSelectedCount).toBe("{count} valgt")
    expect(messages.en.inputs.costCorrelationSelectedCount).toBe(
      "{count} selected",
    )
    const src = scenarioTableSource()
    expect(src).toContain("onApplyGroupCorrelation")
    expect(src).toContain("showCorrelationGroupControls")
    expect(src).not.toContain("costCorrelationSliders")
    expect(src).not.toContain("onCorrelationChange")
    expect(src).toContain("INLINE_SLIDER_WIDTH_CLASS")
  })

  it("G: while Correlation is active, cost-item name cells are non-editable", () => {
    expect(
      isRelationshipEditingModeActive({
        variant: "costMixed",
        costCorrelationModeActive: true,
      }),
    ).toBe(true)
    expect(
      isRelationshipEditingModeActive({
        variant: "costMixed",
        costCorrelationModeActive: false,
      }),
    ).toBe(false)
  })

  it("H: turning Correlation off clears temporary selection state", () => {
    expect(
      shouldShowCorrelationSelectInstruction({
        correlationActive: false,
        selectedCount: 0,
      }),
    ).toBe(false)
    const app = appSource()
    expect(app).toContain("clearCorrelationEditingState")
    expect(app).toContain("clearCorrelationSaveConfirm")
    expect(app).toContain("correlationSelectedCostIds")
    expect(app).toMatch(
      /if \(!correlationModeActive\) \{\s*clearCorrelationEditingState\(\)/,
    )
  })

  it("I: modes stay mutually exclusive; outside click exits Impact and Correlation", () => {
    expect(messages.en.inputs.driverImpactSelectHint).toBe(
      "Select a driver to adjust impact.",
    )
    const app = appSource()
    expect(app).toContain("setCorrelationModeActive(false)")
    expect(app).toContain("setImpactModeActive(false)")
    expect(app).toContain("deactivateEditingModes")
    expect(app).toMatch(
      /const deactivateEditingModes = useCallback\(\(\) => \{\s*setImpactModeActive\(false\)\s*setCorrelationModeActive\(false\)\s*setDefineModeActive\(false\)/,
    )
    expect(app).toContain(
      "if (!impactModeActive && !correlationModeActive && !defineModeActive) return",
    )
    expect(app).toContain("impactEditingAreaRef.current?.contains(target)")
    expect(app).toContain('document.getElementById("portal")')
    // Outside click must not clear guided resume (toolbar toggle still does).
    const deactivateBody = app.slice(
      app.indexOf("const deactivateEditingModes"),
      app.indexOf(
        "if (!impactModeActive && !correlationModeActive && !defineModeActive) return",
      ),
    )
    expect(deactivateBody).not.toContain("setGuidedResume")
    expect(app).toContain(
      'setGuidedResume((r) => (r?.after === "correlation" ? null : r))',
    )
    const src = scenarioTableSource()
    expect(src).toContain("onCellClicked={onCellClicked}")
    expect(src).toContain("driverImpactMode.onSelectDriver")
    expect(src).toContain("costImpactSliders.selectedDriverRowId !== null")
  })

  it("Correlation click-outside: inside controls stay active; outside exits without mutating saved data", () => {
    const app = appSource()
    const deactivate = app.slice(
      app.indexOf("const deactivateEditingModes"),
      app.indexOf("validSimCostRows"),
    )
    expect(deactivate).toContain("setCorrelationModeActive(false)")
    expect(deactivate).toContain("impactEditingAreaRef")
    expect(deactivate).not.toContain("patchProjectCostCorrelation")
    expect(deactivate).not.toContain("applyCostCorrelation")
    expect(deactivate).not.toContain("setGuidedResume")
    expect(deactivate).not.toContain("setGuidedInputKind")
    // Shared listener covers Correlation + Impact
    expect(deactivate).toContain("correlationModeActive")
    expect(deactivate).toContain("impactModeActive")
    // Cost table + correlation controls live inside the shared editing area
    expect(app).toContain("ref={impactEditingAreaRef}")
    expect(app).toContain("CostTable")
    expect(app).toContain("onApplyGroupCorrelation")
    // Toolbar toggle still works independently
    expect(app).toContain("handleCorrelationModeToggle")
    expect(app).toContain("setCorrelationModeActive(true)")
  })

  it("mixed pending correlation displays as em dash", () => {
    expect(formatCorrelationControlValue(0.5, "no", true)).toBe("—")
    expect(formatCorrelationControlValue(0.5, "no", false)).toBe("+0,5")
    expect(formatCorrelationControlValue(0.5, "en", false)).toBe("+0.5")
    expect(formatCorrelationControlValue(0, "en", false)).toBe("0.0")
  })
})

describe("cost correlation group apply", () => {
  const rows = [{ id: "a" }, { id: "b" }, { id: "c" }, { id: "d" }]

  it("F/P: Apply sets all unique selected-group pairs (9 items → 36 pairs)", () => {
    const nine = Array.from({ length: 9 }, (_, i) => ({ id: `c${i}` }))
    const patched = applyCostCorrelationGroupPatch(undefined, nine.map((r) => r.id), "0.5")
    const matrix = buildSimulationCostCorrelationMatrix(nine, patched)
    let pairs = 0
    for (let i = 0; i < 9; i++) {
      for (let j = i + 1; j < 9; j++) {
        expect(matrix[i]![j]).toBe(0.5)
        expect(matrix[j]![i]).toBe(0.5)
        pairs++
      }
    }
    expect(pairs).toBe(36)
    expect(
      isCostCorrelationGroupPatchValid(nine, undefined, nine.map((r) => r.id), "0.5"),
    ).toBe(true)
  })

  it("I: relationships outside the selected group remain unchanged", () => {
    let store = applyCostCorrelationPairPatch(undefined, "a", "d", "0.2")
    store = applyCostCorrelationGroupPatch(store, ["a", "b", "c"], "0.5")
    const matrix = buildSimulationCostCorrelationMatrix(rows, store)
    expect(matrix[0]![1]).toBe(0.5) // A-B
    expect(matrix[0]![2]).toBe(0.5) // A-C
    expect(matrix[1]![2]).toBe(0.5) // B-C
    expect(matrix[0]![3]).toBe(0.2) // A-D unchanged
    expect(matrix[1]![3]).toBe(0)
    expect(matrix[2]![3]).toBe(0)
  })

  it("J: setting group correlation to zero removes those correlations", () => {
    let store = applyCostCorrelationGroupPatch(undefined, ["a", "b", "c"], "0.5")
    store = applyCostCorrelationGroupPatch(store, ["a", "b", "c"], "0")
    const matrix = buildSimulationCostCorrelationMatrix(rows, store)
    expect(matrix[0]![1]).toBe(0)
    expect(matrix[0]![2]).toBe(0)
    expect(matrix[1]![2]).toBe(0)
  })

  it("G/H: Apply is atomic — invalid candidate changes nothing", () => {
    const base = applyCostCorrelationPairPatch(
      applyCostCorrelationPairPatch(undefined, "a", "b", "0.9"),
      "b",
      "c",
      "0.9",
    )
    const before = structuredClone(base)
    expect(
      isCostCorrelationGroupPatchValid(rows, base, ["a", "c"], "-0.9"),
    ).toBe(false)
    // Caller must not commit when invalid; patch function itself is pure.
    const attempted = applyCostCorrelationGroupPatch(base, ["a", "c"], "-0.9")
    expect(base).toEqual(before)
    expect(
      buildSimulationCostCorrelationMatrix(rows, base),
    ).toEqual(buildSimulationCostCorrelationMatrix(rows, before))
    // Attempted patch would differ, but UI rejects it so stored stays `base`.
    expect(attempted).not.toEqual(base)
  })

  it("K: uniform existing group value is detected for slider init", () => {
    const store = applyCostCorrelationGroupPatch(undefined, ["a", "b", "c"], "0.5")
    expect(getSelectedGroupCorrelationState(store, ["a", "b", "c"])).toEqual({
      kind: "uniform",
      value: 0.5,
    })
  })

  it("L: mixed existing values report mixed and do not mutate data", () => {
    let store = applyCostCorrelationPairPatch(undefined, "a", "b", "0.5")
    store = applyCostCorrelationPairPatch(store, "a", "c", "0.2")
    const snapshot = structuredClone(store)
    expect(getSelectedGroupCorrelationState(store, ["a", "b", "c"])).toEqual({
      kind: "mixed",
    })
    expect(store).toEqual(snapshot)
  })

  it("selected count text uses live count placeholder", () => {
    expect(
      messages.no.inputs.costCorrelationSelectedCount.replace("{count}", "4"),
    ).toBe("4 valgt")
    expect(
      messages.en.inputs.costCorrelationSelectedCount.replace("{count}", "4"),
    ).toBe("4 selected")
  })
})
