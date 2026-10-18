import type { CVariant } from "@/design-lab/families/c/types"

/** Every `vNN-name.ts` in `families/c/variants/` is a look in family C (default export). */
const modules = import.meta.glob<{ default: CVariant }>("./variants/v[0-9]*.ts", { eager: true })

export const C_VARIANTS: readonly CVariant[] = Object.values(modules)
  .map((m) => m.default)
  .sort((a, b) => a.id.localeCompare(b.id))
