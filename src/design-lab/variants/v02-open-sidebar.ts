import { BASE_OPTIONS } from "@/design-lab/variants/base"
import type { LabVariant } from "@/design-lab/variants/types"

const variant: LabVariant = {
  id: "02",
  title: "Open sidebar",
  description:
    "Step 01 plus the library sidebar open by default, with an arrow to hide and show it.",
  notes: [1, 2, 3, 4, 7, 9],
  changes: [
    "Sidebar is open by default (2)",
    "A double arrow hides it, and another shows it again (2)",
  ],
  options: {
    ...BASE_OPTIONS,
    header: { fileName: "none", bar: "distinct", nav: "farRight", user: true },
    checkpoint: "once",
    inputHeading: "fileName",
    sidebar: "open",
  },
}

export default variant
