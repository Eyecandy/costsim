import { BASE_OPTIONS } from "@/design-lab/variants/base"
import type { LabVariant } from "@/design-lab/variants/types"

const variant: LabVariant = {
  id: "14",
  title: "Checkpoint buttons",
  description:
    "The timeline look (09) with the checkpoint buttons next to the file name. No Save button (saving is automatic). Neste checkpoint is locked until the open checkpoint is archived.",
  notes: [1, 2, 3, 4, 5, 6, 7, 9, 10, 11],
  changes: [
    "Arkiver checkpoint is the action while the checkpoint is open",
    "Neste checkpoint is locked (with a lock and a hint) until it is archived",
    "No Save button",
  ],
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
