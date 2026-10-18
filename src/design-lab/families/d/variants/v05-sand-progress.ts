import type { DVariant } from "@/design-lab/families/d/types"

const variant: DVariant = {
  id: "05",
  title: "Sand, progress bar and ticks",
  description:
    "The guided flow with a percent-complete bar above the step and a tick on every finished step.",
  changes: [
    "A progress bar that says how many percent is done",
    "Finished steps get a tick and the word Ferdig",
    "Checkpoints as a row of pills",
  ],
  theme: "clay",
  stepper: "top",
  progress: true,
  ticks: true,
}

export default variant
