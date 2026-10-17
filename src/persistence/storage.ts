import {
  initialProjects,
  normalizeIncurredCosts,
  type Project,
} from "@/domain/analysis/project"
import { normalizeAssumptions } from "@/domain/analysis/assumptions"
import { normalizeProjectProfile } from "@/domain/analysis/projectProfile"
import {
  normalizeCostRowDefinitions,
  normalizeDriverRowDefinitions,
} from "@/domain/results/rowDefinitions"
import { appFeatures } from "@/config/appVariant"

export const STORAGE_KEYS = {
  projects: "cost-simulator:v1:projects",
  activeProjectId: "cost-simulator:v1:activeProjectId",
  /** Last successful simulation: inputs signature, results, base costs (single JSON blob). */
  lastSimulationSnapshot: "cost-simulator:v1:lastSimulationSnapshot",
} as const

/**
 * Serialiserer og lagrer til localStorage. Feiler stille ved quota, private mode, osv.
 */
export function saveToStorage(key: string, value: unknown): void {
  try {
    if (typeof localStorage === "undefined") return
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* ignore */
  }
}

/**
 * Leser og parser JSON fra localStorage. Ved tom nøkkel, ugyldig JSON eller feil → fallback.
 */
export function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    if (typeof localStorage === "undefined") return fallback
    const item = localStorage.getItem(key)
    if (item === null || item.trim() === "") return fallback
    return JSON.parse(item) as T
  } catch {
    return fallback
  }
}

function isScenarioRow(x: unknown): boolean {
  if (typeof x !== "object" || x === null) return false
  const o = x as Record<string, unknown>
  return (
    typeof o.id === "string" &&
    typeof o.name === "string" &&
    typeof o.optimistic === "string" &&
    typeof o.likely === "string" &&
    typeof o.pessimistic === "string"
  )
}

function isProject(x: unknown): x is Project {
  if (typeof x !== "object" || x === null) return false
  const o = x as Record<string, unknown>
  if (
    typeof o.id !== "string" ||
    typeof o.name !== "string" ||
    !Array.isArray(o.costRows) ||
    !Array.isArray(o.driverRows)
  ) {
    return false
  }
  return (
    o.costRows.every(isScenarioRow) && o.driverRows.every(isScenarioRow)
  )
}

export function parseProjectsPayload(data: unknown): Project[] | null {
  if (!Array.isArray(data)) return null
  const out: Project[] = []
  for (const item of data.slice(0, appFeatures.maxProjects)) {
    if (!isProject(item)) return null
    const p = item as Project & { incurredCosts?: unknown; assumptions?: unknown }
    const { assumptions: _rawAssumptions, profile: _rawProfile, ...base } = p as Project & {
      assumptions?: unknown
      profile?: unknown
    }
    const assumptions = normalizeAssumptions(_rawAssumptions)
    const profile = normalizeProjectProfile(_rawProfile)
    out.push({
      ...base,
      incurredCosts: normalizeIncurredCosts(p.incurredCosts),
      costRows: p.costRows.map(normalizeCostRowDefinitions),
      driverRows: p.driverRows.map(normalizeDriverRowDefinitions),
      ...(assumptions ? { assumptions } : {}),
      ...(profile ? { profile } : {}),
    })
  }
  return out
}

let cachedInitialInput: {
  projects: Project[]
  activeProjectId: string
} | null = null

/**
 * Én gang per sideinnlasting: gyldige prosjekter + aktiv id, eller standard + første id.
 */
export function loadAppInputStateFromStorage(): {
  projects: Project[]
  activeProjectId: string
} {
  if (cachedInitialInput) return cachedInitialInput

  const rawProjects = loadFromStorage<unknown | null>(
    STORAGE_KEYS.projects,
    null,
  )
  let projects = parseProjectsPayload(rawProjects)
  if (!projects || projects.length === 0) {
    projects = initialProjects()
  }

  const rawActive = loadFromStorage<unknown | null>(
    STORAGE_KEYS.activeProjectId,
    null,
  )
  let activeProjectId = ""
  if (
    typeof rawActive === "string" &&
    projects.some((p) => p.id === rawActive)
  ) {
    activeProjectId = rawActive
  } else {
    activeProjectId = projects[0]?.id ?? ""
  }

  cachedInitialInput = { projects, activeProjectId }
  return cachedInitialInput
}

/** Clears the one-shot cache so the next load reads storage again (e.g. after logout reset). */
export function resetLoadAppInputStateCache(): void {
  cachedInitialInput = null
}

/** Removes persisted workspace input and last simulation snapshot from localStorage. */
export function clearWorkspacePersistedKeys(): void {
  try {
    if (typeof localStorage === "undefined") return
    localStorage.removeItem(STORAGE_KEYS.projects)
    localStorage.removeItem(STORAGE_KEYS.activeProjectId)
    localStorage.removeItem(STORAGE_KEYS.lastSimulationSnapshot)
  } catch {
    /* ignore */
  }
  resetLoadAppInputStateCache()
}
