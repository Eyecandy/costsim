import type { BVariant } from "@/design-lab/families/b/types"

const variant: BVariant = {
  id: "18",
  title: "Teal, detail drawer",
  description:
    "Original teal with a calm compact page and the heavy tables tucked into a right-hand drawer you open only when you need the detail.",
  changes: [
    "Right-hand detail drawer (key figure and change tables)",
    "Optional detail level, closed by default",
    "Inputs across the top, results below",
  ],
  theme: "current",
  inputs: "split",
  layout: "rows",
  density: "roomy",
  detailDrawer: true,
  navBar: true,
  detail: "compact",
  focusAtTitle: true,
  checkpointTone: "distinct",
  sidebar: "folders",
}

export default variant
