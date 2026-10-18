import { BASE_OPTIONS } from "@/design-lab/variants/base"
import type { LabVariant } from "@/design-lab/variants/types"

const variant: LabVariant = {
  id: "14",
  title: "Save and Checkpoint buttons",
  description:
    "The timeline look (09) with a visible Save button and a Checkpoint button next to the file name.",
  notes: [1, 2, 3, 4, 5, 6, 7, 9, 10, 11],
  changes: ["Lagre and Neste checkpoint as buttons beside the file name", "Saved status with time"],
  options: {
    ...BASE_OPTIONS,
    header: { fileName: "none", bar: "distinct", nav: "farRight", user: true },
    checkpoint: "once",
    checkpointNav: "timeline",
    documentActions: "inputRow",
    inputHeading: "fileName",
    sidebar: "open",
    toolbar: "labelled",
    rowActions: "inline",
    cues: { editable: true, buttons: true },
  },
}

export default variant
