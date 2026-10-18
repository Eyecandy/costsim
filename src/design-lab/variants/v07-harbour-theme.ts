import { BASE_OPTIONS } from "@/design-lab/variants/base"
import type { LabVariant } from "@/design-lab/variants/types"

const variant: LabVariant = {
  id: "07",
  title: "Row actions, Harbour Blue",
  description:
    "Step 04 in the Harbour Blue colour set, to see how a theme changes the same layout.",
  notes: [1, 2, 3, 4, 5, 6, 7, 9, 10, 11],
  changes: ["Harbour Blue colours: off-white page, teal tints"],
  options: {
    ...BASE_OPTIONS,
    theme: "harbour",
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
