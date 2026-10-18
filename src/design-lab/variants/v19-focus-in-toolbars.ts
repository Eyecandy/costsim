import { BASE_OPTIONS } from "@/design-lab/variants/base"
import type { LabVariant } from "@/design-lab/variants/types"

const variant: LabVariant = {
  id: "19",
  title: "Fokusmodus only in the toolbars",
  description:
    "No separate Fokusmodus button by the profile: it lives in each table toolbar. Cost items and drivers side by side as plain cards, checkpoint buttons beside the file name.",
  notes: [1, 2, 3, 4, 5, 6, 7, 9, 10, 11],
  changes: [
    "Fokusmodus only in the cost item and driver toolbars",
    "Side by side, plain cards without arrows",
    "Open checkpoint: Neste checkpoint locked",
  ],
  options: {
    ...BASE_OPTIONS,
    header: { fileName: "none", bar: "distinct", nav: "farRight", user: true },
    checkpoint: "once",
    checkpointNav: "timeline",
    documentActions: "inputRow",
    focusButton: "toolbarOnly",
    inputCards: "plain",
    inputHeading: "fileName",
    sidebar: "open",
    toolbar: "labelled",
    rowActions: "inline",
    cues: { editable: true, buttons: true },
    inputs: "sideBySide",
  },
}

export default variant
