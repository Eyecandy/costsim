import { BASE_OPTIONS } from "@/design-lab/variants/base"
import type { LabVariant } from "@/design-lab/variants/types"

const variant: LabVariant = {
  id: "16",
  title: "Small Fokusmodus in the profile",
  description:
    "Checkpoint buttons as in 14, and Fokusmodus as a small button in the project profile header instead of a large button beside it.",
  notes: [1, 2, 3, 4, 5, 6, 7, 9, 10, 11],
  changes: [
    "Fokusmodus is small and sits in the profile header, next to the arrow",
    "Open checkpoint: Arkiver checkpoint enabled, Neste checkpoint locked",
  ],
  options: {
    ...BASE_OPTIONS,
    header: { fileName: "none", bar: "distinct", nav: "farRight", user: true },
    checkpoint: "once",
    checkpointNav: "timeline",
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
