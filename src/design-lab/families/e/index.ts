import type { EVariant } from "@/design-lab/families/e/types"

/** Every `vNN-name.ts` in `families/e/variants/` is a look in family E (default export). */
const modules = import.meta.glob<{ default: EVariant }>("./variants/v[0-9]*.ts", { eager: true })

export const E_VARIANTS: readonly EVariant[] = Object.values(modules)
  .map((m) => m.default)
  .sort((a, b) => a.id.localeCompare(b.id))
