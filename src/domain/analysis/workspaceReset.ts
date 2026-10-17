import type { ProjectResult } from "@/simulation.worker"
import { initialProjects, type Project } from "@/domain/analysis/project"
import { clearWorkspacePersistedKeys } from "@/lib/storage"
import { resetInitialRestoredSimulationCache } from "@/lib/lastSimulationSnapshot"

export type BlankWorkspaceRuntimeState = {
  projects: Project[]
  activeProjectId: string
  projectResults: ProjectResult[]
  simulatedBaseCostByProjectId: Record<string, number | null>
  lastSimulatedInputSignature: string
}

/** Fresh in-memory workspace matching a new session (single default project, no results). */
export function createBlankWorkspaceRuntimeState(): BlankWorkspaceRuntimeState {
  const projects = initialProjects()
  return {
    projects,
    activeProjectId: projects[0]!.id,
    projectResults: [],
    simulatedBaseCostByProjectId: {},
    lastSimulatedInputSignature: "",
  }
}

/**
 * Clears persisted workspace data (projects, active tab, last simulation snapshot)
 * and invalidates loaders’ one-shot caches. Call before applying blank runtime state.
 */
export function clearWorkspacePersistence(): void {
  clearWorkspacePersistedKeys()
  resetInitialRestoredSimulationCache()
}
