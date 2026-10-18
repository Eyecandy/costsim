import type { ArchivedAnalysisSnapshotV1 } from "@/domain/analysis/archivedAnalysisSnapshot"
import type { CompactProjectResultV1 } from "@/domain/analysis/compactAnalysisResult"
import type { DraftResultSeedV1 } from "@/domain/analysis/draftResultSeed"
import type { Project } from "@/domain/analysis/project"
import type { useLazyShapleyAttribution } from "@/features/results/useLazyShapleyAttribution"

type LazyShapley = ReturnType<typeof useLazyShapleyAttribution>

/**
 * Per-project Contribution (Shapley) state for the Results UI: compact, archived and
 * seeded results are always ready or idle; live results follow the lazy calculation.
 */
export function resolveAttributionUi({
  archivedSnapshot,
  compactResultByProjectId,
  displayProjects,
  draftResultSeed,
  getError,
  getResult,
  getStatus,
  useArchivedResults,
  useCompactResults,
  useSeededShapley,
}: {
  archivedSnapshot: ArchivedAnalysisSnapshotV1 | null
  compactResultByProjectId: ReadonlyMap<string, CompactProjectResultV1>
  displayProjects: readonly Project[]
  draftResultSeed: DraftResultSeedV1 | null
  getError: LazyShapley["getError"]
  getResult: LazyShapley["getResult"]
  getStatus: LazyShapley["getStatus"]
  useArchivedResults: boolean
  useCompactResults: boolean
  useSeededShapley: boolean
}) {
  if (useCompactResults) {
    const states = displayProjects.map((project) => {
      const result = compactResultByProjectId.get(project.id)?.contribution ?? null
      return {
        projectId: project.id,
        projectName: project.name,
        status: (result ? "ready" : "idle") as "ready" | "idle",
        result,
        error: null as string | null,
      }
    })
    return {
      states,
      allReady: states.some((state) => state.result !== null),
      anyCalculating: false,
      anyIdle: states.some((state) => state.result === null),
      anyError: false,
      firstError: null as string | null,
    }
  }
  if (useArchivedResults && archivedSnapshot) {
    const states = displayProjects.map((project) => {
      const result = archivedSnapshot.shapleyByProjectId[project.id] ?? null
      return {
        projectId: project.id,
        projectName: project.name,
        status: (result ? "ready" : "idle") as "ready" | "idle",
        result,
        error: null as string | null,
      }
    })
    return {
      states,
      allReady: states.length > 0 && states.some((state) => state.result !== null),
      anyCalculating: false,
      anyIdle: states.some((state) => state.result === null),
      anyError: false,
      firstError: null as string | null,
    }
  }

  if (useSeededShapley && draftResultSeed) {
    const states = displayProjects.map((project) => {
      const result = draftResultSeed.shapleyByProjectId[project.id] ?? null
      return {
        projectId: project.id,
        projectName: project.name,
        status: (result ? "ready" : "idle") as "ready" | "idle",
        result,
        error: null as string | null,
      }
    })
    return {
      states,
      allReady: states.length > 0 && states.some((state) => state.result !== null),
      anyCalculating: false,
      anyIdle: states.some((state) => state.result === null),
      anyError: false,
      firstError: null as string | null,
    }
  }

  const states = displayProjects.map((project) => ({
    projectId: project.id,
    projectName: project.name,
    status: getStatus(project.id),
    result: getResult(project.id),
    error: getError(project.id),
  }))

  return {
    states,
    allReady:
      states.length > 0 &&
      states.every((state) => state.status === "ready" && state.result !== null),
    anyCalculating: states.some((state) => state.status === "calculating"),
    anyIdle: states.some((state) => state.status === "idle"),
    anyError: states.some((state) => state.status === "error"),
    firstError:
      states.find((state) => state.error)?.error ??
      states.find((state) => state.status === "error")?.error ??
      null,
  }
}
