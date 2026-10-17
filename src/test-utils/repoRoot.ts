import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

/** Absolute path of the project root. Source-text tests resolve files like "src/App.tsx" against it, so they keep working wherever the test file lives. */
export const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../..")
