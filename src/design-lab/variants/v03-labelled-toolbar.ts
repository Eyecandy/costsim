import { BASE_OPTIONS } from "@/design-lab/variants/base"
import type { LabVariant } from "@/design-lab/variants/types"

const variant: LabVariant = {
  id: "03",
  title: "Labelled toolbar",
  description:
    "Step 02 plus table actions with text next to the icons, and clearer editable fields and buttons.",
  notes: [1, 2, 3, 4, 5, 7, 9, 10, 11],
  changes: [
    "Toolbar buttons show icon and text (5)",
    "Cells and the project profile look editable (10)",
    "Fokusmodus and the actions look like buttons (11)",
  ],
  options: {
    ...BASE_OPTIONS,
    header: { fileName: "none", bar: "distinct", nav: "farRight", user: true },
    checkpoint: "once",
    inputHeading: "fileName",
    sidebar: "open",
    toolbar: "labelled",
    cues: { editable: true, buttons: true },
  },
}

export default variant
