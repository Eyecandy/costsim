import { FileText, LayoutDashboard, Library, Settings, type LucideIcon } from "lucide-react"

import { cn } from "@/shared/utils"

const ITEMS: { label: string; Icon: LucideIcon; active?: boolean }[] = [
  { label: "Bibliotek", Icon: Library },
  { label: "Analyse", Icon: LayoutDashboard, active: true },
  { label: "Rapporter", Icon: FileText },
]

/** Narrow dark rail with icon navigation. Hover shows the name; the active page is lit. */
export function BRail() {
  return (
    <aside className="sticky top-0 hidden h-screen w-16 shrink-0 flex-col items-center gap-1 bg-[var(--b-rail)] py-4 text-white md:flex">
      <span className="mb-4 grid size-9 place-items-center rounded-xl bg-[var(--lab-brand)] text-[13px] font-bold tracking-tight">
        U·
      </span>
      {ITEMS.map(({ label, Icon, active }) => (
        <button
          key={label}
          type="button"
          aria-label={label}
          title={label}
          className={cn(
            "grid size-10 place-items-center rounded-xl text-white/70 hover:bg-white/10 hover:text-white",
            active && "bg-white/15 text-white",
          )}
        >
          <Icon className="size-[1.1rem]" aria-hidden />
        </button>
      ))}
      <span className="flex-1" />
      <button
        type="button"
        aria-label="Innstillinger"
        title="Innstillinger"
        className="grid size-10 place-items-center rounded-xl text-white/70 hover:bg-white/10 hover:text-white"
      >
        <Settings className="size-[1.1rem]" aria-hidden />
      </button>
    </aside>
  )
}
