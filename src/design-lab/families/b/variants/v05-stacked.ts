import type { BVariant } from "@/design-lab/families/b/types"

const variant: BVariant = {
  id: "05",
  title: "Workbench, one card stacked",
  description:
    "Keeps the original two-column workbench, but cost items and drivers sit one above the other in the same card instead of in tabs.",
  changes: [
    "Cost items above drivers in one card, no tabs",
    "Assumptions as a strip at the bottom",
    "Results stay in the right-hand column",
  ],
  theme: "current",
  inputs: "stacked",
  layout: "columns",
}

export default variant
