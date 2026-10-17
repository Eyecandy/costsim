import { useMemo, useState } from "react"

import { ChartExpandHost } from "@/components/ChartExpandButton"
import { useI18n } from "@/i18n/useI18n"
import {
  formatKeyFigureStat,
} from "@/lib/keyFiguresDisplay"
import {
  ongoingDevelopmentAxisLabel,
  type OngoingDevelopmentPoint,
  type OngoingDevelopmentSeries,
} from "@/lib/ongoingDevelopmentSeries"
import { cn } from "@/lib/utils"

type ResultsDevelopmentChartProps = {
  series: OngoingDevelopmentSeries
  expandLabel?: string
  onExpand?: () => void
  className?: string
}

const VB_W = 640
const VB_H = 220
const PAD = { top: 16, right: 16, bottom: 36, left: 52 }

const COLOR_BASE = "color-mix(in oklab, var(--color-muted-foreground) 70%, transparent)"
const COLOR_P50 = "#1d868c"
const COLOR_BAND = "color-mix(in oklab, #1d868c 14%, transparent)"
const COLOR_P85 = "color-mix(in oklab, #1d868c 45%, transparent)"

function finiteValues(points: readonly OngoingDevelopmentPoint[]): number[] {
  const out: number[] = []
  for (const p of points) {
    for (const v of [p.baseCost, p.p50, p.p85]) {
      if (v !== null && Number.isFinite(v)) out.push(v)
    }
  }
  return out
}

function niceDomain(values: number[]): { min: number; max: number } {
  if (values.length === 0) return { min: 0, max: 1 }
  let min = Math.min(...values)
  let max = Math.max(...values)
  if (min === max) {
    const pad = Math.abs(min) * 0.05 || 1
    return { min: min - pad, max: max + pad }
  }
  const span = max - min
  const margin = span * 0.08
  return { min: min - margin, max: max + margin }
}

function formatSignedDelta(
  change: number | null,
  language: "no" | "en",
): string {
  if (change === null || !Number.isFinite(change)) return "—"
  if (change === 0) return formatKeyFigureStat(0, language)
  const abs = formatKeyFigureStat(Math.abs(change), language)
  return change > 0 ? `+${abs}` : `−${abs}`
}

function polyline(
  points: readonly OngoingDevelopmentPoint[],
  pick: (p: OngoingDevelopmentPoint) => number | null,
  xAt: (i: number) => number,
  yAt: (v: number) => number,
): string {
  const parts: string[] = []
  points.forEach((p, i) => {
    const v = pick(p)
    if (v === null || !Number.isFinite(v)) return
    parts.push(`${parts.length === 0 ? "M" : "L"}${xAt(i)},${yAt(v)}`)
  })
  return parts.join(" ")
}

function bandPath(
  points: readonly OngoingDevelopmentPoint[],
  xAt: (i: number) => number,
  yAt: (v: number) => number,
): string | null {
  const usable = points
    .map((p, i) => ({ i, p50: p.p50, p85: p.p85 }))
    .filter(
      (x) =>
        x.p50 !== null &&
        x.p85 !== null &&
        Number.isFinite(x.p50) &&
        Number.isFinite(x.p85),
    )
  if (usable.length === 0) return null
  const top = usable
    .map((x, idx) => `${idx === 0 ? "M" : "L"}${xAt(x.i)},${yAt(x.p85!)}`)
    .join(" ")
  const bottom = [...usable]
    .reverse()
    .map((x) => `L${xAt(x.i)},${yAt(x.p50!)}`)
    .join(" ")
  return `${top} ${bottom} Z`
}

export function ResultsDevelopmentChart({
  series,
  expandLabel,
  onExpand,
  className,
}: ResultsDevelopmentChartProps) {
  const { t, language } = useI18n()
  const [hoverIndex, setHoverIndex] = useState<number | null>(null)

  const points = series.points
  const domain = useMemo(
    () => niceDomain(finiteValues(points)),
    [points],
  )

  const plotW = VB_W - PAD.left - PAD.right
  const plotH = VB_H - PAD.top - PAD.bottom
  const n = Math.max(points.length, 1)

  const xAt = (i: number) => {
    if (n === 1) return PAD.left + plotW / 2
    return PAD.left + (i / (n - 1)) * plotW
  }
  const yAt = (v: number) => {
    const tNorm = (v - domain.min) / (domain.max - domain.min || 1)
    return PAD.top + (1 - tNorm) * plotH
  }

  const basePath = polyline(points, (p) => p.baseCost, xAt, yAt)
  const p50Path = polyline(points, (p) => p.p50, xAt, yAt)
  const p85Path = polyline(points, (p) => p.p85, xAt, yAt)
  const band = bandPath(points, xAt, yAt)

  const yTicks = useMemo(() => {
    const mid = (domain.min + domain.max) / 2
    return [domain.max, mid, domain.min]
  }, [domain])

  const hovered = hoverIndex !== null ? points[hoverIndex] : null

  return (
    <ChartExpandHost
      label={expandLabel}
      onClick={onExpand}
      className={cn("relative w-full", className)}
      reserveTop={Boolean(expandLabel && onExpand)}
    >
      <div className="w-full" data-development-chart="">
        <svg
          viewBox={`0 0 ${VB_W} ${VB_H}`}
          className="h-auto w-full max-w-full"
          role="img"
          aria-label={t("checkpoints.developmentTitle")}
          onMouseLeave={() => setHoverIndex(null)}
        >
          {/* Y grid + labels */}
          {yTicks.map((tick, i) => {
            const y = yAt(tick)
            return (
              <g key={`yt-${i}`}>
                <line
                  x1={PAD.left}
                  x2={VB_W - PAD.right}
                  y1={y}
                  y2={y}
                  stroke="currentColor"
                  className="text-border/60"
                  strokeWidth={1}
                />
                <text
                  x={PAD.left - 8}
                  y={y}
                  textAnchor="end"
                  dominantBaseline="middle"
                  className="fill-muted-foreground font-sans"
                  style={{ fontSize: 10 }}
                >
                  {formatKeyFigureStat(tick, language)}
                </text>
              </g>
            )
          })}

          {band ? (
            <path d={band} fill={COLOR_BAND} stroke="none" />
          ) : null}

          {basePath ? (
            <path
              d={basePath}
              fill="none"
              stroke={COLOR_BASE}
              strokeWidth={1.25}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          ) : null}

          {p85Path ? (
            <path
              d={p85Path}
              fill="none"
              stroke={COLOR_P85}
              strokeWidth={1}
              strokeDasharray="3 3"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          ) : null}

          {p50Path ? (
            <path
              d={p50Path}
              fill="none"
              stroke={COLOR_P50}
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          ) : null}

          {points.map((p, i) => {
            const cx = xAt(i)
            const cy = p.p50 !== null && Number.isFinite(p.p50) ? yAt(p.p50) : null
            return (
              <g key={p.checkpointId}>
                {cy !== null ? (
                  <circle
                    cx={cx}
                    cy={cy}
                    r={hoverIndex === i ? 4 : 3}
                    fill={COLOR_P50}
                  />
                ) : null}
                <text
                  x={cx}
                  y={VB_H - 12}
                  textAnchor="middle"
                  className="fill-muted-foreground font-sans"
                  style={{ fontSize: 10 }}
                >
                  {ongoingDevelopmentAxisLabel(p.sequence)}
                </text>
                {/* Hit target */}
                <rect
                  x={cx - Math.max(plotW / (n * 2), 16)}
                  y={PAD.top}
                  width={Math.max(plotW / n, 32)}
                  height={plotH}
                  fill="transparent"
                  onMouseEnter={() => setHoverIndex(i)}
                />
              </g>
            )
          })}
        </svg>

        {hovered ? (
          <div
            className="pointer-events-none absolute right-2 top-2 z-10 min-w-[10.5rem] rounded-md border border-border/60 bg-background/95 px-2.5 py-2 font-sans text-[11px] shadow-sm"
            role="status"
          >
            <div className="mb-1.5 truncate font-medium text-foreground">
              {hovered.name}
            </div>
            <div className="grid grid-cols-[1fr_auto_auto] gap-x-3 gap-y-0.5 text-muted-foreground">
              <span>{t("keyMetrics.baseCost")}</span>
              <span className="tabular-nums text-foreground">
                {formatKeyFigureStat(hovered.baseCost, language)}
              </span>
              <span className="tabular-nums">
                {formatSignedDelta(hovered.deltaBaseCost, language)}
              </span>
              <span>{t("keyMetrics.p50")}</span>
              <span className="tabular-nums text-foreground">
                {formatKeyFigureStat(hovered.p50, language)}
              </span>
              <span className="tabular-nums">
                {formatSignedDelta(hovered.deltaP50, language)}
              </span>
              <span>{t("keyMetrics.p85")}</span>
              <span className="tabular-nums text-foreground">
                {formatKeyFigureStat(hovered.p85, language)}
              </span>
              <span className="tabular-nums">
                {formatSignedDelta(hovered.deltaP85, language)}
              </span>
            </div>
          </div>
        ) : null}

        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 font-sans text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <span
              className="inline-block h-px w-3 bg-muted-foreground/70"
              aria-hidden
            />
            {t("keyMetrics.baseCost")}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span
              className="inline-block h-0.5 w-3 rounded-full bg-[#1d868c]"
              aria-hidden
            />
            {t("keyMetrics.p50")}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span
              className="inline-block h-2 w-3 rounded-sm bg-[#1d868c]/20"
              aria-hidden
            />
            {t("checkpoints.developmentBandLegend")}
          </span>
        </div>
      </div>
    </ChartExpandHost>
  )
}
