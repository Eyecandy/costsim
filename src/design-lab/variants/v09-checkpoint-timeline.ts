import { BASE_OPTIONS } from "@/design-lab/variants/base"
import type { LabVariant } from "@/design-lab/variants/types"

const variant: LabVariant = {
  id: "09",
  title: "Checkpoint timeline",
  description:
    "Step 04 with the checkpoints as a vertical timeline on the left: finished ones with a check, the active one highlighted, and the next one as a dashed step.",
  notes: [1, 2, 3, 4, 5, 6, 7, 9, 10, 11],
  changes: [
    "Checkpoints as a timeline on the left, replacing the tabs above the tables",
    "Each step shows number, name, status and date",
    "Next checkpoint is the dashed step at the end",
  ],
  options: {
    ...BASE_OPTIONS,
    header: { fileName: "none", bar: "distinct", nav: "farRight", user: true },
    checkpoint: "once",
    checkpointNav: "timeline",
    inputHeading: "fileName",
    sidebar: "open",
    toolbar: "labelled",
    rowActions: "inline",
    cues: { editable: true, buttons: true },
  },
}

export default variant
