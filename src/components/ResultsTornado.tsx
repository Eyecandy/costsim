import { Fragment, useMemo } from "react"

import { ChartExpandHost, shouldShowChartExpand } from "@/components/ChartExpandButton"
import { useI18n } from "@/i18n/useI18n"
import type { DeterministicTornadoRow } from "@/lib/deterministicTornado"
import { formatNumber } from "@/lib/formatNumber"
import {
  collectTornadoDisplayValues,
  formatTornadoSignedDeltaWithScale,
  resolveTornadoDisplayScale,
  type WaterfallDisplayScale,
} from "@/lib/formatWaterfallValue"
import { cn } from "@/lib/utils"
import {
  TORNADO_CENTER_X,
  TORNADO_COLUMN_GAP_CLASS,
  TORNADO_EXPANDED_INNER_MAX_CLASS,
  TORNADO_VIEW_H,
  TORNADO_VIEW_W,
  tornadoBarRect,
  tornadoHalfSpan,
  tornadoModeMetrics,
  tornadoSidePadUnits,
} from "@/lib/tornadoLayout"

type ResultsTornadoProps = {
  rows: readonly DeterministicTornadoRow[]
  layout?: TornadoSharedLayout
  /** Felles ±grense (før 1,1-padding) på tvers av prosjekter — samme barlengde for lik verdi. */
  sharedSymmetricMaxAbs?: number
  /** Chart-level display unit; defaults to a unit derived from this chart's values. */
  displayScale?: WaterfallDisplayScale
  /** Larger container sizing for ExpandedChartDialog; same rows and scale. */
  expanded?: boolean
  expandLabel?: string
  onExpand?: () => void
}

const LABEL_GAP = 0.8
const LABEL_PAD = 0.4

export type TornadoSharedLayout = {
  rightMarginPx: number
}

function formatTornadoImpactLabel(
  value: number,
  scale: WaterfallDisplayScale,
  language: "no" | "en",
): string {
  return formatTornadoSignedDeltaWithScale(value, scale, language)
}

export function computeTornadoSharedSymmetricMaxAbs(
  rowsGroups: readonly (readonly DeterministicTornadoRow[])[],
): number {
  let m = 0
  for (const rows of rowsGroups) {
    for (const r of rows) {
      m = Math.max(m, Math.abs(r.lowImpact), Math.abs(r.highImpact))
    }
  }
  return Math.max(m, 1e-12)
}

export function buildTornadoSharedLayout(
  rowsGroups: readonly (readonly DeterministicTornadoRow[])[],
  displayScales?: readonly WaterfallDisplayScale[],
): TornadoSharedLayout {
  let longestValueLabelLen = 0
  for (let i = 0; i < rowsGroups.length; i++) {
    const rows = rowsGroups[i]!
    const scale =
      displayScales?.[i] ??
      resolveTornadoDisplayScale(collectTornadoDisplayValues(rows))
    for (const r of rows) {
      longestValueLabelLen = Math.max(
        longestValueLabelLen,
        formatTornadoImpactLabel(r.lowImpact, scale, "no").length,
        formatTornadoImpactLabel(r.highImpact, scale, "no").length,
      )
    }
  }
  return {
    rightMarginPx: Math.max(40, Math.ceil(longestValueLabelLen * 8)),
  }
}

export function ResultsTornado({
  rows,
  layout,
  sharedSymmetricMaxAbs,
  displayScale,
  expanded = false,
  expandLabel,
  onExpand,
}: ResultsTornadoProps) {
  const { t, language } = useI18n()
  const localMaxAbs = useMemo(() => {
    let m = 0
    for (const r of rows) {
      m = Math.max(m, Math.abs(r.lowImpact), Math.abs(r.highImpact))
    }
    return Math.max(m, 1e-12)
  }, [rows])
  const scaleMaxAbs =
    sharedSymmetricMaxAbs !== undefined
      ? Math.max(sharedSymmetricMaxAbs, 1e-12)
      : localMaxAbs
  const paddedMaxAbs = scaleMaxAbs * 1.1

  const resolvedDisplayScale = useMemo(
    () =>
      displayScale ??
      resolveTornadoDisplayScale(collectTornadoDisplayValues(rows)),
    [displayScale, rows],
  )

  const computedLayout = useMemo(
    () => buildTornadoSharedLayout([rows], [resolvedDisplayScale]),
    [rows, resolvedDisplayScale],
  )
  const rightMarginPx = layout?.rightMarginPx ?? computedLayout.rightMarginPx
  const sidePadUnits = tornadoSidePadUnits(rightMarginPx)
  const halfSpan = tornadoHalfSpan(sidePadUnits)
  const metrics = tornadoModeMetrics(expanded)
  const showExpand = shouldShowChartExpand(expanded, onExpand, expandLabel)

  if (rows.length === 0) {
    return (
      <ChartExpandHost
        label={showExpand ? expandLabel : undefined}
        onClick={showExpand ? onExpand : undefined}
        className="section-body flex h-24 items-center justify-center rounded-md border border-dashed border-border/60 bg-muted/15"
      >
        {t("empty.noTornadoData")}
      </ChartExpandHost>
    )
  }
  const chartBody = (
    <div
      className={
        expanded
          ? "rounded-md border border-border/50 bg-muted/20 p-3 sm:p-4"
          : "rounded-md border border-border/50 bg-muted/20 p-2"
      }
      data-tornado-expanded={expanded ? "true" : undefined}
    >
      <div
        className={cn(
          "grid w-full gap-y-0",
          TORNADO_COLUMN_GAP_CLASS,
        )}
        style={{
          gridTemplateColumns: metrics.gridTemplateColumns,
        }}
        data-tornado-grid=""
        data-tornado-balanced-columns="true"
      >
        {rows.map((row) => {
          const low = tornadoBarRect(row.lowImpact, paddedMaxAbs, halfSpan)
          const high = tornadoBarRect(row.highImpact, paddedMaxAbs, halfSpan)

          return (
            <Fragment key={`${row.sourceSeriesIndex}-${row.type}-${row.name}`}>
              <div
                className={cn(
                  "flex min-w-0 items-center overflow-hidden py-0.5 pr-1 leading-tight text-muted-foreground",
                  expanded ? "min-h-9 text-[13px]" : "min-h-7 text-xs",
                )}
                title={row.name}
                data-tornado-name-col=""
              >
                <span
                  className={
                    expanded
                      ? "block min-w-0 whitespace-normal break-words"
                      : "block min-w-0 truncate whitespace-nowrap"
                  }
                >
                  {row.name}
                </span>
              </div>
              <div
                className={cn(
                  "flex w-full min-w-[6rem] items-center py-0.5",
                  expanded ? "min-h-9" : "min-h-7",
                )}
                data-tornado-plot-region=""
              >
                <svg
                  viewBox={`0 0 ${TORNADO_VIEW_W} ${TORNADO_VIEW_H}`}
                  width="100%"
                  height={metrics.rowPx}
                  preserveAspectRatio={metrics.preserveAspectRatio}
                  className={cn("block w-full", metrics.maxHClass)}
                  role="img"
                  aria-label={`Tornado: ${row.name}`}
                  data-tornado-preserve-aspect={metrics.preserveAspectRatio}
                >
                  <line
                    x1={TORNADO_CENTER_X}
                    x2={TORNADO_CENTER_X}
                    y1={0.5}
                    y2={TORNADO_VIEW_H - 0.5}
                    stroke="currentColor"
                    strokeWidth={0.45}
                    vectorEffect="non-scaling-stroke"
                    className="text-border/90"
                  />
                  {low ? (
                    <>
                      <rect
                        x={low.x}
                        y={(TORNADO_VIEW_H - metrics.barH) / 2}
                        width={low.w}
                        height={metrics.barH}
                        rx={metrics.barH / 2}
                        ry={metrics.barH / 2}
                        fill={
                          row.lowImpact < 0
                            ? "var(--tornado-bar-negative)"
                            : "var(--tornado-bar-positive)"
                        }
                        fillOpacity={0.58}
                      >
                        <title>
                          {`P10 impact=${formatNumber(row.lowImpact, 2, language)} (spread=${formatNumber(row.spread, 2, language)})`}
                        </title>
                      </rect>
                      <text
                        x={
                          row.lowImpact < 0
                            ? Math.max(low.x - LABEL_GAP, LABEL_PAD)
                            : Math.min(
                                low.x + low.w + LABEL_GAP,
                                TORNADO_VIEW_W - LABEL_PAD,
                              )
                        }
                        y={TORNADO_VIEW_H / 2}
                        textAnchor={row.lowImpact < 0 ? "end" : "start"}
                        dominantBaseline="middle"
                        className="fill-muted-foreground/90 tabular-nums"
                        fontSize={metrics.labelFontSize}
                      >
                        {formatTornadoImpactLabel(
                          row.lowImpact,
                          resolvedDisplayScale,
                          language,
                        )}
                      </text>
                    </>
                  ) : null}
                  {high ? (
                    <>
                      <rect
                        x={high.x}
                        y={(TORNADO_VIEW_H - metrics.barH) / 2}
                        width={high.w}
                        height={metrics.barH}
                        rx={metrics.barH / 2}
                        ry={metrics.barH / 2}
                        fill={
                          row.highImpact < 0
                            ? "var(--tornado-bar-negative)"
                            : "var(--tornado-bar-positive)"
                        }
                        fillOpacity={0.58}
                      >
                        <title>
                          {`P90 impact=${formatNumber(row.highImpact, 2, language)} (spread=${formatNumber(row.spread, 2, language)})`}
                        </title>
                      </rect>
                      <text
                        x={
                          row.highImpact < 0
                            ? Math.max(high.x - LABEL_GAP, LABEL_PAD)
                            : Math.min(
                                high.x + high.w + LABEL_GAP,
                                TORNADO_VIEW_W - LABEL_PAD,
                              )
                        }
                        y={TORNADO_VIEW_H / 2}
                        textAnchor={row.highImpact < 0 ? "end" : "start"}
                        dominantBaseline="middle"
                        className="fill-muted-foreground/90 tabular-nums"
                        fontSize={metrics.labelFontSize}
                      >
                        {formatTornadoImpactLabel(
                          row.highImpact,
                          resolvedDisplayScale,
                          language,
                        )}
                      </text>
                    </>
                  ) : null}
                </svg>
              </div>
            </Fragment>
          )
        })}
      </div>
    </div>
  )

  return (
    <ChartExpandHost
      label={showExpand ? expandLabel : undefined}
      onClick={showExpand ? onExpand : undefined}
      className="space-y-2"
    >
      <div
        className={cn(
          "flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground",
          showExpand && "min-h-7",
        )}
      >
        <span className="inline-flex items-center gap-1.5">
          <span
            className="h-2 w-3.5 shrink-0 rounded-sm bg-[var(--tornado-bar-negative)]"
            aria-hidden
          />
          {t("results.p10")}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span
            className="h-2 w-3.5 shrink-0 rounded-sm bg-[var(--tornado-bar-positive)]"
            aria-hidden
          />
          {t("results.p90")}
        </span>
      </div>

      {expanded ? (
        <div
          className={TORNADO_EXPANDED_INNER_MAX_CLASS}
          data-tornado-expanded-shell=""
        >
          {chartBody}
        </div>
      ) : (
        chartBody
      )}
    </ChartExpandHost>
  )
}
