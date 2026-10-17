import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { join } from "node:path"

import {
  createAssumption,
  normalizeAssumptions,
  parseAssumptionText,
  assumptionsFromShareTexts,
  assumptionsToShareTexts,
} from "@/lib/assumptions"
import {
  createProject,
  patchProjectAddAssumption,
  patchProjectRemoveAssumption,
  patchProjectUpdateAssumption,
  type Project,
} from "@/lib/project"
import { parseProjectsPayload } from "@/lib/storage"
import { messages } from "@/i18n/messages"
import { shapleyInputSignature } from "@/domain/simulation/shapleyInputSignature"
import { repoRoot } from "@/test-utils/repoRoot"


function appSource() {
  return readFileSync(join(repoRoot, "src/App.tsx"), "utf8")
}

function costTableSource() {
  return readFileSync(join(repoRoot, "src/components/CostTable.tsx"), "utf8")
}

function assumptionsEditorSource() {
  return readFileSync(
    join(repoRoot, "src/components/AssumptionsEditor.tsx"),
    "utf8",
  )
}

describe("project assumptions", () => {
  it("A: Assumptions editor appears above Cost Items via CostTable", () => {
    expect(costTableSource()).toContain("AssumptionsEditor")
    expect(assumptionsEditorSource()).toContain('t("inputs.assumptionsLabel")')
    expect(appSource()).toContain("assumptions={activeProject.assumptions")
  })

  it("collapsed default: label · count/empty + Show/Add; no chips", () => {
    const src = assumptionsEditorSource()
    expect(src).toContain("useState(false)")
    expect(src).toContain("data-assumptions-summary")
    expect(src).toContain("assumptionsNoneDefined")
    expect(src).toContain("assumptionsShow")
    expect(src).toContain("assumptionsAddShort")
    expect(src).toContain("{open ? (")
    // Collapsed must not render assumption texts outside the open panel
    expect(src).toMatch(
      /data-assumptions-panel=""[\s\S]*assumptions\.map/,
    )
    expect(messages.no.inputs.assumptionsLabel).toBe("Forutsetninger")
    expect(messages.en.inputs.assumptionsLabel).toBe("Assumptions")
    expect(messages.no.inputs.assumptionsNoneDefined).toBe("Ingen definert")
    expect(messages.en.inputs.assumptionsNoneDefined).toBe("None defined")
    expect(messages.no.inputs.assumptionsShow).toBe("Vis")
    expect(messages.en.inputs.assumptionsShow).toBe("Show")
    expect(messages.no.inputs.assumptionsHide).toBe("Skjul")
    expect(messages.en.inputs.assumptionsHide).toBe("Hide")
    expect(messages.no.inputs.assumptionsAddShort).toBe("Legg til")
    expect(messages.en.inputs.assumptionsAddShort).toBe("Add")
  })

  it("empty header Add opens existing add interaction", () => {
    const src = assumptionsEditorSource()
    expect(src).toContain("onHeaderAction")
    expect(src).toContain("assumptions.length === 0")
    expect(src).toContain("openAdd()")
    expect(src).toContain("setOpen(true)")
  })

  it("expanded: show/hide + add with Plus + localized label", () => {
    const src = assumptionsEditorSource()
    expect(src).toContain("import { Check, Plus, X }")
    expect(src).toContain("<Plus")
    expect(src).toContain('t("inputs.assumptionsAdd")')
    expect(src).toContain("data-assumptions-add")
    expect(messages.no.inputs.assumptionsAdd).toBe("Legg til forutsetning")
    expect(messages.en.inputs.assumptionsAdd).toBe("Add assumption")
    expect(messages.no.inputs.assumptionsAdd).not.toBe("Forutsetninger +")
    expect(messages.en.inputs.assumptionsAdd).not.toBe("Assumptions +")
  })

  it("C: add action opens the existing assumption input", () => {
    const src = assumptionsEditorSource()
    expect(src).toContain("openAdd")
    expect(src).toContain("setAdding(true)")
    expect(src).toContain("commitAdd")
    expect(src).toContain("adding ? (")
  })

  it("B/C/D: Enter saves non-empty; empty input is rejected", () => {
    expect(assumptionsEditorSource()).toContain('e.key === "Enter"')
    expect(assumptionsEditorSource()).toContain("commitAdd")
    expect(parseAssumptionText("")).toBeNull()
    expect(parseAssumptionText("   ")).toBeNull()
    expect(parseAssumptionText("  Drift  ")).toBe("Drift")
    expect(createAssumption("")).toBeNull()
    expect(createAssumption("Prisnivå Q3 2026")).toMatchObject({
      text: "Prisnivå Q3 2026",
    })
  })

  it("E: each assumption gets a stable ID", () => {
    let projects = [createProject({ id: "p1", name: "A" })]
    projects = patchProjectAddAssumption(projects, "p1", "One")
    projects = patchProjectAddAssumption(projects, "p1", "Two")
    const list = projects[0]!.assumptions!
    expect(list).toHaveLength(2)
    expect(list[0]!.id).not.toBe(list[1]!.id)
    expect(list[0]!.id.length).toBeGreaterThan(0)
  })

  it("F: assumptions are project-specific", () => {
    let projects: Project[] = [
      createProject({ id: "p1", name: "A" }),
      createProject({ id: "p2", name: "B" }),
    ]
    projects = patchProjectAddAssumption(projects, "p1", "Only A")
    expect(projects[0]!.assumptions?.[0]?.text).toBe("Only A")
    expect(projects[1]!.assumptions).toBeUndefined()
  })

  it("G: editing preserves ID", () => {
    let projects = [createProject({ id: "p1", name: "A" })]
    projects = patchProjectAddAssumption(projects, "p1", "Old")
    const id = projects[0]!.assumptions![0]!.id
    projects = patchProjectUpdateAssumption(projects, "p1", id, "New text")
    expect(projects[0]!.assumptions).toEqual([{ id, text: "New text" }])
  })

  it("H: delete removes only the selected assumption", () => {
    let projects = [createProject({ id: "p1", name: "A" })]
    projects = patchProjectAddAssumption(projects, "p1", "Keep")
    projects = patchProjectAddAssumption(projects, "p1", "Drop")
    const keepId = projects[0]!.assumptions![0]!.id
    const dropId = projects[0]!.assumptions![1]!.id
    projects = patchProjectRemoveAssumption(projects, "p1", dropId)
    expect(projects[0]!.assumptions).toEqual([{ id: keepId, text: "Keep" }])
  })

  it("no tag-like collapsed more-chip presentation", () => {
    const src = assumptionsEditorSource()
    expect(src).not.toContain("ASSUMPTION_VISIBLE_LIMIT")
    expect(src).not.toContain("assumptionsMore")
    expect(src).not.toContain("hiddenCount")
  })

  it("G: editing/removing inside expanded state still works", () => {
    const src = assumptionsEditorSource()
    expect(src).toContain("startEdit")
    expect(src).toContain("onRemove(assumption.id)")
    expect(src).toContain("assumption-chip-remove")
  })

  it("H/I/J: edit mode Check shares commitEdit with Enter and is accessible", () => {
    const src = assumptionsEditorSource()
    expect(src).toContain("commitEdit")
    expect(src).toContain('t("inputs.assumptionsSave")')
    expect(messages.no.inputs.assumptionsSave).toBe("Lagre forutsetning")
    expect(messages.en.inputs.assumptionsSave).toBe("Save assumption")
    expect(src).toContain("onClick={commitEdit}")
    expect(src).toContain('e.key === "Enter"')
    expect(src).toContain("<Check")
    expect(src).toMatch(/onClick=\{commitEdit\}[\s\S]*aria-label=\{t\("inputs\.assumptionsSave"\)\}/)
  })

  it("K/L/M/N: Correlation mode hides Assumptions UI without mutating saved data", () => {
    const costSrc = costTableSource()
    expect(costSrc).toContain("costCorrelationMode?.active !== true")
    expect(costSrc).toContain("showAssumptions")
    expect(costSrc).toContain("AssumptionsEditor")
    // Unmounting resets temporary UI; saved assumptions remain on the project.
    expect(appSource()).toContain("assumptions={activeProject.assumptions")
    expect(appSource()).not.toContain("assumptions={[]}")
  })

  it("archived mode can inspect assumptions without mutation callbacks", () => {
    const costSrc = costTableSource()
    const editorSrc = assumptionsEditorSource()
    expect(costSrc).toContain("readOnly={readOnly}")
    expect(costSrc).toMatch(/readOnly \|\|/)
    expect(editorSrc).toContain("readOnly = false")
    expect(editorSrc).toContain('data-readonly={readOnly ? "" : undefined}')
    expect(editorSrc).toContain("if (readOnly || !onAdd) return")
    expect(appSource()).toContain("analysisReadOnly\n                                ? undefined")
  })

  it("O: Impact and Define wiring remain unchanged", () => {
    expect(appSource()).toContain("handleImpactModeToggle")
    expect(appSource()).toContain("handleDefineModeToggle")
    expect(costTableSource()).toContain("costImpactSliders")
    expect(costTableSource()).toContain("defineMode")
  })

  it("J/K: assumption changes are excluded from stale comparable + Shapley signatures", () => {
    // Canonical signature omits descriptive context (bindings may rename).
    const signatureSrc = readFileSync(
      join(repoRoot, "src/domain/simulation/simulationInputSignature.ts"),
      "utf8",
    )
    expect(signatureSrc).toMatch(/assumptions:\s*_\w+/)
    expect(signatureSrc).toContain("Excludes descriptive/presentation metadata")
    const base = createProject({ id: "p1", name: "A" })
    const withAssumption: Project = {
      ...base,
      assumptions: [{ id: "a1", text: "Campus in use" }],
    }
    expect(shapleyInputSignature(base)).toBe(shapleyInputSignature(withAssumption))
  })

  it("L: old project state without assumptions loads with empty array semantics", () => {
    const parsed = parseProjectsPayload([
      {
        id: "p1",
        name: "Legacy",
        incurredCosts: 0,
        costRows: [
          {
            id: "c1",
            name: "",
            optimistic: "",
            likely: "",
            pessimistic: "",
          },
        ],
        driverRows: [
          {
            id: "d1",
            name: "",
            optimistic: "",
            likely: "",
            pessimistic: "",
          },
        ],
      },
    ])
    expect(parsed).not.toBeNull()
    expect(parsed![0]!.assumptions).toBeUndefined()
    expect(normalizeAssumptions(undefined)).toBeUndefined()
    expect(normalizeAssumptions([])).toBeUndefined()
  })

  it("M: serialization preserves assumptions where applicable", () => {
    const list = [
      { id: "a1", text: "First" },
      { id: "a2", text: "Second" },
    ]
    expect(assumptionsToShareTexts(list)).toEqual(["First", "Second"])
    const restored = assumptionsFromShareTexts(["First", "Second"])
    expect(restored).toHaveLength(2)
    expect(restored![0]!.text).toBe("First")
    expect(restored![1]!.text).toBe("Second")
    expect(restored![0]!.id).not.toBe(restored![1]!.id)

    const roundTrip = parseProjectsPayload([
      {
        id: "p1",
        name: "A",
        incurredCosts: 0,
        costRows: [
          { id: "c1", name: "", optimistic: "", likely: "", pessimistic: "" },
        ],
        driverRows: [
          { id: "d1", name: "", optimistic: "", likely: "", pessimistic: "" },
        ],
        assumptions: list,
      },
    ])
    expect(roundTrip![0]!.assumptions).toEqual(list)
  })

  it("N: NO/EN labels work", () => {
    expect(messages.no.inputs.assumptionsPlaceholder).toBe(
      "Skriv en forutsetning...",
    )
    expect(messages.en.inputs.assumptionsPlaceholder).toBe(
      "Add an assumption...",
    )
    expect(messages.no.inputs.assumptionsRemove).toBe("Fjern forutsetning")
    expect(messages.en.inputs.assumptionsRemove).toBe("Remove assumption")
    expect(messages.no.inputs.assumptionsSave).toBe("Lagre forutsetning")
    expect(messages.en.inputs.assumptionsSave).toBe("Save assumption")
  })

  it("typography stays subordinate to Cost Items heading", () => {
    const src = assumptionsEditorSource()
    expect(src).toContain("text-[12px] font-medium")
    expect(src).toContain("text-muted-foreground")
    expect(src).not.toContain("uppercase")
  })

  it("narrow layout allows action wrap beside label", () => {
    const src = assumptionsEditorSource()
    expect(src).toContain("flex-wrap")
    expect(src).toContain("gap-x-2.5 gap-y-1")
    expect(src).not.toContain("justify-between")
  })

  it("remove control is keyboard/touch accessible", () => {
    const src = assumptionsEditorSource()
    expect(src).toContain("assumption-chip-remove")
    expect(src).toContain('t("inputs.assumptionsRemove")')
    const css = readFileSync(join(repoRoot, "src/index.css"), "utf8")
    expect(css).toContain(".assumption-chip-remove")
    expect(css).toMatch(/@media \(hover: none\)[\s\S]*assumption-chip-remove/)
  })
})
