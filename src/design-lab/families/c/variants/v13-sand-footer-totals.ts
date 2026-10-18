import type { CVariant } from "@/design-lab/families/c/types"

const variant: CVariant = {
  id: "13",
  title: "Sand, footer totals, totals row",
  description: "Input cards end with a footer strip, and each table has its own totals row.",
  changes: ["Card footer with total or count", "Totals row under the table", "Raised elevation"],
  theme: "clay",
  cardStyle: "flat",
  cellStyle: "zebra",
  airy: true,
  cardElevation: "raised",
  cardFooter: true,
  totalsRow: true,
}

export default variant
