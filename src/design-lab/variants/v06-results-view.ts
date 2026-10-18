import { BASE_OPTIONS } from "@/design-lab/variants/base"
import type { LabVariant } from "@/design-lab/variants/types"

const variant: LabVariant = {
  id: "06",
  title: "Results view",
  description:
    "Step 05 plus the results as horizontal cards, and the full result as a full-screen view with the run button in a bottom bar.",
  notes: [1, 2, 3, 4, 5, 6, 7, 9, 10, 11],
  changes: [
    "Results as horizontal cards instead of one long column",
    "Run button in a bottom bar",
    "Full-screen result view",
  ],
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
    results: "cards",
    simulation: "fullscreen",
  },
}

export default variant
