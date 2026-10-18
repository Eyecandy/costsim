import type { BVariant } from "@/design-lab/families/b/types"

const variant: BVariant = {
  id: "16",
  title: "Teal, results first",
  description:
    "Original teal that opens on the answer: key figures and charts first, the roomy input tables underneath for when you want to change something.",
  changes: [
    "Results above the inputs",
    "Roomy fixed-size cells",
    "Cost items and drivers stacked in one scroll",
  ],
  theme: "current",
  inputs: "stacked",
  layout: "rows",
  density: "roomy",
  resultsFirst: true,
  navBar: true,
  detail: "compact",
  focusAtTitle: true,
  checkpointTone: "distinct",
  sidebar: "folders",
}

export default variant
