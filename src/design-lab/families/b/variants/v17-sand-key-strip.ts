import type { BVariant } from "@/design-lab/families/b/types"

const variant: BVariant = {
  id: "17",
  title: "Sand, sticky key figures",
  description:
    "Sand with the four key figures in a strip that follows you under the command bar, so the answer is always in view while you edit.",
  changes: [
    "Sticky key figure strip, big tiles removed",
    "Inputs left, results right",
    "Roomy fixed-size cells",
  ],
  theme: "clay",
  inputs: "stacked",
  layout: "columns",
  density: "roomy",
  keyStrip: true,
  navBar: true,
  detail: "compact",
  focusAtTitle: true,
  checkpointTone: "distinct",
  sidebar: "folders",
}

export default variant
