import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { join } from "node:path"

import { DEFAULT_RESULT_PREFERENCES } from "@/lib/resultPreferences"
import { buildKeyFigureMetricTableRows } from "@/lib/keyFiguresMetricRows"
import { resolveResultView } from "@/lib/resultPreferences"
import {
  keyFigureHasInlinePercent,
  listVisibleComparableKeyFigureRowIds,
  listVisibleKeyFigureRowIds,
} from "@/lib/keyFigureVisibility"
import { selectComparisonKeyFigures } from "@/lib/checkpointComparisonPresentation"

const repoRoot = join(import.meta.dirname, "../..")

function read(pathFromRepo: string) {
  return readFileSync(join(repoRoot, pathFromRepo), "utf8")
}

const labels = {
  baseCost: "Base",
  expectedAddition: "EA",
  expectedValue: "EV",
  uncertaintyPremium: "UR",
  stdDev: "SD",
  probabilityAtBaseCost: "Pbase",
  probabilityBelowCostLevel: "P below {amount}",
  locked: "Locked",
}

describe("shared Key Figure visibility", () => {
  it("matches buildKeyFigureMetricTableRows order for default prefs", () => {
    const prefs = DEFAULT_RESULT_PREFERENCES
    const view = resolveResultView(prefs)
    const rows = buildKeyFigureMetricTableRows({
      resultView: view,
      projects: [{ id: "p1", incurredCosts: 0 }],
      valuesByProjectId: new Map([["p1", [100, 110, 120]]]),
      baseCostByProjectId: new Map([["p1", 100]]),
      simulatedIncurredByProjectId: new Map([["p1", 0]]),
      language: "en",
      labels,
    })
    expect(listVisibleKeyFigureRowIds(prefs.keyFigures)).toEqual(
      rows.map((r) => r.id),
    )
  })

  it("hides P85 and Expected Value when toggled off; keeps shared order", () => {
    const prefs = {
      ...DEFAULT_RESULT_PREFERENCES,
      keyFigures: {
        ...DEFAULT_RESULT_PREFERENCES.keyFigures,
        showExpectedValue: false,
        percentiles: [50],
        showUncertaintyReserve: true,
        showBaseCost: true,
        showExpectedAddition: false,
        showStdDev: false,
        showProbabilityAtBaseCost: false,
        probabilityBelowCostLevel: {
          enabled: false,
          amount: null,
        },
      },
    }
    const view = resolveResultView(prefs)
    const rows = buildKeyFigureMetricTableRows({
      resultView: view,
      projects: [{ id: "p1", incurredCosts: 0 }],
      valuesByProjectId: new Map([["p1", [100, 110, 120]]]),
      baseCostByProjectId: new Map([["p1", 100]]),
      simulatedIncurredByProjectId: new Map([["p1", 0]]),
      language: "en",
      labels,
    })
    const visible = listVisibleKeyFigureRowIds(prefs.keyFigures)
    expect(visible).toEqual(rows.map((r) => r.id))
    expect(visible).toEqual(["baseCost", "p50", "uncertaintyReserve"])
    expect(visible).not.toContain("p85")
    expect(visible).not.toContain("expectedValue")
  })

  it("selectComparisonKeyFigures follows the same preference order without % rows", () => {
    const prefs = DEFAULT_RESULT_PREFERENCES.keyFigures
    const ordered = listVisibleComparableKeyFigureRowIds(prefs)
    expect(ordered).toEqual(listVisibleKeyFigureRowIds(prefs))
    expect(ordered).not.toContain("expectedAdditionPct")
    expect(ordered).not.toContain("uncertaintyReservePct")
    expect(ordered).not.toContain("stdDevPct")
    expect(keyFigureHasInlinePercent("expectedAddition")).toBe(true)
    expect(keyFigureHasInlinePercent("uncertaintyReserve")).toBe(true)
    expect(keyFigureHasInlinePercent("stdDev")).toBe(true)
    expect(keyFigureHasInlinePercent("baseCost")).toBe(false)

    const deltas = ordered
      .slice()
      .reverse()
      .map((metric) => ({
        metric,
        previous: 1,
        current: 2,
        change: 1,
      }))
    const selected = selectComparisonKeyFigures(deltas, prefs)
    expect(selected.map((r) => r.metric)).toEqual(ordered)
  })

  it("hides the whole comparison row when the Key Figure preference is off", () => {
    const prefs = {
      ...DEFAULT_RESULT_PREFERENCES.keyFigures,
      showExpectedAddition: false,
      showUncertaintyReserve: false,
      showStdDev: false,
    }
    const ordered = listVisibleComparableKeyFigureRowIds(prefs)
    expect(ordered).not.toContain("expectedAddition")
    expect(ordered).not.toContain("uncertaintyReserve")
    expect(ordered).not.toContain("stdDev")
    expect(ordered).not.toContain("expectedAdditionPct")
  })

  it("does not introduce separate comparison preference state", () => {
    const section = read("src/components/CheckpointComparisonSection.tsx")
    const presentation = read("src/lib/checkpointComparisonPresentation.ts")
    const visibility = read("src/lib/keyFigureVisibility.ts")
    expect(section).toContain("listVisibleComparableKeyFigureRowIds")
    expect(section).toContain("resultPreferences.keyFigures")
    expect(section).not.toContain("comparisonMetricPreferences")
    expect(section).not.toContain("checkpointMetricPreferences")
    expect(presentation).toContain("listVisibleComparableKeyFigureRowIds")
    expect(presentation).toContain("selectComparisonKeyFigures")
    expect(presentation).toContain("formatKeyFigureAbsoluteWithPercent")
    expect(presentation).toContain("comparisonAbsoluteCellParts")
    expect(presentation).toContain("comparisonDeltaCellParts")
    expect(presentation).toContain(" pp")
    expect(visibility).toContain("keyFigureHasInlinePercent")
    expect(visibility).toContain("keyFigureSemanticType")
    expect(visibility).toContain(
      "return listVisibleKeyFigureRowIds(keyFigures).filter(isComparableKeyFigureRowId)",
    )
    expect(visibility).not.toContain('out.push("expectedAdditionPct")')
    expect(section).toContain("KeyFigureMetricValue")
    expect(section).toContain("table-value text-right tabular-nums")
  })
})
