import type { ThemeId } from "@/design-lab/themes"

/** A look in family H ("Rapport først": a readable report, inputs behind an edit mode). */
export type HVariant = {
  /** Two digits; the look is called "H" plus the id, e.g. H02. */
  id: string
  title: string
  description: string
  changes: readonly string[]
  theme: ThemeId
  /** Edit mode: a drawer on the right beside the report, or the inputs opening inline in the page. */
  edit: "drawer" | "inline"
  /** Headline numbers: three large cards, or one big sentence with the numbers beside it. */
  headline: "cards" | "sentence"
  /** Charts next to each other, or under each other at full width. */
  charts: "side" | "stacked"
  /** The library on the left: always, only while reading, or not at all. */
  library: "always" | "read" | "none"
}
