import type { GVariant } from "@/design-lab/families/g/types"

/** Every `vNN-name.ts` in `families/g/variants/` is a look in family G (default export). */
const modules = import.meta.glob<{ default: GVariant }>("./variants/v[0-9]*.ts", { eager: true })

export const G_VARIANTS: readonly GVariant[] = Object.values(modules)
  .map((m) => m.default)
  .sort((a, b) => a.id.localeCompare(b.id))
