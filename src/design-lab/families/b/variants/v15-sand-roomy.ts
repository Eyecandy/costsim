import type { BVariant } from "@/design-lab/families/b/types"

const variant: BVariant = {
  id: "15",
  title: "Sand, roomy fixed cells",
  description:
    "Sand with generous whitespace: cost items and drivers side by side in large cells of one fixed size, a folder library and a quiet results band below.",
  changes: [
    "Roomy density: 40 px cells of fixed width",
    "Folder library with Ny mappe",
    "Inputs across the top, results below",
  ],
  theme: "clay",
  inputs: "split",
  layout: "rows",
  density: "roomy",
  navBar: true,
  detail: "compact",
  focusAtTitle: true,
  checkpointTone: "distinct",
  sidebar: "folders",
}

export default variant
