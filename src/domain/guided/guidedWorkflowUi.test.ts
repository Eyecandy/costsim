import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { join } from "node:path"

import { messages } from "@/i18n/messages"
import {
  buildGuidedWorkflowSteps,
  initialGuidedWorkflowStepIndex,
} from "@/domain/guided/guidedWorkflow"
import { deriveSavedCorrelationSummaries } from "@/domain/simulation/costCorrelationSummaries"
import { createProject, type Project } from "@/domain/analysis/project"
import { buildPdfImpactOverrides } from "@/pdf/buildPdfReportModel"
import type { CostElementRow, DriverRow } from "@/domain/results/tableRows"
import { repoRoot } from "@/test-utils/repoRoot"


function dialogSource() {
  return readFileSync(
    join(repoRoot, "src/components/GuidedInputDialog.tsx"),
    "utf8",
  )
}

function appSource() {
  return readFileSync(join(repoRoot, "src/App.tsx"), "utf8")
}

function cost(
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

describe("Guided workflow UI contracts", () => {
  it("A: Assumptions step UI exists", () => {
    const src = dialogSource()
    expect(src).toContain('data-guided-phase="assumptions"')
    expect(src).toContain("GuidedAssumptionsPhase")
    expect(src).toContain("guidedAssumptionsGuidance")
    expect(messages.no.inputs.guidedPhaseAssumptions).toBe("Forutsetninger")
    expect(messages.en.inputs.guidedPhaseAssumptions).toBe("Assumptions")
  })

  it("A2: Incurred costs step UI exists after Assumptions", () => {
    const src = dialogSource()
    expect(src).toContain('data-guided-phase="incurred"')
    expect(src).toContain("GuidedIncurredPhase")
    expect(src).toContain("guidedIncurredGuidance")
    expect(src).toContain("guidedIncurredSecondaryGuidance")
    expect(src).toContain("onIncurredCostsChange")
    expect(messages.no.inputs.guidedPhaseIncurred).toBe("Påløpte kostnader")
    expect(messages.en.inputs.guidedPhaseIncurred).toBe("Incurred costs")
    expect(appSource()).toContain("onIncurredCostsChange=")
    expect(appSource()).toContain("patchProjectIncurredCosts")
  })

  it("B/C: assumptions render/edit/add wired", () => {
    const src = dialogSource()
    expect(src).toContain("onAddAssumption")
    expect(src).toContain("onUpdateAssumption")
    expect(src).toContain("onRemoveAssumption")
    expect(src).toContain("parseAssumptionText")
    expect(appSource()).toContain("patchProjectAddAssumption")
    expect(appSource()).toContain("onAddAssumption=")
  })

  it("D: no assumptions does not block Next", () => {
    const src = dialogSource()
    expect(src).not.toContain("guidedRowBlocksAdvance")
    expect(src).toContain("guidedAssumptionsEmpty")
    expect(src).toContain("goNext")
  })

  it("correlation summary + handoff", () => {
    const src = dialogSource()
    expect(src).toContain('data-guided-phase="correlation"')
    expect(src).toContain("deriveSavedCorrelationSummaries")
    expect(src).toContain("guidedCorrelationNone")
    expect(src).toContain("data-guided-looks-right")
    expect(src).toContain("data-guided-adjust-correlation")
    expect(src).toContain("onAdjustCorrelation")
    expect(src).not.toContain("handleCostCorrelationGroupApply")
    expect(src).not.toContain("onPendingRhoChange")

    const project: Project = {
      ...createProject({ id: "p1", name: "P" }),
      costRows: [
        cost({ id: "c1", name: "K1" }),
        cost({ id: "c2", name: "K2" }),
      ],
      costCorrelations: { c1: { c2: "0.5" } },
    }
    const summaries = deriveSavedCorrelationSummaries(
      project.costRows,
      project.costCorrelations,
    )
    expect(summaries.length).toBeGreaterThan(0)

    const empty = deriveSavedCorrelationSummaries(
      project.costRows,
      undefined,
    )
    expect(empty).toEqual([])

    const app = appSource()
    expect(app).toContain("handoffGuidedToCorrelation")
    const corrHandoff = app.slice(
      app.indexOf("handoffGuidedToCorrelation"),
      app.indexOf("handoffGuidedToImpact"),
    )
    expect(corrHandoff).toContain("setCorrelationModeActive(true)")
    expect(corrHandoff).not.toContain("patchProjectCostCorrelation")
  })

  it("impact summary + handoff", () => {
    const src = dialogSource()
    expect(src).toContain('data-guided-phase="impact"')
    expect(src).toContain("buildPdfImpactOverrides")
    expect(src).toContain("guidedImpactDefaultAll")
    expect(src).toContain("data-guided-adjust-impact")
    expect(src).toContain("onAdjustImpact")

    const base: Project = {
      ...createProject({ id: "p1", name: "P" }),
      costRows: [cost({ id: "c1", name: "K1" })],
      driverRows: [driver({ id: "d1", name: "U1" })],
    }
    expect(buildPdfImpactOverrides(base)).toEqual([])

    const withOverride: Project = {
      ...base,
      driverImpacts: { d1: { c1: "50" } },
    }
    expect(buildPdfImpactOverrides(withOverride)).toEqual([
      { driverName: "U1", costItemName: "K1", impactPct: 50 },
    ])

    const app = appSource()
    expect(app).toContain("handoffGuidedToImpact")
    const impactHandoff = app.slice(
      app.indexOf("handoffGuidedToImpact"),
      app.indexOf("handleImpactModeToggle"),
    )
    expect(impactHandoff).toContain("setImpactModeActive(true)")
    expect(impactHandoff).not.toContain("patchProjectDriverImpact")
  })

  it("Cost Items entry opens Assumptions first; Drivers opens Drivers intro", () => {
    const costSteps = buildGuidedWorkflowSteps({
      entry: "cost",
      costRows: [cost({ id: "c1" })],
      driverRows: [driver({ id: "d1" })],
    })
    expect(
      costSteps[
        initialGuidedWorkflowStepIndex({ entry: "cost", steps: costSteps })
      ],
    ).toEqual({ phase: "assumptions" })
    const driverSteps = buildGuidedWorkflowSteps({
      entry: "driver",
      costRows: [cost({ id: "c1" })],
      driverRows: [driver({ id: "d1" })],
    })
    expect(
      driverSteps[
        initialGuidedWorkflowStepIndex({ entry: "driver", steps: driverSteps })
      ]?.phase,
    ).toBe("driversIntro")
    expect(driverSteps.some((s) => s.phase === "projectProfile")).toBe(true)
  })

  it("simulation phase is the final Guided content stage with Run in body", () => {
    const src = dialogSource()
    expect(src).toContain('data-guided-phase="simulation"')
    expect(src).toContain("guidedSimulationBodyNoResults")
    expect(src).toContain('data-guided-simulation-run=""')
    expect(src).not.toContain('data-guided-focus-run=""')
    expect(src).not.toContain('data-guided-phase="finish"')
    expect(src).toContain("onRunSimulation")
    expect(
      buildGuidedWorkflowSteps({
        entry: "cost",
        costRows: [cost({ id: "c1" })],
        driverRows: [driver({ id: "d1" })],
      }).at(-1),
    ).toEqual({ phase: "simulation" })
  })

  it("entry wiring uses entry prop not kind", () => {
    const app = appSource()
    expect(app).toContain("entry={guidedInputKind}")
    expect(app).not.toContain("kind={guidedInputKind}")
    expect(dialogSource()).toContain("entry: GuidedInputKind")
  })

  it("regression: cost/driver OMP controls remain", () => {
    const src = dialogSource()
    expect(src).toContain('data-guided-cost-range=""')
    expect(src).toContain('data-guided-driver-range=""')
    expect(src).toContain('testId="cost-p10"')
    expect(src).toContain('testId="driver-m"')
    expect(src).toContain("deriveGuidedCostEffect")
    expect(src).toContain("computeGuidedDriverEndpointEffects")
    expect(src).toContain("GuidedInlineValue")
    expect(src).toContain("data-guided-description")
    expect(src).toContain("data-guided-driver-uncertainty-notes")
    expect(src).toContain("DriverUncertaintyNotesEditor")
  })
})
