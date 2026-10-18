import { BASE_OPTIONS } from "@/design-lab/variants/base"
import type { LabVariant } from "@/design-lab/variants/types"

const variant: LabVariant = {
  id: "13",
  title: "Timeline, hidden menu",
  description:
    "The timeline look (09) with the library menu hidden as today, so the timeline is the only thing on the left.",
  notes: [1, 3, 4, 5, 6, 7, 9, 10, 11],
  changes: [
    "Library menu stays a narrow hidden rail",
    "The timeline is the only left-hand navigation",
  ],
  options: {
    ...BASE_OPTIONS,
    header: { fileName: "none", bar: "distinct", nav: "farRight", user: true },
    checkpoint: "once",
    checkpointNav: "timeline",
    inputHeading: "fileName",
    sidebar: "rail",
    toolbar: "labelled",
    rowActions: "inline",
    cues: { editable: true, buttons: true },
  },
}

export default variant
