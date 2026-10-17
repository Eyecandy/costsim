import {
  buildSimulationCostCorrelationMatrix,
  buildSimulationDriverImpactMatrix,
  normalizeIncurredCosts,
  type Project,
} from "@/lib/project"
import {
  parseCostForSimulation,
  parseDriverForSimulation,
  type CostElementRow,
  type DriverRow,
} from "@/lib/tableRows"
import type { SimulationProjectPayload } from "@/simulation.worker"

export function buildSimulationProjectPayload(
  project: Project,
): SimulationProjectPayload | null {
  const parsed = project.costRows
    .map((row) => ({ row, params: parseCostForSimulation(row) }))
    .filter(
      (
        x,
      ): x is {
        row: CostElementRow
        params: NonNullable<ReturnType<typeof parseCostForSimulation>>
      } => x.params !== null,
    )
  if (parsed.length === 0) return null

  const driverParsed = project.driverRows
    .map((row) => ({ row, params: parseDriverForSimulation(row) }))
    .filter(
      (
        x,
      ): x is {
        row: DriverRow
        params: NonNullable<ReturnType<typeof parseDriverForSimulation>>
      } => x.params !== null,
    )

  const parsedCostRows = parsed.map((x) => x.row)
  const parsedDriverRows = driverParsed.map((x) => x.row)

  return {
    projectId: project.id,
    incurredCosts: normalizeIncurredCosts(project.incurredCosts),
    costs: parsed.map((x) => x.params),
    drivers: driverParsed.map((x) => x.params),
    driverImpacts: buildSimulationDriverImpactMatrix(
      parsedCostRows,
      parsedDriverRows,
      project.driverImpacts,
    ),
    costCorrelation: buildSimulationCostCorrelationMatrix(
      parsedCostRows,
      project.costCorrelations,
    ),
    costNames: parsed.map((x) => x.row.name),
    driverNames: driverParsed.map((x) => x.row.name),
    costRowIds: parsedCostRows.map((r) => r.id),
    driverRowIds: parsedDriverRows.map((r) => r.id),
  }
}
