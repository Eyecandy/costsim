import type { BVariant } from "@/design-lab/families/b/types"

const variant: BVariant = {
  id: "07",
  title: "Sand, full information, split card",
  description:
    "Sand colours with a header bar, the library as a panel with search and filters, cost items and drivers side by side, and the full result detail from family A.",
  changes: [
    "Header bar with brand, links, language and user",
    "Library panel: search, and filters All / Draft / Archived / Deleted",
    "Cost items and drivers side by side, assumptions as a strip",
    "Full key figure table and the change table below the key figures",
  ],
  theme: "clay",
  inputs: "split",
  layout: "rows",
  sidebar: "library",
  navBar: true,
  detail: "full",
}

export default variant
