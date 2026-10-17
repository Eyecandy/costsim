import type { Project } from "@/domain/analysis/project"

export type AnalysisWorkspacePayload = {
  projects: Project[]
  activeProjectId: string
}
