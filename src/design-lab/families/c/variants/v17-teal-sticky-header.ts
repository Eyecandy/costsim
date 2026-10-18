import type { CVariant } from "@/design-lab/families/c/types"

const variant: CVariant = {
  id: "17",
  title: "Teal, sticky header, flat cards",
  description: "Flat square-cornered cards; the table header stays visible when the list scrolls.",
  changes: ["Sticky table header", "Totals row", "Flat, sharp-cornered cards with icon header"],
  theme: "current",
  cardStyle: "flat",
  cellStyle: "filled",
  airy: true,
  cardElevation: "flat",
  cardRadius: "sm",
  cardHeader: "icon",
  stickyHead: true,
  totalsRow: true,
}

export default variant
