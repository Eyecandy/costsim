import type { FVariant } from "@/design-lab/families/f/types"

const variant: FVariant = {
  id: "01",
  title: "Sand, grid lines, results below",
  description:
    "A spreadsheet with visible grid lines on Sand, and the results docked under the sheet.",
  changes: ["Grid lines between cells", "Results docked at the bottom", "Library on the left"],
  theme: "clay",
  results: "bottom",
  rows: "roomy",
  lines: "grid",
  library: true,
}

export default variant
