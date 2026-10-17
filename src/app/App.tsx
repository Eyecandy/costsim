import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import type { ProjectResult } from "@/domain/simulation/simulationTypes"

import { AnalysisSidebar } from "@/features/analysis-library/AnalysisSidebar"
import { CheckpointNav } from "@/features/checkpoints/CheckpointNav"
import { ProjectProfileSection } from "@/features/workspace/ProjectProfileSection"
import { ResultsPanel } from "@/features/results/ResultsPanel"
import { createSimulationRunIdsForProjects } from "@/domain/simulation/simulationRunId"
import {
  buildSimulationInputSignature,
  staleComparableProjects,
} from "@/domain/simulation/simulationInputSignature"
import { simulationConfig } from "@/domain/simulation/simulationConfig"
import {
  getLiveResultValidity,
  type LiveSimulationState,
} from "@/domain/simulation/liveSimulationState"
import {
  addProjectIfAllowed,
  maxProjectsReached,
  patchProjectName,
  patchProjectProfile,
  projectFromTemplateEmptyRows,
  PROJECT_SLOT_NAMES,
  type Project,
} from "@/domain/analysis/project"
import { duplicateProject, nextCopiedProjectName } from "@/domain/analysis/cloneAnalysisWorkspace"
import {
  decodeShareV1FromHash,
  decodeShareV2FromSearch,
  decodeShareV2FromHash,
  getShareV2PlaceholderOnce,
  isShareV2Search,
  isShareV2Hash,
  SHARE_QUERY_PARAM,
} from "@/persistence/shareLink"
import { loadAppInputStateFromStorage, saveToStorage, STORAGE_KEYS } from "@/persistence/storage"
import { PROJECT_PROFILE_FOCUS_ROW_CLASS } from "@/domain/results/columnHeaderLayout"
import { cn } from "@/shared/utils"
import { useI18n } from "@/i18n/useI18n"
import { appFeatures } from "@/config/appVariant"
import { PRODUCT_NAME } from "@/shared/brand"
import { getInitialRestoredSimulationState } from "@/persistence/lastSimulationSnapshot"
import { navigateTo } from "@/shared/auth/auth"
import { LIBRARY_PATH, readAnalysisIdFromLocation } from "@/persistence/analysisLibraryRoutes"
import { useLibraryAnalysisSession } from "@/features/analysis-library/useLibraryAnalysisSession"
import { useResultPreferences } from "@/features/results/useResultPreferences"
import {
  isOngoingCheckpointResultSnapshot,
  type OngoingCheckpointResultSnapshotV1,
} from "@/domain/analysis/ongoingCheckpointResultSnapshot"
import type { DraftResultSeedV1 } from "@/domain/analysis/draftResultSeed"
import {
  isSingleArchivedResultSnapshot,
  SINGLE_ARCHIVED_RESULT_KIND,
  SINGLE_ARCHIVED_RESULT_SCHEMA_VERSION,
  type SingleAnalysisArchivedSnapshot,
  type SingleArchivedResultSnapshotV1,
} from "@/domain/analysis/singleArchivedResultSnapshot"
import type { SingleDraftResultSnapshotV1 } from "@/domain/analysis/singleDraftResultSnapshot"
import { parseProjectsPayload } from "@/domain/analysis/projectsPayload"

import {
  RESULTS_COLUMN_CLASS,
  RESULTS_ALIGN_WITH_COST_ITEMS_CLASS,
  ONGOING_WORKSPACE_LAYOUT_CLASS,
  ONGOING_WORKSPACE_LEFT_CLASS,
  ONGOING_WORKSPACE_RIGHT_CLASS,
  ONGOING_TIMELINE_CELL_CLASS,
  ONGOING_PROJECT_PROFILE_CELL_CLASS,
  ONGOING_RESULTS_CELL_CLASS,
} from "@/app/workspace/layoutClasses"
import { PrimaryFocusModeEntry } from "@/app/workspace/PrimaryFocusModeEntry"
import {
  VALIDATION_ERROR_KEYS,
  runValidationErrorKey,
  type RunErrorKey,
} from "@/app/workspace/workspaceHelpers"

import { useSidebarState } from "@/app/workspace/useSidebarState"
import { useActionNotices } from "@/app/workspace/useActionNotices"
import { useAnalysisDialogs } from "@/app/workspace/useAnalysisDialogs"
import { useStaleInputDiffs } from "@/app/workspace/useStaleInputDiffs"

import { WorkspaceDialogs } from "@/app/workspace/WorkspaceDialogs"
import { AnalysisHeader } from "@/app/workspace/AnalysisHeader"
import { ProjectTabs } from "@/app/workspace/ProjectTabs"
import { SimulationStrip } from "@/app/workspace/SimulationStrip"
import { useSimulationRun } from "@/app/workspace/useSimulationRun"
import { useGuidedFocusState } from "@/app/workspace/useGuidedFocusState"
import { useGuidedFocusSession } from "@/app/workspace/useGuidedFocusSession"
import { FocusSession } from "@/app/workspace/FocusSession"
import { InputPanels } from "@/app/workspace/InputPanels"
import { GuidedInputHost } from "@/app/workspace/GuidedInputHost"
export default function App() {
  const { t } = useI18n()
  const [projects, setProjects] = useState<Project[]>(() => {
    if (typeof window !== "undefined") {
      if (readAnalysisIdFromLocation()) {
        return []
      }
      const s = window.location.search
      const h = window.location.hash
      const v1 = decodeShareV1FromHash(h)
      if (v1) return v1.projects
      if (isShareV2Search(s)) return getShareV2PlaceholderOnce().projects
      if (isShareV2Hash(h)) return getShareV2PlaceholderOnce().projects
    }
    return loadAppInputStateFromStorage().projects
  })
  const [activeProjectId, setActiveProjectId] = useState(() => {
    if (typeof window !== "undefined") {
      if (readAnalysisIdFromLocation()) {
        return ""
      }
      const s = window.location.search
      const h = window.location.hash
      const v1 = decodeShareV1FromHash(h)
      if (v1) return v1.activeProjectId
      if (isShareV2Search(s)) {
        return getShareV2PlaceholderOnce().activeProjectId
      }
      if (isShareV2Hash(h)) {
        return getShareV2PlaceholderOnce().activeProjectId
      }
    }
    return loadAppInputStateFromStorage().activeProjectId
  })
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null)
  const skipNameCommitRef = useRef(false)

  const runs = simulationConfig.mainRuns

  const [projectResults, setProjectResults] = useState<ProjectResult[]>(
    () => getInitialRestoredSimulationState().projectResults,
  )
  const [ongoingCompactResult, setOngoingCompactResult] =
    useState<OngoingCheckpointResultSnapshotV1 | null>(null)
  const [singleArchivedCompact, setSingleArchivedCompact] =
    useState<SingleArchivedResultSnapshotV1 | null>(null)
  const [singleDraftCompact, setSingleDraftCompact] = useState<SingleDraftResultSnapshotV1 | null>(
    null,
  )
  const [simulatedBaseCostByProjectId, setSimulatedBaseCostByProjectId] = useState<
    Record<string, number | null>
  >(() => getInitialRestoredSimulationState().simulatedBaseCostByProjectId)
  const [lastSimulatedInputSignature, setLastSimulatedInputSignature] = useState(
    () => getInitialRestoredSimulationState().lastSimulatedInputSignature,
  )
  const [lastSimulatedProjects, setLastSimulatedProjects] = useState<Project[]>(() => {
    const sig = getInitialRestoredSimulationState().lastSimulatedInputSignature
    if (!sig) return []
    try {
      return parseProjectsPayload(JSON.parse(sig)) ?? []
    } catch {
      return []
    }
  })
  /** Ownership of the live result set (captured at run/seed apply). */
  const [liveSimAnalysisId, setLiveSimAnalysisId] = useState<string | null>(null)
  const [liveSimCheckpointId, setLiveSimCheckpointId] = useState<string | null>(null)
  const [simulationRunIdByProjectId, setSimulationRunIdByProjectId] = useState<
    Record<string, string>
  >({})
  const [runErrorKey, setRunErrorKey] = useState<RunErrorKey | null>(null)
  /** True after a failed simulate click with invalid/incomplete input; cleared when input is valid. */
  const [validationFeedbackActive, setValidationFeedbackActive] = useState(false)
  const [isRunning, setIsRunning] = useState(false)
  const [, setRunProgress] = useState(0)
  const [, setSimulationStartTime] = useState<number | null>(null)
  const [deleteProjectConfirmOpen, setDeleteProjectConfirmOpen] = useState(false)
  const deleteProjectConfirmTargetRef = useRef<string | null>(null)
  const [addAlternativeOpen, setAddAlternativeOpen] = useState(false)
  const {
    archiveBlockedNotice,
    showArchiveBlockedNotice,
    finishOngoingNotice,
    showFinishOngoingNotice,
  } = useActionNotices()
  const dialogs = useAnalysisDialogs()
  const { setArchiveConfirmOpen, setFinishOngoingConfirmOpen, setNextCheckpointOpen } = dialogs
  const { sidebarOpenRequest, setSidebarOpenRequest, sidebarPinned, setSidebarPinned } =
    useSidebarState()
  const {
    preferences: resultPreferences,
    replacePreferences,
    saveAsDefault,
    resetToDefaults,
    addKeyFigurePercentile,
    removeKeyFigurePercentile,
    addSCurvePercentile,
    removeSCurvePercentile,
  } = useResultPreferences()
  const applyArchivedResults = useCallback(
    (source: { archivedSnapshot?: SingleAnalysisArchivedSnapshot }) => {
      const snap = source.archivedSnapshot
      if (!snap) {
        setProjectResults([])
        setOngoingCompactResult(null)
        setSingleArchivedCompact(null)
        setSingleDraftCompact(null)
        setSimulatedBaseCostByProjectId({})
        setLastSimulatedInputSignature("")
        setLastSimulatedProjects([])
        setLiveSimAnalysisId(null)
        setLiveSimCheckpointId(null)
        setSimulationRunIdByProjectId({})
        return
      }
      if (isSingleArchivedResultSnapshot(snap)) {
        setProjectResults([])
        setOngoingCompactResult(null)
        setSingleDraftCompact(null)
        setSingleArchivedCompact(snap)
        setSimulatedBaseCostByProjectId(
          Object.fromEntries(
            Object.entries(snap.byProjectId).map(([id, result]) => [id, result.simulatedBaseCost]),
          ),
        )
        setLastSimulatedInputSignature(snap.inputSignature)
        setLastSimulatedProjects(snap.projectsAtArchive)
        setLiveSimAnalysisId(null)
        setLiveSimCheckpointId(null)
        setSimulationRunIdByProjectId(snap.simulationRunIdByProjectId ?? {})
        replacePreferences(snap.resultPreferences)
        return
      }
      setProjectResults(snap.projectResults)
      setOngoingCompactResult(null)
      setSingleArchivedCompact(null)
      setSingleDraftCompact(null)
      setSimulatedBaseCostByProjectId(snap.simulatedBaseCostByProjectId)
      setLastSimulatedInputSignature(buildSimulationInputSignature(snap.projectsAtArchive))
      setLastSimulatedProjects(snap.projectsAtArchive)
      setLiveSimAnalysisId(null)
      setLiveSimCheckpointId(null)
      setSimulationRunIdByProjectId(
        createSimulationRunIdsForProjects(
          snap.projectsAtArchive.map((p) => p.id),
          Date.now(),
        ),
      )
    },
    [replacePreferences],
  )
  const applyDraftResultSeed = useCallback(
    (seed: DraftResultSeedV1) => {
      setProjectResults(seed.projectResults)
      setOngoingCompactResult(null)
      setSingleDraftCompact(null)
      setSingleArchivedCompact(
        seed.compactByProjectId
          ? {
              kind: SINGLE_ARCHIVED_RESULT_KIND,
              schemaVersion: SINGLE_ARCHIVED_RESULT_SCHEMA_VERSION,
              modelVersion: "single-draft-compact-seed-v1",
              archivedAt: "",
              analysisId: "",
              simulationCount: seed.simulationCount,
              inputSignature: seed.inputSignature,
              projectsAtArchive: [],
              activeProjectIdAtRun: Object.keys(seed.compactByProjectId)[0] ?? "",
              resultPreferences: seed.resultPreferences,
              resultView: seed.resultView,
              byProjectId: seed.compactByProjectId,
            }
          : null,
      )
      setSimulatedBaseCostByProjectId(seed.simulatedBaseCostByProjectId)
      setLastSimulatedInputSignature(seed.inputSignature)
      setLastSimulatedProjects([])
      // Clear ownership so the session association effect binds to the active checkpoint.
      setLiveSimAnalysisId(null)
      setLiveSimCheckpointId(null)
      setSimulationRunIdByProjectId(
        createSimulationRunIdsForProjects(
          seed.projectResults.length > 0
            ? seed.projectResults.map((r) => r.projectId)
            : Object.keys(seed.compactByProjectId ?? {}),
          Date.now(),
        ),
      )
      // Session active view only — does not write device saved defaults.
      replacePreferences(seed.resultPreferences)
    },
    [replacePreferences],
  )
  const applyOngoingCompactResult = useCallback(
    (snapshot: OngoingCheckpointResultSnapshotV1) => {
      setOngoingCompactResult(snapshot)
      setSingleArchivedCompact(null)
      setSingleDraftCompact(null)
      setProjectResults([])
      setSimulatedBaseCostByProjectId({
        [snapshot.activeProjectId]: snapshot.simulatedBaseCost,
      })
      setLastSimulatedInputSignature(snapshot.inputSignature)
      setLastSimulatedProjects(
        snapshot.projectsAtRun ? (structuredClone(snapshot.projectsAtRun) as Project[]) : [],
      )
      setLiveSimAnalysisId(snapshot.analysisId)
      setLiveSimCheckpointId(snapshot.checkpointId)
      setSimulationRunIdByProjectId(snapshot.simulationRunIdByProjectId ?? {})
      replacePreferences(snapshot.resultPreferences)
    },
    [replacePreferences],
  )
  const applySingleDraftResult = useCallback(
    (snapshot: SingleDraftResultSnapshotV1) => {
      setSingleDraftCompact(snapshot)
      setSingleArchivedCompact(null)
      setOngoingCompactResult(null)
      setProjectResults([])
      setSimulatedBaseCostByProjectId(
        Object.fromEntries(
          Object.entries(snapshot.byProjectId).map(([id, result]) => [
            id,
            result.simulatedBaseCost,
          ]),
        ),
      )
      setLastSimulatedInputSignature(snapshot.inputSignature)
      setLastSimulatedProjects(
        snapshot.projectsAtRun ? (structuredClone(snapshot.projectsAtRun) as Project[]) : [],
      )
      setLiveSimAnalysisId(snapshot.analysisId)
      setLiveSimCheckpointId(null)
      setSimulationRunIdByProjectId(snapshot.simulationRunIdByProjectId ?? {})
      replacePreferences(snapshot.resultPreferences)
    },
    [replacePreferences],
  )
  const clearLibraryResults = useCallback(() => {
    setProjectResults([])
    setOngoingCompactResult(null)
    setSingleArchivedCompact(null)
    setSingleDraftCompact(null)
    setSimulatedBaseCostByProjectId({})
    setLastSimulatedInputSignature("")
    setLastSimulatedProjects([])
    setLiveSimAnalysisId(null)
    setLiveSimCheckpointId(null)
    setSimulationRunIdByProjectId({})
  }, [])
  const commitOngoingDraftResultRef = useRef<
    | ((
        input: import("@/features/analysis-library/useLibraryAnalysisSession").CommitOngoingDraftResultInput,
      ) => Promise<{ ok: true } | { ok: false }>)
    | null
  >(null)
  const commitSingleDraftResultRef = useRef<
    | ((
        input: import("@/features/analysis-library/useLibraryAnalysisSession").CommitSingleDraftResultInput,
      ) => Promise<{ ok: true } | { ok: false }>)
    | null
  >(null)
  const librarySession = useLibraryAnalysisSession({
    projects,
    activeProjectId,
    setProjects,
    setActiveProjectId,
    projectResults,
    simulatedBaseCostByProjectId,
    lastSimulatedInputSignature,
    simulationCount: runs,
    simulationRunIdByProjectId,
    resultPreferences,
    liveSimulationAnalysisId: liveSimAnalysisId,
    liveSimulationCheckpointId: liveSimCheckpointId,
    applyArchivedResults,
    applyOngoingCompactResult,
    applySingleDraftResult,
    applyDraftResultSeed,
    clearResults: clearLibraryResults,
    replacePreferences,
  })
  const analysisReadOnly = librarySession.readOnly
  const isOngoingAnalysis = librarySession.analysisMode === "ongoing"
  const clearDraftResultSeedRef = useRef(librarySession.clearDraftResultSeed)
  clearDraftResultSeedRef.current = librarySession.clearDraftResultSeed
  commitOngoingDraftResultRef.current = librarySession.commitOngoingDraftResult
  commitSingleDraftResultRef.current = librarySession.commitSingleDraftResult

  // Keep live simulation checkpoint ownership aligned when session applies seeds/archives.
  useEffect(() => {
    if (!librarySession.ready) return
    if (isOngoingAnalysis && librarySession.activeCheckpoint) {
      // Associate current live results with the checkpoint being viewed when
      // results were applied from seed/archive for that view.
      if (
        projectResults.length > 0 &&
        liveSimCheckpointId === null &&
        lastSimulatedInputSignature !== ""
      ) {
        setLiveSimCheckpointId(librarySession.activeCheckpoint.id)
        setLiveSimAnalysisId(librarySession.docMeta?.id ?? null)
        // Do NOT fill lastSimulatedProjects from current workspace — that would
        // erase the simulation baseline needed for green-cell / Undo after edit.
      }
    } else if (!isOngoingAnalysis && projectResults.length > 0) {
      if (liveSimCheckpointId !== null) {
        setLiveSimCheckpointId(null)
      }
      if (liveSimAnalysisId === null && librarySession.docMeta?.id) {
        setLiveSimAnalysisId(librarySession.docMeta.id)
      }
    }
  }, [
    isOngoingAnalysis,
    librarySession.ready,
    librarySession.activeCheckpoint,
    librarySession.docMeta?.id,
    projectResults.length,
    liveSimCheckpointId,
    liveSimAnalysisId,
    lastSimulatedInputSignature,
  ])

  /**
   * Shared Ongoing/Single archive entry (menu + Results shortcut).
   * Same eligibility/block notices as the three-dot Archive action.
   */
  const requestArchiveCheckpoint = useCallback(() => {
    const reason = librarySession.getArchiveBlockReason()
    if (reason) {
      showArchiveBlockedNotice(reason)
      return
    }
    setArchiveConfirmOpen(true)
  }, [librarySession, showArchiveBlockedNotice, setArchiveConfirmOpen])

  const requestFinishOngoingAnalysis = useCallback(() => {
    if (!librarySession.canCompleteOngoingAnalysis) return
    const reason = librarySession.getCompleteOngoingAnalysisBlockReason()
    if (reason === "has_draft" || reason === "latest_not_archived") {
      showFinishOngoingNotice("need_archive_checkpoint")
      return
    }
    if (reason) {
      showFinishOngoingNotice("failed")
      return
    }
    setFinishOngoingConfirmOpen(true)
  }, [librarySession, showFinishOngoingNotice, setFinishOngoingConfirmOpen])

  const guidedFocusState = useGuidedFocusState()
  const {
    focusView,
    focusViewRef,
    pendingFocusResultsAfterGuidedRunRef,
    setFocusResultStepIndex,
    setFocusView,
    setShowStaleInputChanges,
    showStaleInputChanges,
  } = guidedFocusState
  useLayoutEffect(() => {
    if (typeof window === "undefined") return
    const s = window.location.search
    const h = window.location.hash
    const v1 = decodeShareV1FromHash(h)
    if (v1) {
      const { pathname, search } = window.location
      window.history.replaceState(null, "", `${pathname}${search}`)
      return
    }
    const hasShareInSearch = isShareV2Search(s)
    const hasShareInHash = isShareV2Hash(h)
    if (!hasShareInSearch && !hasShareInHash) return
    let cancelled = false
    void (async () => {
      const decoded = hasShareInSearch
        ? await decodeShareV2FromSearch(s)
        : await decodeShareV2FromHash(h)
      if (cancelled) return
      if (decoded) {
        setProjects(decoded.projects)
        setActiveProjectId(decoded.activeProjectId)
      } else {
        const fb = loadAppInputStateFromStorage()
        setProjects(fb.projects)
        setActiveProjectId(fb.activeProjectId)
      }
      const url = new URL(window.location.href)
      url.searchParams.delete(SHARE_QUERY_PARAM)
      url.hash = ""
      const nextSearch = url.searchParams.toString()
      window.history.replaceState(null, "", `${url.pathname}${nextSearch ? `?${nextSearch}` : ""}`)
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const { handleBeforeSignOut, handleRun, runningRef } = useSimulationRun({
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
  })
  useEffect(() => {
    if (projects.length === 0) return
    if (!projects.some((p) => p.id === activeProjectId)) {
      setActiveProjectId(projects[0]!.id)
    }
  }, [projects, activeProjectId])

  useEffect(() => {
    // Library-backed analyses: do not let empty/loading state wipe legacy cache,
    // and only mirror workspace after the routed document has loaded.
    if (librarySession.analysisId) {
      if (!librarySession.ready || projects.length === 0) return
    }
    saveToStorage(STORAGE_KEYS.projects, projects)
  }, [projects, librarySession.analysisId, librarySession.ready])

  useEffect(() => {
    if (activeProjectId === "") return
    if (librarySession.analysisId && !librarySession.ready) return
    saveToStorage(STORAGE_KEYS.activeProjectId, activeProjectId)
  }, [activeProjectId, librarySession.analysisId, librarySession.ready])

  const atMaxProjects = maxProjectsReached(projects, appFeatures.maxProjects)
  const maxProjectsTooltip = t("projects.maxProjectsTooltip").replace(
    "{max}",
    String(appFeatures.maxProjects),
  )
  const activeProject = projects.find((p) => p.id === activeProjectId) ?? projects[0] ?? null

  const liveSimulationState: LiveSimulationState = {
    analysisId: liveSimAnalysisId,
    checkpointId: liveSimCheckpointId,
    inputSignature: lastSimulatedInputSignature,
    projectResults,
    simulatedBaseCostByProjectId,
    activeProjectIdAtRun: activeProjectId,
    simulationCount: runs,
    projectsAtRun: lastSimulatedProjects,
  }
  const authoritativeOngoingCompact = isOngoingAnalysis
    ? (ongoingCompactResult ?? librarySession.ongoingDraftResult)
    : null
  const authoritativeSingleDraft = !isOngoingAnalysis
    ? (singleDraftCompact ?? librarySession.singleDraftResult)
    : null
  const liveResultValidity = getLiveResultValidity({
    analysisId: librarySession.docMeta?.id ?? null,
    checkpointId: isOngoingAnalysis ? (librarySession.activeCheckpoint?.id ?? null) : null,
    currentProjects: projects,
    simulationState: liveSimulationState,
    ongoingCompactResult: authoritativeOngoingCompact,
    singleDraftResult: authoritativeSingleDraft,
  })
  const currentValidationError = runValidationErrorKey(projects)

  useEffect(() => {
    if (
      runErrorKey === null ||
      runErrorKey === "projects.workerError" ||
      !(VALIDATION_ERROR_KEYS as readonly string[]).includes(runErrorKey)
    ) {
      return
    }
    if (currentValidationError === null) {
      setRunErrorKey(null)
      setValidationFeedbackActive(false)
    }
  }, [runErrorKey, currentValidationError])

  const showValidationFeedback = validationFeedbackActive && currentValidationError !== null

  const hasMeaningfulStaleComparableInput = staleComparableProjects(projects).length > 0

  const showStaleInputNotice =
    liveResultValidity.kind === "stale" && hasMeaningfulStaleComparableInput

  const hasViewableResults =
    liveResultValidity.kind === "valid" || liveResultValidity.kind === "stale"

  const checkpointComparisonResultSource = useMemo(() => {
    if (!isOngoingAnalysis || (projectResults.length === 0 && !ongoingCompactResult)) {
      return null
    }
    return {
      projectResults,
      simulatedBaseCostByProjectId,
      ...(ongoingCompactResult ? { compact: ongoingCompactResult } : {}),
      resultsComparable:
        analysisReadOnly ||
        (ongoingCompactResult
          ? buildSimulationInputSignature(projects) === ongoingCompactResult.inputSignature
          : !showStaleInputNotice),
    }
  }, [
    isOngoingAnalysis,
    projectResults,
    simulatedBaseCostByProjectId,
    ongoingCompactResult,
    projects,
    analysisReadOnly,
    showStaleInputNotice,
  ])

  const guidedFocusSession = useGuidedFocusSession({
    activeProject,
    activeProjectId,
    analysisReadOnly,
    guidedFocusState,
    hasViewableResults,
    isOngoingAnalysis,
    librarySession,
    projectResults,
    setProjects,
    showStaleInputNotice,
  })
  const { openFocusModePrimary, openFocusResults } = guidedFocusSession
  const { staleProjectNameTabIds, visibleStaleChangedCellKeys, validationInvalidCellKeys } =
    useStaleInputDiffs({
      projects,
      activeProjectId,
      lastSimulatedProjects,
      liveResultValidity,
      showStaleInputChanges,
    })

  const handleRevertInputsToLastSimulation = () => {
    if (analysisReadOnly) return
    if (lastSimulatedProjects.length === 0) return
    const restored = structuredClone(lastSimulatedProjects) as Project[]
    setEditingProjectId(null)
    setProjects(restored)
    setActiveProjectId((prev) => (restored.some((p) => p.id === prev) ? prev : restored[0]!.id))
  }

  const handleSelectProject = (projectId: string) => {
    setEditingProjectId(null)
    setActiveProjectId(projectId)
  }

  const commitProjectName = (projectId: string, raw: string, fallback: string) => {
    if (analysisReadOnly) {
      setEditingProjectId(null)
      return
    }
    setEditingProjectId(null)
    const trimmed = raw.trim()
    const next = trimmed || fallback
    setProjects((prev) => patchProjectName(prev, projectId, next))
  }

  const handleAddProject = () => {
    if (analysisReadOnly || isOngoingAnalysis) return
    if (maxProjectsReached(projects, appFeatures.maxProjects)) return
    setAddAlternativeOpen(true)
  }

  const handleCreateBlankAlternative = () => {
    if (analysisReadOnly || isOngoingAnalysis) return
    let createdId: string | null = null
    setProjects((prev) => {
      if (maxProjectsReached(prev, appFeatures.maxProjects)) return prev
      const template = prev[0]
      if (!template) return prev
      const slotName = PROJECT_SLOT_NAMES[prev.length]
      const name = slotName ?? `Alternativ ${String.fromCharCode(65 + (prev.length % 26))}`
      const next = projectFromTemplateEmptyRows(template, name)
      const out = addProjectIfAllowed(prev, next, appFeatures.maxProjects)
      if (out.length > prev.length) createdId = next.id
      return out
    })
    setAddAlternativeOpen(false)
    if (createdId) {
      setEditingProjectId(null)
      setActiveProjectId(createdId)
    }
  }

  const handleCopyExistingAlternative = (sourceId: string) => {
    if (analysisReadOnly || isOngoingAnalysis) return
    let createdId: string | null = null
    setProjects((prev) => {
      if (maxProjectsReached(prev, appFeatures.maxProjects)) return prev
      const source = prev.find((p) => p.id === sourceId)
      if (!source) return prev
      const name = nextCopiedProjectName(
        source.name,
        prev.map((p) => p.name),
      )
      const { project: next } = duplicateProject(source, { name })
      const out = addProjectIfAllowed(prev, next, appFeatures.maxProjects)
      if (out.length > prev.length) createdId = next.id
      return out
    })
    setAddAlternativeOpen(false)
    if (createdId) {
      setEditingProjectId(null)
      setActiveProjectId(createdId)
    }
  }

  const handleDeleteProject = (projectId: string) => {
    if (analysisReadOnly || isOngoingAnalysis) return
    if (projects.length <= 1) return
    deleteProjectConfirmTargetRef.current = projectId
    setDeleteProjectConfirmOpen(true)
    return
  }

  const confirmDeleteProject = () => {
    if (analysisReadOnly) {
      deleteProjectConfirmTargetRef.current = null
      setDeleteProjectConfirmOpen(false)
      return
    }
    const projectId = deleteProjectConfirmTargetRef.current
    deleteProjectConfirmTargetRef.current = null
    setDeleteProjectConfirmOpen(false)
    if (!projectId) return
    setEditingProjectId((id) => (id === projectId ? null : id))
    const nextProjects = projects.filter((p) => p.id !== projectId)
    setProjects(nextProjects)
    if (activeProjectId === projectId) {
      setActiveProjectId(nextProjects[0]?.id ?? "")
    }
  }

  if (librarySession.analysisId && !librarySession.ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background font-sans text-[13px] text-muted-foreground">
        …
      </div>
    )
  }

  if (librarySession.loadError) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background">
        <p className="m-0 font-sans text-[13px] text-muted-foreground">
          {librarySession.loadError === "trashed"
            ? t("library.trashedUnavailable")
            : librarySession.loadError}
        </p>
        <button
          type="button"
          className="font-sans text-[12px] text-[#1d868c] underline"
          onClick={() => navigateTo(LIBRARY_PATH)}
        >
          {t("library.backToLibrary")}
        </button>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-background">
      <AnalysisSidebar
        activeAnalysisId={librarySession.analysisId}
        libraryEpoch={
          librarySession.docMeta
            ? `${librarySession.docMeta.id}:${librarySession.docMeta.status}:${librarySession.docMeta.folderId ?? ""}`
            : null
        }
        mobileOpenRequest={sidebarOpenRequest}
        onPinnedChange={setSidebarPinned}
        beforeLeaveWorkspace={async () => {
          if (librarySession.readOnly) return
          if (librarySession.docMeta?.status !== "draft") return
          await librarySession.flushPendingSave().catch(() => undefined)
        }}
      />
      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <div
          className={cn(
            "mx-auto flex w-full max-w-[90rem] flex-1 flex-col px-3 pb-4 md:pb-6 lg:pb-8",
            // Pinned: normal content inset. Unpinned: clear fixed rail (w-9) + gap before logo.
            sidebarPinned ? "md:px-5 lg:px-6" : "md:pl-14 md:pr-5 lg:pl-14 lg:pr-6",
          )}
        >
          <WorkspaceDialogs
            dialogs={dialogs}
            addAlternativeOpen={addAlternativeOpen}
            confirmDeleteProject={confirmDeleteProject}
            deleteProjectConfirmOpen={deleteProjectConfirmOpen}
            deleteProjectConfirmTargetRef={deleteProjectConfirmTargetRef}
            handleCopyExistingAlternative={handleCopyExistingAlternative}
            handleCreateBlankAlternative={handleCreateBlankAlternative}
            isOngoingAnalysis={isOngoingAnalysis}
            librarySession={librarySession}
            projects={projects}
            setAddAlternativeOpen={setAddAlternativeOpen}
            setDeleteProjectConfirmOpen={setDeleteProjectConfirmOpen}
            showArchiveBlockedNotice={showArchiveBlockedNotice}
            showFinishOngoingNotice={showFinishOngoingNotice}
          />
          <GuidedInputHost
            activeProject={activeProject}
            analysisReadOnly={analysisReadOnly}
            guidedFocusSession={guidedFocusSession}
            guidedFocusState={guidedFocusState}
            handleRevertInputsToLastSimulation={handleRevertInputsToLastSimulation}
            handleRun={handleRun}
            isRunning={isRunning}
            liveResultValidity={liveResultValidity}
            projects={projects}
            runningRef={runningRef}
            setProjects={setProjects}
          />
          <AnalysisHeader
            dialogs={dialogs}
            analysisReadOnly={analysisReadOnly}
            archiveBlockedNotice={archiveBlockedNotice}
            finishOngoingNotice={finishOngoingNotice}
            handleBeforeSignOut={handleBeforeSignOut}
            isOngoingAnalysis={isOngoingAnalysis}
            librarySession={librarySession}
            requestArchiveCheckpoint={requestArchiveCheckpoint}
            requestFinishOngoingAnalysis={requestFinishOngoingAnalysis}
            setSidebarOpenRequest={setSidebarOpenRequest}
          />
          <div
            data-analysis-workspace-layout={isOngoingAnalysis ? "ongoing" : "single"}
            className={
              isOngoingAnalysis
                ? ONGOING_WORKSPACE_LAYOUT_CLASS
                : "grid grid-cols-1 gap-8 md:grid-cols-2 md:items-start"
            }
          >
            <div
              className={
                isOngoingAnalysis ? ONGOING_WORKSPACE_LEFT_CLASS : "flex min-w-0 flex-col gap-0"
              }
            >
              {isOngoingAnalysis ? (
                <>
                  <div className={ONGOING_TIMELINE_CELL_CLASS}>
                    <CheckpointNav
                      checkpoints={librarySession.checkpoints}
                      activeCheckpointId={
                        librarySession.activeCheckpoint?.id ??
                        librarySession.checkpoints[0]?.id ??
                        ""
                      }
                      onSelect={(id) => {
                        void librarySession.selectCheckpoint(id)
                      }}
                      canCreateNext={librarySession.canCreateNextCheckpoint}
                      atCheckpointLimit={
                        librarySession.atCheckpointLimit && !librarySession.canCreateNextCheckpoint
                      }
                      onCreateNext={() => setNextCheckpointOpen(true)}
                    />
                  </div>
                  {activeProject ? (
                    <div
                      className={cn(
                        ONGOING_PROJECT_PROFILE_CELL_CLASS,
                        PROJECT_PROFILE_FOCUS_ROW_CLASS,
                      )}
                      data-project-profile-focus-row=""
                    >
                      <div className="min-w-0">
                        <ProjectProfileSection
                          profile={activeProject.profile}
                          readOnly={analysisReadOnly}
                          onChange={
                            analysisReadOnly
                              ? undefined
                              : (next) =>
                                  setProjects((prev) =>
                                    patchProjectProfile(prev, activeProject.id, next),
                                  )
                          }
                        />
                      </div>
                      {!analysisReadOnly ? (
                        <PrimaryFocusModeEntry onClick={openFocusModePrimary} />
                      ) : null}
                    </div>
                  ) : null}
                </>
              ) : (
                <ProjectTabs
                  activeProjectId={activeProjectId}
                  analysisReadOnly={analysisReadOnly}
                  atMaxProjects={atMaxProjects}
                  commitProjectName={commitProjectName}
                  editingProjectId={editingProjectId}
                  handleAddProject={handleAddProject}
                  handleDeleteProject={handleDeleteProject}
                  handleSelectProject={handleSelectProject}
                  maxProjectsTooltip={maxProjectsTooltip}
                  projects={projects}
                  setEditingProjectId={setEditingProjectId}
                  showStaleInputChanges={showStaleInputChanges}
                  skipNameCommitRef={skipNameCommitRef}
                  staleProjectNameTabIds={staleProjectNameTabIds}
                />
              )}

              <InputPanels
                activeProject={activeProject}
                analysisReadOnly={analysisReadOnly}
                guidedFocusSession={guidedFocusSession}
                guidedFocusState={guidedFocusState}
                isOngoingAnalysis={isOngoingAnalysis}
                librarySession={librarySession}
                setProjects={setProjects}
                showValidationFeedback={showValidationFeedback}
                validationInvalidCellKeys={validationInvalidCellKeys}
                visibleStaleChangedCellKeys={visibleStaleChangedCellKeys}
              />
            </div>

            <div
              className={isOngoingAnalysis ? ONGOING_WORKSPACE_RIGHT_CLASS : RESULTS_COLUMN_CLASS}
            >
              <SimulationStrip
                analysisReadOnly={analysisReadOnly}
                currentValidationError={currentValidationError}
                handleRevertInputsToLastSimulation={handleRevertInputsToLastSimulation}
                handleRun={handleRun}
                isOngoingAnalysis={isOngoingAnalysis}
                isRunning={isRunning}
                runErrorKey={runErrorKey}
                setShowStaleInputChanges={setShowStaleInputChanges}
                showStaleInputChanges={showStaleInputChanges}
                showStaleInputNotice={showStaleInputNotice}
                showValidationFeedback={showValidationFeedback}
              />
              <div
                className={
                  isOngoingAnalysis
                    ? ONGOING_RESULTS_CELL_CLASS
                    : cn(
                        "min-w-0 pb-7 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-1 motion-safe:duration-200 motion-reduce:animate-none",
                        RESULTS_ALIGN_WITH_COST_ITEMS_CLASS,
                      )
                }
              >
                <div className="flex min-h-0 min-w-0 flex-col gap-6">
                  {focusView !== "results" &&
                  (projectResults.length > 0 ||
                    ongoingCompactResult ||
                    (isOngoingAnalysis &&
                      librarySession.ongoingDraftResult &&
                      librarySession.docMeta?.id === librarySession.ongoingDraftResult.analysisId &&
                      librarySession.activeCheckpoint?.id ===
                        librarySession.ongoingDraftResult.checkpointId) ||
                    singleArchivedCompact ||
                    singleDraftCompact ||
                    librarySession.singleDraftResult) ? (
                    <ResultsPanel
                      projects={projects}
                      activeProjectId={activeProjectId}
                      projectResults={projectResults}
                      simulatedBaseCostByProjectId={simulatedBaseCostByProjectId}
                      lastSimulatedInputSignature={lastSimulatedInputSignature}
                      lastSimulatedProjects={lastSimulatedProjects}
                      simulationRunIdByProjectId={simulationRunIdByProjectId}
                      simulationCount={runs}
                      pdfExportBlockedStaleInputs={showStaleInputNotice}
                      analysisArchivedView={analysisReadOnly}
                      archivedSnapshot={
                        librarySession.archivedSnapshot &&
                        !isOngoingCheckpointResultSnapshot(librarySession.archivedSnapshot) &&
                        !isSingleArchivedResultSnapshot(librarySession.archivedSnapshot)
                          ? librarySession.archivedSnapshot
                          : null
                      }
                      ongoingCompactResult={
                        ongoingCompactResult ??
                        (isOngoingAnalysis &&
                        librarySession.ongoingDraftResult &&
                        librarySession.docMeta?.id ===
                          librarySession.ongoingDraftResult.analysisId &&
                        librarySession.activeCheckpoint?.id ===
                          librarySession.ongoingDraftResult.checkpointId
                          ? librarySession.ongoingDraftResult
                          : null)
                      }
                      singleArchivedCompact={singleArchivedCompact}
                      singleDraftResult={singleDraftCompact ?? librarySession.singleDraftResult}
                      draftResultSeed={librarySession.draftResultSeed}
                      onContributionReady={
                        isOngoingAnalysis
                          ? librarySession.attachOngoingDraftContribution
                          : librarySession.attachSingleDraftContribution
                      }
                      liveResultPreferences={resultPreferences}
                      replacePreferences={replacePreferences}
                      saveAsDefault={saveAsDefault}
                      resetToDefaults={resetToDefaults}
                      addKeyFigurePercentile={addKeyFigurePercentile}
                      removeKeyFigurePercentile={removeKeyFigurePercentile}
                      addSCurvePercentile={addSCurvePercentile}
                      removeSCurvePercentile={removeSCurvePercentile}
                      onRequestArchiveAndCreateNext={
                        isOngoingAnalysis && librarySession.canArchive
                          ? requestArchiveCheckpoint
                          : undefined
                      }
                      onRequestFinishOngoingAnalysis={
                        librarySession.canCompleteOngoingAnalysis
                          ? requestFinishOngoingAnalysis
                          : undefined
                      }
                      analysisMode={librarySession.analysisMode}
                      ongoingCheckpoints={
                        isOngoingAnalysis ? librarySession.ongoing?.checkpoints : undefined
                      }
                      viewedCheckpointId={
                        isOngoingAnalysis ? librarySession.ongoing?.activeCheckpointId : undefined
                      }
                      analysisName={librarySession.docMeta?.name}
                      ongoingLifecycle={
                        isOngoingAnalysis ? librarySession.ongoing?.lifecycle : undefined
                      }
                      checkpointComparisonResultSource={checkpointComparisonResultSource}
                      onOpenFocusResults={hasViewableResults ? openFocusResults : undefined}
                      focusResultsActive={false}
                    />
                  ) : null}
                </div>
              </div>
            </div>
          </div>
          <div className="mt-auto flex justify-center pt-10 pb-8 text-center" role="contentinfo">
            <span className="block font-sans text-[10px] leading-none text-muted-foreground/70">
              © 2026 {PRODUCT_NAME}
            </span>
          </div>
        </div>
      </div>
      <FocusSession
        activeProject={activeProject}
        activeProjectId={activeProjectId}
        addKeyFigurePercentile={addKeyFigurePercentile}
        addSCurvePercentile={addSCurvePercentile}
        analysisReadOnly={analysisReadOnly}
        checkpointComparisonResultSource={checkpointComparisonResultSource}
        guidedFocusSession={guidedFocusSession}
        guidedFocusState={guidedFocusState}
        handleRevertInputsToLastSimulation={handleRevertInputsToLastSimulation}
        hasViewableResults={hasViewableResults}
        isOngoingAnalysis={isOngoingAnalysis}
        lastSimulatedInputSignature={lastSimulatedInputSignature}
        lastSimulatedProjects={lastSimulatedProjects}
        librarySession={librarySession}
        ongoingCompactResult={ongoingCompactResult}
        projectResults={projectResults}
        projects={projects}
        removeKeyFigurePercentile={removeKeyFigurePercentile}
        removeSCurvePercentile={removeSCurvePercentile}
        replacePreferences={replacePreferences}
        requestArchiveCheckpoint={requestArchiveCheckpoint}
        requestFinishOngoingAnalysis={requestFinishOngoingAnalysis}
        resetToDefaults={resetToDefaults}
        resultPreferences={resultPreferences}
        runs={runs}
        saveAsDefault={saveAsDefault}
        showStaleInputNotice={showStaleInputNotice}
        simulatedBaseCostByProjectId={simulatedBaseCostByProjectId}
        simulationRunIdByProjectId={simulationRunIdByProjectId}
        singleArchivedCompact={singleArchivedCompact}
        singleDraftCompact={singleDraftCompact}
      />
    </div>
  )
}
