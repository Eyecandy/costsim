import type { ThemeId } from "@/design-lab/themes"

/** A look in family F (Regneark: cost items and drivers as one spreadsheet). */
export type FVariant = {
  /** Two digits; the look is called "F" plus the id, e.g. F02. */
  id: string
  title: string
  description: string
  changes: readonly string[]
  theme: ThemeId
  /** Results docked under the sheet, or in a collapsible panel on the right. */
  results: "bottom" | "right"
  /** Row height: roomy or extra roomy (never compact). */
  rows: "roomy" | "airy"
  /** Cell separation: visible grid lines, or row bands with only thin row lines. */
  lines: "grid" | "bands"
  /** The library as a panel on the left (with search and folders), or left out. */
  library: boolean
}
