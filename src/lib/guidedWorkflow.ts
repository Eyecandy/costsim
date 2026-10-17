import type { AppLanguage } from "@/lib/formatNumber"
import { listGuidedInputRows, type GuidedInputKind } from "@/lib/guidedInput"
import type { CostElementRow, DriverRow } from "@/lib/tableRows"

/**
 * Guided analysis phases (facilitator workflow).
 * Full sequence:
 * focusIntro → projectProfile → assumptions → incurred →
 * estimateUncertaintyIntro → cost → correlation → driversIntro → driver →
 * impact → simulation.
 * Empty cost/driver tables get explicit pedagogical steps instead of silent skips.
 */
export type GuidedWorkflowPhase =
  | "focusIntro"
  | "projectProfile"
  | "assumptions"
  | "incurred"
  | "estimateUncertaintyIntro"
  | "costsEmpty"
  | "cost"
  | "correlation"
  | "driversIntro"
  | "driversEmpty"
  | "driver"
  | "impact"
  | "simulation"

/** Entry point into the workflow (toolbar Play buttons today; `full` reserved). */
export type GuidedWorkflowEntry = GuidedInputKind | "full"

export type GuidedWorkflowStep =
  | { phase: "focusIntro" }
  | { phase: "projectProfile" }
  | { phase: "assumptions" }
  | { phase: "incurred" }
  | { phase: "estimateUncertaintyIntro" }
  | { phase: "costsEmpty" }
  | {
      phase: "cost"
      rowId: string
      localIndex: number
      localTotal: number
    }
  | { phase: "correlation" }
  | { phase: "driversIntro" }
  | { phase: "driversEmpty" }
  | {
      phase: "driver"
      rowId: string
      localIndex: number
      localTotal: number
    }
  | { phase: "impact" }
  | { phase: "simulation" }

/**
 * Build the ordered guided steps for an entry point.
 * All Focus entries share the full workflow:
 * focus intro → project profile → assumptions → incurred →
 * estimate-uncertainty intro → cost items → correlation → drivers intro →
 * drivers → impact → simulation.
 * Entry kind only affects the initial landing index (see
 * `initialGuidedWorkflowStepIndex`); Driver Play is a land-at-Drivers shortcut,
 * not a truncated sequence.
 * Empty costs/drivers insert explicit empty-state steps (no silent skip).
 */
export function buildGuidedWorkflowSteps(args: {
  entry: GuidedWorkflowEntry
  costRows: readonly CostElementRow[]
  driverRows: readonly DriverRow[]
}): GuidedWorkflowStep[] {
  const costs = listGuidedInputRows(args.costRows)
  const drivers = listGuidedInputRows(args.driverRows)
  const steps: GuidedWorkflowStep[] = []

  const pushCostPhase = () => {
    steps.push({ phase: "estimateUncertaintyIntro" })
    if (costs.length === 0) {
      steps.push({ phase: "costsEmpty" })
      return
    }
    for (let i = 0; i < costs.length; i++) {
      steps.push({
        phase: "cost",
        rowId: costs[i]!.id,
        localIndex: i,
        localTotal: costs.length,
      })
    }
    steps.push({ phase: "correlation" })
  }

  const pushDriverPhase = () => {
    steps.push({ phase: "driversIntro" })
    if (drivers.length === 0) {
      // Optional drivers: empty decision → Simulation (skip Impact).
      steps.push({ phase: "driversEmpty" })
      steps.push({ phase: "simulation" })
      return
    }
    for (let i = 0; i < drivers.length; i++) {
      steps.push({
        phase: "driver",
        rowId: drivers[i]!.id,
        localIndex: i,
        localTotal: drivers.length,
      })
    }
    steps.push({ phase: "impact" })
    steps.push({ phase: "simulation" })
  }

  // `entry` is reserved for landing/resume semantics; the step list is shared.
  void args.entry
  steps.push({ phase: "focusIntro" })
  steps.push({ phase: "projectProfile" })
  steps.push({ phase: "assumptions" })
  steps.push({ phase: "incurred" })
  pushCostPhase()
  pushDriverPhase()
  return steps
}

/**
 * Initial step index for a toolbar entry with optional row offset
 * (row offset is into the cost/driver candidate list for that entry).
 *
 * Primary Focus entry (`startPhase: "focusIntro"`) opens the intro.
 * Cost entry with startRowIndex 0 (local Play) opens Assumptions — the entry
 * hierarchy steps before it stay reachable with Previous.
 * Cost entry with startRowIndex > 0 jumps to that cost-item local index (resume).
 * Driver entry with startRowIndex 0 opens Drivers intro within the full sequence.
 * Driver entry with startRowIndex > 0 resumes into that driver item.
 */
export function initialGuidedWorkflowStepIndex(args: {
  entry: GuidedWorkflowEntry
  steps: readonly GuidedWorkflowStep[]
  startRowIndex?: number
  /** Primary Focus entry lands on the intro instead of the entry default. */
  startPhase?: "focusIntro" | null
}): number {
  const { entry, steps, startRowIndex = 0, startPhase = null } = args
  if (steps.length === 0) return 0

  if (startPhase === "focusIntro") {
    const intro = steps.findIndex((s) => s.phase === "focusIntro")
    return intro >= 0 ? intro : 0
  }

  if (entry === "full") return 0

  if (entry === "cost") {
    // Local Play opens Assumptions — not the Focus-mode intro.
    if (startRowIndex <= 0) {
      const assumptions = steps.findIndex((s) => s.phase === "assumptions")
      return assumptions >= 0 ? assumptions : 0
    }
    const costSteps = steps
      .map((s, i) => ({ s, i }))
      .filter((x) => x.s.phase === "cost")
    if (costSteps.length === 0) {
      const empty = steps.findIndex((s) => s.phase === "costsEmpty")
      return empty >= 0 ? empty : 0
    }
    const clamped = Math.max(
      0,
      Math.min(startRowIndex, costSteps.length - 1),
    )
    return costSteps[clamped]!.i
  }

  // Driver Play opens Drivers intro (full workflow); row offset resumes into drivers.
  if (startRowIndex <= 0) {
    const driversIntro = steps.findIndex((s) => s.phase === "driversIntro")
    return driversIntro >= 0 ? driversIntro : 0
  }

  const driverSteps = steps
    .map((s, i) => ({ s, i }))
    .filter((x) => x.s.phase === "driver")
  if (driverSteps.length === 0) {
    const empty = steps.findIndex((s) => s.phase === "driversEmpty")
    return empty >= 0 ? empty : 0
  }
  const clamped = Math.max(
    0,
    Math.min(startRowIndex, driverSteps.length - 1),
  )
  return driverSteps[clamped]!.i
}

export function clampGuidedWorkflowStepIndex(
  index: number,
  total: number,
): number {
  if (total <= 0) return 0
  return Math.max(0, Math.min(index, total - 1))
}

/** Item progress for cost/driver steps only (no phase-name prefix). */
export function formatGuidedPhaseProgress(args: {
  step: GuidedWorkflowStep
  /** @deprecated Unused — kept for call-site compatibility. */
  phaseLabel?: string
  language: AppLanguage
}): string {
  const { step, language } = args
  if (step.phase === "cost" || step.phase === "driver") {
    const n = step.localIndex + 1
    const total = step.localTotal
    if (language === "en") return `${n} of ${total}`
    return `${n} av ${total}`
  }
  return ""
}

/** Resume hint after specialized-mode / table handoff (UI-only; not persisted). */
export type GuidedResumeAfter =
  | "costItems"
  | "correlation"
  | "drivers"
  | "impact"
  | "simulation"

export type GuidedResumeState = {
  after: GuidedResumeAfter
  /** Which guided entry started the workflow (cost vs driver play). */
  entry: GuidedInputKind
  /** Project that owned the detour — resume only if still active. */
  projectId: string
}

/**
 * Index of the first step for a resume target, or 0 if missing.
 * Resumes land on item/empty/review steps — not concept intros.
 */
export function findGuidedWorkflowPhaseIndex(
  steps: readonly GuidedWorkflowStep[],
  phase: GuidedResumeAfter,
): number {
  if (phase === "costItems") {
    const cost = steps.findIndex((s) => s.phase === "cost")
    if (cost >= 0) return cost
    const empty = steps.findIndex((s) => s.phase === "costsEmpty")
    return empty >= 0 ? empty : 0
  }
  if (phase === "drivers") {
    const driver = steps.findIndex((s) => s.phase === "driver")
    if (driver >= 0) return driver
    const empty = steps.findIndex((s) => s.phase === "driversEmpty")
    return empty >= 0 ? empty : 0
  }
  if (phase === "simulation") {
    const sim = steps.findIndex((s) => s.phase === "simulation")
    return sim >= 0 ? sim : Math.max(0, steps.length - 1)
  }
  const i = steps.findIndex((s) => s.phase === phase)
  return i >= 0 ? i : 0
}
