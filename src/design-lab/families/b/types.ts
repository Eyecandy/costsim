import type { ThemeId } from "@/design-lab/themes"

/** A look in family B (the workbench design). Steps inside the family change the theme or the details. */
export type BVariant = {
  /** Two digits; the look is called "B" plus the id, e.g. B02. */
  id: string
  title: string
  description: string
  changes: readonly string[]
  theme: ThemeId
  /** Cost items, drivers and assumptions: one at a time in tabs, side by side ("split"), or stacked in one card. */
  inputs: "tabs" | "split" | "stacked"
  /** Inputs on the left and results on the right ("columns"), or inputs across the top and results below ("rows"). */
  layout: "columns" | "rows"
}
