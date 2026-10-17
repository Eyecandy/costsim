import { initialProjects, type Project } from "@/domain/analysis/project"
import { parseProjectsPayload } from "@/domain/analysis/projectsPayload"

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

  const rawProjects = loadFromStorage<unknown | null>(STORAGE_KEYS.projects, null)
  let projects = parseProjectsPayload(rawProjects)
  if (!projects || projects.length === 0) {
    projects = initialProjects()
  }

  const rawActive = loadFromStorage<unknown | null>(STORAGE_KEYS.activeProjectId, null)
  let activeProjectId = ""
  if (typeof rawActive === "string" && projects.some((p) => p.id === rawActive)) {
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
