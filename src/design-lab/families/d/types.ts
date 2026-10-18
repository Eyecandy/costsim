import type { ThemeId } from "@/design-lab/themes"

/** A look in family D (the guided flow: one step at a time, with a stepper). */
export type DVariant = {
  /** Two digits; the look is called "D" plus the id, e.g. D02. */
  id: string
  title: string
  description: string
  changes: readonly string[]
  theme: ThemeId
  /** The steps as a bar across the top, or as a vertical list with explanations beside the step. */
  stepper: "top" | "side"
}
