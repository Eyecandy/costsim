import type { GVariant } from "@/design-lab/families/g/types"

const variant: GVariant = {
  id: "03",
  title: "Harbour, card grid",
  description:
    "Cost items above, drivers below, each as a grid of equal cards with dot-style range bars. Results in a bottom sheet.",
  changes: ["Wrapping card grid", "Dot range bar", "Bottom sheet for results"],
  theme: "harbour",
  cardSize: "regular",
  bar: "dots",
  results: "sheet",
  layout: "wrap",
  corners: "soft",
}

export default variant
