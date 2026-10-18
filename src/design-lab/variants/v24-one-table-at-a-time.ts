import { BASE_OPTIONS } from "@/design-lab/variants/base"
import type { LabVariant } from "@/design-lab/variants/types"

const variant: LabVariant = {
  id: "24",
  title: "One table at a time",
  description:
    "Cost items and drivers share one step with a two-way switch, so only one table is on screen and it gets all the room. Checkpoints are a horizontal strip above the work, with Neste checkpoint locked until the open one is archived.",
  notes: [1, 2, 3, 4, 5, 6, 7, 9, 10, 11],
  changes: [
    "Switch between Kostnadsposter and Drivere (with row counts)",
    "Horizontal checkpoint strip with a locked next step",
    "Three steps instead of four: Profile, Inputs, Run and result",
    "Harbour Blue colours, library sidebar",
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
    theme: "harbour",
    checkpointNav: "strip",
    checkpointState: "active",
    sidebar: "library",
    rowActions: "inline",
    spacing: "airy",
    tableSize: "roomy",
    flow: "steps",
    inputsView: "tabs",
  },
}

export default variant
