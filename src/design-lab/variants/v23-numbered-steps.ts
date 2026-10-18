import { BASE_OPTIONS } from "@/design-lab/variants/base"
import type { LabVariant } from "@/design-lab/variants/types"

const variant: LabVariant = {
  id: "23",
  title: "Numbered steps",
  description:
    "The page as four numbered steps in one calm column: 1 Project profile, 2 Cost items, 3 Drivers, 4 Run and result. Each step has a one-line hint saying what to do, and the library sits on the left with search and folders.",
  notes: [1, 2, 3, 4, 5, 6, 7, 9, 10, 11],
  changes: [
    "One column of numbered step cards with a hint each",
    "Library sidebar with search, status filters and Ny mappe",
    "Fokusmodus on the file name row; checkpoint timeline on the left",
    "Roomy fixed-width tables, Sand colours",
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
    theme: "clay",
    checkpointNav: "timeline",
    checkpointState: "active",
    sidebar: "library",
    rowActions: "inline",
    spacing: "airy",
    tableSize: "roomy",
    flow: "steps",
  },
}

export default variant
