import type { ThemeId } from "@/design-lab/themes"

/** A look in family B (the workbench design). Steps inside the family change the theme or the details. */
export type BVariant = {
  /** Two digits; the look is called "B" plus the id, e.g. B02. */
  id: string
  title: string
  description: string
  changes: readonly string[]
  theme: ThemeId
}
