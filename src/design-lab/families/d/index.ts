import type { DVariant } from "@/design-lab/families/d/types"

/** Every `vNN-name.ts` in `families/d/variants/` is a look in family D (default export). */
const modules = import.meta.glob<{ default: DVariant }>("./variants/v[0-9]*.ts", { eager: true })

export const D_VARIANTS: readonly DVariant[] = Object.values(modules)
  .map((m) => m.default)
  .sort((a, b) => a.id.localeCompare(b.id))
