import type { CVariant } from "@/design-lab/families/c/types"

const variant: CVariant = {
  id: "18",
  title: "Sand, big touch cells",
  description:
    "Cells at least 48 px high with pill values, round cards and everything easy to tap.",
  changes: ["48 px touch-friendly cells", "Pill values with unit", "Very round cards with footer"],
  theme: "clay",
  cardStyle: "soft",
  cellStyle: "pill",
  airy: true,
  touch: true,
  unit: true,
  cardRadius: "xl",
  cardFooter: true,
  focusRing: true,
}

export default variant
