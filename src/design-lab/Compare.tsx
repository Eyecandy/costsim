import { useState } from "react"

import { VARIANTS } from "@/design-lab/variants"

const SCALE = 0.44
const PAGE_WIDTH = 1440
const PAGE_HEIGHT = 1300

function initialId(param: string, fallbackIndex: number): string {
  const wanted = new URLSearchParams(window.location.search).get(param)
  return VARIANTS.find((v) => v.id === wanted)?.id ?? VARIANTS[fallbackIndex]?.id ?? ""
}

/** Two variants side by side. The choice lives in the URL (?a=00&b=03), so a comparison can be shared. */
export function LabCompare() {
  const [a, setA] = useState(() => initialId("a", 0))
  const [b, setB] = useState(() => initialId("b", 1))

  const choose = (side: "a" | "b", id: string) => {
    const next = { a, b, [side]: id }
    setA(next.a)
    setB(next.b)
    window.history.replaceState(null, "", `/design/compare?a=${next.a}&b=${next.b}`)
  }

  return (
    <div className="min-h-screen bg-muted/40 px-6 py-8 font-sans text-foreground">
      <p className="m-0 text-[12px]">
        <a className="underline" href="/design">
          ← Alle varianter
        </a>
      </p>
      <h1 className="mt-2 mb-4 text-[20px] font-semibold tracking-tight">Sammenlign</h1>
      <div className="flex flex-wrap gap-6">
        {(
          [
            ["a", a],
            ["b", b],
          ] as const
        ).map(([side, id]) => (
          <div key={side} className="space-y-2">
            <label className="flex items-center gap-2 text-[12px]">
              {side === "a" ? "Venstre" : "Høyre"}
              <select
                value={id}
                onChange={(event) => choose(side, event.target.value)}
                className="rounded-md border border-border bg-background px-2 py-1 text-[12px]"
              >
                {VARIANTS.map((variant) => (
                  <option key={variant.id} value={variant.id}>
                    {variant.id} · {variant.title}
                  </option>
                ))}
              </select>
            </label>
            <div
              className="relative overflow-hidden rounded-md border border-border bg-white"
              style={{ width: PAGE_WIDTH * SCALE, height: PAGE_HEIGHT * SCALE }}
            >
              <iframe
                title={`Variant ${id}`}
                src={`/design/${id}?bare=1`}
                className="absolute top-0 left-0 origin-top-left border-0"
                style={{ width: PAGE_WIDTH, height: PAGE_HEIGHT, transform: `scale(${SCALE})` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
