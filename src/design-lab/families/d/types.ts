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
  /** A bar with "50 % ferdig" above the step. */
  progress?: boolean
  /** Finished steps get a tick and the word "Ferdig". */
  ticks?: boolean
  /** A help panel beside the step with an example and tips. */
  helpPanel?: boolean
  /** Validation hints under the tables ("Fyll inn lav, mest sannsynlig og høy"). */
  hints?: boolean
  /** On the cost step, the drivers with their values stay beside the cost items on wide screens. */
  together?: boolean
  /** The last step first shows a checklist; the results appear after "Kjør simulering". */
  review?: boolean
  /** The result step opens with one big headline number. */
  headline?: boolean
  /** Enter goes to the next step, and the button says so. */
  enterNext?: boolean
  /** Mobile-first: one narrow column, a compact "Steg 2 av 4" line instead of the full stepper on phones. */
  singleColumn?: boolean
  /** The checkpoints as a row of pills (default) or a small vertical timeline. */
  checkpoints?: "row" | "timeline"
}
