import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"

import { repoRoot } from "@/test-utils/repoRoot"

/**
 * Source text of the Results panel: the hooks and helpers in
 * `features/results/panel/` first, then `ResultsPanel.tsx`. Source-text tests read
 * this instead of the component file alone, so moving code between them does not
 * change what they assert on.
 */
export function readResultsPanelSource(): string {
  const dir = join(repoRoot, "src/features/results/panel")
  const parts = readdirSync(dir)
    .filter((name) => /\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name))
    .sort()
    .map((name) => readFileSync(join(dir, name), "utf8"))
  parts.push(readFileSync(join(repoRoot, "src/features/results/ResultsPanel.tsx"), "utf8"))
  return parts.join("\n")
}
