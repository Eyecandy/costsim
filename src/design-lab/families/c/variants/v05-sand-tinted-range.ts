import type { CVariant } from "@/design-lab/families/c/types"

const variant: CVariant = {
  id: "05",
  title: "Sand, tinted cards, range bars",
  description:
    "Each row gets a small bar from optimistic to pessimistic with a marker for most likely, so the spread is visible at a glance.",
  changes: ["Spread bar in every row", "Tinted cards", "Folder tree with search and New folder"],
  theme: "clay",
  cardStyle: "tinted",
  cellStyle: "range",
}

export default variant
