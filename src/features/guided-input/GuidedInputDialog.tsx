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
import { Check, Maximize2, Minimize2, Plus, X } from "lucide-react"

import { Button, buttonVariants } from "@/shared/ui/button"
import type { FocusModeShellHandle } from "@/features/focus-mode/FocusModeShell"
import { ProjectColorSwatch } from "@/shared/ProjectColorSwatch"
import { ProjectProfileSection } from "@/features/workspace/ProjectProfileSection"
import {
  GuidedPhaseInfo,
  type GuidedPhaseInfoContent,
} from "@/features/guided-input/GuidedPhaseInfo"
import type { GuidedFocusChromeMeta } from "@/domain/guided/guidedFocusChrome"
import { DriverUncertaintyNotesEditor } from "@/features/scenario-tables/DriverUncertaintyNotesEditor"
import { SpotlightLoadingText } from "@/shared/SpotlightLoadingText"
import { brandPrimaryButtonClass, brandPrimaryTextClass } from "@/shared/brand"
import { useI18n } from "@/i18n/useI18n"
import {
  ASSUMPTION_MAX_LENGTH,
  parseAssumptionText,
  type ProjectAssumption,
} from "@/domain/analysis/assumptions"
import {
  deriveSavedCorrelationSummaries,
  formatSavedCorrelationSummaryLabel,
} from "@/domain/simulation/costCorrelationSummaries"
import {
  GUIDED_COST_P10_SLIDER,
  GUIDED_COST_P90_SLIDER,
  GUIDED_DRIVER_MODE_SLIDER_RANGE,
  GUIDED_DRIVER_P10_SLIDER_RANGE,
  GUIDED_DRIVER_P90_SLIDER_RANGE,
  computeGuidedDriverEndpointEffects,
  deriveGuidedCostEffect,
  formatGuidedApproxImpactLabel,
  formatGuidedCostAbsolute,
  formatGuidedSignedPercent,
  getGuidedDriverRangeIssue,
  guidedPercentToStoredString,
  guidedSliderDisplayValue,
  isGuidedDriverValueOutsideWorkingRange,
  normalizeGuidedNumericField,
  pinGuidedSliderDisplayValue,
  snapGuidedSliderValue,
  type GuidedInputKind,
  type GuidedNumericField,
} from "@/domain/guided/guidedInput"
import {
  canRequestFullscreen,
  exitFullscreenIfNeeded,
  isElementFullscreen,
  requestElementFullscreen,
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
import { normalizeIncurredCosts } from "@/domain/analysis/project"
import type { ProjectProfile } from "@/domain/analysis/projectProfile"
import { sanitizeScenarioNumericInput } from "@/domain/results/excelLikeTable"
import { clampCostLikelyAbs } from "@/domain/results/scenarioNumericClamps"
import {
  applyGuidedDefinitionDraftChange,
  cancelGuidedDefinitionDraft,
  commitGuidedDefinitionDraft,
  syncGuidedDefinitionDraft,
  type GuidedDefinitionDraftState,
} from "@/domain/guided/guidedDefinitionDraft"
import {
  COST_DESCRIPTION_MAX_LENGTH,
  DRIVER_DESCRIPTION_MAX_LENGTH,
} from "@/domain/results/rowDefinitions"
import { sliderFillRangePct } from "@/domain/results/sliderFillRange"
import type { CostElementRow, DriverRow } from "@/domain/results/tableRows"
import { parseNumberField } from "@/domain/results/tableRows"
import { cn } from "@/shared/utils"
import { buildPdfImpactOverrides } from "@/pdf/buildPdfReportModel"
import {
  FOCUS_SESSION_CARD_CLASS,
  FOCUS_SESSION_CARD_FULLSCREEN_CLASS,
  FOCUS_SESSION_FOOTER_CLASS,
  FOCUS_SESSION_FOOTER_NAV_BUTTON_CLASS,
} from "@/domain/guided/focusSessionFrame"
import type { Translate } from "@/i18n/messages"

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

const textareaClassName = cn(
  "w-full resize-y rounded-md border border-border/70 bg-background px-3 py-2",
  "font-sans text-[13px] leading-snug text-foreground",
  "placeholder:text-muted-foreground/70",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1d868c]/35",
)

const inlineEditInputClassName = cn(
  "h-9 w-full rounded-md border border-[#1d868c]/45 bg-background px-2",
  "text-center font-sans text-[16px] font-medium tabular-nums text-foreground",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1d868c]/35",
)

const sideCardClassName = cn(
  "grid grid-rows-[auto_2.25rem_1.25rem_auto] items-center gap-y-2",
  "rounded-md border border-border/50 px-3 py-3 text-center",
)

const modeCardClassName = cn(
  "grid grid-rows-[auto_2.25rem_1.25rem_auto] items-center gap-y-2",
  "rounded-md border border-[#1d868c]/35 bg-[#1d868c]/5 px-3 py-3 text-center",
)

const rangeGridClassName = "grid grid-cols-1 gap-4 sm:grid-cols-3 sm:items-stretch sm:gap-4"

const assumptionInputClassName = cn(
  "h-8 min-w-0 flex-1 rounded-md border border-border/70 bg-background px-2.5",
  "font-sans text-[13px] text-foreground placeholder:text-muted-foreground/60",
  "outline-none focus-visible:ring-2 focus-visible:ring-[#1d868c]/35",
)

function GuidedRangeSlider({
  min,
  max,
  step,
  value,
  origin,
  blank,
  ariaLabel,
  onCommit,
  testId,
}: {
  min: number
  max: number
  step: number
  value: number
  origin: number
  blank: boolean
  ariaLabel: string
  onCommit: (value: number) => void
  testId?: string
}) {
  const { startPct, endPct } = sliderFillRangePct(value, min, max, origin)
  const fillWidthPct = Math.max(0, endPct - startPct)

  return (
    <div className="relative h-5 w-full">
      <div aria-hidden className="pointer-events-none absolute inset-y-0 left-[6px] right-[6px]">
        <div className="absolute top-1/2 h-[3px] w-full -translate-y-1/2 rounded-full bg-[color-mix(in_oklab,var(--border)_70%,var(--muted-foreground)_18%)]" />
        {!blank && fillWidthPct > 0 ? (
          <div
            className="absolute top-1/2 h-[3px] -translate-y-1/2 rounded-full bg-[#1d868c]/70"
            style={{
              left: `${startPct}%`,
              width: `${fillWidthPct}%`,
            }}
          />
        ) : null}
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-label={ariaLabel}
        data-guided-slider={testId}
        data-guided-slider-blank={blank ? "true" : "false"}
        className={cn(
          "inline-magnitude-slider pointer-events-auto relative z-10 h-5 w-full cursor-pointer",
          blank && "opacity-55",
        )}
        onChange={(e) => {
          const next = snapGuidedSliderValue(Number(e.target.value), step)
          onCommit(next)
        }}
      />
    </div>
  )
}

/**
 * Focus definition textarea — local draft while typing.
 * Blur (or Cmd/Ctrl+Enter) commits once; Escape restores canonical text
 * without leaving Focus / Guided.
 */
function GuidedDefinitionTextarea({
  rowId,
  sourceDescription,
  maxLength,
  placeholder,
  onCommit,
}: {
  rowId: string
  sourceDescription: string
  maxLength: number
  placeholder: string
  onCommit: (rowId: string, description: string) => void
}) {
  const [state, setState] = useState<GuidedDefinitionDraftState>(() => ({
    rowId,
    draft: String(sourceDescription ?? ""),
    baseline: String(sourceDescription ?? ""),
    dirty: false,
  }))
  const stateRef = useRef(state)
  const onCommitRef = useRef(onCommit)
  const maxLengthRef = useRef(maxLength)
  stateRef.current = state
  onCommitRef.current = onCommit
  maxLengthRef.current = maxLength

  useEffect(() => {
    const synced = syncGuidedDefinitionDraft(stateRef.current, {
      rowId,
      sourceDescription,
      maxLength,
    })
    if (synced.pendingCommit) {
      onCommitRef.current(synced.pendingCommit.rowId, synced.pendingCommit.description)
    }
    stateRef.current = synced.state
    setState(synced.state)
  }, [rowId, sourceDescription, maxLength])

  const commitCurrent = () => {
    const result = commitGuidedDefinitionDraft(stateRef.current, maxLengthRef.current)
    stateRef.current = result.state
    setState(result.state)
    if (result.commit) {
      onCommitRef.current(result.commit.rowId, result.commit.description)
    }
  }

  return (
    <textarea
      id="guided-definition"
      rows={2}
      maxLength={maxLength}
      value={state.draft}
      placeholder={placeholder}
      onChange={(event) => {
        setState((prev) => {
          const next = applyGuidedDefinitionDraftChange(
            prev,
            event.target.value,
            maxLengthRef.current,
          )
          stateRef.current = next
          return next
        })
      }}
      onBlur={() => {
        commitCurrent()
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault()
          event.stopPropagation()
          setState((prev) => {
            const next = cancelGuidedDefinitionDraft(prev)
            stateRef.current = next
            return next
          })
          return
        }
        // DefineRowEditor convention: Cmd/Ctrl+Enter commits without advancing.
        if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
          event.preventDefault()
          commitCurrent()
        }
      }}
      className={textareaClassName}
      data-guided-description=""
    />
  )
}

/**
 * Click-to-edit numeric display — not a permanent form field.
 *
 * `commitMode`:
 * - `"enter"` — uncertainty ranges: Enter commits; Escape / blur discard draft
 * - `"blur"` — incurred (default): Enter or blur commits; Escape cancels
 */
function GuidedInlineValue({
  rowId,
  field,
  rawValue,
  displayText,
  ariaLabel,
  displayAttrs,
  onCommit,
  commitMode = "blur",
}: {
  rowId: string
  field: GuidedNumericField
  rawValue: string
  displayText: string
  ariaLabel: string
  displayAttrs?: Record<string, string | undefined>
  onCommit: (nextRaw: string) => void
  commitMode?: "enter" | "blur"
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(rawValue)
  const inputRef = useRef<HTMLInputElement | null>(null)
  /** Skip the blur handler after Enter/Escape already finished the edit. */
  const skipBlurAction = useRef(false)

  useEffect(() => {
    setEditing(false)
    setDraft(rawValue)
  }, [rowId, field])

  useEffect(() => {
    if (!editing) setDraft(rawValue)
  }, [rawValue, editing])

  useEffect(() => {
    if (!editing) return
    inputRef.current?.focus()
    inputRef.current?.select()
  }, [editing])

  const save = () => {
    onCommit(draft)
    setEditing(false)
  }

  const discardDraft = () => {
    setDraft(rawValue)
    setEditing(false)
  }

  const cancel = () => {
    skipBlurAction.current = true
    discardDraft()
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="text"
        inputMode="decimal"
        value={draft}
        aria-label={ariaLabel}
        data-guided-inline-edit={field}
        data-guided-field={field}
        data-guided-commit-mode={commitMode}
        className={inlineEditInputClassName}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault()
            skipBlurAction.current = true
            save()
            return
          }
          if (e.key === "Escape") {
            e.preventDefault()
            cancel()
          }
        }}
        onBlur={() => {
          if (skipBlurAction.current) {
            skipBlurAction.current = false
            return
          }
          // Uncertainty ranges: blur discards uncommitted draft (Enter-only).
          // Incurred keeps blur-to-save.
          if (commitMode === "enter") {
            discardDraft()
            return
          }
          save()
        }}
      />
    )
  }

  return (
    <button
      type="button"
      data-guided-inline-display={field}
      {...displayAttrs}
      className={cn(
        "m-0 flex h-9 w-full items-center justify-center",
        "cursor-pointer rounded-md px-2 text-center",
        "font-sans text-[18px] font-medium tabular-nums text-foreground",
        "hover:bg-[#1d868c]/10 hover:underline hover:decoration-[#1d868c]/40 hover:underline-offset-4",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1d868c]/35",
      )}
      aria-label={ariaLabel}
      onClick={() => {
        setDraft(rawValue)
        setEditing(true)
      }}
    >
      {displayText}
    </button>
  )
}

function SideLabel({ children, accent }: { children: string; accent?: boolean }) {
  return (
    <p
      className={cn(
        "m-0 font-sans text-[11px] font-medium uppercase tracking-wide",
        accent ? "text-[#1d868c]" : "text-muted-foreground",
      )}
    >
      {children}
    </p>
  )
}

function SecondaryEffect({
  text,
  title,
  testAttr,
}: {
  text: string
  title?: string
  testAttr: string
}) {
  return (
    <p
      className="m-0 flex h-5 items-center justify-center font-sans text-[12px] tabular-nums text-muted-foreground"
      title={title}
      {...{ [testAttr]: "" }}
    >
      {text}
    </p>
  )
}

function SecondarySpacer() {
  return <div className="h-5" aria-hidden />
}

function GuidedAssumptionsPhase({
  assumptions,
  onAdd,
  onUpdate,
  onRemove,
}: {
  assumptions: readonly ProjectAssumption[]
  onAdd: (text: string) => void
  onUpdate: (assumptionId: string, text: string) => void
  onRemove: (assumptionId: string) => void
}) {
  const { t } = useI18n()
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState("")
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState("")
  const addInputRef = useRef<HTMLInputElement | null>(null)
  const editInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (adding) addInputRef.current?.focus()
  }, [adding])

  useEffect(() => {
    if (editingId !== null) editInputRef.current?.focus()
  }, [editingId])

  const openAdd = () => {
    setEditingId(null)
    setEditDraft("")
    setDraft("")
    setAdding(true)
  }

  const cancelAdd = () => {
    setAdding(false)
    setDraft("")
  }

  const commitAdd = () => {
    const parsed = parseAssumptionText(draft)
    if (parsed === null) {
      cancelAdd()
      return
    }
    onAdd(parsed)
    cancelAdd()
  }

  const startEdit = (assumption: ProjectAssumption) => {
    setAdding(false)
    setDraft("")
    setEditingId(assumption.id)
    setEditDraft(assumption.text)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditDraft("")
  }

  const commitEdit = () => {
    if (editingId === null) return
    const parsed = parseAssumptionText(editDraft)
    if (parsed === null) {
      cancelEdit()
      return
    }
    onUpdate(editingId, parsed)
    cancelEdit()
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-5" data-guided-phase="assumptions">
      <div className="space-y-2.5">
        <p className="m-0 font-sans text-[13px] leading-relaxed text-muted-foreground">
          {t("inputs.guidedAssumptionsGuidance")}
        </p>
        <p className="m-0 font-sans text-[12px] leading-relaxed text-muted-foreground">
          {t("inputs.guidedAssumptionsSecondaryGuidance")}
        </p>
        <p className="m-0 font-sans text-[12px] leading-snug text-muted-foreground/85">
          {t("inputs.guidedAssumptionsExamples")}
        </p>
      </div>

      {assumptions.length === 0 && !adding ? (
        <div className="space-y-3">
          <p className="m-0 font-sans text-[13px] text-muted-foreground">
            {t("inputs.guidedAssumptionsEmpty")}
          </p>
          <button
            type="button"
            onClick={openAdd}
            className={cn(
              "inline-flex items-center gap-1.5 font-sans text-[13px]",
              "text-[#1d868c] hover:underline",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1d868c]/35",
            )}
            data-guided-assumption-add=""
          >
            <Plus className="size-3.5 shrink-0" strokeWidth={2.25} aria-hidden />
            {t("inputs.guidedAssumptionsAdd")}
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <button
            type="button"
            onClick={openAdd}
            className={cn(
              "inline-flex items-center gap-1.5 font-sans text-[12px]",
              "text-muted-foreground hover:text-foreground",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1d868c]/35",
            )}
            data-guided-assumption-add=""
          >
            <Plus className="size-3.5 shrink-0" strokeWidth={2.25} aria-hidden />
            {t("inputs.guidedAssumptionsAdd")}
          </button>

          {adding ? (
            <div className="flex min-w-0 items-center gap-1.5">
              <input
                ref={addInputRef}
                type="text"
                value={draft}
                maxLength={ASSUMPTION_MAX_LENGTH}
                placeholder={t("inputs.assumptionsPlaceholder")}
                aria-label={t("inputs.assumptionsPlaceholder")}
                data-guided-assumption-draft=""
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    e.stopPropagation()
                    commitAdd()
                  } else if (e.key === "Escape") {
                    e.preventDefault()
                    e.stopPropagation()
                    cancelAdd()
                  }
                }}
                className={assumptionInputClassName}
              />
              <button
                type="button"
                onClick={commitAdd}
                aria-label={t("inputs.assumptionsSave")}
                className={cn(
                  "flex size-8 shrink-0 items-center justify-center rounded-md",
                  "text-[#1d868c] hover:bg-[#1d868c]/10",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1d868c]/35",
                )}
              >
                <Check className="size-3.5" aria-hidden />
              </button>
            </div>
          ) : null}

          <ul className="m-0 list-none space-y-2 p-0">
            {assumptions.map((assumption) =>
              editingId === assumption.id ? (
                <li key={assumption.id} className="flex min-w-0 items-center gap-1.5">
                  <input
                    ref={editInputRef}
                    type="text"
                    value={editDraft}
                    maxLength={ASSUMPTION_MAX_LENGTH}
                    aria-label={t("inputs.assumptionsPlaceholder")}
                    data-guided-assumption-edit=""
                    onChange={(e) => setEditDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault()
                        e.stopPropagation()
                        commitEdit()
                      } else if (e.key === "Escape") {
                        e.preventDefault()
                        e.stopPropagation()
                        cancelEdit()
                      }
                    }}
                    className={assumptionInputClassName}
                  />
                  <button
                    type="button"
                    onClick={commitEdit}
                    aria-label={t("inputs.assumptionsSave")}
                    className={cn(
                      "flex size-8 shrink-0 items-center justify-center rounded-md",
                      "text-[#1d868c] hover:bg-[#1d868c]/10",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1d868c]/35",
                    )}
                  >
                    <Check className="size-3.5" aria-hidden />
                  </button>
                </li>
              ) : (
                <li
                  key={assumption.id}
                  className={cn(
                    "group/assumption flex min-w-0 items-center gap-1",
                    "rounded-md border border-border/60 bg-background",
                  )}
                  data-guided-assumption=""
                >
                  <button
                    type="button"
                    onClick={() => startEdit(assumption)}
                    className={cn(
                      "min-w-0 flex-1 truncate px-3 py-2 text-left",
                      "font-sans text-[13px] text-foreground",
                      "hover:bg-[#1d868c]/5",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#1d868c]/35",
                    )}
                  >
                    {assumption.text}
                  </button>
                  <button
                    type="button"
                    onClick={() => onRemove(assumption.id)}
                    aria-label={t("inputs.assumptionsRemove")}
                    className={cn(
                      "mr-1 flex size-7 shrink-0 items-center justify-center rounded",
                      "text-muted-foreground opacity-70 hover:bg-destructive/10 hover:text-destructive",
                      "focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1d868c]/35",
                      "sm:opacity-0 sm:group-hover/assumption:opacity-100",
                    )}
                    data-guided-assumption-remove=""
                  >
                    <X className="size-3.5" aria-hidden />
                  </button>
                </li>
              ),
            )}
          </ul>
        </div>
      )}
    </div>
  )
}

function GuidedIncurredPhase({
  incurredCosts,
  onIncurredCostsChange,
}: {
  incurredCosts: number
  onIncurredCostsChange: (value: number) => void
}) {
  const { t, language } = useI18n()
  const safe = normalizeIncurredCosts(incurredCosts)
  const rawValue = safe === 0 ? "" : String(safe)
  const displayText = safe === 0 ? "—" : formatGuidedCostAbsolute(safe, language)

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-5" data-guided-phase="incurred">
      <div className="space-y-4">
        <p className="m-0 font-sans text-[13px] leading-relaxed text-muted-foreground">
          {t("inputs.guidedIncurredGuidance")}
        </p>
        <p className="m-0 font-sans text-[13px] leading-relaxed text-muted-foreground">
          {t("inputs.guidedIncurredSecondaryGuidance")}
        </p>
      </div>

      <div
        className={cn(
          "mx-auto w-full max-w-sm space-y-2 rounded-md border border-border/50 px-4 py-4 text-center",
        )}
        data-guided-incurred-value=""
      >
        <p className="m-0 font-sans text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          {t("inputs.guidedIncurredValueLabel")}
        </p>
        <GuidedInlineValue
          rowId="__incurred__"
          field="likely"
          rawValue={rawValue}
          displayText={displayText}
          ariaLabel={t("projects.incurredCostsInputLabel")}
          displayAttrs={{ "data-guided-incurred-display": "true" }}
          commitMode="blur"
          onCommit={(next) => {
            const sanitized = sanitizeScenarioNumericInput(next)
            const clamped = clampCostLikelyAbs(sanitized)
            if (clamped.trim() === "") {
              onIncurredCostsChange(0)
              return
            }
            const parsed = parseNumberField(clamped)
            onIncurredCostsChange(normalizeIncurredCosts(parsed ?? 0))
          }}
        />
      </div>
    </div>
  )
}

function phaseTitle(step: GuidedWorkflowStep, t: Translate): string {
  switch (step.phase) {
    case "focusIntro":
      return t("inputs.guidedPhaseFocusIntro")
    case "projectProfile":
      return t("inputs.guidedPhaseProjectProfile")
    case "assumptions":
      return t("inputs.guidedPhaseAssumptions")
    case "incurred":
      return t("inputs.guidedPhaseIncurred")
    case "estimateUncertaintyIntro":
      return t("inputs.guidedPhaseEstimateUncertainty")
    case "costsEmpty":
    case "cost":
      return t("inputs.guidedPhaseCost")
    case "correlation":
      return t("inputs.guidedPhaseCorrelation")
    case "driversIntro":
    case "driversEmpty":
    case "driver":
      return t("inputs.guidedPhaseDrivers")
    case "impact":
      return t("inputs.guidedPhaseImpact")
    case "simulation":
      return t("inputs.guidedPhaseSimulation")
  }
}

function GuidedConceptIntro(args: {
  phase: "estimateUncertaintyIntro" | "driversIntro"
  paragraphs: readonly string[]
}) {
  return (
    <div
      className="mx-auto flex max-w-3xl flex-col gap-4"
      data-guided-phase={args.phase}
      data-guided-concept-intro=""
    >
      {args.paragraphs.map((text, index) => (
        <p
          key={`${args.phase}-${index}`}
          className={cn(
            "m-0 font-sans text-[13px] leading-relaxed",
            index === args.paragraphs.length - 1 ? "text-muted-foreground" : "text-foreground/90",
          )}
        >
          {text}
        </p>
      ))}
    </div>
  )
}

/** Entry step of the primary Focus mode session — orientation only, no inputs. */
function GuidedFocusIntroPhase({ projectName }: { projectName: string }) {
  const { t } = useI18n()
  const overview = [
    t("inputs.focusOverviewPhase1"),
    t("inputs.focusOverviewPhase2"),
    t("inputs.focusOverviewPhase3"),
    t("inputs.focusOverviewPhase4"),
  ]

  return (
    <div
      className="mx-auto flex max-w-3xl flex-col gap-4"
      data-guided-phase="focusIntro"
      data-focus-intro=""
    >
      <p className="m-0 font-sans text-[13px] leading-relaxed text-foreground/90">
        {t("inputs.focusIntroBody")}
      </p>
      {projectName.trim() ? (
        <p
          className="m-0 font-sans text-[12px] leading-snug text-muted-foreground"
          data-focus-intro-context=""
        >
          {projectName}
        </p>
      ) : null}
      <ol className="m-0 flex list-none flex-col gap-2 p-0" data-focus-intro-overview="">
        {overview.map((label, index) => (
          <li
            key={label}
            className="flex items-center gap-2.5 font-sans text-[13px] leading-snug text-foreground/90"
          >
            <span
              aria-hidden
              className={cn(
                "flex size-5 shrink-0 items-center justify-center rounded-full",
                "border border-[#1d868c]/45 bg-[#1d868c]/10",
                "font-sans text-[11px] font-medium tabular-nums text-[#1d868c]",
              )}
            >
              {index + 1}
            </span>
            {label}
          </li>
        ))}
      </ol>
    </div>
  )
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
        void exitFullscreenIfNeeded(focusRootRef.current).catch(() => {})
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
      const root = focusRootRef.current
      if (!root || !canRequestFullscreen(root)) return
      void requestElementFullscreen(root).catch(() => {})
    }

    const handleCloseGuided = () => {
      if (onExitFocusFullscreen) onExitFocusFullscreen()
      else void exitFullscreenIfNeeded(focusRootRef.current).catch(() => {})
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

    const renderCostPhase = (row: CostElementRow) => {
      const costOptBlank = parseNumberField(row.optimistic) === null
      const costPesBlank = parseNumberField(row.pessimistic) === null
      const costLikelyBlank = parseNumberField(row.likely) === null
      const costOptSlider = guidedSliderDisplayValue(row.optimistic, GUIDED_COST_P10_SLIDER.max)
      const costPesSlider = guidedSliderDisplayValue(row.pessimistic, GUIDED_COST_P90_SLIDER.min)
      const costP10Effect = deriveGuidedCostEffect(row.likely, row.optimistic)
      const costP90Effect = deriveGuidedCostEffect(row.likely, row.pessimistic)
      const costMAbs = parseNumberField(row.likely)

      const patchNumeric = (field: GuidedNumericField, value: string) => {
        const normalized = normalizeGuidedNumericField({
          kind: "cost",
          field,
          value,
          row,
        })
        onPatchRow(row.id, { [field]: normalized })
      }

      const commitPercentField = (field: GuidedNumericField, value: number) => {
        patchNumeric(field, guidedPercentToStoredString(value))
      }

      return (
        <div className="mx-auto flex max-w-3xl flex-col gap-5" data-guided-phase="cost">
          <h3
            className="m-0 font-sans text-[22px] font-medium leading-snug tracking-tight text-foreground sm:text-[26px]"
            data-guided-factor-name=""
          >
            {row.name.trim() || t("inputs.guidedUnnamed")}
          </h3>

          <div className="space-y-1.5">
            <label
              htmlFor="guided-definition"
              className="font-sans text-[11px] font-medium uppercase tracking-wide text-muted-foreground"
            >
              {t("inputs.guidedDefinitionLabel")}
            </label>
            <GuidedDefinitionTextarea
              rowId={row.id}
              sourceDescription={String(row.description ?? "")}
              maxLength={COST_DESCRIPTION_MAX_LENGTH}
              placeholder={t("inputs.defineCostDescriptionPlaceholder")}
              onCommit={(id, description) => {
                onPatchRow(id, { description })
              }}
            />
          </div>

          <div className="space-y-1.5" data-guided-cost-uncertainty="">
            <p className="m-0 font-sans text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              {t("inputs.guidedDriverUncertaintyNotesHeading")}
            </p>
            <ul className="m-0 list-disc space-y-1.5 pl-4 marker:text-muted-foreground">
              <li className="font-sans text-[13px] leading-snug text-muted-foreground">
                {t("inputs.guidedCostLikelyPrompt")}
              </li>
              <li className="font-sans text-[13px] leading-snug text-muted-foreground">
                {t("inputs.guidedCostRangeSourcePrompt")}
              </li>
              <li className="font-sans text-[13px] leading-snug text-muted-foreground">
                {t("inputs.guidedCostRangePrompt")}
              </li>
            </ul>
            <p className="m-0 mt-2 font-sans text-[12px] leading-snug text-muted-foreground">
              {t("inputs.guidedCostRangeReminder")}
            </p>

            <div
              className={`${rangeGridClassName} pt-3`}
              data-guided-cost-range=""
              data-guided-omp-align="primary"
            >
              <div className={sideCardClassName} data-guided-side="p10">
                <SideLabel>{t("inputs.guidedP10")}</SideLabel>
                <GuidedInlineValue
                  rowId={row.id}
                  field="optimistic"
                  rawValue={row.optimistic}
                  displayText={
                    costOptBlank ? "—" : formatGuidedSignedPercent(costOptSlider, language)
                  }
                  ariaLabel={t("inputs.guidedP10")}
                  displayAttrs={{ "data-guided-cost-p10-pct": "" }}
                  commitMode="enter"
                  onCommit={(next) => patchNumeric("optimistic", next)}
                />
                <SecondaryEffect
                  text={formatGuidedApproxImpactLabel(costP10Effect, language)}
                  testAttr="data-guided-cost-p10-effect"
                />
                <GuidedRangeSlider
                  min={GUIDED_COST_P10_SLIDER.min}
                  max={GUIDED_COST_P10_SLIDER.max}
                  step={GUIDED_COST_P10_SLIDER.step}
                  value={Math.min(
                    GUIDED_COST_P10_SLIDER.max,
                    Math.max(GUIDED_COST_P10_SLIDER.min, costOptSlider),
                  )}
                  origin={0}
                  blank={costOptBlank}
                  ariaLabel={t("inputs.guidedP10")}
                  testId="cost-p10"
                  onCommit={(v) => commitPercentField("optimistic", v)}
                />
              </div>

              <div className={modeCardClassName} data-guided-side="mode">
                <SideLabel accent>{t("inputs.guidedMostLikely")}</SideLabel>
                <GuidedInlineValue
                  rowId={row.id}
                  field="likely"
                  rawValue={row.likely}
                  displayText={costLikelyBlank ? "—" : formatGuidedCostAbsolute(costMAbs, language)}
                  ariaLabel={t("inputs.guidedMostLikely")}
                  displayAttrs={{ "data-guided-cost-m-abs": "" }}
                  commitMode="enter"
                  onCommit={(next) => patchNumeric("likely", next)}
                />
                <SecondarySpacer />
                <div className="h-5" aria-hidden />
              </div>

              <div className={sideCardClassName} data-guided-side="p90">
                <SideLabel>{t("inputs.guidedP90")}</SideLabel>
                <GuidedInlineValue
                  rowId={row.id}
                  field="pessimistic"
                  rawValue={row.pessimistic}
                  displayText={
                    costPesBlank ? "—" : formatGuidedSignedPercent(costPesSlider, language)
                  }
                  ariaLabel={t("inputs.guidedP90")}
                  displayAttrs={{ "data-guided-cost-p90-pct": "" }}
                  commitMode="enter"
                  onCommit={(next) => patchNumeric("pessimistic", next)}
                />
                <SecondaryEffect
                  text={formatGuidedApproxImpactLabel(costP90Effect, language)}
                  testAttr="data-guided-cost-p90-effect"
                />
                <GuidedRangeSlider
                  min={GUIDED_COST_P90_SLIDER.min}
                  max={GUIDED_COST_P90_SLIDER.max}
                  step={GUIDED_COST_P90_SLIDER.step}
                  value={Math.min(
                    GUIDED_COST_P90_SLIDER.max,
                    Math.max(GUIDED_COST_P90_SLIDER.min, costPesSlider),
                  )}
                  origin={0}
                  blank={costPesBlank}
                  ariaLabel={t("inputs.guidedP90")}
                  testId="cost-p90"
                  onCommit={(v) => commitPercentField("pessimistic", v)}
                />
              </div>
            </div>
          </div>
        </div>
      )
    }

    const renderDriverPhase = (row: DriverRow) => {
      const driverOptBlank = parseNumberField(row.optimistic) === null
      const driverLikelyBlank = parseNumberField(row.likely) === null
      const driverPesBlank = parseNumberField(row.pessimistic) === null
      const driverOptSlider = guidedSliderDisplayValue(row.optimistic, 0)
      const driverLikelySlider = guidedSliderDisplayValue(row.likely, 0)
      const driverPesSlider = guidedSliderDisplayValue(row.pessimistic, 0)
      const driverOptOutside = isGuidedDriverValueOutsideWorkingRange("optimistic", row.optimistic)
      const driverLikelyOutside = isGuidedDriverValueOutsideWorkingRange("likely", row.likely)
      const driverPesOutside = isGuidedDriverValueOutsideWorkingRange(
        "pessimistic",
        row.pessimistic,
      )
      const rangeIssue = getGuidedDriverRangeIssue(row)

      const patchNumeric = (field: GuidedNumericField, value: string) => {
        const normalized = normalizeGuidedNumericField({
          kind: "driver",
          field,
          value,
          row,
        })
        onPatchRow(row.id, { [field]: normalized })
      }

      const commitPercentField = (field: GuidedNumericField, value: number) => {
        patchNumeric(field, guidedPercentToStoredString(value))
      }

      const outsideCue = (
        <p
          className="m-0 font-sans text-[10px] leading-snug text-muted-foreground/80"
          data-guided-outside-working-range=""
        >
          {t("inputs.guidedDriverOutsideWorkingRange")}
        </p>
      )

      return (
        <div className="mx-auto flex max-w-5xl flex-col gap-5" data-guided-phase="driver">
          <h3
            className="m-0 font-sans text-[22px] font-medium leading-snug tracking-tight text-foreground sm:text-[26px]"
            data-guided-factor-name=""
          >
            {row.name.trim() || t("inputs.guidedUnnamed")}
          </h3>

          <div className="space-y-1.5">
            <label
              htmlFor="guided-definition"
              className="font-sans text-[11px] font-medium uppercase tracking-wide text-muted-foreground"
            >
              {t("inputs.guidedDefinitionLabel")}
            </label>
            <GuidedDefinitionTextarea
              rowId={row.id}
              sourceDescription={String(row.description ?? "")}
              maxLength={DRIVER_DESCRIPTION_MAX_LENGTH}
              placeholder={t("inputs.defineDriverDescriptionPlaceholder")}
              onCommit={(id, description) => {
                onPatchRow(id, { description })
              }}
            />
          </div>

          <div className="space-y-1.5" data-guided-driver-uncertainty-notes="">
            <p className="m-0 font-sans text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              {t("inputs.guidedDriverUncertaintyNotesHeading")}
            </p>
            <p className="m-0 font-sans text-[12px] leading-snug text-muted-foreground">
              {t("inputs.guidedDriverUncertaintyNotesHelper")}
            </p>
            <div className="pt-3" data-guided-driver-uncertainty-notes-body="">
              <DriverUncertaintyNotesEditor
                notes={row.uncertaintyNotes}
                onChange={(next) => {
                  onPatchRow(row.id, { uncertaintyNotes: next })
                }}
              />
            </div>

            <p className="m-0 pt-2 font-sans text-[12px] leading-snug text-muted-foreground">
              {t("inputs.guidedDriverRangePrompt")}
            </p>

            <div className="space-y-2">
              <div
                className={rangeGridClassName}
                data-guided-driver-range=""
                data-guided-omp-align="primary"
              >
                <div className={sideCardClassName} data-guided-side="p10">
                  <SideLabel>{t("inputs.guidedP10")}</SideLabel>
                  <GuidedInlineValue
                    rowId={row.id}
                    field="optimistic"
                    rawValue={row.optimistic}
                    displayText={
                      driverOptBlank ? "—" : formatGuidedSignedPercent(driverOptSlider, language)
                    }
                    ariaLabel={t("inputs.guidedP10")}
                    displayAttrs={{ "data-guided-driver-p10": "" }}
                    commitMode="enter"
                    onCommit={(next) => patchNumeric("optimistic", next)}
                  />
                  <SecondaryEffect
                    text={formatGuidedApproxImpactLabel(driverEffects.p10Effect, language)}
                    title={t("inputs.guidedDriverEffectHint")}
                    testAttr="data-guided-driver-p10-effect"
                  />
                  <GuidedRangeSlider
                    min={GUIDED_DRIVER_P10_SLIDER_RANGE.min}
                    max={GUIDED_DRIVER_P10_SLIDER_RANGE.max}
                    step={GUIDED_DRIVER_P10_SLIDER_RANGE.step}
                    value={pinGuidedSliderDisplayValue(
                      driverOptSlider,
                      GUIDED_DRIVER_P10_SLIDER_RANGE,
                    )}
                    origin={0}
                    blank={driverOptBlank}
                    ariaLabel={t("inputs.guidedP10")}
                    testId="driver-p10"
                    onCommit={(v) => commitPercentField("optimistic", v)}
                  />
                  {driverOptOutside ? outsideCue : null}
                </div>

                <div className={modeCardClassName} data-guided-side="mode">
                  <SideLabel accent>{t("inputs.guidedMostLikely")}</SideLabel>
                  <GuidedInlineValue
                    rowId={row.id}
                    field="likely"
                    rawValue={row.likely}
                    displayText={
                      driverLikelyBlank
                        ? "—"
                        : formatGuidedSignedPercent(driverLikelySlider, language)
                    }
                    ariaLabel={t("inputs.guidedMostLikely")}
                    displayAttrs={{ "data-guided-driver-m": "" }}
                    commitMode="enter"
                    onCommit={(next) => patchNumeric("likely", next)}
                  />
                  <SecondaryEffect
                    text={formatGuidedApproxImpactLabel(driverEffects.modeEffect, language)}
                    title={t("inputs.guidedDriverEffectHint")}
                    testAttr="data-guided-driver-m-effect"
                  />
                  <GuidedRangeSlider
                    min={GUIDED_DRIVER_MODE_SLIDER_RANGE.min}
                    max={GUIDED_DRIVER_MODE_SLIDER_RANGE.max}
                    step={GUIDED_DRIVER_MODE_SLIDER_RANGE.step}
                    value={pinGuidedSliderDisplayValue(
                      driverLikelySlider,
                      GUIDED_DRIVER_MODE_SLIDER_RANGE,
                    )}
                    origin={0}
                    blank={driverLikelyBlank}
                    ariaLabel={t("inputs.guidedMostLikely")}
                    testId="driver-m"
                    onCommit={(v) => commitPercentField("likely", v)}
                  />
                  {driverLikelyOutside ? outsideCue : null}
                </div>

                <div className={sideCardClassName} data-guided-side="p90">
                  <SideLabel>{t("inputs.guidedP90")}</SideLabel>
                  <GuidedInlineValue
                    rowId={row.id}
                    field="pessimistic"
                    rawValue={row.pessimistic}
                    displayText={
                      driverPesBlank ? "—" : formatGuidedSignedPercent(driverPesSlider, language)
                    }
                    ariaLabel={t("inputs.guidedP90")}
                    displayAttrs={{ "data-guided-driver-p90": "" }}
                    commitMode="enter"
                    onCommit={(next) => patchNumeric("pessimistic", next)}
                  />
                  <SecondaryEffect
                    text={formatGuidedApproxImpactLabel(driverEffects.p90Effect, language)}
                    title={t("inputs.guidedDriverEffectHint")}
                    testAttr="data-guided-driver-p90-effect"
                  />
                  <GuidedRangeSlider
                    min={GUIDED_DRIVER_P90_SLIDER_RANGE.min}
                    max={GUIDED_DRIVER_P90_SLIDER_RANGE.max}
                    step={GUIDED_DRIVER_P90_SLIDER_RANGE.step}
                    value={pinGuidedSliderDisplayValue(
                      driverPesSlider,
                      GUIDED_DRIVER_P90_SLIDER_RANGE,
                    )}
                    origin={0}
                    blank={driverPesBlank}
                    ariaLabel={t("inputs.guidedP90")}
                    testId="driver-p90"
                    onCommit={(v) => commitPercentField("pessimistic", v)}
                  />
                  {driverPesOutside ? outsideCue : null}
                </div>
              </div>

              {rangeIssue !== null ? (
                <p
                  role="status"
                  data-guided-driver-range-warning={rangeIssue}
                  className="m-0 font-sans text-[12px] leading-snug text-[#c24141]"
                >
                  {rangeIssue === "support"
                    ? t("inputs.guidedDriverSupportInvalid")
                    : t("inputs.guidedDriverOrderInvalid")}
                </p>
              ) : null}
            </div>
          </div>
        </div>
      )
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
          return renderCostPhase(costRow)
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
          return renderDriverPhase(driverRow)
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
                    void exitFullscreenIfNeeded(focusRootRef.current).catch(() => {})
                    setBrowserFullscreen(false)
                  }
                  return
                }
                if (focusMode) {
                  if (onRequestFocusFullscreen) onRequestFocusFullscreen()
                  else {
                    const root = focusRootRef.current
                    if (root && canRequestFullscreen(root)) {
                      void requestElementFullscreen(root).catch(() => {})
                    }
                  }
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
