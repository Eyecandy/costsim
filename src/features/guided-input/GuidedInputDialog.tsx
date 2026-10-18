import {
  useEffect,
  useId,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  forwardRef,
  type KeyboardEvent as ReactKeyboardEvent,
  type RefObject,
} from "react"
import { createPortal } from "react-dom"
import { Maximize2, Minimize2, X } from "lucide-react"

import { Button, buttonVariants } from "@/shared/ui/button"
import type { FocusModeShellHandle } from "@/features/focus-mode/FocusModeShell"
import { ProjectColorSwatch } from "@/shared/ProjectColorSwatch"
import { ProjectProfileSection } from "@/features/workspace/ProjectProfileSection"
import {
  GuidedPhaseInfo,
  type GuidedPhaseInfoContent,
} from "@/features/guided-input/GuidedPhaseInfo"
import type { GuidedFocusChromeMeta } from "@/domain/guided/guidedFocusChrome"
import { SpotlightLoadingText } from "@/shared/SpotlightLoadingText"
import { brandPrimaryButtonClass, brandPrimaryTextClass } from "@/shared/brand"
import { useI18n } from "@/i18n/useI18n"
import {
  deriveSavedCorrelationSummaries,
  formatSavedCorrelationSummaryLabel,
} from "@/domain/simulation/costCorrelationSummaries"
import {
  computeGuidedDriverEndpointEffects,
  type GuidedInputKind,
} from "@/domain/guided/guidedInput"
import {
  enterFullscreenQuietly,
  exitFullscreenIfNeeded,
  exitFullscreenQuietly,
  isElementFullscreen,
  subscribeFullscreenChange,
} from "@/persistence/browserFullscreen"
import { shouldIgnoreGuidedArrowNavigation } from "@/domain/guided/shouldIgnoreGuidedArrowNavigation"
import {
  findGuidedStepIndexForFocusPhase,
  type FocusUserPhaseInput,
} from "@/domain/guided/focusPhaseNav"
import {
  resolveGuidedStepIndexForResume,
  type GuidedSemanticResume,
} from "@/persistence/focusSessionResume"
import {
  buildGuidedWorkflowSteps,
  clampGuidedWorkflowStepIndex,
  findGuidedWorkflowPhaseIndex,
  formatGuidedPhaseProgress,
  initialGuidedWorkflowStepIndex,
  type GuidedResumeAfter,
  type GuidedWorkflowStep,
} from "@/domain/guided/guidedWorkflow"
import type { Project } from "@/domain/analysis/project"
import type { ProjectProfile } from "@/domain/analysis/projectProfile"
import type { CostElementRow, DriverRow } from "@/domain/results/tableRows"
import { cn } from "@/shared/utils"
import { buildPdfImpactOverrides } from "@/pdf/buildPdfReportModel"
import {
  FOCUS_SESSION_CARD_CLASS,
  FOCUS_SESSION_CARD_FULLSCREEN_CLASS,
  FOCUS_SESSION_FOOTER_CLASS,
  FOCUS_SESSION_FOOTER_NAV_BUTTON_CLASS,
} from "@/domain/guided/focusSessionFrame"
import { GuidedAssumptionsPhase } from "@/features/guided-input/parts/GuidedAssumptionsPhase"
import { GuidedIncurredPhase } from "@/features/guided-input/parts/GuidedIncurredPhase"
import { phaseTitle } from "@/features/guided-input/parts/guidedPhaseTitle"
import {
  GuidedConceptIntro,
  GuidedFocusIntroPhase,
} from "@/features/guided-input/parts/GuidedIntroPhases"
import { GuidedCostPhase } from "@/features/guided-input/parts/GuidedCostPhase"
import { GuidedDriverPhase } from "@/features/guided-input/parts/GuidedDriverPhase"

export type GuidedInputDialogProps = {
  open: boolean
  /** Toolbar entry: cost play or driver play (full reserved for later). */
  entry: GuidedInputKind
  project: Project
  /**
   * Visible project order index for shared project-color identity
   * (same source as tabs / results).
   */
  projectIndex: number
  /** Row offset into cost/driver candidates for that entry. */
  startIndex?: number
  /**
   * Primary Focus entry: land on the Focus-mode intro instead of the entry
   * default. Local Input shortcuts leave this null.
   */
  startPhase?: "focusIntro" | null
  /**
   * When reopening after a table / Correlation / Impact detour, land on this phase.
   * Takes precedence over startIndex for the initial step.
   */
  resumePhase?: GuidedResumeAfter | null
  /** Called after resumePhase has been applied to the step index. */
  onResumeApplied?: () => void
  /**
   * Land on the first semantic step of a broad Focus phase (phase overview).
   * Applied like resumePhase; takes precedence over startIndex after detours.
   */
  resumeFocusUserPhase?: FocusUserPhaseInput | null
  /** Called after resumeFocusUserPhase has been applied. */
  onResumeFocusUserPhaseApplied?: () => void
  /**
   * Session reload land: Guided phase (+ optional cost/driver row id).
   * Applied like other resume props after detour resumes.
   */
  resumeSemanticStep?: GuidedSemanticResume | null
  /** Called after resumeSemanticStep has been applied. */
  onResumeSemanticStepApplied?: () => void
  onClose: () => void
  onPatchRow: (rowId: string, patch: Partial<CostElementRow & DriverRow>) => void
  onAddAssumption: (text: string) => void
  onUpdateAssumption: (assumptionId: string, text: string) => void
  onRemoveAssumption: (assumptionId: string) => void
  /** Updates project.incurredCosts through the same path as the cost table. */
  onIncurredCostsChange: (value: number) => void
  /** Project profile edits from the guided profile phase (same path as the page section). */
  onPatchProfile?: (profile: ProjectProfile | undefined) => void
  /** Close guided and open existing Cost Items table for structure entry. */
  onAddCostItems: () => void
  /** Close guided and open existing Drivers table for structure entry. */
  onAddDrivers: () => void
  /** Close guided and open existing Correlation mode — do not edit correlations here. */
  onAdjustCorrelation: () => void
  /** Close guided and open existing Driver Impact mode. */
  onAdjustImpact: () => void
  /**
   * Presentation sync: Focus mode entered/exited inside Guided.
   * App uses this for Focus Input ↔ Focus Results navigation.
   */
  onFocusModeChange?: (active: boolean) => void
  /**
   * When true, keep Guided state mounted but soft-hide the embedded portal
   * (e.g. while Focus Results content is shown in the shared Focus host).
   * Does not exit browser fullscreen — the shared Focus host owns it.
   * Does not unmount local Guided step/component state.
   */
  suspend?: boolean
  /**
   * Shared Focus session host (App-owned). Used for fullscreen continuity
   * across Input → Results.
   */
  focusShellRef?: RefObject<FocusModeShellHandle | null>
  /** Content node inside the shared Focus host — Guided portals here in Focus. */
  focusPortalTarget?: HTMLElement | null
  /**
   * Publishes Input Focus header/footer metadata to the shared shell.
   * Cleared when not embedded or while soft-suspended for Results.
   */
  onFocusChromeMetaChange?: (meta: GuidedFocusChromeMeta | null) => void
  /** Request fullscreen on the shared host (must run in user-gesture stack). */
  onRequestFocusFullscreen?: () => void
  /** Exit fullscreen on the shared host. */
  onExitFocusFullscreen?: () => void
  /** Run simulation from the Guided Simulation step (existing App handler). */
  onRunSimulation?: () => void
  runSimulationDisabled?: boolean
  runSimulationBusy?: boolean
  /**
   * Result availability for the Simulation / Result Status step.
   * Mirrors normal-app liveResultValidity presentation.
   */
  simulationResultStatus?: "none" | "valid" | "stale"
  /** Advance from Simulation into Focus Results (when results are viewable). */
  onContinueToResults?: () => void
  /** Stale: enable green changed-field highlighting (existing App path). */
  onShowStaleChanges?: () => void
  /** Stale: existing Undo / revert handler. */
  onRevertStaleChanges?: () => void
  showStaleInputChanges?: boolean
  /**
   * When true (e.g. returning from Focus Results), ensure Guided Focus Input
   * is active without requiring another Maximize click.
   */
  ensureFocusMode?: boolean
}

/** Imperative Focus-session navigation into Guided Input steps. */
export type GuidedInputDialogHandle = {
  goPrevious: () => void
  goNext: () => void
  /** Land on the Simulation / Result Status step (Focus boundary). */
  goToSimulation: () => void
  /** Land on the first semantic step of a broad Focus Input phase. */
  goToFocusUserPhase: (phase: FocusUserPhaseInput) => void
  getStepIndex: () => number
  getStepCount: () => number
  isAtFirstStep: () => boolean
  isAtSimulation: () => boolean
}

export const GuidedInputDialog = forwardRef<GuidedInputDialogHandle, GuidedInputDialogProps>(
  function GuidedInputDialog(
    {
      open,
      entry,
      project,
      projectIndex,
      startIndex = 0,
      startPhase = null,
      resumePhase = null,
      onResumeApplied,
      resumeFocusUserPhase = null,
      onResumeFocusUserPhaseApplied,
      resumeSemanticStep = null,
      onResumeSemanticStepApplied,
      onClose,
      onPatchRow,
      onAddAssumption,
      onUpdateAssumption,
      onRemoveAssumption,
      onIncurredCostsChange,
      onPatchProfile,
      onAddCostItems,
      onAddDrivers,
      onAdjustCorrelation,
      onAdjustImpact,
      onFocusModeChange,
      suspend = false,
      focusShellRef: _focusShellRef,
      focusPortalTarget = null,
      onFocusChromeMetaChange,
      onRequestFocusFullscreen,
      onExitFocusFullscreen,
      onRunSimulation,
      runSimulationDisabled = false,
      runSimulationBusy = false,
      simulationResultStatus = "none",
      onContinueToResults,
      onShowStaleChanges,
      onRevertStaleChanges,
      ensureFocusMode = false,
    }: GuidedInputDialogProps,
    ref,
  ) {
    const { t, language } = useI18n()
    const titleId = useId()
    const closeBtnRef = useRef<HTMLButtonElement | null>(null)
    const focusToggleRef = useRef<HTMLButtonElement | null>(null)
    const focusRootRef = useRef<HTMLDivElement | null>(null)
    const [stepIndex, setStepIndex] = useState(0)
    /** Presentation-only: larger, isolated Guided workspace (not persisted). */
    const [focusMode, setFocusMode] = useState(false)
    /** True when our Focus root currently owns browser fullscreen. */
    const [browserFullscreen, setBrowserFullscreen] = useState(false)
    /** Prevents falling back to the entry default after resumePhase is cleared. */
    const resumeAppliedForOpenRef = useRef(false)

    const steps = useMemo(
      () =>
        buildGuidedWorkflowSteps({
          entry,
          costRows: project.costRows,
          driverRows: project.driverRows,
        }),
      [entry, project.costRows, project.driverRows],
    )

    const total = steps.length
    const safeIndex = clampGuidedWorkflowStepIndex(stepIndex, total)
    const step: GuidedWorkflowStep | null = total > 0 ? steps[safeIndex]! : null

    const costRow =
      step?.phase === "cost" ? (project.costRows.find((r) => r.id === step.rowId) ?? null) : null
    const driverRow =
      step?.phase === "driver"
        ? (project.driverRows.find((r) => r.id === step.rowId) ?? null)
        : null

    const driverEffects = useMemo(() => {
      if (step?.phase !== "driver" || !driverRow) {
        return { p10Effect: null, modeEffect: null, p90Effect: null }
      }
      return computeGuidedDriverEndpointEffects(project, driverRow.id)
    }, [step, project, driverRow])

    const correlationSummaries = useMemo(() => {
      if (step?.phase !== "correlation") return []
      return deriveSavedCorrelationSummaries(project.costRows, project.costCorrelations)
    }, [step, project.costRows, project.costCorrelations])

    const correlationNameById = useMemo(() => {
      const map = new Map<string, string>()
      for (const row of project.costRows) {
        map.set(row.id, row.name)
      }
      return map
    }, [project.costRows])

    const impactOverrides = useMemo(() => {
      if (step?.phase !== "impact") return []
      return buildPdfImpactOverrides(project)
    }, [step, project])

    useEffect(() => {
      if (ensureFocusMode) return
      // Results suspends Guided UI but the Focus session is still active —
      // do not drop focusMode (that re-enables modal sizing + window arrows).
      if (suspend) return
      if (!focusMode) return
      // Shared Focus session ended.
      setFocusMode(false)
      setBrowserFullscreen(false)
    }, [ensureFocusMode, focusMode, suspend])

    useEffect(() => {
      if (!open || suspend) return
      if (!ensureFocusMode || focusMode) return
      setFocusMode(true)
      onFocusModeChange?.(true)
    }, [open, suspend, ensureFocusMode, focusMode, onFocusModeChange])

    useEffect(() => {
      if (!open) {
        resumeAppliedForOpenRef.current = false
        setFocusMode(false)
        setBrowserFullscreen(false)
        onFocusModeChange?.(false)
        // Shared Focus host owns fullscreen — do not exit it here on close of
        // the modal-only surface. App / FocusModeShell cleanup handles FS exit.
        return
      }
      const nextSteps = buildGuidedWorkflowSteps({
        entry,
        costRows: project.costRows,
        driverRows: project.driverRows,
      })
      if (
        resumePhase === "costItems" ||
        resumePhase === "correlation" ||
        resumePhase === "drivers" ||
        resumePhase === "impact" ||
        resumePhase === "simulation"
      ) {
        setStepIndex(findGuidedWorkflowPhaseIndex(nextSteps, resumePhase))
        resumeAppliedForOpenRef.current = true
        onResumeApplied?.()
        return
      }
      if (
        resumeFocusUserPhase === "project" ||
        resumeFocusUserPhase === "costs" ||
        resumeFocusUserPhase === "drivers" ||
        resumeFocusUserPhase === "simulation"
      ) {
        setStepIndex(findGuidedStepIndexForFocusPhase(nextSteps, resumeFocusUserPhase))
        resumeAppliedForOpenRef.current = true
        onResumeFocusUserPhaseApplied?.()
        return
      }
      if (resumeSemanticStep?.phase) {
        setStepIndex(
          resolveGuidedStepIndexForResume(
            nextSteps,
            resumeSemanticStep.phase,
            resumeSemanticStep.rowId,
          ),
        )
        resumeAppliedForOpenRef.current = true
        onResumeSemanticStepApplied?.()
        return
      }
      // After a successful resume, clearing resumePhase must not reset to page 1.
      if (resumeAppliedForOpenRef.current) return
      setStepIndex(
        initialGuidedWorkflowStepIndex({
          entry,
          steps: nextSteps,
          startRowIndex: startIndex,
          startPhase,
        }),
      )
      // eslint-disable-next-line react-hooks/exhaustive-deps -- re-initialise only when these inputs change; the other values are read at that moment
    }, [
      open,
      entry,
      startIndex,
      startPhase,
      resumePhase,
      onResumeApplied,
      resumeFocusUserPhase,
      onResumeFocusUserPhaseApplied,
      resumeSemanticStep,
      onResumeSemanticStepApplied,
    ])

    useEffect(() => {
      if (!open) return
      setStepIndex((prev) => clampGuidedWorkflowStepIndex(prev, total))
    }, [open, total])

    useEffect(() => {
      if (!open || suspend || focusPortalTarget) return
      closeBtnRef.current?.focus()
    }, [open, suspend, focusPortalTarget])

    useEffect(() => {
      const sync = () => {
        // Prefer shared host for FS detection when embedded in Focus.
        const host = focusPortalTarget?.closest("[data-focus-session-host]") ?? focusRootRef.current
        setBrowserFullscreen(isElementFullscreen(host instanceof Element ? host : null))
      }
      sync()
      return subscribeFullscreenChange(sync)
    }, [open, focusMode, focusPortalTarget])

    useEffect(() => {
      return () => {
        // Only exit FS owned by Guided's own root (modal path). Shared host
        // cleanup belongs to FocusModeShell.
        void exitFullscreenIfNeeded(focusRootRef.current)
      }
    }, [])

    useEffect(() => {
      if (!open || suspend) return
      const onKeyDown = (event: KeyboardEvent) => {
        if (event.key !== "Escape") return
        const active = document.activeElement
        // Inline numeric edit and definition draft own Escape (cancel draft).
        if (
          active instanceof HTMLElement &&
          (active.dataset.guidedInlineEdit != null || active.dataset.guidedDescription != null)
        ) {
          return
        }
        const host = focusPortalTarget?.closest("[data-focus-session-host]") ?? focusRootRef.current
        // Browser fullscreen: let Escape exit FS; keep in-app Focus.
        if (isElementFullscreen(host instanceof Element ? host : null)) {
          return
        }
        event.preventDefault()
        if (focusMode) {
          setFocusMode(false)
          onFocusModeChange?.(false)
          window.requestAnimationFrame(() => {
            focusToggleRef.current?.focus()
          })
          return
        }
        exitFullscreenQuietly(focusRootRef.current)
        onClose()
      }
      window.addEventListener("keydown", onKeyDown)
      return () => window.removeEventListener("keydown", onKeyDown)
    }, [open, suspend, onClose, focusMode, onFocusModeChange, focusPortalTarget])

    const enterFocusMode = () => {
      setFocusMode(true)
      onFocusModeChange?.(true)
      // Prefer shared Focus host so Input → Results keeps the same FS element.
      if (onRequestFocusFullscreen) {
        onRequestFocusFullscreen()
        return
      }
      enterFullscreenQuietly(focusRootRef.current)
    }

    const handleCloseGuided = () => {
      if (onExitFocusFullscreen) onExitFocusFullscreen()
      else exitFullscreenQuietly(focusRootRef.current)
      setFocusMode(false)
      setBrowserFullscreen(false)
      onFocusModeChange?.(false)
      onClose()
    }

    const goNext = () => {
      if (total === 0 || safeIndex >= total - 1) {
        if (step?.phase === "simulation") {
          if (
            (simulationResultStatus === "valid" || simulationResultStatus === "stale") &&
            onContinueToResults
          ) {
            onContinueToResults()
          }
          return
        }
        handleCloseGuided()
        return
      }
      setStepIndex((prev) => clampGuidedWorkflowStepIndex(prev + 1, total))
    }

    const goPrevious = () => {
      setStepIndex((prev) => clampGuidedWorkflowStepIndex(prev - 1, total))
    }

    /** Same action as the primary Next / Continue control for the current phase. */
    const performGuidedNext = () => {
      if (total === 0) {
        handleCloseGuided()
        return
      }
      if (step?.phase === "simulation") {
        goNext()
        return
      }
      if (step?.phase === "costsEmpty") {
        onAddCostItems()
        return
      }
      goNext()
    }

    useImperativeHandle(
      ref,
      () => ({
        goPrevious,
        goNext: performGuidedNext,
        goToSimulation: () => {
          const idx = findGuidedWorkflowPhaseIndex(steps, "simulation")
          setStepIndex(clampGuidedWorkflowStepIndex(idx, total))
        },
        goToFocusUserPhase: (phase: FocusUserPhaseInput) => {
          const idx = findGuidedStepIndexForFocusPhase(steps, phase)
          setStepIndex(clampGuidedWorkflowStepIndex(idx, total))
        },
        getStepIndex: () => safeIndex,
        getStepCount: () => total,
        isAtFirstStep: () => safeIndex <= 0,
        isAtSimulation: () => step?.phase === "simulation",
      }),
      // Stable enough for Focus session navigation; recreated when step changes.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [safeIndex, total, step?.phase, simulationResultStatus, steps],
    )

    useEffect(() => {
      // Focus session owns Left/Right via FocusModeShell for the whole
      // Input ↔ Results session. Never attach a competing window listener
      // while Focus chrome is active (focusMode), Results-suspended, or
      // App is forcing Focus Input (ensureFocusMode).
      if (!open || suspend || focusMode || ensureFocusMode) return
      const onKeyDown = (event: KeyboardEvent) => {
        if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return
        if (event.repeat) return
        if (event.metaKey || event.ctrlKey || event.altKey) return
        if (shouldIgnoreGuidedArrowNavigation(event.target)) return

        if (event.key === "ArrowLeft") {
          if (safeIndex <= 0) return
          event.preventDefault()
          goPrevious()
          return
        }

        event.preventDefault()
        performGuidedNext()
      }
      window.addEventListener("keydown", onKeyDown)
      return () => window.removeEventListener("keydown", onKeyDown)
    }, [open, suspend, focusMode, ensureFocusMode, safeIndex, total, step?.phase, onAddCostItems]) // eslint-disable-line react-hooks/exhaustive-deps

    const title = step !== null ? phaseTitle(step, t) : t("inputs.guidedEmpty")
    const progressLabel =
      step !== null
        ? formatGuidedPhaseProgress({
            step,
            language,
          })
        : ""

    const phaseInfoTopic =
      step?.phase === "assumptions"
        ? "assumptions"
        : step?.phase === "estimateUncertaintyIntro" || step?.phase === "cost"
          ? "estimateUncertainty"
          : step?.phase === "driversIntro" || step?.phase === "driver"
            ? "drivers"
            : step?.phase === "correlation"
              ? "correlation"
              : step?.phase === "impact"
                ? "impact"
                : null

    const phaseInfoContent: GuidedPhaseInfoContent | null =
      phaseInfoTopic === "assumptions"
        ? {
            title: t("inputs.guidedAssumptionsHelpTitle"),
            meaning: t("inputs.guidedAssumptionsHelpMeaning"),
            discuss: t("inputs.guidedAssumptionsHelpDiscuss"),
            avoid: t("inputs.guidedAssumptionsHelpAvoid"),
            meaningLabel: t("inputs.guidedHelpMeaningLabel"),
            discussLabel: t("inputs.guidedHelpDiscussLabel"),
            avoidLabel: t("inputs.guidedHelpAvoidLabel"),
          }
        : phaseInfoTopic === "estimateUncertainty"
          ? {
              title: t("inputs.guidedEstimateUncertaintyHelpTitle"),
              meaning: t("inputs.guidedEstimateUncertaintyHelpMeaning"),
              discuss: t("inputs.guidedEstimateUncertaintyHelpDiscuss"),
              avoid: t("inputs.guidedEstimateUncertaintyHelpAvoid"),
              meaningLabel: t("inputs.guidedHelpMeaningLabel"),
              discussLabel: t("inputs.guidedHelpDiscussLabel"),
              avoidLabel: t("inputs.guidedHelpAvoidLabel"),
            }
          : phaseInfoTopic === "drivers"
            ? {
                title: t("inputs.guidedDriverHelpTitle"),
                meaning: t("inputs.guidedDriverHelpMeaning"),
                discuss: t("inputs.guidedDriverHelpDiscuss"),
                avoid: t("inputs.guidedDriverHelpAvoid"),
                meaningLabel: t("inputs.guidedHelpMeaningLabel"),
                discussLabel: t("inputs.guidedHelpDiscussLabel"),
                avoidLabel: t("inputs.guidedHelpAvoidLabel"),
              }
            : phaseInfoTopic === "correlation"
              ? {
                  title: t("inputs.guidedCorrelationHelpTitle"),
                  meaning: t("inputs.guidedCorrelationHelpMeaning"),
                  discuss: t("inputs.guidedCorrelationHelpDiscuss"),
                  avoid: t("inputs.guidedCorrelationHelpAvoid"),
                  meaningLabel: t("inputs.guidedHelpMeaningLabel"),
                  discussLabel: t("inputs.guidedHelpDiscussLabel"),
                  avoidLabel: t("inputs.guidedHelpAvoidLabel"),
                }
              : phaseInfoTopic === "impact"
                ? {
                    title: t("inputs.guidedImpactHelpTitle"),
                    meaning: t("inputs.guidedImpactHelpMeaning"),
                    discuss: t("inputs.guidedImpactHelpDiscuss"),
                    avoid: t("inputs.guidedImpactHelpAvoid"),
                    meaningLabel: t("inputs.guidedHelpMeaningLabel"),
                    discussLabel: t("inputs.guidedHelpDiscussLabel"),
                    avoidLabel: t("inputs.guidedHelpAvoidLabel"),
                  }
                : null

    const focusChromeMeta = useMemo((): GuidedFocusChromeMeta | null => {
      // Only publish while actively embedded as Focus Input (shell owns chrome).
      if (!open || !focusPortalTarget || suspend) return null
      const phase = step?.phase
      const canContinueFromSimulation =
        simulationResultStatus === "valid" || simulationResultStatus === "stale"
      let nextLabel = t("inputs.guidedNext")
      let canGoNext = true
      let secondaryFooter: GuidedFocusChromeMeta["secondaryFooter"] = null
      if (total === 0) {
        nextLabel = t("inputs.guidedClose")
        canGoNext = true
      } else if (phase === "simulation") {
        canGoNext = canContinueFromSimulation
      } else if (phase === "costsEmpty") {
        nextLabel = t("inputs.guidedCostsEmptyAdd")
      } else if (phase === "driversEmpty") {
        nextLabel = t("inputs.guidedDriversEmptyContinue")
        secondaryFooter = {
          kind: "addDrivers",
          label: t("inputs.guidedDriversEmptyAdd"),
        }
      } else if (phase === "correlation") {
        nextLabel = t("inputs.guidedLooksRight")
        secondaryFooter = {
          kind: "adjustCorrelation",
          label: t("inputs.guidedAdjustCorrelation"),
        }
      } else if (phase === "impact") {
        nextLabel = t("inputs.guidedLooksRight")
        secondaryFooter = {
          kind: "adjustImpact",
          label: t("inputs.guidedAdjustImpact"),
        }
      }
      const workflowRowId =
        step && (step.phase === "cost" || step.phase === "driver") ? step.rowId : null
      return {
        title,
        progressLabel,
        projectName: project.name,
        projectIndex,
        workflowPhase: phase ?? null,
        workflowRowId,
        helpTopic: phaseInfoTopic,
        helpContent: phaseInfoContent,
        canGoPrevious: safeIndex > 0,
        canGoNext,
        nextLabel,
        secondaryFooter,
      }
    }, [
      open,
      focusPortalTarget,
      suspend,
      step,
      simulationResultStatus,
      total,
      title,
      progressLabel,
      project.name,
      projectIndex,
      phaseInfoTopic,
      phaseInfoContent,
      safeIndex,
      t,
    ])

    useEffect(() => {
      if (!onFocusChromeMetaChange) return
      onFocusChromeMetaChange(focusChromeMeta)
    }, [focusChromeMeta, onFocusChromeMetaChange])

    useEffect(() => {
      return () => {
        onFocusChromeMetaChange?.(null)
      }
    }, [onFocusChromeMetaChange])

    if (!open) return null
    if (typeof document === "undefined") return null

    const onDialogKeyDown = (event: ReactKeyboardEvent) => {
      if (event.key !== "Enter" || event.metaKey || event.ctrlKey) return
      const target = event.target
      if (
        target instanceof HTMLTextAreaElement ||
        (target instanceof HTMLElement && target.isContentEditable)
      ) {
        return
      }
      if (target instanceof HTMLInputElement) {
        const inputType = target.type
        if (
          inputType === "text" ||
          inputType === "search" ||
          inputType === "number" ||
          target.dataset.guidedInlineEdit
        ) {
          return
        }
      }
      if (
        target instanceof HTMLElement &&
        (target.closest("[data-guided-adjust-correlation]") ||
          target.closest("[data-guided-adjust-impact]") ||
          target.closest("[data-guided-add-cost-items]") ||
          target.closest("[data-guided-add-drivers]") ||
          target.closest("[data-guided-continue-without-drivers]"))
      ) {
        return
      }
      event.preventDefault()
      performGuidedNext()
    }

    const renderBody = () => {
      if (step === null) {
        return (
          <p className="font-sans text-[13px] text-muted-foreground">{t("inputs.guidedEmpty")}</p>
        )
      }

      switch (step.phase) {
        case "focusIntro":
          return <GuidedFocusIntroPhase projectName={project.name} />
        case "projectProfile":
          return (
            <div
              className="mx-auto flex w-full max-w-3xl flex-col gap-5"
              data-guided-phase="projectProfile"
            >
              <ProjectProfileSection
                profile={project.profile}
                embedded
                readOnly={false}
                onChange={onPatchProfile}
              />
            </div>
          )
        case "assumptions":
          return (
            <GuidedAssumptionsPhase
              assumptions={project.assumptions ?? []}
              onAdd={onAddAssumption}
              onUpdate={onUpdateAssumption}
              onRemove={onRemoveAssumption}
            />
          )
        case "incurred":
          return (
            <GuidedIncurredPhase
              incurredCosts={project.incurredCosts}
              onIncurredCostsChange={onIncurredCostsChange}
            />
          )
        case "estimateUncertaintyIntro":
          return (
            <GuidedConceptIntro
              phase="estimateUncertaintyIntro"
              paragraphs={[
                t("inputs.guidedEstimateUncertaintyConceptBasis"),
                t("inputs.guidedEstimateUncertaintyConceptGrouping"),
                t("inputs.guidedEstimateUncertaintyConceptLikely"),
                t("inputs.guidedEstimateUncertaintyConceptUncertainty"),
                t("inputs.guidedEstimateUncertaintyConceptNext"),
              ]}
            />
          )
        case "costsEmpty":
          return (
            <div className="mx-auto flex max-w-3xl flex-col gap-5" data-guided-phase="costsEmpty">
              <p className="m-0 font-sans text-[15px] font-medium leading-snug text-foreground">
                {t("inputs.guidedCostsEmptyHeading")}
              </p>
              <p className="m-0 font-sans text-[13px] leading-relaxed text-muted-foreground">
                {t("inputs.guidedCostsEmptyGuidance")}
              </p>
            </div>
          )
        case "cost":
          if (!costRow) {
            return (
              <p className="font-sans text-[13px] text-muted-foreground">
                {t("inputs.guidedEmpty")}
              </p>
            )
          }
          return <GuidedCostPhase row={costRow} onPatchRow={onPatchRow} />
        case "correlation":
          return (
            <div className="mx-auto flex max-w-3xl flex-col gap-5" data-guided-phase="correlation">
              <div className="space-y-2">
                <p className="m-0 font-sans text-[13px] leading-relaxed text-foreground">
                  {t("inputs.guidedCorrelationGuidance")}
                </p>
                <p className="m-0 font-sans text-[12px] leading-relaxed text-muted-foreground">
                  {t("inputs.guidedCorrelationSecondaryGuidance")}
                </p>
              </div>
              <div className="space-y-2">
                <p
                  className="m-0 font-sans text-[11px] font-medium uppercase tracking-wide text-muted-foreground"
                  data-guided-correlation-summary-heading=""
                >
                  {t("inputs.guidedCorrelationSelectedHeading")}
                </p>
                {correlationSummaries.length === 0 ? (
                  <p
                    className="m-0 font-sans text-[13px] text-muted-foreground"
                    data-guided-correlation-none=""
                  >
                    {t("inputs.guidedCorrelationNone")}
                  </p>
                ) : (
                  <ul className="m-0 list-none space-y-2 p-0" data-guided-correlation-summaries="">
                    {correlationSummaries.map((summary, index) => (
                      <li
                        key={`${summary.rho}-${summary.rowIds.join("-")}-${index}`}
                        className="font-sans text-[13px] text-foreground"
                        data-guided-correlation-summary=""
                      >
                        {formatSavedCorrelationSummaryLabel({
                          summary,
                          nameById: correlationNameById,
                          language,
                          costItemsWord: t("inputs.costCorrelationCostItemsWord"),
                        })}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )
        case "driversIntro":
          return (
            <GuidedConceptIntro
              phase="driversIntro"
              paragraphs={[
                t("inputs.guidedDriversIntroMeaning"),
                t("inputs.guidedDriversIntroDistinction"),
                t("inputs.guidedDriversIntroAvoidDouble"),
                t("inputs.guidedDriversIntroNext"),
              ]}
            />
          )
        case "driversEmpty":
          return (
            <div className="mx-auto flex max-w-3xl flex-col gap-5" data-guided-phase="driversEmpty">
              <p className="m-0 font-sans text-[15px] font-medium leading-snug text-foreground">
                {t("inputs.guidedDriversEmptyHeading")}
              </p>
              <p className="m-0 font-sans text-[13px] leading-relaxed text-muted-foreground">
                {t("inputs.guidedDriversEmptyGuidance")}
              </p>
            </div>
          )
        case "driver":
          if (!driverRow) {
            return (
              <p className="font-sans text-[13px] text-muted-foreground">
                {t("inputs.guidedEmpty")}
              </p>
            )
          }
          return (
            <GuidedDriverPhase
              row={driverRow}
              driverEffects={driverEffects}
              onPatchRow={onPatchRow}
            />
          )
        case "impact":
          return (
            <div className="mx-auto flex max-w-3xl flex-col gap-5" data-guided-phase="impact">
              <div className="space-y-2">
                <p className="m-0 font-sans text-[13px] leading-relaxed text-foreground">
                  {t("inputs.guidedImpactGuidance")}
                </p>
                <p className="m-0 font-sans text-[12px] leading-relaxed text-muted-foreground">
                  {t("inputs.guidedImpactSecondaryGuidance")}
                </p>
              </div>
              <div className="space-y-2">
                <p
                  className="m-0 font-sans text-[11px] font-medium uppercase tracking-wide text-muted-foreground"
                  data-guided-impact-summary-heading=""
                >
                  {t("inputs.guidedImpactAdjustedHeading")}
                </p>
                {impactOverrides.length === 0 ? (
                  <p
                    className="m-0 font-sans text-[13px] text-muted-foreground"
                    data-guided-impact-default=""
                  >
                    {t("inputs.guidedImpactDefaultAll")}
                  </p>
                ) : (
                  <ul className="m-0 list-none space-y-2 p-0" data-guided-impact-overrides="">
                    {impactOverrides.map((item, index) => (
                      <li
                        key={`${item.driverName}-${item.costItemName}-${index}`}
                        className="font-sans text-[13px] text-foreground"
                        data-guided-impact-override=""
                      >
                        {`${item.driverName} → ${item.costItemName}: ${item.impactPct} %`}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )
        case "simulation": {
          const canContinue =
            simulationResultStatus === "valid" || simulationResultStatus === "stale"
          return (
            <div
              className="mx-auto flex min-h-full w-full max-w-sm flex-col items-center justify-center gap-5 text-center"
              data-guided-phase="simulation"
              data-guided-simulation-status={simulationResultStatus}
              data-guided-simulation-centered=""
            >
              {simulationResultStatus === "stale" ? (
                <div className="flex flex-col gap-2" data-guided-simulation-stale="">
                  <p className="m-0 font-sans text-[14px] font-medium text-foreground">
                    {t("projects.staleInputsTitle")}
                  </p>
                  <p className="m-0 font-sans text-[14px] leading-relaxed text-foreground/90">
                    {t("projects.staleInputsNotice")}
                  </p>
                  <div className="flex flex-wrap items-baseline justify-center gap-x-3 gap-y-1">
                    {onShowStaleChanges ? (
                      <button
                        type="button"
                        className="h-auto min-h-0 px-0 py-0 font-sans text-[13px] text-[#1d868c] underline-offset-2 hover:underline"
                        onClick={onShowStaleChanges}
                        data-guided-simulation-show-changes=""
                      >
                        {t("projects.showInputChanges")}
                      </button>
                    ) : null}
                    {onRevertStaleChanges ? (
                      <button
                        type="button"
                        className="h-auto min-h-0 px-0 py-0 font-sans text-[13px] text-[#1d868c] underline-offset-2 hover:underline"
                        onClick={onRevertStaleChanges}
                        data-guided-simulation-revert=""
                      >
                        {t("projects.revertInputChanges")}
                      </button>
                    ) : null}
                  </div>
                </div>
              ) : (
                <p className="m-0 font-sans text-[14px] leading-relaxed text-foreground">
                  {simulationResultStatus === "valid"
                    ? t("inputs.guidedSimulationBodyValid")
                    : t("inputs.guidedSimulationBodyNoResults")}
                </p>
              )}
              {onRunSimulation ? (
                <div
                  className="flex h-8 w-full items-center justify-center"
                  data-guided-simulation-run-slot=""
                >
                  {runSimulationBusy ? (
                    <SpotlightLoadingText
                      text={t("buttons.simulating")}
                      tone="primary"
                      className={cn("font-sans text-xs font-semibold", brandPrimaryTextClass)}
                      data-simulation-loading=""
                      data-guided-simulation-loading=""
                      aria-live="polite"
                      aria-busy="true"
                    />
                  ) : (
                    <Button
                      type="button"
                      disabled={runSimulationDisabled}
                      onClick={onRunSimulation}
                      className={cn(
                        "h-8 w-full shrink-0 font-sans text-xs font-semibold uppercase tracking-wide",
                        runSimulationDisabled && "opacity-40",
                        brandPrimaryButtonClass,
                      )}
                      data-guided-simulation-run=""
                    >
                      {canContinue
                        ? t("inputs.guidedSimulationRunAgain")
                        : t("buttons.runSimulation")}
                    </Button>
                  )}
                </div>
              ) : null}
            </div>
          )
        }
      }
    }

    const renderFooter = () => {
      // Shared Focus shell owns the footer when embedded.
      if (focusPortalTarget) return null

      const inFocusSession = Boolean(focusMode || ensureFocusMode)
      const footerChromeClass = inFocusSession
        ? FOCUS_SESSION_FOOTER_CLASS
        : "flex shrink-0 items-center justify-between gap-3 border-t border-border/50 px-4 py-3 sm:px-5"
      const footerNavClass = buttonVariants({
        variant: "ghost",
        className: FOCUS_SESSION_FOOTER_NAV_BUTTON_CLASS,
      })
      // Focus chrome: Next matches Previous (lightweight). Modal Guided may still
      // use a filled primary CTA on the right for empty-state add actions.
      const footerNextClass = inFocusSession
        ? footerNavClass
        : buttonVariants({
            variant: "default",
            className:
              "h-9 bg-[#1d868c] px-4 text-[13px] hover:bg-[#1d868c]/90 disabled:opacity-40",
          })

      if (total === 0) {
        return (
          <div className={footerChromeClass} data-guided-dialog-footer="">
            <span />
            <button
              type="button"
              onClick={handleCloseGuided}
              className={footerNextClass}
              data-guided-next=""
            >
              {t("inputs.guidedClose")}
            </button>
          </div>
        )
      }

      const phase = step!.phase
      const isReview = phase === "correlation" || phase === "impact"
      const isSimulation = phase === "simulation"
      const isCostsEmpty = phase === "costsEmpty"
      const isDriversEmpty = phase === "driversEmpty"
      const canContinueFromSimulation =
        simulationResultStatus === "valid" || simulationResultStatus === "stale"

      return (
        <div className={footerChromeClass} data-guided-dialog-footer="">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={safeIndex <= 0}
              onClick={goPrevious}
              className={footerNavClass}
              data-guided-previous=""
            >
              {t("inputs.guidedPrevious")}
            </button>
          </div>

          {isSimulation ? (
            <button
              type="button"
              disabled={!canContinueFromSimulation}
              onClick={() => {
                if (canContinueFromSimulation) onContinueToResults?.()
              }}
              className={footerNextClass}
              data-guided-next=""
              data-guided-simulation-next=""
            >
              {t("inputs.guidedNext")}
            </button>
          ) : isCostsEmpty ? (
            <button
              type="button"
              onClick={onAddCostItems}
              className={buttonVariants({
                variant: "default",
                className: "h-9 bg-[#1d868c] px-4 text-[13px] hover:bg-[#1d868c]/90",
              })}
              data-guided-add-cost-items=""
            >
              {t("inputs.guidedCostsEmptyAdd")}
            </button>
          ) : isDriversEmpty ? (
            <div className="flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                onClick={goNext}
                className={footerNavClass}
                data-guided-continue-without-drivers=""
                data-guided-next=""
              >
                {t("inputs.guidedDriversEmptyContinue")}
              </button>
              <button
                type="button"
                onClick={onAddDrivers}
                className={buttonVariants({
                  variant: "default",
                  className: "h-9 bg-[#1d868c] px-4 text-[13px] hover:bg-[#1d868c]/90",
                })}
                data-guided-add-drivers=""
              >
                {t("inputs.guidedDriversEmptyAdd")}
              </button>
            </div>
          ) : isReview ? (
            <div className="flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                onClick={phase === "correlation" ? onAdjustCorrelation : onAdjustImpact}
                className={footerNavClass}
                {...(phase === "correlation"
                  ? { "data-guided-adjust-correlation": "" }
                  : { "data-guided-adjust-impact": "" })}
              >
                {phase === "correlation"
                  ? t("inputs.guidedAdjustCorrelation")
                  : t("inputs.guidedAdjustImpact")}
              </button>
              <button
                type="button"
                onClick={goNext}
                className={footerNextClass}
                data-guided-looks-right=""
                data-guided-next=""
              >
                {t("inputs.guidedLooksRight")}
              </button>
            </div>
          ) : (
            <button type="button" onClick={goNext} className={footerNextClass} data-guided-next="">
              {t("inputs.guidedNext")}
            </button>
          )}
        </div>
      )
    }

    // Embedded Focus path: body-only into the shared shell (no Guided chrome).
    // Soft-suspend keeps the subtree mounted while Results is shown.
    if (focusPortalTarget && (focusMode || ensureFocusMode || suspend)) {
      return createPortal(
        <div
          className={cn(
            "min-h-0 w-full",
            // Fill the Focus content region so Simulation can vertically center.
            step?.phase === "simulation" && "min-h-full",
            suspend && "hidden",
          )}
          data-guided-input-dialog=""
          data-guided-kind={entry}
          data-guided-entry={entry}
          data-guided-focus-mode="true"
          data-guided-embedded-in-focus-host=""
          data-guided-soft-suspend={suspend ? "true" : undefined}
          data-guided-dialog-body=""
          aria-hidden={suspend ? true : undefined}
          // Soft-suspend: not focusable / not pointer-interactive / a11y-hidden.
          {...(suspend ? { inert: true } : {})}
          onKeyDown={suspend ? undefined : onDialogKeyDown}
        >
          {renderBody()}
        </div>,
        focusPortalTarget,
      )
    }

    // Non-embedded suspend: standalone Guided returns null before portal (embedded stays mounted).
    const dialogSurface = (
      // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- stops clicks inside this portal bubbling to React ancestors
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={cn(
          "flex flex-col overflow-hidden rounded-lg border border-border/60 bg-background shadow-md",
          // Size transitions only when leaving/entering the modal (not mid-session).
          !ensureFocusMode &&
            "motion-safe:transition-[width,height,max-width,max-height] motion-safe:duration-200 motion-safe:ease-out",
          browserFullscreen
            ? cn(FOCUS_SESSION_CARD_FULLSCREEN_CLASS, "max-w-full")
            : // Standalone Guided modal / Focus-without-shell share the contained card.
              cn(FOCUS_SESSION_CARD_CLASS, focusMode || ensureFocusMode ? "max-w-full" : null),
        )}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={onDialogKeyDown}
        data-guided-input-surface=""
        data-guided-dialog-frame="stable"
        data-guided-focus-surface={focusMode ? "true" : undefined}
        {...(step ? { "data-guided-phase": step.phase } : {})}
      >
        <div
          className={cn(
            "flex shrink-0 items-start justify-between gap-3 border-b border-border/50",
            focusMode || browserFullscreen ? "px-5 py-4 sm:px-8" : "px-4 py-3 sm:px-5",
          )}
          data-guided-dialog-header=""
        >
          <div className="min-w-0 space-y-1">
            <p
              className="m-0 flex min-w-0 items-center gap-1.5 font-sans text-[12px] font-medium text-muted-foreground"
              data-guided-project-context=""
            >
              <ProjectColorSwatch projectIndex={projectIndex} />
              <span className="min-w-0 truncate" title={project.name}>
                {project.name}
              </span>
            </p>
            <div className="flex min-w-0 items-center gap-1.5">
              <h2
                id={titleId}
                className="m-0 font-sans text-[15px] font-medium tracking-tight text-foreground"
              >
                {title}
              </h2>
              {phaseInfoTopic && phaseInfoContent ? (
                <GuidedPhaseInfo topic={phaseInfoTopic} content={phaseInfoContent} />
              ) : null}
            </div>
            {progressLabel ? (
              <p
                className="m-0 font-sans text-[12px] tabular-nums text-muted-foreground"
                data-guided-progress=""
              >
                {progressLabel}
              </p>
            ) : null}
          </div>
          <div className="flex shrink-0 items-center gap-0.5">
            <button
              ref={focusToggleRef}
              type="button"
              className={buttonVariants({
                variant: "ghost",
                size: "icon-sm",
                className: "text-muted-foreground hover:text-foreground",
              })}
              aria-label={
                browserFullscreen ? t("inputs.guidedExitFocusMode") : t("inputs.guidedFocusMode")
              }
              title={
                browserFullscreen ? t("inputs.guidedExitFocusMode") : t("inputs.guidedFocusMode")
              }
              aria-pressed={browserFullscreen}
              onClick={() => {
                // Icon follows REAL browser fullscreen of the Focus host —
                // never focusMode. Contained Focus shows Maximize; native
                // fullscreen shows Minimize. Independent of Input vs Results.
                if (browserFullscreen) {
                  if (onExitFocusFullscreen) onExitFocusFullscreen()
                  else {
                    exitFullscreenQuietly(focusRootRef.current)
                    setBrowserFullscreen(false)
                  }
                  return
                }
                if (focusMode) {
                  if (onRequestFocusFullscreen) onRequestFocusFullscreen()
                  else enterFullscreenQuietly(focusRootRef.current)
                  return
                }
                enterFocusMode()
              }}
              data-guided-focus-toggle=""
              data-guided-fullscreen-pressed={browserFullscreen ? "true" : undefined}
            >
              {browserFullscreen ? (
                <Minimize2 className="size-4" strokeWidth={2} aria-hidden />
              ) : (
                <Maximize2 className="size-4" strokeWidth={2} aria-hidden />
              )}
            </button>
            <button
              ref={closeBtnRef}
              type="button"
              className={buttonVariants({
                variant: "ghost",
                size: "icon-sm",
                className: "text-muted-foreground hover:text-foreground",
              })}
              aria-label={t("inputs.guidedClose")}
              onClick={handleCloseGuided}
              data-guided-input-close=""
            >
              <X className="size-4" strokeWidth={2} aria-hidden />
            </button>
          </div>
        </div>

        <div
          className={cn(
            "min-h-0 flex-1 overflow-auto",
            focusMode || browserFullscreen
              ? "px-5 py-6 sm:px-8 sm:py-8"
              : "px-4 py-5 sm:px-6 sm:py-6",
          )}
          data-guided-dialog-body=""
        >
          {renderBody()}
        </div>

        {renderFooter()}
      </div>
    )

    if (suspend) return null

    return createPortal(
      <div
        ref={focusRootRef}
        className={cn(
          "flex items-center justify-center",
          browserFullscreen
            ? "h-full min-h-full w-full bg-background p-4 sm:p-8"
            : cn(
                "fixed inset-0 z-[200]",
                // Focus and modal share the dimmed-app backdrop; fullscreen is solid.
                "bg-black/40 p-3 sm:p-5",
              ),
        )}
        role="presentation"
        data-guided-input-dialog=""
        data-guided-kind={entry}
        data-guided-entry={entry}
        data-guided-focus-mode={focusMode ? "true" : undefined}
        data-guided-browser-fullscreen={browserFullscreen ? "true" : undefined}
        data-guided-backdrop="dimmed"
      >
        {dialogSurface}
      </div>,
      document.body,
    )
  },
)
