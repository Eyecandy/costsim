import type { AnalysisLibraryRepository } from "@/persistence/analysisLibraryRepositoryTypes"
import { getLocalAnalysisLibraryRepository } from "@/persistence/localAnalysisLibraryRepository"

export type {
  ArchiveAnalysisArgs,
  CreateDraftFromArchivedArgs,
  CreateOngoingFromArchivedSingleArgs,
  AnalysisLibraryRepository,
} from "@/persistence/analysisLibraryRepositoryTypes"

let overrideRepo: AnalysisLibraryRepository | null = null

export function getAnalysisLibraryRepository(): AnalysisLibraryRepository {
  return overrideRepo ?? getLocalAnalysisLibraryRepository()
}

/** Test helper — not for production UI. */
export function setAnalysisLibraryRepositoryForTests(repo: AnalysisLibraryRepository | null): void {
  overrideRepo = repo
}
