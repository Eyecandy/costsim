import type { BVariant } from "@/design-lab/families/b/types"

const variant: BVariant = {
  id: "08",
  title: "Original teal, full information, stacked card",
  description:
    "The original teal colours with header bar and library panel, inputs stacked in one card on the left and the full result detail on the right.",
  changes: [
    "Cost items above drivers in one card",
    "Results in the right-hand column with key figure table and change table",
    "Library panel with search and filters",
  ],
  theme: "current",
  inputs: "stacked",
  layout: "columns",
  sidebar: "library",
  navBar: true,
  detail: "full",
}

export default variant
