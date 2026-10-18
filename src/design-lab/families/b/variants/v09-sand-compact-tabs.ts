import type { BVariant } from "@/design-lab/families/b/types"

const variant: BVariant = {
  id: "09",
  title: "Sand, less information, tabs",
  description:
    "The lighter version: header bar and library panel, inputs in tabs, and the results as key figures and charts only.",
  changes: [
    "Tabs for cost items, drivers and assumptions",
    "Key figures as tiles, no tables",
    "Library panel with search and filters",
  ],
  theme: "clay",
  inputs: "tabs",
  layout: "columns",
  sidebar: "library",
  navBar: true,
  detail: "compact",
}

export default variant
