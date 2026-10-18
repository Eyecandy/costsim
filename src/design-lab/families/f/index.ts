import type { FVariant } from "@/design-lab/families/f/types"

/** Every `vNN-name.ts` in `families/f/variants/` is a look in family F (default export). */
const modules = import.meta.glob<{ default: FVariant }>("./variants/v[0-9]*.ts", { eager: true })

export const F_VARIANTS: readonly FVariant[] = Object.values(modules)
  .map((m) => m.default)
  .sort((a, b) => a.id.localeCompare(b.id))
