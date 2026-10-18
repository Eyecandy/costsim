import type { BVariant } from "@/design-lab/families/b/types"

const variant: BVariant = {
  id: "11",
  title: "Like B08, Fokusmodus by the file name",
  description:
    "B08 with Fokusmodus moved up next to the file name, above the checkpoints, and the checkpoint steps in their own blue so they are not mistaken for the Fokusmodus and Kjør simulering buttons.",
  changes: [
    "Fokusmodus is an outlined button beside the file name, no longer in the input card",
    "Checkpoint steps use the blue accent instead of the teal action colour",
    "Kjør simulering stays the only filled teal button",
  ],
  theme: "current",
  inputs: "stacked",
  layout: "columns",
  sidebar: "library",
  navBar: true,
  detail: "full",
  focusAtTitle: true,
  checkpointTone: "distinct",
}

export default variant
