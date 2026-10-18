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
 * Source text of the workspace screen. Source-text tests read this instead of
 * App.tsx alone, so moving code between App.tsx and `src/app/workspace/` does not
 * change what they assert on. Order: the hook files (`use*.ts`) first, then
 * `src/app/App.tsx`, then the component files. Hooks come first so that
 * `indexOf("someHandler")` finds a definition before any destructuring of the same
 * name; components come last so App's own JSX keeps its original position. The
 * orchestrator hook that only calls the other hooks (`useGuidedFocusSession`) goes last
 * among the hooks, for the same reason: its destructuring must not precede the definitions.
 */
export function readAppSource(): string {
  const extracted = listSorted(join(repoRoot, "src/app/workspace"))
  const isHook = (f: string) => /[\\/]use[A-Z][^\\/]*$/.test(f)
  const isOrchestrator = (f: string) => /[\\/]useGuidedFocusSession\.ts$/.test(f)
  const files = [
    ...extracted.filter((f) => isHook(f) && !isOrchestrator(f)),
    ...extracted.filter(isOrchestrator),
    join(repoRoot, "src/app/App.tsx"),
    ...extracted.filter((f) => !isHook(f)),
  ]
  return files.map((f) => readFileSync(f, "utf8")).join("\n")
}
