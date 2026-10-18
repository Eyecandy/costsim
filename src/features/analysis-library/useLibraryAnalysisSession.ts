import type {
  CommitOngoingDraftResultInput,
  CommitSingleDraftResultInput,
  LibraryDocMeta,
  LibrarySaveStatus,
  LibrarySessionArgs,
  LiveArchiveState,
} from "@/features/analysis-library/session/sessionTypes"
import type { LibrarySessionContext } from "@/features/analysis-library/session/sessionContext"
import { useArchiveCommands } from "@/features/analysis-library/session/useArchiveCommands"
import { useOngoingCheckpointCommands } from "@/features/analysis-library/session/useOngoingCheckpointCommands"
import { restoreDraftResultPreferences } from "@/features/analysis-library/session/sessionSupport"
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react"

import type { AnalysisStatus } from "@/domain/analysis/analysisDocument"
import { DEFAULT_ANALYSIS_MODE, nowIso } from "@/domain/analysis/analysisDocument"
import {
  canCreateNextCheckpoint,
  ensureSingleProjectWorkspace,
  getActiveCheckpoint,
  getCompleteOngoingAnalysisBlockReason,
  getCreateNextCheckpointBlockReason,
  getDeleteActiveDraftCheckpointBlockReason,
  getLatestCheckpoint,
  MAX_CHECKPOINTS,
  resolveActiveCheckpointOnLoad,
  syncActiveCheckpointWorkspace,
  type AnalysisCheckpoint,
  type OngoingAnalysisState,
} from "@/domain/analysis/analysisCheckpoint"
import { getAnalysisLibraryRepository } from "@/persistence/analysisLibraryRepository"
import { librarySaveStatusFromError } from "@/persistence/localAnalysisLibraryRepository"
import {
  getLocationPathKey,
  readAnalysisIdFromLocation,
  shouldAutosaveLibraryDraft,
  subscribeLocation,
} from "@/persistence/analysisLibraryRoutes"
import {
  canArchiveCurrentResults,
  getArchiveBlockReason,
  type ArchiveBlockReason,
} from "@/domain/analysis/buildArchivedAnalysisSnapshot"
import type { DraftResultSeedV1 } from "@/domain/analysis/draftResultSeed"
import { logError } from "@/shared/logError"
import { cloneResultPreferences } from "@/domain/results/resultPreferences"
import {
  omitDraftResultFields,
  replaceDraftResultField,
} from "@/domain/analysis/draftResultPersist"
import type { AnalysisDocument } from "@/domain/analysis/analysisDocument"
import type { ShapleyAttributionResult } from "@/domain/simulation/shapleyAttribution"
import {
  buildOngoingCheckpointResultSnapshot,
  isOngoingCheckpointResultSnapshot,
  type OngoingCheckpointResultSnapshotV1,
} from "@/domain/analysis/ongoingCheckpointResultSnapshot"
import {
  ongoingDraftResultIdentityMatches,
  pickAuthoritativeOngoingDraftResult,
} from "@/domain/analysis/ongoingDraftResultCommit"
import { getSimulationRunIdForProject } from "@/domain/simulation/simulationRunId"
import { type SingleAnalysisArchivedSnapshot } from "@/domain/analysis/singleArchivedResultSnapshot"
import {
  buildSingleDraftFromCompactSeed,
  buildSingleDraftResultSnapshot,
  pickAuthoritativeSingleDraftResult,
  singleDraftResultIdentityMatches,
  type SingleDraftResultSnapshotV1,
} from "@/domain/analysis/singleDraftResultSnapshot"

export type {
  ArchiveCheckpointResult,
  ArchiveCurrentResult,
  CommitOngoingDraftResultInput,
  CommitSingleDraftResultInput,
  CompleteOngoingAnalysisResult,
  CreateNextCheckpointSessionResult,
  DeleteActiveDraftCheckpointSessionResult,
  LibrarySaveStatus,
} from "@/features/analysis-library/session/sessionTypes"

/**
 * Loads an AnalysisDocument when `?analysis=` is present and autosaves drafts.
 * Route `?analysis=` id is authoritative for which document is open.
 *
 * Ongoing ownership: session/domain syncs active draft workspace locally;
 * repository persists the supplied document without mutating Ongoing structure.
 */
export function useLibraryAnalysisSession(args: LibrarySessionArgs) {
  const repo = getAnalysisLibraryRepository()
  // Re-read when pathname or search changes (e.g. analysis A → B on /app).
  useSyncExternalStore(subscribeLocation, getLocationPathKey, () => "/")
  const analysisId = readAnalysisIdFromLocation()
  const [docMeta, setDocMeta] = useState<LibraryDocMeta | null>(null)
  const [ongoing, setOngoing] = useState<OngoingAnalysisState | null>(null)
  const ongoingRef = useRef<OngoingAnalysisState | null>(null)
  ongoingRef.current = ongoing
  const [loadError, setLoadError] = useState<string | null>(null)
  const [ready, setReady] = useState(!analysisId)
  const [saveStatus, setSaveStatus] = useState<LibrarySaveStatus>("idle")
  const [archivedSnapshot, setArchivedSnapshot] = useState<
    SingleAnalysisArchivedSnapshot | OngoingCheckpointResultSnapshotV1 | null
  >(null)
  const [ongoingDraftResult, setOngoingDraftResult] =
    useState<OngoingCheckpointResultSnapshotV1 | null>(null)
  const ongoingDraftResultRef = useRef<OngoingCheckpointResultSnapshotV1 | null>(null)
  ongoingDraftResultRef.current = ongoingDraftResult
  const [singleDraftResult, setSingleDraftResult] = useState<SingleDraftResultSnapshotV1 | null>(
    null,
  )
  const singleDraftResultRef = useRef<SingleDraftResultSnapshotV1 | null>(null)
  singleDraftResultRef.current = singleDraftResult
  const [draftResultSeed, setDraftResultSeed] = useState<DraftResultSeedV1 | null>(null)
  const draftResultSeedRef = useRef<DraftResultSeedV1 | null>(null)
  draftResultSeedRef.current = draftResultSeed
  const loadedIdRef = useRef<string | null>(null)
  const skipNextSaveRef = useRef(false)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const savedClearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const saveChainRef = useRef(Promise.resolve())
  /** Always recover from a prior rejection so later archive/save work still runs. */
  const enqueueSave = useCallback((op: () => Promise<void>) => {
    // intentional: a failed save is reported to its own caller; the chain only has to keep running
    const next = saveChainRef.current.catch(() => undefined).then(op)
    saveChainRef.current = next.catch(() => undefined)
    return next
  }, [])

  /** Live App result/input state for archive eligibility (avoids stale closures). */
  const liveArchiveStateRef = useRef<LiveArchiveState>({
    projects: args.projects,
    activeProjectId: args.activeProjectId,
    projectResults: args.projectResults,
    simulatedBaseCostByProjectId: args.simulatedBaseCostByProjectId,
    lastSimulatedInputSignature: args.lastSimulatedInputSignature,
    simulationCount: args.simulationCount,
    resultPreferences: args.resultPreferences,
    simulationRunIdByProjectId: args.simulationRunIdByProjectId ?? {},
    liveSimulationAnalysisId: args.liveSimulationAnalysisId ?? null,
    liveSimulationCheckpointId: args.liveSimulationCheckpointId ?? null,
  })
  liveArchiveStateRef.current = {
    projects: args.projects,
    activeProjectId: args.activeProjectId,
    projectResults: args.projectResults,
    simulatedBaseCostByProjectId: args.simulatedBaseCostByProjectId,
    lastSimulatedInputSignature: args.lastSimulatedInputSignature,
    simulationCount: args.simulationCount,
    resultPreferences: args.resultPreferences,
    simulationRunIdByProjectId: args.simulationRunIdByProjectId ?? {},
    liveSimulationAnalysisId: args.liveSimulationAnalysisId ?? null,
    liveSimulationCheckpointId: args.liveSimulationCheckpointId ?? null,
  }

  const setSaveStatusSafe = useCallback((next: LibrarySaveStatus) => {
    if (savedClearTimerRef.current) {
      clearTimeout(savedClearTimerRef.current)
      savedClearTimerRef.current = null
    }
    setSaveStatus(next)
    if (next === "saved") {
      savedClearTimerRef.current = setTimeout(() => {
        setSaveStatus("idle")
        savedClearTimerRef.current = null
      }, 1400)
    }
  }, [])

  const saveDraftFromLiveState = useCallback(
    async (saveDocId: string): Promise<void> => {
      if (loadedIdRef.current !== saveDocId) return
      if (readAnalysisIdFromLocation() !== saveDocId) return

      const live = liveArchiveStateRef.current
      const activeIdSnap = live.activeProjectId
      const projectsSnap = live.projects
      if (
        projectsSnap.length === 0 ||
        !activeIdSnap ||
        !projectsSnap.some((p) => p.id === activeIdSnap)
      ) {
        return
      }

      const existing = await repo.get(saveDocId)
      if (!existing || existing.status !== "draft" || existing.deletedAt) return

      const workspace = {
        projects: projectsSnap,
        activeProjectId: activeIdSnap,
      }
      let nextOngoing = ongoingRef.current
      if (existing.analysisMode === "ongoing" && nextOngoing) {
        nextOngoing = syncActiveCheckpointWorkspace(nextOngoing, workspace)
        if (loadedIdRef.current === saveDocId) {
          setOngoing(nextOngoing)
          ongoingRef.current = nextOngoing
        }
      }

      const authoritativeOngoingDraft =
        existing.analysisMode === "ongoing"
          ? pickAuthoritativeOngoingDraftResult(
              ongoingDraftResultRef.current,
              existing.ongoingDraftResult,
            )
          : undefined
      const authoritativeSingleDraft =
        existing.analysisMode === "single"
          ? pickAuthoritativeSingleDraftResult(
              singleDraftResultRef.current,
              existing.singleDraftResult,
            )
          : undefined

      // Preserve compact results when this save has no new result value.
      // Never assign `result: undefined` — JSON.stringify would delete durable data.
      let nextDoc: AnalysisDocument = {
        ...existing,
        name: docMeta?.name ?? existing.name,
        workspace:
          existing.analysisMode === "ongoing" ? ensureSingleProjectWorkspace(workspace) : workspace,
        ...(nextOngoing && existing.analysisMode === "ongoing" ? { ongoing: nextOngoing } : {}),
        ...replaceDraftResultField(
          "ongoingDraftResult",
          existing.analysisMode === "ongoing" ? authoritativeOngoingDraft : undefined,
        ),
        ...replaceDraftResultField(
          "singleDraftResult",
          existing.analysisMode === "single" ? authoritativeSingleDraft : undefined,
        ),
        // Presentation-only — do not rewrite frozen snapshot resultView/analytics.
        draftResultPreferences: cloneResultPreferences(live.resultPreferences),
      }
      if (draftResultSeedRef.current) {
        nextDoc = {
          ...nextDoc,
          draftResultSeed: draftResultSeedRef.current,
        }
      } else if (existing.draftResultSeed) {
        // Explicit clear after re-sim (seed held only until first successful run).
        nextDoc = omitDraftResultFields(nextDoc, "draftResultSeed")
      }
      await repo.saveDraft(nextDoc)
    },
    [docMeta, repo],
  )

  const commitOngoingDraftResult = useCallback(
    async (input: CommitOngoingDraftResultInput): Promise<{ ok: true } | { ok: false }> => {
      if (docMeta?.analysisMode !== "ongoing" || docMeta.status !== "draft") {
        return { ok: false }
      }
      const compact = buildOngoingCheckpointResultSnapshot({
        analysisId: input.analysisId,
        checkpointId: input.checkpointId,
        projects: input.projects,
        activeProjectId: input.activeProjectId,
        projectResults: input.projectResults,
        simulatedBaseCostByProjectId: input.simulatedBaseCostByProjectId,
        inputSignature: input.inputSignature,
        simulationCount: input.simulationCount,
        resultPreferences: input.resultPreferences,
        simulationRunIdByProjectId: input.simulationRunIdByProjectId,
      })

      ongoingDraftResultRef.current = compact
      setOngoingDraftResult(compact)

      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current)
        saveTimerRef.current = null
      }

      const saveDocId = input.analysisId
      setSaveStatusSafe("saving")
      try {
        await enqueueSave(async () => {
          await saveDraftFromLiveState(saveDocId)
          const verified = await repo.get(saveDocId)
          const persisted = verified?.ongoingDraftResult
          const expectedRunId = getSimulationRunIdForProject(
            input.activeProjectId,
            input.simulationRunIdByProjectId,
          )
          if (
            !persisted ||
            !ongoingDraftResultIdentityMatches({
              snapshot: persisted,
              analysisId: input.analysisId,
              checkpointId: input.checkpointId,
              activeProjectId: input.activeProjectId,
              inputSignature: input.inputSignature,
              simulationRunId: expectedRunId,
            })
          ) {
            throw new Error("ongoing_draft_result_commit_failed")
          }
        })
        if (loadedIdRef.current === saveDocId) {
          setSaveStatusSafe("saved")
        }
        return { ok: true }
      } catch (error) {
        if (loadedIdRef.current === saveDocId) {
          setSaveStatusSafe(librarySaveStatusFromError(error))
        }
        return { ok: false }
      }
    },
    [
      docMeta?.analysisMode,
      docMeta?.status,
      enqueueSave,
      repo,
      saveDraftFromLiveState,
      setSaveStatusSafe,
    ],
  )

  const commitSingleDraftResult = useCallback(
    async (input: CommitSingleDraftResultInput): Promise<{ ok: true } | { ok: false }> => {
      if (docMeta?.analysisMode !== "single" || docMeta.status !== "draft") {
        return { ok: false }
      }
      const compact = buildSingleDraftResultSnapshot({
        analysisId: input.analysisId,
        projects: input.projects,
        activeProjectId: input.activeProjectId,
        projectResults: input.projectResults,
        simulatedBaseCostByProjectId: input.simulatedBaseCostByProjectId,
        inputSignature: input.inputSignature,
        simulationCount: input.simulationCount,
        resultPreferences: input.resultPreferences,
        simulationRunIdByProjectId: input.simulationRunIdByProjectId,
      })

      singleDraftResultRef.current = compact
      setSingleDraftResult(compact)
      setDraftResultSeed(null)
      draftResultSeedRef.current = null

      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current)
        saveTimerRef.current = null
      }

      const saveDocId = input.analysisId
      setSaveStatusSafe("saving")
      try {
        await enqueueSave(async () => {
          await saveDraftFromLiveState(saveDocId)
          const verified = await repo.get(saveDocId)
          const persisted = verified?.singleDraftResult
          const expectedRunId = getSimulationRunIdForProject(
            input.activeProjectId,
            input.simulationRunIdByProjectId,
          )
          if (
            !persisted ||
            !singleDraftResultIdentityMatches({
              snapshot: persisted,
              analysisId: input.analysisId,
              activeProjectId: input.activeProjectId,
              inputSignature: input.inputSignature,
              simulationRunId: expectedRunId,
            })
          ) {
            throw new Error("single_draft_result_commit_failed")
          }
        })
        if (loadedIdRef.current === saveDocId) {
          setSaveStatusSafe("saved")
        }
        return { ok: true }
      } catch (error) {
        if (loadedIdRef.current === saveDocId) {
          setSaveStatusSafe(librarySaveStatusFromError(error))
        }
        return { ok: false }
      }
    },
    [
      docMeta?.analysisMode,
      docMeta?.status,
      enqueueSave,
      repo,
      saveDraftFromLiveState,
      setSaveStatusSafe,
    ],
  )

  const readLiveArchiveBlockReason = useCallback((): ArchiveBlockReason | null => {
    const live = liveArchiveStateRef.current
    const analysisId = loadedIdRef.current
    const checkpointId =
      ongoingRef.current && docMeta?.analysisMode === "ongoing"
        ? ongoingRef.current.activeCheckpointId
        : null
    return getArchiveBlockReason({
      analysisId,
      checkpointId,
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
      ongoingCompactResult:
        docMeta?.analysisMode === "ongoing" ? ongoingDraftResultRef.current : null,
      singleDraftResult: docMeta?.analysisMode === "single" ? singleDraftResultRef.current : null,
      resultPreferences: live.resultPreferences,
    })
  }, [docMeta?.analysisMode])

  const loadGenerationRef = useRef(0)

  const activeCheckpoint = getActiveCheckpoint(ongoing ?? undefined) ?? null
  const analysisMode = docMeta?.analysisMode ?? DEFAULT_ANALYSIS_MODE
  const checkpointReadOnly = analysisMode === "ongoing" && activeCheckpoint?.status === "archived"
  const readOnly = docMeta?.status === "archived" || checkpointReadOnly

  const applyCheckpointView = useCallback(
    (checkpoint: AnalysisCheckpoint, docStatus: AnalysisStatus) => {
      const workspace = ensureSingleProjectWorkspace(checkpoint.workspace)
      args.setProjects(workspace.projects)
      args.setActiveProjectId(workspace.activeProjectId)
      // Prefer per-checkpoint frozen results (including completed Ongoing history).
      if (checkpoint.status === "archived" && checkpoint.archivedSnapshot) {
        setArchivedSnapshot(checkpoint.archivedSnapshot)
        // Keep draftResultSeed so returning to an existing draft tip restores it.
        if (isOngoingCheckpointResultSnapshot(checkpoint.archivedSnapshot)) {
          args.applyOngoingCompactResult(checkpoint.archivedSnapshot)
        } else {
          args.applyArchivedResults({
            archivedSnapshot: checkpoint.archivedSnapshot,
          })
        }
        return
      }
      if (docStatus === "archived") {
        // Document archived without a checkpoint snapshot — keep current results.
        return
      }
      setArchivedSnapshot(null)
      const compact = ongoingDraftResultRef.current
      if (
        compact &&
        compact.analysisId === loadedIdRef.current &&
        compact.checkpointId === checkpoint.id
      ) {
        args.applyOngoingCompactResult(compact)
        return
      }
      const seed = draftResultSeedRef.current
      if (seed) {
        args.applyDraftResultSeed(seed)
      } else {
        args.clearResults()
      }
    },
    [args],
  )

  useEffect(() => {
    if (!analysisId) {
      loadedIdRef.current = null
      setDocMeta(null)
      setOngoing(null)
      setArchivedSnapshot(null)
      setOngoingDraftResult(null)
      setSingleDraftResult(null)
      setDraftResultSeed(null)
      setReady(true)
      setLoadError(null)
      return
    }
    let cancelled = false
    const generation = ++loadGenerationRef.current
    setReady(false)
    setLoadError(null)
    setDocMeta(null)
    setOngoing(null)
    setArchivedSnapshot(null)
    setOngoingDraftResult(null)
    setSingleDraftResult(null)
    setDraftResultSeed(null)
    loadedIdRef.current = null
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current)
      saveTimerRef.current = null
    }
    void (async () => {
      try {
        const doc = await repo.get(analysisId)
        if (cancelled || loadGenerationRef.current !== generation) return
        if (!doc) {
          setLoadError("not_found")
          setReady(true)
          return
        }
        if (doc.deletedAt) {
          setLoadError("trashed")
          setReady(true)
          return
        }
        skipNextSaveRef.current = true
        loadedIdRef.current = doc.id
        const mode = doc.analysisMode ?? DEFAULT_ANALYSIS_MODE
        setDocMeta({
          id: doc.id,
          name: doc.name,
          status: doc.status,
          folderId: doc.folderId,
          analysisMode: mode,
          previousVersionId: doc.previousVersionId,
        })
        setOngoing(mode === "ongoing" && doc.ongoing ? doc.ongoing : null)

        if (mode === "ongoing" && doc.ongoing) {
          const checkpoint = resolveActiveCheckpointOnLoad(doc.ongoing)
          const workspace = ensureSingleProjectWorkspace(checkpoint.workspace)
          args.setProjects(workspace.projects)
          args.setActiveProjectId(workspace.activeProjectId)
          if (checkpoint.status === "archived" && checkpoint.archivedSnapshot) {
            setArchivedSnapshot(checkpoint.archivedSnapshot)
            setDraftResultSeed(null)
            setOngoingDraftResult(null)
            if (isOngoingCheckpointResultSnapshot(checkpoint.archivedSnapshot)) {
              args.applyOngoingCompactResult(checkpoint.archivedSnapshot)
            } else {
              args.applyArchivedResults({
                archivedSnapshot: checkpoint.archivedSnapshot,
              })
            }
          } else if (
            doc.status === "draft" &&
            doc.ongoingDraftResult &&
            doc.ongoingDraftResult.analysisId === doc.id &&
            doc.ongoingDraftResult.checkpointId === checkpoint.id
          ) {
            setArchivedSnapshot(null)
            setDraftResultSeed(null)
            setOngoingDraftResult(doc.ongoingDraftResult)
            ongoingDraftResultRef.current = doc.ongoingDraftResult
            args.applyOngoingCompactResult(doc.ongoingDraftResult)
            restoreDraftResultPreferences(doc, args.replacePreferences)
          } else if (doc.status === "archived" && doc.archivedSnapshot) {
            setArchivedSnapshot(doc.archivedSnapshot)
            setDraftResultSeed(null)
            args.applyArchivedResults(doc)
          } else {
            setArchivedSnapshot(null)
            setDraftResultSeed(null)
            setOngoingDraftResult(null)
            args.clearResults()
            restoreDraftResultPreferences(doc, args.replacePreferences)
          }
        } else {
          args.setProjects(doc.workspace.projects)
          args.setActiveProjectId(doc.workspace.activeProjectId)
          if (doc.status === "archived" && doc.archivedSnapshot) {
            setArchivedSnapshot(doc.archivedSnapshot)
            setDraftResultSeed(null)
            setSingleDraftResult(null)
            args.applyArchivedResults(doc)
          } else if (
            doc.status === "draft" &&
            doc.singleDraftResult &&
            doc.singleDraftResult.analysisId === doc.id
          ) {
            setArchivedSnapshot(null)
            setDraftResultSeed(null)
            setSingleDraftResult(doc.singleDraftResult)
            singleDraftResultRef.current = doc.singleDraftResult
            args.applySingleDraftResult(doc.singleDraftResult)
            restoreDraftResultPreferences(doc, args.replacePreferences)
          } else if (doc.status === "draft" && doc.draftResultSeed) {
            setArchivedSnapshot(null)
            setDraftResultSeed(doc.draftResultSeed)
            if (doc.draftResultSeed.compactByProjectId) {
              const promoted = buildSingleDraftFromCompactSeed({
                analysisId: doc.id,
                inputSignature: doc.draftResultSeed.inputSignature,
                simulationCount: doc.draftResultSeed.simulationCount,
                activeProjectId: doc.workspace.activeProjectId,
                resultPreferences: doc.draftResultSeed.resultPreferences,
                resultView: doc.draftResultSeed.resultView,
                byProjectId: doc.draftResultSeed.compactByProjectId,
                projectsAtRun: doc.workspace.projects,
              })
              setSingleDraftResult(promoted)
              singleDraftResultRef.current = promoted
              args.applySingleDraftResult(promoted)
            } else {
              setSingleDraftResult(null)
              args.applyDraftResultSeed(doc.draftResultSeed)
            }
            restoreDraftResultPreferences(doc, args.replacePreferences)
          } else {
            setArchivedSnapshot(null)
            setDraftResultSeed(null)
            setSingleDraftResult(null)
            args.clearResults()
            restoreDraftResultPreferences(doc, args.replacePreferences)
          }
        }
        await repo.touchMetadata(
          doc.id,
          { lastOpenedAt: nowIso() },
          {
            knownDocument: doc,
          },
        )
        if (cancelled || loadGenerationRef.current !== generation) return
        setReady(true)
      } catch (error) {
        logError("load analysis", error)
        if (!cancelled && loadGenerationRef.current === generation) {
          setLoadError("load_failed")
          setReady(true)
        }
      }
    })()
    return () => {
      cancelled = true
    }
    // Intentionally only re-run when analysis id in URL changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analysisId])

  // Debounced draft autosave — never while switching, or under a mismatched route id.
  useEffect(() => {
    if (
      !shouldAutosaveLibraryDraft({
        routeAnalysisId: analysisId,
        loadedAnalysisId: loadedIdRef.current,
        docId: docMeta?.id,
        docStatus: docMeta?.status,
        ready,
      })
    ) {
      return
    }
    // Archived checkpoints are frozen — do not write App workspace over them.
    if (checkpointReadOnly) {
      return
    }
    if (skipNextSaveRef.current) {
      skipNextSaveRef.current = false
      return
    }
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    const saveDocId = docMeta!.id
    setSaveStatusSafe("saving")
    saveTimerRef.current = setTimeout(() => {
      void enqueueSave(async () => {
        try {
          await saveDraftFromLiveState(saveDocId)
          if (loadedIdRef.current === saveDocId) {
            setSaveStatusSafe("saved")
          }
        } catch (error) {
          if (loadedIdRef.current === saveDocId) {
            setSaveStatusSafe(librarySaveStatusFromError(error))
          }
        }
      })
    }, 600)
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    }
  }, [
    analysisId,
    args.projects,
    args.activeProjectId,
    args.resultPreferences,
    checkpointReadOnly,
    docMeta,
    draftResultSeed,
    ongoingDraftResult,
    singleDraftResult,
    ready,
    saveDraftFromLiveState,
    setSaveStatusSafe,
    enqueueSave,
  ])

  const sessionContext: LibrarySessionContext = {
    args,
    repo,
    docMeta,
    ongoing,
    checkpointReadOnly,
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
    singleDraftResultRef,
    liveArchiveStateRef,
    setDocMeta,
    setOngoing,
    setDraftResultSeed,
    setOngoingDraftResult,
    setArchivedSnapshot,
    setSingleDraftResult,
  }
  const {
    archiveCurrent,
    createNewVersion,
    beginStartOngoingFromArchived,
    startOngoingFromArchived,
  } = useArchiveCommands(sessionContext)

  const clearDraftResultSeed = useCallback(async () => {
    setDraftResultSeed(null)
    const id = loadedIdRef.current
    if (!id) return
    try {
      await enqueueSave(async () => {
        const existing = await repo.get(id)
        if (!existing || existing.status !== "draft" || !existing.draftResultSeed) {
          return
        }
        const { draftResultSeed: _removed, ...rest } = existing
        await repo.saveDraft(rest)
      })
    } catch (error) {
      logError("clear persisted draft result seed", error)
      /* non-fatal — in-memory seed already cleared */
    }
  }, [enqueueSave, repo])

  const clearOngoingDraftResult = useCallback(async () => {
    setOngoingDraftResult(null)
    ongoingDraftResultRef.current = null
    const id = loadedIdRef.current
    if (!id) return
    try {
      await enqueueSave(async () => {
        const existing = await repo.get(id)
        if (!existing || existing.status !== "draft" || !existing.ongoingDraftResult) {
          return
        }
        await repo.saveDraft(omitDraftResultFields(existing, "ongoingDraftResult"))
      })
    } catch (error) {
      logError("clear persisted ongoing draft result", error)
      /* non-fatal — in-memory compact result already cleared */
    }
  }, [enqueueSave, repo])

  const clearSingleDraftResult = useCallback(async () => {
    setSingleDraftResult(null)
    singleDraftResultRef.current = null
    const id = loadedIdRef.current
    if (!id) return
    try {
      await enqueueSave(async () => {
        const existing = await repo.get(id)
        if (!existing || existing.status !== "draft" || !existing.singleDraftResult) {
          return
        }
        await repo.saveDraft(omitDraftResultFields(existing, "singleDraftResult"))
      })
    } catch (error) {
      logError("clear persisted single draft result", error)
      /* non-fatal — in-memory compact result already cleared */
    }
  }, [enqueueSave, repo])

  const renameAnalysis = useCallback(
    async (name: string) => {
      if (!docMeta) return
      // Display name is library metadata — allowed for draft and archived.
      const trimmed = name.trim()
      if (!trimmed) return
      await repo.touchMetadata(docMeta.id, { name: trimmed })
      setDocMeta((prev) => (prev ? { ...prev, name: trimmed } : prev))
    },
    [docMeta, repo],
  )

  const setFolderId = useCallback(
    async (folderId: string | null) => {
      if (!docMeta) return
      await repo.touchMetadata(docMeta.id, { folderId })
      setDocMeta((prev) => (prev ? { ...prev, folderId } : prev))
    },
    [docMeta, repo],
  )

  /**
   * Completes any debounced draft autosave before intentional navigation
   * (e.g. Save and continue later). Does not replace continuous autosave.
   */
  const flushPendingSave = useCallback(async () => {
    if (
      !shouldAutosaveLibraryDraft({
        routeAnalysisId: analysisId,
        loadedAnalysisId: loadedIdRef.current,
        docId: docMeta?.id,
        docStatus: docMeta?.status,
        ready,
      })
    ) {
      return
    }
    if (checkpointReadOnly) {
      return
    }
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current)
      saveTimerRef.current = null
    }
    const saveDocId = docMeta!.id
    setSaveStatusSafe("saving")
    try {
      await enqueueSave(async () => {
        await saveDraftFromLiveState(saveDocId)
        setSaveStatusSafe("saved")
      })
    } catch (error) {
      setSaveStatusSafe(librarySaveStatusFromError(error))
      throw new Error("flush_save_failed")
    }
  }, [
    analysisId,
    checkpointReadOnly,
    docMeta,
    enqueueSave,
    ready,
    saveDraftFromLiveState,
    setSaveStatusSafe,
  ])

  const {
    archiveActiveCheckpoint,
    completeOngoingAnalysisSession,
    createNextCheckpointSession,
    deleteActiveDraftCheckpointSession,
    selectCheckpoint,
  } = useOngoingCheckpointCommands({ ...sessionContext, flushPendingSave })

  const moveCurrentToTrash = useCallback(async () => {
    if (!docMeta) return
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current)
      saveTimerRef.current = null
    }
    try {
      await flushPendingSave()
    } catch (error) {
      logError("flush pending save before moving to trash", error)
      /* still move to trash */
    }
    await repo.moveToTrash(docMeta.id)
    loadedIdRef.current = null
    setDocMeta(null)
    setOngoing(null)
    setArchivedSnapshot(null)
    setDraftResultSeed(null)
    setSingleDraftResult(null)
  }, [docMeta, flushPendingSave, repo])

  return {
    analysisId,
    docMeta,
    analysisMode,
    ongoing,
    activeCheckpoint,
    checkpoints: ongoing?.checkpoints ?? [],
    selectCheckpoint,
    readOnly,
    archivedSnapshot,
    ongoingDraftResult,
    singleDraftResult,
    draftResultSeed,
    ready,
    loadError,
    saveStatus,
    canArchive: Boolean(
      docMeta?.status === "draft" &&
      !checkpointReadOnly &&
      canArchiveCurrentResults({
        analysisId: loadedIdRef.current,
        checkpointId:
          docMeta?.analysisMode === "ongoing" ? (ongoing?.activeCheckpointId ?? null) : null,
        projects: liveArchiveStateRef.current.projects,
        projectResults: liveArchiveStateRef.current.projectResults,
        lastSimulatedInputSignature: liveArchiveStateRef.current.lastSimulatedInputSignature,
        simulationState: {
          analysisId: liveArchiveStateRef.current.liveSimulationAnalysisId,
          checkpointId: liveArchiveStateRef.current.liveSimulationCheckpointId,
          inputSignature: liveArchiveStateRef.current.lastSimulatedInputSignature,
          projectResults: liveArchiveStateRef.current.projectResults,
          simulatedBaseCostByProjectId: liveArchiveStateRef.current.simulatedBaseCostByProjectId,
          activeProjectIdAtRun: liveArchiveStateRef.current.activeProjectId,
          simulationCount: liveArchiveStateRef.current.simulationCount,
          projectsAtRun: [],
        },
        ongoingCompactResult: docMeta?.analysisMode === "ongoing" ? ongoingDraftResult : null,
        singleDraftResult: docMeta?.analysisMode === "single" ? singleDraftResult : null,
      }),
    ),
    getArchiveBlockReason: readLiveArchiveBlockReason,
    archiveCurrent,
    archiveActiveCheckpoint,
    completeOngoingAnalysis: completeOngoingAnalysisSession,
    canCompleteOngoingAnalysis: Boolean(
      docMeta?.status === "draft" && analysisMode === "ongoing" && ongoing?.lifecycle === "active",
    ),
    getCompleteOngoingAnalysisBlockReason: () =>
      getCompleteOngoingAnalysisBlockReason({
        status: docMeta?.status,
        analysisMode: docMeta?.analysisMode ?? analysisMode,
        ongoing: ongoing ?? ongoingRef.current,
      }),
    createNextCheckpoint: createNextCheckpointSession,
    canCreateNextCheckpoint: Boolean(
      docMeta?.status === "draft" &&
      analysisMode === "ongoing" &&
      canCreateNextCheckpoint(ongoing ?? undefined),
    ),
    createNextCheckpointBlockReason: getCreateNextCheckpointBlockReason(ongoing ?? undefined),
    /** Checkpoint-only delete — never analysis Trash / deletedAt. */
    deleteActiveDraftCheckpoint: deleteActiveDraftCheckpointSession,
    canDeleteActiveDraftCheckpoint: Boolean(
      docMeta?.status === "draft" &&
      analysisMode === "ongoing" &&
      getDeleteActiveDraftCheckpointBlockReason(ongoing ?? undefined) === null,
    ),
    getDeleteActiveDraftCheckpointBlockReason: () =>
      getDeleteActiveDraftCheckpointBlockReason(ongoing ?? undefined),
    atCheckpointLimit: Boolean(ongoing && ongoing.checkpoints.length >= MAX_CHECKPOINTS),
    latestCheckpoint: ongoing ? getLatestCheckpoint(ongoing) : null,
    createNewVersion,
    beginStartOngoingFromArchived,
    startOngoingFromArchived,
    clearDraftResultSeed,
    clearOngoingDraftResult,
    clearSingleDraftResult,
    /**
     * Attach live Contribution to the compact draft once Shapley finishes.
     * Does not clear KF/S-curve; only fills contribution for reload continuity.
     */
    commitOngoingDraftResult,
    commitSingleDraftResult,
    attachOngoingDraftContribution: (
      projectId: string,
      contribution: ShapleyAttributionResult,
      expectedRunId: string,
    ) => {
      const current = ongoingDraftResultRef.current
      const active = getActiveCheckpoint(ongoingRef.current ?? undefined)
      const live = liveArchiveStateRef.current
      if (
        !current ||
        !active ||
        active.status !== "draft" ||
        current.checkpointId !== active.id ||
        current.activeProjectId !== projectId ||
        !expectedRunId
      ) {
        return
      }
      const currentRunId = getSimulationRunIdForProject(
        projectId,
        current.simulationRunIdByProjectId ?? {},
      )
      if (!currentRunId || currentRunId !== expectedRunId) {
        return
      }
      if (
        !ongoingDraftResultIdentityMatches({
          snapshot: current,
          analysisId: live.liveSimulationAnalysisId ?? loadedIdRef.current ?? "",
          checkpointId: active.id,
          activeProjectId: projectId,
          inputSignature: live.lastSimulatedInputSignature,
          simulationRunId: expectedRunId,
        })
      ) {
        return
      }
      if (current.contribution) return
      const updated = {
        ...current,
        contribution,
      }
      ongoingDraftResultRef.current = updated
      setOngoingDraftResult(updated)
      const saveDocId = loadedIdRef.current
      if (!saveDocId) return
      void enqueueSave(async () => {
        await saveDraftFromLiveState(saveDocId)
      }).catch((error) => logError("save draft after attaching ongoing contribution", error))
    },
    attachSingleDraftContribution: (
      projectId: string,
      contribution: ShapleyAttributionResult,
      expectedRunId: string,
    ) => {
      const current = singleDraftResultRef.current
      const live = liveArchiveStateRef.current
      if (!current || current.activeProjectIdAtRun !== projectId || !expectedRunId) {
        return
      }
      const currentRunId = current.simulationRunIdByProjectId?.[projectId] ?? ""
      if (!currentRunId || currentRunId !== expectedRunId) {
        return
      }
      if (
        !singleDraftResultIdentityMatches({
          snapshot: current,
          analysisId: live.liveSimulationAnalysisId ?? loadedIdRef.current ?? "",
          activeProjectId: projectId,
          inputSignature: live.lastSimulatedInputSignature,
          simulationRunId: expectedRunId,
        })
      ) {
        return
      }
      const existing = current.byProjectId[projectId]
      if (!existing || existing.contribution) return
      const updated: SingleDraftResultSnapshotV1 = {
        ...current,
        byProjectId: {
          ...current.byProjectId,
          [projectId]: { ...existing, contribution },
        },
      }
      singleDraftResultRef.current = updated
      setSingleDraftResult(updated)
      const saveDocId = loadedIdRef.current
      if (!saveDocId) return
      void enqueueSave(async () => {
        await saveDraftFromLiveState(saveDocId)
      }).catch((error) => logError("save draft after attaching single contribution", error))
    },
    renameAnalysis,
    setFolderId,
    flushPendingSave,
    moveCurrentToTrash,
  }
}
