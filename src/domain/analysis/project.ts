import {
  parseCorrelationCoefficient,
  identityCorrelationMatrix,
  isValidCorrelationMatrix,
} from "@/domain/simulation/costCorrelation"
import {
  type ProjectAssumption,
  createAssumption,
  normalizeAssumptions,
  parseAssumptionText,
} from "@/domain/analysis/assumptions"
import {
  type ProjectProfile,
  normalizeProjectProfile,
} from "@/domain/analysis/projectProfile"
import {
  type CostElementRow,
  defaultCostRows,
  defaultDriverRows,
  emptyScenarioRow,
  type DriverRow,
  newId,
  parseNumberField,
  resolveDriverImpactPercent,
  clampDriverImpactInput,
} from "@/domain/results/tableRows"

/** driverRowId → costRowId → impact % string (0–100). Omitted pairs default to 100%. */
export type DriverImpactsByRowId = Record<string, Record<string, string>>

/** costRowIdA → costRowIdB → latent copula ρ string in [-1, 1]. Omitted pairs → 0. */
export type CostCorrelationsByRowId = Record<string, Record<string, string>>

export type Project = {
  id: string
  name: string
  /** Fixed known costs already spent (not simulated as uncertain). */
  incurredCosts: number
  costRows: CostElementRow[]
  driverRows: DriverRow[]
  /** Per driver × cost-item impact (%). Missing project field → all 100%. */
  driverImpacts?: DriverImpactsByRowId
  /** Pairwise cost-item latent correlations. Missing → independent sampling. */
  costCorrelations?: CostCorrelationsByRowId
  /**
   * Descriptive analysis premises (ordered). Context only — not a Monte Carlo input.
   * Missing / empty → no assumptions.
   */
  assumptions?: ProjectAssumption[]
  /**
   * Structured project characteristics (phase, complexity, etc.).
   * Context only — not a Monte Carlo input. Missing / empty → no profile.
   */
  profile?: ProjectProfile
}

/**
 * Numeric impact matrix aligned with parsed simulation arrays:
 * `[costIndex][driverIndex]` as 0–100.
 */
export function buildSimulationDriverImpactMatrix(
  costRows: readonly { id: string }[],
  driverRows: readonly { id: string }[],
  driverImpacts: DriverImpactsByRowId | undefined,
): number[][] {
  return costRows.map((costRow) =>
    driverRows.map((driverRow) =>
      resolveDriverImpactPercent(driverImpacts?.[driverRow.id]?.[costRow.id]),
    ),
  )
}

function resolveStoredCostCorrelation(
  costCorrelations: CostCorrelationsByRowId | undefined,
  rowIdA: string,
  rowIdB: string,
): number {
  if (rowIdA === rowIdB) return 1
  const direct =
    costCorrelations?.[rowIdA]?.[rowIdB] ??
    costCorrelations?.[rowIdB]?.[rowIdA]
  return parseCorrelationCoefficient(direct)
}

/**
 * Numeric correlation matrix aligned with parsed simulation cost arrays:
 * `[costIndexA][costIndexB]` as latent Gaussian-copula ρ.
 */
export function buildSimulationCostCorrelationMatrix(
  costRows: readonly { id: string }[],
  costCorrelations: CostCorrelationsByRowId | undefined,
): number[][] {
  const n = costRows.length
  if (n === 0) return []
  const matrix = identityCorrelationMatrix(n)
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const rho = resolveStoredCostCorrelation(
        costCorrelations,
        costRows[i]!.id,
        costRows[j]!.id,
      )
      matrix[i]![j] = rho
      matrix[j]![i] = rho
    }
  }
  return matrix
}

/** Apply one pairwise patch to a correlation map (does not mutate input). */
export function applyCostCorrelationPairPatch(
  costCorrelations: CostCorrelationsByRowId | undefined,
  costRowIdA: string,
  costRowIdB: string,
  raw: string,
): CostCorrelationsByRowId | undefined {
  if (costRowIdA === costRowIdB) return costCorrelations
  const parsed = parseCorrelationCoefficient(raw)
  const clamped = String(parsed)
  const next: CostCorrelationsByRowId = { ...(costCorrelations ?? {}) }
  const rowMap = { ...(next[costRowIdA] ?? {}) }
  if (raw.trim() === "" || parsed === 0) {
    delete rowMap[costRowIdB]
  } else {
    rowMap[costRowIdB] = clamped
  }
  if (Object.keys(rowMap).length === 0) {
    delete next[costRowIdA]
  } else {
    next[costRowIdA] = rowMap
  }
  return Object.keys(next).length > 0 ? next : undefined
}

/** Whether applying a slider edit would yield a PSD correlation matrix. */
export function isCostCorrelationPatchValid(
  costRows: readonly { id: string }[],
  costCorrelations: CostCorrelationsByRowId | undefined,
  costRowIdA: string,
  costRowIdB: string,
  raw: string,
): boolean {
  const patched = applyCostCorrelationPairPatch(
    costCorrelations,
    costRowIdA,
    costRowIdB,
    raw,
  )
  return isValidCorrelationMatrix(
    buildSimulationCostCorrelationMatrix(costRows, patched),
  )
}

/**
 * Apply one correlation value to every unique pair in a selected cost-item group.
 * Clears both storage directions per pair, then writes under the first id.
 * Does not mutate input. Connections outside the group are unchanged.
 */
export function applyCostCorrelationGroupPatch(
  costCorrelations: CostCorrelationsByRowId | undefined,
  selectedCostRowIds: readonly string[],
  raw: string,
): CostCorrelationsByRowId | undefined {
  const unique: string[] = []
  const seen = new Set<string>()
  for (const id of selectedCostRowIds) {
    if (seen.has(id)) continue
    seen.add(id)
    unique.push(id)
  }
  if (unique.length < 2) return costCorrelations

  let next = costCorrelations
  for (let i = 0; i < unique.length; i++) {
    for (let j = i + 1; j < unique.length; j++) {
      const a = unique[i]!
      const b = unique[j]!
      // Drop any reverse key so resolveStored cannot read a stale opposite entry.
      next = applyCostCorrelationPairPatch(next, b, a, "0")
      next = applyCostCorrelationPairPatch(next, a, b, raw)
    }
  }
  return next
}

/** Whether applying a group correlation would yield a PSD correlation matrix. */
export function isCostCorrelationGroupPatchValid(
  costRows: readonly { id: string }[],
  costCorrelations: CostCorrelationsByRowId | undefined,
  selectedCostRowIds: readonly string[],
  raw: string,
): boolean {
  const patched = applyCostCorrelationGroupPatch(
    costCorrelations,
    selectedCostRowIds,
    raw,
  )
  return isValidCorrelationMatrix(
    buildSimulationCostCorrelationMatrix(costRows, patched),
  )
}

/** Uniform value among all unique pairs in a selection, or mixed/empty. */
export function getSelectedGroupCorrelationState(
  costCorrelations: CostCorrelationsByRowId | undefined,
  selectedCostRowIds: readonly string[],
):
  | { kind: "empty" }
  | { kind: "uniform"; value: number }
  | { kind: "mixed" } {
  const unique: string[] = []
  const seen = new Set<string>()
  for (const id of selectedCostRowIds) {
    if (seen.has(id)) continue
    seen.add(id)
    unique.push(id)
  }
  if (unique.length < 2) return { kind: "empty" }

  let first: number | null = null
  for (let i = 0; i < unique.length; i++) {
    for (let j = i + 1; j < unique.length; j++) {
      const rho = resolveStoredCostCorrelation(
        costCorrelations,
        unique[i]!,
        unique[j]!,
      )
      if (first === null) first = rho
      else if (first !== rho) return { kind: "mixed" }
    }
  }
  return { kind: "uniform", value: first ?? 0 }
}

export function patchProjectCostCorrelation(
  projects: Project[],
  projectId: string,
  costRowIdA: string,
  costRowIdB: string,
  raw: string,
): Project[] {
  return projects.map((p) => {
    if (p.id !== projectId) return p
    const costCorrelations = applyCostCorrelationPairPatch(
      p.costCorrelations,
      costRowIdA,
      costRowIdB,
      raw,
    )
    return { ...p, costCorrelations }
  })
}

export function patchProjectCostCorrelationGroup(
  projects: Project[],
  projectId: string,
  selectedCostRowIds: readonly string[],
  raw: string,
): Project[] {
  return projects.map((p) => {
    if (p.id !== projectId) return p
    const costCorrelations = applyCostCorrelationGroupPatch(
      p.costCorrelations,
      selectedCostRowIds,
      raw,
    )
    return { ...p, costCorrelations }
  })
}

export function normalizeIncurredCosts(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0
  return Math.max(0, value)
}

/** Sum of incurred costs + cost-item likely values (cost-table footer / simulation base). */
export function computeBaseCostSum(
  costRows: readonly { likely: string }[],
  incurredCosts: number,
): number | null {
  let sum = normalizeIncurredCosts(incurredCosts)
  let hasAny = sum > 0
  for (const row of costRows) {
    const value = parseNumberField(row.likely)
    if (value !== null) {
      sum += value
      hasAny = true
    }
  }
  return hasAny ? sum : null
}

/**
 * Derived Project Profile cost-size characteristic for future benchmarking.
 * Uses the same authoritative Base Cost as the rest of the app — not a
 * Small/Medium/Large user classification, and not shown as a profile chip.
 */
export function deriveProjectProfileBaseCost(
  project: Pick<Project, "costRows" | "incurredCosts">,
): number | null {
  return computeBaseCostSum(project.costRows, project.incurredCosts)
}

/** Delta between totals where fixed incurred costs are excluded from both sides. */
export function computeUncertainDeltaWithPct(
  total: number | null,
  base: number | null,
  incurredCosts: number,
): { absolute: number | null; percent: number | null } {
  if (total === null || base === null) {
    return { absolute: null, percent: null }
  }
  const incurred = normalizeIncurredCosts(incurredCosts)
  const uncertainTotal = total - incurred
  const uncertainBase = base - incurred
  const absolute = uncertainTotal - uncertainBase
  if (uncertainBase === 0) {
    return { absolute, percent: null }
  }
  return { absolute, percent: (absolute / uncertainBase) * 100 }
}

export function patchProjectIncurredCosts(
  projects: Project[],
  projectId: string,
  incurredCosts: number,
): Project[] {
  const safe = normalizeIncurredCosts(incurredCosts)
  return projects.map((p) =>
    p.id === projectId ? { ...p, incurredCosts: safe } : p,
  )
}

export const MAX_PROJECTS = 2

/** Character cap for project names (generous for normal titles). */
export const PROJECT_NAME_MAX_LENGTH = 80

/** Faste visningsnavn per plass (maks to alternativer). */
export const PROJECT_SLOT_NAMES = ["Alternativ A", "Alternativ B"] as const

export function createProject(
  overrides?: Partial<Pick<Project, "id" | "name">>,
): Project {
  return {
    id: overrides?.id ?? newId(),
    name: overrides?.name ?? PROJECT_SLOT_NAMES[0],
    incurredCosts: 0,
    costRows: defaultCostRows(),
    driverRows: defaultDriverRows(),
  }
}

/** Samme antall kost- og driver-rader som mal, alle felt tomme (nye rad-ID-er). */
export function projectFromTemplateEmptyRows(
  template: Pick<Project, "costRows" | "driverRows">,
  name: string,
): Project {
  return {
    id: newId(),
    name,
    incurredCosts: 0,
    costRows: Array.from({ length: template.costRows.length }, () =>
      emptyScenarioRow(),
    ),
    driverRows: Array.from({ length: template.driverRows.length }, () =>
      emptyScenarioRow(),
    ),
  }
}

/** Ett alternativ («Alternativ A») ved oppstart. */
export function initialProjects(): Project[] {
  return [createProject()]
}

export function maxProjectsReached(
  projects: readonly Project[],
  maxProjects = MAX_PROJECTS,
): boolean {
  return projects.length >= maxProjects
}

export function patchProjectDriverImpact(
  projects: Project[],
  projectId: string,
  driverRowId: string,
  costRowId: string,
  raw: string,
): Project[] {
  const clamped = clampDriverImpactInput(raw)
  return projects.map((p) => {
    if (p.id !== projectId) return p
    const next: DriverImpactsByRowId = { ...(p.driverImpacts ?? {}) }
    const rowMap = { ...(next[driverRowId] ?? {}) }
    if (clamped.trim() === "") {
      delete rowMap[costRowId]
    } else {
      rowMap[costRowId] = clamped
    }
    if (Object.keys(rowMap).length === 0) {
      delete next[driverRowId]
    } else {
      next[driverRowId] = rowMap
    }
    const driverImpacts = Object.keys(next).length > 0 ? next : undefined
    return { ...p, driverImpacts }
  })
}

/** Legg til prosjekt kun hvis antall < MAX_PROJECTS; ellers uendret liste. */
export function addProjectIfAllowed(
  projects: Project[],
  project: Project,
  maxProjects = MAX_PROJECTS,
): Project[] {
  if (projects.length >= maxProjects) return projects
  return [...projects, project]
}

export function patchProjectName(
  projects: Project[],
  projectId: string,
  name: string,
): Project[] {
  const safe =
    name.length <= PROJECT_NAME_MAX_LENGTH
      ? name
      : name.slice(0, PROJECT_NAME_MAX_LENGTH)
  return projects.map((p) => (p.id === projectId ? { ...p, name: safe } : p))
}

function withAssumptions(
  project: Project,
  assumptions: ProjectAssumption[] | undefined,
): Project {
  if (!assumptions || assumptions.length === 0) {
    const { assumptions: _omit, ...rest } = project
    return rest
  }
  return { ...project, assumptions }
}

function withProfile(
  project: Project,
  profile: ProjectProfile | undefined,
): Project {
  const normalized = normalizeProjectProfile(profile)
  if (!normalized) {
    const { profile: _omit, ...rest } = project
    return rest
  }
  return { ...project, profile: normalized }
}

/** Replace the Project Profile for one alternative (metadata only). */
export function patchProjectProfile(
  projects: Project[],
  projectId: string,
  profile: ProjectProfile | undefined,
): Project[] {
  return projects.map((p) => {
    if (p.id !== projectId) return p
    return withProfile(p, profile)
  })
}

export function patchProjectAddAssumption(
  projects: Project[],
  projectId: string,
  text: string,
): Project[] {
  const created = createAssumption(text)
  if (!created) return projects
  return projects.map((p) => {
    if (p.id !== projectId) return p
    const next = [...(p.assumptions ?? []), created]
    return withAssumptions(p, next)
  })
}

export function patchProjectUpdateAssumption(
  projects: Project[],
  projectId: string,
  assumptionId: string,
  text: string,
): Project[] {
  const parsed = parseAssumptionText(text)
  if (parsed === null) return projects
  return projects.map((p) => {
    if (p.id !== projectId) return p
    const list = p.assumptions ?? []
    const index = list.findIndex((a) => a.id === assumptionId)
    if (index < 0) return p
    const next = list.map((a) =>
      a.id === assumptionId ? { ...a, text: parsed } : a,
    )
    return withAssumptions(p, next)
  })
}

export function patchProjectRemoveAssumption(
  projects: Project[],
  projectId: string,
  assumptionId: string,
): Project[] {
  return projects.map((p) => {
    if (p.id !== projectId) return p
    const list = p.assumptions ?? []
    if (!list.some((a) => a.id === assumptionId)) return p
    const next = list.filter((a) => a.id !== assumptionId)
    return withAssumptions(p, next.length > 0 ? next : undefined)
  })
}
