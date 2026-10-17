import { normalizeIncurredCosts, type Project } from "@/domain/analysis/project"

/** Stable JSON signature of every Shapley-relevant project input. */
export function shapleyInputSignature(project: Project): string {
  return JSON.stringify({
    incurredCosts: normalizeIncurredCosts(project.incurredCosts),
    costRows: project.costRows.map((row) => ({
      id: row.id,
      name: row.name,
      optimistic: row.optimistic,
      likely: row.likely,
      pessimistic: row.pessimistic,
    })),
    driverRows: project.driverRows.map((row) => ({
      id: row.id,
      name: row.name,
      optimistic: row.optimistic,
      likely: row.likely,
      pessimistic: row.pessimistic,
    })),
    driverImpacts: project.driverImpacts ?? null,
    costCorrelations: project.costCorrelations ?? null,
  })
}
