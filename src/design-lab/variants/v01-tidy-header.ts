import { BASE_OPTIONS } from "@/design-lab/variants/base"
import type { LabVariant } from "@/design-lab/variants/types"

const variant: LabVariant = {
  id: "01",
  title: "Tidy header",
  description:
    "Only the top of the page changes: a clear header bar, the file name moves down, and the account sits at the far right.",
  notes: [1, 3, 4, 7, 9],
  changes: [
    "File name is no longer in the header (1)",
    "File name replaces the small INPUT label (4)",
    "Checkpoint 1 is shown once (3)",
    "Links, language and user menu at the far right (7)",
    "Header is a distinct bar (9)",
  ],
  options: {
    ...BASE_OPTIONS,
    header: { fileName: "none", bar: "distinct", nav: "farRight", user: true },
    checkpoint: "once",
    inputHeading: "fileName",
  },
}

export default variant
