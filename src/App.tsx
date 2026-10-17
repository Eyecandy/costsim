import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  type ReactNode,
  useRef,
  useState,
  type SetStateAction,
} from "react"
import SimulationWorker from "./simulation.worker.ts?worker"
import type {
  ProjectResult,
  SimulationWorkerResult,
} from "./simulation.worker"

import { AnalysisActionsMenu } from "@/components/AnalysisActionsMenu"
import { AddAlternativeDialog } from "@/components/AddAlternativeDialog"
import {
  AnalysisSidebar,
  AnalysisSidebarMenuButton,
} from "@/components/AnalysisSidebar"
import { BrandWordmark } from "@/components/BrandWordmark"
import { CheckpointNav } from "@/components/CheckpointNav"
import { CreateNextCheckpointDialog } from "@/components/CreateNextCheckpointDialog"
import { StartOngoingFromArchiveDialog } from "@/components/StartOngoingFromArchiveDialog"
import { CostTable } from "@/components/CostTable"
import { GlobalHeaderUtilities } from "@/components/GlobalHeaderUtilities"
import { ProjectProfileSection } from "@/components/ProjectProfileSection"
import { SaveAndContinueLaterDialog } from "@/components/SaveAndContinueLaterDialog"
import { DriversTable } from "@/components/DriversTable"
import { GuidedInputDialog } from "@/components/GuidedInputDialog"
import type { GuidedInputDialogHandle } from "@/components/GuidedInputDialog"
import { GuidedPhaseInfo } from "@/components/GuidedPhaseInfo"
import { FocusModeShell } from "@/components/FocusModeShell"
import type { FocusModeShellHandle } from "@/components/FocusModeShell"
import { FocusPhaseNav } from "@/components/FocusPhaseNav"
import { ResultsPanel } from "@/components/ResultsPanel"
import { ResultPreferencesPanel } from "@/components/ResultPreferencesPanel"
import { SectionExpander } from "@/components/SectionExpander"
import { Button, buttonVariants } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { buildSimulationProjectPayload } from "@/lib/buildSimulationProjectPayload"
import {
  CORRELATION_SAVE_CONFIRM_MS,
  deriveSavedCorrelationSummaries,
} from "@/lib/costCorrelationSummaries"
import { createSimulationRunIdsForProjects } from "@/lib/simulationRunId"
import {
  buildSimulationInputSignature,
  staleComparableProjects,
} from "@/lib/simulationInputSignature"
import { simulationConfig } from "@/lib/simulationConfig"
import {
  getLiveResultValidity,
  type LiveSimulationState,
} from "@/lib/liveSimulationState"
import type { ArchiveBlockReason } from "@/lib/buildArchivedAnalysisSnapshot"
import type { GuidedInputKind } from "@/lib/guidedInput"
import type { GuidedResumeAfter, GuidedResumeState } from "@/lib/guidedWorkflow"
import type { GuidedFocusChromeMeta } from "@/lib/guidedFocusChrome"
import {
  buildFocusResultSteps,
  focusResultSectionTitleKey,
  type FocusResultSectionId,
} from "@/lib/focusResultSteps"
import {
  canFocusNavigateNextResults,
  resolveFocusNext,
  resolveFocusPrevious,
} from "@/lib/focusSessionNavigation"
import {
  advanceFurthestFocusPhase,
  getFocusUserPhase,
  isFocusPhaseReached,
  shouldShowFocusPhaseNav,
  type FocusUserPhase,
  type FocusUserPhaseInput,
} from "@/lib/focusPhaseNav"
import {
  clearFocusSessionResume,
  focusSessionResumeMatchesContext,
  readFocusSessionResume,
  resolveFocusResultStepIndexForResume,
  writeFocusSessionResume,
  type FocusSessionResumeV1,
  type GuidedSemanticResume,
} from "@/lib/focusSessionResume"
import { FOCUS_SESSION_FOOTER_NAV_BUTTON_CLASS } from "@/lib/focusSessionFrame"
import { shouldShowResultSettingsEditor } from "@/lib/resultSettingsPresentation"
import {
  addProjectIfAllowed,
  maxProjectsReached,
  normalizeIncurredCosts,
  patchProjectDriverImpact,
  patchProjectCostCorrelationGroup,
  isCostCorrelationGroupPatchValid,
  getSelectedGroupCorrelationState,
  patchProjectAddAssumption,
  patchProjectUpdateAssumption,
  patchProjectRemoveAssumption,
  patchProjectIncurredCosts,
  patchProjectName,
  patchProjectProfile,
  projectFromTemplateEmptyRows,
  PROJECT_NAME_MAX_LENGTH,
  PROJECT_SLOT_NAMES,
  type Project,
} from "@/lib/project"
import {
  duplicateProject,
  nextCopiedProjectName,
} from "@/lib/cloneAnalysisWorkspace"
import {
  decodeShareV1FromHash,
  decodeShareV2FromSearch,
  decodeShareV2FromHash,
  getShareV2PlaceholderOnce,
  isShareV2Search,
  isShareV2Hash,
  SHARE_QUERY_PARAM,
} from "@/lib/shareLink"
import {
  loadAppInputStateFromStorage,
  parseProjectsPayload,
  saveToStorage,
  STORAGE_KEYS,
} from "@/lib/storage"
import {
  COLUMN_HEADER_BOTTOM_GAP_CLASS,
  PROJECT_PROFILE_FOCUS_ENTRY_CELL_CLASS,
  PROJECT_PROFILE_FOCUS_ROW_CLASS,
} from "@/lib/columnHeaderLayout"
import { cn } from "@/lib/utils"
import { ProjectColorSwatch } from "@/components/ProjectColorSwatch"
import { Archive, Play, Plus, X } from "lucide-react"
import {
  type CostElementRow,
  type DriverRow,
  parseNumberField,
  isMeaningfullyFilledRow,
  invalidCostRowCellKeys,
  invalidDriverRowCellKeys,
  parseCostForSimulation,
  parseDriverForSimulation,
} from "@/lib/tableRows"
import { useI18n } from "@/i18n/useI18n"
import { appFeatures } from "@/config/appVariant"
import { ConfirmDialog } from "@/components/ConfirmDialog"
import { SpotlightLoadingText } from "@/components/SpotlightLoadingText"
import {
  brandPrimaryTextClass,
  brandPrimaryButtonClass,
  PRODUCT_NAME,
} from "@/lib/brand"
import {
  getInitialRestoredSimulationState,
  LAST_SIMULATION_SNAPSHOT_VERSION,
  persistLastSimulationSnapshot,
} from "@/lib/lastSimulationSnapshot"
import {
  changedCostTableCellKeySet,
  changedDriverImpactCellKeySet,
  changedScenarioCellKeySet,
} from "@/lib/simInputSnapshotDiff"
import { navigateTo } from "@/lib/auth"
import {
  buildAnalysisWorkspacePath,
  LIBRARY_PATH,
  readAnalysisIdFromLocation,
} from "@/lib/analysisLibraryRoutes"
import { loadSidebarPinned } from "@/lib/sidebarUiPreferences"
import { useLibraryAnalysisSession } from "@/lib/useLibraryAnalysisSession"
import { canCreateNextCheckpoint } from "@/lib/analysisCheckpoint"
import { canStartOngoingFromArchivedSingle } from "@/lib/createOngoingFromArchivedSingle"
import { useResultPreferences } from "@/lib/useResultPreferences"
import {
  isOngoingCheckpointResultSnapshot,
  type OngoingCheckpointResultSnapshotV1,
} from "@/lib/ongoingCheckpointResultSnapshot"
import type { DraftResultSeedV1 } from "@/lib/draftResultSeed"
import {
  isSingleArchivedResultSnapshot,
  SINGLE_ARCHIVED_RESULT_KIND,
  SINGLE_ARCHIVED_RESULT_SCHEMA_VERSION,
  type SingleAnalysisArchivedSnapshot,
  type SingleArchivedResultSnapshotV1,
} from "@/lib/singleArchivedResultSnapshot"
import type { SingleDraftResultSnapshotV1 } from "@/lib/singleDraftResultSnapshot"
import {
  isAnalysisNameConflictError,
  isAnalysisNameConflictOnMoveError,
} from "@/lib/analysisNameUniqueness"

/** App branding + nav — sticks at viewport top (py-3 + logo line-height ≈ 3.1875rem). */
const APP_HEADER_CLASSNAME = cn(
  "sticky top-0 z-50 min-w-0 shrink-0",
  "bg-background/95 backdrop-blur-sm",
  "mb-[7.84rem] md:mb-[8.96rem]",
)

/** Sticky offset for controls directly below the app header row. */
const STICKY_BELOW_APP_HEADER_CLASS = "top-[3.1875rem]"

/** Sticky strip above project tabs and simulation control (identical layout/stacking). */
const STICKY_CONTROL_STRIP_CLASSNAME = cn(
  "sticky z-40 min-w-0 shrink-0 isolate pt-2",
  STICKY_BELOW_APP_HEADER_CLASS,
  "bg-background",
)

/** Right results column — sticks on md+ while the page scrolls (e.g. long left table). */
const RESULTS_COLUMN_CLASS = cn(
  "flex min-w-0 flex-col gap-0 md:sticky md:z-30 md:self-start md:bg-background",
  STICKY_BELOW_APP_HEADER_CLASS,
)

/** Bottom breathing room under Single Analysis tabs (mirrors simulation notice zone). */
const STICKY_CONTROL_STRIP_BOTTOM_PAD_CLASS =
  "pb-[calc(0.6375rem+4.25rem)]"

/**
 * Project Profile sits in the left column only (Single Analysis). Modest top
 * gap under the tabs (`mt-4`), space below (`mb-5`), and mirror the closed
 * block height onto Results (md+) so Cost Items and the Results card tops
 * align. Collapsed profile ≈ title + one summary line (~2.5rem including
 * line boxes). Primary Focus mode sits on this same row.
 */
const PROJECT_PROFILE_SECTION_SPACING_CLASS = "mt-4 mb-5"
const RESULTS_ALIGN_WITH_COST_ITEMS_CLASS =
  "md:pt-[calc(1rem+2.5rem+1.25rem)]"

/**
 * Ongoing Analysis (md+): three shared grid rows. Sticky timeline and simulation
 * strips are their own grid items (via `md:contents` wrappers), so the sticky
 * containing block is the tall workspace grid — they stay sticky through Cost
 * Items, Drivers, and Results. Cost Items and Results share row 3.
 *
 * Row 1: checkpoint timeline | simulation strip (both sticky)
 * Row 2: Project Profile     | (empty)
 * Row 3: Cost Items/Drivers  | Results
 *
 * Shared `md:gap-y-7` is the single desktop spacing between rows (modest room
 * under both sticky controls and before Cost Items / Results). Mobile keeps
 * stacked left/right columns via non-contents flex wrappers.
 *
 * Row 1 height is set by the taller simulation strip (button + notice zone).
 * Both sticky cells use `md:self-stretch` so they share that same effective
 * height — equal sticky bottom gutter without extra pad or negative margins.
 */
const ONGOING_WORKSPACE_LAYOUT_CLASS = cn(
  "grid grid-cols-1 gap-8 md:grid-cols-2 md:grid-rows-[auto_auto_auto] md:items-start md:gap-x-8 md:gap-y-7",
)
const ONGOING_WORKSPACE_LEFT_CLASS = "flex min-w-0 flex-col gap-6 md:contents"
const ONGOING_WORKSPACE_RIGHT_CLASS = "flex min-w-0 flex-col gap-0 md:contents"
/** Sticky timeline cell — stretch to shared row-1 height (simulation side). */
const ONGOING_TIMELINE_CELL_CLASS = cn(
  STICKY_CONTROL_STRIP_CLASSNAME,
  "min-w-0 md:col-start-1 md:row-start-1 md:self-stretch",
)
const ONGOING_PROJECT_PROFILE_CELL_CLASS =
  "min-w-0 md:col-start-1 md:row-start-2"
const ONGOING_COST_CELL_CLASS =
  "min-w-0 pb-7 md:col-start-1 md:row-start-3"
/** Sticky simulation cell — same stretch so both controls share row height. */
const ONGOING_SIMULATION_CELL_CLASS = cn(
  STICKY_CONTROL_STRIP_CLASSNAME,
  "min-w-0 md:col-start-2 md:row-start-1 md:self-stretch",
)
const ONGOING_RESULTS_CELL_CLASS = cn(
  "min-w-0 pb-7 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-1 motion-safe:duration-200 motion-reduce:animate-none",
  "md:col-start-2 md:row-start-3",
)

/** Padded zone under run button; inline notices render inside this area. */
const SIMULATION_NOTICE_ZONE_CLASS = cn(
  "mt-[0.1125rem] flex min-h-[calc(0.6375rem+4.25rem)] shrink-0 flex-col gap-1",
)

const SIMULATION_NOTICE_TEXT_CLASS =
  "font-sans text-xs leading-snug text-muted-foreground"

/** Text tint for the color word in validation notices (aligned with invalid cell highlights). */
const NOTICE_WORD_RED_CLASS = "text-[#c24141]"
/** Accent tint for the “green/grønne” word when changed fields are shown (matches changed-cell accent). */
const NOTICE_WORD_GREEN_CLASS = "text-[#1d868c]"

/** Project tab: name differs from last simulation snapshot (matches changed-cell tint). */
const STALE_PROJECT_TAB_BG_CLASS = "bg-[rgba(29,134,140,0.05)]"

/** Primary Focus mode entry beside Project Profile (~75% across on md+). */
function PrimaryFocusModeEntry({ onClick }: { onClick: () => void }) {
  const { t } = useI18n()
  return (
    <div className={PROJECT_PROFILE_FOCUS_ENTRY_CELL_CLASS}>
      <button
        type="button"
        data-focus-mode-primary-entry=""
        onClick={onClick}
        className={buttonVariants({
          variant: "outline",
          size: "sm",
          className:
            "h-7 gap-1.5 px-2.5 text-[12px] font-medium text-muted-foreground hover:text-foreground",
        })}
        aria-label={t("inputs.guidedFocusMode")}
        title={t("inputs.guidedFocusMode")}
      >
        <Play
          className={cn("size-3.5 fill-current", brandPrimaryTextClass)}
          aria-hidden
        />
        {t("inputs.guidedFocusMode")}
      </button>
    </div>
  )
}

function noticeWithColorWord(
  text: string,
  word: string,
  wordClassName: string,
): ReactNode {
  const index = text.indexOf(word)
  if (index === -1) return text
  return (
    <>
      {text.slice(0, index)}
      <span className={wordClassName}>{word}</span>
      {text.slice(index + word.length)}
    </>
  )
}

const EMPTY_STALE_CELL_KEYS: ReadonlySet<string> = new Set()
const VALIDATION_ERROR_KEYS = [
  "projects.invalidInputForRun",
  "projects.emptyCostBasisForRun",
] as const
type ValidationErrorKey = (typeof VALIDATION_ERROR_KEYS)[number]
type RunErrorKey = ValidationErrorKey | "projects.workerError"

function patchProjectCostRows(
  projects: Project[],
  projectId: string,
  updater: SetStateAction<CostElementRow[]>,
): Project[] {
  return projects.map((p) => {
    if (p.id !== projectId) return p
    const costRows = typeof updater === "function" ? updater(p.costRows) : updater
    return { ...p, costRows }
  })
}

function patchProjectDriverRows(
  projects: Project[],
  projectId: string,
  updater: SetStateAction<DriverRow[]>,
): Project[] {
  return projects.map((p) => {
    if (p.id !== projectId) return p
    const driverRows =
      typeof updater === "function" ? updater(p.driverRows) : updater
    return { ...p, driverRows }
  })
}

function baseCostSumForProject(project: Project): number | null {
  let sum = normalizeIncurredCosts(project.incurredCosts)
  let hasAny = sum > 0
  for (const row of project.costRows) {
    const value = parseNumberField(row.likely)
    if (value !== null) {
      sum += value
      hasAny = true
    }
  }
  return hasAny ? sum : null
}

function projectHasMeaningfulTableInput(project: Project): boolean {
  if (normalizeIncurredCosts(project.incurredCosts) > 0) return true
  return (
    project.costRows.some(isMeaningfullyFilledRow) ||
    project.driverRows.some(isMeaningfullyFilledRow)
  )
}

function runValidationErrorKey(projects: readonly Project[]): ValidationErrorKey | null {
  const hasIncompleteStartedCosts = projects.some((proj) =>
    proj.costRows.some(
      (row) => isMeaningfullyFilledRow(row) && parseCostForSimulation(row) === null,
    ),
  )
  const hasIncompleteStartedDrivers = projects.some((proj) =>
    proj.driverRows.some(
      (row) => isMeaningfullyFilledRow(row) && parseDriverForSimulation(row) === null,
    ),
  )
  const anyProjectWithoutCosts = projects.some((proj) =>
    proj.costRows.every((row) => parseCostForSimulation(row) === null),
  )
  if (hasIncompleteStartedCosts || hasIncompleteStartedDrivers) {
    return "projects.invalidInputForRun"
  }
  if (anyProjectWithoutCosts) {
    return "projects.emptyCostBasisForRun"
  }
  return null
}

export default function App() {
  const { language, t } = useI18n()
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

  const [projectResults, setProjectResults] = useState<ProjectResult[]>(() =>
    getInitialRestoredSimulationState().projectResults,
  )
  const [ongoingCompactResult, setOngoingCompactResult] =
    useState<OngoingCheckpointResultSnapshotV1 | null>(null)
  const [singleArchivedCompact, setSingleArchivedCompact] =
    useState<SingleArchivedResultSnapshotV1 | null>(null)
  const [singleDraftCompact, setSingleDraftCompact] =
    useState<SingleDraftResultSnapshotV1 | null>(null)
  const [simulatedBaseCostByProjectId, setSimulatedBaseCostByProjectId] = useState<
    Record<string, number | null>
  >(() => getInitialRestoredSimulationState().simulatedBaseCostByProjectId)
  const [lastSimulatedInputSignature, setLastSimulatedInputSignature] = useState(
    () => getInitialRestoredSimulationState().lastSimulatedInputSignature,
  )
  const [lastSimulatedProjects, setLastSimulatedProjects] = useState<Project[]>(
    () => {
      const sig = getInitialRestoredSimulationState().lastSimulatedInputSignature
      if (!sig) return []
      try {
        return parseProjectsPayload(JSON.parse(sig)) ?? []
      } catch {
        return []
      }
    },
  )
  /** Ownership of the live result set (captured at run/seed apply). */
  const [liveSimAnalysisId, setLiveSimAnalysisId] = useState<string | null>(
    null,
  )
  const [liveSimCheckpointId, setLiveSimCheckpointId] = useState<string | null>(
    null,
  )
  const [simulationRunIdByProjectId, setSimulationRunIdByProjectId] = useState<
    Record<string, string>
  >({})
  const [runErrorKey, setRunErrorKey] = useState<RunErrorKey | null>(null)
  /** True after a failed simulate click with invalid/incomplete input; cleared when input is valid. */
  const [validationFeedbackActive, setValidationFeedbackActive] = useState(false)
  const [isRunning, setIsRunning] = useState(false)
  const [runProgress, setRunProgress] = useState(0)
  const [, setSimulationStartTime] = useState<number | null>(
    null,
  )
  const [deleteProjectConfirmOpen, setDeleteProjectConfirmOpen] = useState(false)
  const deleteProjectConfirmTargetRef = useRef<string | null>(null)
  const [addAlternativeOpen, setAddAlternativeOpen] = useState(false)
  const [archiveConfirmOpen, setArchiveConfirmOpen] = useState(false)
  const [finishOngoingConfirmOpen, setFinishOngoingConfirmOpen] =
    useState(false)
  const [deleteCheckpointConfirmOpen, setDeleteCheckpointConfirmOpen] =
    useState(false)
  const [nextCheckpointOpen, setNextCheckpointOpen] = useState(false)
  const [archiveBlockedNotice, setArchiveBlockedNotice] = useState<
    | "no_results"
    | "stale_results"
    | "result_settings_need_rerun"
    | "failed"
    | null
  >(null)
  const archiveBlockedNoticeTimerRef = useRef<ReturnType<
    typeof setTimeout
  > | null>(null)
  const [finishOngoingNotice, setFinishOngoingNotice] = useState<
    "need_archive_checkpoint" | "failed" | null
  >(null)
  const finishOngoingNoticeTimerRef = useRef<ReturnType<
    typeof setTimeout
  > | null>(null)
  const [trashConfirmOpen, setTrashConfirmOpen] = useState(false)
  const [renameOpen, setRenameOpen] = useState(false)
  const [startOngoingDialogOpen, setStartOngoingDialogOpen] = useState(false)
  const [startOngoingAlternatives, setStartOngoingAlternatives] = useState<
    { id: string; name: string }[]
  >([])
  const [startOngoingError, setStartOngoingError] = useState<string | null>(
    null,
  )
  const [renameValue, setRenameValue] = useState("")
  const [renameError, setRenameError] = useState<string | null>(null)
  const [sidebarOpenRequest, setSidebarOpenRequest] = useState(0)
  const [sidebarPinned, setSidebarPinned] = useState(() => loadSidebarPinned())
  const [saveContinueOpen, setSaveContinueOpen] = useState(false)
  const [saveContinueError, setSaveContinueError] = useState<string | null>(
    null,
  )
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
          Object.entries(snap.byProjectId).map(([id, result]) => [
            id,
            result.simulatedBaseCost,
          ]),
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
    setLastSimulatedInputSignature(
      buildSimulationInputSignature(snap.projectsAtArchive),
    )
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
  const applyDraftResultSeed = useCallback((seed: DraftResultSeedV1) => {
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
            activeProjectIdAtRun:
              Object.keys(seed.compactByProjectId)[0] ?? "",
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
  }, [replacePreferences])
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
        snapshot.projectsAtRun
          ? (structuredClone(snapshot.projectsAtRun) as Project[])
          : [],
      )
      setLiveSimAnalysisId(snapshot.analysisId)
      setLiveSimCheckpointId(snapshot.checkpointId)
      setSimulationRunIdByProjectId(
        snapshot.simulationRunIdByProjectId ?? {},
      )
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
        snapshot.projectsAtRun
          ? (structuredClone(snapshot.projectsAtRun) as Project[])
          : [],
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
    ((
      input: import("@/lib/useLibraryAnalysisSession").CommitOngoingDraftResultInput,
    ) => Promise<{ ok: true } | { ok: false }>) | null
  >(null)
  const commitSingleDraftResultRef = useRef<
    ((
      input: import("@/lib/useLibraryAnalysisSession").CommitSingleDraftResultInput,
    ) => Promise<{ ok: true } | { ok: false }>) | null
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

  const showArchiveBlockedNotice = useCallback(
    (reason: ArchiveBlockReason) => {
      // Only true absence of results → "run simulation". Never use that copy for
      // ownership, lifecycle, or persistence failures.
      if (reason === "no_results") {
        setArchiveBlockedNotice("no_results")
      } else if (reason === "result_settings_need_rerun") {
        setArchiveBlockedNotice("result_settings_need_rerun")
      } else if (
        reason === "persistence_failed" ||
        reason === "not_draft" ||
        reason === "not_ongoing"
      ) {
        setArchiveBlockedNotice("failed")
      } else {
        setArchiveBlockedNotice("stale_results")
      }
      if (archiveBlockedNoticeTimerRef.current) {
        clearTimeout(archiveBlockedNoticeTimerRef.current)
      }
      archiveBlockedNoticeTimerRef.current = setTimeout(() => {
        setArchiveBlockedNotice(null)
        archiveBlockedNoticeTimerRef.current = null
      }, 4500)
    },
    [],
  )

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
  }, [librarySession, showArchiveBlockedNotice])

  const showFinishOngoingNotice = useCallback(
    (kind: "need_archive_checkpoint" | "failed") => {
      setFinishOngoingNotice(kind)
      if (finishOngoingNoticeTimerRef.current) {
        clearTimeout(finishOngoingNoticeTimerRef.current)
      }
      finishOngoingNoticeTimerRef.current = setTimeout(() => {
        setFinishOngoingNotice(null)
        finishOngoingNoticeTimerRef.current = null
      }, 4500)
    },
    [],
  )

  const requestFinishOngoingAnalysis = useCallback(() => {
    if (!librarySession.canCompleteOngoingAnalysis) return
    const reason = librarySession.getCompleteOngoingAnalysisBlockReason()
    if (
      reason === "has_draft" ||
      reason === "latest_not_archived"
    ) {
      showFinishOngoingNotice("need_archive_checkpoint")
      return
    }
    if (reason) {
      showFinishOngoingNotice("failed")
      return
    }
    setFinishOngoingConfirmOpen(true)
  }, [librarySession, showFinishOngoingNotice])

  const [impactModeActive, setImpactModeActive] = useState(false)
  const [impactSelectedDriverId, setImpactSelectedDriverId] = useState<
    string | null
  >(null)
  const [correlationModeActive, setCorrelationModeActive] = useState(false)
  const [defineModeActive, setDefineModeActive] = useState(false)
  const [defineSelectedRowId, setDefineSelectedRowId] = useState<string | null>(
    null,
  )
  const [guidedInputKind, setGuidedInputKind] = useState<GuidedInputKind | null>(
    null,
  )
  const [guidedInputStartIndex, setGuidedInputStartIndex] = useState(0)
  /**
   * Primary Focus entry lands on the Focus-mode intro; local Input shortcuts
   * keep their own starting phase (null).
   */
  const [guidedStartPhase, setGuidedStartPhase] = useState<"focusIntro" | null>(
    null,
  )
  /** UI-only pause/resume after Adjust correlation/impact (not persisted). */
  const [guidedResume, setGuidedResume] = useState<GuidedResumeState | null>(
    null,
  )
  /** Phase to land on when reopening Guided Input after a detour. */
  const [guidedResumePhase, setGuidedResumePhase] = useState<
    GuidedResumeAfter | null
  >(null)
  const [correlationSelectedCostIds, setCorrelationSelectedCostIds] = useState<
    string[]
  >([])
  const [correlationPendingRho, setCorrelationPendingRho] = useState(0)
  const [correlationPendingMixed, setCorrelationPendingMixed] = useState(false)
  const [correlationEditBlocked, setCorrelationEditBlocked] = useState(false)
  const [correlationSaveConfirmVisible, setCorrelationSaveConfirmVisible] =
    useState(false)
  const [correlationFeedbackKind, setCorrelationFeedbackKind] = useState<
    "saved" | "removed" | null
  >(null)
  const correlationSaveConfirmTimerRef = useRef<ReturnType<
    typeof setTimeout
  > | null>(null)
  const impactEditingAreaRef = useRef<HTMLDivElement>(null)
  /**
   * Presentation-only: when stale, optionally reveal existing green changed-field
   * highlighting. Never persisted; resets when stale notice clears.
   */
  const [showStaleInputChanges, setShowStaleInputChanges] = useState(false)
  /**
   * Presentation-only Focus surface: Guided Focus Input and/or Focus Results.
   * Never persisted.
   */
  const [focusView, setFocusView] = useState<"input" | "results" | null>(null)
  const focusViewRef = useRef<"input" | "results" | null>(null)
  focusViewRef.current = focusView
  /** Ephemeral Focus Results step index (not persisted). */
  const [focusResultStepIndex, setFocusResultStepIndex] = useState(0)
  /** Furthest Focus phase reached this session (navigation history only). */
  const [furthestReachedFocusPhase, setFurthestReachedFocusPhase] =
    useState<FocusUserPhase | null>(null)
  /** Phase-overview land target when (re)opening Guided Input. */
  const [guidedLandFocusPhase, setGuidedLandFocusPhase] =
    useState<FocusUserPhaseInput | null>(null)
  /** Session reload land: Guided phase + optional row id. */
  const [guidedSemanticResume, setGuidedSemanticResume] =
    useState<GuidedSemanticResume | null>(null)
  /** When Guided Simulation invokes Run, open Focus Results on success. */
  const pendingFocusResultsAfterGuidedRunRef = useRef(false)
  /** Ensures Focus sessionStorage restore runs once after library hydration. */
  const didAttemptFocusSessionResumeRef = useRef(false)
  const prevFocusViewForResumeClearRef = useRef<"input" | "results" | null>(
    null,
  )
  /** Stable Focus host — owns browser fullscreen across Input → Results. */
  const focusShellRef = useRef<FocusModeShellHandle | null>(null)
  /** Guided Input step navigation for the unified Focus session. */
  const guidedDialogRef = useRef<GuidedInputDialogHandle | null>(null)
  const [focusPortalTarget, setFocusPortalTarget] = useState<HTMLElement | null>(
    null,
  )
  const [guidedFocusChromeMeta, setGuidedFocusChromeMeta] =
    useState<GuidedFocusChromeMeta | null>(null)
  const handleGuidedFocusChromeMeta = useCallback(
    (meta: GuidedFocusChromeMeta | null) => {
      setGuidedFocusChromeMeta((prev) => {
        if (prev === meta) return prev
        if (prev == null || meta == null) return meta
        if (
          prev.title === meta.title &&
          prev.progressLabel === meta.progressLabel &&
          prev.projectName === meta.projectName &&
          prev.projectIndex === meta.projectIndex &&
          prev.workflowPhase === meta.workflowPhase &&
          prev.workflowRowId === meta.workflowRowId &&
          prev.helpTopic === meta.helpTopic &&
          prev.canGoPrevious === meta.canGoPrevious &&
          prev.canGoNext === meta.canGoNext &&
          prev.nextLabel === meta.nextLabel &&
          JSON.stringify(prev.secondaryFooter) ===
            JSON.stringify(meta.secondaryFooter)
        ) {
          return prev
        }
        return meta
      })
    },
    [],
  )

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
      window.history.replaceState(
        null,
        "",
        `${url.pathname}${nextSearch ? `?${nextSearch}` : ""}`,
      )
    })()
    return () => {
      cancelled = true
    }
  }, [])

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

  const atMaxProjects = maxProjectsReached(projects, appFeatures.maxProjects)
  const maxProjectsTooltip = t("projects.maxProjectsTooltip").replace(
    "{max}",
    String(appFeatures.maxProjects),
  )
  const activeProject =
    projects.find((p) => p.id === activeProjectId) ?? projects[0] ?? null

  const impactSelectedDriverRow = useMemo(() => {
    if (
      !impactModeActive ||
      !activeProject ||
      impactSelectedDriverId === null
    ) {
      return null
    }
    const index = activeProject.driverRows.findIndex(
      (r) => r.id === impactSelectedDriverId,
    )
    if (index < 0) return null
    const row = activeProject.driverRows[index]!
    if (parseDriverForSimulation(row) === null) return null
    return {
      row,
      label: row.name.trim() || `Driver ${index + 1}`,
    }
  }, [impactModeActive, activeProject, impactSelectedDriverId])

  const syncCorrelationPendingFromSelection = useCallback(
    (selectedIds: readonly string[], correlations: Project["costCorrelations"]) => {
      const state = getSelectedGroupCorrelationState(correlations, selectedIds)
      if (state.kind === "uniform") {
        setCorrelationPendingRho(state.value)
        setCorrelationPendingMixed(false)
      } else if (state.kind === "mixed") {
        setCorrelationPendingRho(0)
        setCorrelationPendingMixed(true)
      } else {
        setCorrelationPendingRho(0)
        setCorrelationPendingMixed(false)
      }
    },
    [],
  )

  const clearCorrelationSaveConfirm = useCallback(() => {
    if (correlationSaveConfirmTimerRef.current !== null) {
      clearTimeout(correlationSaveConfirmTimerRef.current)
      correlationSaveConfirmTimerRef.current = null
    }
    setCorrelationSaveConfirmVisible(false)
    setCorrelationFeedbackKind(null)
  }, [])

  const flashCorrelationFeedback = useCallback(
    (kind: "saved" | "removed") => {
      clearCorrelationSaveConfirm()
      setCorrelationFeedbackKind(kind)
      setCorrelationSaveConfirmVisible(true)
      correlationSaveConfirmTimerRef.current = setTimeout(() => {
        correlationSaveConfirmTimerRef.current = null
        setCorrelationSaveConfirmVisible(false)
        setCorrelationFeedbackKind(null)
      }, CORRELATION_SAVE_CONFIRM_MS)
    },
    [clearCorrelationSaveConfirm],
  )

  const clearCorrelationEditingState = useCallback(() => {
    setCorrelationSelectedCostIds([])
    setCorrelationPendingRho(0)
    setCorrelationPendingMixed(false)
    setCorrelationEditBlocked(false)
  }, [])

  useEffect(() => {
    return () => {
      if (correlationSaveConfirmTimerRef.current !== null) {
        clearTimeout(correlationSaveConfirmTimerRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (!impactModeActive) setImpactSelectedDriverId(null)
  }, [impactModeActive])

  useEffect(() => {
    if (!defineModeActive) setDefineSelectedRowId(null)
  }, [defineModeActive])

  useEffect(() => {
    if (!correlationModeActive) {
      clearCorrelationEditingState()
      clearCorrelationSaveConfirm()
    }
  }, [
    correlationModeActive,
    clearCorrelationEditingState,
    clearCorrelationSaveConfirm,
  ])

  useEffect(() => {
    setImpactSelectedDriverId(null)
    setDefineSelectedRowId(null)
    setGuidedInputKind(null)
    setGuidedResume(null)
    setGuidedResumePhase(null)
    clearCorrelationEditingState()
    clearCorrelationSaveConfirm()
  }, [
    activeProjectId,
    clearCorrelationEditingState,
    clearCorrelationSaveConfirm,
  ])

  /** Clear Guided/Impact/Correlation/Define when viewing an archived analysis. */
  useEffect(() => {
    if (!analysisReadOnly) return
    setImpactModeActive(false)
    setImpactSelectedDriverId(null)
    setCorrelationModeActive(false)
    setDefineModeActive(false)
    setDefineSelectedRowId(null)
    setGuidedInputKind(null)
    setGuidedResume(null)
    setGuidedResumePhase(null)
    clearCorrelationEditingState()
    clearCorrelationSaveConfirm()
  }, [
    analysisReadOnly,
    clearCorrelationEditingState,
    clearCorrelationSaveConfirm,
  ])

  const clearStoredFocusSessionResume = useCallback(() => {
    const analysisId = librarySession.analysisId
    if (analysisId) clearFocusSessionResume(analysisId)
  }, [librarySession.analysisId])

  const closeGuidedInput = useCallback(() => {
    setGuidedInputKind(null)
    setGuidedStartPhase(null)
    setGuidedResumePhase(null)
    setGuidedSemanticResume(null)
    // Closing Guided Input abandons any pending detour resume.
    setGuidedResume(null)
    setFocusView((prev) => {
      if (prev === "input") {
        clearStoredFocusSessionResume()
        return null
      }
      return prev
    })
  }, [clearStoredFocusSessionResume])

  const openGuidedInput = useCallback((
    kind: GuidedInputKind,
    startIndex = 0,
    options?: { startPhase?: "focusIntro" | null },
  ) => {
    if (analysisReadOnly) return
    setGuidedStartPhase(options?.startPhase ?? null)
    setImpactModeActive(false)
    setImpactSelectedDriverId(null)
    setCorrelationModeActive(false)
    setDefineModeActive(false)
    setDefineSelectedRowId(null)
    clearCorrelationEditingState()
    clearCorrelationSaveConfirm()
    setGuidedResume(null)
    setGuidedResumePhase(null)
    setGuidedInputStartIndex(startIndex)
    setGuidedInputKind(kind)
    // Enter shared Focus session immediately so Input uses the shell-owned
    // lightweight footer from the first paint (same as after Results round-trip).
    // Standalone Guided modal (heavy Next) is not used for normal Input opens.
    setFocusView("input")
  }, [analysisReadOnly, clearCorrelationEditingState, clearCorrelationSaveConfirm])

  /**
   * Primary Focus mode entry (INPUT column header). Starts at the Focus-mode
   * intro, ahead of Project profile and the rest of the guided sequence.
   */
  const openFocusModePrimary = useCallback(() => {
    if (analysisReadOnly) return
    openGuidedInput("cost", 0, { startPhase: "focusIntro" })
  }, [analysisReadOnly, openGuidedInput])

  /** Guided handoff: pause for Cost Items table editing; keep resume context. */
  const handoffGuidedToAddCostItems = useCallback(() => {
    if (!activeProject || !guidedInputKind) return
    setGuidedResume({
      after: "costItems",
      entry: guidedInputKind,
      projectId: activeProject.id,
    })
    setGuidedResumePhase(null)
    setGuidedInputKind(null)
    setFocusView((prev) => (prev === "input" ? null : prev))
    setImpactModeActive(false)
    setImpactSelectedDriverId(null)
    setDefineModeActive(false)
    setDefineSelectedRowId(null)
    clearCorrelationEditingState()
    clearCorrelationSaveConfirm()
    setCorrelationModeActive(false)
  }, [
    activeProject,
    guidedInputKind,
    clearCorrelationEditingState,
    clearCorrelationSaveConfirm,
  ])

  /** Guided handoff: pause for Drivers table editing; keep resume context. */
  const handoffGuidedToAddDrivers = useCallback(() => {
    if (!activeProject || !guidedInputKind) return
    setGuidedResume({
      after: "drivers",
      entry: guidedInputKind,
      projectId: activeProject.id,
    })
    setGuidedResumePhase(null)
    setGuidedInputKind(null)
    setFocusView((prev) => (prev === "input" ? null : prev))
    setCorrelationModeActive(false)
    setDefineModeActive(false)
    setDefineSelectedRowId(null)
    clearCorrelationEditingState()
    clearCorrelationSaveConfirm()
    setImpactSelectedDriverId(null)
    setImpactModeActive(false)
  }, [
    activeProject,
    guidedInputKind,
    clearCorrelationEditingState,
    clearCorrelationSaveConfirm,
  ])

  /** Guided handoff: pause for Correlation editing; keep resume context. */
  const handoffGuidedToCorrelation = useCallback(() => {
    if (!activeProject || !guidedInputKind) return
    setGuidedResume({
      after: "correlation",
      entry: guidedInputKind,
      projectId: activeProject.id,
    })
    setGuidedResumePhase(null)
    setGuidedInputKind(null)
    setFocusView((prev) => (prev === "input" ? null : prev))
    setImpactModeActive(false)
    setImpactSelectedDriverId(null)
    setDefineModeActive(false)
    setDefineSelectedRowId(null)
    clearCorrelationEditingState()
    clearCorrelationSaveConfirm()
    setCorrelationModeActive(true)
  }, [
    activeProject,
    guidedInputKind,
    clearCorrelationEditingState,
    clearCorrelationSaveConfirm,
  ])

  /** Guided handoff: pause for Driver Impact editing; keep resume context. */
  const handoffGuidedToImpact = useCallback(() => {
    if (!activeProject || !guidedInputKind) return
    setGuidedResume({
      after: "impact",
      entry: guidedInputKind,
      projectId: activeProject.id,
    })
    setGuidedResumePhase(null)
    setGuidedInputKind(null)
    setFocusView((prev) => (prev === "input" ? null : prev))
    setCorrelationModeActive(false)
    setDefineModeActive(false)
    setDefineSelectedRowId(null)
    clearCorrelationEditingState()
    clearCorrelationSaveConfirm()
    setImpactSelectedDriverId(null)
    setImpactModeActive(true)
  }, [
    activeProject,
    guidedInputKind,
    clearCorrelationEditingState,
    clearCorrelationSaveConfirm,
  ])

  /** Explicit return from Correlation/Impact detour into Guided Input. */
  const returnToGuidedReview = useCallback(() => {
    if (!guidedResume || !activeProjectId) {
      setGuidedResume(null)
      return
    }
    if (guidedResume.projectId !== activeProjectId) {
      setGuidedResume(null)
      return
    }
    const { after, entry } = guidedResume
    setCorrelationModeActive(false)
    setImpactModeActive(false)
    setImpactSelectedDriverId(null)
    setDefineModeActive(false)
    setDefineSelectedRowId(null)
    clearCorrelationEditingState()
    clearCorrelationSaveConfirm()
    // Keep guidedResume until Guided Input has applied the target step, then
    // clear via onResumeApplied. Clearing phase too early resets to page 1.
    setGuidedResumePhase(after)
    setGuidedInputStartIndex(0)
    setGuidedInputKind(entry)
    // Resume into shared Focus Input chrome (lightweight footer), not the
    // standalone Guided modal.
    setFocusView("input")
  }, [
    guidedResume,
    activeProjectId,
    clearCorrelationEditingState,
    clearCorrelationSaveConfirm,
  ])

  const handleGuidedResumeApplied = useCallback(() => {
    setGuidedResume(null)
    setGuidedResumePhase(null)
  }, [])

  const handleGuidedLandFocusPhaseApplied = useCallback(() => {
    setGuidedLandFocusPhase(null)
  }, [])

  const handleGuidedSemanticResumeApplied = useCallback(() => {
    setGuidedSemanticResume(null)
  }, [])

  const handleImpactModeToggle = () => {
    // Allowed when archived for inspection; mutation handlers stay guarded.
    setImpactModeActive((prev) => {
      const next = !prev
      if (next) {
        // Direct toolbar open — not a guided detour.
        setGuidedResume(null)
        setGuidedResumePhase(null)
        setCorrelationModeActive(false)
        setDefineModeActive(false)
        setDefineSelectedRowId(null)
        setGuidedInputKind(null)
        clearCorrelationEditingState()
        clearCorrelationSaveConfirm()
      } else {
        setImpactSelectedDriverId(null)
        // Closing Impact via toolbar abandons impact resume.
        setGuidedResume((r) => (r?.after === "impact" ? null : r))
      }
      return next
    })
  }

  const handleCorrelationModeToggle = () => {
    // Allowed when archived for inspection; mutation handlers stay guarded.
    setCorrelationModeActive((prev) => {
      const next = !prev
      if (next) {
        // Direct toolbar open — not a guided detour.
        setGuidedResume(null)
        setGuidedResumePhase(null)
        setImpactModeActive(false)
        setImpactSelectedDriverId(null)
        setDefineModeActive(false)
        setDefineSelectedRowId(null)
        setGuidedInputKind(null)
        clearCorrelationEditingState()
        clearCorrelationSaveConfirm()
      } else {
        clearCorrelationEditingState()
        clearCorrelationSaveConfirm()
        // Closing Correlation via toolbar abandons correlation resume.
        setGuidedResume((r) => (r?.after === "correlation" ? null : r))
      }
      return next
    })
  }

  const handleDefineModeToggle = () => {
    // Allowed when archived for inspection; save path stays guarded.
    setDefineModeActive((prev) => {
      const next = !prev
      if (next) {
        setGuidedResume(null)
        setGuidedResumePhase(null)
        setImpactModeActive(false)
        setImpactSelectedDriverId(null)
        setCorrelationModeActive(false)
        setGuidedInputKind(null)
        clearCorrelationEditingState()
        clearCorrelationSaveConfirm()
      } else {
        setDefineSelectedRowId(null)
      }
      return next
    })
  }

  /** Outside-click exit for Impact, Correlation, and Define (does not abandon guided resume). */
  const deactivateEditingModes = useCallback(() => {
    setImpactModeActive(false)
    setCorrelationModeActive(false)
    setDefineModeActive(false)
  }, [])

  useEffect(() => {
    if (!impactModeActive && !correlationModeActive && !defineModeActive) return
    const onDocMouseDown = (event: MouseEvent) => {
      const target = event.target
      if (!(target instanceof Node)) return
      if (impactEditingAreaRef.current?.contains(target)) return
      const portal = document.getElementById("portal")
      if (portal?.contains(target)) return
      deactivateEditingModes()
    }
    document.addEventListener("mousedown", onDocMouseDown)
    return () => document.removeEventListener("mousedown", onDocMouseDown)
  }, [
    impactModeActive,
    correlationModeActive,
    defineModeActive,
    deactivateEditingModes,
  ])

  const validSimCostRows = useMemo(() => {
    if (!activeProject) return []
    return activeProject.costRows.filter(
      (row) => parseCostForSimulation(row) !== null,
    )
  }, [activeProject])

  useEffect(() => {
    if (!correlationModeActive || !activeProject) return
    const validIds = new Set(
      activeProject.costRows
        .filter((row) => parseCostForSimulation(row) !== null)
        .map((row) => row.id),
    )
    setCorrelationSelectedCostIds((prev) => {
      const next = prev.filter((id) => validIds.has(id))
      if (next.length === prev.length && next.every((id, i) => id === prev[i])) {
        return prev
      }
      syncCorrelationPendingFromSelection(next, activeProject.costCorrelations)
      return next
    })
  }, [
    correlationModeActive,
    activeProject,
    syncCorrelationPendingFromSelection,
  ])

  const handleToggleCorrelationCost = useCallback(
    (costRowId: string) => {
      if (!correlationModeActive || !activeProject) return
      if (
        activeProject.costRows.find((r) => r.id === costRowId) === undefined
      ) {
        return
      }
      if (
        parseCostForSimulation(
          activeProject.costRows.find((r) => r.id === costRowId)!,
        ) === null
      ) {
        return
      }
      setCorrelationSelectedCostIds((prev) => {
        const next = prev.includes(costRowId)
          ? prev.filter((id) => id !== costRowId)
          : [...prev, costRowId]
        syncCorrelationPendingFromSelection(
          next,
          activeProject.costCorrelations,
        )
        setCorrelationEditBlocked(false)
        return next
      })
    },
    [
      correlationModeActive,
      activeProject,
      syncCorrelationPendingFromSelection,
    ],
  )

  const handleCorrelationPendingChange = useCallback((value: number) => {
    setCorrelationPendingRho(value)
    setCorrelationPendingMixed(false)
    setCorrelationEditBlocked(false)
  }, [])

  const handleOpenCorrelationSummary = useCallback(
    (rowIds: readonly string[]) => {
      if (!correlationModeActive || !activeProject) return
      const validIds = new Set(
        activeProject.costRows
          .filter((row) => parseCostForSimulation(row) !== null)
          .map((row) => row.id),
      )
      const next = rowIds.filter((id) => validIds.has(id))
      if (next.length < 2) return
      setCorrelationSelectedCostIds(next)
      syncCorrelationPendingFromSelection(next, activeProject.costCorrelations)
      setCorrelationEditBlocked(false)
      clearCorrelationSaveConfirm()
    },
    [
      correlationModeActive,
      activeProject,
      syncCorrelationPendingFromSelection,
      clearCorrelationSaveConfirm,
    ],
  )

  const handleRemoveCorrelationSummary = useCallback(
    (rowIds: readonly string[]) => {
      if (analysisReadOnly) return
      if (!correlationModeActive || !activeProject) return
      if (rowIds.length < 2) return
      if (
        !isCostCorrelationGroupPatchValid(
          validSimCostRows,
          activeProject.costCorrelations,
          rowIds,
          "0",
        )
      ) {
        setCorrelationEditBlocked(true)
        return
      }
      setCorrelationEditBlocked(false)
      setProjects((prev) =>
        patchProjectCostCorrelationGroup(
          prev,
          activeProject.id,
          rowIds,
          "0",
        ),
      )
      clearCorrelationEditingState()
      flashCorrelationFeedback("removed")
    },
    [
      analysisReadOnly,
      correlationModeActive,
      activeProject,
      validSimCostRows,
      clearCorrelationEditingState,
      flashCorrelationFeedback,
    ],
  )

  const handleCostCorrelationGroupApply = useCallback(() => {
    if (analysisReadOnly) return
    if (!activeProject) return
    if (correlationSelectedCostIds.length < 2) return
    if (correlationPendingMixed) return
    const raw = String(correlationPendingRho)
    if (
      !isCostCorrelationGroupPatchValid(
        validSimCostRows,
        activeProject.costCorrelations,
        correlationSelectedCostIds,
        raw,
      )
    ) {
      setCorrelationEditBlocked(true)
      return
    }
    setCorrelationEditBlocked(false)
    setProjects((prev) =>
      patchProjectCostCorrelationGroup(
        prev,
        activeProject.id,
        correlationSelectedCostIds,
        raw,
      ),
    )
    clearCorrelationEditingState()
    flashCorrelationFeedback("saved")
  }, [
    analysisReadOnly,
    activeProject,
    correlationSelectedCostIds,
    correlationPendingRho,
    correlationPendingMixed,
    validSimCostRows,
    clearCorrelationEditingState,
    flashCorrelationFeedback,
  ])

  const savedCorrelationSummaries = useMemo(() => {
    if (!correlationModeActive || !activeProject) return []
    return deriveSavedCorrelationSummaries(
      validSimCostRows,
      activeProject.costCorrelations,
    )
  }, [correlationModeActive, activeProject, validSimCostRows])

  const activeCostCorrelationPrep = useMemo(() => {
    if (!activeProject) return undefined
    return projectResults.find((r) => r.projectId === activeProject.id)
      ?.costCorrelationPrep
  }, [activeProject, projectResults])

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
  const authoritativeOngoingCompact =
    isOngoingAnalysis
      ? (ongoingCompactResult ?? librarySession.ongoingDraftResult)
      : null
  const authoritativeSingleDraft =
    !isOngoingAnalysis
      ? (singleDraftCompact ?? librarySession.singleDraftResult)
      : null
  const liveResultValidity = getLiveResultValidity({
    analysisId: librarySession.docMeta?.id ?? null,
    checkpointId: isOngoingAnalysis
      ? librarySession.activeCheckpoint?.id ?? null
      : null,
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

  const showValidationFeedback =
    validationFeedbackActive && currentValidationError !== null

  const hasMeaningfulStaleComparableInput =
    staleComparableProjects(projects).length > 0

  const showStaleInputNotice =
    liveResultValidity.kind === "stale" && hasMeaningfulStaleComparableInput

  const hasViewableResults =
    liveResultValidity.kind === "valid" || liveResultValidity.kind === "stale"

  const currentFocusUserPhase = useMemo(
    () =>
      getFocusUserPhase({
        focusView,
        guidedWorkflowPhase: guidedFocusChromeMeta?.workflowPhase,
      }),
    [focusView, guidedFocusChromeMeta?.workflowPhase],
  )

  // Monotonic session unlock from canonical current phase (not validity).
  // Clearing on focusView === null resets history for a new Focus session.
  useLayoutEffect(() => {
    if (focusView === null) {
      setFurthestReachedFocusPhase(null)
      setGuidedLandFocusPhase(null)
      return
    }
    setFurthestReachedFocusPhase((prev) =>
      advanceFurthestFocusPhase(prev, currentFocusUserPhase),
    )
  }, [focusView, currentFocusUserPhase])

  const navigateToFocusUserPhase = useCallback(
    (phase: FocusUserPhase) => {
      const allowed =
        isFocusPhaseReached(phase, furthestReachedFocusPhase) ||
        phase === currentFocusUserPhase
      if (!allowed) return

      if (phase === "results") {
        if (!hasViewableResults) return
        setFocusResultStepIndex(0)
        setFocusView("results")
        return
      }

      setFocusView("input")
      if (!guidedInputKind && !analysisReadOnly) {
        setGuidedLandFocusPhase(phase)
        openGuidedInput("cost")
        return
      }
      setGuidedLandFocusPhase(phase)
      guidedDialogRef.current?.goToFocusUserPhase(phase)
    },
    [
      furthestReachedFocusPhase,
      currentFocusUserPhase,
      hasViewableResults,
      guidedInputKind,
      analysisReadOnly,
      openGuidedInput,
    ],
  )

  /** Exit the entire Focus session (Input + Results). Never lands on Focus Input. */
  const exitFocusMode = useCallback(() => {
    focusShellRef.current?.exitFullscreen()
    clearStoredFocusSessionResume()
    setFocusView(null)
    setFocusResultStepIndex(0)
    setFurthestReachedFocusPhase(null)
    setGuidedLandFocusPhase(null)
    setGuidedSemanticResume(null)
    setGuidedResumePhase(null)
    setGuidedResume(null)
    setGuidedInputKind(null)
  }, [clearStoredFocusSessionResume])

  const openFocusResults = useCallback(() => {
    if (!hasViewableResults) return
    setFocusResultStepIndex(0)
    setFocusView("results")
  }, [hasViewableResults])

  const continueFromSimulationToResults = useCallback(() => {
    if (!hasViewableResults) return
    setFocusResultStepIndex(0)
    setFocusView("results")
  }, [hasViewableResults])

  /**
   * Cross Results → Input at Simulation (first-class Focus step).
   * Always land on Simulation — never skip to Impact / prior Input steps.
   */
  const backToFocusInput = useCallback(() => {
    setFocusView("input")
    if (!guidedInputKind && !analysisReadOnly) {
      openGuidedInput("cost")
    }
    // Belt-and-suspenders: resume effect + imperative handle.
    setGuidedResumePhase("simulation")
    guidedDialogRef.current?.goToSimulation()
  }, [guidedInputKind, analysisReadOnly, openGuidedInput])

  /**
   * Stale "Show changes": enable existing green highlighting, exit Focus,
   * and return to the normal app Input view (not Focus Input).
   */
  const handleFocusShowChanges = useCallback(() => {
    setShowStaleInputChanges(true)
    focusShellRef.current?.exitFullscreen()
    clearStoredFocusSessionResume()
    setFocusView(null)
    setFocusResultStepIndex(0)
    setFurthestReachedFocusPhase(null)
    setGuidedLandFocusPhase(null)
    setGuidedSemanticResume(null)
    setGuidedResumePhase(null)
    setGuidedResume(null)
    setGuidedInputKind(null)
  }, [clearStoredFocusSessionResume])

  /** Next Steps: exit Focus to normal Input without enabling green highlighting. */
  const handleFocusReviewInput = useCallback(() => {
    focusShellRef.current?.exitFullscreen()
    clearStoredFocusSessionResume()
    setFocusView(null)
    setFocusResultStepIndex(0)
    setFurthestReachedFocusPhase(null)
    setGuidedLandFocusPhase(null)
    setGuidedSemanticResume(null)
    setGuidedResumePhase(null)
    setGuidedResume(null)
    setGuidedInputKind(null)
  }, [clearStoredFocusSessionResume])

  useLayoutEffect(() => {
    // Keep the Focus content portal target for the whole Focus session
    // (Input and Results). Clearing it on Results caused Guided to briefly
    // remount as a standalone Focus overlay when returning to Input.
    if (focusView === null) {
      setFocusPortalTarget(null)
      return
    }
    const sync = () => {
      setFocusPortalTarget(
        focusShellRef.current?.getContentElement() ?? null,
      )
    }
    sync()
    const id = window.requestAnimationFrame(sync)
    return () => window.cancelAnimationFrame(id)
  }, [focusView, guidedInputKind])

  useEffect(() => {
    if (!showStaleInputNotice) {
      setShowStaleInputChanges(false)
    }
  }, [showStaleInputNotice])

  /** Stable identity for Ongoing comparison / Development tip — not prefs/UI. */
  const checkpointComparisonResultSource = useMemo(() => {
    if (
      !isOngoingAnalysis ||
      (projectResults.length === 0 && !ongoingCompactResult)
    ) {
      return null
    }
    return {
      projectResults,
      simulatedBaseCostByProjectId,
      ...(ongoingCompactResult ? { compact: ongoingCompactResult } : {}),
      resultsComparable:
        analysisReadOnly ||
        (ongoingCompactResult
          ? buildSimulationInputSignature(projects) ===
            ongoingCompactResult.inputSignature
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

  const focusResultSteps = useMemo(
    () =>
      buildFocusResultSteps({
        includeDevelopment: Boolean(
          isOngoingAnalysis &&
            librarySession.ongoing?.checkpoints &&
            librarySession.ongoing.checkpoints.length > 0,
        ),
        includeContribution: appFeatures.showExpectedAddition,
      }),
    [
      isOngoingAnalysis,
      librarySession.ongoing?.checkpoints,
    ],
  )

  const focusResultSection: FocusResultSectionId | null =
    focusView === "results" && hasViewableResults
      ? (focusResultSteps[
          Math.min(
            Math.max(0, focusResultStepIndex),
            Math.max(0, focusResultSteps.length - 1),
          )
        ] ?? focusResultSteps[0] ?? null)
      : null

  // Clear sessionStorage when Focus fully exits (not Input ↔ Results).
  useEffect(() => {
    const prev = prevFocusViewForResumeClearRef.current
    prevFocusViewForResumeClearRef.current = focusView
    if (prev !== null && focusView === null) {
      clearStoredFocusSessionResume()
    }
  }, [focusView, clearStoredFocusSessionResume])

  // Persist semantic Focus location for same-tab reload resume.
  useEffect(() => {
    if (!librarySession.ready) return
    const analysisId = librarySession.analysisId
    if (!analysisId || focusView === null) return
    if (!activeProjectId) return

    const checkpointId = isOngoingAnalysis
      ? (librarySession.activeCheckpoint?.id ?? null)
      : null

    const base: FocusSessionResumeV1 = {
      v: 1,
      analysisId,
      projectId: activeProjectId,
      checkpointId,
      focusView,
      ...(furthestReachedFocusPhase
        ? { furthestReachedPhase: furthestReachedFocusPhase }
        : {}),
    }

    if (focusView === "input") {
      const phase = guidedFocusChromeMeta?.workflowPhase
      if (!phase) return
      writeFocusSessionResume({
        ...base,
        guidedPhase: phase,
        ...(guidedFocusChromeMeta.workflowRowId
          ? { guidedRowId: guidedFocusChromeMeta.workflowRowId }
          : {}),
      })
      return
    }

    if (focusView === "results" && focusResultSection) {
      writeFocusSessionResume({
        ...base,
        resultSectionId: focusResultSection,
      })
    }
  }, [
    librarySession.ready,
    librarySession.analysisId,
    librarySession.activeCheckpoint?.id,
    isOngoingAnalysis,
    focusView,
    activeProjectId,
    furthestReachedFocusPhase,
    guidedFocusChromeMeta?.workflowPhase,
    guidedFocusChromeMeta?.workflowRowId,
    focusResultSection,
  ])

  // Restore Focus after library hydration (once per page load).
  useEffect(() => {
    if (!librarySession.ready) return
    if (didAttemptFocusSessionResumeRef.current) return
    didAttemptFocusSessionResumeRef.current = true

    const analysisId = librarySession.analysisId
    if (!analysisId || !activeProjectId) return

    const stored = readFocusSessionResume(analysisId)
    if (!stored) return

    const checkpointId = isOngoingAnalysis
      ? (librarySession.activeCheckpoint?.id ?? null)
      : null
    if (
      !focusSessionResumeMatchesContext(stored, {
        analysisId,
        projectId: activeProjectId,
        checkpointId,
        isOngoing: isOngoingAnalysis,
      })
    ) {
      clearFocusSessionResume(analysisId)
      return
    }

    if (stored.furthestReachedPhase) {
      setFurthestReachedFocusPhase(stored.furthestReachedPhase)
    }

    let view = stored.focusView
    let guidedPhase = stored.guidedPhase
    let guidedRowId = stored.guidedRowId

    if (view === "results" && !hasViewableResults) {
      view = "input"
      guidedPhase = "simulation"
      guidedRowId = undefined
    }

    if (view === "results") {
      setFocusResultStepIndex(
        resolveFocusResultStepIndexForResume(
          focusResultSteps,
          stored.resultSectionId,
        ),
      )
      setFocusView("results")
      return
    }

    if (analysisReadOnly) {
      clearFocusSessionResume(analysisId)
      return
    }

    setGuidedSemanticResume(
      guidedPhase
        ? {
            phase: guidedPhase,
            ...(guidedRowId ? { rowId: guidedRowId } : {}),
          }
        : { phase: "assumptions" },
    )
    setGuidedStartPhase(guidedPhase === "focusIntro" ? "focusIntro" : null)
    setGuidedInputStartIndex(0)
    setGuidedInputKind("cost")
    setFocusView("input")
  }, [
    librarySession.ready,
    librarySession.analysisId,
    librarySession.activeCheckpoint?.id,
    isOngoingAnalysis,
    activeProjectId,
    hasViewableResults,
    analysisReadOnly,
    focusResultSteps,
  ])

  /** One Previous action for the whole Focus session (buttons + arrows). */
  const navigateFocusPrevious = useCallback(() => {
    if (focusView === "results") {
      const action = resolveFocusPrevious({
        focusView: "results",
        focusResultStepIndex,
      })
      if (action.kind === "enterInputFromResults") {
        backToFocusInput()
        return
      }
      if (action.kind === "resultStep") {
        setFocusResultStepIndex(action.index)
      }
      return
    }
    if (focusView === "input") {
      guidedDialogRef.current?.goPrevious()
    }
  }, [focusView, focusResultStepIndex, backToFocusInput])

  /** One Next action for the whole Focus session (buttons + arrows). */
  const navigateFocusNext = useCallback(() => {
    if (focusView === "results") {
      const action = resolveFocusNext({
        focusView: "results",
        focusResultStepIndex,
        resultStepCount: focusResultSteps.length,
        canEnterResults: hasViewableResults,
      })
      if (action.kind === "resultStep") {
        setFocusResultStepIndex(action.index)
      }
      return
    }
    if (focusView === "input") {
      // Guided goNext / Simulation → Results via onContinueToResults.
      guidedDialogRef.current?.goNext()
    }
  }, [
    focusView,
    focusResultStepIndex,
    focusResultSteps.length,
    hasViewableResults,
  ])

  const staleProjectNameTabIds = useMemo(() => {
    const out = new Set<string>()
    if (lastSimulatedProjects.length === 0) {
      return out
    }
    const nameById = new Map(lastSimulatedProjects.map((p) => [p.id, p.name]))
    for (const p of projects) {
      const baseName = nameById.get(p.id)
      if (baseName !== undefined && p.name !== baseName) {
        out.add(p.id)
      }
    }
    return out
  }, [projects, lastSimulatedProjects])

  const staleInputChangedCellKeys = useMemo(() => {
    // Green-cell / Undo baseline is lastSimulatedProjects (including after
    // compact draft reload). Do not require live projectResults arrays.
    if (
      lastSimulatedProjects.length === 0 ||
      liveResultValidity.kind !== "stale"
    ) {
      return {
        cost: EMPTY_STALE_CELL_KEYS,
        drivers: EMPTY_STALE_CELL_KEYS,
        driverImpacts: EMPTY_STALE_CELL_KEYS,
      }
    }
    const baseline = lastSimulatedProjects
    const proj = projects.find((p) => p.id === activeProjectId)
    if (!proj || !projectHasMeaningfulTableInput(proj)) {
      return {
        cost: EMPTY_STALE_CELL_KEYS,
        drivers: EMPTY_STALE_CELL_KEYS,
        driverImpacts: EMPTY_STALE_CELL_KEYS,
      }
    }
    const baseProj = baseline.find((p) => p.id === activeProjectId)
    return {
      cost: changedCostTableCellKeySet(
        { costRows: proj.costRows, incurredCosts: proj.incurredCosts },
        baseProj
          ? { costRows: baseProj.costRows, incurredCosts: baseProj.incurredCosts }
          : undefined,
      ),
      drivers: changedScenarioCellKeySet(proj.driverRows, baseProj?.driverRows),
      driverImpacts: changedDriverImpactCellKeySet(
        {
          driverImpacts: proj.driverImpacts,
          costRows: proj.costRows,
          driverRows: proj.driverRows,
        },
        baseProj
          ? {
              driverImpacts: baseProj.driverImpacts,
              costRows: baseProj.costRows,
              driverRows: baseProj.driverRows,
            }
          : undefined,
      ),
    }
  }, [
    projects,
    activeProjectId,
    lastSimulatedProjects,
    liveResultValidity.kind,
  ])

  /** Presentation gate over existing changed-cell sets (same comparison, opt-in green). */
  const visibleStaleChangedCellKeys = useMemo(() => {
    if (!showStaleInputChanges) {
      return {
        cost: EMPTY_STALE_CELL_KEYS,
        drivers: EMPTY_STALE_CELL_KEYS,
        driverImpacts: EMPTY_STALE_CELL_KEYS,
      }
    }
    return staleInputChangedCellKeys
  }, [showStaleInputChanges, staleInputChangedCellKeys])

  const validationInvalidCellKeys = useMemo(() => {
    const proj = projects.find((p) => p.id === activeProjectId)
    if (!proj) {
      return {
        cost: EMPTY_STALE_CELL_KEYS,
        drivers: EMPTY_STALE_CELL_KEYS,
        driverImpacts: EMPTY_STALE_CELL_KEYS,
      }
    }
    const cost = new Set<string>()
    const drivers = new Set<string>()
    for (const row of proj.costRows) {
      if (isMeaningfullyFilledRow(row) && parseCostForSimulation(row) === null) {
        for (const key of invalidCostRowCellKeys(row)) cost.add(key)
      }
    }
    for (const row of proj.driverRows) {
      if (isMeaningfullyFilledRow(row) && parseDriverForSimulation(row) === null) {
        for (const key of invalidDriverRowCellKeys(row)) drivers.add(key)
      }
    }
    return { cost, drivers }
  }, [projects, activeProjectId])

  const handleRevertInputsToLastSimulation = () => {
    if (analysisReadOnly) return
    if (lastSimulatedProjects.length === 0) return
    const restored = structuredClone(lastSimulatedProjects) as Project[]
    setEditingProjectId(null)
    setProjects(restored)
    setActiveProjectId((prev) =>
      restored.some((p) => p.id === prev) ? prev : restored[0]!.id,
    )
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
      const name =
        slotName ?? `Alternativ ${String.fromCharCode(65 + (prev.length % 26))}`
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
          sidebarPinned
            ? "md:px-5 lg:px-6"
            : "md:pl-14 md:pr-5 lg:pl-14 lg:pr-6",
        )}
      >        <ConfirmDialog
          open={archiveConfirmOpen}
          message={
            isOngoingAnalysis
              ? t("checkpoints.archiveCheckpointConfirm")
              : t("library.archiveConfirm")
          }
          cancelLabel={t("common.cancel")}
          confirmLabel={
            isOngoingAnalysis
              ? t("checkpoints.archiveCheckpointConfirmAction")
              : t("library.archiveConfirmAction")
          }
          onCancel={() => setArchiveConfirmOpen(false)}
          onConfirm={() => {
            setArchiveConfirmOpen(false)
            if (isOngoingAnalysis) {
              void librarySession.archiveActiveCheckpoint().then((result) => {
                if (!result.ok) {
                  showArchiveBlockedNotice(result.reason)
                  return
                }
                // Same post-archive step as Results shortcut: open create-next when allowed.
                if (canCreateNextCheckpoint(result.ongoing)) {
                  setNextCheckpointOpen(true)
                }
              })
              return
            }
            void librarySession.archiveCurrent().then((result) => {
              if (!result.ok) {
                showArchiveBlockedNotice(result.reason)
              }
            })
          }}
        />
        <ConfirmDialog
          open={deleteCheckpointConfirmOpen}
          title={t("checkpoints.deleteCheckpointConfirmTitle")}
          message={t("checkpoints.deleteCheckpointConfirm")}
          cancelLabel={t("common.cancel")}
          confirmLabel={t("checkpoints.deleteCheckpointConfirmAction")}
          confirmVariant="destructive"
          onCancel={() => setDeleteCheckpointConfirmOpen(false)}
          onConfirm={() => {
            setDeleteCheckpointConfirmOpen(false)
            // Checkpoint-only: never moveCurrentToTrash / analysis delete.
            void librarySession.deleteActiveDraftCheckpoint()
          }}
        />
        <ConfirmDialog
          open={finishOngoingConfirmOpen}
          title={t("checkpoints.finishOngoingConfirmTitle")}
          message={t("checkpoints.finishOngoingConfirm")}
          cancelLabel={t("common.cancel")}
          confirmLabel={t("checkpoints.finishOngoingConfirmAction")}
          onCancel={() => setFinishOngoingConfirmOpen(false)}
          onConfirm={() => {
            setFinishOngoingConfirmOpen(false)
            void librarySession.completeOngoingAnalysis().then((result) => {
              if (result.ok) return
              if (
                result.reason === "has_draft" ||
                result.reason === "latest_not_archived"
              ) {
                showFinishOngoingNotice("need_archive_checkpoint")
                return
              }
              showFinishOngoingNotice("failed")
            })
          }}
        />
        <CreateNextCheckpointDialog
          open={nextCheckpointOpen}
          nextSequence={
            (librarySession.latestCheckpoint?.sequence ?? 0) + 1
          }
          sourceSequence={librarySession.latestCheckpoint?.sequence ?? 1}
          sourceName={
            librarySession.latestCheckpoint?.name ??
            t("checkpoints.nextDialogTitle").replace("{n}", "1")
          }
          onCancel={() => setNextCheckpointOpen(false)}
          onCreate={(name) => {
            setNextCheckpointOpen(false)
            void librarySession.createNextCheckpoint(name)
          }}
        />
        <StartOngoingFromArchiveDialog
          open={startOngoingDialogOpen}
          alternatives={startOngoingAlternatives}
          folderId={librarySession.docMeta?.folderId ?? null}
          onCancel={() => {
            setStartOngoingDialogOpen(false)
            setStartOngoingAlternatives([])
          }}
          onConfirm={async (selectedProjectId, name) => {
            setStartOngoingError(null)
            const result =
              await librarySession.beginStartOngoingFromArchived(
                selectedProjectId,
                name,
              )
            if (result.ok) {
              setStartOngoingDialogOpen(false)
              setStartOngoingAlternatives([])
              navigateTo(buildAnalysisWorkspacePath(result.doc.id))
              return
            }
            // Known validation should already be blocked in the dialog; surface unexpected failures.
            throw new Error(result.reason)
          }}
        />
        <ConfirmDialog
          open={trashConfirmOpen}
          title={t("library.deleteConfirmTitle")}
          message={t("library.deleteConfirm")}
          cancelLabel={t("common.cancel")}
          confirmLabel={t("library.deleteConfirmAction")}
          onCancel={() => setTrashConfirmOpen(false)}
          onConfirm={() => {
            setTrashConfirmOpen(false)
            void (async () => {
              await librarySession.moveCurrentToTrash()
              navigateTo(LIBRARY_PATH)
            })()
          }}
        />
        {renameOpen ? (
          <div
            className="fixed inset-0 z-[220] flex items-center justify-center bg-black/40 p-4"
            role="presentation"
            onClick={() => {
              setRenameOpen(false)
              setRenameError(null)
            }}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="rename-analysis-title"
              className="w-full max-w-sm rounded-lg border border-border/60 bg-background p-4 shadow-md"
              onClick={(e) => e.stopPropagation()}
            >
              <h2
                id="rename-analysis-title"
                className="m-0 mb-3 font-sans text-[15px] font-medium"
              >
                {t("library.renameTitle")}
              </h2>
              <input
                autoFocus
                className="mb-2 h-9 w-full rounded-md border border-border bg-background px-2 font-sans text-[13px]"
                value={renameValue}
                onChange={(e) => {
                  setRenameValue(e.target.value)
                  if (renameError) setRenameError(null)
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && renameValue.trim()) {
                    void (async () => {
                      try {
                        await librarySession.renameAnalysis(renameValue)
                        setRenameOpen(false)
                        setRenameError(null)
                      } catch (error) {
                        setRenameError(
                          isAnalysisNameConflictError(error)
                            ? t("library.duplicateNameInFolder")
                            : t("library.saveError"),
                        )
                      }
                    })()
                  }
                }}
              />
              {renameError ? (
                <p
                  className="m-0 mb-3 font-sans text-[12px] text-destructive"
                  role="alert"
                >
                  {renameError}
                </p>
              ) : (
                <div className="mb-3" />
              )}
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  className="h-8 rounded-md px-3 font-sans text-[12px] text-muted-foreground hover:bg-muted"
                  onClick={() => {
                    setRenameOpen(false)
                    setRenameError(null)
                  }}
                >
                  {t("common.cancel")}
                </button>
                <button
                  type="button"
                  className="h-8 rounded-md bg-[#1d868c] px-3 font-sans text-[12px] text-white hover:bg-[#1d868c]/90 disabled:opacity-50"
                  disabled={!renameValue.trim()}
                  onClick={() => {
                    void (async () => {
                      try {
                        await librarySession.renameAnalysis(renameValue)
                        setRenameOpen(false)
                        setRenameError(null)
                      } catch (error) {
                        setRenameError(
                          isAnalysisNameConflictError(error)
                            ? t("library.duplicateNameInFolder")
                            : t("library.saveError"),
                        )
                      }
                    })()
                  }}
                >
                  {t("common.confirm")}
                </button>
              </div>
            </div>
          </div>
        ) : null}
        <SaveAndContinueLaterDialog
          open={saveContinueOpen}
          initialFolderId={librarySession.docMeta?.folderId ?? null}
          error={saveContinueError}
          onCancel={() => {
            setSaveContinueOpen(false)
            setSaveContinueError(null)
          }}
          onConfirm={async (folderId) => {
            setSaveContinueError(null)
            try {
              if (librarySession.docMeta?.status === "draft") {
                await librarySession.setFolderId(folderId)
                await librarySession.flushPendingSave().catch(() => undefined)
              }
              setSaveContinueOpen(false)
              setSaveContinueError(null)
              navigateTo(LIBRARY_PATH)
            } catch (error) {
              if (
                isAnalysisNameConflictOnMoveError(error) ||
                isAnalysisNameConflictError(error)
              ) {
                setSaveContinueError(t("library.duplicateNameOnMove"))
              } else {
                setSaveContinueError(t("library.saveError"))
              }
            }
          }}
        />
        <ConfirmDialog
          open={deleteProjectConfirmOpen}
          message={t("projects.confirmDelete")}
          cancelLabel={t("common.cancel")}
          confirmLabel={t("common.confirm")}
          onCancel={() => {
            deleteProjectConfirmTargetRef.current = null
            setDeleteProjectConfirmOpen(false)
          }}
          onConfirm={confirmDeleteProject}
        />
        <AddAlternativeDialog
          open={addAlternativeOpen}
          sources={projects.map((p) => ({ id: p.id, name: p.name }))}
          onClose={() => setAddAlternativeOpen(false)}
          onCreateBlank={handleCreateBlankAlternative}
          onCopyExisting={handleCopyExistingAlternative}
        />
        {activeProject && guidedInputKind && !analysisReadOnly ? (
          <GuidedInputDialog
            ref={guidedDialogRef}
            open
            suspend={focusView === "results"}
            ensureFocusMode={focusView === "input"}
            focusPortalTarget={
              focusView !== null ? focusPortalTarget : null
            }
            onFocusChromeMetaChange={handleGuidedFocusChromeMeta}
            onRequestFocusFullscreen={() => {
              focusShellRef.current?.requestFullscreen()
            }}
            onExitFocusFullscreen={() => {
              focusShellRef.current?.exitFullscreen()
            }}
            entry={guidedInputKind}
            project={activeProject}
            projectIndex={Math.max(
              0,
              projects.findIndex((p) => p.id === activeProject.id),
            )}
            startIndex={guidedInputStartIndex}
            startPhase={guidedStartPhase}
            resumePhase={guidedResumePhase}
            onResumeApplied={handleGuidedResumeApplied}
            resumeFocusUserPhase={guidedLandFocusPhase}
            onResumeFocusUserPhaseApplied={handleGuidedLandFocusPhaseApplied}
            resumeSemanticStep={guidedSemanticResume}
            onResumeSemanticStepApplied={handleGuidedSemanticResumeApplied}
            onClose={closeGuidedInput}
            onFocusModeChange={(active) => {
              if (active) setFocusView("input")
              else setFocusView((prev) => (prev === "input" ? null : prev))
            }}
            onRunSimulation={() => {
              pendingFocusResultsAfterGuidedRunRef.current = true
              handleRun()
              if (!runningRef.current) {
                pendingFocusResultsAfterGuidedRunRef.current = false
              }
            }}
            runSimulationDisabled={analysisReadOnly || isRunning}
            runSimulationBusy={isRunning}
            simulationResultStatus={
              liveResultValidity.kind === "valid"
                ? "valid"
                : liveResultValidity.kind === "stale"
                  ? "stale"
                  : "none"
            }
            onContinueToResults={continueFromSimulationToResults}
            onShowStaleChanges={handleFocusShowChanges}
            onRevertStaleChanges={handleRevertInputsToLastSimulation}
            showStaleInputChanges={showStaleInputChanges}
            onPatchRow={(rowId, patch) => {
              if (analysisReadOnly) return
              const inCost = activeProject.costRows.some((r) => r.id === rowId)
              if (inCost) {
                setProjects((prev) =>
                  patchProjectCostRows(prev, activeProject.id, (rows) =>
                    rows.map((row) =>
                      row.id === rowId ? { ...row, ...patch } : row,
                    ),
                  ),
                )
                return
              }
              setProjects((prev) =>
                patchProjectDriverRows(prev, activeProject.id, (rows) =>
                  rows.map((row) => {
                    if (row.id !== rowId) return row
                    const next = { ...row, ...patch }
                    if (
                      Object.prototype.hasOwnProperty.call(
                        patch,
                        "uncertaintyNotes",
                      ) &&
                      patch.uncertaintyNotes === undefined
                    ) {
                      delete next.uncertaintyNotes
                    }
                    return next
                  }),
                ),
              )
            }}
            onAddAssumption={(text) => {
              if (analysisReadOnly) return
              setProjects((prev) =>
                patchProjectAddAssumption(prev, activeProject.id, text),
              )
            }}
            onUpdateAssumption={(assumptionId, text) => {
              if (analysisReadOnly) return
              setProjects((prev) =>
                patchProjectUpdateAssumption(
                  prev,
                  activeProject.id,
                  assumptionId,
                  text,
                ),
              )
            }}
            onRemoveAssumption={(assumptionId) => {
              if (analysisReadOnly) return
              setProjects((prev) =>
                patchProjectRemoveAssumption(
                  prev,
                  activeProject.id,
                  assumptionId,
                ),
              )
            }}
            onIncurredCostsChange={(value) => {
              if (analysisReadOnly) return
              setProjects((prev) =>
                patchProjectIncurredCosts(prev, activeProject.id, value),
              )
            }}
            onPatchProfile={(next) => {
              if (analysisReadOnly) return
              setProjects((prev) =>
                patchProjectProfile(prev, activeProject.id, next),
              )
            }}
            onAddCostItems={handoffGuidedToAddCostItems}
            onAddDrivers={handoffGuidedToAddDrivers}
            onAdjustCorrelation={handoffGuidedToCorrelation}
            onAdjustImpact={handoffGuidedToImpact}
          />
        ) : null}
        <div className={APP_HEADER_CLASSNAME}>
          <div className="relative flex min-w-0 items-center justify-between py-3">
            <div className="z-10 flex min-w-0 items-center gap-2">
              <AnalysisSidebarMenuButton
                className="md:hidden"
                onOpen={() => setSidebarOpenRequest((n) => n + 1)}
              />
              <BrandWordmark
                as="button"
                aria-label={t("library.goToHome")}
                title={t("library.goToHome")}
                onClick={() => {
                  void (async () => {
                    if (
                      !librarySession.readOnly &&
                      librarySession.docMeta?.status === "draft"
                    ) {
                      await librarySession.flushPendingSave().catch(() => undefined)
                    }
                    navigateTo(LIBRARY_PATH)
                  })()
                }}
              />
            </div>
            {librarySession.docMeta ? (
              <div className="pointer-events-none absolute inset-0 z-[5] flex items-center justify-center px-24 sm:px-36 md:px-44">
                <div className="pointer-events-auto relative flex max-w-full min-w-0 items-center gap-1">
                  <h1
                    className="m-0 max-w-[min(40vw,20rem)] truncate font-sans text-[13px] font-medium tracking-tight text-foreground"
                    title={librarySession.docMeta.name}
                  >
                    {librarySession.docMeta.name}
                  </h1>
                  {analysisReadOnly ? (
                    <span
                      className="inline-flex shrink-0 items-center"
                      title={t("library.readOnlyHint")}
                      aria-label={t("library.readOnlyHint")}
                    >
                      <Archive
                        className="size-3 text-muted-foreground"
                        aria-hidden
                        data-archived-icon=""
                      />
                    </span>
                  ) : null}
                  <AnalysisActionsMenu
                    canSaveAndContinueLater={Boolean(librarySession.docMeta)}
                    canArchive={librarySession.canArchive}
                    archiveLabel={
                      isOngoingAnalysis
                        ? t("checkpoints.archiveCheckpointAction")
                        : undefined
                    }
                    finishOngoingLabel={
                      librarySession.canCompleteOngoingAnalysis
                        ? t("checkpoints.finishOngoingAction")
                        : null
                    }
                    onFinishOngoing={
                      librarySession.canCompleteOngoingAnalysis
                        ? requestFinishOngoingAnalysis
                        : undefined
                    }
                    deleteCheckpointLabel={
                      librarySession.canDeleteActiveDraftCheckpoint
                        ? t("checkpoints.deleteCheckpointAction")
                        : null
                    }
                    onDeleteCheckpoint={
                      librarySession.canDeleteActiveDraftCheckpoint
                        ? () => setDeleteCheckpointConfirmOpen(true)
                        : undefined
                    }
                    canRename={Boolean(librarySession.docMeta)}
                    canMoveToTrash={Boolean(librarySession.docMeta)}
                    onSaveAndContinueLater={() => {
                      if (analysisReadOnly) {
                        navigateTo(LIBRARY_PATH)
                        return
                      }
                      if (librarySession.docMeta?.folderId) {
                        void (async () => {
                          await librarySession.flushPendingSave().catch(
                            () => undefined,
                          )
                          navigateTo(LIBRARY_PATH)
                        })()
                        return
                      }
                      setSaveContinueOpen(true)
                    }}
                    onArchive={requestArchiveCheckpoint}
                    onRename={() => {
                      setRenameError(null)
                      setRenameValue(librarySession.docMeta?.name ?? "")
                      setRenameOpen(true)
                    }}
                    onMoveToTrash={() => setTrashConfirmOpen(true)}
                    createNewVersionLabel={
                      librarySession.docMeta?.status === "archived"
                        ? t("library.createNewVersion")
                        : null
                    }
                    onCreateNewVersion={
                      librarySession.docMeta?.status === "archived"
                        ? () => {
                            void librarySession
                              .createNewVersion(t("library.versionSuffix"))
                              .then((draft) => {
                                if (draft) {
                                  navigateTo(
                                    buildAnalysisWorkspacePath(draft.id),
                                  )
                                }
                              })
                          }
                        : undefined
                    }
                    startOngoingLabel={
                      librarySession.docMeta &&
                      canStartOngoingFromArchivedSingle({
                        status: librarySession.docMeta.status,
                        analysisMode: librarySession.docMeta.analysisMode,
                        deletedAt: null,
                      })
                        ? t("library.startOngoingAnalysis")
                        : null
                    }
                    onStartOngoing={
                      librarySession.docMeta &&
                      canStartOngoingFromArchivedSingle({
                        status: librarySession.docMeta.status,
                        analysisMode: librarySession.docMeta.analysisMode,
                        deletedAt: null,
                      })
                        ? () => {
                            setStartOngoingError(null)
                            void librarySession
                              .beginStartOngoingFromArchived()
                              .then((result) => {
                                if (result.ok) {
                                  // Defensive: create path always requires dialog confirmation.
                                  navigateTo(
                                    buildAnalysisWorkspacePath(result.doc.id),
                                  )
                                  return
                                }
                                if (
                                  result.reason === "need_selection" &&
                                  result.projects?.length
                                ) {
                                  setStartOngoingAlternatives(result.projects)
                                  setStartOngoingDialogOpen(true)
                                  return
                                }
                                setStartOngoingError(result.reason)
                              })
                              .catch(() => {
                                setStartOngoingError("create_failed")
                              })
                          }
                        : undefined
                    }
                  />
                  {startOngoingError ? (
                    <p
                      className="absolute left-0 top-full mt-1 max-w-[18rem] font-sans text-[10px] leading-snug text-destructive"
                      role="alert"
                    >
                      {t("library.startOngoingFailed")}
                    </p>
                  ) : null}
                  {archiveBlockedNotice ? (
                    <p
                      className="absolute left-0 top-full mt-1 max-w-[18rem] font-sans text-[10px] leading-snug text-muted-foreground"
                      role="status"
                      aria-live="polite"
                    >
                      {archiveBlockedNotice === "no_results"
                        ? t("library.archiveNeedsSimulation")
                        : archiveBlockedNotice === "failed"
                          ? t("library.archiveFailed")
                          : archiveBlockedNotice === "result_settings_need_rerun"
                            ? t("library.archiveNeedsResultSettingsRerun")
                            : t("library.archiveNeedsRerun")}
                    </p>
                  ) : null}
                  {finishOngoingNotice ? (
                    <p
                      className="absolute left-0 top-full mt-1 max-w-[18rem] font-sans text-[10px] leading-snug text-muted-foreground"
                      role="status"
                      aria-live="polite"
                    >
                      {finishOngoingNotice === "need_archive_checkpoint"
                        ? t("checkpoints.finishOngoingNeedArchiveCheckpoint")
                        : t("checkpoints.finishOngoingFailed")}
                    </p>
                  ) : null}
                  <span
                    className="pointer-events-none absolute left-full top-1/2 ml-2 inline-flex min-w-[4.25rem] -translate-y-1/2 font-sans text-[10px] text-muted-foreground"
                    aria-live="polite"
                  >
                    {librarySession.saveStatus === "saving"
                      ? t("library.saving")
                      : librarySession.saveStatus === "saved"
                        ? t("library.saved")
                        : librarySession.saveStatus === "error_quota"
                          ? t("library.saveErrorQuota")
                          : librarySession.saveStatus === "error"
                            ? t("library.saveError")
                            : "\u00a0"}
                  </span>
                </div>
              </div>
            ) : null}
            <GlobalHeaderUtilities
              className="z-10"
              onBeforeSignOut={handleBeforeSignOut}
            />
          </div>
        </div>
        <div
          data-analysis-workspace-layout={
            isOngoingAnalysis ? "ongoing" : "single"
          }
          className={
            isOngoingAnalysis
              ? ONGOING_WORKSPACE_LAYOUT_CLASS
              : "grid grid-cols-1 gap-8 md:grid-cols-2 md:items-start"
          }
        >
          <div
            className={
              isOngoingAnalysis
                ? ONGOING_WORKSPACE_LEFT_CLASS
                : "flex min-w-0 flex-col gap-0"
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
                      librarySession.atCheckpointLimit &&
                      !librarySession.canCreateNextCheckpoint
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
                                  patchProjectProfile(
                                    prev,
                                    activeProject.id,
                                    next,
                                  ),
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
            <div
              className={cn(
                STICKY_CONTROL_STRIP_CLASSNAME,
                STICKY_CONTROL_STRIP_BOTTOM_PAD_CLASS,
              )}
              role="region"
              aria-label={t("projects.tabsRegion")}
            >
              <p
                className={cn(
                  "m-0 font-sans text-[10px] font-normal italic tracking-wide text-muted-foreground/55",
                  COLUMN_HEADER_BOTTOM_GAP_CLASS,
                )}
              >
                {t("projects.inputColumnLabel")}
              </p>
              <div
                role="tablist"
                aria-label={t("projects.selectProjectTablist")}
                className="flex w-full min-w-0 flex-nowrap items-end gap-1 border-b-[1.5px] border-[#1d868c]"
              >
                {projects.map((project, projectIndex) => {
                  const isActive = project.id === activeProjectId
                  const isEditing =
                    !analysisReadOnly && editingProjectId === project.id
                  const canDeleteProject =
                    !analysisReadOnly && projects.length > 1
                  const hasStaleName =
                    showStaleInputChanges &&
                    staleProjectNameTabIds.has(project.id)
                  return (
                    <div
                      key={project.id}
                      id={`tab-${project.id}`}
                      role="tab"
                      aria-selected={isActive}
                      aria-controls={`panel-${project.id}`}
                      tabIndex={isActive ? 0 : -1}
                      onClick={() => handleSelectProject(project.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault()
                          handleSelectProject(project.id)
                        }
                      }}
                      className={cn(
                        "group/tab flex h-8 min-w-0 cursor-pointer items-center gap-1 rounded-t-lg pl-3 pr-1 font-sans text-xs font-semibold tracking-wide normal-case outline-none transition-[color,background-color,box-shadow,border-color] duration-200",
                        projects.length === 1 ? "shrink-0" : "flex-1",
                        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                        isActive
                          ? cn(
                              "relative z-[1] -mb-[1.5px] border-x-[1.5px] border-t-[1.5px] border-[#1d868c] border-b-[1.5px] border-b-card text-foreground",
                              hasStaleName ? STALE_PROJECT_TAB_BG_CLASS : "bg-card",
                            )
                          : cn(
                              "border border-transparent border-b-0 text-muted-foreground hover:text-foreground",
                              hasStaleName
                                ? cn(
                                    STALE_PROJECT_TAB_BG_CLASS,
                                    "hover:bg-[rgba(29,134,140,0.08)]",
                                  )
                                : "bg-card hover:bg-muted",
                            ),
                      )}
                    >
                      <div
                        className={cn(
                          "flex min-w-0 flex-1 items-center gap-1.5",
                          projects.length > 1 && "overflow-hidden",
                        )}
                      >
                        <ProjectColorSwatch projectIndex={projectIndex} />
                        {isEditing ? (
                          <Input
                            aria-label={t("projects.projectNameInputLabel")}
                            autoFocus
                            defaultValue={project.name}
                            maxLength={PROJECT_NAME_MAX_LENGTH}
                            className={cn(
                              "h-7 text-sm",
                              projects.length === 1
                                ? "w-full max-w-[min(12rem,40vw)]"
                                : "w-full min-w-0 max-w-full",
                            )}
                            onClick={(e) => e.stopPropagation()}
                            onKeyDown={(e) => {
                              e.stopPropagation()
                              if (e.key === "Escape") {
                                skipNameCommitRef.current = true
                                setEditingProjectId(null)
                                e.preventDefault()
                              }
                              if (e.key === "Enter") {
                                e.preventDefault()
                                e.currentTarget.blur()
                              }
                            }}
                            onBlur={(e) => {
                              if (skipNameCommitRef.current) {
                                skipNameCommitRef.current = false
                                return
                              }
                              commitProjectName(
                                project.id,
                                e.target.value,
                                project.name,
                              )
                            }}
                          />
                        ) : (
                          <span
                            className={cn(
                              "block min-w-0 truncate",
                              projects.length === 1
                                ? "max-w-[min(12rem,40vw)]"
                                : "w-full",
                            )}
                            title={`${project.name} ${t("projects.projectNameTitleHintSuffix")}`}
                            onDoubleClick={(e) => {
                              e.stopPropagation()
                              if (analysisReadOnly) return
                              handleSelectProject(project.id)
                              setEditingProjectId(project.id)
                            }}
                          >
                            {project.name}
                          </span>
                        )}
                      </div>
                      {canDeleteProject ? (
                        <button
                          type="button"
                          aria-label={`${t("projects.deleteProject")} ${project.name}`}
                          title={t("projects.deleteProject")}
                          className={cn(
                            "flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground opacity-0 transition-[opacity,background-color,color] duration-150",
                            "hover:bg-muted hover:text-foreground",
                            "group-hover/tab:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                          )}
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteProject(project.id)
                          }}
                        >
                          <X className="size-3.5" strokeWidth={2.5} aria-hidden />
                        </button>
                      ) : (
                        <span
                          aria-hidden
                          className="size-7 shrink-0"
                        />
                      )}
                    </div>
                  )
                })}

                <span
                  className="inline-flex shrink-0"
                  title={
                    analysisReadOnly
                      ? t("library.readOnlyHint")
                      : atMaxProjects
                        ? maxProjectsTooltip
                        : t("projects.addProjectTooltip")
                  }
                >
                  <button
                    type="button"
                    role="tab"
                    aria-label={t("projects.addProject")}
                    aria-disabled={analysisReadOnly || atMaxProjects}
                    disabled={analysisReadOnly || atMaxProjects}
                    onClick={handleAddProject}
                    className={cn(
                      "ui-label flex h-8 min-w-9 cursor-pointer items-center justify-center rounded-t-lg border border-transparent border-b-0 px-2 transition-[color,background-color,border-color] duration-200",
                      "outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                      "bg-card text-muted-foreground hover:bg-muted hover:text-foreground",
                      "disabled:pointer-events-none disabled:opacity-40",
                    )}
                  >
                    <Plus className="size-4" aria-hidden />
                  </button>
                </span>
              </div>
            </div>
            )}

            <div
              className={
                isOngoingAnalysis ? ONGOING_COST_CELL_CLASS : "pb-7"
              }
            >
              {activeProject ? (
                <div
                  key={`${librarySession.activeCheckpoint?.id ?? "single"}:${activeProject.id}`}
                  id={`panel-${activeProject.id}`}
                  role="tabpanel"
                  aria-labelledby={`tab-${activeProject.id}`}
                  tabIndex={0}
                  className="relative min-w-0 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-1 motion-safe:duration-200 motion-reduce:animate-none"
                >
                  {!isOngoingAnalysis ? (
                  <div
                    className={cn(
                      PROJECT_PROFILE_FOCUS_ROW_CLASS,
                      PROJECT_PROFILE_SECTION_SPACING_CLASS,
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
                                  patchProjectProfile(
                                    prev,
                                    activeProject.id,
                                    next,
                                  ),
                                )
                        }
                      />
                    </div>
                    {!analysisReadOnly ? (
                      <PrimaryFocusModeEntry onClick={openFocusModePrimary} />
                    ) : null}
                  </div>
                  ) : null}
                  <div
                    ref={impactEditingAreaRef}
                    className="flex min-w-0 flex-col gap-6"
                  >
                    <Card
                      data-cost-items-card=""
                      className="overflow-visible border border-border bg-[var(--km-surface)] ring-0 [--km-surface:color-mix(in_oklab,var(--color-muted)_35%,var(--color-background))]"
                    >
                      <CardContent className="p-4">
                        <SectionExpander title={t("expanders.costElements")} defaultOpen>
                          <CostTable
                            rows={activeProject.costRows}
                            incurredCosts={activeProject.incurredCosts}
                            assumptions={activeProject.assumptions ?? []}
                            readOnly={analysisReadOnly}
                            onAddAssumption={
                              analysisReadOnly
                                ? undefined
                                : (text) =>
                                    setProjects((prev) =>
                                      patchProjectAddAssumption(
                                        prev,
                                        activeProject.id,
                                        text,
                                      ),
                                    )
                            }
                            onUpdateAssumption={
                              analysisReadOnly
                                ? undefined
                                : (assumptionId, text) =>
                                    setProjects((prev) =>
                                      patchProjectUpdateAssumption(
                                        prev,
                                        activeProject.id,
                                        assumptionId,
                                        text,
                                      ),
                                    )
                            }
                            onRemoveAssumption={
                              analysisReadOnly
                                ? undefined
                                : (assumptionId) =>
                                    setProjects((prev) =>
                                      patchProjectRemoveAssumption(
                                        prev,
                                        activeProject.id,
                                        assumptionId,
                                      ),
                                    )
                            }
                            onIncurredCostsChange={(value) => {
                              if (analysisReadOnly) return
                              setProjects((prev) =>
                                patchProjectIncurredCosts(
                                  prev,
                                  activeProject.id,
                                  value,
                                ),
                              )
                            }}
                            changedCellKeys={visibleStaleChangedCellKeys.cost}
                            invalidCellKeys={
                              showValidationFeedback
                                ? validationInvalidCellKeys.cost
                                : undefined
                            }
                            costImpactSliders={
                              impactModeActive && impactSelectedDriverRow
                                ? {
                                    active: true,
                                    selectedDriverRowId: impactSelectedDriverRow.row.id,
                                    selectedDriverLabel: impactSelectedDriverRow.label,
                                    driverImpacts: activeProject.driverImpacts,
                                    changedCellKeys:
                                      visibleStaleChangedCellKeys.driverImpacts,
                                    onImpactChange: (
                                      driverRowId,
                                      costRowId,
                                      value,
                                    ) => {
                                      if (analysisReadOnly) return
                                      setProjects((prev) =>
                                        patchProjectDriverImpact(
                                          prev,
                                          activeProject.id,
                                          driverRowId,
                                          costRowId,
                                          String(value),
                                        ),
                                      )
                                    },
                                  }
                                : undefined
                            }
                            onRowsChange={(updater) => {
                              if (analysisReadOnly) return
                              setProjects((prev) =>
                                patchProjectCostRows(
                                  prev,
                                  activeProject.id,
                                  updater,
                                ),
                              )
                            }}
                            costCorrelationMode={{
                              active: correlationModeActive,
                              onToggle: handleCorrelationModeToggle,
                              selectedCostRowIds: correlationModeActive
                                ? correlationSelectedCostIds
                                : [],
                              onToggleCostSelection: handleToggleCorrelationCost,
                              onOpenSummary: handleOpenCorrelationSummary,
                              onRemoveSummary: handleRemoveCorrelationSummary,
                              pendingRho: correlationPendingRho,
                              pendingMixed: correlationPendingMixed,
                              onPendingRhoChange: handleCorrelationPendingChange,
                              onApplyGroupCorrelation:
                                handleCostCorrelationGroupApply,
                              savedSummaries: savedCorrelationSummaries,
                              saveConfirmVisible: correlationSaveConfirmVisible,
                              saveConfirmKind: correlationFeedbackKind,
                              prepStatus: activeCostCorrelationPrep?.status,
                              incompatibleEditWarning: correlationEditBlocked,
                              onReturnToGuided:
                                guidedResume?.after === "correlation" &&
                                guidedResume.projectId === activeProject.id
                                  ? returnToGuidedReview
                                  : undefined,
                            }}
                            defineMode={{
                              active: defineModeActive,
                              onToggle: handleDefineModeToggle,
                              selectedRowId: defineModeActive
                                ? defineSelectedRowId
                                : null,
                              onSelectRow: (rowId) => {
                                if (!defineModeActive) return
                                setDefineSelectedRowId(rowId)
                              },
                              onClearSelection: () => setDefineSelectedRowId(null),
                            }}
                            guidedInputMode={
                              analysisReadOnly
                                ? undefined
                                : {
                                    active: guidedInputKind === "cost",
                                    onOpen: () => openGuidedInput("cost"),
                                    onReturnToGuided:
                                      guidedResume?.after === "costItems" &&
                                      guidedResume.projectId === activeProject.id
                                        ? returnToGuidedReview
                                        : undefined,
                                  }
                            }
                          />
                        </SectionExpander>
                      </CardContent>
                    </Card>

                    <Card className="overflow-visible border border-border bg-[var(--km-surface)] ring-0 [--km-surface:color-mix(in_oklab,var(--color-muted)_35%,var(--color-background))]">
                      <CardContent className="p-4">
                        <SectionExpander title={t("expanders.drivers")} defaultOpen>
                          <DriversTable
                            rows={activeProject.driverRows}
                            readOnly={analysisReadOnly}
                            changedCellKeys={visibleStaleChangedCellKeys.drivers}
                            invalidCellKeys={
                              showValidationFeedback
                                ? validationInvalidCellKeys.drivers
                                : undefined
                            }
                            driverImpactMode={{
                              active: impactModeActive,
                              onToggle: handleImpactModeToggle,
                              selectedDriverRowId: impactModeActive
                                ? (impactSelectedDriverRow?.row.id ?? null)
                                : null,
                              onSelectDriver: (driverRowId) => {
                                if (!impactModeActive) return
                                setImpactSelectedDriverId(driverRowId)
                              },
                              onReturnToGuided:
                                guidedResume?.after === "impact" &&
                                guidedResume.projectId === activeProject.id
                                  ? returnToGuidedReview
                                  : undefined,
                            }}
                            defineMode={{
                              active: defineModeActive,
                              onToggle: handleDefineModeToggle,
                              selectedRowId: defineModeActive
                                ? defineSelectedRowId
                                : null,
                              onSelectRow: (rowId) => {
                                if (!defineModeActive) return
                                setDefineSelectedRowId(rowId)
                              },
                              onClearSelection: () => setDefineSelectedRowId(null),
                            }}
                            guidedInputMode={
                              analysisReadOnly
                                ? undefined
                                : {
                                    active: guidedInputKind === "driver",
                                    onOpen: () => openGuidedInput("driver"),
                                    onReturnToGuided:
                                      guidedResume?.after === "drivers" &&
                                      guidedResume.projectId === activeProject.id
                                        ? returnToGuidedReview
                                        : undefined,
                                  }
                            }
                            onRowsChange={(updater) => {
                              if (analysisReadOnly) return
                              setProjects((prev) =>
                                patchProjectDriverRows(
                                  prev,
                                  activeProject.id,
                                  updater,
                                ),
                              )
                            }}
                          />
                        </SectionExpander>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          <div
            className={
              isOngoingAnalysis
                ? ONGOING_WORKSPACE_RIGHT_CLASS
                : RESULTS_COLUMN_CLASS
            }
          >
            <div
              className={
                isOngoingAnalysis
                  ? ONGOING_SIMULATION_CELL_CLASS
                  : STICKY_CONTROL_STRIP_CLASSNAME
              }
              role="region"
              aria-label={t("projects.simulationStripRegion")}
            >
              <p
                className={cn(
                  "font-sans text-[10px] font-normal italic tracking-wide text-muted-foreground/55",
                  COLUMN_HEADER_BOTTOM_GAP_CLASS,
                )}
              >
                {t("projects.resultsColumnLabel")}
              </p>
              <div className="flex h-8 w-full shrink-0 items-center justify-center">
                {isRunning ? (
                  <SpotlightLoadingText
                    text={t("buttons.simulating")}
                    tone="primary"
                    className={cn(
                      "font-sans text-xs font-semibold",
                      brandPrimaryTextClass,
                    )}
                    data-simulation-loading=""
                    aria-live="polite"
                    aria-busy="true"
                  />
                ) : analysisReadOnly ? (
                  <Button
                    type="button"
                    disabled
                    title={t("library.runDisabledArchived")}
                    className={cn(
                      "h-8 w-full shrink-0 font-sans text-xs font-semibold uppercase tracking-wide opacity-40",
                      brandPrimaryButtonClass,
                    )}
                  >
                    {t("buttons.runSimulation")}
                  </Button>
                ) : (
                  <Button
                    type="button"
                    className={cn(
                      "h-8 w-full shrink-0 font-sans text-xs font-semibold uppercase tracking-wide",
                      brandPrimaryButtonClass,
                    )}
                    onClick={handleRun}
                  >
                    {t("buttons.runSimulation")}
                  </Button>
                )}
              </div>
              <div className={SIMULATION_NOTICE_ZONE_CLASS}>
                {runErrorKey === "projects.workerError" ? (
                  <p
                    className={cn(SIMULATION_NOTICE_TEXT_CLASS, "min-w-0 break-words")}
                    role="alert"
                  >
                    {t(runErrorKey)}
                  </p>
                ) : null}
                {showValidationFeedback ? (
                  <p
                    className={cn(SIMULATION_NOTICE_TEXT_CLASS, "min-w-0 break-words")}
                    role="alert"
                  >
                    {noticeWithColorWord(
                      t(currentValidationError),
                      language === "no" ? "rødt" : "red",
                      NOTICE_WORD_RED_CLASS,
                    )}
                  </p>
                ) : null}
                {showStaleInputNotice ? (
                  <div className="flex min-w-0 flex-col gap-1">
                    <p
                      className={cn(
                        "font-sans text-xs font-medium leading-snug text-foreground/85",
                        "min-w-0 break-words",
                      )}
                    >
                      {t("projects.staleInputsTitle")}
                    </p>
                    <p
                      className={cn(
                        SIMULATION_NOTICE_TEXT_CLASS,
                        "min-w-0 break-words",
                      )}
                    >
                      {showStaleInputChanges
                        ? noticeWithColorWord(
                            t("projects.staleInputsNoticeWithChanges"),
                            language === "no" ? "Grønne" : "Green",
                            NOTICE_WORD_GREEN_CLASS,
                          )
                        : t("projects.staleInputsNotice")}
                    </p>
                    <div className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1">
                      <Button
                        type="button"
                        variant="link"
                        size="sm"
                        className="h-auto min-h-0 w-fit shrink-0 self-start px-0 py-0 text-xs leading-snug"
                        aria-pressed={showStaleInputChanges}
                        onClick={() =>
                          setShowStaleInputChanges((prev) => !prev)
                        }
                      >
                        {showStaleInputChanges
                          ? t("projects.hideInputChanges")
                          : t("projects.showInputChanges")}
                      </Button>
                      <Button
                        type="button"
                        variant="link"
                        size="sm"
                        className="h-auto min-h-0 w-fit shrink-0 self-start px-0 py-0 text-xs leading-snug"
                        onClick={handleRevertInputsToLastSimulation}
                      >
                        {t("projects.revertInputChanges")}
                      </Button>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
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
                  librarySession.docMeta?.id ===
                    librarySession.ongoingDraftResult.analysisId &&
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
                      !isOngoingCheckpointResultSnapshot(
                        librarySession.archivedSnapshot,
                      ) &&
                      !isSingleArchivedResultSnapshot(
                        librarySession.archivedSnapshot,
                      )
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
                    singleDraftResult={
                      singleDraftCompact ?? librarySession.singleDraftResult
                    }
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
                      isOngoingAnalysis
                        ? librarySession.ongoing?.checkpoints
                        : undefined
                    }
                    viewedCheckpointId={
                      isOngoingAnalysis
                        ? librarySession.ongoing?.activeCheckpointId
                        : undefined
                    }
                    analysisName={librarySession.docMeta?.name}
                    ongoingLifecycle={
                      isOngoingAnalysis
                        ? librarySession.ongoing?.lifecycle
                        : undefined
                    }
                    checkpointComparisonResultSource={
                      checkpointComparisonResultSource
                    }
                    onOpenFocusResults={
                      hasViewableResults ? openFocusResults : undefined
                    }
                    focusResultsActive={false}
                  />
                ) : null}
              </div>
            </div>
          </div>
        </div>
        <div
          className="mt-auto flex justify-center pt-10 pb-8 text-center"
          role="contentinfo"
        >
          <span className="block font-sans text-[10px] leading-none text-muted-foreground/70">
            © 2026 {PRODUCT_NAME}
          </span>
        </div>
      </div>
      </div>
      {(Boolean(guidedInputKind && !analysisReadOnly) ||
        (focusView === "results" &&
          hasViewableResults &&
          focusResultSection !== null)) && (
        <FocusModeShell
          ref={focusShellRef}
          open={focusView !== null}
          keepMounted={Boolean(guidedInputKind && !analysisReadOnly)}
          title={
            focusView === "results" && focusResultSection
              ? t(focusResultSectionTitleKey(focusResultSection))
              : focusView === "input"
                ? (guidedFocusChromeMeta?.title ?? "")
                : ""
          }
          subtitle={
            focusView === "results" && activeProject ? (
              <p
                className="m-0 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5"
                data-focus-results-project-context=""
              >
                <span className="inline-flex min-w-0 items-center gap-1.5">
                  <ProjectColorSwatch
                    projectIndex={Math.max(
                      0,
                      projects.findIndex((p) => p.id === activeProject.id),
                    )}
                  />
                  <span className="min-w-0 truncate" title={activeProject.name}>
                    {activeProject.name}
                  </span>
                </span>
                <span
                  className="shrink-0 text-muted-foreground/70"
                  data-focus-results-context=""
                >
                  {t("inputs.focusResultsContext")}
                </span>
              </p>
            ) : focusView === "input" && guidedFocusChromeMeta ? (
              <p
                className="m-0 flex min-w-0 items-center gap-1.5"
                data-guided-project-context=""
              >
                <ProjectColorSwatch
                  projectIndex={guidedFocusChromeMeta.projectIndex}
                />
                <span
                  className="min-w-0 truncate"
                  title={guidedFocusChromeMeta.projectName}
                >
                  {guidedFocusChromeMeta.projectName}
                </span>
              </p>
            ) : undefined
          }
          headerHelp={
            focusView === "input" &&
            guidedFocusChromeMeta?.helpTopic &&
            guidedFocusChromeMeta.helpContent ? (
              <GuidedPhaseInfo
                topic={guidedFocusChromeMeta.helpTopic}
                content={guidedFocusChromeMeta.helpContent}
              />
            ) : null
          }
          headerAuxiliary={
            shouldShowFocusPhaseNav({
              focusView,
              guidedWorkflowPhase: guidedFocusChromeMeta?.workflowPhase,
            }) && currentFocusUserPhase ? (
              <FocusPhaseNav
                currentPhase={currentFocusUserPhase}
                furthestReached={furthestReachedFocusPhase}
                itemProgressLabel={
                  focusView === "input"
                    ? guidedFocusChromeMeta?.progressLabel || undefined
                    : undefined
                }
                onSelectPhase={navigateToFocusUserPhase}
                t={t}
              />
            ) : focusView === "input" &&
              guidedFocusChromeMeta?.progressLabel ? (
              <span data-guided-progress="">
                {guidedFocusChromeMeta.progressLabel}
              </span>
            ) : null
          }
          onExitFocus={exitFocusMode}
          onNavigatePrevious={
            focusView !== null ? navigateFocusPrevious : undefined
          }
          onNavigateNext={
            focusView !== null ? navigateFocusNext : undefined
          }
          canNavigateNext={
            focusView === "results"
              ? canFocusNavigateNextResults(
                  focusResultStepIndex,
                  focusResultSteps.length,
                )
              : focusView === "input"
                ? Boolean(guidedFocusChromeMeta?.canGoNext)
                : false
          }
          canNavigatePrevious={
            focusView === "results"
              ? true
              : focusView === "input"
                ? Boolean(guidedFocusChromeMeta?.canGoPrevious)
                : false
          }
          surfaceAttr={
            focusView === "results"
              ? "data-focus-results-surface"
              : "data-focus-input-surface"
          }
          headerActions={
            focusView === "results" &&
            shouldShowResultSettingsEditor({
              analysisArchivedView: analysisReadOnly,
              useArchivedResults: Boolean(
                analysisReadOnly && librarySession.archivedSnapshot,
              ),
            }) ? (
              <ResultPreferencesPanel
                preferences={resultPreferences}
                onChange={replacePreferences}
                onAddKeyFigurePercentile={addKeyFigurePercentile}
                onRemoveKeyFigurePercentile={removeKeyFigurePercentile}
                onAddSCurvePercentile={addSCurvePercentile}
                onRemoveSCurvePercentile={removeSCurvePercentile}
                onSaveAsDefault={saveAsDefault}
                onReset={resetToDefaults}
              />
            ) : null
          }
          status={
            focusView === "results" && showStaleInputNotice ? (
              <div
                className="flex min-w-0 flex-col gap-1"
                data-focus-stale-notice=""
              >
                <p className="font-sans text-xs font-medium leading-snug text-foreground/85">
                  {t("projects.staleInputsTitle")}
                </p>
                <p
                  className={cn(
                    SIMULATION_NOTICE_TEXT_CLASS,
                    "min-w-0 break-words",
                  )}
                >
                  {showStaleInputChanges
                    ? noticeWithColorWord(
                        t("projects.staleInputsNoticeWithChanges"),
                        language === "no" ? "Grønne" : "Green",
                        NOTICE_WORD_GREEN_CLASS,
                      )
                    : t("projects.staleInputsNotice")}
                </p>
                <div className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1">
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    className="h-auto min-h-0 w-fit shrink-0 self-start px-0 py-0 text-xs leading-snug"
                    aria-pressed={showStaleInputChanges}
                    onClick={handleFocusShowChanges}
                    data-focus-show-changes=""
                  >
                    {t("projects.showInputChanges")}
                  </Button>
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    className="h-auto min-h-0 w-fit shrink-0 self-start px-0 py-0 text-xs leading-snug"
                    onClick={handleRevertInputsToLastSimulation}
                  >
                    {t("projects.revertInputChanges")}
                  </Button>
                </div>
              </div>
            ) : null
          }
          footer={
            focusView === "results" ? (
              <div
                className="flex w-full items-center justify-between gap-3"
                data-focus-results-nav=""
              >
                <button
                  type="button"
                  className={buttonVariants({
                    variant: "ghost",
                    className: FOCUS_SESSION_FOOTER_NAV_BUTTON_CLASS,
                  })}
                  onClick={navigateFocusPrevious}
                  data-focus-results-previous=""
                  data-focus-session-previous=""
                  data-focus-back-to-input={
                    focusResultStepIndex <= 0 ? "" : undefined
                  }
                >
                  {focusResultStepIndex <= 0
                    ? t("inputs.focusBackToInput")
                    : t("inputs.guidedPrevious")}
                </button>
                {focusResultStepIndex >= focusResultSteps.length - 1 ? (
                  <button
                    type="button"
                    className={buttonVariants({
                      variant: "ghost",
                      className: FOCUS_SESSION_FOOTER_NAV_BUTTON_CLASS,
                    })}
                    onClick={exitFocusMode}
                    data-focus-session-exit=""
                    data-focus-results-exit=""
                  >
                    {t("inputs.focusSessionExit")}
                  </button>
                ) : (
                  <button
                    type="button"
                    className={buttonVariants({
                      variant: "ghost",
                      className: FOCUS_SESSION_FOOTER_NAV_BUTTON_CLASS,
                    })}
                    onClick={navigateFocusNext}
                    data-focus-results-next=""
                    data-focus-session-next=""
                  >
                    {t("inputs.guidedNext")}
                  </button>
                )}
              </div>
            ) : focusView === "input" && guidedFocusChromeMeta ? (
              <div
                className="flex w-full items-center justify-between gap-3"
                data-focus-input-nav=""
              >
                <button
                  type="button"
                  disabled={!guidedFocusChromeMeta.canGoPrevious}
                  className={buttonVariants({
                    variant: "ghost",
                    className: FOCUS_SESSION_FOOTER_NAV_BUTTON_CLASS,
                  })}
                  onClick={navigateFocusPrevious}
                  data-focus-session-previous=""
                  data-guided-previous=""
                >
                  {t("inputs.guidedPrevious")}
                </button>
                <div className="flex flex-wrap items-center justify-end gap-2">
                  {guidedFocusChromeMeta.secondaryFooter?.kind ===
                  "adjustCorrelation" ? (
                    <button
                      type="button"
                      className={buttonVariants({
                        variant: "ghost",
                        className: FOCUS_SESSION_FOOTER_NAV_BUTTON_CLASS,
                      })}
                      onClick={handoffGuidedToCorrelation}
                      data-guided-adjust-correlation=""
                    >
                      {guidedFocusChromeMeta.secondaryFooter.label}
                    </button>
                  ) : null}
                  {guidedFocusChromeMeta.secondaryFooter?.kind ===
                  "adjustImpact" ? (
                    <button
                      type="button"
                      className={buttonVariants({
                        variant: "ghost",
                        className: FOCUS_SESSION_FOOTER_NAV_BUTTON_CLASS,
                      })}
                      onClick={handoffGuidedToImpact}
                      data-guided-adjust-impact=""
                    >
                      {guidedFocusChromeMeta.secondaryFooter.label}
                    </button>
                  ) : null}
                  {guidedFocusChromeMeta.secondaryFooter?.kind ===
                  "addDrivers" ? (
                    <button
                      type="button"
                      className={buttonVariants({
                        variant: "ghost",
                        className: FOCUS_SESSION_FOOTER_NAV_BUTTON_CLASS,
                      })}
                      onClick={handoffGuidedToAddDrivers}
                      data-guided-add-drivers=""
                    >
                      {guidedFocusChromeMeta.secondaryFooter.label}
                    </button>
                  ) : null}
                  <button
                    type="button"
                    disabled={!guidedFocusChromeMeta.canGoNext}
                    className={buttonVariants({
                      variant: "ghost",
                      className: FOCUS_SESSION_FOOTER_NAV_BUTTON_CLASS,
                    })}
                    onClick={navigateFocusNext}
                    data-focus-session-next=""
                    data-guided-next=""
                  >
                    {guidedFocusChromeMeta.nextLabel}
                  </button>
                </div>
              </div>
            ) : null
          }
        >
          {focusView === "results" &&
          hasViewableResults &&
          focusResultSection ? (
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
                !isOngoingCheckpointResultSnapshot(
                  librarySession.archivedSnapshot,
                ) &&
                !isSingleArchivedResultSnapshot(
                  librarySession.archivedSnapshot,
                )
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
              singleDraftResult={
                singleDraftCompact ?? librarySession.singleDraftResult
              }
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
                isOngoingAnalysis
                  ? librarySession.ongoing?.checkpoints
                  : undefined
              }
              viewedCheckpointId={
                isOngoingAnalysis
                  ? librarySession.ongoing?.activeCheckpointId
                  : undefined
              }
              analysisName={librarySession.docMeta?.name}
              ongoingLifecycle={
                isOngoingAnalysis
                  ? librarySession.ongoing?.lifecycle
                  : undefined
              }
              checkpointComparisonResultSource={
                checkpointComparisonResultSource
              }
              focusResultsActive
              focusSection={focusResultSection}
              onFocusReviewInput={handleFocusReviewInput}
            />
          ) : null}
        </FocusModeShell>
      )}
    </div>
  )
}
