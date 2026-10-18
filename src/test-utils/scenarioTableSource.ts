import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"

import { repoRoot } from "@/test-utils/repoRoot"

/**
 * Source text of the scenario table: the types, theme, slider and layout helpers in
 * `features/scenario-tables/table/` (without their `export` keyword), then
 * `ScenarioPercentTable.tsx`. Source-text tests read this instead of the component
 * file alone, so moving code between them does not change what they assert on.
 */
export function readScenarioTableSource(): string {
  const dir = join(repoRoot, "src/features/scenario-tables/table")
  const parts = readdirSync(dir)
    .filter((name) => /\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name))
    .sort()
    .map((name) => readFileSync(join(dir, name), "utf8").replace(/^export /gm, ""))
  parts.push(
    readFileSync(join(repoRoot, "src/features/scenario-tables/ScenarioPercentTable.tsx"), "utf8"),
  )
  return parts.join("\n")
}
