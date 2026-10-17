import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

import { messages } from "@/i18n/messages"
import {
  computeGuidedDriverEndpointEffects,
  deriveGuidedCostAbsolute,
  deriveGuidedCostEffect,
  formatGuidedApproxImpactLabel,
  listGuidedInputRows,
} from "@/lib/guidedInput"
import { computeDeterministicTornado } from "@/lib/deterministicTornado"
import { createProject, type Project } from "@/lib/project"
import type { CostElementRow, DriverRow } from "@/lib/tableRows"
import { emptyScenarioRow } from "@/lib/tableRows"

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = join(__dirname, "../..")

function guidedDialogSource() {
  return readFileSync(
    join(repoRoot, "src/components/GuidedInputDialog.tsx"),
    "utf8",
  )
}

function costRow(
  partial: Partial<CostElementRow> & { id: string },
): CostElementRow {
  return {
    name: "Bygning",
    optimistic: "-10",
    likely: "100000000",
    pessimistic: "20",
    ...partial,
  }
}

function driverRow(
  partial: Partial<DriverRow> & { id: string },
): DriverRow {
  return {
    name: "Marked",
    optimistic: "-5",
    likely: "0",
    pessimistic: "10",
    ...partial,
  }
}

describe("Guided Input O/M/P presentation", () => {
  it("A: Cost O/M/P primary values align horizontally", () => {
    const src = guidedDialogSource()
    expect(src).toContain('data-guided-cost-range=""')
    expect(src).toContain('data-guided-omp-align="primary"')
    expect(src).toContain(
      "grid grid-rows-[auto_2.25rem_1.25rem_auto] items-center",
    )
    expect(src).toContain("sm:grid-cols-3")
  })

  it("B: Driver O/M/P primary values align horizontally", () => {
    const src = guidedDialogSource()
    expect(src).toContain('data-guided-driver-range=""')
    expect(src).toContain('data-guided-omp-align="primary"')
    expect(src).toContain("sideCardClassName")
    expect(src).toContain("modeCardClassName")
  })

  it("C: Cost P10 monetary display = signed deviation from M, not endpoint total", () => {
    expect(deriveGuidedCostEffect("1000000000", "-20")).toBe(-200_000_000)
    expect(deriveGuidedCostAbsolute("1000000000", "-20")).toBe(800_000_000)
    expect(formatGuidedApproxImpactLabel(-200_000_000, "no")).toBe(
      "≈ −200 mill.",
    )
    const src = guidedDialogSource()
    expect(src).toContain("deriveGuidedCostEffect")
    expect(src).toContain("data-guided-cost-p10-effect")
    expect(src).not.toContain("data-guided-cost-p10-abs")
  })

  it("D: Cost P90 monetary display = signed deviation from M, not endpoint total", () => {
    expect(deriveGuidedCostEffect("1000000000", "30")).toBe(300_000_000)
    expect(deriveGuidedCostAbsolute("1000000000", "30")).toBe(1_300_000_000)
    expect(formatGuidedApproxImpactLabel(300_000_000, "no")).toBe(
      "≈ +300 mill.",
    )
    expect(guidedDialogSource()).toContain("data-guided-cost-p90-effect")
    expect(guidedDialogSource()).not.toContain("data-guided-cost-p90-abs")
  })

  it("E: Cost O percentage click-to-edit", () => {
    const src = guidedDialogSource()
    expect(src).toContain("GuidedInlineValue")
    expect(src).toContain('field="optimistic"')
    expect(src).toContain("data-guided-cost-p10-pct")
    expect(src).toContain('data-guided-inline-display={field}')
  })

  it("F: Cost P percentage click-to-edit", () => {
    const src = guidedDialogSource()
    expect(src).toContain('field="pessimistic"')
    expect(src).toContain("data-guided-cost-p90-pct")
  })

  it("G: Driver O percentage click-to-edit", () => {
    const src = guidedDialogSource()
    expect(src).toContain("data-guided-driver-p10")
    expect(src).toContain('field="optimistic"')
    expect(src).toContain('data-guided-driver-range=""')
  })

  it("H: Driver P percentage click-to-edit", () => {
    const src = guidedDialogSource()
    expect(src).toContain("data-guided-driver-p90")
    expect(src).toContain('field="pessimistic"')
  })

  it("I: O/P inline edit synchronizes with slider", () => {
    const src = guidedDialogSource()
    expect(src).toContain('onCommit={(next) => patchNumeric("optimistic", next)}')
    expect(src).toContain('onCommit={(v) => commitPercentField("optimistic", v)}')
    expect(src).toContain('onCommit={(next) => patchNumeric("pessimistic", next)}')
    expect(src).toContain('onCommit={(v) => commitPercentField("pessimistic", v)}')
  })

  it("J: M inline edit remains functional with Enter commit", () => {
    const src = guidedDialogSource()
    expect(src).toContain('field="likely"')
    expect(src).toContain("data-guided-cost-m-abs")
    expect(src).toContain("data-guided-driver-m")
    expect(src).toContain('e.key === "Enter"')
    expect(src).toContain('e.key === "Escape"')
    expect(src).toContain("onBlur")
    expect(src).toContain("skipBlurAction")
    expect(src).toContain('commitMode="enter"')
  })

  it("K: Driver M slider is rendered and functional", () => {
    const src = guidedDialogSource()
    expect(src).toContain("GUIDED_DRIVER_MODE_SLIDER_RANGE")
    expect(src).toContain('testId="driver-m"')
    expect(src).toContain('onCommit={(v) => commitPercentField("likely", v)}')
  })

  it("M: no duplicate permanent endpoint input fields", () => {
    const src = guidedDialogSource()
    expect(src).not.toContain("value={current.optimistic}")
    expect(src).not.toContain("value={current.pessimistic}")
    expect(src).not.toContain('type="number"')
    expect(src).toContain("data-guided-inline-edit={field}")
  })

  it("blank cost effect stays null / em-dash", () => {
    expect(deriveGuidedCostEffect("", "-15")).toBeNull()
    expect(deriveGuidedCostEffect("100", "")).toBeNull()
    expect(formatGuidedApproxImpactLabel(null, "no")).toBe("—")
  })

  it("incomplete input still does not block navigation", () => {
    const src = guidedDialogSource()
    expect(src).not.toContain("guidedRowBlocksAdvance")
    expect(
      listGuidedInputRows([emptyScenarioRow(), costRow({ id: "c1" })]).map(
        (r) => r.id,
      ),
    ).toEqual(["c1"])
  })

  it("effect hint copy exists", () => {
    expect(messages.no.inputs.guidedDriverEffectHint).toMatch(/0\s*%/)
    expect(messages.en.inputs.guidedDriverEffectHint).toMatch(/0%/)
  })
})

describe("Guided driver monetary effects vs common 0% reference", () => {
  it("P10/M/P90 all show monetary effect in the dialog", () => {
    const src = guidedDialogSource()
    expect(src).toContain("data-guided-driver-p10-effect")
    expect(src).toContain("data-guided-driver-m-effect")
    expect(src).toContain("data-guided-driver-p90-effect")
    expect(src).toContain("driverEffects.modeEffect")
  })

  it("M non-zero produces non-zero monetary effect", () => {
    const project: Project = {
      ...createProject({ id: "p1", name: "P" }),
      costRows: [costRow({ id: "c1", likely: "1400000000" })],
      driverRows: [
        driverRow({
          id: "d1",
          optimistic: "-5",
          likely: "2",
          pessimistic: "10",
        }),
      ],
    }
    const effects = computeGuidedDriverEndpointEffects(project, "d1")
    expect(effects.modeEffect).toBeCloseTo(28_000_000)
    expect(effects.modeEffect).not.toBe(0)
    expect(effects.p10Effect).toBeCloseTo(-70_000_000)
    expect(effects.p90Effect).toBeCloseTo(140_000_000)
    expect(formatGuidedApproxImpactLabel(effects.modeEffect, "no")).toMatch(
      /^≈ \+28/,
    )
  })

  it("M = 0 produces zero effect (still displayed)", () => {
    const project: Project = {
      ...createProject({ id: "p1", name: "P" }),
      costRows: [costRow({ id: "c1", likely: "500000000" })],
      driverRows: [
        driverRow({
          id: "d1",
          optimistic: "-5",
          likely: "0",
          pessimistic: "10",
        }),
      ],
    }
    const effects = computeGuidedDriverEndpointEffects(project, "d1")
    expect(effects.modeEffect).toBe(0)
    expect(formatGuidedApproxImpactLabel(0, "no")).toBe("≈ 0")
    expect(formatGuidedApproxImpactLabel(0, "en")).toBe("≈ 0")
  })

  it("all three use the same 0% driver reference", () => {
    const project: Project = {
      ...createProject({ id: "p1", name: "P" }),
      costRows: [costRow({ id: "c1", likely: "1000000000" })],
      driverRows: [
        driverRow({
          id: "d1",
          optimistic: "-5",
          likely: "2",
          pessimistic: "10",
        }),
      ],
    }
    const effects = computeGuidedDriverEndpointEffects(project, "d1")
    // Linear 100% impact: effect ≈ base * pct/100 — proportional to pct from 0
    expect(effects.p10Effect! / -5).toBeCloseTo(effects.modeEffect! / 2)
    expect(effects.p90Effect! / 10).toBeCloseTo(effects.modeEffect! / 2)
    // Not relative to M: P10 vs mode-ref would be -7pp → −70m; zero-ref is −50m
    expect(effects.p10Effect).toBeCloseTo(-50_000_000)
    expect(effects.p10Effect).not.toBeCloseTo(-70_000_000)
  })

  it("differentiated impact is respected", () => {
    const full: Project = {
      ...createProject({ id: "p1", name: "P" }),
      costRows: [costRow({ id: "c1", likely: "1000000000" })],
      driverRows: [
        driverRow({ id: "d1", optimistic: "-5", likely: "2", pessimistic: "10" }),
      ],
      driverImpacts: { d1: { c1: "100" } },
    }
    const half: Project = {
      ...full,
      driverImpacts: { d1: { c1: "50" } },
    }
    const eFull = computeGuidedDriverEndpointEffects(full, "d1")
    const eHalf = computeGuidedDriverEndpointEffects(half, "d1")
    expect(eFull.modeEffect).toBeCloseTo(20_000_000)
    expect(eHalf.modeEffect).toBeCloseTo(10_000_000)
    expect(eHalf.p90Effect).toBeCloseTo(eFull.p90Effect! / 2)
  })

  it("incurred cost does not affect the displayed effect", () => {
    const base: Project = {
      ...createProject({ id: "p1", name: "P" }),
      costRows: [costRow({ id: "c1", likely: "1000000000" })],
      driverRows: [
        driverRow({ id: "d1", optimistic: "-5", likely: "2", pessimistic: "10" }),
      ],
      incurredCosts: 0,
    }
    const withIncurred: Project = {
      ...base,
      incurredCosts: 250_000_000,
    }
    const a = computeGuidedDriverEndpointEffects(base, "d1")
    const b = computeGuidedDriverEndpointEffects(withIncurred, "d1")
    expect(b.p10Effect).toBeCloseTo(a.p10Effect!)
    expect(b.modeEffect).toBeCloseTo(a.modeEffect!)
    expect(b.p90Effect).toBeCloseTo(a.p90Effect!)
  })

  it("no simulation is required (pure deterministic helper)", () => {
    const src = readFileSync(join(repoRoot, "src/lib/guidedInput.ts"), "utf8")
    expect(src).toContain("computeTotalFromSampledValues")
    expect(src).not.toMatch(/runSimulation|monteCarlo|sampleTriangular/i)
    // Driver effect helper wiring stays deterministic; Focus may expose App Run separately.
    const dialog = guidedDialogSource()
    expect(dialog).toContain("computeGuidedDriverEndpointEffects")
    expect(dialog).not.toMatch(/sampleTriangular|monteCarlo/i)
  })

  it("Tornado still uses mode reference (model unchanged)", () => {
    const project: Project = {
      ...createProject({ id: "p1", name: "Campus" }),
      costRows: [costRow({ id: "c1", likely: "1000000000" })],
      driverRows: [
        driverRow({
          id: "d1",
          optimistic: "-5",
          likely: "2",
          pessimistic: "10",
        }),
      ],
    }
    const guided = computeGuidedDriverEndpointEffects(project, "d1")
    const tornado = computeDeterministicTornado(project)?.rows.find(
      (r) => r.type === "driver",
    )
    // Tornado: Δ vs mode (+2%). Guided: Δ vs 0%. They differ when M ≠ 0.
    expect(tornado!.lowImpact).toBeCloseTo(-70_000_000) // −5% vs +2% → −7pp
    expect(tornado!.highImpact).toBeCloseTo(80_000_000) // +10% vs +2% → +8pp
    expect(guided.p10Effect).toBeCloseTo(-50_000_000)
    expect(guided.modeEffect).toBeCloseTo(20_000_000)
    expect(guided.p90Effect).toBeCloseTo(100_000_000)
    expect(guided.p10Effect).not.toBeCloseTo(tornado!.lowImpact)
  })

  it("when M = 0, Guided P10/P90 coincide with Tornado (both vs zero)", () => {
    const project: Project = {
      ...createProject({ id: "p1", name: "Campus" }),
      costRows: [costRow({ id: "c1", likely: "95000000" })],
      driverRows: [
        driverRow({
          id: "d1",
          optimistic: "-16",
          likely: "0",
          pessimistic: "16",
        }),
      ],
    }
    const guided = computeGuidedDriverEndpointEffects(project, "d1")
    const row = computeDeterministicTornado(project)?.rows.find(
      (r) => r.type === "driver",
    )
    expect(guided.modeEffect).toBe(0)
    expect(guided.p10Effect).toBeCloseTo(row!.lowImpact)
    expect(guided.p90Effect).toBeCloseTo(row!.highImpact)
  })

  it("insufficient cost input yields null effects", () => {
    const project: Project = {
      ...createProject({ id: "p1", name: "P" }),
      costRows: [costRow({ id: "c1", likely: "" })],
      driverRows: [
        driverRow({ id: "d1", optimistic: "-5", likely: "2", pessimistic: "10" }),
      ],
    }
    expect(computeGuidedDriverEndpointEffects(project, "d1")).toEqual({
      p10Effect: null,
      modeEffect: null,
      p90Effect: null,
    })
  })
})
