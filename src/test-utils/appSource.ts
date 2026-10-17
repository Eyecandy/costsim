import { existsSync, readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"

import { repoRoot } from "@/test-utils/repoRoot"

function listSorted(dir: string): string[] {
  if (!existsSync(dir)) return []
  const out: string[] = []
  for (const entry of readdirSync(dir, { withFileTypes: true }).sort((a, b) =>
    a.name.localeCompare(b.name),
  )) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) out.push(...listSorted(full))
    else if (/\.(ts|tsx)$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name)) out.push(full)
  }
  return out
}

/**
 * Source text of the workspace screen: the files extracted from `App.tsx` into
 * `src/app/workspace/` (sorted by path) followed by `src/app/App.tsx` itself.
 * Source-text tests read this instead of App.tsx alone, so moving code between
 * those files does not change what they assert on. The extracted files come first
 * so that `indexOf("someHandler")` finds a definition before App's destructuring
 * of the same name.
 */
export function readAppSource(): string {
  const files = [
    ...listSorted(join(repoRoot, "src/app/workspace")),
    join(repoRoot, "src/app/App.tsx"),
  ]
  return files.map((f) => readFileSync(f, "utf8")).join("\n")
}
