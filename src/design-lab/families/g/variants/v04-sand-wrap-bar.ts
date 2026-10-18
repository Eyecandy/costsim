import type { GVariant } from "@/design-lab/families/g/types"

const variant: GVariant = {
  id: "04",
  title: "Sand, large grid, sticky bar",
  description:
    "Large cards in a wrapping grid with dot range bars and a sticky results bar at the bottom.",
  changes: ["Large wrapping grid", "Dot range bar", "Sticky results bar"],
  theme: "clay",
  cardSize: "large",
  bar: "dots",
  results: "bar",
  layout: "wrap",
  corners: "sharp",
}

export default variant
