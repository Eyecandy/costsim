import type { GVariant } from "@/design-lab/families/g/types"

const variant: GVariant = {
  id: "01",
  title: "Sand, results sheet",
  description:
    "Cost items and drivers as cards in two columns, with a range bar on each card. Results are in a bottom sheet you pull up.",
  changes: ["A card per item and driver", "Band range bar", "Bottom sheet for results"],
  theme: "clay",
  cardSize: "regular",
  bar: "band",
  results: "sheet",
  layout: "columns",
  corners: "soft",
}

export default variant
