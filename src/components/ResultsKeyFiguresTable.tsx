import { type CSSProperties, type ReactElement, type ReactNode } from "react"

import { appFeatures } from "@/config/appVariant"
import {
  ChartExpandHost,
  shouldShowChartExpand,
} from "@/components/ChartExpandButton"
import {
  KEY_FIGURES_METRIC_GRID_EXPANDED,
  KEY_FIGURES_METRIC_GRID_INLINE,
  KeyFigureMetricValue,
} from "@/components/KeyFigureMetricValue"
import { useI18n } from "@/i18n/useI18n"
import {
  formatKeyFigurePercent,
  formatKeyFigureStat,
  formatProbabilityBelowRowLabel,
} from "@/domain/results/keyFiguresDisplay"
import { computeUncertainDeltaWithPct, type Project } from "@/lib/project"
import {
  formatPercentileLabel,
  shouldShowProbabilityBelowCostLevel,
  type ResultPreferencesV1,
} from "@/domain/results/resultPreferences"
import { frozenProbabilityBelowForAmount } from "@/domain/results/resultSettingsPresentation"
import {
  mean,
  percentile,
  probabilityAtOrBelowPercent,
  relativeStandardDeviationPercent,
  standardDeviation,
} from "@/domain/simulation/stats"
import { cn } from "@/lib/utils"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { OngoingFrozenKeyFiguresV1 } from "@/lib/ongoingCheckpointResultSnapshot"

export type ResultsKeyFiguresTableProps = {
  projects: readonly Project[]
  valuesByProjectId: ReadonlyMap<string, readonly number[]>
  baseCostByProjectId: ReadonlyMap<string, number | null>
  simulatedIncurredByProjectId: ReadonlyMap<string, number>
  preferences: ResultPreferencesV1
  frozenKeyFiguresByProjectId?: ReadonlyMap<
    string,
    OngoingFrozenKeyFiguresV1
  >
  /** Larger layout for ExpandedChartDialog; same values as inline. */
  expanded?: boolean
  expandLabel?: string
  onExpand?: () => void
}

/** Thin wrapper so call sites / source-sniff tests keep `renderMetricValue`. */
function renderMetricValue(
  absoluteText: string,
  percentText?: string,
  reservePercentSlot = true,
  absoluteClassName?: string,
  percentClassNameOverride?: string,
  expanded = false,
): ReactElement {
  // Keep INLINE token referenced — shared layout contract with KeyFigureMetricValue.
  void KEY_FIGURES_METRIC_GRID_INLINE
  return (
    <KeyFigureMetricValue
      absoluteText={absoluteText}
      percentText={percentText}
      reservePercentSlot={reservePercentSlot}
      absoluteClassName={absoluteClassName}
      percentClassNameOverride={percentClassNameOverride}
      expanded={expanded}
    />
  )
}

function renderProjectHeaderLabel(
  label: string,
  expanded: boolean,
): ReactElement {
  if (!expanded) {
    return (
      <span
        title={label}
        className={cn(
          "block w-full min-w-0 overflow-hidden text-center font-medium leading-[1.375] tracking-normal",
          "break-words [overflow-wrap:anywhere]",
          "max-h-[2.75em] line-clamp-2",
        )}
      >
        {label}
      </span>
    )
  }

  return (
    <span
      title={label}
      className={cn(
        "inline-grid w-full items-end",
        KEY_FIGURES_METRIC_GRID_EXPANDED,
      )}
      data-key-figures-project-header=""
    >
      <span
        className={cn(
          "min-w-0 justify-self-end overflow-hidden text-right font-medium leading-[1.375] tracking-normal",
          "break-words [overflow-wrap:anywhere]",
          "max-h-[4.2em] line-clamp-3 text-[13px]",
        )}
      >
        {label}
      </span>
      <span className="invisible select-none" aria-hidden>
        (0,0 %)
      </span>
    </span>
  )
}

type MetricRowSpec = {
  id: string
  label: string
  renderCell: (project: Project, expanded: boolean) => ReactNode
}

/**
 * Shared Key Figures comparison table for inline results and expanded dialog.
 * Row visibility follows Result Preferences (presentation only).
 */
export function ResultsKeyFiguresTable({
  projects,
  valuesByProjectId,
  baseCostByProjectId,
  simulatedIncurredByProjectId,
  preferences,
  frozenKeyFiguresByProjectId,
  expanded = false,
  expandLabel,
  onExpand,
}: ResultsKeyFiguresTableProps) {
  const { t, language } = useI18n()
  const kf = preferences.keyFigures
  const frozenFor = (projectId: string) =>
    frozenKeyFiguresByProjectId?.get(projectId)

  const projectColumns: (Project | null)[] =
    projects.length === 1 ? [projects[0]!, null] : [...projects]

  const useScrollable =
    expanded ? projects.length >= 4 : projects.length > 2

  const stickySurfaceClass = useScrollable
    ? expanded
      ? "bg-background"
      : "bg-[var(--km-surface)]"
    : ""
  const stickyFirstColHeadClass = useScrollable
    ? `sticky left-0 z-[1] ${stickySurfaceClass}`
    : ""
  const stickyFirstColCellClass = useScrollable
    ? `sticky left-0 z-0 ${stickySurfaceClass}`
    : ""

  const nameColWidth = expanded
    ? useScrollable
      ? "14rem"
      : "36%"
    : useScrollable
      ? "11rem"
      : "48%"
  const projectColWidth = expanded
    ? useScrollable
      ? "12.5rem"
      : undefined
    : useScrollable
      ? "9.5rem"
      : "26%"

  const expandedMinWidth =
    expanded && useScrollable
      ? `${14 + projects.length * 12.5}rem`
      : undefined

  const showExpand = shouldShowChartExpand(expanded, onExpand, expandLabel)

  const rows: MetricRowSpec[] = []

  if (kf.showBaseCost) {
    rows.push({
      id: "baseCost",
      label: t("keyMetrics.baseCost"),
      renderCell: (p, exp) =>
        renderMetricValue(
          formatKeyFigureStat(
            frozenFor(p.id)?.baseCost ??
              baseCostByProjectId.get(p.id) ??
              null,
            language,
          ),
          undefined,
          true,
          undefined,
          undefined,
          exp,
        ),
    })
  }

  if (kf.showExpectedAddition && appFeatures.showExpectedAddition) {
    rows.push({
      id: "expectedAddition",
      label: t("keyMetrics.expectedAddition"),
      renderCell: (p, exp) => {
        const frozen = frozenFor(p.id)
        if (frozen) {
          return renderMetricValue(
            formatKeyFigureStat(frozen.expectedAddition, language),
            `(${formatKeyFigurePercent(frozen.expectedAdditionPct, language)})`,
            true,
            undefined,
            undefined,
            exp,
          )
        }
        const values = valuesByProjectId.get(p.id) ?? []
        const p50 = percentile(values, 50)
        const base = baseCostByProjectId.get(p.id) ?? null
        const simulatedIncurred =
          simulatedIncurredByProjectId.get(p.id) ?? p.incurredCosts
        const delta = computeUncertainDeltaWithPct(
          p50,
          base,
          simulatedIncurred,
        )
        return renderMetricValue(
          formatKeyFigureStat(delta.absolute, language),
          `(${formatKeyFigurePercent(delta.percent, language)})`,
          true,
          undefined,
          undefined,
          exp,
        )
      },
    })
  }

  for (const pLevel of kf.percentiles) {
    const lockedP85 = pLevel === 85 && !appFeatures.showP85
    rows.push({
      id: `p${pLevel}`,
      label: formatPercentileLabel(pLevel),
      renderCell: (p, exp) => {
        if (lockedP85) {
          return renderMetricValue(
            t("results.locked"),
            undefined,
            true,
            undefined,
            undefined,
            exp,
          )
        }
        const frozen = frozenFor(p.id)
        const values = valuesByProjectId.get(p.id) ?? []
        return renderMetricValue(
          formatKeyFigureStat(
            frozen?.percentiles[String(pLevel)] ??
              percentile(values, pLevel),
            language,
          ),
          undefined,
          true,
          undefined,
          undefined,
          exp,
        )
      },
    })

    // Preserve today's visual bridge: Reserve after P50 when both are shown.
    if (
      pLevel === 50 &&
      kf.showUncertaintyReserve &&
      !rows.some((r) => r.id === "uncertaintyReserve")
    ) {
      rows.push({
        id: "uncertaintyReserve",
        label: t("keyMetrics.uncertaintyPremium"),
        renderCell: (p, exp) => {
          if (!appFeatures.showContingency) {
            return renderMetricValue(
              t("results.locked"),
              undefined,
              true,
              undefined,
              undefined,
              exp,
            )
          }
          const frozen = frozenFor(p.id)
          if (frozen) {
            return renderMetricValue(
              formatKeyFigureStat(frozen.uncertaintyReserve, language),
              `(${formatKeyFigurePercent(frozen.uncertaintyReservePct, language)})`,
              true,
              undefined,
              undefined,
              exp,
            )
          }
          const values = valuesByProjectId.get(p.id) ?? []
          const p85 = percentile(values, 85)
          const p50 = percentile(values, 50)
          const simulatedIncurred =
            simulatedIncurredByProjectId.get(p.id) ?? p.incurredCosts
          const premium = computeUncertainDeltaWithPct(
            p85,
            p50,
            simulatedIncurred,
          )
          return renderMetricValue(
            formatKeyFigureStat(premium.absolute, language),
            `(${formatKeyFigurePercent(premium.percent, language)})`,
            true,
            undefined,
            undefined,
            exp,
          )
        },
      })
    }
  }

  if (
    kf.showUncertaintyReserve &&
    !rows.some((r) => r.id === "uncertaintyReserve")
  ) {
    rows.push({
      id: "uncertaintyReserve",
      label: t("keyMetrics.uncertaintyPremium"),
      renderCell: (p, exp) => {
        if (!appFeatures.showContingency) {
          return renderMetricValue(
            t("results.locked"),
            undefined,
            true,
            undefined,
            undefined,
            exp,
          )
        }
        const frozen = frozenFor(p.id)
        if (frozen) {
          return renderMetricValue(
            formatKeyFigureStat(frozen.uncertaintyReserve, language),
            `(${formatKeyFigurePercent(frozen.uncertaintyReservePct, language)})`,
            true,
            undefined,
            undefined,
            exp,
          )
        }
        const values = valuesByProjectId.get(p.id) ?? []
        const p85 = percentile(values, 85)
        const p50 = percentile(values, 50)
        const simulatedIncurred =
          simulatedIncurredByProjectId.get(p.id) ?? p.incurredCosts
        const premium = computeUncertainDeltaWithPct(
          p85,
          p50,
          simulatedIncurred,
        )
        return renderMetricValue(
          formatKeyFigureStat(premium.absolute, language),
          `(${formatKeyFigurePercent(premium.percent, language)})`,
          true,
          undefined,
          undefined,
          exp,
        )
      },
    })
  }

  if (kf.showExpectedValue) {
    rows.push({
      id: "expectedValue",
      label: t("keyMetrics.expectedValue"),
      renderCell: (p, exp) =>
        renderMetricValue(
          formatKeyFigureStat(
            frozenFor(p.id)?.expectedValue ??
              mean(valuesByProjectId.get(p.id) ?? []),
            language,
          ),
          undefined,
          true,
          undefined,
          undefined,
          exp,
        ),
    })
  }

  if (kf.showStdDev) {
    rows.push({
      id: "stdDev",
      label: t("keyMetrics.stdDev"),
      renderCell: (p, exp) => {
        const frozen = frozenFor(p.id)
        if (frozen) {
          return renderMetricValue(
            formatKeyFigureStat(frozen.stdDev, language),
            `(${formatKeyFigurePercent(frozen.stdDevPct, language)})`,
            true,
            undefined,
            undefined,
            exp,
          )
        }
        const values = valuesByProjectId.get(p.id) ?? []
        const abs = standardDeviation(values)
        const expectedValue = mean(values)
        const relativePct = relativeStandardDeviationPercent(
          abs,
          expectedValue,
        )
        return renderMetricValue(
          formatKeyFigureStat(abs, language),
          `(${formatKeyFigurePercent(relativePct, language)})`,
          true,
          undefined,
          undefined,
          exp,
        )
      },
    })
  }

  if (kf.showProbabilityAtBaseCost) {
    rows.push({
      id: "probAtBase",
      label: t("keyMetrics.probabilityAtBaseCost"),
      renderCell: (p, exp) => {
        const frozen = frozenFor(p.id)
        const base = baseCostByProjectId.get(p.id)
        const values = valuesByProjectId.get(p.id) ?? []
        const pct = frozen
          ? frozen.probAtBase
          :
          base === null || base === undefined
            ? null
            : probabilityAtOrBelowPercent(values, base)
        return renderMetricValue(
          pct === null ? "—" : formatKeyFigurePercent(pct, language),
          undefined,
          true,
          undefined,
          undefined,
          exp,
        )
      },
    })
  }

  const probBelow = kf.probabilityBelowCostLevel
  if (shouldShowProbabilityBelowCostLevel(probBelow)) {
    const amount = probBelow.amount!
    rows.push({
      id: "probBelowCostLevel",
      label: formatProbabilityBelowRowLabel(
        amount,
        t("keyMetrics.probabilityBelowWithAmount"),
        language,
      ),
      renderCell: (p, exp) => {
        const frozen = frozenFor(p.id)
        const values = valuesByProjectId.get(p.id) ?? []
        const pct = frozen
          ? frozenProbabilityBelowForAmount(frozen, amount)
          : probabilityAtOrBelowPercent(values, amount)
        return renderMetricValue(
          formatKeyFigurePercent(pct, language),
          undefined,
          true,
          undefined,
          undefined,
          exp,
        )
      },
    })
  }

  return (
    <ChartExpandHost
      label={showExpand ? expandLabel : undefined}
      onClick={showExpand ? onExpand : undefined}
      reserveTop={showExpand}
      className={cn(
        expanded && "rounded-md border border-border/50 bg-muted/15 p-3 sm:p-4",
      )}
      data-key-figures-expanded={expanded ? "true" : undefined}
    >
      <div className={cn(useScrollable && "overflow-x-auto")}>
        <Table
          className={cn(
            "table-fixed",
            useScrollable &&
              !expanded &&
              "[&_th]:px-0.5 [&_td]:px-0.5 min-w-[49.5rem]",
            expanded && useScrollable && "min-w-[var(--km-expanded-min-w)]",
            expanded && "[&_th]:px-2 [&_td]:px-2",
          )}
          style={
            expandedMinWidth
              ? ({ ["--km-expanded-min-w"]: expandedMinWidth } as CSSProperties)
              : undefined
          }
        >
          <colgroup>
            <col style={{ width: nameColWidth }} />
            {projectColumns.map((p, idx) => (
              <col
                key={p?.id ?? `km-empty-project-${idx}`}
                style={
                  projectColWidth !== undefined
                    ? { width: projectColWidth }
                    : expanded
                      ? {
                          width: `${64 / Math.max(projectColumns.length, 1)}%`,
                        }
                      : { width: "26%" }
                }
              />
            ))}
          </colgroup>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead
                className={cn(
                  "truncate text-left",
                  stickyFirstColHeadClass,
                  expanded && "py-2.5",
                )}
              >
                {t("keyMetrics.name")}
              </TableHead>
              {projectColumns.map((p, idx) => (
                <TableHead
                  key={p?.id ?? `km-empty-project-head-${idx}`}
                  className={cn(
                    "h-auto min-w-0 overflow-hidden align-middle",
                    expanded ? "min-h-10 py-2.5" : "text-center min-h-9 py-1",
                  )}
                >
                  {renderProjectHeaderLabel(p?.name ?? "", expanded)}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id} data-key-figure-row={row.id}>
                <TableCell
                  className={cn(
                    "text-left break-words [overflow-wrap:anywhere]",
                    stickyFirstColCellClass,
                    expanded && "py-2.5",
                  )}
                >
                  {row.label}
                </TableCell>
                {projectColumns.map((p, idx) => (
                  <TableCell
                    key={p?.id ?? `km-empty-${row.id}-${idx}`}
                    className={cn(
                      "table-value text-right tabular-nums",
                      expanded && "py-2.5",
                      row.id === "p85" &&
                        !appFeatures.showP85 &&
                        "text-muted-foreground/80",
                    )}
                  >
                    {p ? row.renderCell(p, expanded) : null}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </ChartExpandHost>
  )
}
