import { BASE_OPTIONS } from "@/design-lab/variants/base"
import type { LabVariant } from "@/design-lab/variants/types"

const variant: LabVariant = {
  id: "17",
  title: "After archiving",
  description:
    "The same look as 16 once the checkpoint has been archived: it is marked as done in the timeline and Neste checkpoint is open.",
  notes: [1, 2, 3, 4, 5, 6, 7, 9, 10, 11],
  changes: [
    "Checkpoint 3 is archived (check mark, date)",
    "Neste checkpoint is open, in the timeline and as a button",
    "Arkiver checkpoint is gone",
  ],
  options: {
    ...BASE_OPTIONS,
    header: { fileName: "none", bar: "distinct", nav: "farRight", user: true },
    checkpoint: "once",
    checkpointNav: "timeline",
    checkpointState: "archived",
    documentActions: "inputRow",
    focusButton: "profileHeader",
    inputHeading: "fileName",
    sidebar: "open",
    toolbar: "labelled",
    rowActions: "inline",
    cues: { editable: true, buttons: true },
  },
}

export default variant
