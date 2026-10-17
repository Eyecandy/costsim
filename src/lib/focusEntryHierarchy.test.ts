import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { join } from "node:path"

import {
  COLUMN_HEADER_BOTTOM_GAP_CLASS,
  PROJECT_PROFILE_FOCUS_ENTRY_CELL_CLASS,
  PROJECT_PROFILE_FOCUS_ROW_CLASS,
} from "@/domain/results/columnHeaderLayout"
import {
  buildGuidedWorkflowSteps,
  initialGuidedWorkflowStepIndex,
} from "@/lib/guidedWorkflow"
import { messages } from "@/i18n/messages"
import type { CostElementRow, DriverRow } from "@/domain/results/tableRows"
import { repoRoot as root } from "@/test-utils/repoRoot"


function readSrc(rel: string) {
  return readFileSync(join(root, rel), "utf8")
}

function cost(id: string): CostElementRow {
  return {
    id,
    name: "Bygning",
    optimistic: "-10",
    likely: "100",
    pessimistic: "20",
  }
}

function driver(id: string): DriverRow {
  return {
    id,
    name: "Marked",
    optimistic: "-5",
    likely: "0",
    pessimistic: "10",
  }
}

const costSteps = () =>
  buildGuidedWorkflowSteps({
    entry: "cost",
    costRows: [cost("c1"), cost("c2")],
    driverRows: [driver("d1")],
  })

describe("Focus mode entry hierarchy", () => {
  it("A: primary Focus entry shares the Project Profile row (not INPUT header / sticky utility)", () => {
    const app = readSrc("src/App.tsx")
    const nav = readSrc("src/components/CheckpointNav.tsx")
    expect(app).toContain('data-focus-mode-primary-entry=""')
    expect(app).toContain("PrimaryFocusModeEntry")
    expect(app).toContain('data-project-profile-focus-row=""')
    expect(app).toContain("PROJECT_PROFILE_FOCUS_ROW_CLASS")
    expect(app).toContain("PROJECT_PROFILE_FOCUS_ENTRY_CELL_CLASS")
    // Removed from CheckpointNav / INPUT header.
    expect(nav).not.toContain('data-focus-mode-primary-entry=""')
    expect(nav).not.toContain("onOpenFocusMode")
    expect(nav).not.toContain("guidedFocusMode")
    expect(app).not.toContain("INPUT_COLUMN_HEADER_ROW_CLASS")
    expect(app).not.toContain("COLUMN_STICKY_UTILITY_AREA_CLASS")
    expect(app).not.toContain('data-column-sticky-utility=""')
    // INPUT remains a subtle column label only.
    expect(app).toContain('t("projects.inputColumnLabel")')
    expect(nav).toContain('t("projects.inputColumnLabel")')
    expect(app).toContain('t("projects.resultsColumnLabel")')
  })

  it("A2: Project Profile + Focus row places Focus around 3/4 across on md+", () => {
    const layout = readSrc("src/domain/results/columnHeaderLayout.ts")
    expect(PROJECT_PROFILE_FOCUS_ROW_CLASS).toContain(
      "md:grid-cols-[minmax(0,3fr)_minmax(0,1fr)]",
    )
    expect(PROJECT_PROFILE_FOCUS_ENTRY_CELL_CLASS).toContain("md:justify-start")
    expect(layout).not.toMatch(/absolute|left:\s*\d|translateX/)
    // Single and Ongoing both use the shared row.
    const app = readSrc("src/App.tsx")
    const rowUses = app.match(/PROJECT_PROFILE_FOCUS_ROW_CLASS/g) ?? []
    expect(rowUses.length).toBeGreaterThanOrEqual(3)
    expect(app).toContain("ONGOING_PROJECT_PROFILE_CELL_CLASS")
    expect(app).toMatch(
      /data-project-profile-focus-row=""[\s\S]{0,400}ProjectProfileSection/,
    )
    expect(app).toMatch(
      /data-project-profile-focus-row=""[\s\S]{0,1200}PrimaryFocusModeEntry/,
    )
  })

  it("B: openFocusModePrimary opens the cost sequence at the focusIntro phase", () => {
    const app = readSrc("src/App.tsx")
    expect(app).toContain("const openFocusModePrimary = useCallback(")
    expect(app).toContain(
      'openGuidedInput("cost", 0, { startPhase: "focusIntro" })',
    )
    expect(app).toContain("startPhase={guidedStartPhase}")
    expect(app).toContain('useState<"focusIntro" | null>(')
    const guided = readSrc("src/components/GuidedInputDialog.tsx")
    expect(guided).toContain("canGoPrevious: safeIndex > 0")
    expect(guided).toContain('t("inputs.guidedPhaseFocusIntro")')
    expect(guided).toContain('t("inputs.guidedPhaseProjectProfile")')
  })

  it("C: cost workflow order is focusIntro → projectProfile → assumptions", () => {
    expect(costSteps().slice(0, 3).map((s) => s.phase)).toEqual([
      "focusIntro",
      "projectProfile",
      "assumptions",
    ])
  })

  it("D: cost default lands on assumptions; startPhase focusIntro lands on the intro", () => {
    const steps = costSteps()
    const defaultIndex = initialGuidedWorkflowStepIndex({
      entry: "cost",
      steps,
      startRowIndex: 0,
    })
    expect(steps[defaultIndex]?.phase).toBe("assumptions")
    expect(
      initialGuidedWorkflowStepIndex({
        entry: "cost",
        steps,
        startRowIndex: 0,
        startPhase: "focusIntro",
      }),
    ).toBe(0)
    const resumeIndex = initialGuidedWorkflowStepIndex({
      entry: "cost",
      steps,
      startRowIndex: 1,
    })
    expect(steps[resumeIndex]).toMatchObject({ phase: "cost", rowId: "c2" })
  })

  it("E: local Input shortcuts clear startPhase instead of setting focusIntro", () => {
    const app = readSrc("src/App.tsx")
    expect(app).toContain("setGuidedStartPhase(options?.startPhase ?? null)")
    expect(app).toContain('onOpen: () => openGuidedInput("cost")')
    expect(app).toContain('onOpen: () => openGuidedInput("driver")')
    expect(app).toContain("setGuidedStartPhase(null)")
  })

  it("F: INPUT and OUTPUT headers share one bottom-gap token", () => {
    const app = readSrc("src/App.tsx")
    const nav = readSrc("src/components/CheckpointNav.tsx")
    expect(COLUMN_HEADER_BOTTOM_GAP_CLASS).toBe("mb-4")
    expect(app).toContain('from "@/domain/results/columnHeaderLayout"')
    expect(app).toContain("COLUMN_HEADER_BOTTOM_GAP_CLASS")
    expect(nav).toContain('from "@/domain/results/columnHeaderLayout"')
    expect(nav).toContain("COLUMN_HEADER_BOTTOM_GAP_CLASS")
    const headerUses = app.match(/COLUMN_HEADER_BOTTOM_GAP_CLASS/g) ?? []
    expect(headerUses.length).toBeGreaterThanOrEqual(2)
    expect(app).not.toContain(
      'className="mb-2 font-sans text-[10px] font-normal italic',
    )
    expect(nav).not.toContain(
      'className="mb-2 font-sans text-[10px] font-normal italic',
    )
  })

  it("G: Focus mode terminology is canonical across entry points", () => {
    expect(messages.no.expanders.guidedInput).toBe("Fokusmodus")
    expect(messages.en.expanders.guidedInput).toBe("Focus mode")
    expect(messages.no.inputs.guidedFocusMode).toBe("Fokusmodus")
    expect(messages.en.inputs.guidedFocusMode).toBe("Focus mode")
    expect(messages.no.inputs.openFocusMode).toBe("Åpne Fokusmodus")
    expect(messages.en.inputs.openFocusMode).toBe("Open Focus mode")
    expect(messages.no.inputs.guidedPhaseFocusIntro).toBe("Fokusmodus")
    expect(messages.en.inputs.guidedPhaseFocusIntro).toBe("Focus mode")
    expect(messages.no.inputs.guidedPhaseProjectProfile).toBe("Prosjektprofil")
    expect(messages.en.inputs.guidedPhaseProjectProfile).toBe("Project profile")
    expect(messages.no.inputs.focusIntroTitle).toBe("Fokusmodus")
    expect(messages.en.inputs.focusIntroTitle).toBe("Focus mode")
    expect(messages.no.inputs.focusIntroBody).toContain(
      "Gå gjennom analysen steg for steg",
    )
    expect(messages.en.inputs.focusIntroBody).toContain(
      "Work through the analysis step by step",
    )
    expect(messages.no.inputs.focusOverviewPhase1).toBe(
      "Prosjekt og forutsetninger",
    )
    expect(messages.en.inputs.focusOverviewPhase1).toBe(
      "Project and assumptions",
    )
    expect(messages.no.inputs.focusOverviewPhase2).toBe(
      "Kostnader og usikkerhet",
    )
    expect(messages.en.inputs.focusOverviewPhase2).toBe("Costs and uncertainty")
    expect(messages.no.inputs.focusOverviewPhase3).toBe("Simulering")
    expect(messages.en.inputs.focusOverviewPhase3).toBe("Simulation")
    expect(messages.no.inputs.focusOverviewPhase4).toBe("Resultater")
    expect(messages.en.inputs.focusOverviewPhase4).toBe("Results")
    const table = readSrc("src/components/ScenarioPercentTable.tsx")
    const results = readSrc("src/components/ResultsPanel.tsx")
    expect(table).toContain('t("inputs.openFocusMode")')
    expect(table).toContain('<Play className="size-4" aria-hidden />')
    expect(results).toContain('t("inputs.openFocusMode")')
    expect(results).toContain('<Play className="size-4" aria-hidden />')
  })

  it("H: guided profile phase embeds ProjectProfileSection through App's patch path", () => {
    const profile = readSrc("src/components/ProjectProfileSection.tsx")
    const guided = readSrc("src/components/GuidedInputDialog.tsx")
    const app = readSrc("src/App.tsx")
    expect(profile).toContain("embedded?: boolean")
    expect(profile).toContain('"data-project-profile-embedded": ""')
    expect(profile).toContain("const open = embedded || openState")
    expect(profile).toContain("<ConfirmDialog")
    expect(guided).toContain('data-guided-phase="projectProfile"')
    expect(guided).toContain("onChange={onPatchProfile}")
    expect(guided).toContain("onPatchProfile?: (profile: ProjectProfile | undefined) => void")
    expect(guided).toContain('data-focus-intro=""')
    expect(guided).toContain('data-focus-intro-overview=""')
    expect(app).toContain("onPatchProfile={(next) => {")
    expect(app).toContain("patchProjectProfile(prev, activeProject.id, next)")
  })

  it("I: driver entry lands on Drivers intro with full workflow behind it", () => {
    const steps = buildGuidedWorkflowSteps({
      entry: "driver",
      costRows: [cost("c1")],
      driverRows: [driver("d1")],
    })
    expect(steps[0]?.phase).toBe("focusIntro")
    expect(steps.some((s) => s.phase === "projectProfile")).toBe(true)
    expect(steps.some((s) => s.phase === "assumptions")).toBe(true)
    expect(steps.some((s) => s.phase === "correlation")).toBe(true)
    const land = initialGuidedWorkflowStepIndex({
      entry: "driver",
      steps,
      startRowIndex: 0,
    })
    expect(steps[land]?.phase).toBe("driversIntro")
    // Previous from Drivers reaches Costs then Project.
    expect(steps[land - 1]?.phase).toBe("correlation")
    const toAssumptions = steps.findIndex((s) => s.phase === "assumptions")
    expect(toAssumptions).toBeGreaterThanOrEqual(0)
    expect(toAssumptions).toBeLessThan(land)
  })
})
