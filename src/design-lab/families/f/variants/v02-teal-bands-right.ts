import type { FVariant } from "@/design-lab/families/f/types"

const variant: FVariant = {
  id: "02",
  title: "Teal, row bands, results panel",
  description:
    "Row bands instead of grid lines in the original teal, with a collapsible results panel on the right.",
  changes: [
    "Row bands, no vertical lines",
    "Collapsible results panel on the right",
    "Library on the left",
  ],
  theme: "current",
  results: "right",
  rows: "roomy",
  lines: "bands",
  library: true,
}

export default variant
