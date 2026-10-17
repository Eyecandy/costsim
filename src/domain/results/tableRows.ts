import { costAbsoluteLikelyToTriangular, type TriangularParams } from "@/domain/simulation/simulation"
import { parseNumberField } from "@/domain/results/numberField"
import { triangularParamsFromPercentiles } from "@/domain/simulation/triangularCalibration"

// Re-exported so existing imports keep working; the function lives in a leaf module to avoid an import cycle.
export { parseNumberField }

/**
 * Driver: alle tre felt er % (prosentpoeng).
 * Kost: optimistic/pessimistic er % av base; likely er absolutt base (P).
 */
export type ScenarioRow = {
  id: string
  name: string
  optimistic: string
  likely: string
  pessimistic: string
}

/** Cost item row. Optional `description` is documentation only (not a sim input). */
export type CostElementRow = ScenarioRow & {
  description?: string
}

/**
 * Driver row. Optional `description` / `uncertaintyNotes` are documentation
 * only (not Monte Carlo inputs).
 */
export type DriverUncertaintyNotes = {
  /** Circumstances that could contribute to a lower cost outcome (P10 side). */
  lowerOutcome: string[]
  /** Circumstances that could contribute to a higher cost outcome (P90 side). */
  higherOutcome: string[]
}

export type DriverRow = ScenarioRow & {
  description?: string
  uncertaintyNotes?: DriverUncertaintyNotes
}

export function newId(): string {
  return crypto.randomUUID()
}

export function emptyScenarioRow(): ScenarioRow {
  return {
    id: newId(),
    name: "",
    optimistic: "",
    likely: "",
    pessimistic: "",
  }
}

export const emptyCostRow = emptyScenarioRow
export const emptyDriverRow = emptyScenarioRow

export function defaultCostRows(): CostElementRow[] {
  return Array.from({ length: 10 }, () => emptyScenarioRow())
}

export function defaultDriverRows(): DriverRow[] {
  return Array.from({ length: 5 }, () => emptyScenarioRow())
}

/**
 * Driver-rad: brukerinput er P10 / mode / P90 i %-poeng (ikke harde min/max).
 * Kalibrerer trekantstøtte før sampling. Faktor: 1 + p/100 krever støtte min > −100.
 */
export function parsePercentScenarioRow(row: ScenarioRow): TriangularParams | null {
  const opt = parseNumberField(row.optimistic)
  const like = parseNumberField(row.likely)
  const pes = parseNumberField(row.pessimistic)
  if (opt === null || like === null || pes === null) {
    return null
  }
  const params = triangularParamsFromPercentiles(opt, like, pes)
  if (!params) return null
  if (!(params.min > -100)) return null
  return params
}

/**
 * Kost-rad: likely = absolutt P; optimistic/pessimistic = % av P (P10/P90).
 * Gir kalibrert trekant i kroner for sampling.
 */
export function parseCostForSimulation(row: CostElementRow): TriangularParams | null {
  const base = parseNumberField(row.likely)
  const optPct = parseNumberField(row.optimistic)
  const pesPct = parseNumberField(row.pessimistic)
  if (base === null || optPct === null || pesPct === null) {
    return null
  }
  return costAbsoluteLikelyToTriangular({
    base,
    optimisticPercent: optPct,
    pessimisticPercent: pesPct,
  })
}

export const parseDriverForSimulation = parsePercentScenarioRow

export function isMeaningfullyFilledRow(row: ScenarioRow): boolean {
  return (
    row.name.trim() !== "" ||
    row.optimistic.trim() !== "" ||
    row.likely.trim() !== "" ||
    row.pessimistic.trim() !== ""
  )
}

type ScenarioNumericField = "optimistic" | "likely" | "pessimistic"

function scenarioCellKey(rowId: string, field: ScenarioNumericField): string {
  return `${rowId}:${field}`
}

/** Cells that block simulation for a started cost row (`${rowId}:field`). */
export function invalidCostRowCellKeys(row: CostElementRow): string[] {
  const keys = new Set<string>()
  const base = parseNumberField(row.likely)
  const optPct = parseNumberField(row.optimistic)
  const pesPct = parseNumberField(row.pessimistic)
  if (base === null) keys.add(scenarioCellKey(row.id, "likely"))
  if (optPct === null) keys.add(scenarioCellKey(row.id, "optimistic"))
  if (pesPct === null) keys.add(scenarioCellKey(row.id, "pessimistic"))
  if (base === null || optPct === null || pesPct === null) {
    return [...keys]
  }
  const triangular = costAbsoluteLikelyToTriangular({
    base,
    optimisticPercent: optPct,
    pessimisticPercent: pesPct,
  })
  if (triangular !== null) return [...keys]
  if (!(base > 0)) keys.add(scenarioCellKey(row.id, "likely"))
  const p10 = base * (1 + optPct / 100)
  const p90 = base * (1 + pesPct / 100)
  if (!(p10 <= base && base <= p90)) {
    keys.add(scenarioCellKey(row.id, "optimistic"))
    keys.add(scenarioCellKey(row.id, "pessimistic"))
  }
  return [...keys]
}

/** Cells that block simulation for a started driver row (`${rowId}:field`). */
export function invalidDriverRowCellKeys(row: DriverRow): string[] {
  const keys = new Set<string>()
  const opt = parseNumberField(row.optimistic)
  const like = parseNumberField(row.likely)
  const pes = parseNumberField(row.pessimistic)
  if (opt === null) keys.add(scenarioCellKey(row.id, "optimistic"))
  if (like === null) keys.add(scenarioCellKey(row.id, "likely"))
  if (pes === null) keys.add(scenarioCellKey(row.id, "pessimistic"))
  if (opt === null || like === null || pes === null) return [...keys]

  const params = triangularParamsFromPercentiles(opt, like, pes)
  if (params !== null && params.min > -100) return [...keys]

  if (!(opt <= like && like <= pes)) {
    if (!(opt <= like)) {
      keys.add(scenarioCellKey(row.id, "optimistic"))
      keys.add(scenarioCellKey(row.id, "likely"))
    }
    if (!(like <= pes)) {
      keys.add(scenarioCellKey(row.id, "likely"))
      keys.add(scenarioCellKey(row.id, "pessimistic"))
    }
  }
  if (params !== null && !(params.min > -100)) {
    keys.add(scenarioCellKey(row.id, "optimistic"))
    keys.add(scenarioCellKey(row.id, "pessimistic"))
  }
  // Ordered percentiles but calibration/support failed (e.g. driver min ≤ −100).
  if (params === null && opt <= like && like <= pes) {
    keys.add(scenarioCellKey(row.id, "optimistic"))
    keys.add(scenarioCellKey(row.id, "pessimistic"))
  }
  return [...keys]
}

/** Driver row: likely strictly outside [P10, P90] (equality at bounds is valid). */
export function driverLikelyOutsideSpan(row: DriverRow): boolean {
  const opt = parseNumberField(row.optimistic)
  const like = parseNumberField(row.likely)
  const pes = parseNumberField(row.pessimistic)
  if (opt === null || like === null || pes === null) return false
  if (opt === pes) return false
  return like < Math.min(opt, pes) || like > Math.max(opt, pes)
}

/**
 * Ordered P10/mode/P90 but calibrated triangular support violates driver
 * multiplier constraint (support min ≤ −100).
 */
export function driverCalibratedSupportInvalid(row: DriverRow): boolean {
  const opt = parseNumberField(row.optimistic)
  const like = parseNumberField(row.likely)
  const pes = parseNumberField(row.pessimistic)
  if (opt === null || like === null || pes === null) return false
  if (!(opt <= like && like <= pes)) return false
  const params = triangularParamsFromPercentiles(opt, like, pes)
  if (params === null) return true
  return !(params.min > -100)
}

export function percentToFactor(percent: number): number {
  return 1 + percent / 100
}

/** Driver × cost-item impact: 0–100 (% of driver's sampled effect on that cost item). */
export function parseDriverImpactPercent(raw: string | undefined): number | null {
  if (raw === undefined) return null
  const n = parseNumberField(raw)
  if (n === null) return null
  if (n < 0 || n > 100) return null
  return n
}

/** Missing or invalid impact → 100 (full driver effect; backward compatible). */
export function resolveDriverImpactPercent(raw: string | undefined): number {
  return parseDriverImpactPercent(raw) ?? 100
}

/** Snap impact to nearest 10% step in [0, 100]. */
export function snapDriverImpactPercent(value: number): number {
  if (!Number.isFinite(value)) return 100
  const clamped = Math.max(0, Math.min(100, value))
  return Math.round(clamped / 10) * 10
}

/** Slider/display value: read stored impact safely, snap for 10% steps. */
export function resolveDriverImpactPercentForSlider(raw: string | undefined): number {
  return snapDriverImpactPercent(resolveDriverImpactPercent(raw))
}

/** Clamp user input to 0–100 while editing impact cells. Empty string preserved. */
export function clampDriverImpactInput(value: string): string {
  if (value.trim() === "") return ""
  const n = Number(value.trim().replace(",", "."))
  if (!Number.isFinite(n)) return value.trim()
  return String(snapDriverImpactPercent(n))
}

/** Display value for impact cells (resolved default 100%). */
export function formatDriverImpactDisplay(raw: string | undefined): string {
  return String(resolveDriverImpactPercent(raw))
}
