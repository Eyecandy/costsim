import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"

import { repoRoot } from "@/test-utils/repoRoot"

/**
 * Source text of the library session: the command hooks and helpers in
 * `features/analysis-library/session/` first, then `useLibraryAnalysisSession.ts`.
 * Source-text tests read this instead of the hook file alone, so moving code
 * between them does not change what they assert on.
 */
export function readLibrarySessionSource(): string {
  const dir = join(repoRoot, "src/features/analysis-library/session")
  const parts = readdirSync(dir)
    .filter((name) => /\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name))
    .sort()
    .map((name) => readFileSync(join(dir, name), "utf8"))
  parts.push(
    readFileSync(
      join(repoRoot, "src/features/analysis-library/useLibraryAnalysisSession.ts"),
      "utf8",
    ),
  )
  return parts.join("\n")
}
