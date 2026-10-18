import type { CVariant } from "@/design-lab/families/c/types"

const variant: CVariant = {
  id: "12",
  title: "Teal, corner accent, focus-ring cells",
  description: "A folded accent corner on every card and a clear ring around the cell you are in.",
  changes: [
    "Accent corner on cards",
    "Focus and hover ring on cells",
    "Outlined cards, underlined cells",
  ],
  theme: "current",
  cardStyle: "outlined",
  cellStyle: "underline",
  airy: true,
  cardAccent: "corner",
  focusRing: true,
}

export default variant
