import { useMemo } from "react"

import { computeHistogram, suggestedBinCount } from "@/domain/simulation/histogram"
import { cn } from "@/shared/utils"

type ResultsHistogramProps = {
  values: readonly number[]
  label: string
}

export function ResultsHistogram({ values, label }: ResultsHistogramProps) {
  const bins = useMemo(() => {
    const n = values.filter((x) => Number.isFinite(x)).length
    if (n === 0) return []
    const k = suggestedBinCount(n)
    return computeHistogram(values, k)
  }, [values])

  const maxCount = useMemo(
    () => (bins.length === 0 ? 0 : Math.max(...bins.map((b) => b.count))),
    [bins],
  )

  if (bins.length === 0 || maxCount === 0) {
    return (
      <div
        className="section-body flex h-24 items-center justify-center rounded-md border border-dashed border-border/60 bg-muted/15"
        role="img"
        aria-label={`${label}: ingen data`}
      >
        Ingen data
      </div>
    )
  }

  return (
    <div className="space-y-1.5">
      <p className="text-[11px] font-medium text-muted-foreground">{label}</p>
      <div
        className="flex h-[7.5rem] items-stretch gap-0.5 rounded-md border border-border/50 bg-muted/25 px-1.5 pb-1 pt-2"
        role="img"
        aria-label={`${label}: histogram med ${bins.length} intervaller`}
      >
        {bins.map((bin, i) => {
          const h = maxCount > 0 ? (bin.count / maxCount) * 100 : 0
          return (
            <div
              key={i}
              className="group flex h-full min-h-0 min-w-0 flex-1 flex-col justify-end"
              title={`${bin.count} trekk · ${formatRange(bin.low, bin.high)}`}
            >
              <div
                className={cn(
                  "w-full rounded-sm bg-[var(--histogram-bar)] transition-colors duration-150 group-hover:bg-[var(--histogram-bar-hover)]",
                  bin.count > 0 && "min-h-[3px]",
                )}
                style={{ height: `${bin.count === 0 ? 0 : h}%` }}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}

function formatRange(low: number, high: number): string {
  if (low === high) return String(low)
  return `${low} – ${high}`
}
