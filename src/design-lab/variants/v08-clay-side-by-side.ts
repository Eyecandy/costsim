import { BASE_OPTIONS } from "@/design-lab/variants/base"
import type { LabVariant } from "@/design-lab/variants/types"

const variant: LabVariant = {
  id: "08",
  title: "Side-by-side, Clay",
  description: "Step 05 in the Clay colour set (teal brand with a warm clay accent).",
  notes: [1, 2, 3, 4, 5, 6, 7, 9, 10, 11],
  changes: ["Clay colours: warm linen page, clay accent"],
  options: {
    ...BASE_OPTIONS,
    theme: "clay",
    header: { fileName: "none", bar: "distinct", nav: "farRight", user: true },
    checkpoint: "once",
    inputHeading: "fileName",
    sidebar: "open",
    toolbar: "labelled",
    rowActions: "inline",
    cues: { editable: true, buttons: true },
    inputs: "sideBySide",
  },
}

export default variant
