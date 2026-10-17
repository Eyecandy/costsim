import { describe, expect, it } from "vitest"

import { buildSimulationProjectPayload } from "@/domain/simulation/buildSimulationProjectPayload"
import {
  formatWaterfallValueWithScale,
  resolveWaterfallDisplayScale,
} from "@/domain/results/formatWaterfallValue"
import { computeBaseCostSum, createProject } from "@/domain/analysis/project"
import { computeShapleyAttribution } from "@/domain/simulation/shapleyAttribution"
import { newId } from "@/domain/results/tableRows"

/** Representative ~200 M example project matching reported key-figure scale. */
function build200MExampleProject() {
  const project = createProject({ name: "Alternativ A" })
  const costs = [
    ["Felleskostnader", "18000000", "-15", "20"],
    ["Bygning", "95000000", "-10", "15"],
    ["VVS", "24000000", "-12", "18"],
    ["Elkraft", "16000000", "-12", "18"],
    ["Tele og automasjon", "5000000", "-12", "18"],
    ["Andre installasjoner", "7000000", "-12", "18"],
    ["Utendørs", "12000000", "-15", "20"],
    ["Generelle kostnader", "14000000", "-10", "15"],
    ["Spesielle kostnader", "9000000", "-10", "20"],
  ]
  const drivers = [
    ["Marked", "0", "-16", "16"],
    ["Prosjektutvikling", "0", "-5", "14"],
    ["Prosjektledelse", "0", "-15", "15"],
    ["Stedlige forhold", "0", "-6", "12"],
    ["Interessenter", "0", "-4", "9"],
  ]
  return {
    ...project,
    costRows: costs.map(([name, likely, optimistic, pessimistic]) => ({
      ...project.costRows[0]!,
      id: newId(),
      name,
      likely,
      optimistic,
      pessimistic,
    })),
    driverRows: drivers.map(([name, likely, optimistic, pessimistic]) => ({
      ...project.driverRows[0]!,
      id: newId(),
      name,
      likely,
      optimistic,
      pessimistic,
    })),
  }
}

describe("reported 202.8 M reconciliation example", () => {
  it("reconciles to user-reported main P50", () => {
    const userMainP50 = 202_773_993
    const project = build200MExampleProject()
    const payload = buildSimulationProjectPayload(project)!
    const baseCost = computeBaseCostSum(project.costRows, project.incurredCosts)!

    const result = computeShapleyAttribution({
      costTriangles: payload.costs,
      costIds: payload.costRowIds,
      costNames: payload.costNames,
      drivers: payload.drivers,
      driverIds: payload.driverRowIds,
      driverNames: payload.driverNames,
      driverImpacts: payload.driverImpacts,
      costCorrelation: payload.costCorrelation,
      incurredCosts: payload.incurredCosts,
      mainSimulationP50: userMainP50,
      seed: 4242,
      config: { permutations: 100, runsPerSubset: 3000, convergenceBatchSize: 50 },
    })

    const contributionSum = result.contributions.reduce(
      (acc, row) => acc + row.contribution,
      0,
    )
    const mainExpectedAddition = userMainP50 - baseCost
    const scale = resolveWaterfallDisplayScale([
      baseCost,
      userMainP50,
      ...result.contributions.map((c) => c.contribution),
    ])

    const report = {
      baseCost,
      mainP50: userMainP50,
      shapleyP50: result.estimatedP50,
      rawShapleyFullP50: result.diagnostics.rawShapleyFullP50,
      reconciliationDelta: result.diagnostics.fullCoalitionReconciliationDelta,
      deltaPctOfMainAddition:
        (Math.abs(result.diagnostics.fullCoalitionReconciliationDelta!) /
          Math.abs(mainExpectedAddition)) *
        100,
      contributionSum,
      additivityResidual: result.diagnostics.additivityResidual,
      lastPositionCounts: result.diagnostics.permutationLastPositionCounts,
      formattedMainNo: formatWaterfallValueWithScale(userMainP50, scale, "no"),
      formattedWaterfallNo: formatWaterfallValueWithScale(
        result.estimatedP50,
        scale,
        "no",
      ),
    }

    // eslint-disable-next-line no-console
    console.table(report)

    expect(result.estimatedP50).toBe(userMainP50)
    expect(Math.abs(result.diagnostics.additivityResidual)).toBeLessThan(1e-9)
    expect(report.formattedWaterfallNo).toBe("202,8 M")
  }, 60_000)
})
