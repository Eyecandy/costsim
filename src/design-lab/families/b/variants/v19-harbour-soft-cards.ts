import type { BVariant } from "@/design-lab/families/b/types"

const variant: BVariant = {
  id: "19",
  title: "Harbour, soft cards",
  description:
    "Harbour blue with large soft cards from family C and numbered headings, so the page reads as step 1 cost items, step 2 drivers, step 3 assumptions.",
  changes: [
    "Soft rounded cards with numbered headings",
    "Roomy fixed-size cells",
    "Cost items and drivers stacked, results beside",
  ],
  theme: "harbour",
  inputs: "stacked",
  layout: "columns",
  density: "roomy",
  cardStyle: "soft",
  navBar: true,
  detail: "compact",
  focusAtTitle: true,
  checkpointTone: "distinct",
  sidebar: "folders",
}

export default variant
