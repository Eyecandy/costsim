import type { HVariant } from "@/design-lab/families/h/types"

/** Every `vNN-name.ts` in `families/h/variants/` is a look in family H (default export). */
const modules = import.meta.glob<{ default: HVariant }>("./variants/v[0-9]*.ts", { eager: true })

export const H_VARIANTS: readonly HVariant[] = Object.values(modules)
  .map((m) => m.default)
  .sort((a, b) => a.id.localeCompare(b.id))
