import type { DVariant } from "@/design-lab/families/d/types"

const variant: DVariant = {
  id: "09",
  title: "Teal, mobile-first single column",
  description:
    "One narrow column that works on a phone: a compact step line, hints, progress and Enter to continue.",
  changes: [
    "One narrow centred column, library hidden on small screens",
    "Compact Steg 2 av 4 line on phones instead of the full stepper",
    "Progress bar, validation hints and Enter hint",
  ],
  theme: "current",
  stepper: "top",
  singleColumn: true,
  progress: true,
  hints: true,
  enterNext: true,
}

export default variant
