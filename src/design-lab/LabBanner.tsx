import { entryLabel, entryPath, type LabEntry } from "@/design-lab/registry"

/** The strip above a mock page: which look it is, and links to its neighbours in the same family. */
export function LabBanner({
  entry,
  previous,
  next,
}: {
  entry: LabEntry
  previous?: LabEntry
  next?: LabEntry
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 bg-neutral-900 px-4 py-1.5 font-sans text-[11px] text-white">
      <span className="font-semibold">Designlab</span>
      <span>
        {entryLabel(entry)} · {entry.title}
      </span>
      <span className="opacity-70">Uten funksjon, kun for visning</span>
      <span className="ml-auto flex items-center gap-3">
        {previous ? <a href={entryPath(previous)}>← {entryLabel(previous)}</a> : null}
        <a href="/design">Alle varianter</a>
        {next ? <a href={entryPath(next)}>{entryLabel(next)} →</a> : null}
      </span>
    </div>
  )
}
