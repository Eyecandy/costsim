import { useCallback } from "react"

import { nowIso } from "@/domain/analysis/analysisDocument"
import {
  archiveCheckpoint,
  createNextCheckpoint,
  deleteActiveDraftCheckpoint,
  ensureSingleProjectWorkspace,
  getActiveCheckpoint,
  getCompleteOngoingAnalysisBlockReason,
  getLatestCheckpoint,
  selectCheckpoint as selectCheckpointInState,
  syncActiveCheckpointWorkspace,
} from "@/domain/analysis/analysisCheckpoint"
import { librarySaveStatusFromError } from "@/persistence/localAnalysisLibraryRepository"
import { getArchiveBlockReason } from "@/domain/analysis/buildArchivedAnalysisSnapshot"
import { logError } from "@/shared/logError"
import type { Project } from "@/domain/analysis/project"
import {
  omitDraftResultFields,
  replaceDraftResultField,
} from "@/domain/analysis/draftResultPersist"
import type { AnalysisDocument } from "@/domain/analysis/analysisDocument"
import {
  buildOngoingCheckpointResultSnapshot,
  freezeOngoingCompactForArchive,
  isOngoingCheckpointResultSnapshot,
  type OngoingCheckpointResultSnapshotV1,
} from "@/domain/analysis/ongoingCheckpointResultSnapshot"
import { pickAuthoritativeOngoingDraftResult } from "@/domain/analysis/ongoingDraftResultCommit"
import type { OngoingCheckpointContext } from "@/features/analysis-library/session/sessionContext"
import type {
  ArchiveCheckpointResult,
  CreateNextCheckpointSessionResult,
  DeleteActiveDraftCheckpointSessionResult,
  CompleteOngoingAnalysisResult,
} from "@/features/analysis-library/session/sessionTypes"
import { computeShapleyByProjectIdForArchive } from "@/features/analysis-library/session/sessionSupport"

/** Ongoing-analysis checkpoint commands: archive, complete, create next, delete tip draft, select. */
export function useOngoingCheckpointCommands({
  args,
  repo,
  docMeta,
  ongoing,
  enqueueSave,
  setSaveStatusSafe,
  readLiveArchiveBlockReason,
  applyCheckpointView,
  ongoingRef,
  saveTimerRef,
  skipNextSaveRef,
  loadedIdRef,
  draftResultSeedRef,
  ongoingDraftResultRef,
  liveArchiveStateRef,
  setDocMeta,
  setOngoing,
  setDraftResultSeed,
  setOngoingDraftResult,
  setArchivedSnapshot,
  flushPendingSave,
}: OngoingCheckpointContext) {
  /**
   * Ongoing mode: freeze the active draft checkpoint. Document stays draft;
   * the ongoing analysis remains active (not completed).
   */
  const archiveActiveCheckpoint = useCallback(async (): Promise<ArchiveCheckpointResult> => {
    if (!docMeta || docMeta.status !== "draft") {
      return { ok: false, reason: "not_draft" }
    }
    if (docMeta.analysisMode !== "ongoing") {
      return { ok: false, reason: "not_ongoing" }
    }

    const liveOngoing = ongoingRef.current
    if (!liveOngoing) {
      return { ok: false, reason: "not_ongoing" }
    }
    const liveActive = getActiveCheckpoint(liveOngoing)
    if (!liveActive || liveActive.status !== "draft") {
      return { ok: false, reason: "not_draft" }
    }

    const blockReason = readLiveArchiveBlockReason()
    if (blockReason) {
      return { ok: false, reason: blockReason }
    }

    try {
      await flushPendingSave()
    } catch (error) {
      logError("flush pending save before archiving the checkpoint", error)
      /* continue with current App state */
    }

    const live = liveArchiveStateRef.current
    const compactDraft = ongoingDraftResultRef.current
    // Re-check after flush — same canonical validity model (live arrays or compact).
    const blockAfterFlush = getArchiveBlockReason({
      analysisId: docMeta.id,
      checkpointId: ongoingRef.current?.activeCheckpointId ?? null,
      projects: live.projects,
      projectResults: live.projectResults,
      lastSimulatedInputSignature: live.lastSimulatedInputSignature,
      simulationState: {
        analysisId: live.liveSimulationAnalysisId,
        checkpointId: live.liveSimulationCheckpointId,
        inputSignature: live.lastSimulatedInputSignature,
        projectResults: live.projectResults,
        simulatedBaseCostByProjectId: live.simulatedBaseCostByProjectId,
        activeProjectIdAtRun: live.activeProjectId,
        simulationCount: live.simulationCount,
        projectsAtRun: [],
      },
      ongoingCompactResult: compactDraft,
      resultPreferences: live.resultPreferences,
    })
    if (blockAfterFlush) {
      return { ok: false, reason: blockAfterFlush }
    }

    const authoritativeOngoing = ongoingRef.current
    if (!authoritativeOngoing) {
      return { ok: false, reason: "not_ongoing" }
    }
    const activeId = authoritativeOngoing.activeCheckpointId
    const active = getActiveCheckpoint(authoritativeOngoing)
    if (!active || active.status !== "draft") {
      return { ok: false, reason: "not_draft" }
    }

    const archivedAt = nowIso()
    let snapshot: OngoingCheckpointResultSnapshotV1
    if (live.projectResults.length > 0) {
      const shapleyByProjectId = computeShapleyByProjectIdForArchive(
        live.projects,
        live.projectResults,
      )
      snapshot = buildOngoingCheckpointResultSnapshot({
        analysisId: docMeta.id,
        checkpointId: activeId,
        projects: live.projects,
        activeProjectId: live.activeProjectId,
        projectResults: live.projectResults,
        simulatedBaseCostByProjectId: live.simulatedBaseCostByProjectId,
        inputSignature: live.lastSimulatedInputSignature,
        simulationCount: live.simulationCount,
        resultPreferences: live.resultPreferences,
        shapleyByProjectId,
        computedAt: archivedAt,
        simulationRunIdByProjectId: live.simulationRunIdByProjectId,
      })
    } else if (compactDraft && isOngoingCheckpointResultSnapshot(compactDraft)) {
      snapshot = freezeOngoingCompactForArchive(compactDraft, {
        computedAt: archivedAt,
        resultPreferences: live.resultPreferences,
      })
    } else {
      return { ok: false, reason: "no_results" }
    }

    // Sync live editor workspace into the active draft, then archive that checkpoint.
    const synced = syncActiveCheckpointWorkspace(authoritativeOngoing, {
      projects: live.projects,
      activeProjectId: live.activeProjectId,
    })
    const nextOngoing = archiveCheckpoint(synced, activeId, snapshot, archivedAt)
    const frozen = nextOngoing.checkpoints.find((c) => c.id === activeId)

    skipNextSaveRef.current = true
    try {
      await enqueueSave(async () => {
        const existing = await repo.get(docMeta.id)
        if (!existing || existing.status !== "draft" || existing.deletedAt) {
          throw new Error("not_draft")
        }
        await repo.saveDraft(
          omitDraftResultFields(
            {
              ...existing,
              ongoing: nextOngoing,
              workspace: frozen
                ? ensureSingleProjectWorkspace(frozen.workspace)
                : ensureSingleProjectWorkspace({
                    projects: live.projects,
                    activeProjectId: live.activeProjectId,
                  }),
            },
            "draftResultSeed",
            "ongoingDraftResult",
          ),
        )
      })
    } catch (error) {
      logError("archive active checkpoint", error)
      return { ok: false, reason: "persistence_failed" }
    }
    setOngoing(nextOngoing)
    ongoingRef.current = nextOngoing
    setDraftResultSeed(null)
    setOngoingDraftResult(null)
    if (frozen) {
      applyCheckpointView(frozen, "draft")
    }
    return { ok: true, ongoing: nextOngoing }
  }, [
    applyCheckpointView,
    docMeta,
    enqueueSave,
    flushPendingSave,
    liveArchiveStateRef,
    ongoingDraftResultRef,
    ongoingRef,
    readLiveArchiveBlockReason,
    repo,
    setDraftResultSeed,
    setOngoing,
    setOngoingDraftResult,
    skipNextSaveRef,
  ])

  const completeOngoingAnalysisSession =
    useCallback(async (): Promise<CompleteOngoingAnalysisResult> => {
      if (!docMeta) {
        return { ok: false, reason: "not_found" }
      }
      const block = getCompleteOngoingAnalysisBlockReason({
        status: docMeta.status,
        analysisMode: docMeta.analysisMode,
        ongoing: ongoingRef.current,
      })
      if (block) {
        return { ok: false, reason: block }
      }

      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current)
        saveTimerRef.current = null
      }

      const analysisIdToComplete = docMeta.id
      const holder: { doc: AnalysisDocument | null } = { doc: null }

      try {
        await enqueueSave(async () => {
          const existing = await repo.get(analysisIdToComplete)
          const recheck = getCompleteOngoingAnalysisBlockReason({
            status: existing?.status,
            analysisMode: existing?.analysisMode,
            ongoing: existing?.ongoing,
          })
          if (recheck) {
            throw new Error(recheck)
          }
          holder.doc = await repo.completeOngoingAnalysis(analysisIdToComplete)
        })
      } catch (error) {
        logError("complete ongoing analysis", error)
        /* holder.doc stays null */
      }

      const completed = holder.doc
      if (!completed) {
        // Prefer a fresh precondition reason over a generic persistence failure.
        const after = await repo.get(analysisIdToComplete).catch(() => null)
        const stillBlocked = getCompleteOngoingAnalysisBlockReason({
          status: after?.status ?? docMeta.status,
          analysisMode: after?.analysisMode ?? docMeta.analysisMode,
          ongoing: after?.ongoing ?? ongoingRef.current,
        })
        if (stillBlocked) {
          return { ok: false, reason: stillBlocked }
        }
        return { ok: false, reason: "persistence_failed" }
      }

      // Only update UI after durable persistence of completed + archived.
      skipNextSaveRef.current = true
      setDocMeta({
        id: completed.id,
        name: completed.name,
        status: completed.status,
        folderId: completed.folderId,
        analysisMode: completed.analysisMode ?? docMeta.analysisMode,
        previousVersionId: completed.previousVersionId,
      })
      setOngoing(completed.ongoing ?? null)
      ongoingRef.current = completed.ongoing ?? null
      setDraftResultSeed(null)
      draftResultSeedRef.current = null
      const tip =
        completed.ongoing != null
          ? (getActiveCheckpoint(completed.ongoing) ?? getLatestCheckpoint(completed.ongoing))
          : null
      if (tip?.archivedSnapshot) {
        setArchivedSnapshot(tip.archivedSnapshot)
        if (isOngoingCheckpointResultSnapshot(tip.archivedSnapshot)) {
          args.applyOngoingCompactResult(tip.archivedSnapshot)
        } else {
          args.applyArchivedResults({ archivedSnapshot: tip.archivedSnapshot })
        }
        args.setProjects(ensureSingleProjectWorkspace(tip.workspace).projects)
        args.setActiveProjectId(ensureSingleProjectWorkspace(tip.workspace).activeProjectId)
      } else if (completed.archivedSnapshot) {
        setArchivedSnapshot(completed.archivedSnapshot)
        args.applyArchivedResults(completed)
      }
      return { ok: true, doc: completed }
    }, [
      args,
      docMeta,
      draftResultSeedRef,
      enqueueSave,
      ongoingRef,
      repo,
      saveTimerRef,
      setArchivedSnapshot,
      setDocMeta,
      setDraftResultSeed,
      setOngoing,
      skipNextSaveRef,
    ])

  const createNextCheckpointSession = useCallback(
    async (name: string): Promise<CreateNextCheckpointSessionResult> => {
      if (!docMeta || docMeta.status !== "draft") {
        return { ok: false, reason: "empty" }
      }
      if (docMeta.analysisMode !== "ongoing") {
        return { ok: false, reason: "empty" }
      }
      try {
        await flushPendingSave()
      } catch (error) {
        logError("flush pending save before creating the next checkpoint", error)
        /* still attempt from live session state */
      }
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current)
        saveTimerRef.current = null
      }
      const existing = await repo.get(docMeta.id)
      if (!existing || existing.status !== "draft") {
        return { ok: false, reason: "empty" }
      }
      const baseOngoing = ongoingRef.current ?? existing.ongoing
      if (!baseOngoing) {
        return { ok: false, reason: "empty" }
      }
      const created = createNextCheckpoint(baseOngoing, {
        name,
        createdAt: nowIso(),
        analysisName: existing.name,
        analysisId: existing.id,
      })
      if (!created.ok) return created

      const inheritedResult = {
        ...created.inheritedResult,
        projectsAtRun:
          created.inheritedResult.projectsAtRun && created.inheritedResult.projectsAtRun.length > 0
            ? created.inheritedResult.projectsAtRun
            : (structuredClone(created.newCheckpoint.workspace.projects) as Project[]),
      }

      const nextWorkspace = ensureSingleProjectWorkspace(created.newCheckpoint.workspace)
      const saveDocId = docMeta.id
      skipNextSaveRef.current = true
      setSaveStatusSafe("saving")
      try {
        await enqueueSave(async () => {
          const latest = await repo.get(saveDocId)
          if (!latest || latest.status !== "draft" || latest.deletedAt) {
            throw new Error("create_next_save_failed")
          }
          // Persist the candidate CP2 document explicitly — do not commit
          // runtime/UI until this write succeeds.
          let createNextDoc: AnalysisDocument = {
            ...latest,
            ongoing: created.ongoing,
            workspace: nextWorkspace,
            ...replaceDraftResultField("ongoingDraftResult", inheritedResult),
          }
          if (createNextDoc.draftResultSeed) {
            createNextDoc = omitDraftResultFields(createNextDoc, "draftResultSeed")
          }
          await repo.saveDraft(createNextDoc)

          // Commit session refs inside the same serialized save op so any
          // later chain reader sees CP2 (never a pre-createNext CP1 overwrite).
          ongoingRef.current = created.ongoing
          draftResultSeedRef.current = null
          ongoingDraftResultRef.current = inheritedResult
          liveArchiveStateRef.current = {
            ...liveArchiveStateRef.current,
            projects: nextWorkspace.projects,
            activeProjectId: nextWorkspace.activeProjectId,
          }
        })
      } catch (error) {
        if (loadedIdRef.current === saveDocId) {
          setSaveStatusSafe(librarySaveStatusFromError(error))
        }
        return { ok: false, reason: "persistence_failed" }
      }

      skipNextSaveRef.current = true
      setOngoing(created.ongoing)
      setDraftResultSeed(null)
      setOngoingDraftResult(inheritedResult)
      setArchivedSnapshot(null)
      args.setProjects(nextWorkspace.projects)
      args.setActiveProjectId(nextWorkspace.activeProjectId)
      args.applyOngoingCompactResult(inheritedResult)
      if (loadedIdRef.current === saveDocId) {
        setSaveStatusSafe("saved")
      }
      return {
        ok: true,
        ongoing: created.ongoing,
        newCheckpoint: created.newCheckpoint,
      }
    },
    [
      args,
      docMeta,
      draftResultSeedRef,
      enqueueSave,
      flushPendingSave,
      liveArchiveStateRef,
      loadedIdRef,
      ongoingDraftResultRef,
      ongoingRef,
      repo,
      saveTimerRef,
      setArchivedSnapshot,
      setDraftResultSeed,
      setOngoing,
      setOngoingDraftResult,
      setSaveStatusSafe,
      skipNextSaveRef,
    ],
  )

  /**
   * Durable-first removal of the tip draft checkpoint only.
   * Uses saveDraft — never moveToTrash / deletedAt / analysis delete.
   */
  const deleteActiveDraftCheckpointSession =
    useCallback(async (): Promise<DeleteActiveDraftCheckpointSessionResult> => {
      if (!docMeta || docMeta.status !== "draft") {
        return { ok: false, reason: "empty" }
      }
      if (docMeta.analysisMode !== "ongoing") {
        return { ok: false, reason: "empty" }
      }
      try {
        await flushPendingSave()
      } catch (error) {
        logError("flush pending save before deleting the draft checkpoint", error)
        /* still attempt from live session state */
      }
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current)
        saveTimerRef.current = null
      }

      const existing = await repo.get(docMeta.id)
      if (!existing || existing.status !== "draft" || existing.deletedAt) {
        return { ok: false, reason: "empty" }
      }
      const baseOngoing = ongoingRef.current ?? existing.ongoing
      if (!baseOngoing) {
        return { ok: false, reason: "empty" }
      }
      const deleted = deleteActiveDraftCheckpoint(baseOngoing)
      if (!deleted.ok) return deleted

      const restored = deleted.restoredCheckpoint
      const nextWorkspace = ensureSingleProjectWorkspace(restored.workspace)
      const saveDocId = docMeta.id
      skipNextSaveRef.current = true
      setSaveStatusSafe("saving")
      try {
        await enqueueSave(async () => {
          const latest = await repo.get(saveDocId)
          if (!latest || latest.status !== "draft" || latest.deletedAt) {
            throw new Error("delete_checkpoint_save_failed")
          }
          // Persist candidate Ongoing without tip draft. Document identity,
          // folder, name, and deletedAt are unchanged — never trash.
          await repo.saveDraft({
            ...latest,
            deletedAt: latest.deletedAt ?? null,
            ongoing: deleted.ongoing,
            workspace: nextWorkspace,
            draftResultSeed: undefined,
            ongoingDraftResult: undefined,
          })

          // Commit refs only after durable write, inside the same chain op.
          ongoingRef.current = deleted.ongoing
          draftResultSeedRef.current = null
          ongoingDraftResultRef.current = null
          liveArchiveStateRef.current = {
            ...liveArchiveStateRef.current,
            projects: nextWorkspace.projects,
            activeProjectId: nextWorkspace.activeProjectId,
          }
        })
      } catch (error) {
        logError("delete active draft checkpoint", error)
        if (loadedIdRef.current === saveDocId) {
          setSaveStatusSafe("error")
        }
        return { ok: false, reason: "persistence_failed" }
      }

      // Verify document was not trashed by this operation.
      const after = await repo.get(saveDocId)
      if (!after || after.deletedAt != null) {
        if (loadedIdRef.current === saveDocId) {
          setSaveStatusSafe("error")
        }
        return { ok: false, reason: "persistence_failed" }
      }

      skipNextSaveRef.current = true
      setOngoing(deleted.ongoing)
      setDraftResultSeed(null)
      setOngoingDraftResult(null)
      setArchivedSnapshot(restored.archivedSnapshot ?? null)
      args.setProjects(nextWorkspace.projects)
      args.setActiveProjectId(nextWorkspace.activeProjectId)
      applyCheckpointView(restored, "draft")
      if (loadedIdRef.current === saveDocId) {
        setSaveStatusSafe("saved")
      }
      return {
        ok: true,
        ongoing: deleted.ongoing,
        restoredCheckpoint: restored,
        deletedCheckpointId: deleted.deletedCheckpointId,
      }
    }, [
      applyCheckpointView,
      args,
      docMeta,
      draftResultSeedRef,
      enqueueSave,
      flushPendingSave,
      liveArchiveStateRef,
      loadedIdRef,
      ongoingDraftResultRef,
      ongoingRef,
      repo,
      saveTimerRef,
      setArchivedSnapshot,
      setDraftResultSeed,
      setOngoing,
      setOngoingDraftResult,
      setSaveStatusSafe,
      skipNextSaveRef,
    ])

  const selectCheckpoint = useCallback(
    async (checkpointId: string) => {
      if (!docMeta || docMeta.analysisMode !== "ongoing") return
      if (!ongoing || ongoing.activeCheckpointId === checkpointId) return
      if (!ongoing.checkpoints.some((c) => c.id === checkpointId)) return

      try {
        await flushPendingSave()
      } catch (error) {
        logError("flush pending save before switching checkpoint", error)
        /* still switch — last save may have failed */
      }

      const existing = await repo.get(docMeta.id)
      if (!existing?.ongoing || existing.status !== "draft") {
        // Document-level archived: allow inspection switch within frozen ongoing.
        if (!existing?.ongoing) return
      }
      const sourceOngoing = ongoingRef.current ?? existing!.ongoing!
      const nextOngoing = selectCheckpointInState(sourceOngoing, checkpointId)
      if (!nextOngoing) return
      const nextActive = getActiveCheckpoint(nextOngoing)
      if (!nextActive) return

      // Authoritative selection FIRST so overlapping autosaves cannot rewrite
      // activeCheckpointId / workspace from a stale pre-select ref.
      const nextWorkspace = ensureSingleProjectWorkspace(nextActive.workspace)
      ongoingRef.current = nextOngoing
      setOngoing(nextOngoing)
      liveArchiveStateRef.current = {
        ...liveArchiveStateRef.current,
        projects: nextWorkspace.projects,
        activeProjectId: nextWorkspace.activeProjectId,
      }
      applyCheckpointView(nextActive, existing!.status)

      if (existing!.status !== "draft") {
        return
      }

      skipNextSaveRef.current = true
      const saveDocId = docMeta.id
      setSaveStatusSafe("saving")
      try {
        await enqueueSave(async () => {
          const latest = await repo.get(saveDocId)
          if (!latest || latest.status !== "draft" || latest.deletedAt) {
            throw new Error("select_checkpoint_save_failed")
          }
          const ongoingNow = ongoingRef.current
          if (!ongoingNow) {
            throw new Error("select_checkpoint_save_failed")
          }
          const active = getActiveCheckpoint(ongoingNow)
          if (!active) {
            throw new Error("select_checkpoint_save_failed")
          }
          await repo.saveDraft({
            ...latest,
            ongoing: ongoingNow,
            // Persist the selected checkpoint workspace; repository does not sync.
            workspace: ensureSingleProjectWorkspace(active.workspace),
            ...replaceDraftResultField(
              "ongoingDraftResult",
              pickAuthoritativeOngoingDraftResult(
                ongoingDraftResultRef.current,
                latest.ongoingDraftResult,
              ),
            ),
          })
        })
        if (loadedIdRef.current === saveDocId) {
          setSaveStatusSafe("saved")
        }
      } catch (error) {
        if (loadedIdRef.current === saveDocId) {
          setSaveStatusSafe(librarySaveStatusFromError(error))
        }
      }
    },
    [
      applyCheckpointView,
      docMeta,
      enqueueSave,
      flushPendingSave,
      liveArchiveStateRef,
      loadedIdRef,
      ongoing,
      ongoingDraftResultRef,
      ongoingRef,
      repo,
      setOngoing,
      setSaveStatusSafe,
      skipNextSaveRef,
    ],
  )

  return {
    archiveActiveCheckpoint,
    completeOngoingAnalysisSession,
    createNextCheckpointSession,
    deleteActiveDraftCheckpointSession,
    selectCheckpoint,
  }
}
