import { useCallback } from "react"

import { isAnalysisTrashed } from "@/domain/analysis/analysisDocument"
import { logError } from "@/shared/logError"
import type { AnalysisDocument } from "@/domain/analysis/analysisDocument"
import {
  canStartOngoingFromArchivedSingle,
  planCreateOngoingFromArchivedSingle,
  resolveArchivedSingleAlternatives,
  type StartOngoingFromArchivedSingleBlockReason,
} from "@/domain/analysis/createOngoingFromArchivedSingle"
import {
  buildSingleArchivedResultSnapshot,
  type SingleAnalysisArchivedSnapshot,
} from "@/domain/analysis/singleArchivedResultSnapshot"
import { freezeSingleDraftForArchive } from "@/domain/analysis/singleDraftResultSnapshot"
import type { LibrarySessionContext } from "@/features/analysis-library/session/sessionContext"
import type { ArchiveCurrentResult } from "@/features/analysis-library/session/sessionTypes"
import { computeShapleyByProjectIdForArchive } from "@/features/analysis-library/session/sessionSupport"

/** Archive the draft, make a new version from an archived analysis, start Ongoing from an archived Single. */
export function useArchiveCommands({
  repo,
  docMeta,
  checkpointReadOnly,
  enqueueSave,
  readLiveArchiveBlockReason,
  saveTimerRef,
  skipNextSaveRef,
  singleDraftResultRef,
  liveArchiveStateRef,
  setDocMeta,
  setOngoing,
  setDraftResultSeed,
  setArchivedSnapshot,
  setSingleDraftResult,
}: LibrarySessionContext) {
  const archiveCurrent = useCallback(async (): Promise<ArchiveCurrentResult> => {
    if (!docMeta || docMeta.status !== "draft") {
      return { ok: false, reason: "not_draft" }
    }
    if (checkpointReadOnly) {
      return { ok: false, reason: "not_draft" }
    }
    const blockReason = readLiveArchiveBlockReason()
    if (blockReason) {
      return { ok: false, reason: blockReason }
    }

    // Cancel any debounced autosave so it cannot fire mid-archive.
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current)
      saveTimerRef.current = null
    }

    const live = liveArchiveStateRef.current
    let snapshot: SingleAnalysisArchivedSnapshot
    if (live.projectResults.length > 0 && live.lastSimulatedInputSignature.trim() !== "") {
      const shapleyByProjectId = computeShapleyByProjectIdForArchive(
        live.projects,
        live.projectResults,
      )
      snapshot = buildSingleArchivedResultSnapshot({
        analysisId: docMeta.id,
        projects: live.projects,
        activeProjectId: live.activeProjectId,
        projectResults: live.projectResults,
        simulatedBaseCostByProjectId: live.simulatedBaseCostByProjectId,
        inputSignature: live.lastSimulatedInputSignature,
        simulationCount: live.simulationCount,
        resultPreferences: live.resultPreferences,
        shapleyByProjectId,
        simulationRunIdByProjectId: live.simulationRunIdByProjectId,
      })
    } else if (
      singleDraftResultRef.current &&
      singleDraftResultRef.current.analysisId === docMeta.id
    ) {
      snapshot = freezeSingleDraftForArchive({
        draft: singleDraftResultRef.current,
        projects: live.projects,
        resultPreferences: live.resultPreferences,
      })
    } else {
      return { ok: false, reason: "no_results" }
    }

    const analysisIdToArchive = docMeta.id
    const archiveHolder: { doc: AnalysisDocument | null } = { doc: null }

    // Serialize behind in-flight draft saves so a stale saveDraft cannot
    // overwrite the archived document afterward.
    try {
      await enqueueSave(async () => {
        const existing = await repo.get(analysisIdToArchive)
        if (!existing || existing.status !== "draft" || existing.deletedAt) {
          throw new Error("not_draft")
        }
        archiveHolder.doc = await repo.archive({
          analysisId: analysisIdToArchive,
          snapshot,
        })
      })
    } catch (error) {
      logError("archive current analysis", error)
      /* archiveHolder.doc stays null */
    }

    const archived = archiveHolder.doc
    if (!archived) {
      return { ok: false, reason: "persistence_failed" }
    }

    skipNextSaveRef.current = true
    setDocMeta({
      id: archived.id,
      name: archived.name,
      status: archived.status,
      folderId: archived.folderId,
      analysisMode: archived.analysisMode ?? docMeta.analysisMode,
      previousVersionId: archived.previousVersionId,
    })
    setOngoing(archived.ongoing ?? null)
    setArchivedSnapshot(archived.archivedSnapshot ?? snapshot)
    setDraftResultSeed(null)
    setSingleDraftResult(null)
    return { ok: true, doc: archived }
  }, [
    checkpointReadOnly,
    docMeta,
    enqueueSave,
    liveArchiveStateRef,
    readLiveArchiveBlockReason,
    repo,
    saveTimerRef,
    setArchivedSnapshot,
    setDocMeta,
    setDraftResultSeed,
    setOngoing,
    setSingleDraftResult,
    singleDraftResultRef,
    skipNextSaveRef,
  ])

  const createNewVersion = useCallback(
    async (versionSuffix: string) => {
      if (!docMeta || docMeta.status !== "archived") return null
      const draft = await repo.createDraftFromArchived({
        archivedId: docMeta.id,
        name: `${docMeta.name}${versionSuffix}`,
      })
      return draft
    },
    [docMeta, repo],
  )

  /**
   * New Ongoing Analysis from the current archived Single Analysis.
   * Copy/import only — never mutates the source.
   *
   * - No selectedProjectId → { need_selection, projects } (always; dialog collects name)
   * - With selectedProjectId (+ optional name) → creates with that alternative
   */
  const beginStartOngoingFromArchived = useCallback(
    async (
      selectedProjectId?: string,
      name?: string,
    ): Promise<
      | { ok: true; doc: AnalysisDocument }
      | {
          ok: false
          reason: StartOngoingFromArchivedSingleBlockReason
          projects?: { id: string; name: string }[]
        }
    > => {
      if (!docMeta || docMeta.status !== "archived") {
        return { ok: false, reason: "not_archived" }
      }
      if (docMeta.analysisMode !== "single") {
        return { ok: false, reason: "not_single" }
      }
      if (!canStartOngoingFromArchivedSingle({ ...docMeta, deletedAt: null })) {
        return { ok: false, reason: "not_archived" }
      }

      const source = await repo.get(docMeta.id)
      if (!source) return { ok: false, reason: "not_found" }
      if (isAnalysisTrashed(source)) return { ok: false, reason: "trashed" }

      // Always open the create dialog so the user can confirm/edit the analysis name.
      if (!selectedProjectId) {
        const projects = resolveArchivedSingleAlternatives(source).map((p) => ({
          id: p.id,
          name: p.name,
        }))
        if (!projects.length) return { ok: false, reason: "empty" }
        return { ok: false, reason: "need_selection", projects }
      }

      const planned = planCreateOngoingFromArchivedSingle(source, {
        selectedProjectId,
        name,
      })
      if (!planned.ok) {
        if (planned.reason === "need_selection" && planned.projects) {
          return {
            ok: false,
            reason: "need_selection",
            projects: planned.projects.map((p) => ({
              id: p.id,
              name: p.name,
            })),
          }
        }
        return { ok: false, reason: planned.reason }
      }

      const doc = await repo.createOngoingFromArchivedSingle({
        archivedId: source.id,
        selectedProjectId: planned.plan.sourceProjectId,
        name,
      })
      return { ok: true, doc }
    },
    [docMeta, repo],
  )

  /** @deprecated Prefer beginStartOngoingFromArchived */
  const startOngoingFromArchived = useCallback(
    async (selectedProjectId: string, name?: string) => {
      const result = await beginStartOngoingFromArchived(selectedProjectId, name)
      return result.ok ? result.doc : null
    },
    [beginStartOngoingFromArchived],
  )

  return {
    archiveCurrent,
    createNewVersion,
    beginStartOngoingFromArchived,
    startOngoingFromArchived,
  }
}
