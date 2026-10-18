import { useState } from "react"

import { entriesOf, entryLabel, entryPath, FAMILIES, type LabEntry } from "@/design-lab/registry"

const THUMB_SCALE = 0.27
const PAGE_WIDTH = 1440
const PAGE_HEIGHT = 960

/** A live preview is a whole page in an iframe, so each card loads its own only when asked. */
function Preview({ entry }: { entry: LabEntry }) {
  const [loaded, setLoaded] = useState(false)
  const box = { width: PAGE_WIDTH * THUMB_SCALE, height: PAGE_HEIGHT * THUMB_SCALE }

  if (!loaded) {
    return (
      <div
        className="grid place-items-center rounded-md border border-dashed border-border bg-muted/50"
        style={box}
      >
        <button
          type="button"
          onClick={() => setLoaded(true)}
          className="rounded-md border border-border bg-background px-3 py-1.5 text-[12px] shadow-sm hover:border-[var(--lab-brand)]"
        >
          Vis forhåndsvisning
        </button>
      </div>
    )
  }

  return (
    <div className="relative overflow-hidden rounded-md border border-border bg-white" style={box}>
      <iframe
        title={`Forhåndsvisning ${entry.title}`}
        src={`${entryPath(entry)}?bare=1`}
        tabIndex={-1}
        className="pointer-events-none absolute top-0 left-0 origin-top-left border-0"
        style={{ width: PAGE_WIDTH, height: PAGE_HEIGHT, transform: `scale(${THUMB_SCALE})` }}
      />
    </div>
  )
}

/** The index page: one section per design family, one card per look, previews load on request. */
export function LabGallery() {
  return (
    <div className="min-h-screen bg-muted/40 px-6 py-8 font-sans text-foreground">
      <div className="mx-auto max-w-[90rem]">
        <h1 className="m-0 text-[22px] font-semibold tracking-tight">Designlab</h1>
        <p className="mt-2 max-w-3xl text-[13px] text-muted-foreground">
          Sider uten funksjon som viser hvordan kalkulatorsiden kan se ut. Designene er delt i
          familier (A, B, ...): en familie er én designretning, og hver variant er et lite steg
          innenfor den. Si for eksempel «iterer på B02» eller «gjør A04 mer kompakt».
        </p>
        <p className="mt-2 flex flex-wrap gap-4 text-[12px]">
          {FAMILIES.map((family) => (
            <a key={family.id} className="underline" href={`#familie-${family.id}`}>
              Familie {family.id.toUpperCase()}: {family.name}
            </a>
          ))}
          <a className="underline" href="/design/compare">
            Sammenlign to varianter side om side
          </a>
        </p>
        {FAMILIES.map((family) => (
          <section key={family.id} id={`familie-${family.id}`} className="mt-10">
            <h2 className="m-0 text-[17px] font-semibold tracking-tight">
              Familie {family.id.toUpperCase()} · {family.name}
            </h2>
            <p className="mt-1 max-w-3xl text-[12px] text-muted-foreground">{family.description}</p>
            <ul className="m-0 mt-4 grid list-none gap-6 p-0 [grid-template-columns:repeat(auto-fill,minmax(25rem,1fr))]">
              {entriesOf(family.id).map((entry) => (
                <li
                  key={entry.key}
                  className="rounded-xl border border-border bg-background p-4 shadow-sm"
                >
                  <Preview entry={entry} />
                  <h3 className="m-0 mt-3 text-[15px] font-semibold">
                    <a
                      href={entryPath(entry)}
                      className="hover:underline"
                      aria-label={`Åpne ${entry.title}`}
                    >
                      {entryLabel(entry)} · {entry.title}
                    </a>
                  </h3>
                  <p className="mt-1 text-[12px] text-muted-foreground">{entry.description}</p>
                  <ul className="mt-2 list-disc pl-4 text-[12px]">
                    {entry.changes.map((change) => (
                      <li key={change}>{change}</li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  )
}
