import type { BVariant } from "@/design-lab/families/b/types"

const variant: BVariant = {
  id: "04",
  title: "Workbench, split card",
  description:
    "Cost items and drivers side by side in the same card, so both are always visible. Assumptions are a strip at the bottom. Results sit below, across the page.",
  changes: [
    "Cost items and drivers visible at the same time, in one card",
    "Assumptions as a strip instead of a tab",
    "Inputs across the top, key figures and three charts in a row below",
  ],
  theme: "current",
  inputs: "split",
  layout: "rows",
  sidebar: "icons",
  navBar: false,
  detail: "compact",
}

export default variant
