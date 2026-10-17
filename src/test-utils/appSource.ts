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
 * Source text of the workspace screen: `src/app/App.tsx` followed by the files
 * extracted from it into `src/app/workspace/` (sorted by path). Source-text tests
 * read this instead of App.tsx alone, so moving code between those files does not
 * change what they assert on.
 */
export function readAppSource(): string {
  const files = [
    join(repoRoot, "src/app/App.tsx"),
    ...listSorted(join(repoRoot, "src/app/workspace")),
  ]
  return files.map((f) => readFileSync(f, "utf8")).join("\n")
}
