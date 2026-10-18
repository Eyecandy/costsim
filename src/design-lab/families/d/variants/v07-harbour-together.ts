import type { DVariant } from "@/design-lab/families/d/types"

const variant: DVariant = {
  id: "07",
  title: "Harbour, cost items and drivers together",
  description:
    "The cost step keeps the drivers and their values beside the cost items on wide screens; Enter goes to the next step.",
  changes: [
    "Drivers with values shown beside the cost items on wide screens",
    "Enter goes to the next step, with a hint on the button",
    "Harbour colours",
  ],
  theme: "harbour",
  stepper: "top",
  together: true,
  enterNext: true,
}

export default variant
