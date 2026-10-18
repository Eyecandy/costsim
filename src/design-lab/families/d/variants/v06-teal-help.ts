import type { DVariant } from "@/design-lab/families/d/types"

const variant: DVariant = {
  id: "06",
  title: "Teal, help panel and hints",
  description:
    "Each step has a help panel with an example and tips, and the tables explain what is missing.",
  changes: [
    "A help panel with an example and tips on every step",
    "Validation hint under the tables: fill in low, most likely and high",
    "Checkpoints as a small vertical timeline",
  ],
  theme: "current",
  stepper: "side",
  helpPanel: true,
  hints: true,
  checkpoints: "timeline",
}

export default variant
