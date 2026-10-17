import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { join } from "node:path"

import { messages } from "@/i18n/messages"
import {
  buildGuidedWorkflowSteps,
  findGuidedWorkflowPhaseIndex,
  type GuidedResumeState,
} from "@/domain/guided/guidedWorkflow"
import { listGuidedInputRows } from "@/domain/guided/guidedInput"
import type { CostElementRow, DriverRow } from "@/domain/results/tableRows"
import { repoRoot } from "@/test-utils/repoRoot"


function appSource() {
  return readFileSync(join(repoRoot, "src/app/App.tsx"), "utf8")
}

function dialogSource() {
  return readFileSync(
    join(repoRoot, "src/features/guided-input/GuidedInputDialog.tsx"),
    "utf8",
  )
}

function tableSource() {
  return readFileSync(
    join(repoRoot, "src/features/scenario-tables/ScenarioPercentTable.tsx"),
    "utf8",
  )
}

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

function blankCost(id: string): CostElementRow {
  return {
    id,
    name: "",
    optimistic: "",
    likely: "",
    pessimistic: "",
  }
}

describe("Guided Input empty Cost Items", () => {
  it("A: empty Cost Items keeps estimate-uncertainty intro then empty — not Correlation", () => {
    const steps = buildGuidedWorkflowSteps({
      entry: "cost",
      costRows: [blankCost("placeholder")],
      driverRows: [driver({ id: "d1" })],
    })
    expect(listGuidedInputRows([blankCost("placeholder")])).toHaveLength(0)
    expect(steps.some((s) => s.phase === "correlation")).toBe(false)
    expect(steps.some((s) => s.phase === "estimateUncertaintyIntro")).toBe(true)
    expect(steps.some((s) => s.phase === "costsEmpty")).toBe(true)
    const intro = steps.findIndex((s) => s.phase === "estimateUncertaintyIntro")
    const empty = steps.findIndex((s) => s.phase === "costsEmpty")
    expect(intro).toBeLessThan(empty)
  })

  it("B: empty-state copy is shown (NO/EN)", () => {
    expect(messages.no.inputs.guidedCostsEmptyHeading).toBe(
      "Ingen kostnadsposter ennå",
    )
    expect(messages.no.inputs.guidedCostsEmptyAdd).toBe(
      "Legg til kostnadsposter",
    )
    expect(messages.en.inputs.guidedCostsEmptyHeading).toBe(
      "No cost items yet",
    )
    expect(messages.en.inputs.guidedCostsEmptyAdd).toBe("Add cost items")
    expect(messages.no.inputs.guidedCostsEmptyGuidance).toContain(
      "kostnadsgrunnlag",
    )
    expect(messages.en.inputs.guidedCostsEmptyGuidance).toContain(
      "cost basis",
    )
    const dialog = dialogSource()
    expect(dialog).toContain('data-guided-phase="costsEmpty"')
    expect(dialog).toContain("guidedCostsEmptyGuidance")
    expect(dialog).toContain("data-guided-add-cost-items")
  })

  it("C–D: Add Cost Items exits Guided Input and stores resume", () => {
    const app = appSource()
    expect(app).toContain("handoffGuidedToAddCostItems")
    const body = app.slice(
      app.indexOf("handoffGuidedToAddCostItems"),
      app.indexOf("handoffGuidedToAddDrivers"),
    )
    expect(body).toContain('after: "costItems"')
    expect(body).toContain("entry: guidedInputKind")
    expect(body).toContain("projectId: activeProject.id")
    expect(body).toContain("setGuidedInputKind(null)")
    expect(body).not.toContain("createEmpty")
    expect(body).not.toContain("optimistic:")
    expect(dialogSource()).toContain("onAddCostItems")
  })

  it("E–F: Back to Guided Review resumes first cost or empty-state", () => {
    const withRows = buildGuidedWorkflowSteps({
      entry: "cost",
      costRows: [cost({ id: "c1" }), cost({ id: "c2", name: "VVS" })],
      driverRows: [],
    })
    const idx = findGuidedWorkflowPhaseIndex(withRows, "costItems")
    expect(withRows[idx]).toMatchObject({ phase: "cost", rowId: "c1" })
    expect(withRows[idx]?.phase).not.toBe("assumptions")

    const stillEmpty = buildGuidedWorkflowSteps({
      entry: "cost",
      costRows: [],
      driverRows: [],
    })
    const emptyIdx = findGuidedWorkflowPhaseIndex(stillEmpty, "costItems")
    expect(stillEmpty[emptyIdx]?.phase).toBe("costsEmpty")
  })

  it("G–H: resume uses live project rows; no P10/P90 gate", () => {
    const nameOnly = cost({
      id: "c1",
      name: "Bygg",
      optimistic: "",
      likely: "50",
      pessimistic: "",
    })
    const steps = buildGuidedWorkflowSteps({
      entry: "cost",
      costRows: [nameOnly],
      driverRows: [],
    })
    expect(steps.some((s) => s.phase === "cost" && s.rowId === "c1")).toBe(
      true,
    )
    expect(steps.some((s) => s.phase === "costsEmpty")).toBe(false)
    // Name + most likely alone is enough to enter cost review (no range gate).
    expect(listGuidedInputRows([nameOnly])).toHaveLength(1)
  })
})

describe("Guided Input empty Drivers", () => {
  it("A–B: empty Drivers does not jump to Impact; shows decision copy", () => {
    const steps = buildGuidedWorkflowSteps({
      entry: "cost",
      costRows: [cost({ id: "c1" })],
      driverRows: [],
    })
    expect(steps.some((s) => s.phase === "impact")).toBe(false)
    expect(steps.some((s) => s.phase === "driversEmpty")).toBe(true)
    expect(messages.no.inputs.guidedDriversEmptyHeading).toBe(
      "Ingen drivere er lagt inn",
    )
    expect(messages.en.inputs.guidedDriversEmptyHeading).toBe(
      "No drivers have been added",
    )
    expect(messages.no.inputs.guidedDriversEmptyAdd).toBe("Legg til drivere")
    expect(messages.en.inputs.guidedDriversEmptyAdd).toBe("Add drivers")
    expect(messages.no.inputs.guidedDriversEmptyContinue).toBe(
      "Fortsett uten drivere",
    )
    expect(messages.en.inputs.guidedDriversEmptyContinue).toBe(
      "Continue without drivers",
    )
    const dialog = dialogSource()
    expect(dialog).toContain('data-guided-phase="driversEmpty"')
    expect(dialog).toContain("data-guided-add-drivers")
    expect(dialog).toContain("data-guided-continue-without-drivers")
  })

  it("C–E: Add Drivers handoff + resume to first driver or empty again", () => {
    const app = appSource()
    expect(app).toContain("handoffGuidedToAddDrivers")
    const body = app.slice(
      app.indexOf("handoffGuidedToAddDrivers"),
      app.indexOf("handoffGuidedToCorrelation"),
    )
    expect(body).toContain('after: "drivers"')
    expect(body).toContain("setGuidedInputKind(null)")
    expect(body).not.toContain("createEmpty")

    const withRows = buildGuidedWorkflowSteps({
      entry: "driver",
      costRows: [],
      driverRows: [driver({ id: "d1" }), driver({ id: "d2", name: "PM" })],
    })
    const driversIntro = withRows.findIndex((s) => s.phase === "driversIntro")
    expect(driversIntro).toBeGreaterThan(0)
    expect(withRows[driversIntro]?.phase).toBe("driversIntro")
    expect(findGuidedWorkflowPhaseIndex(withRows, "drivers")).toBe(
      driversIntro + 1,
    )
    expect(withRows[driversIntro + 1]).toMatchObject({
      phase: "driver",
      rowId: "d1",
    })

    const stillEmpty = buildGuidedWorkflowSteps({
      entry: "driver",
      costRows: [],
      driverRows: [],
    })
    const emptyIntro = stillEmpty.findIndex((s) => s.phase === "driversIntro")
    expect(stillEmpty.slice(emptyIntro).map((s) => s.phase)).toEqual([
      "driversIntro",
      "driversEmpty",
      "simulation",
    ])
    expect(findGuidedWorkflowPhaseIndex(stillEmpty, "drivers")).toBe(
      emptyIntro + 1,
    )
    expect(stillEmpty[emptyIntro + 1]?.phase).toBe("driversEmpty")
  })

  it("F: Continue without Drivers skips Impact and goes to Simulation", () => {
    const steps = buildGuidedWorkflowSteps({
      entry: "cost",
      costRows: [cost({ id: "c1" })],
      driverRows: [],
    })
    const emptyIdx = steps.findIndex((s) => s.phase === "driversEmpty")
    expect(steps[emptyIdx + 1]?.phase).toBe("simulation")
    expect(steps.slice(emptyIdx).some((s) => s.phase === "impact")).toBe(
      false,
    )
    const dialog = dialogSource()
    // Secondary continue uses goNext (advances to Simulation step)
    const footer = dialog.slice(
      dialog.indexOf("isDriversEmpty"),
      dialog.indexOf("isReview ?"),
    )
    expect(footer).toContain("goNext")
    expect(footer).toContain("guidedDriversEmptyContinue")
  })

  it("G: no driver rows are created automatically on empty or continue", () => {
    const app = appSource()
    const handoff = app.slice(
      app.indexOf("handoffGuidedToAddDrivers"),
      app.indexOf("handoffGuidedToCorrelation"),
    )
    expect(handoff).not.toContain("patchProjectDriverRows")
    expect(handoff).not.toContain("createDriver")
    const dialog = dialogSource()
    expect(dialog).not.toContain("onAddDrivers(() =>")
  })
})

describe("Guided empty-state resume / normal use", () => {
  it("return action only when resume matches costItems / drivers", () => {
    const app = appSource()
    expect(app).toContain('guidedResume?.after === "costItems"')
    expect(app).toContain('guidedResume?.after === "drivers"')
    const table = tableSource()
    expect(table).toContain("showTableHandoffReturn")
    expect(table).toContain("guidedInputMode?.onReturnToGuided")
    expect(table).toContain('"costItems"')
    expect(table).toContain('"drivers"')
  })

  it("direct toolbar Correlation/Impact still clear resume on open", () => {
    const app = appSource()
    const corr = app.slice(
      app.indexOf("handleCorrelationModeToggle"),
      app.indexOf("handleDefineModeToggle"),
    )
    expect(corr).toContain("setGuidedResume(null)")
    const impact = app.slice(
      app.indexOf("handleImpactModeToggle"),
      app.indexOf("handleCorrelationModeToggle"),
    )
    expect(impact).toContain("setGuidedResume(null)")
  })

  it("resume targets coexist including correlation and impact", () => {
    const resume: GuidedResumeState = {
      after: "costItems",
      entry: "cost",
      projectId: "p1",
    }
    expect(resume.after).toBe("costItems")
    const steps = buildGuidedWorkflowSteps({
      entry: "cost",
      costRows: [cost({ id: "c1" })],
      driverRows: [driver({ id: "d1" })],
    })
    expect(findGuidedWorkflowPhaseIndex(steps, "correlation")).toBeGreaterThan(
      0,
    )
    expect(findGuidedWorkflowPhaseIndex(steps, "impact")).toBeGreaterThan(0)
    expect(findGuidedWorkflowPhaseIndex(steps, "costItems")).toBe(
      steps.findIndex((s) => s.phase === "cost"),
    )
    expect(findGuidedWorkflowPhaseIndex(steps, "drivers")).toBe(
      steps.findIndex((s) => s.phase === "driver"),
    )
  })

  it("no duplicate table/editor inside Guided Input for empty handoff", () => {
    const dialog = dialogSource()
    const costsEmpty = dialog.slice(
      dialog.indexOf('case "costsEmpty"'),
      dialog.indexOf('case "cost":'),
    )
    expect(costsEmpty).not.toContain("CostTable")
    expect(costsEmpty).not.toContain("ScenarioPercentTable")
    expect(costsEmpty).not.toContain("<table")
    const driversEmpty = dialog.slice(
      dialog.indexOf('case "driversEmpty"'),
      dialog.indexOf('case "driver":'),
    )
    expect(driversEmpty).not.toContain("DriversTable")
    expect(driversEmpty).not.toContain("<table")
  })
})
