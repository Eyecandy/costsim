import "@glideapps/glide-data-grid/dist/index.css"

/** Soft brand tint for cells that differ from the last simulated input snapshot (`#1d868c` @ low opacity). */
export const CHANGED_VS_SIM_CELL_BG = "rgba(29, 134, 140, 0.05)"
/** Muted red tint for cells that block simulation (incomplete/invalid input). */
export const INVALID_INPUT_CELL_BG = "rgba(220, 38, 38, 0.08)"

export function cellThemeOverride(
  cellKey: string,
  changedCellKeys: ReadonlySet<string> | undefined,
  invalidCellKeys: ReadonlySet<string> | undefined,
): { bgCell: string; bgCellMedium: string } | undefined {
  if (invalidCellKeys !== undefined && invalidCellKeys.size > 0 && invalidCellKeys.has(cellKey)) {
    return { bgCell: INVALID_INPUT_CELL_BG, bgCellMedium: INVALID_INPUT_CELL_BG }
  }
  if (changedCellKeys !== undefined && changedCellKeys.size > 0 && changedCellKeys.has(cellKey)) {
    return { bgCell: CHANGED_VS_SIM_CELL_BG, bgCellMedium: CHANGED_VS_SIM_CELL_BG }
  }
  return undefined
}
