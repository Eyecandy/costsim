import { BASE_OPTIONS } from "@/design-lab/variants/base"
import type { LabVariant } from "@/design-lab/variants/types"

const variant: LabVariant = {
  id: "05",
  title: "Side-by-side inputs",
  description:
    "Step 04 plus cost items and drivers next to each other, results below, so less scrolling.",
  notes: [1, 2, 3, 4, 5, 6, 7, 9, 10, 11],
  changes: ["Cost items and drivers side by side", "Output moves below the inputs, full width"],
  options: {
    ...BASE_OPTIONS,
    header: { fileName: "none", bar: "distinct", nav: "farRight", user: true },
    checkpoint: "once",
    inputHeading: "fileName",
    sidebar: "open",
    toolbar: "labelled",
    rowActions: "inline",
    cues: { editable: true, buttons: true },
    inputs: "sideBySide",
  },
}

export default variant
