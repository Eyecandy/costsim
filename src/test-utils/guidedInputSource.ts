import { readFileSync } from "node:fs"
import { join } from "node:path"

import { repoRoot } from "@/test-utils/repoRoot"

/** The pieces that used to sit above the dialog component, in their original order. */
const PARTS_IN_ORIGINAL_ORDER = [
  "guidedInputStyles.ts",
  "GuidedRangeSlider.tsx",
  "GuidedDefinitionTextarea.tsx",
  "GuidedInlineValue.tsx",
  "GuidedSidePieces.tsx",
  "GuidedAssumptionsPhase.tsx",
  "GuidedIncurredPhase.tsx",
  "guidedPhaseTitle.ts",
  "GuidedIntroPhases.tsx",
  "GuidedCostPhase.tsx",
  "GuidedDriverPhase.tsx",
]

/**
 * Source text of the Guided Input dialog: the phase components and helpers in
 * `features/guided-input/parts/` (without their `export` keyword, in the order they
 * had inside the dialog file), then `GuidedInputDialog.tsx`. Source-text tests read
 * this instead of the dialog file alone, so moving code between them does not
 * change what they assert on.
 */
export function readGuidedInputSource(): string {
  const parts = PARTS_IN_ORIGINAL_ORDER.map(
    (name) =>
      `// ---- parts/${name} ----
` +
      readFileSync(join(repoRoot, "src/features/guided-input/parts", name), "utf8").replace(
        /^export (function|const) /gm,
        "$1 ",
      ),
  )
  parts.push(
    readFileSync(join(repoRoot, "src/features/guided-input/GuidedInputDialog.tsx"), "utf8"),
  )
  return parts.join("\n")
}
