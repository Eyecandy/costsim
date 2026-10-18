import { CompactSelection, type GridSelection } from "@glideapps/glide-data-grid"
import "@glideapps/glide-data-grid/dist/index.css"

import { sanitizeScenarioNumericInput } from "@/domain/results/excelLikeTable"
import { type ScenarioRow } from "@/domain/results/tableRows"

export const ROW_HEIGHT = 34
export const HEADER_HEIGHT = 36
export const NAME_MAX_LENGTH = 80
export const COST_MAX_ROWS = 20
export const DRIVER_MAX_ROWS = 12
export const COST_OPT_COL_WIDTH = 104
export const COST_LIKELY_COL_WIDTH = 128
export const COST_PESS_COL_WIDTH = 104

export const emptyGridSelection: GridSelection = {
  columns: CompactSelection.empty(),
  rows: CompactSelection.empty(),
  current: undefined,
}

/** Integer widths summing to `total` so Glide content width matches the card (no horizontal scroll). */
export function distributeScenarioColumnWidths(
  total: number,
): readonly [number, number, number, number] {
  const t = Math.max(120, Math.floor(total))
  const w0 = Math.floor(t * 0.36)
  const w1 = Math.floor(t * 0.17)
  const w2 = Math.floor(t * 0.25)
  const w3 = t - w0 - w1 - w2
  return [w0, w1, w2, w3]
}

export function getCostColumnWidths(total: number): readonly [number, number, number, number] {
  const fixed = COST_OPT_COL_WIDTH + COST_LIKELY_COL_WIDTH + COST_PESS_COL_WIDTH
  const name = Math.max(160, Math.floor(total) - fixed)
  return [name, COST_OPT_COL_WIDTH, COST_LIKELY_COL_WIDTH, COST_PESS_COL_WIDTH]
}

export function normalizePastedRow(r: ScenarioRow): ScenarioRow {
  return {
    ...r,
    name: r.name.slice(0, NAME_MAX_LENGTH),
    optimistic: sanitizeScenarioNumericInput(r.optimistic),
    likely: sanitizeScenarioNumericInput(r.likely),
    pessimistic: sanitizeScenarioNumericInput(r.pessimistic),
  }
}

export function formatWithThousands(value: string, language: "no" | "en"): string {
  const trimmed = value.trim()
  if (trimmed === "") return value
  const normalized = trimmed.replace(/\s/g, "")
  const m = normalized.match(/^(-?)(\d+)([.,]\d+)?$/)
  if (!m) return value
  const sign = m[1] ?? ""
  const intPart = m[2] ?? ""
  const fraction = m[3] ?? ""
  const thousandsSeparator = language === "en" ? "," : " "
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, thousandsSeparator)
  return `${sign}${grouped}${fraction}`
}

/** Column index for editable incurred-cost value (`Mest sannsynlig`). */
export const INCURRED_EDITABLE_COL = 2

export function selectionIncludesIncurredLockedCell(
  current: NonNullable<GridSelection["current"]>,
  incurredRowIndex: number,
): boolean {
  const [col, row] = current.cell
  if (row === incurredRowIndex && col !== INCURRED_EDITABLE_COL) return true
  const inc = incurredRowIndex
  const { range } = current
  if (inc < range.y || inc >= range.y + range.height) return false
  const right = range.x + range.width - 1
  return range.x !== INCURRED_EDITABLE_COL || right !== INCURRED_EDITABLE_COL
}
