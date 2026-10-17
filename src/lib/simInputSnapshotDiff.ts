import { SCENARIO_COLUMN_KEYS } from "@/lib/excelLikeTable"
import {
  normalizeIncurredCosts,
  type DriverImpactsByRowId,
} from "@/lib/project"
import {
  parseCostForSimulation,
  parseDriverForSimulation,
  resolveDriverImpactPercent,
  type ScenarioRow,
} from "@/lib/tableRows"

/** Changed-cell key for the incurred-cost value cell in the cost table. */
export const INCURRED_COSTS_CELL_KEY = "__incurredCosts__:likely"

function hasMeaningfulCellContent(value: string): boolean {
  return value.trim() !== ""
}

/** Keys `${rowId}:${field}` for cells that differ from the baseline snapshot rows. */
export function changedScenarioCellKeySet(
  currentRows: readonly ScenarioRow[],
  baselineRows: readonly ScenarioRow[] | undefined,
): Set<string> {
  const out = new Set<string>()
  if (!baselineRows) {
    for (const r of currentRows) {
      for (const k of SCENARIO_COLUMN_KEYS) {
        if (hasMeaningfulCellContent(r[k])) {
          out.add(`${r.id}:${k}`)
        }
      }
    }
    return out
  }
  const baselineById = new Map(baselineRows.map((r) => [r.id, r]))
  for (const cur of currentRows) {
    const base = baselineById.get(cur.id)
    if (!base) {
      for (const k of SCENARIO_COLUMN_KEYS) {
        if (hasMeaningfulCellContent(cur[k])) {
          out.add(`${cur.id}:${k}`)
        }
      }
      continue
    }
    for (const k of SCENARIO_COLUMN_KEYS) {
      if (cur[k] !== base[k]) out.add(`${cur.id}:${k}`)
    }
  }
  return out
}

/** Cost-table changed keys including incurred costs vs baseline project snapshot. */
export function changedCostTableCellKeySet(
  current: { costRows: readonly ScenarioRow[]; incurredCosts: number },
  baseline: { costRows: readonly ScenarioRow[]; incurredCosts: number } | undefined,
): Set<string> {
  const out = changedScenarioCellKeySet(current.costRows, baseline?.costRows)
  if (baseline === undefined) {
    if (normalizeIncurredCosts(current.incurredCosts) > 0) {
      out.add(INCURRED_COSTS_CELL_KEY)
    }
  } else if (
    normalizeIncurredCosts(current.incurredCosts) !==
    normalizeIncurredCosts(baseline.incurredCosts)
  ) {
    out.add(INCURRED_COSTS_CELL_KEY)
  }
  return out
}

/** Stable key for a driver × cost-item impact cell. */
export function driverImpactCellKey(
  driverRowId: string,
  costRowId: string,
): string {
  return `${driverRowId}:${costRowId}`
}

function resolvedImpactLabel(
  driverImpacts: DriverImpactsByRowId | undefined,
  driverRowId: string,
  costRowId: string,
): string {
  return String(
    resolveDriverImpactPercent(driverImpacts?.[driverRowId]?.[costRowId]),
  )
}

/** Impact cells that differ from the baseline snapshot (resolved 100% default). */
export function changedDriverImpactCellKeySet(
  current: {
    driverImpacts?: DriverImpactsByRowId
    costRows: readonly ScenarioRow[]
    driverRows: readonly ScenarioRow[]
  },
  baseline:
    | {
        driverImpacts?: DriverImpactsByRowId
        costRows: readonly ScenarioRow[]
        driverRows: readonly ScenarioRow[]
      }
    | undefined,
): Set<string> {
  const out = new Set<string>()
  const validCosts = current.costRows.filter(
    (row) => parseCostForSimulation(row) !== null,
  )
  const validDrivers = current.driverRows.filter(
    (row) => parseDriverForSimulation(row) !== null,
  )
  if (validCosts.length === 0 || validDrivers.length === 0) return out

  for (const driver of validDrivers) {
    for (const cost of validCosts) {
      const key = driverImpactCellKey(driver.id, cost.id)
      const curLabel = resolvedImpactLabel(
        current.driverImpacts,
        driver.id,
        cost.id,
      )
      if (baseline === undefined) {
        const explicit = current.driverImpacts?.[driver.id]?.[cost.id]
        if (explicit !== undefined && explicit.trim() !== "" && curLabel !== "100") {
          out.add(key)
        }
        continue
      }
      const baseLabel = resolvedImpactLabel(
        baseline.driverImpacts,
        driver.id,
        cost.id,
      )
      if (curLabel !== baseLabel) out.add(key)
    }
  }
  return out
}
