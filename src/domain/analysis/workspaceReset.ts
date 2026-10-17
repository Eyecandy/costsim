import type { ProjectResult } from "@/simulation.worker"
import { initialProjects, type Project } from "@/domain/analysis/project"

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
