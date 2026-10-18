import { BASE_OPTIONS } from "@/design-lab/variants/base"
import type { LabVariant } from "@/design-lab/variants/types"

const variant: LabVariant = {
  id: "21",
  title: "Fokusmodus by the file name",
  description:
    "Like A20 (archived checkpoint, Harbour Blue, checkpoint buttons in the header bar), but Fokusmodus sits on the same row as the file name and is gone from the cost item and driver toolbars.",
  notes: [1, 2, 3, 4, 5, 6, 7, 9, 10, 11],
  changes: [
    "Fokusmodus on the same row as the file name",
    "Fokusmodus removed from the cost item and driver toolbars",
    "The project profile has only its arrow",
  ],
  options: {
    ...BASE_OPTIONS,
    theme: "harbour",
    header: { fileName: "none", bar: "distinct", nav: "farRight", user: true },
    checkpoint: "once",
    checkpointNav: "timeline",
    checkpointState: "archived",
    documentActions: "headerBar",
    focusButton: "titleRow",
    focusInToolbar: false,
    inputHeading: "fileName",
    sidebar: "open",
    toolbar: "labelled",
    rowActions: "inline",
    cues: { editable: true, buttons: true },
  },
}

export default variant
