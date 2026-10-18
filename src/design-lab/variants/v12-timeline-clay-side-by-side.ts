import { BASE_OPTIONS } from "@/design-lab/variants/base"
import type { LabVariant } from "@/design-lab/variants/types"

const variant: LabVariant = {
  id: "12",
  title: "Timeline, side by side, Clay",
  description:
    "Timeline on the left and cost items next to drivers (10), in the warm Clay colour set.",
  notes: [1, 2, 3, 4, 5, 6, 7, 9, 10, 11],
  changes: [
    "Clay colours: warm linen page, clay accent",
    "Cost items and drivers are plain cards, without the collapse arrows",
  ],
  options: {
    ...BASE_OPTIONS,
    theme: "clay",
    header: { fileName: "none", bar: "distinct", nav: "farRight", user: true },
    checkpoint: "once",
    checkpointNav: "timeline",
    inputCards: "plain",
    inputHeading: "fileName",
    sidebar: "open",
    toolbar: "labelled",
    rowActions: "inline",
    cues: { editable: true, buttons: true },
    inputs: "sideBySide",
  },
}

export default variant
