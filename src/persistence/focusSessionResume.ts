import {
  findGuidedStepIndexForFocusPhase,
  FOCUS_USER_PHASES,
  getFocusPhaseForGuidedStep,
  type FocusUserPhase,
} from "@/domain/guided/focusPhaseNav"
import type { FocusResultSectionId } from "@/domain/guided/focusResultSteps"
import type {
  GuidedWorkflowPhase,
  GuidedWorkflowStep,
} from "@/domain/guided/guidedWorkflow"

/** Versioned Focus UI resume blob (sessionStorage only). */
export type FocusSessionResumeV1 = {
  v: 1
  analysisId: string
  projectId: string
  checkpointId?: string | null
  focusView: "input" | "results"
  guidedPhase?: GuidedWorkflowPhase
  guidedRowId?: string
  resultSectionId?: FocusResultSectionId
  furthestReachedPhase?: FocusUserPhase
}

export type GuidedSemanticResume = {
  phase: GuidedWorkflowPhase
  rowId?: string
}

const GUIDED_WORKFLOW_PHASES: readonly GuidedWorkflowPhase[] = [
  "focusIntro",
  "projectProfile",
  "assumptions",
  "incurred",
  "estimateUncertaintyIntro",
  "costsEmpty",
  "cost",
  "correlation",
  "driversIntro",
  "driversEmpty",
  "driver",
  "impact",
  "simulation",
] as const

const FOCUS_RESULT_SECTION_IDS: readonly FocusResultSectionId[] = [
  "keyFigures",
  "development",
  "scurve",
  "tornado",
  "contribution",
  "nextSteps",
] as const

export function focusSessionResumeStorageKey(analysisId: string): string {
  return `cost-simulator:focus-session:v1:${analysisId}`
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function isGuidedWorkflowPhase(value: unknown): value is GuidedWorkflowPhase {
  return (
    typeof value === "string" &&
    (GUIDED_WORKFLOW_PHASES as readonly string[]).includes(value)
  )
}

function isFocusResultSectionId(value: unknown): value is FocusResultSectionId {
  return (
    typeof value === "string" &&
    (FOCUS_RESULT_SECTION_IDS as readonly string[]).includes(value)
  )
}

function isFocusUserPhase(value: unknown): value is FocusUserPhase {
  return (
    typeof value === "string" &&
    (FOCUS_USER_PHASES as readonly string[]).includes(value)
  )
}

/** Parse and validate a resume blob. Returns null when unusable. */
export function parseFocusSessionResume(
  raw: unknown,
): FocusSessionResumeV1 | null {
  if (!isObject(raw)) return null
  if (raw.v !== 1) return null
  if (typeof raw.analysisId !== "string" || raw.analysisId.trim() === "") {
    return null
  }
  if (typeof raw.projectId !== "string" || raw.projectId.trim() === "") {
    return null
  }
  if (raw.focusView !== "input" && raw.focusView !== "results") return null

  let checkpointId: string | null | undefined
  if (raw.checkpointId === undefined) {
    checkpointId = undefined
  } else if (raw.checkpointId === null) {
    checkpointId = null
  } else if (typeof raw.checkpointId === "string") {
    checkpointId = raw.checkpointId
  } else {
    return null
  }

  let guidedPhase: GuidedWorkflowPhase | undefined
  if (raw.guidedPhase !== undefined) {
    if (!isGuidedWorkflowPhase(raw.guidedPhase)) return null
    guidedPhase = raw.guidedPhase
  }

  let guidedRowId: string | undefined
  if (raw.guidedRowId !== undefined) {
    if (typeof raw.guidedRowId !== "string" || raw.guidedRowId.trim() === "") {
      return null
    }
    guidedRowId = raw.guidedRowId
  }

  let resultSectionId: FocusResultSectionId | undefined
  if (raw.resultSectionId !== undefined) {
    if (!isFocusResultSectionId(raw.resultSectionId)) return null
    resultSectionId = raw.resultSectionId
  }

  let furthestReachedPhase: FocusUserPhase | undefined
  if (raw.furthestReachedPhase !== undefined) {
    if (!isFocusUserPhase(raw.furthestReachedPhase)) return null
    furthestReachedPhase = raw.furthestReachedPhase
  }

  return {
    v: 1,
    analysisId: raw.analysisId,
    projectId: raw.projectId,
    checkpointId,
    focusView: raw.focusView,
    ...(guidedPhase ? { guidedPhase } : {}),
    ...(guidedRowId ? { guidedRowId } : {}),
    ...(resultSectionId ? { resultSectionId } : {}),
    ...(furthestReachedPhase ? { furthestReachedPhase } : {}),
  }
}

export function readFocusSessionResume(
  analysisId: string,
  storage?: Storage | null,
): FocusSessionResumeV1 | null {
  if (!analysisId) return null
  const store = storage ?? (typeof sessionStorage !== "undefined" ? sessionStorage : null)
  if (!store) return null
  try {
    const raw = store.getItem(focusSessionResumeStorageKey(analysisId))
    if (raw == null || raw === "") return null
    return parseFocusSessionResume(JSON.parse(raw) as unknown)
  } catch {
    return null
  }
}

export function writeFocusSessionResume(
  state: FocusSessionResumeV1,
  storage?: Storage | null,
): void {
  const store = storage ?? (typeof sessionStorage !== "undefined" ? sessionStorage : null)
  if (!store) return
  if (!state.analysisId) return
  try {
    store.setItem(
      focusSessionResumeStorageKey(state.analysisId),
      JSON.stringify(state),
    )
  } catch {
    // Quota / private mode — ignore.
  }
}

export function clearFocusSessionResume(
  analysisId: string,
  storage?: Storage | null,
): void {
  if (!analysisId) return
  const store = storage ?? (typeof sessionStorage !== "undefined" ? sessionStorage : null)
  if (!store) return
  try {
    store.removeItem(focusSessionResumeStorageKey(analysisId))
  } catch {
    // ignore
  }
}

/**
 * Resolve a Guided step index from semantic resume fields.
 * Missing rows fall back within the same broad phase.
 */
export function resolveGuidedStepIndexForResume(
  steps: readonly GuidedWorkflowStep[],
  guidedPhase: GuidedWorkflowPhase | undefined,
  guidedRowId: string | undefined,
): number {
  if (steps.length === 0) return 0
  if (!guidedPhase) {
    const assumptions = steps.findIndex((s) => s.phase === "assumptions")
    return assumptions >= 0 ? assumptions : 0
  }

  if (
    (guidedPhase === "cost" || guidedPhase === "driver") &&
    guidedRowId
  ) {
    const exact = steps.findIndex(
      (s) =>
        s.phase === guidedPhase &&
        "rowId" in s &&
        s.rowId === guidedRowId,
    )
    if (exact >= 0) return exact

    if (guidedPhase === "cost") {
      const first = steps.findIndex((s) => s.phase === "cost")
      if (first >= 0) return first
      const empty = steps.findIndex((s) => s.phase === "costsEmpty")
      if (empty >= 0) return empty
      return findGuidedStepIndexForFocusPhase(steps, "costs")
    }

    const firstDriver = steps.findIndex((s) => s.phase === "driver")
    if (firstDriver >= 0) return firstDriver
    const empty = steps.findIndex((s) => s.phase === "driversEmpty")
    if (empty >= 0) return empty
    return findGuidedStepIndexForFocusPhase(steps, "drivers")
  }

  const exactPhase = steps.findIndex((s) => s.phase === guidedPhase)
  if (exactPhase >= 0) return exactPhase

  const broad = getFocusPhaseForGuidedStep(guidedPhase)
  if (broad && broad !== "results") {
    return findGuidedStepIndexForFocusPhase(steps, broad)
  }
  return 0
}

export function resolveFocusResultStepIndexForResume(
  steps: readonly FocusResultSectionId[],
  sectionId: FocusResultSectionId | undefined,
): number {
  if (steps.length === 0) return 0
  if (!sectionId) return 0
  const index = steps.indexOf(sectionId)
  return index >= 0 ? index : 0
}

/** Whether stored resume still matches the live analysis context. */
export function focusSessionResumeMatchesContext(
  state: FocusSessionResumeV1,
  ctx: {
    analysisId: string
    projectId: string
    checkpointId?: string | null
    isOngoing: boolean
  },
): boolean {
  if (state.analysisId !== ctx.analysisId) return false
  if (state.projectId !== ctx.projectId) return false
  if (ctx.isOngoing) {
    const live = ctx.checkpointId ?? null
    const stored = state.checkpointId ?? null
    if (live !== stored) return false
  }
  return true
}
