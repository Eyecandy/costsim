import { readFileSync } from "node:fs"
import { join } from "node:path"

import { repoRoot } from "@/test-utils/repoRoot"

/**
 * Source text of the i18n messages. The texts live in `messages.no.ts` and `messages.en.ts`, the types in
 * `messages.ts`; source-text tests read all three (Norwegian first, then English, then the types).
 */
export function readMessagesSource(): string {
  return ["messages.no.ts", "messages.en.ts", "messages.ts"]
    .map((f) => readFileSync(join(repoRoot, "src/i18n", f), "utf8"))
    .join("\n")
}
