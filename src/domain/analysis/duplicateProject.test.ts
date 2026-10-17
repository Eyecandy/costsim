import { describe, expect, it } from "vitest"

import {
  duplicateProject,
  nextCopiedProjectName,
} from "@/domain/analysis/cloneAnalysisWorkspace"
import {
  addProjectIfAllowed,
  createProject,
  maxProjectsReached,
  type Project,
} from "@/domain/analysis/project"
import { newId } from "@/domain/results/tableRows"

function richSource(): Project {
  const c1 = newId()
  const c2 = newId()
  const d1 = newId()
  const a1 = newId()
  return {
    id: newId(),
    name: "Alternativ A",
    incurredCosts: 12_500,
    costRows: [
      {
        id: c1,
        name: "Betong",
        description: "Fundamentsarbeid",
        optimistic: "80",
        likely: "100",
        pessimistic: "140",
      },
      {
        id: c2,
        name: "Stål",
        description: "Bæresystem",
        optimistic: "40",
        likely: "55",
        pessimistic: "90",
      },
    ],
    driverRows: [
      {
        id: d1,
        name: "Prisvekst",
        description: "Materialindeks",
        uncertaintyNotes: { lowerOutcome: ["Mild downside"], higherOutcome: ["Mild upside"] },
        optimistic: "-5",
        likely: "0",
        pessimistic: "10",
      },
    ],
    driverImpacts: {
      [d1]: {
        [c1]: "60",
        [c2]: "25",
      },
    },
    costCorrelations: {
      [c1]: {
        [c2]: "0.45",
      },
    },
    assumptions: [{ id: a1, text: "Entreprisen er fastpris." }],
  }
}

describe("nextCopiedProjectName", () => {
  it("uses (2), then (3), and fills gaps", () => {
    expect(nextCopiedProjectName("A", ["A"])).toBe("A (2)")
    expect(nextCopiedProjectName("A", ["A", "A (2)"])).toBe("A (3)")
    expect(nextCopiedProjectName("A", ["A", "A (2)", "A (4)"])).toBe("A (3)")
    expect(nextCopiedProjectName("Alternativ A", ["Alternativ A"])).toBe(
      "Alternativ A (2)",
    )
  })
})

describe("duplicateProject", () => {
  it("creates a new project id and default-overridable name", () => {
    const source = richSource()
    const { project } = duplicateProject(source, {
      name: nextCopiedProjectName(source.name, [source.name]),
    })
    expect(project.id).not.toBe(source.id)
    expect(project.name).toBe("Alternativ A (2)")
    expect(project.incurredCosts).toBe(12_500)
  })

  it("assigns new cost and driver row ids", () => {
    const source = richSource()
    const { project, costIdMap, driverIdMap } = duplicateProject(source)
    expect(project.costRows).toHaveLength(2)
    expect(project.driverRows).toHaveLength(1)
    for (const row of source.costRows) {
      expect(costIdMap.get(row.id)).toBeTruthy()
      expect(costIdMap.get(row.id)).not.toBe(row.id)
    }
    for (const row of source.driverRows) {
      expect(driverIdMap.get(row.id)).toBeTruthy()
      expect(driverIdMap.get(row.id)).not.toBe(row.id)
    }
    const newCostIds = new Set(project.costRows.map((r) => r.id))
    const newDriverIds = new Set(project.driverRows.map((r) => r.id))
    for (const row of source.costRows) expect(newCostIds.has(row.id)).toBe(false)
    for (const row of source.driverRows) {
      expect(newDriverIds.has(row.id)).toBe(false)
    }
  })

  it("copies input values and remaps driver impacts with same percentages", () => {
    const source = richSource()
    const srcDriver = source.driverRows[0]!
    const srcCostA = source.costRows[0]!
    const srcCostB = source.costRows[1]!
    const { project, costIdMap, driverIdMap } = duplicateProject(source)

    expect(project.costRows[0]).toMatchObject({
      name: "Betong",
      description: "Fundamentsarbeid",
      optimistic: "80",
      likely: "100",
      pessimistic: "140",
    })
    expect(project.driverRows[0]).toMatchObject({
      name: "Prisvekst",
      description: "Materialindeks",
      uncertaintyNotes: { lowerOutcome: ["Mild downside"], higherOutcome: ["Mild upside"] },
      optimistic: "-5",
      likely: "0",
      pessimistic: "10",
    })

    const nd = driverIdMap.get(srcDriver.id)!
    const ncA = costIdMap.get(srcCostA.id)!
    const ncB = costIdMap.get(srcCostB.id)!
    expect(project.driverImpacts?.[nd]?.[ncA]).toBe("60")
    expect(project.driverImpacts?.[nd]?.[ncB]).toBe("25")
    // No leftover source ids in impact map.
    expect(project.driverImpacts?.[srcDriver.id]).toBeUndefined()
    expect(project.driverImpacts?.[nd]?.[srcCostA.id]).toBeUndefined()
  })

  it("remaps cost correlations with same rho values", () => {
    const source = richSource()
    const srcCostA = source.costRows[0]!
    const srcCostB = source.costRows[1]!
    const { project, costIdMap } = duplicateProject(source)
    const ncA = costIdMap.get(srcCostA.id)!
    const ncB = costIdMap.get(srcCostB.id)!
    expect(project.costCorrelations?.[ncA]?.[ncB]).toBe("0.45")
    expect(project.costCorrelations?.[srcCostA.id]).toBeUndefined()
  })

  it("deep-copies so edits to the copy never mutate the source", () => {
    const source = richSource()
    const sourceSnapshot = structuredClone(source)
    const { project } = duplicateProject(source, { name: "Copy" })

    project.costRows[0]!.likely = "999"
    project.driverRows[0]!.pessimistic = "99"
    project.costRows[0]!.description = "CHANGED"
    project.assumptions![0]!.text = "CHANGED assumption"
    const nd = Object.keys(project.driverImpacts!)[0]!
    const nc = Object.keys(project.driverImpacts![nd]!)[0]!
    project.driverImpacts![nd]![nc] = "1"
    const ca = Object.keys(project.costCorrelations!)[0]!
    const cb = Object.keys(project.costCorrelations![ca]!)[0]!
    project.costCorrelations![ca]![cb] = "-0.9"

    expect(source).toEqual(sourceSnapshot)
  })

  it("does not inherit simulation results (copy is input-only)", () => {
    const source = richSource()
    const { project } = duplicateProject(source)
    // Project type has no result fields; results live outside keyed by project id.
    expect(project).not.toHaveProperty("values")
    expect(project).not.toHaveProperty("projectResults")
    expect(project.id).not.toBe(source.id)
  })

  it("respects max alternative limit via addProjectIfAllowed", () => {
    const a = createProject({ name: "A" })
    const b = duplicateProject(a, { name: "A (2)" }).project
    const atMax = addProjectIfAllowed([a], b, 2)
    expect(atMax).toHaveLength(2)
    const blocked = addProjectIfAllowed(atMax, duplicateProject(a).project, 2)
    expect(blocked).toHaveLength(2)
    expect(maxProjectsReached(atMax, 2)).toBe(true)
  })
})
