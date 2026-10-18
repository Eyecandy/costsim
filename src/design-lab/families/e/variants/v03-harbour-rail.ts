import type { EVariant } from "@/design-lab/families/e/types"

const variant: EVariant = {
  id: "03",
  title: "Harbour, rail without library",
  description:
    "A calmer page without the library panel, so the document and the rail get all the width.",
  changes: ["Harbour colours", "No library panel", "Results rail on the right"],
  theme: "harbour",
  results: "rail",
  airy: true,
  library: false,
}

export default variant
