import type { DVariant } from "@/design-lab/families/d/types"

const variant: DVariant = {
  id: "10",
  title: "Sand, everything together",
  description:
    "The full guided flow: progress and ticks, help panel, hints, drivers beside the cost items, review and a big result number.",
  changes: [
    "Progress bar, ticks, help panel and validation hints",
    "Drivers with values beside the cost items",
    "Review before running and a big headline number",
    "Enter goes to the next step",
  ],
  theme: "clay",
  stepper: "side",
  progress: true,
  ticks: true,
  helpPanel: true,
  hints: true,
  together: true,
  review: true,
  headline: true,
  enterNext: true,
}

export default variant
