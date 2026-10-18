import { ChevronsLeft, Search, Settings } from "lucide-react"
import { useState } from "react"

import { BRail } from "@/design-lab/families/b/BRail"
import type { BVariant } from "@/design-lab/families/b/types"
import { CSidebar } from "@/design-lab/families/c/CSidebar"
import { FILE_NAME, LIBRARY_ANALYSES, type LibraryStatus } from "@/design-lab/sampleData"
import { cn } from "@/shared/utils"

type Filter = "all" | LibraryStatus

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "Alle" },
  { id: "draft", label: "Utkast" },
  { id: "archived", label: "Arkiverte" },
  { id: "deleted", label: "Slettede" },
]

const STATUS_LABEL: Record<LibraryStatus, string> = {
  draft: "Utkast",
  archived: "Arkivert",
  deleted: "Slettet",
}

function matches(status: LibraryStatus, filter: Filter): boolean {
  // "Alle" is everything that is not deleted; deleted analyses have their own filter.
  return filter === "all" ? status !== "deleted" : status === filter
}

/** The library as a panel: search, the filters All / Draft / Archived / Deleted, and the list. */
function BLibrary({ onCollapse }: { onCollapse: () => void }) {
  const [filter, setFilter] = useState<Filter>("all")
  const [query, setQuery] = useState("")
  const visible = LIBRARY_ANALYSES.filter(
    (analysis) =>
      matches(analysis.status, filter) &&
      analysis.name.toLowerCase().includes(query.trim().toLowerCase()),
  )
  const count = (id: Filter) =>
    LIBRARY_ANALYSES.filter((analysis) => matches(analysis.status, id)).length

  return (
    <aside
      aria-label="Analysebibliotek"
      className="sticky top-0 hidden h-screen w-72 shrink-0 flex-col bg-[var(--b-rail)] text-white md:flex"
    >
      <div className="flex items-center justify-between px-4 py-4">
        <div className="flex items-center gap-3">
          <span className="grid size-9 place-items-center rounded-xl bg-[var(--lab-brand)] text-[13px] font-bold tracking-tight">
            U·
          </span>
          <span className="text-[13px] font-semibold">Analysebibliotek</span>
        </div>
        <button
          type="button"
          aria-label="Skjul bibliotek"
          title="Skjul bibliotek"
          onClick={onCollapse}
          className="grid size-8 place-items-center rounded-lg text-white/70 hover:bg-white/10 hover:text-white"
        >
          <ChevronsLeft className="size-4" aria-hidden />
        </button>
      </div>

      <div className="space-y-3 px-4 pb-3">
        <label className="relative block">
          <span className="sr-only">Søk i analyser</span>
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-white/50"
            aria-hidden
          />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Søk i analyser"
            className="h-9 w-full rounded-lg border border-white/15 bg-white/10 pr-3 pl-9 text-[12px] text-white placeholder:text-white/50 focus:border-white/40 focus:outline-none"
          />
        </label>
        <div role="group" aria-label="Filtrer analyser" className="flex flex-wrap gap-1.5">
          {FILTERS.map((item) => (
            <button
              key={item.id}
              type="button"
              aria-pressed={filter === item.id}
              onClick={() => setFilter(item.id)}
              className={cn(
                "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px]",
                filter === item.id
                  ? "border-transparent bg-white text-neutral-900"
                  : "border-white/20 text-white/80 hover:bg-white/10",
              )}
            >
              {item.label}
              <span className="tabular-nums opacity-70">{count(item.id)}</span>
            </button>
          ))}
        </div>
      </div>

      <ul className="m-0 min-h-0 flex-1 list-none space-y-0.5 overflow-y-auto px-2 pb-3">
        {visible.length === 0 ? (
          <li className="px-3 py-4 text-[12px] text-white/60">Ingen analyser funnet.</li>
        ) : (
          visible.map((analysis) => {
            const selected = analysis.name === FILE_NAME
            return (
              <li key={analysis.name}>
                <button
                  type="button"
                  aria-current={selected ? "true" : undefined}
                  className={cn(
                    "flex w-full flex-col items-start gap-0.5 rounded-lg px-3 py-2 text-left",
                    selected ? "bg-white/15" : "hover:bg-white/10",
                  )}
                >
                  <span className="w-full truncate text-[13px] font-medium">{analysis.name}</span>
                  <span className="flex w-full items-center gap-2 text-[11px] text-white/60">
                    <span
                      className={cn(
                        "rounded-full px-1.5 py-px text-[10px]",
                        analysis.status === "draft" && "bg-[var(--lab-brand)]/30 text-white",
                        analysis.status === "archived" && "bg-white/15 text-white/80",
                        analysis.status === "deleted" && "bg-red-400/20 text-red-100",
                      )}
                    >
                      {STATUS_LABEL[analysis.status]}
                    </span>
                    {analysis.folder} · {analysis.updated}
                  </span>
                </button>
              </li>
            )
          })
        )}
      </ul>

      <div className="border-t border-white/10 px-4 py-3">
        <button
          type="button"
          className="flex items-center gap-2 text-[12px] text-white/70 hover:text-white"
        >
          <Settings className="size-4" aria-hidden />
          Innstillinger
        </button>
      </div>
    </aside>
  )
}

/** Left side of family B: the icon rail, or the library panel (which can fold into the rail). */
export function BSidebar({ mode }: { mode: BVariant["sidebar"] }) {
  const [open, setOpen] = useState(true)
  if (mode === "icons") return <BRail />
  if (mode === "folders") return <CSidebar />
  if (open) return <BLibrary onCollapse={() => setOpen(false)} />
  return <BRail onExpand={() => setOpen(true)} />
}
