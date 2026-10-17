import type { AppLanguage } from "@/domain/results/formatNumber"
import { formatNumber } from "@/domain/results/formatNumber"
import {
  buildSimulationDriverImpactMatrix,
  normalizeIncurredCosts,
  type Project,
} from "@/domain/analysis/project"
import type { CostElementRow, DriverRow, ScenarioRow } from "@/domain/results/tableRows"
import {
  driverCalibratedSupportInvalid,
  driverLikelyOutsideSpan,
  isMeaningfullyFilledRow,
  parseDriverForSimulation,
  parseNumberField,
} from "@/domain/results/tableRows"
import { sanitizeScenarioNumericInput } from "@/domain/results/excelLikeTable"
import {
  clampCostLikelyAbs,
  clampCostOptimisticPercent,
  clampCostPessimisticPercent,
  clampDriverLikelyPercent,
} from "@/domain/results/scenarioNumericClamps"
import { computeTotalFromSampledValues } from "@/simulation"

export type GuidedInputKind = "cost" | "driver"

export type GuidedNumericField = "optimistic" | "likely" | "pessimistic"

export type GuidedInputSession = {
  kind: GuidedInputKind
  /** Index into the guided candidate list (not the raw table index). */
  startIndex?: number
}

/** Cost P10 slider span (optimistic % of most likely). Left of center. */
export const GUIDED_COST_P10_SLIDER = { min: -100, max: 0, step: 1 } as const
/** Cost P90 slider span (pessimistic % of most likely). Right of center. */
export const GUIDED_COST_P90_SLIDER = { min: 0, max: 100, step: 1 } as const

/**
 * Guided Driver slider working ranges for workshop usability.
 * Not model/validation limits — direct numeric edit retains table clamps.
 */
export const GUIDED_DRIVER_P10_SLIDER_RANGE = {
  min: -60,
  max: 0,
  step: 1,
} as const
export const GUIDED_DRIVER_MODE_SLIDER_RANGE = {
  min: -30,
  max: 30,
  step: 1,
} as const
export const GUIDED_DRIVER_P90_SLIDER_RANGE = {
  min: 0,
  max: 60,
  step: 1,
} as const

export type GuidedDriverSliderRange = {
  readonly min: number
  readonly max: number
  readonly step: number
}

export function guidedDriverSliderWorkingRange(
  field: GuidedNumericField,
): GuidedDriverSliderRange {
  if (field === "optimistic") return GUIDED_DRIVER_P10_SLIDER_RANGE
  if (field === "likely") return GUIDED_DRIVER_MODE_SLIDER_RANGE
  return GUIDED_DRIVER_P90_SLIDER_RANGE
}

/** Visual thumb position only — does not mutate stored values. */
export function pinGuidedSliderDisplayValue(
  value: number,
  range: GuidedDriverSliderRange,
): number {
  return Math.min(range.max, Math.max(range.min, value))
}

export function isGuidedDriverValueOutsideWorkingRange(
  field: GuidedNumericField,
  raw: string,
): boolean {
  const n = parseNumberField(raw)
  if (n === null) return false
  const range = guidedDriverSliderWorkingRange(field)
  return n < range.min || n > range.max
}

/**
 * Non-blocking Guided Driver range issue, using the same validity path as
 * the normal table / simulation (`parseDriverForSimulation`).
 * Incomplete triplets → no warning.
 */
export type GuidedDriverRangeIssue = "support" | "order"

export function getGuidedDriverRangeIssue(
  row: DriverRow,
): GuidedDriverRangeIssue | null {
  const opt = parseNumberField(row.optimistic)
  const like = parseNumberField(row.likely)
  const pes = parseNumberField(row.pessimistic)
  if (opt === null || like === null || pes === null) return null
  if (parseDriverForSimulation(row) !== null) return null
  if (driverCalibratedSupportInvalid(row)) return "support"
  if (driverLikelyOutsideSpan(row) || !(opt <= like && like <= pes)) {
    return "order"
  }
  // Ordered but still unsimulatable (shared with table support path).
  return "support"
}

/**
 * Ordered factors for Guided Input — same order as the table, skipping
 * empty UI placeholder rows via existing `isMeaningfullyFilledRow`.
 */
export function listGuidedInputRows<T extends ScenarioRow>(rows: readonly T[]): T[] {
  return rows.filter(isMeaningfullyFilledRow)
}

export function formatGuidedProgress(
  currentOneBased: number,
  total: number,
  language: AppLanguage,
): string {
  if (language === "en") return `${currentOneBased} of ${total}`
  return `${currentOneBased} av ${total}`
}

export function clampGuidedIndex(index: number, total: number): number {
  if (total <= 0) return 0
  return Math.max(0, Math.min(index, total - 1))
}

/** Normalize a numeric field the same way the table cell editor does. */
export function normalizeGuidedNumericField(args: {
  kind: GuidedInputKind
  field: GuidedNumericField
  value: string
  row: ScenarioRow
}): string {
  const sanitized = sanitizeScenarioNumericInput(args.value)
  if (args.kind === "cost") {
    if (args.field === "optimistic") return clampCostOptimisticPercent(sanitized)
    if (args.field === "likely") return clampCostLikelyAbs(sanitized)
    return clampCostPessimisticPercent(sanitized)
  }
  if (args.field === "optimistic") return clampCostOptimisticPercent(sanitized)
  if (args.field === "likely") {
    return clampDriverLikelyPercent(
      sanitized,
      args.row.optimistic,
      args.row.pessimistic,
    )
  }
  return clampCostPessimisticPercent(sanitized)
}

/**
 * Slider thumb position for display only.
 * Blank fields use `fallback` visually — callers must NOT write this until the user edits.
 */
export function guidedSliderDisplayValue(
  raw: string,
  fallback: number,
): number {
  const n = parseNumberField(raw)
  return n === null ? fallback : n
}

/** Signed percent label, e.g. `−15 %` / `+30 %`. */
export function formatGuidedSignedPercent(
  value: number,
  language: AppLanguage,
): string {
  if (!Number.isFinite(value)) return "—"
  const abs = formatNumber(Math.abs(value), Number.isInteger(value) ? 0 : 1, language)
  if (value > 0) return `+${abs} %`
  if (value < 0) return `−${abs} %`
  return `${abs} %`
}

/**
 * Absolute monetary amount from mostLikely × (1 + pct/100).
 * Returns null when M or pct cannot be parsed (blank / incomplete).
 */
export function deriveGuidedCostAbsolute(
  mostLikelyRaw: string,
  percentRaw: string,
): number | null {
  const m = parseNumberField(mostLikelyRaw)
  const pct = parseNumberField(percentRaw)
  if (m === null || pct === null) return null
  return m * (1 + pct / 100)
}

/**
 * Signed monetary deviation of a cost percent from mostLikely:
 * `mostLikely * percent / 100`. Display-only — not the endpoint total.
 */
export function deriveGuidedCostEffect(
  mostLikelyRaw: string,
  percentRaw: string,
): number | null {
  const m = parseNumberField(mostLikelyRaw)
  const pct = parseNumberField(percentRaw)
  if (m === null || pct === null) return null
  return m * (pct / 100)
}

/** Compact absolute display for workshop (millions when large). */
export function formatGuidedCostAbsolute(
  value: number | null,
  language: AppLanguage,
): string {
  if (value === null || !Number.isFinite(value)) return "—"
  const abs = Math.abs(value)
  if (abs >= 1_000_000) {
    const millions = value / 1_000_000
    const digits = Math.abs(millions) >= 100 ? 0 : 1
    return `${formatNumber(millions, digits, language)} mill.`
  }
  return formatNumber(value, 0, language)
}

/** Compact signed amount for approx impact labels. */
export function formatGuidedSignedAbsolute(
  value: number,
  language: AppLanguage,
): string {
  if (!Number.isFinite(value)) return "—"
  const sign = value > 0 ? "+" : value < 0 ? "−" : ""
  const abs = Math.abs(value)
  if (abs >= 1_000_000) {
    const millions = abs / 1_000_000
    const digits = millions >= 100 ? 0 : 1
    const body = formatNumber(millions, digits, language)
    if (language === "en") return `${sign}${body}m`
    return `${sign}${body} mill.`
  }
  return `${sign}${formatNumber(abs, 0, language)}`
}

/**
 * Secondary explanatory label for deterministic driver monetary effect.
 * Compact: `≈ −96 mill.` / `≈ +144m` — isolated Δ, not project total.
 */
export function formatGuidedApproxImpactLabel(
  effect: number | null,
  language: AppLanguage,
): string {
  if (effect === null || !Number.isFinite(effect)) return "—"
  return `≈ ${formatGuidedSignedAbsolute(effect, language)}`
}

/** Round slider numeric commits to the guided step without inventing blanks. */
export function snapGuidedSliderValue(
  value: number,
  step: number,
): number {
  if (!Number.isFinite(value) || step <= 0) return value
  return Math.round(value / step) * step
}

export function guidedPercentToStoredString(value: number): string {
  if (!Number.isFinite(value)) return ""
  if (Number.isInteger(value)) return String(value)
  const rounded = Math.round(value * 10) / 10
  return String(rounded)
}

const IMPACT_NEAR_ZERO = 1e-9

function nearZeroToZero(n: number): number {
  return Math.abs(n) < IMPACT_NEAR_ZERO ? 0 : n
}

export type GuidedDriverEndpointEffects = {
  p10Effect: number | null
  modeEffect: number | null
  p90Effect: number | null
}

/**
 * Guided Input–only explanatory monetary effects for one driver vs a common
 * neutral reference of **0 %** on that driver:
 *
 * - all cost items with a positive mostLikely stay at that mode
 * - all other drivers with a parseable mostLikely stay at their mode
 * - selected driver at 0 % → `totalAtZero`
 * - `p10Effect = totalAtP10 - totalAtZero` (same for mode / P90)
 * - incurred costs cancel in Δ; impacts via `buildSimulationDriverImpactMatrix`
 *
 * Does **not** change Tornado / simulation semantics (Tornado still uses mode).
 * Does not run Monte Carlo. Returns null endpoints when inputs are insufficient.
 */
export function computeGuidedDriverEndpointEffects(
  project: Project,
  driverRowId: string,
): GuidedDriverEndpointEffects {
  const empty: GuidedDriverEndpointEffects = {
    p10Effect: null,
    modeEffect: null,
    p90Effect: null,
  }

  const costEntries = project.costRows
    .map((row) => ({ row, mode: parseNumberField(row.likely) }))
    .filter(
      (x): x is { row: CostElementRow; mode: number } =>
        x.mode !== null && x.mode > 0,
    )
  if (costEntries.length === 0) return empty

  const selected = project.driverRows.find((d) => d.id === driverRowId)
  if (!selected) return empty

  const selectedMode = parseNumberField(selected.likely)
  const p10 = parseNumberField(selected.optimistic)
  const p90 = parseNumberField(selected.pessimistic)

  const driverEntries: { row: DriverRow; mode: number }[] = []
  for (const row of project.driverRows) {
    const mode = parseNumberField(row.likely)
    if (mode === null && row.id !== driverRowId) continue
    // Selected may be blank — keep it in the matrix with 0 for other-driver calcs.
    driverEntries.push({ row, mode: mode ?? 0 })
  }
  const selectedIdx = driverEntries.findIndex((d) => d.row.id === driverRowId)
  if (selectedIdx < 0) return empty

  const costModes = costEntries.map((c) => c.mode)
  const otherAtModeSelectedAt = (selectedPct: number) =>
    driverEntries.map((d, i) => (i === selectedIdx ? selectedPct : d.mode))

  const driverImpacts = buildSimulationDriverImpactMatrix(
    costEntries.map((c) => c.row),
    driverEntries.map((d) => d.row),
    project.driverImpacts,
  )
  const incurredCosts = normalizeIncurredCosts(project.incurredCosts)

  const totalAt = (drivers: readonly number[]) =>
    computeTotalFromSampledValues({
      costValues: costModes,
      driverPctValues: drivers,
      driverImpacts,
      incurredCosts,
    })

  const totalAtZero = totalAt(otherAtModeSelectedAt(0))

  const effectAt = (pct: number | null): number | null =>
    pct === null
      ? null
      : nearZeroToZero(totalAt(otherAtModeSelectedAt(pct)) - totalAtZero)

  return {
    p10Effect: effectAt(p10),
    modeEffect: effectAt(selectedMode),
    p90Effect: effectAt(p90),
  }
}
