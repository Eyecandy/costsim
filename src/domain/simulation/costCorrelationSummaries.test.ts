import { describe, expect, it, vi, beforeEach, afterEach } from "vitest"

import {
  CORRELATION_SAVE_CONFIRM_MS,
  deriveSavedCorrelationSummaries,
  formatSavedCorrelationSummaryLabel,
  isUniformCorrelationClique,
} from "@/domain/simulation/costCorrelationSummaries"
import {
  applyCostCorrelationGroupPatch,
  applyCostCorrelationPairPatch,
  getSelectedGroupCorrelationState,
} from "@/domain/analysis/project"
import { messages } from "@/i18n/messages"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import {
  shouldShowCorrelationGroupControls,
  shouldShowCorrelationSelectInstruction,
} from "@/components/ScenarioPercentTable"
import { repoRoot } from "@/test-utils/repoRoot"


function appSource() {
  return readFileSync(join(repoRoot, "src/App.tsx"), "utf8")
}

function scenarioTableSource() {
  return readFileSync(
    join(repoRoot, "src/components/ScenarioPercentTable.tsx"),
    "utf8",
  )
}

const rows = [
  { id: "a", name: "Bygg" },
  { id: "b", name: "VVS" },
  { id: "c", name: "Elektro" },
  { id: "d", name: "Utendørs" },
]

describe("deriveSavedCorrelationSummaries", () => {
  it("A: saved non-zero correlations are derived for Correlation overview", () => {
    const store = applyCostCorrelationPairPatch(undefined, "a", "b", "0.5")
    const summaries = deriveSavedCorrelationSummaries(rows, store)
    expect(summaries).toHaveLength(1)
    expect(summaries[0]).toMatchObject({
      rowIds: ["a", "b"],
      rho: 0.5,
      kind: "pair",
    })
  })

  it("B: uniform complete group is summarized as one group", () => {
    const store = applyCostCorrelationGroupPatch(
      undefined,
      ["a", "b", "c"],
      "0.5",
    )
    const summaries = deriveSavedCorrelationSummaries(rows, store)
    expect(summaries).toHaveLength(1)
    expect(summaries[0]?.kind).toBe("group")
    expect(summaries[0]?.rowIds).toEqual(["a", "b", "c"])
    expect(summaries[0]?.rho).toBe(0.5)
    expect(
      isUniformCorrelationClique(store, ["a", "b", "c"], 0.5),
    ).toBe(true)
    const label = formatSavedCorrelationSummaryLabel({
      summary: summaries[0]!,
      nameById: new Map(rows.map((r) => [r.id, r.name])),
      language: "no",
      costItemsWord: "kostnadsposter",
    })
    expect(label).toBe("Bygg + VVS + Elektro · 0,5")
  })

  it("C: mixed pair values are not falsely summarized as one group", () => {
    let store = applyCostCorrelationPairPatch(undefined, "a", "b", "0.3")
    store = applyCostCorrelationPairPatch(store, "a", "c", "0.5")
    store = applyCostCorrelationPairPatch(store, "b", "c", "0.5")
    const summaries = deriveSavedCorrelationSummaries(rows, store)
    expect(summaries.some((s) => s.rowIds.length === 3)).toBe(false)
    expect(
      summaries.some(
        (s) =>
          s.rowIds.length === 2 &&
          s.rowIds.includes("a") &&
          s.rowIds.includes("b") &&
          s.rho === 0.3,
      ),
    ).toBe(true)
    expect(
      summaries.filter((s) => s.rho === 0.5 && s.kind === "pair"),
    ).toHaveLength(2)
  })

  it("L: zero correlations are omitted from overview", () => {
    let store = applyCostCorrelationGroupPatch(
      undefined,
      ["a", "b", "c"],
      "0.5",
    )
    store = applyCostCorrelationGroupPatch(store, ["a", "b", "c"], "0")
    expect(deriveSavedCorrelationSummaries(rows, store)).toEqual([])
  })

  it("M: overlapping edits update overview truthfully", () => {
    let store = applyCostCorrelationGroupPatch(
      undefined,
      ["a", "b", "c"],
      "0.5",
    )
    expect(deriveSavedCorrelationSummaries(rows, store)).toHaveLength(1)
    store = applyCostCorrelationGroupPatch(store, ["a", "b"], "0.3")
    const summaries = deriveSavedCorrelationSummaries(rows, store)
    expect(
      summaries.some(
        (s) =>
          s.rowIds.length === 3 && s.rho === 0.5,
      ),
    ).toBe(false)
    expect(
      summaries.some(
        (s) =>
          s.rowIds.includes("a") &&
          s.rowIds.includes("b") &&
          s.rowIds.length === 2 &&
          s.rho === 0.3,
      ),
    ).toBe(true)
    expect(
      summaries.filter((s) => s.rho === 0.5),
    ).toHaveLength(2)
  })

  it("N: pairwise matrix remains source of truth (no separate group store)", () => {
    const src = readFileSync(
      join(repoRoot, "src/domain/simulation/costCorrelationSummaries.ts"),
      "utf8",
    )
    expect(src).toContain("deriveSavedCorrelationSummaries")
    expect(src).not.toContain("persistentGroup")
    expect(appSource()).not.toContain("correlationGroups")
  })

  it("truncates long groups to cost-item count", () => {
    const nine = Array.from({ length: 9 }, (_, i) => ({
      id: `c${i}`,
      name: `Item ${i}`,
    }))
    const store = applyCostCorrelationGroupPatch(
      undefined,
      nine.map((r) => r.id),
      "0.5",
    )
    const summaries = deriveSavedCorrelationSummaries(nine, store)
    expect(summaries).toHaveLength(1)
    expect(
      formatSavedCorrelationSummaryLabel({
        summary: summaries[0]!,
        nameById: new Map(nine.map((r) => [r.id, r.name])),
        language: "en",
        costItemsWord: "cost items",
      }),
    ).toBe("9 cost items · 0.5")
  })
})

describe("correlation overview UX wiring", () => {
  it("D/E: opening a summary selects rows without mutating via onOpenSummary", () => {
    const app = appSource()
    expect(app).toContain("handleOpenCorrelationSummary")
    expect(app).toContain("onOpenSummary: handleOpenCorrelationSummary")
    expect(app).toContain("setCorrelationSelectedCostIds(next)")
    expect(app).toContain("syncCorrelationPendingFromSelection")
    // Opening must not call patch
    const openFn = app.slice(
      app.indexOf("const handleOpenCorrelationSummary"),
      app.indexOf("const handleRemoveCorrelationSummary"),
    )
    expect(openFn).not.toContain("patchProjectCostCorrelationGroup")
  })

  it("F/G/H: successful Apply clears edit state, keeps mode, shows saved confirm", () => {
    const app = appSource()
    const applyFn = app.slice(
      app.indexOf("const handleCostCorrelationGroupApply"),
      app.indexOf("const savedCorrelationSummaries"),
    )
    expect(applyFn).toContain("clearCorrelationEditingState()")
    expect(applyFn).toContain('flashCorrelationFeedback("saved")')
    expect(applyFn).not.toContain("setCorrelationModeActive(false)")
    expect(messages.no.inputs.costCorrelationSaved).toBe("Korrelasjon lagret")
    expect(messages.en.inputs.costCorrelationSaved).toBe("Correlation saved")
    expect(scenarioTableSource()).toContain('t("inputs.costCorrelationSaved")')
    expect(scenarioTableSource()).toContain('role="status"')
  })

  it("I: success confirmation uses timed duration constant", () => {
    expect(CORRELATION_SAVE_CONFIRM_MS).toBeGreaterThanOrEqual(1500)
    expect(CORRELATION_SAVE_CONFIRM_MS).toBeLessThanOrEqual(2000)
    expect(appSource()).toContain("CORRELATION_SAVE_CONFIRM_MS")
  })

  it("J/K: failed Apply keeps selection and does not flash success", () => {
    const applyFn = appSource().slice(
      appSource().indexOf("const handleCostCorrelationGroupApply"),
      appSource().indexOf("const savedCorrelationSummaries"),
    )
    expect(applyFn).toContain("setCorrelationEditBlocked(true)")
    expect(applyFn).toMatch(
      /setCorrelationEditBlocked\(true\)\s*return/,
    )
    const failBranch = applyFn.slice(
      0,
      applyFn.indexOf("setCorrelationEditBlocked(false)"),
    )
    expect(failBranch).not.toContain("flashCorrelationFeedback")
    expect(failBranch).not.toContain("clearCorrelationEditingState")
  })

  it("remove control zeros represented pairs only; overlaps preserved", () => {
    let store = applyCostCorrelationGroupPatch(
      undefined,
      ["a", "b", "c"],
      "0.5",
    )
    store = applyCostCorrelationPairPatch(store, "a", "d", "0.3")
    const before = deriveSavedCorrelationSummaries(rows, store)
    expect(before.some((s) => s.rowIds.length === 3 && s.rho === 0.5)).toBe(true)
    expect(
      before.some(
        (s) =>
          s.rowIds.length === 2 &&
          s.rowIds.includes("a") &&
          s.rowIds.includes("d") &&
          s.rho === 0.3,
      ),
    ).toBe(true)

    store = applyCostCorrelationGroupPatch(store, ["a", "b", "c"], "0")
    const after = deriveSavedCorrelationSummaries(rows, store)
    expect(after.some((s) => s.rowIds.length === 3)).toBe(false)
    expect(
      after.some(
        (s) =>
          s.rowIds.includes("a") &&
          s.rowIds.includes("d") &&
          s.rho === 0.3,
      ),
    ).toBe(true)
  })

  it("A/G/J/K: summary remove control is wired and does not open edit", () => {
    const src = scenarioTableSource()
    expect(src).toContain("onRemoveSummary")
    expect(src).toContain("corr-summary-remove")
    expect(src).toContain('t("inputs.costCorrelationRemove")')
    expect(src).toContain("event.stopPropagation()")
    expect(messages.no.inputs.costCorrelationRemove).toBe("Fjern korrelasjon")
    expect(messages.en.inputs.costCorrelationRemove).toBe("Remove correlation")
    expect(messages.no.inputs.costCorrelationRemoved).toBe("Korrelasjon fjernet")
    expect(messages.en.inputs.costCorrelationRemoved).toBe("Correlation removed")

    const css = readFileSync(join(repoRoot, "src/index.css"), "utf8")
    expect(css).toContain(".corr-summary-remove")
    expect(css).toContain("@media (hover: none)")
    expect(css).toMatch(
      /\.group\\\/corr-summary:hover \.corr-summary-remove/,
    )

    const app = appSource()
    expect(app).toContain("handleRemoveCorrelationSummary")
    expect(app).toContain('flashCorrelationFeedback("removed")')
    const removeFn = app.slice(
      app.indexOf("const handleRemoveCorrelationSummary"),
      app.indexOf("const handleCostCorrelationGroupApply"),
    )
    expect(removeFn).toContain('"0"')
    expect(removeFn).not.toContain("setCorrelationModeActive(false)")
    expect(removeFn).not.toContain("onOpenSummary")
  })

  it("pair remove affects only that pair", () => {
    let store = applyCostCorrelationPairPatch(undefined, "a", "b", "0.3")
    store = applyCostCorrelationPairPatch(store, "a", "c", "0.5")
    store = applyCostCorrelationGroupPatch(store, ["a", "b"], "0")
    const summaries = deriveSavedCorrelationSummaries(rows, store)
    expect(
      summaries.some(
        (s) => s.rowIds.includes("a") && s.rowIds.includes("b"),
      ),
    ).toBe(false)
    expect(
      summaries.some(
        (s) =>
          s.rowIds.includes("a") &&
          s.rowIds.includes("c") &&
          s.rho === 0.5,
      ),
    ).toBe(true)
  })

  it("I: summary editing behavior remains (onOpenSummary still present)", () => {
    expect(scenarioTableSource()).toContain("onOpenSummary")
    expect(appSource()).toContain("handleOpenCorrelationSummary")
  })

  it("idle vs edit control visibility helpers", () => {
    expect(
      shouldShowCorrelationSelectInstruction({
        correlationActive: true,
        selectedCount: 0,
      }),
    ).toBe(true)
    expect(
      shouldShowCorrelationSelectInstruction({
        correlationActive: true,
        selectedCount: 0,
        saveConfirmVisible: true,
      }),
    ).toBe(false)
    expect(
      shouldShowCorrelationGroupControls({
        correlationActive: true,
        selectedCount: 2,
      }),
    ).toBe(true)
  })

  it("O: Impact mode wiring remains (driver select + cost impact sliders)", () => {
    const src = scenarioTableSource()
    expect(src).toContain("driverImpactMode.onSelectDriver")
    expect(src).toContain("costImpactSliders.selectedDriverRowId !== null")
    expect(src).toContain("snapDriverImpactPercent")
  })

  it("clicking summary initializes uniform slider state", () => {
    const store = applyCostCorrelationGroupPatch(
      undefined,
      ["a", "b", "c"],
      "0.5",
    )
    expect(getSelectedGroupCorrelationState(store, ["a", "b", "c"])).toEqual({
      kind: "uniform",
      value: 0.5,
    })
  })
})

describe("correlation save confirm timing", () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it("I: confirmation visibility window matches constant", () => {
    let visible = false
    const show = () => {
      visible = true
      setTimeout(() => {
        visible = false
      }, CORRELATION_SAVE_CONFIRM_MS)
    }
    show()
    expect(visible).toBe(true)
    vi.advanceTimersByTime(CORRELATION_SAVE_CONFIRM_MS - 1)
    expect(visible).toBe(true)
    vi.advanceTimersByTime(1)
    expect(visible).toBe(false)
  })
})
