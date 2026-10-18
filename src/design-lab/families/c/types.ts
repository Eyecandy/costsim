import type { ThemeId } from "@/design-lab/themes"

export type CardStyle = "flat" | "soft" | "outlined" | "tinted"
export type CardHeader = "plain" | "icon" | "chip"
export type CardAccent = "none" | "corner" | "left"
export type CardElevation = "default" | "flat" | "raised" | "glass"
export type CardRadius = "sm" | "md" | "xl"
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
  /** Card header: number badge (plain), an icon tile, or a section number chip ("01"). */
  cardHeader?: CardHeader
  /** A coloured accent on the card: a folded corner or a bar down the left side. */
  cardAccent?: CardAccent
  /** Shadow and surface: flat (none), raised (deep shadow) or glass (translucent, blurred). */
  cardElevation?: CardElevation
  /** Corner radius of the cards, overriding the card style's own. */
  cardRadius?: CardRadius
  /** A footer on the input cards with the total (cost items) or the count (drivers). */
  cardFooter?: boolean
  /** Unit written inside the cell after the number (kr, %). */
  unit?: boolean
  /** A visible focus ring around the cell under the keyboard or the pointer. */
  focusRing?: boolean
  /** Edit and delete icons that appear when the row is hovered or focused. */
  hoverActions?: boolean
  /** Cells look like inputs, with a pencil that appears on hover. */
  pencil?: boolean
  /** Low values tinted cool and high values tinted warm in the range columns. */
  heat?: boolean
  /** The header row stays in view while the table scrolls. */
  stickyHead?: boolean
  /** A totals row at the bottom of the table. */
  totalsRow?: boolean
  /** Bigger, touch-friendly cells (at least 48 px high). */
  touch?: boolean
}
