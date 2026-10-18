import type { CVariant } from "@/design-lab/families/c/types"

const variant: CVariant = {
  id: "01",
  title: "Sand, soft cards, underlined cells",
  description:
    "Large rounded cards with a soft shadow and no border. Cells are plain with an underline that shows where you can type.",
  changes: [
    "Soft cards, radius 24px, shadow instead of border",
    "Underlined editable cells",
    "Folder tree with search and New folder",
  ],
  theme: "clay",
  cardStyle: "soft",
  cellStyle: "underline",
}

export default variant
