import type { CVariant } from "@/design-lab/families/c/types"

const variant: CVariant = {
  id: "16",
  title: "Harbour, colour-coded ranges",
  description: "Low values are tinted cool and high values warm, next to the spread bar.",
  changes: ["Cool/warm tint on low and high columns", "Spread bar", "Glass cards"],
  theme: "harbour",
  cardStyle: "tinted",
  cellStyle: "range",
  airy: true,
  cardElevation: "glass",
  heat: true,
  unit: true,
}

export default variant
