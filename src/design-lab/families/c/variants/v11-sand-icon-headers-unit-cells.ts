import type { CVariant } from "@/design-lab/families/c/types"

const variant: CVariant = {
  id: "11",
  title: "Sand, icon headers, unit cells",
  description:
    "Each card header gets an icon tile; numbers carry their unit (kr, %) inside the cell.",
  changes: [
    "Icon tile in the card header",
    "Unit suffix inside each cell",
    "Soft cards, filled cells",
  ],
  theme: "clay",
  cardStyle: "soft",
  cellStyle: "filled",
  airy: true,
  cardHeader: "icon",
  unit: true,
}

export default variant
