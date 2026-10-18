import type { LabVariant } from "@/design-lab/variants/types"

/**
 * Every `vNN-name.ts` file in this folder is a variant (default export). Adding a file adds a look;
 * there is no list to edit. `npm run lab:new -- my-look` creates one.
 */
const modules = import.meta.glob<{ default: LabVariant }>("./v[0-9]*.ts", { eager: true })

export const VARIANTS: readonly LabVariant[] = Object.values(modules)
  .map((m) => m.default)
  .sort((a, b) => a.id.localeCompare(b.id))

export function getVariant(id: string): LabVariant | undefined {
  return VARIANTS.find((v) => v.id === id)
}
