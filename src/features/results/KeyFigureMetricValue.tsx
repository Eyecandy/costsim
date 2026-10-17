import type { ReactElement, ReactNode } from "react"

import { cn } from "@/shared/utils"

/** Shared metric grid: absolute value | reserved percent slot. */
export const KEY_FIGURES_METRIC_GRID_INLINE = "grid-cols-[minmax(0,1fr)_8ch] gap-3"
export const KEY_FIGURES_METRIC_GRID_EXPANDED = "grid-cols-[minmax(0,1fr)_8ch] gap-3"
export const KEY_FIGURES_METRIC_GRID_INLINE_TIGHT = "grid-cols-[minmax(0,1fr)_8ch] gap-2"
export const KEY_FIGURES_METRIC_GRID_EXPANDED_TIGHT = "grid-cols-[minmax(0,1fr)_8ch] gap-2.5"

export type KeyFigureMetricValueProps = {
  absoluteText: string
  /** Secondary text in the reserved percent slot, e.g. `(12.4 %)`. */
  percentText?: string
  /**
   * When true (default), always reserve the percent column so absolute values
   * share one right edge across rows — even if this cell has no percent.
   */
  reservePercentSlot?: boolean
  /** Applied to the root grid — use for one shared semantic color on both parts. */
  className?: string
  absoluteClassName?: string
  percentClassNameOverride?: string
  /**
   * When true, percent (and absolute) use `text-inherit` only — no muted/red/green
   * of their own. Parent must own the semantic text color.
   */
  inheritColor?: boolean
  expanded?: boolean
}

/**
 * Key Figures numeric cell: right-aligned absolute + optional percent beside it.
 * Percent presence must not shift the absolute value’s right edge.
 */
export function KeyFigureMetricValue({
  absoluteText,
  percentText,
  reservePercentSlot = true,
  className,
  absoluteClassName,
  percentClassNameOverride,
  inheritColor = false,
  expanded = false,
}: KeyFigureMetricValueProps): ReactElement {
  const percentClassName = inheritColor
    ? "justify-self-start text-left text-inherit"
    : (percentClassNameOverride ??
      (percentText
        ? "justify-self-start text-left text-muted-foreground"
        : "invisible justify-self-start text-left text-muted-foreground"))
  const gridCols = reservePercentSlot
    ? expanded
      ? KEY_FIGURES_METRIC_GRID_EXPANDED
      : KEY_FIGURES_METRIC_GRID_INLINE
    : expanded
      ? KEY_FIGURES_METRIC_GRID_EXPANDED_TIGHT
      : KEY_FIGURES_METRIC_GRID_INLINE_TIGHT
  return (
    <span
      className={cn(
        "inline-grid w-full items-baseline justify-end whitespace-nowrap",
        gridCols,
        className,
      )}
      data-key-figure-metric-value=""
      data-key-figure-metric-inherit-color={inheritColor ? "true" : undefined}
    >
      <span
        className={cn("justify-self-end", inheritColor && "text-inherit", absoluteClassName)}
        data-key-figure-metric-absolute=""
      >
        {absoluteText}
      </span>
      <span className={percentClassName} data-key-figure-metric-percent="">
        {percentText ?? (inheritColor ? "\u00a0" : "(0,0 %)")}
      </span>
    </span>
  )
}

/**
 * Column header aligned to the absolute-value sub-column of
 * {@link KeyFigureMetricValue} (same grid; reserved percent slot).
 */
export function KeyFigureMetricColumnHeader({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}): ReactElement {
  return (
    <span
      className={cn("inline-grid w-full items-end", KEY_FIGURES_METRIC_GRID_INLINE, className)}
      data-key-figure-metric-column-header=""
    >
      <span className="justify-self-end text-right font-normal">{children}</span>
      <span className="invisible select-none" aria-hidden>
        (0,0 %)
      </span>
    </span>
  )
}
