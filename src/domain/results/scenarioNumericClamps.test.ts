import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { join } from "node:path"

import {
  clampCostLikelyAbs,
  clampCostOptimisticPercent,
  clampCostPessimisticPercent,
  clampDriverLikelyPercent,
} from "@/domain/results/scenarioNumericClamps"
import { normalizeGuidedNumericField } from "@/domain/guided/guidedInput"
import type { CostElementRow, DriverRow } from "@/domain/results/tableRows"
import { repoRoot as root } from "@/test-utils/repoRoot"


function costRow(partial: Partial<CostElementRow> = {}): CostElementRow {
  return {
    id: "c1",
    name: "Cost",
    optimistic: "-10",
    likely: "100",
    pessimistic: "20",
    ...partial,
  }
}

function driverRow(partial: Partial<DriverRow> = {}): DriverRow {
  return {
    id: "d1",
    name: "Driver",
    optimistic: "-10",
    likely: "0",
    pessimistic: "20",
    ...partial,
  }
}

describe("scenario range endpoint sign fold", () => {
  it("optimistic: fold wrong-direction magnitude then clamp [-100, 0]", () => {
    expect(clampCostOptimisticPercent("10")).toBe("-10")
    expect(clampCostOptimisticPercent("-10")).toBe("-10")
    expect(clampCostOptimisticPercent("0")).toBe("0")
    expect(clampCostOptimisticPercent("150")).toBe("-100")
    expect(clampCostOptimisticPercent("-150")).toBe("-100")
    expect(clampCostOptimisticPercent("")).toBe("")
    expect(clampCostOptimisticPercent("   ")).toBe("   ")
  })

  it("pessimistic: fold wrong-direction magnitude then clamp [0, 100]", () => {
    expect(clampCostPessimisticPercent("10")).toBe("10")
    expect(clampCostPessimisticPercent("-10")).toBe("10")
    expect(clampCostPessimisticPercent("0")).toBe("0")
    expect(clampCostPessimisticPercent("150")).toBe("100")
    expect(clampCostPessimisticPercent("-150")).toBe("100")
    expect(clampCostPessimisticPercent("")).toBe("")
    expect(clampCostPessimisticPercent("   ")).toBe("   ")
  })

  it("likely helpers remain sign-agnostic to the new range fold", () => {
    expect(clampCostLikelyAbs("10")).toBe("10")
    expect(clampCostLikelyAbs("-10")).toBe("0")
    expect(clampCostLikelyAbs("")).toBe("")
    expect(
      clampDriverLikelyPercent("5", "-10", "20"),
    ).toBe("5")
    expect(
      clampDriverLikelyPercent("-15", "-10", "20"),
    ).toBe("-10")
  })
})

describe("range sign fold reaches table + Focus + paste paths", () => {
  it("A: ScenarioPercentTable commits and paste use shared O/P clamps", () => {
    const table = readFileSync(
      join(root, "src/features/scenario-tables/ScenarioPercentTable.tsx"),
      "utf8",
    )
    expect(table).toContain("clampCostOptimisticPercent")
    expect(table).toContain("clampCostPessimisticPercent")
    expect(table).toContain("onCellEdited")
    expect(table).toContain("onPaste")
    // No table-local sign fold duplicate.
    expect(table).not.toMatch(/optimistic[\s\S]{0,80}\* -1|Math\.abs\([\s\S]{0,40}optimistic/)
  })

  it("B: Focus normalizeGuidedNumericField inherits shared fold", () => {
    expect(
      normalizeGuidedNumericField({
        kind: "cost",
        field: "optimistic",
        value: "10",
        row: costRow(),
      }),
    ).toBe("-10")
    expect(
      normalizeGuidedNumericField({
        kind: "cost",
        field: "pessimistic",
        value: "-10",
        row: costRow(),
      }),
    ).toBe("10")
    expect(
      normalizeGuidedNumericField({
        kind: "driver",
        field: "optimistic",
        value: "10",
        row: driverRow(),
      }),
    ).toBe("-10")
    expect(
      normalizeGuidedNumericField({
        kind: "driver",
        field: "pessimistic",
        value: "-10",
        row: driverRow(),
      }),
    ).toBe("10")
    // Likely unchanged by range fold.
    expect(
      normalizeGuidedNumericField({
        kind: "cost",
        field: "likely",
        value: "250",
        row: costRow(),
      }),
    ).toBe("250")
  })

  it("C: Focus still routes numeric commits through normalizeGuidedNumericField", () => {
    const guided = readFileSync(
      join(root, "src/features/guided-input/GuidedInputDialog.tsx"),
      "utf8",
    )
    expect(guided).toContain("normalizeGuidedNumericField")
    expect(guided).toContain('commitMode="enter"')
    expect(guided).toContain("GuidedRangeSlider")
  })
})
