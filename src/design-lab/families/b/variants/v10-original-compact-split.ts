import type { BVariant } from "@/design-lab/families/b/types"

const variant: BVariant = {
  id: "10",
  title: "Original teal, less information, split card",
  description:
    "Header bar and library panel with cost items and drivers side by side, but the results kept short: key figures and three charts.",
  changes: [
    "Cost items and drivers visible together",
    "Results as tiles and a row of three charts",
    "Library panel with search and filters",
  ],
  theme: "current",
  inputs: "split",
  layout: "rows",
  sidebar: "library",
  navBar: true,
  detail: "compact",
}

export default variant
