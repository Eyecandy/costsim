import { BASE_OPTIONS } from "@/design-lab/variants/base"
import type { LabVariant } from "@/design-lab/variants/types"

const variant: LabVariant = {
  id: "20",
  title: "Archived checkpoint, Harbour Blue",
  description:
    "The archived state with a small Fokusmodus in the profile and the checkpoint buttons in the header bar, in Harbour Blue.",
  notes: [1, 2, 3, 4, 5, 6, 7, 9, 10, 11],
  changes: [
    "Harbour Blue colours",
    "Header bar holds the checkpoint buttons; Neste checkpoint is open",
  ],
  options: {
    ...BASE_OPTIONS,
    theme: "harbour",
    header: { fileName: "none", bar: "distinct", nav: "farRight", user: true },
    checkpoint: "once",
    checkpointNav: "timeline",
    checkpointState: "archived",
    documentActions: "headerBar",
    focusButton: "profileHeader",
    inputHeading: "fileName",
    sidebar: "open",
    toolbar: "labelled",
    rowActions: "inline",
    cues: { editable: true, buttons: true },
  },
}

export default variant
