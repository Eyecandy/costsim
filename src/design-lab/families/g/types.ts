import type { ThemeId } from "@/design-lab/themes"

/** A look in family G (card list, tablet first). */
export type GVariant = {
  /** Two digits; the look is called "G" plus the id, e.g. G02. */
  id: string
  title: string
  description: string
  changes: readonly string[]
  theme: ThemeId
  /** Card size: every card in a look has the same fixed size. */
  cardSize: "regular" | "large"
  /** How the low / most likely / high range bar is drawn. */
  bar: "band" | "gradient" | "dots"
  /** Results in a bottom sheet you pull up, or a sticky bar with the key figures always visible. */
  results: "sheet" | "bar"
  /** Cost items and drivers as two columns side by side, or stacked sections with wrapping cards. */
  layout: "columns" | "wrap"
  /** Soft rounded cards, or straight ones. */
  corners: "soft" | "sharp"
}
