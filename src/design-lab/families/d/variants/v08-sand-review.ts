import type { DVariant } from "@/design-lab/families/d/types"

const variant: DVariant = {
  id: "08",
  title: "Sand, review before running",
  description:
    "The last step first shows a checklist with links back, and only after Kjør simulering does it show a big headline number.",
  changes: [
    "A review checklist before the simulation runs",
    "Results open with one big headline number (P50)",
    "Progress reaches 100 % only after the run",
    "Checkpoints as a vertical timeline",
  ],
  theme: "clay",
  stepper: "top",
  progress: true,
  review: true,
  headline: true,
  checkpoints: "timeline",
}

export default variant
