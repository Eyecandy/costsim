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
  /** The left side: a narrow icon rail ("icons"), or a library panel with search and filters that can fold into the rail ("library"). */
  sidebar: "icons" | "library"
  /** A header bar above the command bar with the brand, links, language and user ("true"), or those inside the command bar. */
  navBar: boolean
  /** How much the results show: key figures and charts only ("compact"), or also the full key figure table and the change table as in family A ("full"). */
  detail: "compact" | "full"
  /** Fokusmodus next to the file name above the checkpoints, instead of in the input card. */
  focusAtTitle?: boolean
  /** The checkpoint steps in their own colour ("distinct"), so they are not confused with Fokusmodus and Kjør simulering. */
  checkpointTone?: "brand" | "distinct"
}
