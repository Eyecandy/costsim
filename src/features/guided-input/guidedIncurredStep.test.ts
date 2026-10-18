import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { join } from "node:path"

import { messages } from "@/i18n/messages"
import {
  buildGuidedWorkflowSteps,
  clampGuidedWorkflowStepIndex,
  formatGuidedPhaseProgress,
  initialGuidedWorkflowStepIndex,
} from "@/domain/guided/guidedWorkflow"
import {
  normalizeIncurredCosts,
  patchProjectIncurredCosts,
  createProject,
} from "@/domain/analysis/project"
import type { CostElementRow, DriverRow } from "@/domain/results/tableRows"
import { repoRoot } from "@/test-utils/repoRoot"
import { readAppSource } from "@/test-utils/appSource"
import { readGuidedInputSource } from "@/test-utils/guidedInputSource"

function cost(partial: Partial<CostElementRow> & { id: string }): CostElementRow {
  return {
    name: "Bygning",
    optimistic: "-10",
    likely: "100",
    pessimistic: "20",
    ...partial,
  }
}

function driver(partial: Partial<DriverRow> & { id: string }): DriverRow {
  return {
    name: "Marked",
    optimistic: "-5",
    likely: "0",
    pessimistic: "10",
    ...partial,
  }
}

describe("guided incurred costs step", () => {
  it("A: Cost Items flow is Assumptions → Incurred → Estimate uncertainty → Cost items", () => {
    const steps = buildGuidedWorkflowSteps({
      entry: "cost",
      costRows: [cost({ id: "c1" })],
      driverRows: [driver({ id: "d1" })],
    })
    expect(steps.map((s) => s.phase)).toEqual([
      "focusIntro",
      "projectProfile",
      "assumptions",
      "incurred",
      "estimateUncertaintyIntro",
      "cost",
      "correlation",
      "driversIntro",
      "driver",
      "impact",
      "simulation",
    ])
  })

  it("B/C: Previous from first cost → estimate-uncertainty intro → incurred → assumptions", () => {
    const steps = buildGuidedWorkflowSteps({
      entry: "cost",
      costRows: [cost({ id: "c1" }), cost({ id: "c2", name: "VVS" })],
      driverRows: [driver({ id: "d1" })],
    })
    const firstCost = steps.findIndex((s) => s.phase === "cost")
    expect(steps[firstCost - 1]?.phase).toBe("estimateUncertaintyIntro")
    expect(steps[firstCost - 2]?.phase).toBe("incurred")
    expect(steps[firstCost - 3]?.phase).toBe("assumptions")

    let i = firstCost
    i = clampGuidedWorkflowStepIndex(i - 1, steps.length)
    expect(steps[i]?.phase).toBe("estimateUncertaintyIntro")
    i = clampGuidedWorkflowStepIndex(i - 1, steps.length)
    expect(steps[i]?.phase).toBe("incurred")
    i = clampGuidedWorkflowStepIndex(i - 1, steps.length)
    expect(steps[i]?.phase).toBe("assumptions")
  })

  it("D/E: displays project incurred value and patch updates authoritative state", () => {
    const dialog = readGuidedInputSource()
    expect(dialog).toContain("project.incurredCosts")
    expect(dialog).toContain("onIncurredCostsChange")
    expect(dialog).toContain("normalizeIncurredCosts")
    expect(dialog).toContain("clampCostLikelyAbs")
    expect(dialog).toContain('data-guided-phase="incurred"')

    const base = createProject({ id: "p1", name: "A" })
    expect(base.incurredCosts).toBe(0)
    const next = patchProjectIncurredCosts([base], "p1", 250_000)
    expect(next[0]!.incurredCosts).toBe(250_000)
    expect(normalizeIncurredCosts("")).toBe(0)
  })

  it("F: App wires incurred through patchProjectIncurredCosts (stale path)", () => {
    const app = readAppSource()
    expect(app).toContain("onIncurredCostsChange=")
    expect(app).toContain("patchProjectIncurredCosts(prev, activeProject.id, value)")
  })

  it("G: incurred step is non-blocking (no next guard)", () => {
    const dialog = readGuidedInputSource()
    const incurred = dialog.slice(
      dialog.indexOf("function GuidedIncurredPhase"),
      dialog.indexOf("function phaseTitle"),
    )
    expect(incurred).not.toContain("disabled")
    expect(incurred).not.toContain("canNext")
  })

  it("H: Drivers guided entry lands on Drivers intro within the full workflow", () => {
    const steps = buildGuidedWorkflowSteps({
      entry: "driver",
      costRows: [cost({ id: "c1" })],
      driverRows: [driver({ id: "d1" })],
    })
    expect(steps.some((s) => s.phase === "incurred")).toBe(true)
    expect(steps.some((s) => s.phase === "assumptions")).toBe(true)
    expect(steps.some((s) => s.phase === "projectProfile")).toBe(true)
    const land = steps.findIndex((s) => s.phase === "driversIntro")
    expect(land).toBeGreaterThan(0)
    expect(steps.slice(land).map((s) => s.phase)).toEqual([
      "driversIntro",
      "driver",
      "impact",
      "simulation",
    ])
  })

  it("I: Correlation/Impact resume targets unchanged", () => {
    const steps = buildGuidedWorkflowSteps({
      entry: "cost",
      costRows: [cost({ id: "c1" })],
      driverRows: [driver({ id: "d1" })],
    })
    expect(steps.find((s) => s.phase === "correlation")?.phase).toBe("correlation")
    expect(steps.find((s) => s.phase === "impact")?.phase).toBe("impact")
    const workflow = readFileSync(join(repoRoot, "src/domain/guided/guidedWorkflow.ts"), "utf8")
    expect(workflow).toContain("phase: GuidedResumeAfter")
  })

  it("J: incurred is not modelled as an uncertainty factor in guided UI", () => {
    const dialog = readGuidedInputSource()
    const incurred = dialog.slice(
      dialog.indexOf("function GuidedIncurredPhase"),
      dialog.indexOf("function phaseTitle"),
    )
    expect(incurred).not.toContain("GuidedRangeSlider")
    expect(incurred).not.toContain("optimistic")
    expect(incurred).not.toContain("pessimistic")
    expect(incurred).not.toContain("P10")
    expect(incurred).not.toContain("P90")
  })

  it("progress label has no row count", () => {
    expect(
      formatGuidedPhaseProgress({
        step: { phase: "incurred" },
        language: "no",
      }),
    ).toBe("")
    expect(messages.no.inputs.guidedPhaseIncurred).toBe("Påløpte kostnader")
    expect(messages.en.inputs.guidedPhaseIncurred).toBe("Incurred costs")
  })

  it("cost resume startRowIndex accounts for incurred + estimate-uncertainty intro", () => {
    const steps = buildGuidedWorkflowSteps({
      entry: "cost",
      costRows: [cost({ id: "c1" }), cost({ id: "c2", name: "VVS" })],
      driverRows: [driver({ id: "d1" })],
    })
    expect(
      initialGuidedWorkflowStepIndex({
        entry: "cost",
        steps,
        startRowIndex: 1,
      }),
    ).toBe(6) // entry hierarchy + assumptions + incurred + intro + first cost
    expect(steps[6]).toMatchObject({ phase: "cost", rowId: "c2" })
  })
})
