import { VARIANTS } from "@/design-lab/variants"

const THUMB_SCALE = 0.27
const PAGE_WIDTH = 1440
const PAGE_HEIGHT = 960

/** The index page: one card per variant with a live scaled preview. */
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
              <a
                href={`/design/${variant.id}`}
                className="block"
                aria-label={`Åpne ${variant.title}`}
              >
                <div
                  className="relative overflow-hidden rounded-md border border-border bg-white"
                  style={{ width: PAGE_WIDTH * THUMB_SCALE, height: PAGE_HEIGHT * THUMB_SCALE }}
                >
                  <iframe
                    title={`Forhåndsvisning ${variant.title}`}
                    src={`/design/${variant.id}?bare=1`}
                    loading="lazy"
                    tabIndex={-1}
                    className="pointer-events-none absolute top-0 left-0 origin-top-left border-0"
                    style={{
                      width: PAGE_WIDTH,
                      height: PAGE_HEIGHT,
                      transform: `scale(${THUMB_SCALE})`,
                    }}
                  />
                </div>
              </a>
              <h2 className="m-0 mt-3 text-[15px] font-semibold">
                {variant.id} · {variant.title}
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
