import type { CVariant } from "@/design-lab/families/c/types"

const variant: CVariant = {
  id: "14",
  title: "Teal, hover row actions",
  description: "Quiet rows; edit and delete icons appear only for the row you point at.",
  changes: [
    "Row highlight on hover",
    "Edit and delete revealed on hover",
    "Left accent bar on cards",
  ],
  theme: "current",
  cardStyle: "tinted",
  cellStyle: "underline",
  airy: true,
  cardAccent: "left",
  hoverActions: true,
}

export default variant
