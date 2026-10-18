import type { ThemeId } from "@/design-lab/themes"

export type CardStyle = "flat" | "soft" | "outlined" | "tinted"
export type CellStyle = "underline" | "filled" | "pill" | "zebra" | "range"

/** A look in family C (cards and cells). The two styles are what this family is about. */
export type CVariant = {
  /** Two digits; the look is called "C" plus the id, e.g. C02. */
  id: string
  title: string
  description: string
  changes: readonly string[]
  /** Sand ("clay") or the original teal ("current"); no dark themes. */
  theme: ThemeId
  /** How the cards (cost items, drivers, results) look. */
  cardStyle: CardStyle
  /** How the cells in the tables look. */
  cellStyle: CellStyle
  /** More room: taller rows and larger text, for a calmer page. */
  airy?: boolean
}
