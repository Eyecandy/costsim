import { BASE_OPTIONS } from "@/design-lab/variants/base"
import type { LabVariant } from "@/design-lab/variants/types"

const variant: LabVariant = {
  id: "27",
  title: "Calm two columns",
  description:
    "Keeps today's two-column page (input left, result right) but calmer: roomy fixed-width tables, more space between the cards, cost items and drivers as plain cards without collapse arrows, and the run button and result in the right column.",
  notes: [1, 2, 3, 4, 5, 6, 7, 9, 10, 11],
  changes: [
    "Same layout as today, with airy spacing and roomy fixed-width tables",
    "Plain cost item and driver cards (no collapse arrows)",
    "Library sidebar with search and folders",
    "Checkpoint timeline on the left, buttons in the file name row; Harbour Blue",
  ],
  options: {
    ...BASE_OPTIONS,
    header: { fileName: "none", bar: "distinct", nav: "farRight", user: true },
    checkpoint: "once",
    documentActions: "inputRow",
    checkpointTone: "accent",
    focusButton: "titleRow",
    focusInToolbar: false,
    inputHeading: "fileName",
    toolbar: "labelled",
    cues: { editable: true, buttons: true },
    theme: "harbour",
    checkpointNav: "timeline",
    checkpointState: "active",
    inputCards: "plain",
    sidebar: "library",
    rowActions: "inline",
    spacing: "airy",
    tableSize: "roomy",
  },
}

export default variant
