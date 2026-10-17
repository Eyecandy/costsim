import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react"

import type { AnalysisMode, AnalysisStatus } from "@/domain/analysis/analysisDocument"
import {
  DEFAULT_ANALYSIS_MODE,
  isAnalysisTrashed,
  nowIso,
} from "@/domain/analysis/analysisDocument"
import {
  archiveCheckpoint,
  canCreateNextCheckpoint,
  createNextCheckpoint,
  deleteActiveDraftCheckpoint,
  ensureSingleProjectWorkspace,
  getActiveCheckpoint,
  getCompleteOngoingAnalysisBlockReason,
  getCreateNextCheckpointBlockReason,
  getDeleteActiveDraftCheckpointBlockReason,
  getLatestCheckpoint,
  MAX_CHECKPOINTS,
  resolveActiveCheckpointOnLoad,
  selectCheckpoint as selectCheckpointInState,
  syncActiveCheckpointWorkspace,
  type AnalysisCheckpoint,
  type CompleteOngoingAnalysisBlockReason,
  type CreateNextCheckpointBlockReason,
  type DeleteActiveDraftCheckpointBlockReason,
  type OngoingAnalysisState,
} from "@/domain/analysis/analysisCheckpoint"
import { getAnalysisLibraryRepository } from "@/lib/analysisLibraryRepository"
import {
  librarySaveStatusFromError,
} from "@/lib/localAnalysisLibraryRepository"
import {
  getLocationPathKey,
  readAnalysisIdFromLocation,
  shouldAutosaveLibraryDraft,
  subscribeLocation,
} from "@/lib/analysisLibraryRoutes"
import {
  canArchiveCurrentResults,
  getArchiveBlockReason,
  type ArchiveBlockReason,
} from "@/domain/analysis/buildArchivedAnalysisSnapshot"
import type { DraftResultSeedV1 } from "@/domain/analysis/draftResultSeed"
import type { Project } from "@/domain/analysis/project"
import {
  cloneResultPreferences,
  normalizeResultPreferences,
  type ResultPreferencesV1,
} from "@/domain/results/resultPreferences"
import {
  omitDraftResultFields,
  replaceDraftResultField,
} from "@/domain/analysis/draftResultPersist"
import type { AnalysisDocument } from "@/domain/analysis/analysisDocument"
import type { ShapleyAttributionResult } from "@/domain/simulation/shapleyAttribution"
import {
  canStartOngoingFromArchivedSingle,
  planCreateOngoingFromArchivedSingle,
  resolveArchivedSingleAlternatives,
  type StartOngoingFromArchivedSingleBlockReason,
} from "@/domain/analysis/createOngoingFromArchivedSingle"
import {
  buildShapleyWorkerRequest,
  runShapleyAttributionForPayload,
} from "@/domain/simulation/shapleyWorkerMessages"
import { percentile } from "@/domain/simulation/stats"
import type { ProjectResult } from "@/simulation.worker"
import {
  buildOngoingCheckpointResultSnapshot,
  freezeOngoingCompactForArchive,
  isOngoingCheckpointResultSnapshot,
  type OngoingCheckpointResultSnapshotV1,
} from "@/domain/analysis/ongoingCheckpointResultSnapshot"
import {
  ongoingDraftResultIdentityMatches,
  pickAuthoritativeOngoingDraftResult,
} from "@/domain/analysis/ongoingDraftResultCommit"
import { getSimulationRunIdForProject } from "@/domain/simulation/simulationRunId"
import {
  buildSingleArchivedResultSnapshot,
  type SingleAnalysisArchivedSnapshot,
} from "@/domain/analysis/singleArchivedResultSnapshot"
import {
  buildSingleDraftFromCompactSeed,
  buildSingleDraftResultSnapshot,
  freezeSingleDraftForArchive,
  pickAuthoritativeSingleDraftResult,
  singleDraftResultIdentityMatches,
  type SingleDraftResultSnapshotV1,
} from "@/domain/analysis/singleDraftResultSnapshot"

export type CommitOngoingDraftResultInput = {
  analysisId: string
  checkpointId: string
  projects: readonly Project[]
  activeProjectId: string
  projectResults: readonly ProjectResult[]
  simulatedBaseCostByProjectId: Readonly<Record<string, number | null>>
  inputSignature: string
  simulationCount: number
  resultPreferences: ResultPreferencesV1
  simulationRunIdByProjectId: Readonly<Record<string, string>>
}

export type CommitSingleDraftResultInput = {
  analysisId: string
  projects: readonly Project[]
  activeProjectId: string
  projectResults: readonly ProjectResult[]
  simulatedBaseCostByProjectId: Readonly<Record<string, number | null>>
  inputSignature: string
  simulationCount: number
  resultPreferences: ResultPreferencesV1
  simulationRunIdByProjectId: Readonly<Record<string, string>>
}

function restoreDraftResultPreferences(
  doc: AnalysisDocument,
  replacePreferences: (next: ResultPreferencesV1) => void,
): void {
  if (doc.status !== "draft" || !doc.draftResultPreferences) return
  replacePreferences(normalizeResultPreferences(doc.draftResultPreferences))
}

function computeShapleyByProjectIdForArchive(
  projects: readonly Project[],
  projectResults: readonly ProjectResult[],
): Record<string, ShapleyAttributionResult | null> {
  const shapleyByProjectId: Record<string, ShapleyAttributionResult | null> =
    {}
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

export type LibrarySaveStatus =
  | "idle"
  | "saving"
  | "saved"
  | "error"
  | "error_quota"

export type ArchiveCurrentResult =
  | { ok: true; doc: AnalysisDocument }
  | { ok: false; reason: ArchiveBlockReason }

export type ArchiveCheckpointResult =
  | { ok: true; ongoing: OngoingAnalysisState }
  | { ok: false; reason: ArchiveBlockReason }

export type CreateNextCheckpointSessionResult =
  | {
      ok: true
      ongoing: OngoingAnalysisState
      newCheckpoint: AnalysisCheckpoint
    }
  | {
      ok: false
      reason: CreateNextCheckpointBlockReason | "persistence_failed"
    }

/**
 * Deletes only the tip draft checkpoint inside an Ongoing Analysis.
 * Never moves the AnalysisDocument to Trash or sets deletedAt.
 */
export type DeleteActiveDraftCheckpointSessionResult =
  | {
      ok: true
      ongoing: OngoingAnalysisState
      restoredCheckpoint: AnalysisCheckpoint
      deletedCheckpointId: string
    }
  | {
      ok: false
      reason: DeleteActiveDraftCheckpointBlockReason | "persistence_failed"
    }

export type CompleteOngoingAnalysisResult =
  | { ok: true; doc: AnalysisDocument }
  | { ok: false; reason: CompleteOngoingAnalysisBlockReason | "persistence_failed" }

/**
 * Loads an AnalysisDocument when `?analysis=` is present and autosaves drafts.
 * Route `?analysis=` id is authoritative for which document is open.
 *
 * Ongoing ownership: session/domain syncs active draft workspace locally;
 * repository persists the supplied document without mutating Ongoing structure.
 */
export function useLibraryAnalysisSession(args: {
  projects: Project[]
  activeProjectId: string
  setProjects: (projects: Project[] | ((prev: Project[]) => Project[])) => void
  setActiveProjectId: (id: string) => void
  projectResults: ProjectResult[]
  simulatedBaseCostByProjectId: Record<string, number | null>
  lastSimulatedInputSignature: string
  simulationCount: number
  simulationRunIdByProjectId?: Readonly<Record<string, string>>
  resultPreferences: ResultPreferencesV1
  /** Live simulation ownership (analysis + checkpoint at run). */
  liveSimulationAnalysisId?: string | null
  liveSimulationCheckpointId?: string | null
  applyArchivedResults: (source: {
    archivedSnapshot?: SingleAnalysisArchivedSnapshot
  }) => void
  applyOngoingCompactResult: (
    snapshot: OngoingCheckpointResultSnapshotV1,
  ) => void
  applySingleDraftResult: (snapshot: SingleDraftResultSnapshotV1) => void
  applyDraftResultSeed: (seed: DraftResultSeedV1) => void
  clearResults: () => void
  /** Hydrate App Result Settings after compact/archive apply (draft presentation). */
  replacePreferences: (next: ResultPreferencesV1) => void
}) {
  const repo = getAnalysisLibraryRepository()
  // Re-read when pathname or search changes (e.g. analysis A → B on /app).
  useSyncExternalStore(subscribeLocation, getLocationPathKey, () => "/")
  const analysisId = readAnalysisIdFromLocation()
  const [docMeta, setDocMeta] = useState<{
    id: string
    name: string
    status: AnalysisStatus
    folderId: string | null
    analysisMode: AnalysisMode
    previousVersionId?: string
  } | null>(null)
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
  const ongoingDraftResultRef =
    useRef<OngoingCheckpointResultSnapshotV1 | null>(null)
  ongoingDraftResultRef.current = ongoingDraftResult
  const [singleDraftResult, setSingleDraftResult] =
    useState<SingleDraftResultSnapshotV1 | null>(null)
  const singleDraftResultRef = useRef<SingleDraftResultSnapshotV1 | null>(null)
  singleDraftResultRef.current = singleDraftResult
  const [draftResultSeed, setDraftResultSeed] =
    useState<DraftResultSeedV1 | null>(null)
  const draftResultSeedRef = useRef<DraftResultSeedV1 | null>(null)
  draftResultSeedRef.current = draftResultSeed
  const loadedIdRef = useRef<string | null>(null)
  const skipNextSaveRef = useRef(false)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const savedClearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const saveChainRef = useRef(Promise.resolve())
  /** Always recover from a prior rejection so later archive/save work still runs. */
  const enqueueSave = useCallback((op: () => Promise<void>) => {
    const next = saveChainRef.current.catch(() => undefined).then(op)
    saveChainRef.current = next.catch(() => undefined)
    return next
  }, [])

  /** Live App result/input state for archive eligibility (avoids stale closures). */
  const liveArchiveStateRef = useRef({
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
          existing.analysisMode === "ongoing"
            ? ensureSingleProjectWorkspace(workspace)
            : workspace,
        ...(nextOngoing && existing.analysisMode === "ongoing"
          ? { ongoing: nextOngoing }
          : {}),
        ...replaceDraftResultField(
          "ongoingDraftResult",
          existing.analysisMode === "ongoing"
            ? authoritativeOngoingDraft
            : undefined,
        ),
        ...replaceDraftResultField(
          "singleDraftResult",
          existing.analysisMode === "single"
            ? authoritativeSingleDraft
            : undefined,
        ),
        // Presentation-only — do not rewrite frozen snapshot resultView/analytics.
        draftResultPreferences: cloneResultPreferences(
          live.resultPreferences,
        ),
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
    async (
      input: CommitOngoingDraftResultInput,
    ): Promise<{ ok: true } | { ok: false }> => {
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
    async (
      input: CommitSingleDraftResultInput,
    ): Promise<{ ok: true } | { ok: false }> => {
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
        docMeta?.analysisMode === "ongoing"
          ? ongoingDraftResultRef.current
          : null,
      singleDraftResult:
        docMeta?.analysisMode === "single"
          ? singleDraftResultRef.current
          : null,
      resultPreferences: live.resultPreferences,
    })
  }, [docMeta?.analysisMode])

  const loadGenerationRef = useRef(0)

  const activeCheckpoint = getActiveCheckpoint(ongoing ?? undefined) ?? null
  const analysisMode = docMeta?.analysisMode ?? DEFAULT_ANALYSIS_MODE
  const checkpointReadOnly =
    analysisMode === "ongoing" && activeCheckpoint?.status === "archived"
  const readOnly =
    docMeta?.status === "archived" || checkpointReadOnly

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
          if (
            checkpoint.status === "archived" &&
            checkpoint.archivedSnapshot
          ) {
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
        await repo.touchMetadata(doc.id, { lastOpenedAt: nowIso() }, {
          knownDocument: doc,
        })
        if (cancelled || loadGenerationRef.current !== generation) return
        setReady(true)
      } catch {
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
    if (
      live.projectResults.length > 0 &&
      live.lastSimulatedInputSignature.trim() !== ""
    ) {
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
    } catch {
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
    readLiveArchiveBlockReason,
    repo,
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
      const result = await beginStartOngoingFromArchived(
        selectedProjectId,
        name,
      )
      return result.ok ? result.doc : null
    },
    [beginStartOngoingFromArchived],
  )

  const clearDraftResultSeed = useCallback(async () => {
    setDraftResultSeed(null)
    const id = loadedIdRef.current
    if (!id) return
    try {
      await enqueueSave(async () => {
        const existing = await repo.get(id)
        if (
          !existing ||
          existing.status !== "draft" ||
          !existing.draftResultSeed
        ) {
          return
        }
        const { draftResultSeed: _removed, ...rest } = existing
        await repo.saveDraft(rest)
      })
    } catch {
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
        if (
          !existing ||
          existing.status !== "draft" ||
          !existing.ongoingDraftResult
        ) {
          return
        }
        await repo.saveDraft(
          omitDraftResultFields(existing, "ongoingDraftResult"),
        )
      })
    } catch {
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
        if (
          !existing ||
          existing.status !== "draft" ||
          !existing.singleDraftResult
        ) {
          return
        }
        await repo.saveDraft(
          omitDraftResultFields(existing, "singleDraftResult"),
        )
      })
    } catch {
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

  /**
   * Ongoing mode: freeze the active draft checkpoint. Document stays draft;
   * the ongoing analysis remains active (not completed).
   */
  const archiveActiveCheckpoint =
    useCallback(async (): Promise<ArchiveCheckpointResult> => {
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
      } catch {
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
      } else if (
        compactDraft &&
        isOngoingCheckpointResultSnapshot(compactDraft)
      ) {
        snapshot = freezeOngoingCompactForArchive(compactDraft, {
          computedAt: archivedAt,
          resultPreferences: live.resultPreferences,
        })
      } else {
        return { ok: false, reason: "no_results" }
      }

      // Sync live editor workspace into the active draft, then archive that checkpoint.
      const synced = syncActiveCheckpointWorkspace(
        authoritativeOngoing,
        {
          projects: live.projects,
          activeProjectId: live.activeProjectId,
        },
      )
      const nextOngoing = archiveCheckpoint(
        synced,
        activeId,
        snapshot,
        archivedAt,
      )
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
      } catch {
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
      readLiveArchiveBlockReason,
      repo,
    ])

  const completeOngoingAnalysisSession = useCallback(
    async (): Promise<CompleteOngoingAnalysisResult> => {
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
      } catch {
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
          ? getActiveCheckpoint(completed.ongoing) ??
            getLatestCheckpoint(completed.ongoing)
          : null
      if (tip?.archivedSnapshot) {
        setArchivedSnapshot(tip.archivedSnapshot)
        if (isOngoingCheckpointResultSnapshot(tip.archivedSnapshot)) {
          args.applyOngoingCompactResult(tip.archivedSnapshot)
        } else {
          args.applyArchivedResults({ archivedSnapshot: tip.archivedSnapshot })
        }
        args.setProjects(
          ensureSingleProjectWorkspace(tip.workspace).projects,
        )
        args.setActiveProjectId(
          ensureSingleProjectWorkspace(tip.workspace).activeProjectId,
        )
      } else if (completed.archivedSnapshot) {
        setArchivedSnapshot(completed.archivedSnapshot)
        args.applyArchivedResults(completed)
      }
      return { ok: true, doc: completed }
    },
    [args, docMeta, enqueueSave, repo],
  )

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
      } catch {
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
          created.inheritedResult.projectsAtRun &&
          created.inheritedResult.projectsAtRun.length > 0
            ? created.inheritedResult.projectsAtRun
            : (structuredClone(
                created.newCheckpoint.workspace.projects,
              ) as import("@/domain/analysis/project").Project[]),
      }

      const nextWorkspace = ensureSingleProjectWorkspace(
        created.newCheckpoint.workspace,
      )
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
            createNextDoc = omitDraftResultFields(
              createNextDoc,
              "draftResultSeed",
            )
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
    [args, docMeta, enqueueSave, flushPendingSave, repo, setSaveStatusSafe],
  )

  /**
   * Durable-first removal of the tip draft checkpoint only.
   * Uses saveDraft — never moveToTrash / deletedAt / analysis delete.
   */
  const deleteActiveDraftCheckpointSession = useCallback(
    async (): Promise<DeleteActiveDraftCheckpointSessionResult> => {
      if (!docMeta || docMeta.status !== "draft") {
        return { ok: false, reason: "empty" }
      }
      if (docMeta.analysisMode !== "ongoing") {
        return { ok: false, reason: "empty" }
      }
      try {
        await flushPendingSave()
      } catch {
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
      } catch {
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
    },
    [
      applyCheckpointView,
      args,
      docMeta,
      enqueueSave,
      flushPendingSave,
      repo,
      setSaveStatusSafe,
    ],
  )

  const selectCheckpoint = useCallback(
    async (checkpointId: string) => {
      if (!docMeta || docMeta.analysisMode !== "ongoing") return
      if (!ongoing || ongoing.activeCheckpointId === checkpointId) return
      if (!ongoing.checkpoints.some((c) => c.id === checkpointId)) return

      try {
        await flushPendingSave()
      } catch {
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
      ongoing,
      repo,
      setSaveStatusSafe,
    ],
  )

  const moveCurrentToTrash = useCallback(async () => {
    if (!docMeta) return
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current)
      saveTimerRef.current = null
    }
    try {
      await flushPendingSave()
    } catch {
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
            docMeta?.analysisMode === "ongoing"
              ? ongoing?.activeCheckpointId ?? null
              : null,
          projects: liveArchiveStateRef.current.projects,
          projectResults: liveArchiveStateRef.current.projectResults,
          lastSimulatedInputSignature:
            liveArchiveStateRef.current.lastSimulatedInputSignature,
          simulationState: {
            analysisId:
              liveArchiveStateRef.current.liveSimulationAnalysisId,
            checkpointId:
              liveArchiveStateRef.current.liveSimulationCheckpointId,
            inputSignature:
              liveArchiveStateRef.current.lastSimulatedInputSignature,
            projectResults: liveArchiveStateRef.current.projectResults,
            simulatedBaseCostByProjectId:
              liveArchiveStateRef.current.simulatedBaseCostByProjectId,
            activeProjectIdAtRun:
              liveArchiveStateRef.current.activeProjectId,
            simulationCount: liveArchiveStateRef.current.simulationCount,
            projectsAtRun: [],
          },
          ongoingCompactResult:
            docMeta?.analysisMode === "ongoing"
              ? ongoingDraftResult
              : null,
          singleDraftResult:
            docMeta?.analysisMode === "single" ? singleDraftResult : null,
        }),
    ),
    getArchiveBlockReason: readLiveArchiveBlockReason,
    archiveCurrent,
    archiveActiveCheckpoint,
    completeOngoingAnalysis: completeOngoingAnalysisSession,
    canCompleteOngoingAnalysis: Boolean(
      docMeta?.status === "draft" &&
        analysisMode === "ongoing" &&
        ongoing?.lifecycle === "active",
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
    createNextCheckpointBlockReason: getCreateNextCheckpointBlockReason(
      ongoing ?? undefined,
    ),
    /** Checkpoint-only delete — never analysis Trash / deletedAt. */
    deleteActiveDraftCheckpoint: deleteActiveDraftCheckpointSession,
    canDeleteActiveDraftCheckpoint: Boolean(
      docMeta?.status === "draft" &&
        analysisMode === "ongoing" &&
        getDeleteActiveDraftCheckpointBlockReason(
          ongoing ?? undefined,
        ) === null,
    ),
    getDeleteActiveDraftCheckpointBlockReason: () =>
      getDeleteActiveDraftCheckpointBlockReason(ongoing ?? undefined),
    atCheckpointLimit: Boolean(
      ongoing && ongoing.checkpoints.length >= MAX_CHECKPOINTS,
    ),
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
      }).catch(() => undefined)
    },
    attachSingleDraftContribution: (
      projectId: string,
      contribution: ShapleyAttributionResult,
      expectedRunId: string,
    ) => {
      const current = singleDraftResultRef.current
      const live = liveArchiveStateRef.current
      if (
        !current ||
        current.activeProjectIdAtRun !== projectId ||
        !expectedRunId
      ) {
        return
      }
      const currentRunId =
        current.simulationRunIdByProjectId?.[projectId] ?? ""
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
      }).catch(() => undefined)
    },
    renameAnalysis,
    setFolderId,
    flushPendingSave,
    moveCurrentToTrash,
  }
}
