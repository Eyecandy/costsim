import type { Project } from "@/domain/analysis/project"
import {
  normalizeResultPreferences,
  type ResultPreferencesV1,
} from "@/domain/results/resultPreferences"
import type { AnalysisDocument } from "@/domain/analysis/analysisDocument"
import type { ShapleyAttributionResult } from "@/domain/simulation/shapleyAttribution"
import {
  buildShapleyWorkerRequest,
  runShapleyAttributionForPayload,
} from "@/domain/simulation/shapleyWorkerMessages"
import { percentile } from "@/domain/simulation/stats"
import type { ProjectResult } from "@/domain/simulation/simulationTypes"

export function restoreDraftResultPreferences(
  doc: AnalysisDocument,
  replacePreferences: (next: ResultPreferencesV1) => void,
): void {
  if (doc.status !== "draft" || !doc.draftResultPreferences) return
  replacePreferences(normalizeResultPreferences(doc.draftResultPreferences))
}

export function computeShapleyByProjectIdForArchive(
  projects: readonly Project[],
  projectResults: readonly ProjectResult[],
): Record<string, ShapleyAttributionResult | null> {
  const shapleyByProjectId: Record<string, ShapleyAttributionResult | null> = {}
  for (const project of projects) {
    const pr = projectResults.find((r) => r.projectId === project.id)
    if (!pr || pr.values.length === 0) {
      shapleyByProjectId[project.id] = null
      continue
    }
    const request = buildShapleyWorkerRequest(
      project,
      percentile(pr.values, 50),
      percentile(pr.values, 85),
      "archive",
    )
    if (!request) {
      shapleyByProjectId[project.id] = null
      continue
    }
    shapleyByProjectId[project.id] = runShapleyAttributionForPayload(
      request.payload,
      request.mainSimulationP50,
      request.mainSimulationP85,
    )
  }
  return shapleyByProjectId
}
