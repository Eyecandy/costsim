import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { join } from "node:path"

import {
  isRelationshipEditingModeActive,
  shouldShowDefineSelectHint,
} from "@/components/ScenarioPercentTable"
import { messages } from "@/i18n/messages"
import {
  createProject,
  type Project,
} from "@/domain/analysis/project"
import {
  costRowHasDefinition,
  driverRowHasDefinition,
  parseCostDescription,
  parseDriverDescription,
  stripRowDefinitions,
  withCostDescription,
  withDriverDescription,
  withDriverUncertaintyNotes,
} from "@/domain/results/rowDefinitions"
import { parseProjectsPayload } from "@/lib/storage"
import { shapleyInputSignature } from "@/domain/simulation/shapleyInputSignature"
import type { CostElementRow, DriverRow } from "@/domain/results/tableRows"
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

function defineEditorSource() {
  return readFileSync(
    join(repoRoot, "src/components/DefineRowEditor.tsx"),
    "utf8",
  )
}

function guidedSource() {
  return readFileSync(
    join(repoRoot, "src/components/GuidedInputDialog.tsx"),
    "utf8",
  )
}

function costRow(partial: Partial<CostElementRow> & { id: string }): CostElementRow {
  return {
    name: "Bygning",
    optimistic: "-10",
    likely: "100",
    pessimistic: "20",
    ...partial,
  }
}

function driverRow(partial: Partial<DriverRow> & { id: string }): DriverRow {
  return {
    name: "Marked",
    optimistic: "-5",
    likely: "0",
    pessimistic: "10",
    ...partial,
  }
}

describe("Define mode", () => {
  it("A: FileText Define control exists with NO/EN labels", () => {
    expect(messages.no.expanders.define).toBe("Definer")
    expect(messages.en.expanders.define).toBe("Define")
    const src = scenarioTableSource()
    expect(src).toContain("FileText")
    expect(src).toContain('t("expanders.define")')
  })

  it("B: Define is mutually exclusive with Impact and Correlation", () => {
    const app = appSource()
    expect(app).toContain("handleDefineModeToggle")
    expect(app).toContain("setDefineModeActive(false)")
    expect(app).toMatch(/setImpactModeActive\(false\)[\s\S]*setDefineModeActive/)
    expect(app).toContain("setCorrelationModeActive(false)")
    expect(
      isRelationshipEditingModeActive({
        variant: "costMixed",
        defineModeActive: true,
      }),
    ).toBe(true)
    expect(
      isRelationshipEditingModeActive({
        variant: "driverMixed",
        defineModeActive: true,
      }),
    ).toBe(true)
  })

  it("C: Cost rows open a Description editor in Define mode", () => {
    expect(messages.no.inputs.defineDescriptionLabel).toBe("Beskrivelse")
    expect(messages.en.inputs.defineDescriptionLabel).toBe("Description")
    expect(messages.no.inputs.defineCostDescriptionPlaceholder).toBe(
      "Hva inngår i kostnadsposten?",
    )
    expect(messages.en.inputs.defineCostDescriptionPlaceholder).toBe(
      "What is included in this cost item?",
    )
    expect(scenarioTableSource()).toContain('kind="cost"')
    expect(defineEditorSource()).toContain("defineCostDescriptionPlaceholder")
  })

  it("D: Driver rows open Description + shared uncertainty notes editor", () => {
    expect(messages.no.inputs.defineDriverDescriptionPlaceholder).toBe(
      "Hva innebærer driveren?",
    )
    expect(messages.en.inputs.defineDriverDescriptionPlaceholder).toBe(
      "What does this driver represent?",
    )
    expect(scenarioTableSource()).toContain('kind="driver"')
    expect(defineEditorSource()).toContain("DriverUncertaintyNotesEditor")
    expect(defineEditorSource()).toContain("uncertaintyNotes")
    expect(defineEditorSource()).toContain("guidedDriverUncertaintyNotesHeading")
    expect(defineEditorSource()).not.toContain("uncertaintyAssessment")
    expect(guidedSource()).toContain("DriverUncertaintyNotesEditor")
  })

  it("E: Multiline Enter does not accidentally save", () => {
    const src = defineEditorSource()
    expect(src).toContain('event.key === "Enter"')
    expect(src).toContain("metaKey || event.ctrlKey")
    expect(src).not.toMatch(/if \(event\.key === "Enter"\) \{\s*event\.preventDefault\(\)\s*commit/)
  })

  it("E2: outside click exits Define via the shared Impact/Correlation App listener", () => {
    const app = appSource()
    // Same deactivateEditingModes + impactEditingAreaRef path — no DefineRowEditor listener.
    expect(app).toContain("deactivateEditingModes")
    expect(app).toMatch(
      /const deactivateEditingModes = useCallback\(\(\) => \{\s*setImpactModeActive\(false\)\s*setCorrelationModeActive\(false\)\s*setDefineModeActive\(false\)/,
    )
    expect(app).toContain(
      "if (!impactModeActive && !correlationModeActive && !defineModeActive) return",
    )
    expect(app).toContain("impactEditingAreaRef.current?.contains(target)")
    const editor = defineEditorSource()
    expect(editor).not.toContain('document.addEventListener("mousedown"')
    expect(editor).toContain('event.key === "Escape"')
    expect(scenarioTableSource()).toContain('kind="cost"')
    expect(scenarioTableSource()).toContain('kind="driver"')
    expect(scenarioTableSource()).toContain("DefineRowPopover")
    expect(scenarioTableSource()).toContain("DefineRowEditor")
  })

  it("F: Save persists text to the correct stable row ID", () => {
    const row = costRow({ id: "cost-stable-1" })
    const next = withCostDescription(row, "  Fasade og bæresystem  ")
    expect(next.id).toBe("cost-stable-1")
    expect(next.description).toBe("Fasade og bæresystem")
    const driver = driverRow({ id: "drv-1" })
    const nextDriver = withDriverDescription(driver, "Markedseffekter")
    expect(nextDriver.id).toBe("drv-1")
    expect(nextDriver.description).toBe("Markedseffekter")
  })

  it("G: Existing documentation reopens correctly", () => {
    const row = costRow({
      id: "c1",
      description: "Existing note",
    })
    expect(costRowHasDefinition(row)).toBe(true)
    expect(row.description).toBe("Existing note")
    expect(scenarioTableSource()).toContain(
      "(defineSelectedRow as CostElementRow).description",
    )
  })

  it("H: Clearing documentation removes stored value", () => {
    const row = withCostDescription(
      costRow({ id: "c1", description: "Keep" }),
      "   ",
    )
    expect(row.description).toBeUndefined()
    expect(costRowHasDefinition(row)).toBe(false)

    const driver = withDriverDescription(
      driverRow({
        id: "d1",
        description: "A",
        uncertaintyNotes: {
          lowerOutcome: ["Mild"],
          higherOutcome: ["Strong"],
        },
      }),
      "",
    )
    expect(driver.description).toBeUndefined()
    expect(driver.uncertaintyNotes).toEqual({
      lowerOutcome: ["Mild"],
      higherOutcome: ["Strong"],
    })
  })

  it("I: Definitions are project-specific", () => {
    let projects: Project[] = [
      createProject({ id: "p1", name: "A" }),
      createProject({ id: "p2", name: "B" }),
    ]
    projects = projects.map((p) =>
      p.id === "p1"
        ? {
            ...p,
            costRows: p.costRows.map((r, i) =>
              i === 0 ? withCostDescription(r, "Only in A") : r,
            ),
          }
        : p,
    )
    expect(projects[0]!.costRows[0]!.description).toBe("Only in A")
    expect(projects[1]!.costRows[0]!.description).toBeUndefined()
  })

  it("J: Definition changes do NOT invalidate simulation (staleComparable strips them)", () => {
    const signatureSrc = readFileSync(
      join(repoRoot, "src/domain/simulation/simulationInputSignature.ts"),
      "utf8",
    )
    expect(signatureSrc).toContain("stripRowDefinitions")
    const withDesc = costRow({ id: "c1", description: "Note" })
    expect(stripRowDefinitions(withDesc)).toEqual({
      id: "c1",
      name: "Bygning",
      optimistic: "-10",
      likely: "100",
      pessimistic: "20",
    })
  })

  it("K: Definition changes do NOT invalidate Shapley", () => {
    const base = createProject({ id: "p1", name: "A" })
    const withDefs: Project = {
      ...base,
      costRows: base.costRows.map((r, i) =>
        i === 0 ? withCostDescription(r, "Cost note") : r,
      ),
      driverRows: base.driverRows.map((r, i) =>
        i === 0
          ? withDriverUncertaintyNotes(withDriverDescription(r, "Driver note"), {
              lowerOutcome: ["Mild"],
              higherOutcome: ["Strong"],
            })
          : r,
      ),
    }
    expect(shapleyInputSignature(base)).toBe(shapleyInputSignature(withDefs))
  })

  it("L: Switching Define off restores normal editing", () => {
    expect(
      isRelationshipEditingModeActive({
        variant: "costMixed",
        defineModeActive: false,
      }),
    ).toBe(false)
    expect(appSource()).toContain(
      "if (!defineModeActive) setDefineSelectedRowId(null)",
    )
    expect(
      shouldShowDefineSelectHint({
        defineModeActive: false,
        selectedRowId: null,
      }),
    ).toBe(false)
  })

  it("M: Defined rows are subtly indicated in Define mode", () => {
    expect(scenarioTableSource()).toContain("define-indicator-")
    expect(scenarioTableSource()).toContain("data-define-indicator")
    expect(scenarioTableSource()).toContain("costRowHasDefinition")
    expect(scenarioTableSource()).toContain("driverRowHasDefinition")
    expect(driverRowHasDefinition(driverRow({ id: "d1" }))).toBe(false)
    expect(
      driverRowHasDefinition(
        driverRow({
          id: "d1",
          uncertaintyNotes: { lowerOutcome: ["x"], higherOutcome: [] },
        }),
      ),
    ).toBe(true)
  })

  it("N: Old project state without documentation loads normally", () => {
    const legacy = [
      {
        id: "p1",
        name: "Legacy",
        incurredCosts: 0,
        costRows: [
          {
            id: "c1",
            name: "A",
            optimistic: "-10",
            likely: "100",
            pessimistic: "20",
          },
        ],
        driverRows: [
          {
            id: "d1",
            name: "D",
            optimistic: "-5",
            likely: "0",
            pessimistic: "10",
          },
        ],
      },
    ]
    const parsed = parseProjectsPayload(legacy)
    expect(parsed).not.toBeNull()
    expect(parsed![0]!.costRows[0]!.description).toBeUndefined()
    expect(parsed![0]!.driverRows[0]!.uncertaintyNotes).toBeUndefined()
  })

  it("O: Serialization preserves documentation where applicable", () => {
    const roundTrip = parseProjectsPayload([
      {
        id: "p1",
        name: "Share",
        incurredCosts: 0,
        costRows: [
          {
            id: "c1",
            name: "Bygning",
            optimistic: "-10",
            likely: "100",
            pessimistic: "20",
            description: "Fasade",
          },
        ],
        driverRows: [
          {
            id: "d1",
            name: "Marked",
            optimistic: "-5",
            likely: "0",
            pessimistic: "10",
            description: "Markedseffekter",
            uncertaintyNotes: {
              lowerOutcome: ["Mild downside"],
              higherOutcome: ["Prisvolatilitet"],
            },
          },
        ],
      },
    ])
    expect(roundTrip).not.toBeNull()
    expect(roundTrip![0]!.costRows[0]!.description).toBe("Fasade")
    expect(roundTrip![0]!.driverRows[0]!.description).toBe("Markedseffekter")
    expect(roundTrip![0]!.driverRows[0]!.uncertaintyNotes).toEqual({
      lowerOutcome: ["Mild downside"],
      higherOutcome: ["Prisvolatilitet"],
    })
  })

  it("P: Impact behavior wiring remains present", () => {
    expect(appSource()).toContain("handleImpactModeToggle")
    expect(scenarioTableSource()).toContain("driverImpactMode")
    expect(scenarioTableSource()).toContain("SlidersHorizontal")
  })

  it("Q: Correlation behavior wiring remains present", () => {
    expect(appSource()).toContain("handleCorrelationModeToggle")
    expect(scenarioTableSource()).toContain("costCorrelationMode")
    expect(scenarioTableSource()).toContain("Link2")
  })

  it("R: NO/EN labels work for Define copy", () => {
    expect(messages.no.expanders.define).toBe("Definer")
    expect(messages.en.expanders.define).toBe("Define")
    expect(parseCostDescription("")).toBeNull()
    expect(parseDriverDescription("  x  ")).toBe("x")
    expect(shouldShowDefineSelectHint({
      defineModeActive: true,
      selectedRowId: null,
    })).toBe(true)
  })
})
