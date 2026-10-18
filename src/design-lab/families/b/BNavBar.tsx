import { BNav } from "@/design-lab/families/b/BNav"
import { BrandWordmark } from "@/shared/BrandWordmark"

/** A header bar of its own: the brand on the left, links, language and user on the right. */
export function BNavBar() {
  return (
    <div className="border-b border-[var(--lab-bar-border)] bg-[var(--lab-bar-bg)] shadow-sm">
      <div className="mx-auto flex w-full max-w-[96rem] items-center justify-between gap-4 px-5 py-2.5">
        <BrandWordmark />
        <BNav />
      </div>
    </div>
  )
}
