import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"

import { repoRoot } from "@/test-utils/repoRoot"

/** A component file plus the pieces split out of it, in alphabetical order, the pieces first. */
function readWithParts(mainFile: string, partsDir: string): string {
  const dir = join(repoRoot, partsDir)
  const parts = readdirSync(dir)
    .filter((name) => /\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name))
    .sort()
    .map((name) => readFileSync(join(dir, name), "utf8").replace(/^export /gm, ""))
  parts.push(readFileSync(join(repoRoot, mainFile), "utf8"))
  return parts.join("\n")
}

/**
 * Source text of the library sidebar: `AnalysisLibraryNav.tsx` plus the pieces in
 * `features/analysis-library/nav/`. Source-text tests read this instead of the
 * component file alone, so moving code between them does not change what they assert on.
 */
export function readLibraryNavSource(): string {
  return readWithParts(
    "src/features/analysis-library/AnalysisLibraryNav.tsx",
    "src/features/analysis-library/nav",
  )
}

/** Same for the library page and `features/analysis-library/page/`. */
export function readLibraryPageSource(): string {
  return readWithParts(
    "src/features/analysis-library/AnalysisLibraryPage.tsx",
    "src/features/analysis-library/page",
  )
}
