import { useState } from "react"

import { ENTRIES, entryByKey, entryLabel, entryPath } from "@/design-lab/registry"

const SCALE = 0.44
const PAGE_WIDTH = 1440
const PAGE_HEIGHT = 1300

function initialKey(param: string, fallbackIndex: number): string {
  const wanted = entryByKey(new URLSearchParams(window.location.search).get(param))
  return wanted?.key ?? ENTRIES[fallbackIndex]?.key ?? ""
}

/** Two looks side by side. The choice lives in the URL (?a=a00&b=b01), so a comparison can be shared. */
export function LabCompare() {
  const [left, setLeft] = useState(() => initialKey("a", 0))
  const [right, setRight] = useState(() => initialKey("b", 1))

  const choose = (side: "a" | "b", key: string) => {
    const next = side === "a" ? { a: key, b: right } : { a: left, b: key }
    setLeft(next.a)
    setRight(next.b)
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
            ["a", left],
            ["b", right],
          ] as const
        ).map(([side, key]) => {
          const entry = entryByKey(key)
          return (
            <div key={side} className="space-y-2">
              <label className="flex items-center gap-2 text-[12px]">
                {side === "a" ? "Venstre" : "Høyre"}
                <select
                  value={key}
                  onChange={(event) => choose(side, event.target.value)}
                  className="rounded-md border border-border bg-background px-2 py-1 text-[12px]"
                >
                  {ENTRIES.map((candidate) => (
                    <option key={candidate.key} value={candidate.key}>
                      {entryLabel(candidate)} · {candidate.title}
                    </option>
                  ))}
                </select>
              </label>
              <div
                className="relative overflow-hidden rounded-md border border-border bg-white"
                style={{ width: PAGE_WIDTH * SCALE, height: PAGE_HEIGHT * SCALE }}
              >
                {entry ? (
                  <iframe
                    title={`Variant ${entryLabel(entry)}`}
                    src={`${entryPath(entry)}?bare=1`}
                    className="absolute top-0 left-0 origin-top-left border-0"
                    style={{ width: PAGE_WIDTH, height: PAGE_HEIGHT, transform: `scale(${SCALE})` }}
                  />
                ) : null}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
