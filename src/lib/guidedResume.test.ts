import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { join } from "node:path"

import { messages } from "@/i18n/messages"
import {
  buildGuidedWorkflowSteps,
  findGuidedWorkflowPhaseIndex,
  type GuidedResumeState,
} from "@/lib/guidedWorkflow"
import type { CostElementRow, DriverRow } from "@/lib/tableRows"
import { repoRoot } from "@/test-utils/repoRoot"


function appSource() {
  return readFileSync(join(repoRoot, "src/App.tsx"), "utf8")
}

function dialogSource() {
  return readFileSync(
    join(repoRoot, "src/components/GuidedInputDialog.tsx"),
    "utf8",
  )
}

function tableSource() {
  return readFileSync(
    join(repoRoot, "src/components/ScenarioPercentTable.tsx"),
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

describe("Guided Input pause/resume", () => {
  it("A–C correlation: handoff stores resume, closes guided, opens correlation", () => {
    const app = appSource()
    expect(app).toContain("handoffGuidedToCorrelation")
    const body = app.slice(
      app.indexOf("handoffGuidedToCorrelation"),
      app.indexOf("handoffGuidedToImpact"),
    )
    expect(body).toContain('after: "correlation"')
    expect(body).toContain("entry: guidedInputKind")
    expect(body).toContain("projectId: activeProject.id")
    expect(body).toContain("setGuidedInputKind(null)")
    expect(body).toContain("setCorrelationModeActive(true)")
    expect(body).not.toContain("patchProjectCostCorrelation")
  })

  it("D–E return action only when resume context (correlation)", () => {
    const table = tableSource()
    expect(table).toContain("data-guided-return={guidedReturnKind}")
    expect(table).toContain('guidedReturnKind = showCorrelationReturn')
    expect(table).toContain('? "correlation"')
    expect(table).toContain('? "impact"')
    expect(table).toContain("guidedReturnToReview")
    expect(table).toContain("costCorrelationMode.onReturnToGuided")
    expect(table).toContain("showImpactReturn")
    const app = appSource()
    expect(app).toContain('guidedResume?.after === "correlation"')
    expect(app).toContain("onReturnToGuided:")
    // Direct toolbar open clears resume
    const toggle = app.slice(
      app.indexOf("handleCorrelationModeToggle"),
      app.indexOf("handleDefineModeToggle"),
    )
    expect(toggle).toContain("setGuidedResume(null)")
  })

  it("F–J return reopens Guided Input on Correlation step", () => {
    const app = appSource()
    expect(app).toContain("returnToGuidedReview")
    expect(app).toContain("handleGuidedResumeApplied")
    expect(app).toContain("onResumeApplied={handleGuidedResumeApplied}")
    const ret = app.slice(
      app.indexOf("returnToGuidedReview"),
      app.indexOf("handleGuidedResumeApplied"),
    )
    expect(ret).toContain("setCorrelationModeActive(false)")
    expect(ret).toContain("setImpactModeActive(false)")
    expect(ret).toContain("setGuidedResumePhase(after)")
    expect(ret).toContain("setGuidedInputKind(entry)")
    expect(ret).toContain("guidedResume.projectId !== activeProjectId")
    // Happy path must keep guidedResume until onResumeApplied
    const happy = ret.slice(ret.indexOf("const { after, entry }"))
    expect(happy).not.toContain("setGuidedResume(null)")
    expect(happy).not.toContain("setTimeout")
    expect(happy).toContain(
      "Keep guidedResume until Guided Input has applied",
    )

    const dialog = dialogSource()
    expect(dialog).toContain("resumePhase")
    expect(dialog).toContain("findGuidedWorkflowPhaseIndex")
    expect(dialog).toContain("resumeAppliedForOpenRef")
    expect(dialog).toContain("onResumeApplied")
    // Clearing resumePhase must not fall back to first page
    expect(dialog).toContain(
      "if (resumeAppliedForOpenRef.current) return",
    )

    const steps = buildGuidedWorkflowSteps({
      entry: "cost",
      costRows: [cost({ id: "c1" })],
      driverRows: [driver({ id: "d1" })],
    })
    const idx = findGuidedWorkflowPhaseIndex(steps, "correlation")
    expect(steps[idx]?.phase).toBe("correlation")
    expect(idx).toBeGreaterThan(1) // after assumptions + incurred
    expect(steps[2]?.phase).toBe("assumptions")
    expect(steps[3]?.phase).toBe("incurred")
    expect(steps[idx + 1]?.phase).toBe("driversIntro")
    expect(steps[idx + 2]?.phase).toBe("driver")
  })

  it("impact handoff + return mirrors correlation", () => {
    const app = appSource()
    const body = app.slice(
      app.indexOf("handoffGuidedToImpact"),
      app.indexOf("returnToGuidedReview"),
    )
    expect(body).toContain('after: "impact"')
    expect(body).toContain("setImpactModeActive(true)")
    expect(body).toContain("setGuidedInputKind(null)")
    expect(body).not.toContain("patchProjectDriverImpact")

    const table = tableSource()
    expect(table).toContain("data-guided-return={guidedReturnKind}")
    expect(table).toContain('? "impact"')
    expect(app).toContain('guidedResume?.after === "impact"')

    const steps = buildGuidedWorkflowSteps({
      entry: "driver",
      costRows: [],
      driverRows: [driver({ id: "d1" })],
    })
    const idx = findGuidedWorkflowPhaseIndex(steps, "impact")
    expect(steps[idx]?.phase).toBe("impact")
    expect(steps[idx + 1]?.phase).toBe("simulation")
  })

  it("stale state cleanup", () => {
    const app = appSource()
    expect(app).toContain("handleGuidedResumeApplied")
    const applied = app.slice(
      app.indexOf("handleGuidedResumeApplied"),
      app.indexOf("handleImpactModeToggle"),
    )
    expect(applied).toContain("setGuidedResume(null)")
    expect(applied).toContain("setGuidedResumePhase(null)")
    // No premature setTimeout clear
    expect(app).not.toMatch(
      /setTimeout\(\(\) => setGuidedResumePhase\(null\)/,
    )
    // Fresh guided open clears resume
    const open = app.slice(
      app.indexOf("const openGuidedInput"),
      app.indexOf("handoffGuidedToCorrelation"),
    )
    expect(open).toContain("setGuidedResume(null)")
    // closeGuidedInput abandons resume
    const close = app.slice(
      app.indexOf("const closeGuidedInput"),
      app.indexOf("const openGuidedInput"),
    )
    expect(close).toContain("setGuidedResume(null)")
    expect(app).toContain('r?.after === "impact" ? null : r')
    expect(app).toContain('r?.after === "correlation" ? null : r')
  })

  it("narrow layout isolates return action from specialized controls", () => {
    const table = tableSource()
    expect(table).toContain('data-guided-return-row=""')
    expect(table).toContain("sm:hidden")
    expect(table).toContain("hidden sm:inline-flex")
    expect(table).toContain('data-guided-mode-toolbar=""')
  })

  it("resume state type is UI-only (not share/project)", () => {
    const resume: GuidedResumeState = {
      after: "correlation",
      entry: "cost",
      projectId: "p1",
    }
    expect(resume.after).toBe("correlation")
    const share = readFileSync(join(repoRoot, "src/lib/shareLink.ts"), "utf8")
    expect(share).not.toContain("GuidedResumeState")
    expect(share).not.toContain("guidedResume")
  })

  it("i18n return action labels", () => {
    expect(messages.no.inputs.guidedReturnToReview).toBe(
      "Tilbake til veiledet gjennomgang",
    )
    expect(messages.en.inputs.guidedReturnToReview).toBe(
      "Back to guided review",
    )
  })

  it("summaries refresh from live project on resume (no cached summary)", () => {
    const dialog = dialogSource()
    expect(dialog).toContain("deriveSavedCorrelationSummaries")
    expect(dialog).toContain("buildPdfImpactOverrides")
    expect(dialog).toContain("project.costCorrelations")
    expect(dialog).toContain("buildPdfImpactOverrides(project)")
  })

  it("click-outside Correlation does not abandon guided resume", () => {
    const app = appSource()
    const deactivate = app.slice(
      app.indexOf("const deactivateEditingModes"),
      app.indexOf("validSimCostRows"),
    )
    expect(deactivate).toContain("setCorrelationModeActive(false)")
    expect(deactivate).not.toContain("setGuidedResume")
    // Explicit return path still present
    expect(app).toContain("returnToGuidedReview")
    expect(app).toContain('guidedResume?.after === "correlation"')
  })
})
