/**
 * Canonical simulation input signature.
 *
 * Contains ONLY fields that affect analytical calculations.
 * Excludes descriptive/presentation metadata (assumptions, profile, definitions, names).
 *
 * Used for: simulation baseline, Results stale, archive eligibility,
 * draft/inherited result validity, and shared stale gates.
 */

import type { Project } from "@/domain/analysis/project"
import { normalizeIncurredCosts } from "@/domain/analysis/project"
import { stripRowDefinitions } from "@/domain/results/rowDefinitions"
import { isMeaningfullyFilledRow } from "@/domain/results/tableRows"

function projectHasMeaningfulTableInput(project: Project): boolean {
  if (normalizeIncurredCosts(project.incurredCosts) > 0) return true
  return (
    project.costRows.some(isMeaningfullyFilledRow) ||
    project.driverRows.some(isMeaningfullyFilledRow)
  )
}

/**
 * Analytical projection of projects for signature / stale comparison.
 * Stable ordering: preserves project array order; strips presentation-only fields.
 */
export function simulationComparableProjects(projects: readonly Project[]): unknown[] {
  return projects.filter(projectHasMeaningfulTableInput).map((project) => {
    const { assumptions: _a, profile: _p, name: _n, ...rest } = project
    return {
      id: rest.id,
      incurredCosts: rest.incurredCosts,
      costRows: project.costRows.filter(isMeaningfullyFilledRow).map(stripRowDefinitions),
      driverRows: project.driverRows.filter(isMeaningfullyFilledRow).map(stripRowDefinitions),
      ...(rest.driverImpacts ? { driverImpacts: rest.driverImpacts } : {}),
      ...(rest.costCorrelations ? { costCorrelations: rest.costCorrelations } : {}),
    }
  })
}

/** Canonical input signature for simulation / validity. */
export function buildSimulationInputSignature(projects: readonly Project[]): string {
  return JSON.stringify(simulationComparableProjects(projects))
}

/**
 * @deprecated Prefer {@link simulationComparableProjects} — kept as alias for
 * App UI that still names the concept "staleComparable".
 */
export function staleComparableProjects(projects: readonly Project[]): unknown[] {
  return simulationComparableProjects(projects)
}
