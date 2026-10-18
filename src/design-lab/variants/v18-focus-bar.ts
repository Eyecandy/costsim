import { BASE_OPTIONS } from "@/design-lab/variants/base"
import type { LabVariant } from "@/design-lab/variants/types"

const variant: LabVariant = {
  id: "18",
  title: "Fokusmodus as a slim bar",
  description:
    "Fokusmodus as a slim full-width bar under the project profile, with a short explanation, and the checkpoint buttons in the header bar.",
  notes: [1, 2, 3, 4, 5, 6, 7, 9, 10, 11],
  changes: [
    "Fokusmodus gets a slim bar with one line of help text",
    "Checkpoint buttons in the header bar",
  ],
  options: {
    ...BASE_OPTIONS,
    header: { fileName: "none", bar: "distinct", nav: "farRight", user: true },
    checkpoint: "once",
    checkpointNav: "timeline",
    documentActions: "headerBar",
    focusButton: "bar",
    inputHeading: "fileName",
    sidebar: "open",
    toolbar: "labelled",
    rowActions: "inline",
    cues: { editable: true, buttons: true },
  },
}

export default variant
