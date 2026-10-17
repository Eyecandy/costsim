import { useEffect, useRef, type Dispatch, type SetStateAction, type RefObject } from "react"
import SimulationWorker from "@/workers/simulation.worker.ts?worker"
import type { ProjectResult, SimulationWorkerResult } from "@/domain/simulation/simulationTypes"
import { buildSimulationProjectPayload } from "@/domain/simulation/buildSimulationProjectPayload"
import { createSimulationRunIdsForProjects } from "@/domain/simulation/simulationRunId"
import { buildSimulationInputSignature } from "@/domain/simulation/simulationInputSignature"
import type { Project } from "@/domain/analysis/project"
import {
  LAST_SIMULATION_SNAPSHOT_VERSION,
  persistLastSimulationSnapshot,
} from "@/persistence/lastSimulationSnapshot"
import type {
  OngoingCheckpointResultSnapshotV1,
} from "@/domain/analysis/ongoingCheckpointResultSnapshot"
import type { SingleArchivedResultSnapshotV1 } from "@/domain/analysis/singleArchivedResultSnapshot"
import type { SingleDraftResultSnapshotV1 } from "@/domain/analysis/singleDraftResultSnapshot"
import {
  baseCostSumForProject,
  runValidationErrorKey,
  type RunErrorKey,
} from "@/app/workspace/workspaceHelpers"
import type { useLibraryAnalysisSession } from "@/features/analysis-library/useLibraryAnalysisSession"
import type { CommitOngoingDraftResultInput } from "@/features/analysis-library/useLibraryAnalysisSession"
import type { CommitSingleDraftResultInput } from "@/features/analysis-library/useLibraryAnalysisSession"
import type { ResultPreferencesV1 } from "@/domain/results/resultPreferences"

export function useSimulationRun({
  activeProjectId,
  analysisReadOnly,
  clearDraftResultSeedRef,
  commitOngoingDraftResultRef,
  commitSingleDraftResultRef,
  focusViewRef,
  isOngoingAnalysis,
  librarySession,
  pendingFocusResultsAfterGuidedRunRef,
  projects,
  resultPreferences,
  runs,
  setFocusResultStepIndex,
  setFocusView,
  setIsRunning,
  setLastSimulatedInputSignature,
  setLastSimulatedProjects,
  setLiveSimAnalysisId,
  setLiveSimCheckpointId,
  setOngoingCompactResult,
  setProjectResults,
  setRunErrorKey,
  setRunProgress,
  setSimulatedBaseCostByProjectId,
  setSimulationRunIdByProjectId,
  setSimulationStartTime,
  setSingleArchivedCompact,
  setSingleDraftCompact,
  setValidationFeedbackActive,
}: {
  activeProjectId: string
  analysisReadOnly: boolean
  clearDraftResultSeedRef: RefObject<() => Promise<void>>
  commitOngoingDraftResultRef: RefObject<((input: CommitOngoingDraftResultInput) => Promise<{ ok: true; } | { ok: false; }>) | null>
  commitSingleDraftResultRef: RefObject<((input: CommitSingleDraftResultInput) => Promise<{ ok: true; } | { ok: false; }>) | null>
  focusViewRef: RefObject<'input' | 'results' | null>
  isOngoingAnalysis: boolean
  librarySession: ReturnType<typeof useLibraryAnalysisSession>
  pendingFocusResultsAfterGuidedRunRef: RefObject<boolean>
  projects: Project[]
  resultPreferences: ResultPreferencesV1
  runs: number
  setFocusResultStepIndex: Dispatch<SetStateAction<number>>
  setFocusView: Dispatch<SetStateAction<'input' | 'results' | null>>
  setIsRunning: Dispatch<SetStateAction<boolean>>
  setLastSimulatedInputSignature: Dispatch<SetStateAction<string>>
  setLastSimulatedProjects: Dispatch<SetStateAction<Project[]>>
  setLiveSimAnalysisId: Dispatch<SetStateAction<string | null>>
  setLiveSimCheckpointId: Dispatch<SetStateAction<string | null>>
  setOngoingCompactResult: Dispatch<SetStateAction<OngoingCheckpointResultSnapshotV1 | null>>
  setProjectResults: Dispatch<SetStateAction<ProjectResult[]>>
  setRunErrorKey: Dispatch<SetStateAction<RunErrorKey | null>>
  setRunProgress: Dispatch<SetStateAction<number>>
  setSimulatedBaseCostByProjectId: Dispatch<SetStateAction<Record<string, number | null>>>
  setSimulationRunIdByProjectId: Dispatch<SetStateAction<Record<string, string>>>
  setSimulationStartTime: Dispatch<SetStateAction<number | null>>
  setSingleArchivedCompact: Dispatch<SetStateAction<SingleArchivedResultSnapshotV1 | null>>
  setSingleDraftCompact: Dispatch<SetStateAction<SingleDraftResultSnapshotV1 | null>>
  setValidationFeedbackActive: Dispatch<SetStateAction<boolean>>
}) {
  const runningRef = useRef(false)
  const pendingRunBaseCostByProjectIdRef = useRef<Record<string, number | null>>({})
  const pendingRunInputSignatureRef = useRef("")
  const pendingRunActiveProjectIdRef = useRef("")
  const pendingRunAnalysisIdRef = useRef<string | null>(null)
  const pendingRunCheckpointIdRef = useRef<string | null>(null)
  const pendingRunProjectsRef = useRef<Project[]>([])
  const pendingRunSimulationCountRef = useRef(0)
  const pendingRunResultPreferencesRef = useRef(resultPreferences)
  /** Current editor context for discarding late worker responses. */
  const currentAnalysisIdRef = useRef<string | null>(null)
  const currentCheckpointIdRef = useRef<string | null>(null)
  currentAnalysisIdRef.current = librarySession.docMeta?.id ?? null
  currentCheckpointIdRef.current = isOngoingAnalysis
    ? librarySession.activeCheckpoint?.id ?? null
    : null
  const setLiveSimOwnershipRef = useRef({
    setLiveSimAnalysisId,
    setLiveSimCheckpointId,
    setLastSimulatedProjects,
  })
  setLiveSimOwnershipRef.current = {
    setLiveSimAnalysisId,
    setLiveSimCheckpointId,
    setLastSimulatedProjects,
  }
  const workerRef = useRef<Worker | null>(null)
  const runSeqRef = useRef(0)
  const runStartedAtRef = useRef(0)
  const progressRafRef = useRef<number | null>(null)
  const completeMinWaitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  )
  const completeHideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  )

  const MIN_RUN_UI_MS = 2000
  const FAKE_PROGRESS_CAP = 92
  const SLOW_PROGRESS_MAX = 95
  const COMPLETE_HOLD_MS = 450

  const stopProgressAnimation = () => {
    if (progressRafRef.current !== null) {
      cancelAnimationFrame(progressRafRef.current)
      progressRafRef.current = null
    }
  }

  const clearCompletionTimers = () => {
    if (completeMinWaitTimerRef.current !== null) {
      clearTimeout(completeMinWaitTimerRef.current)
      completeMinWaitTimerRef.current = null
    }
    if (completeHideTimerRef.current !== null) {
      clearTimeout(completeHideTimerRef.current)
      completeHideTimerRef.current = null
    }
  }

  const startProgressAnimation = (seq: number) => {
    stopProgressAnimation()
    const tick = () => {
      if (runSeqRef.current !== seq || !runningRef.current) {
        progressRafRef.current = null
        return
      }
      const elapsed = performance.now() - runStartedAtRef.current
      let next: number
      if (elapsed < MIN_RUN_UI_MS) {
        const t = Math.min(1, elapsed / MIN_RUN_UI_MS)
        const eased = 1 - (1 - t) * (1 - t)
        next = FAKE_PROGRESS_CAP * eased
      } else {
        const slowSpan = 10000
        const extra = Math.min(
          SLOW_PROGRESS_MAX - FAKE_PROGRESS_CAP,
          ((elapsed - MIN_RUN_UI_MS) / slowSpan) *
            (SLOW_PROGRESS_MAX - FAKE_PROGRESS_CAP),
        )
        next = FAKE_PROGRESS_CAP + extra
      }
      setRunProgress((p) => (next > p ? next : p))
      progressRafRef.current = requestAnimationFrame(tick)
    }
    progressRafRef.current = requestAnimationFrame(tick)
  }

  useEffect(() => {
    const worker = new SimulationWorker()
    workerRef.current = worker

    const scheduleRunCompletion = (
      finishedSeq: number,
      applyResult: () => void,
    ) => {
      clearCompletionTimers()
      const elapsed = performance.now() - runStartedAtRef.current
      const waitMin = Math.max(0, MIN_RUN_UI_MS - elapsed)

      const goComplete = () => {
        if (finishedSeq !== runSeqRef.current) return
        stopProgressAnimation()
        setRunProgress(100)
        completeHideTimerRef.current = setTimeout(() => {
          completeHideTimerRef.current = null
          if (finishedSeq !== runSeqRef.current) return
          applyResult()
          runningRef.current = false
          setIsRunning(false)
          setRunProgress(0)
          setSimulationStartTime(null)
        }, COMPLETE_HOLD_MS)
      }

      if (waitMin > 0) {
        completeMinWaitTimerRef.current = setTimeout(() => {
          completeMinWaitTimerRef.current = null
          goComplete()
        }, waitMin)
      } else {
        goComplete()
      }
    }

    worker.onmessage = (e: MessageEvent<SimulationWorkerResult>) => {
      const finishedSeq = runSeqRef.current
      scheduleRunCompletion(finishedSeq, () => {
        // Late response: do not attach results to a different analysis/checkpoint.
        if (
          pendingRunAnalysisIdRef.current !== currentAnalysisIdRef.current ||
          pendingRunCheckpointIdRef.current !== currentCheckpointIdRef.current
        ) {
          return
        }
        const inputSig = pendingRunInputSignatureRef.current
        const baseCosts = { ...pendingRunBaseCostByProjectIdRef.current }
        setOngoingCompactResult(null)
        setSingleArchivedCompact(null)
        setSingleDraftCompact(null)
        setProjectResults(e.data.projectResults)
        setSimulatedBaseCostByProjectId(baseCosts)
        setLastSimulatedInputSignature(inputSig)
        setLiveSimOwnershipRef.current.setLastSimulatedProjects(
          pendingRunProjectsRef.current,
        )
        setLiveSimOwnershipRef.current.setLiveSimAnalysisId(
          pendingRunAnalysisIdRef.current,
        )
        setLiveSimOwnershipRef.current.setLiveSimCheckpointId(
          pendingRunCheckpointIdRef.current,
        )
        const runIds = createSimulationRunIdsForProjects(
          e.data.projectResults.map((result) => result.projectId),
          finishedSeq,
        )
        setSimulationRunIdByProjectId(runIds)
        setRunErrorKey(null)
        void clearDraftResultSeedRef.current()
        const runAnalysisId = pendingRunAnalysisIdRef.current
        const runCheckpointId = pendingRunCheckpointIdRef.current
        if (runAnalysisId && runCheckpointId) {
          void commitOngoingDraftResultRef.current?.({
            analysisId: runAnalysisId,
            checkpointId: runCheckpointId,
            projects: pendingRunProjectsRef.current,
            activeProjectId: pendingRunActiveProjectIdRef.current,
            projectResults: e.data.projectResults,
            simulatedBaseCostByProjectId: baseCosts,
            inputSignature: inputSig,
            simulationCount: pendingRunSimulationCountRef.current,
            resultPreferences: pendingRunResultPreferencesRef.current,
            simulationRunIdByProjectId: runIds,
          })
        } else if (runAnalysisId && runCheckpointId === null) {
          void commitSingleDraftResultRef.current?.({
            analysisId: runAnalysisId,
            projects: pendingRunProjectsRef.current,
            activeProjectId: pendingRunActiveProjectIdRef.current,
            projectResults: e.data.projectResults,
            simulatedBaseCostByProjectId: baseCosts,
            inputSignature: inputSig,
            simulationCount: pendingRunSimulationCountRef.current,
            resultPreferences: pendingRunResultPreferencesRef.current,
            simulationRunIdByProjectId: runIds,
          })
        }
        persistLastSimulationSnapshot({
          v: LAST_SIMULATION_SNAPSHOT_VERSION,
          inputSignature: inputSig,
          projectResults: e.data.projectResults,
          simulatedBaseCostByProjectId: baseCosts,
          activeProjectIdAtRun: pendingRunActiveProjectIdRef.current,
        })
        // Guided Simulation / Focus Input → first Focus result step on success.
        if (
          pendingFocusResultsAfterGuidedRunRef.current ||
          focusViewRef.current === "input"
        ) {
          pendingFocusResultsAfterGuidedRunRef.current = false
          setFocusResultStepIndex(0)
          setFocusView("results")
        }
      })
    }

    worker.onerror = () => {
      const finishedSeq = runSeqRef.current
      scheduleRunCompletion(finishedSeq, () => {
        pendingFocusResultsAfterGuidedRunRef.current = false
        setRunErrorKey("projects.workerError")
        setProjectResults([])
        setSimulationRunIdByProjectId({})
      })
    }

    return () => {
      clearCompletionTimers()
      stopProgressAnimation()
      worker.terminate()
      workerRef.current = null
    }
  }, [])

  const handleRun = () => {
    if (analysisReadOnly) return
    const w = workerRef.current
    if (!w || runningRef.current) return

    if (projects.length === 0) return

    const validationError = runValidationErrorKey(projects)
    if (validationError !== null) {
      setRunErrorKey(validationError)
      setValidationFeedbackActive(true)
      return
    }

    const payloads = projects
      .map((proj) => buildSimulationProjectPayload(proj))
      .filter((payload): payload is NonNullable<typeof payload> => payload !== null)

    runSeqRef.current += 1
    const seq = runSeqRef.current
    runStartedAtRef.current = performance.now()
    clearCompletionTimers()
    stopProgressAnimation()
    runningRef.current = true
    pendingRunBaseCostByProjectIdRef.current = Object.fromEntries(
      projects.map((project) => [project.id, baseCostSumForProject(project)]),
    )
    pendingRunInputSignatureRef.current = buildSimulationInputSignature(projects)
    pendingRunActiveProjectIdRef.current = activeProjectId
    pendingRunProjectsRef.current = structuredClone(projects) as Project[]
    pendingRunSimulationCountRef.current = runs
    pendingRunResultPreferencesRef.current = resultPreferences
    pendingRunAnalysisIdRef.current = currentAnalysisIdRef.current
    pendingRunCheckpointIdRef.current = currentCheckpointIdRef.current
    setIsRunning(true)
    setRunErrorKey(null)
    setValidationFeedbackActive(false)
    setRunProgress(0)
    setSimulationStartTime(Date.now())
    startProgressAnimation(seq)

    w.postMessage({ runs, projects: payloads })
  }

  const handleBeforeSignOut = () => {
    runSeqRef.current += 1
    clearCompletionTimers()
    stopProgressAnimation()
    runningRef.current = false
    setRunErrorKey(null)
    setValidationFeedbackActive(false)
    setIsRunning(false)
    setRunProgress(0)
    setSimulationStartTime(null)
  }

  return {
    handleBeforeSignOut,
    handleRun,
    runningRef,
  }
}
