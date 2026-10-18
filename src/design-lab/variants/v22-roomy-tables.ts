import { BASE_OPTIONS } from "@/design-lab/variants/base"
import type { LabVariant } from "@/design-lab/variants/types"

const variant: LabVariant = {
  id: "22",
  title: "Roomy tables",
  description:
    "A21 with the tables made calmer: fixed column widths so a cell never changes width with its content, taller rows, larger text, and more air between the sections. Original teal, checkpoint buttons in a different colour from Fokusmodus.",
  notes: [1, 2, 3, 4, 5, 6, 7, 9, 10, 11],
  changes: [
    "Tables with fixed column widths; long values are cut off with an ellipsis instead of widening the cell",
    "Taller rows (48 px) and 13 px text instead of 12 px",
    "More whitespace between and inside the sections",
    "Archive and Next checkpoint buttons use the accent colour, not the Fokusmodus colour",
  ],
  options: {
    ...BASE_OPTIONS,
    header: { fileName: "none", bar: "distinct", nav: "farRight", user: true },
    checkpoint: "once",
    documentActions: "headerBar",
    checkpointTone: "accent",
    focusButton: "titleRow",
    focusInToolbar: false,
    inputHeading: "fileName",
    toolbar: "labelled",
    cues: { editable: true, buttons: true },
    theme: "current",
    checkpointNav: "timeline",
    checkpointState: "active",
    sidebar: "open",
    rowActions: "inline",
    spacing: "airy",
    tableSize: "roomy",
  },
}

export default variant
