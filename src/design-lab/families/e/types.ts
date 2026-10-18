import type { ThemeId } from "@/design-lab/themes"

/** A look in family E (a document with a results rail that stays in view). */
export type EVariant = {
  /** Two digits; the look is called "E" plus the id, e.g. E02. */
  id: string
  title: string
  description: string
  changes: readonly string[]
  theme: ThemeId
  /** Results in a rail on the right while you scroll the inputs, or as a band on top of the page. */
  results: "rail" | "top"
  /** More air in the table rows and between sections. */
  airy: boolean
  /** The library as a panel on the left (with search and folders), or left out. */
  library: boolean
}
