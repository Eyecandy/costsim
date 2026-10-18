import type { BVariant } from "@/design-lab/families/b/types"

const variant: BVariant = {
  id: "20",
  title: "Sand, flat cards, results first",
  description:
    "Sand with straight, lined cards and a sticky key figure strip: the answer on top, then numbered input cards side by side.",
  changes: [
    "Flat cards with a coloured top line",
    "Sticky key figure strip",
    "Results first, inputs in two numbered cards",
  ],
  theme: "clay",
  inputs: "split",
  layout: "rows",
  density: "roomy",
  resultsFirst: true,
  keyStrip: true,
  cardStyle: "flat",
  navBar: true,
  detail: "compact",
  focusAtTitle: true,
  checkpointTone: "distinct",
  sidebar: "folders",
}

export default variant
