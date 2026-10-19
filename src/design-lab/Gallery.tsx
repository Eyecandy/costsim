import { useEffect, useState } from "react"

import { entriesOf, entryLabel, entryPath, FAMILIES, type LabEntry } from "@/design-lab/registry"

const THUMB_SCALE = 0.27
const PAGE_WIDTH = 1440
const PAGE_HEIGHT = 960

const buttonClass =
  "rounded-md border border-border bg-background px-2.5 py-1 text-[12px] shadow-sm hover:border-[var(--lab-brand)]"

/** A live preview is a whole page in an iframe, so each card loads its own only when asked. */
function Preview({
  entry,
  loaded,
  onLoad,
}: {
  entry: LabEntry
  loaded: boolean
  onLoad: () => void
}) {
  const box = { width: PAGE_WIDTH * THUMB_SCALE, height: PAGE_HEIGHT * THUMB_SCALE }

  if (!loaded) {
    return (
      <div
        className="grid place-items-center rounded-md border border-dashed border-border bg-muted/50"
        style={box}
      >
        <button type="button" onClick={onLoad} className={buttonClass}>
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

/** The look at real size, almost full screen. Esc, the backdrop or the button closes it. */
function LargePreview({ entry, onClose }: { entry: LabEntry; onClose: () => void }) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-3"
      role="presentation"
      onClick={(e) => {
        if (e.target !== e.currentTarget) return
        onClose()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Stor forhåndsvisning ${entry.title}`}
        className="flex h-[96vh] w-[96vw] flex-col overflow-hidden rounded-xl bg-background shadow-2xl"
      >
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-2">
          <a href={entryPath(entry)} className="text-[14px] font-semibold hover:underline">
            {entryLabel(entry)} · {entry.title}
          </a>
          <button type="button" onClick={onClose} className={buttonClass}>
            Lukk
          </button>
        </div>
        <iframe
          title={`Stor forhåndsvisning ${entry.title}`}
          src={`${entryPath(entry)}?bare=1`}
          className="min-h-0 flex-1 border-0 bg-white"
        />
      </div>
    </div>
  )
}

function toggled(set: ReadonlySet<string>, key: string, on?: boolean) {
  const next = new Set(set)
  if (on ?? !next.has(key)) next.add(key)
  else next.delete(key)
  return next
}

/** The index page: one section per design family, one card per look, previews load on request. */
export function LabGallery() {
  const [minimized, setMinimized] = useState<ReadonlySet<string>>(new Set())
  const [loaded, setLoaded] = useState<ReadonlySet<string>>(new Set())
  const [large, setLarge] = useState<LabEntry | null>(null)

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
        {FAMILIES.map((family) => {
          const familyEntries = entriesOf(family.id)
          const allMinimized = familyEntries.every((entry) => minimized.has(entry.key))
          return (
            <section key={family.id} id={`familie-${family.id}`} className="mt-10">
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <h2 className="m-0 text-[17px] font-semibold tracking-tight">
                  Familie {family.id.toUpperCase()} · {family.name}
                </h2>
                <button
                  type="button"
                  className={buttonClass}
                  onClick={() =>
                    setMinimized(
                      allMinimized
                        ? new Set(
                            [...minimized].filter(
                              (key) => !familyEntries.some((e) => e.key === key),
                            ),
                          )
                        : new Set([...minimized, ...familyEntries.map((entry) => entry.key)]),
                    )
                  }
                >
                  {allMinimized ? "Utvid alle" : "Minimer alle"}
                </button>
              </div>
              <p className="mt-1 max-w-3xl text-[12px] text-muted-foreground">
                {family.description}
              </p>
              <ul className="m-0 mt-4 grid list-none gap-6 p-0 [grid-template-columns:repeat(auto-fill,minmax(25rem,1fr))]">
                {familyEntries.map((entry) => {
                  const isMinimized = minimized.has(entry.key)
                  return (
                    <li
                      key={entry.key}
                      className="self-start rounded-xl border border-border bg-background p-4 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="m-0 text-[15px] font-semibold">
                          <a
                            href={entryPath(entry)}
                            className="hover:underline"
                            aria-label={`Åpne ${entry.title}`}
                          >
                            {entryLabel(entry)} · {entry.title}
                          </a>
                        </h3>
                        <div className="flex shrink-0 gap-1.5">
                          <button
                            type="button"
                            className={buttonClass}
                            aria-label={`Stor forhåndsvisning av ${entry.title}`}
                            onClick={() => setLarge(entry)}
                          >
                            Stor
                          </button>
                          <button
                            type="button"
                            className={buttonClass}
                            aria-expanded={!isMinimized}
                            aria-label={`${isMinimized ? "Vis liten forhåndsvisning av" : "Minimer"} ${entry.title}`}
                            onClick={() => {
                              setMinimized(toggled(minimized, entry.key))
                              if (isMinimized) setLoaded(toggled(loaded, entry.key, true))
                            }}
                          >
                            {isMinimized ? "Liten" : "Minimer"}
                          </button>
                        </div>
                      </div>
                      <div hidden={isMinimized}>
                        <div className="mt-3">
                          <Preview
                            entry={entry}
                            loaded={loaded.has(entry.key)}
                            onLoad={() => setLoaded(toggled(loaded, entry.key, true))}
                          />
                        </div>
                        <p className="mt-2 text-[12px] text-muted-foreground">
                          {entry.description}
                        </p>
                        <ul className="mt-2 list-disc pl-4 text-[12px]">
                          {entry.changes.map((change) => (
                            <li key={change}>{change}</li>
                          ))}
                        </ul>
                      </div>
                    </li>
                  )
                })}
              </ul>
            </section>
          )
        })}
      </div>
      {large ? <LargePreview entry={large} onClose={() => setLarge(null)} /> : null}
    </div>
  )
}
