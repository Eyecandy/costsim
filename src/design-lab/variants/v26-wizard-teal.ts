import { BASE_OPTIONS } from "@/design-lab/variants/base"
import type { LabVariant } from "@/design-lab/variants/types"

const variant: LabVariant = {
  id: "26",
  title: "Wizard, original teal",
  description:
    "The guided wizard (A25) in the original teal, without the library: only the narrow menu rail, checkpoint tabs under the file name, and the checkpoint still open so Neste checkpoint is locked.",
  notes: [1, 2, 3, 4, 5, 6, 7, 9, 10, 11],
  changes: [
    "Original teal instead of Sand",
    "Narrow menu rail instead of the open library",
    "Checkpoint tabs (Checkpoint 1 once) instead of the strip",
    "Checkpoint open: Arkiver checkpoint active, Neste checkpoint locked",
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
    checkpointNav: "tabs",
    checkpointState: "active",
    sidebar: "rail",
    rowActions: "inline",
    spacing: "airy",
    tableSize: "roomy",
    flow: "wizard",
  },
}

export default variant
