import { ChevronDown, ChevronRight, Folder, FolderPlus, Search } from "lucide-react"
import { useState } from "react"

import { FILE_NAME, LIBRARY_ANALYSES, type LibraryStatus } from "@/design-lab/sampleData"
import { cn } from "@/shared/utils"

type Filter = "all" | LibraryStatus

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "Alle" },
  { id: "draft", label: "Utkast" },
  { id: "archived", label: "Arkiverte" },
  { id: "deleted", label: "Slettede" },
]

function matches(status: LibraryStatus, filter: Filter): boolean {
  // "Alle" is everything that is not deleted; deleted analyses have their own filter.
  return filter === "all" ? status !== "deleted" : status === filter
}

/** The library as a folder tree with search, the status filters and "Ny mappe". Only the mock-up state is real. */
export function CSidebar() {
  const [filter, setFilter] = useState<Filter>("all")
  const [query, setQuery] = useState("")
  const [extraFolders, setExtraFolders] = useState<string[]>([])
  const [closed, setClosed] = useState<ReadonlySet<string>>(new Set())
  const [naming, setNaming] = useState(false)
  const [draftName, setDraftName] = useState("")

  const needle = query.trim().toLowerCase()
  const visible = LIBRARY_ANALYSES.filter(
    (analysis) => matches(analysis.status, filter) && analysis.name.toLowerCase().includes(needle),
  )
  const folderNames = [...new Set([...LIBRARY_ANALYSES.map((a) => a.folder), ...extraFolders])]
  // While searching or filtering, folders without a hit are hidden; empty new folders show otherwise.
  const filtering = needle !== "" || filter !== "all"
  const count = (id: Filter) => LIBRARY_ANALYSES.filter((a) => matches(a.status, id)).length

  const toggle = (name: string) =>
    setClosed((previous) => {
      const next = new Set(previous)
      if (!next.delete(name)) next.add(name)
      return next
    })

  const createFolder = () => {
    const name = draftName.trim()
    if (name !== "" && !folderNames.includes(name))
      setExtraFolders((previous) => [...previous, name])
    setDraftName("")
    setNaming(false)
  }

  return (
    <aside
      aria-label="Analysebibliotek"
      className="sticky top-0 hidden h-screen w-72 shrink-0 flex-col border-r border-[var(--lab-bar-border)] bg-[var(--b-rail)] text-white md:flex"
    >
      <div className="flex items-center justify-between px-4 pt-4 pb-3">
        <span className="text-[13px] font-semibold">Analysebibliotek</span>
        <button
          type="button"
          onClick={() => setNaming(true)}
          className="flex items-center gap-1.5 rounded-lg border border-white/20 px-2.5 py-1 text-[11px] text-white/90 hover:bg-white/10"
        >
          <FolderPlus className="size-3.5" aria-hidden />
          Ny mappe
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

      {naming ? (
        <form
          className="mx-4 mb-2 flex gap-1.5"
          onSubmit={(event) => {
            event.preventDefault()
            createFolder()
          }}
        >
          <input
            autoFocus
            aria-label="Navn på ny mappe"
            value={draftName}
            onChange={(event) => setDraftName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Escape") setNaming(false)
            }}
            placeholder="Navn på mappe"
            className="h-8 min-w-0 flex-1 rounded-lg border border-white/30 bg-white/10 px-2.5 text-[12px] text-white placeholder:text-white/50 focus:outline-none"
          />
          <button
            type="submit"
            className="rounded-lg bg-white px-2.5 text-[11px] font-medium text-neutral-900"
          >
            Opprett
          </button>
        </form>
      ) : null}

      <ul className="m-0 min-h-0 flex-1 list-none space-y-1 overflow-y-auto px-2 pb-3">
        {folderNames.map((folder) => {
          const inFolder = visible.filter((analysis) => analysis.folder === folder)
          if (filtering && inFolder.length === 0) return null
          const open = !closed.has(folder) || needle !== ""
          return (
            <li key={folder}>
              <button
                type="button"
                aria-expanded={open}
                onClick={() => toggle(folder)}
                className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[12px] font-semibold hover:bg-white/10"
              >
                {open ? (
                  <ChevronDown className="size-3.5 opacity-70" aria-hidden />
                ) : (
                  <ChevronRight className="size-3.5 opacity-70" aria-hidden />
                )}
                <Folder className="size-3.5 opacity-80" aria-hidden />
                <span className="flex-1 truncate">{folder}</span>
                <span className="text-[11px] font-normal tabular-nums opacity-60">
                  {inFolder.length}
                </span>
              </button>
              {open ? (
                <ul className="m-0 ml-4 list-none border-l border-white/15 pl-2">
                  {inFolder.length === 0 ? (
                    <li className="px-3 py-1.5 text-[11px] text-white/50">Tom mappe</li>
                  ) : (
                    inFolder.map((analysis) => (
                      <li key={analysis.name}>
                        <button
                          type="button"
                          aria-current={analysis.name === FILE_NAME ? "true" : undefined}
                          className={cn(
                            "flex w-full items-center justify-between gap-2 rounded-lg px-3 py-1.5 text-left text-[12px]",
                            analysis.name === FILE_NAME ? "bg-white/15" : "hover:bg-white/10",
                          )}
                        >
                          <span className="truncate">{analysis.name}</span>
                          <span className="shrink-0 text-[10px] text-white/55">
                            {analysis.updated}
                          </span>
                        </button>
                      </li>
                    ))
                  )}
                </ul>
              ) : null}
            </li>
          )
        })}
        {filtering && visible.length === 0 ? (
          <li className="px-3 py-4 text-[12px] text-white/60">Ingen analyser funnet.</li>
        ) : null}
      </ul>
    </aside>
  )
}
