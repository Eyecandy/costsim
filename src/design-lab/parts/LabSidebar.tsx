import { ChevronsLeft, ChevronsRight, Menu, Plus } from "lucide-react"
import { useState } from "react"

import { FILE_NAME, LIBRARY_FOLDERS } from "@/design-lab/sampleData"
import { useI18n } from "@/i18n/useI18n"
import { cn } from "@/shared/utils"

/**
 * Note 2. "rail" is today's hidden menu (a narrow strip with a hamburger). "open" is the library
 * sidebar open by default, with a double arrow to hide it and another to show it again.
 */
export function LabSidebar({ mode }: { mode: "rail" | "open" }) {
  const { t } = useI18n()
  const [open, setOpen] = useState(mode === "open")

  if (mode === "rail") {
    return (
      <aside className="hidden w-9 shrink-0 md:block">
        <button
          type="button"
          aria-label={t("library.openSidebar")}
          className="grid size-9 place-items-center text-muted-foreground hover:text-foreground"
        >
          <Menu className="size-4" aria-hidden />
        </button>
      </aside>
    )
  }

  if (!open) {
    return (
      <aside className="hidden w-9 shrink-0 border-r border-border/60 md:block">
        <button
          type="button"
          aria-label="Vis meny"
          onClick={() => setOpen(true)}
          className="grid size-9 place-items-center text-muted-foreground hover:bg-[var(--lab-tint)] hover:text-foreground"
        >
          <ChevronsRight className="size-4" aria-hidden />
        </button>
      </aside>
    )
  }

  return (
    <aside
      aria-label={t("library.sidebarLabel")}
      className="hidden w-60 shrink-0 border-r border-border/60 bg-muted/40 md:block"
    >
      <div className="flex items-center justify-between px-3 py-2">
        <span className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
          {t("library.sidebarLabel")}
        </span>
        <button
          type="button"
          aria-label="Skjul meny"
          onClick={() => setOpen(false)}
          className="grid size-7 place-items-center rounded-md text-muted-foreground hover:bg-[var(--lab-tint)] hover:text-foreground"
        >
          <ChevronsLeft className="size-4" aria-hidden />
        </button>
      </div>
      <div className="px-3 pb-3">
        <button
          type="button"
          className="flex w-full items-center gap-1.5 rounded-md border border-[var(--lab-field-border)] bg-background px-2 py-1.5 text-[12px] hover:border-[var(--lab-brand)]"
        >
          <Plus className="size-3.5" aria-hidden />
          {t("library.newAnalysis")}
        </button>
      </div>
      <nav className="space-y-3 px-3 pb-4 text-[12px]">
        {LIBRARY_FOLDERS.map((folder) => (
          <div key={folder.name}>
            <p className="m-0 mb-1 text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
              {folder.name}
            </p>
            <ul className="m-0 list-none space-y-0.5 p-0">
              {folder.analyses.map((name) => (
                <li key={name}>
                  <button
                    type="button"
                    className={cn(
                      "w-full truncate rounded-md px-2 py-1 text-left",
                      name === FILE_NAME
                        ? "bg-[var(--lab-tint-strong)] font-medium"
                        : "hover:bg-[var(--lab-tint)]",
                    )}
                  >
                    {name}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  )
}
