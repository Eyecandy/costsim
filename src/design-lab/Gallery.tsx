import { useState } from "react"

import { VARIANTS } from "@/design-lab/variants"
import type { LabVariant } from "@/design-lab/variants/types"

const THUMB_SCALE = 0.27
const PAGE_WIDTH = 1440
const PAGE_HEIGHT = 960

/** A live preview is a whole page in an iframe, so each card loads its own only when asked. */
function Preview({ variant }: { variant: LabVariant }) {
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
        title={`Forhåndsvisning ${variant.title}`}
        src={`/design/${variant.id}?bare=1`}
        tabIndex={-1}
        className="pointer-events-none absolute top-0 left-0 origin-top-left border-0"
        style={{ width: PAGE_WIDTH, height: PAGE_HEIGHT, transform: `scale(${THUMB_SCALE})` }}
      />
    </div>
  )
}

/** The index page: one card per variant, with a preview that loads on request. */
export function LabGallery() {
  return (
    <div className="min-h-screen bg-muted/40 px-6 py-8 font-sans text-foreground">
      <div className="mx-auto max-w-[90rem]">
        <h1 className="m-0 text-[22px] font-semibold tracking-tight">Designlab</h1>
        <p className="mt-2 max-w-3xl text-[13px] text-muted-foreground">
          Sider uten funksjon som viser hvordan kalkulatorsiden kan se ut. Alle starter nær dagens
          side og endrer litt om gangen. Tallene i «Endringer» viser til punktene i notatene.
        </p>
        <p className="mt-2 text-[12px]">
          <a className="underline" href="/design/compare">
            Sammenlign to varianter side om side
          </a>
        </p>
        <ul className="m-0 mt-6 grid list-none gap-6 p-0 [grid-template-columns:repeat(auto-fill,minmax(25rem,1fr))]">
          {VARIANTS.map((variant) => (
            <li
              key={variant.id}
              className="rounded-xl border border-border bg-background p-4 shadow-sm"
            >
              <Preview variant={variant} />
              <h2 className="m-0 mt-3 text-[15px] font-semibold">
                <a
                  href={`/design/${variant.id}`}
                  className="hover:underline"
                  aria-label={`Åpne ${variant.title}`}
                >
                  {variant.id} · {variant.title}
                </a>
              </h2>
              <p className="mt-1 text-[12px] text-muted-foreground">{variant.description}</p>
              <ul className="mt-2 list-disc pl-4 text-[12px]">
                {variant.changes.map((change) => (
                  <li key={change}>{change}</li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
