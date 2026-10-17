import { type ComponentProps, type ReactNode } from "react"
import { Maximize2 } from "lucide-react"

import { buttonVariants } from "@/shared/ui/button"
import { cn } from "@/shared/utils"

/** Right inset unchanged; top-0 lines the control up with the info/header row. */
export const CHART_EXPAND_OFFSET_CLASS = "top-0 right-1.5"
/** Compact reserved band so the control does not cover table/bar labels. */
export const CHART_EXPAND_RESERVE_TOP_CLASS = "pt-7"

export type ChartExpandButtonProps = {
  label: string
  onClick: () => void
  className?: string
}

/** Subtle Maximize2 control for opening a figure in ExpandedChartDialog. */
export function ChartExpandButton({
  label,
  onClick,
  className,
}: ChartExpandButtonProps) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className={buttonVariants({
        variant: "ghost",
        size: "icon-sm",
        className: cn(
          "chart-expand-control text-muted-foreground/70 hover:text-foreground",
          className,
        ),
      })}
      data-chart-expand=""
    >
      <Maximize2 className="size-3.5" strokeWidth={1.75} aria-hidden />
    </button>
  )
}

export type ChartExpandHostProps = {
  label?: string
  onClick?: () => void
  children: ReactNode
  className?: string
  /** Extra top padding so the control sits in chrome, not on data. */
  reserveTop?: boolean
  /** Compact controls rendered immediately left of the expand button. */
  toolbarLeading?: ReactNode
} & Omit<ComponentProps<"div">, "className" | "children">

/**
 * Positions the expand control in the upper-right of a visualization.
 * Hovering the host emphasizes the control; only the button captures pointer events.
 * Without label/onClick, renders children in a plain wrapper (expanded/modal use).
 */
export function ChartExpandHost({
  label,
  onClick,
  children,
  className,
  reserveTop = false,
  toolbarLeading,
  ...rest
}: ChartExpandHostProps) {
  const interactive = Boolean(label && onClick) || Boolean(toolbarLeading)
  if (!interactive) {
    return (
      <div
        className={cn(reserveTop && CHART_EXPAND_RESERVE_TOP_CLASS, className)}
        {...rest}
      >
        {children}
      </div>
    )
  }
  return (
    <div
      className={cn(
        "group/chart-expand relative",
        reserveTop && CHART_EXPAND_RESERVE_TOP_CLASS,
      )}
      data-chart-expand-host=""
      {...rest}
    >
      <div className={className}>{children}</div>
      <div
        className={cn(
          "pointer-events-none absolute z-10 flex items-center gap-0.5",
          CHART_EXPAND_OFFSET_CLASS,
        )}
        data-chart-expand-slot=""
      >
        {toolbarLeading ? (
          <div
            className="pointer-events-auto"
            data-chart-expand-toolbar-leading=""
          >
            {toolbarLeading}
          </div>
        ) : null}
        {label && onClick ? (
          <ChartExpandButton
            label={label}
            onClick={onClick}
            className="pointer-events-auto"
          />
        ) : null}
      </div>
    </div>
  )
}

