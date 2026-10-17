import { useMemo, type ReactNode } from "react"

import {
  formatAdaptiveMonetarySignedDelta,
  formatAdaptiveMonetaryValue,
} from "@/domain/results/formatWaterfallValue"
import {
  buildWaterfallChartLayout,
  valueToX,
} from "@/domain/results/waterfallLayout"
import {
  groupWaterfallContributors,
  type WaterfallDisplayRow,
} from "@/domain/results/waterfallContributors"
import type { ShapleyContribution } from "@/domain/simulation/shapleyAttribution"
import {
  ChartExpandHost,
  shouldShowChartExpand,
} from "@/features/results/ChartExpandButton"
import { useI18n } from "@/i18n/useI18n"
import { cn } from "@/shared/utils"

export type AttributionWaterfallProps = {
  startValue: number
  endValue: number
  contributions: readonly ShapleyContribution[]
  startLabel: string
  endLabel: string
  spanLabel: string
  otherLabel: string
  maxIndividual?: number
  /** Larger container sizing for ExpandedChartDialog; same Shapley values. */
  expanded?: boolean
  expandLabel?: string
  onExpand?: () => void
}

const VIEW_W = 100
const PLOT_LEFT = 2
const PLOT_RIGHT = 98
const PLOT_WIDTH = PLOT_RIGHT - PLOT_LEFT
const ROW_H = 8
const BAR_H = 2.6
const ROW_PX = 30
const REF_SVG_H = 10
const REF_SVG_PX = 22

/**
 * Shared CSS grid for the reference bracket row and every contribution bar row.
 * One grid so label | plot | value column tracks are identical (bracket ↔ bars).
 * Expanded mode widens the label column for wrapping.
 */
const WATERFALL_PLOT_GRID_COMPACT =
  "grid gap-x-3 [grid-template-columns:minmax(0,1fr)_minmax(0,1.35fr)_minmax(5.5rem,auto)]"
const WATERFALL_PLOT_GRID_EXPANDED =
  "grid gap-x-3 [grid-template-columns:minmax(0,1.15fr)_minmax(0,1.35fr)_minmax(5.5rem,auto)]"

export function AttributionWaterfall({
  startValue,
  endValue,
  contributions,
  startLabel,
  endLabel,
  spanLabel,
  otherLabel,
  maxIndividual,
  expanded = false,
  expandLabel,
  onExpand,
}: AttributionWaterfallProps) {
  const { language } = useI18n()

  const displayRows = useMemo(
    () =>
      groupWaterfallContributors(contributions, {
        maxIndividual,
        otherLabel,
      }),
    [contributions, maxIndividual, otherLabel],
  )

  const layout = useMemo(
    () => buildWaterfallChartLayout(startValue, endValue, displayRows),
    [displayRows, endValue, startValue],
  )

  const formatValue = (value: number) =>
    formatAdaptiveMonetaryValue(value, language)
  const formatDelta = (value: number) =>
    formatAdaptiveMonetarySignedDelta(value, language)

  const xStart = valueToX(
    layout.startValue,
    layout.domainMin,
    layout.domainMax,
    PLOT_LEFT,
    PLOT_WIDTH,
  )
  const xEnd = valueToX(
    layout.endValue,
    layout.domainMin,
    layout.domainMax,
    PLOT_LEFT,
    PLOT_WIDTH,
  )

  const showExpand = shouldShowChartExpand(expanded, onExpand, expandLabel)

  return (
    <ChartExpandHost
      label={showExpand ? expandLabel : undefined}
      onClick={showExpand ? onExpand : undefined}
      reserveTop={showExpand}
    >
      <div
        className={cn(
          "rounded-md border border-border/50 bg-muted/20",
          expanded ? "p-3 sm:p-4" : "p-2",
        )}
        data-waterfall-expanded={expanded ? "true" : undefined}
      >
        <div
          className="mb-2 grid items-end gap-x-3 gap-y-0.5 [grid-template-columns:minmax(0,1fr)_minmax(0,1.35fr)_minmax(0,1fr)]"
          aria-hidden
        >
          <div className="min-w-0">
            <div
              className={cn(
                "text-[11px] text-muted-foreground",
                expanded ? "whitespace-normal" : "truncate",
              )}
            >
              {startLabel}
            </div>
            <div
              className={cn(
                "text-xs tabular-nums text-foreground/90",
                expanded ? "whitespace-normal" : "truncate",
              )}
            >
              {formatValue(layout.startValue)}
            </div>
          </div>
          <div className="min-w-0 text-center">
            <div
              className={cn(
                "text-[11px] text-muted-foreground",
                expanded ? "whitespace-normal" : "truncate",
              )}
            >
              {spanLabel}
            </div>
            <div
              className={cn(
                "text-xs tabular-nums text-muted-foreground",
                expanded ? "whitespace-normal" : "truncate",
              )}
            >
              {formatDelta(layout.spanTotal)}
            </div>
          </div>
          <div className="min-w-0 text-right">
            <div
              className={cn(
                "text-[11px] text-muted-foreground",
                expanded ? "whitespace-normal" : "truncate",
              )}
            >
              {endLabel}
            </div>
            <div
              className={cn(
                "text-xs tabular-nums text-foreground/90",
                expanded ? "whitespace-normal" : "truncate",
              )}
            >
              {formatValue(layout.endValue)}
            </div>
          </div>
        </div>

        <div
          className={
            expanded ? WATERFALL_PLOT_GRID_EXPANDED : WATERFALL_PLOT_GRID_COMPACT
          }
          data-waterfall-plot-grid=""
        >
          <div className="mb-3" aria-hidden />
          <div className="mb-3 min-w-[6rem]" aria-hidden>
            <svg
              viewBox={`0 0 ${VIEW_W} ${REF_SVG_H}`}
              width="100%"
              height={REF_SVG_PX}
              preserveAspectRatio="none"
              className="block w-full text-border/80"
              role="presentation"
              data-waterfall-reference-bracket=""
            >
              <line
                x1={xStart}
                x2={xStart}
                y1={1}
                y2={REF_SVG_H - 1}
                stroke="var(--waterfall-reference)"
                strokeWidth={0.55}
                vectorEffect="non-scaling-stroke"
              />
              <line
                x1={xEnd}
                x2={xEnd}
                y1={1}
                y2={REF_SVG_H - 1}
                stroke="var(--waterfall-reference)"
                strokeWidth={0.55}
                vectorEffect="non-scaling-stroke"
              />
              <line
                x1={xStart}
                x2={xEnd}
                y1={REF_SVG_H / 2}
                y2={REF_SVG_H / 2}
                stroke="var(--waterfall-span)"
                strokeWidth={0.45}
                vectorEffect="non-scaling-stroke"
              />
            </svg>
          </div>
          <div className="mb-3" aria-hidden />

          {layout.contributionRows.length > 0 ? (
            layout.contributionRows.map((row) => {
              const xBefore = valueToX(
                row.cumulativeBefore,
                layout.domainMin,
                layout.domainMax,
                PLOT_LEFT,
                PLOT_WIDTH,
              )
              const xAfter = valueToX(
                row.cumulativeAfter,
                layout.domainMin,
                layout.domainMax,
                PLOT_LEFT,
                PLOT_WIDTH,
              )
              const x = Math.min(xBefore, xAfter)
              const w = Math.max(Math.abs(xAfter - xBefore), 0.35)
              const deltaText = formatDelta(row.contribution)

              return (
                <WaterfallGridRow
                  key={row.key}
                  label={row.label}
                  valueText={deltaText}
                  title={`${row.label}: ${deltaText}`}
                  mutedLabel={row.key === "__other__"}
                  allowWrap={expanded}
                >
                  <svg
                    viewBox={`0 0 ${VIEW_W} ${ROW_H}`}
                    width="100%"
                    height={ROW_PX}
                    preserveAspectRatio="none"
                    className="block max-h-8 w-full"
                    role="img"
                    aria-label={`${row.label}: ${deltaText}`}
                  >
                    <line
                      x1={xBefore}
                      x2={xBefore}
                      y1={0.8}
                      y2={ROW_H - 0.8}
                      stroke="currentColor"
                      strokeWidth={0.35}
                      strokeDasharray="0.8 0.8"
                      vectorEffect="non-scaling-stroke"
                      className="text-border/70"
                    />
                    <rect
                      x={x}
                      y={(ROW_H - BAR_H) / 2}
                      width={w}
                      height={BAR_H}
                      rx={BAR_H / 2}
                      ry={BAR_H / 2}
                      fill={
                        row.contribution >= 0
                          ? "var(--waterfall-positive)"
                          : "var(--waterfall-negative)"
                      }
                      fillOpacity={0.62}
                    />
                  </svg>
                </WaterfallGridRow>
              )
            })
          ) : (
            <p className="section-body col-span-3 text-[11px] text-muted-foreground/80">
              {language === "no"
                ? "Ingen bidrag å vise."
                : "No contributions to display."}
            </p>
          )}
        </div>
      </div>
    </ChartExpandHost>
  )
}

function WaterfallGridRow({
  label,
  valueText,
  title,
  mutedLabel = false,
  allowWrap = false,
  children,
}: {
  label: string
  valueText: string
  title: string
  mutedLabel?: boolean
  allowWrap?: boolean
  children: ReactNode
}) {
  return (
    <>
      <div
        className={cn(
          "flex min-h-8 min-w-0 items-center overflow-hidden py-0.5 pr-1 text-xs leading-tight",
          mutedLabel ? "text-muted-foreground/85 italic" : "text-muted-foreground",
        )}
        title={title}
      >
        <span
          className={cn(
            "block min-w-0",
            allowWrap ? "whitespace-normal break-words" : "truncate whitespace-nowrap",
          )}
        >
          {label}
        </span>
      </div>
      <div className="flex min-h-8 min-w-[6rem] items-center py-0.5">{children}</div>
      <div className="flex min-h-8 items-center justify-end py-0.5 text-xs tabular-nums text-muted-foreground">
        {valueText}
      </div>
    </>
  )
}

export type { WaterfallDisplayRow }
