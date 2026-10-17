import { describe, expect, it } from "vitest"

import {
  buildGuidedWorkflowSteps,
  clampGuidedWorkflowStepIndex,
  formatGuidedPhaseProgress,
  initialGuidedWorkflowStepIndex,
} from "@/domain/guided/guidedWorkflow"
import type { CostElementRow, DriverRow } from "@/domain/results/tableRows"

function cost(
  partial: Partial<CostElementRow> & { id: string },
): CostElementRow {
  return {
    name: "Bygning",
    optimistic: "-10",
    likely: "100",
    pessimistic: "20",
    ...partial,
  }
}

function driver(
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

describe("guidedWorkflow sequence", () => {
  it("A: Assumptions step exists in full entry after the entry hierarchy", () => {
    const steps = buildGuidedWorkflowSteps({
      entry: "full",
      costRows: [cost({ id: "c1" })],
      driverRows: [driver({ id: "d1" })],
    })
    expect(steps[0]).toEqual({ phase: "focusIntro" })
    expect(steps[1]).toEqual({ phase: "projectProfile" })
    expect(steps[2]).toEqual({ phase: "assumptions" })
  })

  it("E: Estimate uncertainty intro precedes cost items after incurred", () => {
    const steps = buildGuidedWorkflowSteps({
      entry: "full",
      costRows: [cost({ id: "c1" }), cost({ id: "c2", name: "VVS" })],
      driverRows: [driver({ id: "d1" })],
    })
    expect(steps[3]).toEqual({ phase: "incurred" })
    expect(steps[4]).toEqual({ phase: "estimateUncertaintyIntro" })
    expect(steps[5]).toMatchObject({ phase: "cost", rowId: "c1" })
    expect(steps[6]).toMatchObject({ phase: "cost", rowId: "c2" })
  })

  it("F: Correlation step follows last cost item", () => {
    const steps = buildGuidedWorkflowSteps({
      entry: "cost",
      costRows: [cost({ id: "c1" }), cost({ id: "c2", name: "VVS" })],
      driverRows: [driver({ id: "d1" })],
    })
    expect(steps.map((s) => s.phase)).toEqual([
      "focusIntro",
      "projectProfile",
      "assumptions",
      "incurred",
      "estimateUncertaintyIntro",
      "cost",
      "cost",
      "correlation",
      "driversIntro",
      "driver",
      "impact",
      "simulation",
    ])
  })

  it("G: Drivers intro follows correlation confirmation", () => {
    const steps = buildGuidedWorkflowSteps({
      entry: "cost",
      costRows: [cost({ id: "c1" })],
      driverRows: [driver({ id: "d1" }), driver({ id: "d2", name: "PM" })],
    })
    const corr = steps.findIndex((s) => s.phase === "correlation")
    expect(steps[corr + 1]).toEqual({ phase: "driversIntro" })
    expect(steps[corr + 2]).toMatchObject({ phase: "driver", rowId: "d1" })
  })

  it("H: Driver entry uses full workflow and still includes Drivers intro → Impact → Simulation", () => {
    const steps = buildGuidedWorkflowSteps({
      entry: "driver",
      costRows: [],
      driverRows: [driver({ id: "d1" }), driver({ id: "d2", name: "PM" })],
    })
    expect(steps[0]?.phase).toBe("focusIntro")
    expect(steps.some((s) => s.phase === "projectProfile")).toBe(true)
    expect(steps.some((s) => s.phase === "assumptions")).toBe(true)
    const intro = steps.findIndex((s) => s.phase === "driversIntro")
    expect(intro).toBeGreaterThan(0)
    expect(steps.slice(intro).map((s) => s.phase)).toEqual([
      "driversIntro",
      "driver",
      "driver",
      "impact",
      "simulation",
    ])
  })

  it("I: Simulation follows impact", () => {
    const steps = buildGuidedWorkflowSteps({
      entry: "driver",
      costRows: [],
      driverRows: [driver({ id: "d1" })],
    })
    expect(steps.at(-1)).toEqual({ phase: "simulation" })
    expect(steps.at(-2)).toEqual({ phase: "impact" })
  })

  it("J: Previous navigation crosses section boundaries via flat index", () => {
    const steps = buildGuidedWorkflowSteps({
      entry: "cost",
      costRows: [cost({ id: "c1" })],
      driverRows: [driver({ id: "d1" })],
    })
    let i = steps.findIndex((s) => s.phase === "cost")
    i = clampGuidedWorkflowStepIndex(i - 1, steps.length)
    expect(steps[i]?.phase).toBe("estimateUncertaintyIntro")
    i = clampGuidedWorkflowStepIndex(i - 1, steps.length)
    expect(steps[i]?.phase).toBe("incurred")
    i = clampGuidedWorkflowStepIndex(i - 1, steps.length)
    expect(steps[i]?.phase).toBe("assumptions")
    i = clampGuidedWorkflowStepIndex(i - 1, steps.length)
    expect(steps[i]?.phase).toBe("projectProfile")
    i = clampGuidedWorkflowStepIndex(i - 1, steps.length)
    expect(steps[i]?.phase).toBe("focusIntro")
    i = steps.findIndex((s) => s.phase === "driver")
    i = clampGuidedWorkflowStepIndex(i - 1, steps.length)
    expect(steps[i]?.phase).toBe("driversIntro")
    i = clampGuidedWorkflowStepIndex(i - 1, steps.length)
    expect(steps[i]?.phase).toBe("correlation")
  })

  it("cost entry starts with Assumptions then Incurred before estimate-uncertainty intro", () => {
    const steps = buildGuidedWorkflowSteps({
      entry: "cost",
      costRows: [cost({ id: "c1" })],
      driverRows: [],
    })
    expect(steps[2]).toEqual({ phase: "assumptions" })
    expect(steps[3]).toEqual({ phase: "incurred" })
    expect(steps[4]).toEqual({ phase: "estimateUncertaintyIntro" })
    expect(steps[5]).toMatchObject({ phase: "cost", rowId: "c1" })
    expect(steps.find((s) => s.phase === "correlation")?.phase).toBe(
      "correlation",
    )
  })

  it("Cost Items play (startRowIndex 0) opens Assumptions first", () => {
    const steps = buildGuidedWorkflowSteps({
      entry: "cost",
      costRows: [cost({ id: "c1" }), cost({ id: "c2", name: "VVS" })],
      driverRows: [driver({ id: "d1" })],
    })
    expect(
      initialGuidedWorkflowStepIndex({
        entry: "cost",
        steps,
        startRowIndex: 0,
      }),
    ).toBe(2)
    expect(steps[2]?.phase).toBe("assumptions")
  })

  it("Next from Assumptions is Incurred; then intro; then first cost; Previous returns", () => {
    const steps = buildGuidedWorkflowSteps({
      entry: "cost",
      costRows: [cost({ id: "c1" }), cost({ id: "c2", name: "VVS" })],
      driverRows: [driver({ id: "d1" })],
    })
    expect(steps[2]?.phase).toBe("assumptions")
    expect(steps[3]?.phase).toBe("incurred")
    expect(steps[4]?.phase).toBe("estimateUncertaintyIntro")
    expect(steps[5]).toMatchObject({ phase: "cost", rowId: "c1", localIndex: 0 })
    const afterNext = clampGuidedWorkflowStepIndex(3, steps.length)
    expect(steps[afterNext]?.phase).toBe("incurred")
    const toIntro = clampGuidedWorkflowStepIndex(4, steps.length)
    expect(steps[toIntro]?.phase).toBe("estimateUncertaintyIntro")
    const toCost = clampGuidedWorkflowStepIndex(5, steps.length)
    expect(steps[toCost]?.phase).toBe("cost")
    const back = clampGuidedWorkflowStepIndex(toCost - 1, steps.length)
    expect(steps[back]?.phase).toBe("estimateUncertaintyIntro")
  })

  it("driver entry uses full workflow and lands on Drivers intro", () => {
    const driverSteps = buildGuidedWorkflowSteps({
      entry: "driver",
      costRows: [cost({ id: "c1" })],
      driverRows: [driver({ id: "d1" })],
    })
    expect(driverSteps[0]?.phase).toBe("focusIntro")
    expect(driverSteps.some((s) => s.phase === "assumptions")).toBe(true)
    expect(driverSteps.some((s) => s.phase === "incurred")).toBe(true)
    expect(driverSteps.some((s) => s.phase === "correlation")).toBe(true)
    expect(driverSteps.some((s) => s.phase === "estimateUncertaintyIntro")).toBe(
      true,
    )
    expect(driverSteps.some((s) => s.phase === "projectProfile")).toBe(true)
    const land = initialGuidedWorkflowStepIndex({
      entry: "driver",
      steps: driverSteps,
      startRowIndex: 0,
    })
    expect(driverSteps[land]?.phase).toBe("driversIntro")
    expect(land).toBeGreaterThan(0)
  })

  it("initial index respects startRowIndex for cost resume into costs", () => {
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

  it("startPhase focusIntro opens the Focus-mode intro for the cost sequence", () => {
    const steps = buildGuidedWorkflowSteps({
      entry: "cost",
      costRows: [cost({ id: "c1" })],
      driverRows: [driver({ id: "d1" })],
    })
    expect(
      initialGuidedWorkflowStepIndex({
        entry: "cost",
        steps,
        startRowIndex: 0,
        startPhase: "focusIntro",
      }),
    ).toBe(0)
    expect(steps[0]?.phase).toBe("focusIntro")
  })

  it("driver Play (startRowIndex 0) opens Drivers intro first within full sequence", () => {
    const steps = buildGuidedWorkflowSteps({
      entry: "driver",
      costRows: [],
      driverRows: [driver({ id: "d1" }), driver({ id: "d2", name: "PM" })],
    })
    const land = initialGuidedWorkflowStepIndex({
      entry: "driver",
      steps,
      startRowIndex: 0,
    })
    expect(steps[land]?.phase).toBe("driversIntro")
    expect(land).toBeGreaterThan(0)
    // Prior Costs/Project steps remain reachable via Previous.
    expect(steps.slice(0, land).some((s) => s.phase === "assumptions")).toBe(
      true,
    )
    expect(steps.slice(0, land).some((s) => s.phase === "projectProfile")).toBe(
      true,
    )
    const resume = initialGuidedWorkflowStepIndex({
      entry: "driver",
      steps,
      startRowIndex: 1,
    })
    expect(steps[resume]).toMatchObject({ phase: "driver", rowId: "d2" })
  })

  it("phase progress formatting", () => {
    expect(
      formatGuidedPhaseProgress({
        step: {
          phase: "cost",
          rowId: "c1",
          localIndex: 2,
          localTotal: 14,
        },
        language: "no",
      }),
    ).toBe("3 av 14")
    expect(
      formatGuidedPhaseProgress({
        step: {
          phase: "driver",
          rowId: "d1",
          localIndex: 0,
          localTotal: 2,
        },
        language: "en",
      }),
    ).toBe("1 of 2")
    expect(
      formatGuidedPhaseProgress({
        step: { phase: "correlation" },
        language: "no",
      }),
    ).toBe("")
    expect(
      formatGuidedPhaseProgress({
        step: { phase: "estimateUncertaintyIntro" },
        language: "no",
      }),
    ).toBe("")
    expect(
      formatGuidedPhaseProgress({
        step: { phase: "driversIntro" },
        language: "en",
      }),
    ).toBe("")
  })

  it("D: empty costs show intro then costsEmpty — not Correlation", () => {
    const steps = buildGuidedWorkflowSteps({
      entry: "cost",
      costRows: [],
      driverRows: [driver({ id: "d1" })],
    })
    expect(steps[2]?.phase).toBe("assumptions")
    expect(steps[3]?.phase).toBe("incurred")
    expect(steps[4]?.phase).toBe("estimateUncertaintyIntro")
    expect(steps[5]?.phase).toBe("costsEmpty")
    expect(steps.some((s) => s.phase === "correlation")).toBe(false)
  })

  it("empty drivers show intro then driversEmpty then Finish — not Impact", () => {
    const steps = buildGuidedWorkflowSteps({
      entry: "cost",
      costRows: [cost({ id: "c1" })],
      driverRows: [],
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
      "driversEmpty",
      "simulation",
    ])
    expect(steps.some((s) => s.phase === "impact")).toBe(false)
  })
})
