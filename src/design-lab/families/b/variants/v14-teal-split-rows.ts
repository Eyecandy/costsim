import type { BVariant } from "@/design-lab/families/b/types"

const variant: BVariant = {
  id: "14",
  title: "Teal, split in rows",
  description:
    "Original teal with inputs side by side across the top and the results in a wide band below, so nothing needs scrolling sideways.",
  changes: [
    "Inputs across the top, results below",
    "Fokusmodus beside the file name",
    "Checkpoints in their own colour",
  ],
  theme: "current",
  inputs: "split",
  layout: "rows",
  sidebar: "library",
  navBar: true,
  detail: "compact",
  focusAtTitle: true,
  checkpointTone: "distinct",
}

export default variant
