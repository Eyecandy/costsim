import { BASE_OPTIONS } from "@/design-lab/variants/base"
import type { LabVariant } from "@/design-lab/variants/types"

const variant: LabVariant = {
  id: "04",
  title: "Row actions",
  description:
    "Step 03 plus documentation and impact directly on each row. The impact opens right under the driver, so there is no scrolling up.",
  notes: [1, 2, 3, 4, 5, 6, 7, 9, 10, 11],
  changes: [
    "Documentation and Impact buttons on every row (6)",
    "Impact opens under the driver row (6)",
    "Define and Impact leave the toolbar (6)",
  ],
  options: {
    ...BASE_OPTIONS,
    header: { fileName: "none", bar: "distinct", nav: "farRight", user: true },
    checkpoint: "once",
    inputHeading: "fileName",
    sidebar: "open",
    toolbar: "labelled",
    rowActions: "inline",
    cues: { editable: true, buttons: true },
  },
}

export default variant
