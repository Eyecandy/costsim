import { BASE_OPTIONS } from "@/design-lab/variants/base"
import type { LabVariant } from "@/design-lab/variants/types"

const variant: LabVariant = {
  id: "25",
  title: "Guided wizard",
  description:
    "One step at a time: a stepper across the top (Inndata, Kjør simulering, Resultat) with Tilbake and Neste steg buttons, with the collapsible project profile always on top. The least to look at and the clearest next move; the checkpoint is archived at the end.",
  notes: [1, 2, 3, 4, 5, 6, 7, 9, 10, 11],
  changes: [
    "Stepper with check marks for finished steps",
    "Only the current step is shown (both tables in step 1), with Tilbake / Neste steg",
    "Middle step is only the Kjør simulering button, then the result",
    "Checkpoint already archived, so Neste checkpoint is open; Sand colours",
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
    checkpointNav: "strip",
    checkpointState: "archived",
    sidebar: "library",
    rowActions: "inline",
    spacing: "airy",
    tableSize: "roomy",
    flow: "wizard",
  },
}

export default variant
