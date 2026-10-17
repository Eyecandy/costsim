import type { Project } from "@/domain/analysis/project"
import { newId } from "@/domain/results/tableRows"
import { cloneProjectProfile } from "@/domain/analysis/projectProfile"

export type CloneProjectsResult = {
  projects: Project[]
  /** old project id → new project id */
  projectIdMap: Map<string, string>
  /** old cost/driver row id → new row id */
  rowIdMap: Map<string, string>
}

export type DuplicateProjectResult = {
  project: Project
  /** old cost row id → new cost row id */
  costIdMap: Map<string, string>
  /** old driver row id → new driver row id */
  driverIdMap: Map<string, string>
}

/**
 * First available copy name: `Name (2)`, `Name (3)`, …
 * Skips suffixes already present among `existingNames`.
 */
export function nextCopiedProjectName(
  sourceName: string,
  existingNames: readonly string[],
): string {
  const used = new Set(existingNames)
  let n = 2
  while (used.has(`${sourceName} (${n})`)) n += 1
  return `${sourceName} (${n})`
}

/**
 * Deep-copy one alternative's analytical INPUT with fresh project/row IDs
 * and remapped driver impacts + cost correlations.
 * Does not copy simulation results (those are keyed by project id elsewhere).
 */
export function duplicateProject(
  source: Project,
  overrides?: Partial<Pick<Project, "name">>,
): DuplicateProjectResult {
  const costIdMap = new Map<string, string>()
  const driverIdMap = new Map<string, string>()

  const costRows = source.costRows.map((row) => {
    const id = newId()
    costIdMap.set(row.id, id)
    return { ...row, id }
  })
  const driverRows = source.driverRows.map((row) => {
    const id = newId()
    driverIdMap.set(row.id, id)
    return { ...row, id }
  })

  let driverImpacts = source.driverImpacts
  if (driverImpacts) {
    const next: NonNullable<Project["driverImpacts"]> = {}
    for (const [dId, byCost] of Object.entries(driverImpacts)) {
      const nd = driverIdMap.get(dId)
      if (!nd) continue
      next[nd] = {}
      for (const [cId, v] of Object.entries(byCost)) {
        const nc = costIdMap.get(cId)
        if (nc) next[nd]![nc] = v
      }
    }
    driverImpacts = Object.keys(next).length > 0 ? next : undefined
  }

  let costCorrelations = source.costCorrelations
  if (costCorrelations) {
    const next: NonNullable<Project["costCorrelations"]> = {}
    for (const [aId, byB] of Object.entries(costCorrelations)) {
      const na = costIdMap.get(aId)
      if (!na) continue
      next[na] = {}
      for (const [bId, v] of Object.entries(byB)) {
        const nb = costIdMap.get(bId)
        if (nb) next[na]![nb] = v
      }
    }
    costCorrelations = Object.keys(next).length > 0 ? next : undefined
  }

  const assumptions = source.assumptions?.map((a) => ({
    ...a,
    id: newId(),
  }))

  const project: Project = {
    id: newId(),
    name: overrides?.name ?? source.name,
    incurredCosts: source.incurredCosts,
    costRows,
    driverRows,
    driverImpacts,
    costCorrelations,
    assumptions:
      assumptions && assumptions.length > 0 ? assumptions : undefined,
    profile: cloneProjectProfile(source.profile),
  }

  return { project, costIdMap, driverIdMap }
}

/** Deep-clone alternatives with fresh row/project IDs (for "create new version"). */
export function cloneProjectsWithMaps(
  projects: readonly Project[],
): CloneProjectsResult {
  const projectIdMap = new Map<string, string>()
  const rowIdMap = new Map<string, string>()

  const cloned = projects.map((p) => {
    const { project, costIdMap, driverIdMap } = duplicateProject(p)
    projectIdMap.set(p.id, project.id)
    for (const [oldId, newId] of costIdMap) rowIdMap.set(oldId, newId)
    for (const [oldId, newId] of driverIdMap) rowIdMap.set(oldId, newId)
    return project
  })

  return { projects: cloned, projectIdMap, rowIdMap }
}

/** Deep-clone alternatives with fresh row/project IDs (for "create new version"). */
export function cloneProjects(projects: readonly Project[]): Project[] {
  return cloneProjectsWithMaps(projects).projects
}
