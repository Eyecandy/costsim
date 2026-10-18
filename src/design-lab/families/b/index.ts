import type { BVariant } from "@/design-lab/families/b/types"

/** Every `vNN-name.ts` in `families/b/variants/` is a look in family B (default export). */
const modules = import.meta.glob<{ default: BVariant }>("./variants/v[0-9]*.ts", { eager: true })

export const B_VARIANTS: readonly BVariant[] = Object.values(modules)
  .map((m) => m.default)
  .sort((a, b) => a.id.localeCompare(b.id))
