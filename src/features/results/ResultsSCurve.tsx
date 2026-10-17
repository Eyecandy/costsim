import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent } from "react"

import { ChartExpandHost } from "@/features/results/ChartExpandButton"
import { shouldShowChartExpand } from "@/features/results/chartExpand"
import { useI18n } from "@/i18n/useI18n"
import { cn } from "@/shared/utils"
import {
  CHART_AXIS_STROKE_CLASS,
  CHART_AXIS_STROKE_WIDTH,
  CHART_CLASSIC_MARKER_FILL_OPACITY,
  CHART_GRID_STROKE_CLASS,
  CHART_GRID_STROKE_WIDTH,
  CHART_HTML_LEGEND_TEXT_CLASS,
  CHART_PRIMARY_ANNOTATION_FILL_CLASS,
  CHART_PRIMARY_ANNOTATION_FILL_OPACITY,
  CHART_PRIMARY_STROKE_WIDTH,
  CHART_SECONDARY_STROKE_WIDTH,
  CHART_SVG_DATA_LABEL_FONT_SIZE,
  CHART_SVG_TICK_FONT_SIZE,
  CHART_TICK_FILL_CLASS,
  chartPercentileGuideOpacity,
} from "@/domain/results/chartPresentation"
import {
  SCURVE_CURVE_BOTTOM_PAD,
  SCURVE_CURVE_STROKE_LINECAP,
  SCURVE_CURVE_STROKE_LINEJOIN,
  SCURVE_CURVE_TOP_PAD,
  SCURVE_EXPANDED_SHELL_CLASS,
  SCURVE_INLINE_SHELL_CLASS,
  SCURVE_PLOT_ASPECT_CLASS,
  SCURVE_PLOT_PAD_X,
  SCURVE_PLOT_PAD_Y,
  SCURVE_VIEWBOX_HEIGHT,
  SCURVE_VIEWBOX_WIDTH,
  computeSCurveDisplaySeries,
} from "@/domain/results/sCurveDisplay"
import {
  buildClassicGuides,
  classicXLabelY,
  classicYLabelX,
  CLASSIC_VIEWBOX_PAD_BOTTOM,
  CLASSIC_VIEWBOX_PAD_LEFT,
  formatSCurveYAxisPercentileTick,
  layoutClassicXAxisLabels,
  layoutClassicYAxisLabels,
  shouldHideOrdinaryXTickLabel,
  shouldHideOrdinaryYTickLabel,
} from "@/domain/results/sCurveClassicGuides"
import {
  SCURVE_HOVER_CROSSHAIR_STROKE_WIDTH,
  SCURVE_HOVER_MARKER_RADIUS,
  activeSCurveInspectionCost,
  clientPointToViewBox,
  costFromPlotX,
  formatSCurveCost,
  hoverRowsAtCost,
  isInsideSCurvePlot,
  plotXFromCost,
  plotYFromProbability,
  resolveSCurveCostDisplayScale,
  scurveTooltipPlacement,
  sortFiniteValues,
  togglePinnedCost,
} from "@/domain/results/sCurveHover"
import { sCurveProjectLayerOpacity } from "@/domain/results/sCurveProjectEmphasis"
import type { ProjectColorCssVar } from "@/domain/results/projectColors"
import { percentile } from "@/domain/simulation/stats"

type CurveSeries = {
  id: string
  label: string
  values?: readonly number[]
  /** Precomputed display CDF for compact Ongoing checkpoints. */
  displayPoints?: readonly { x: number; y: number }[]
  colorVar: ProjectColorCssVar
  /**
   * Optional secondary reference curve (e.g. previous checkpoint).
   * Primary curves keep normal stroke/markers; reference is muted.
   */
  emphasis?: "primary" | "reference"
}

export type ResultsSCurveSeries = CurveSeries

type ResultsSCurveProps = {
  series: readonly CurveSeries[]
  /** Percentile markers to draw (e.g. [50, 85]). Presentation only. */
  markerPercentiles?: readonly number[]
  /** Larger container sizing for ExpandedChartDialog; same data and SVG geometry. */
  expanded?: boolean
  expandLabel?: string
  onExpand?: () => void
  /**
   * Ephemeral click multi-select (project ids). Shared with expanded view via parent.
   * Not persisted.
   */
  selectedProjectIds?: readonly string[]
  /** Toggle a project in the click-selected set. */
  onToggleProjectSelection?: (projectId: string) => void
}

const EMPTY_SELECTED_PROJECT_IDS: readonly string[] = []

const CHART_W = SCURVE_VIEWBOX_WIDTH
const CHART_H = SCURVE_VIEWBOX_HEIGHT
const PAD_X = SCURVE_PLOT_PAD_X
const PAD_Y = SCURVE_PLOT_PAD_Y
const DEFAULT_CURVE_TOP_PAD = SCURVE_CURVE_TOP_PAD
const CURVE_BOTTOM_PAD = SCURVE_CURVE_BOTTOM_PAD
const REF_LINE_BOTTOM_Y = CHART_H - PAD_Y
/** Single-letter axis hints; letters from i18n (charts.axisY / charts.axisX). */
const AXIS_P_X = 2.2
const AXIS_P_Y = 1.75
const AXIS_C_Y = CHART_H - PAD_Y - 1.1
const Y_TICKS = [0, 0.25, 0.5, 0.75, 1] as const
const CURVE_CLIP_PAD = CHART_PRIMARY_STROKE_WIDTH * 0.6
const X_DOMAIN_LOW_PERCENTILE = 1
const X_DOMAIN_HIGH_PERCENTILE = 99
const X_DOMAIN_PADDING_RATIO = 0.06
const X_TICK_APPROX_COUNT = 6

export function ResultsSCurve({
  series,
  markerPercentiles = [50, 85],
  expanded = false,
  expandLabel,
  onExpand,
  selectedProjectIds = EMPTY_SELECTED_PROJECT_IDS,
  onToggleProjectSelection,
}: ResultsSCurveProps) {
  const { t, language } = useI18n()
  const svgRef = useRef<SVGSVGElement>(null)
  const hoverCaptureRef = useRef<SVGRectElement>(null)
  /** Live hover cost while pointer is in the plot (chart domain). */
  const [hoverCost, setHoverCost] = useState<number | null>(null)
  /** Frozen inspection cost; when set, pointer movement is ignored. */
  const [pinnedCost, setPinnedCost] = useState<number | null>(null)
  /** Ephemeral legend hover — temporarily adds to emphasis set. */
  const [hoveredProjectId, setHoveredProjectId] = useState<string | null>(null)

  const chartW = CHART_W
  const axisCX = chartW - 2.2
  const curves = useMemo(() => {
    return series
      .map((s) => ({
        ...s,
        values: s.values ?? s.displayPoints?.map((point) => point.x) ?? [],
        emphasis: s.emphasis ?? ("primary" as const),
        points:
          s.displayPoints?.map((point) => ({ ...point })) ??
          computeSCurveDisplaySeries(s.values ?? []),
      }))
      .filter((s) => s.points.length > 0)
  }, [series])

  const primaryCurves = useMemo(() => curves.filter((c) => c.emphasis !== "reference"), [curves])

  const curveTopPad = DEFAULT_CURVE_TOP_PAD

  const markerLevels = useMemo(() => {
    const cleaned = markerPercentiles
      .filter((p) => Number.isFinite(p) && p >= 1 && p <= 99)
      .map((p) => Math.round(p))
    const unique = [...new Set(cleaned)].sort((a, b) => a - b)
    return unique.length > 0 ? unique : [50, 85]
  }, [markerPercentiles])

  const [domainMinX, domainMaxX] = useMemo(() => {
    let low = Number.POSITIVE_INFINITY
    let high = Number.NEGATIVE_INFINITY
    for (const c of curves) {
      const pLow = percentile(c.values, X_DOMAIN_LOW_PERCENTILE)
      const pHigh = percentile(c.values, X_DOMAIN_HIGH_PERCENTILE)
      if (pLow !== null && Number.isFinite(pLow) && pLow < low) low = pLow
      if (pHigh !== null && Number.isFinite(pHigh) && pHigh > high) high = pHigh
    }
    if (!Number.isFinite(low) || !Number.isFinite(high)) return [0, 1] as const
    if (low === high) return [low - 1, high + 1] as const
    const span = high - low
    const pad = Math.max(1, span * X_DOMAIN_PADDING_RATIO)
    return [low - pad, high + pad] as const
  }, [curves])

  const xTicks = useMemo(
    () => buildXTicks(domainMinX, domainMaxX, X_TICK_APPROX_COUNT),
    [domainMinX, domainMaxX],
  )
  const [axisMinX, axisMaxX] = useMemo(() => {
    if (xTicks.length >= 2) {
      return [xTicks[0]!, xTicks[xTicks.length - 1]!] as const
    }
    return [domainMinX, domainMaxX] as const
  }, [xTicks, domainMinX, domainMaxX])

  const classicGuides = useMemo(() => {
    return buildClassicGuides({
      series: primaryCurves.map((c, index) => ({
        id: c.id,
        values: c.values,
        colorVar: c.colorVar,
        index,
      })),
      markerPercentiles: markerLevels,
      axisMinX,
      axisMaxX,
      chartWidth: chartW,
    })
  }, [primaryCurves, markerLevels, axisMinX, axisMaxX, chartW])

  const classicYLabels = useMemo(() => layoutClassicYAxisLabels(markerLevels), [markerLevels])

  const classicXLabels = useMemo(() => layoutClassicXAxisLabels(classicGuides), [classicGuides])

  /** Shared monetary scale for ticks, percentile costs, and hover. */
  const costDisplayScale = useMemo(
    () => resolveSCurveCostDisplayScale(axisMinX, axisMaxX),
    [axisMinX, axisMaxX],
  )

  const classicXLabelRender = useMemo(
    () =>
      classicXLabels.map((label) => ({
        ...label,
        text: formatSCurveCost(label.cost, costDisplayScale, language),
        y: classicXLabelY(REF_LINE_BOTTOM_Y, label.row),
        fontSize: CHART_SVG_DATA_LABEL_FONT_SIZE,
      })),
    [classicXLabels, costDisplayScale, language],
  )

  const curveClipPathId = useMemo(
    () => `scurve-clip-${series.map((s) => s.id).join("-") || "default"}`,
    [series],
  )
  const hoverProjects = useMemo(() => {
    if (!expanded) return []
    return curves.map((c) => ({
      id: c.id,
      label: c.label,
      colorVar: c.colorVar,
      sortedValues: sortFiniteValues(c.values),
    }))
  }, [curves, expanded])
  const inspectionCost = activeSCurveInspectionCost(pinnedCost, hoverCost)
  const inspectionPlotX =
    inspectionCost === null ? null : plotXFromCost(inspectionCost, axisMinX, axisMaxX, chartW)
  const hoverRows = inspectionCost === null ? null : hoverRowsAtCost(hoverProjects, inspectionCost)
  const tooltipSide =
    inspectionPlotX === null ? "right" : scurveTooltipPlacement(inspectionPlotX, chartW)
  const isPinned = pinnedCost !== null

  const costFromClientPoint = useCallback(
    (clientX: number, clientY: number): number | null => {
      const svg = svgRef.current
      if (!svg) return null
      const point = clientPointToViewBox(
        clientX,
        clientY,
        svg.getBoundingClientRect(),
        chartW,
        CHART_H,
      )
      if (!point || !isInsideSCurvePlot(point.x, point.y, chartW, curveTopPad)) return null
      return costFromPlotX(point.x, axisMinX, axisMaxX, chartW)
    },
    [axisMinX, axisMaxX, chartW, curveTopPad],
  )

  const clearHover = useCallback(() => {
    if (pinnedCost !== null) return
    setHoverCost(null)
  }, [pinnedCost])

  const updateHoverFromPointer = useCallback(
    (event: PointerEvent<SVGRectElement>) => {
      if (!expanded || pinnedCost !== null) return
      const cost = costFromClientPoint(event.clientX, event.clientY)
      setHoverCost(cost)
    },
    [expanded, pinnedCost, costFromClientPoint],
  )

  const handlePlotPointerDown = useCallback(
    (event: PointerEvent<SVGRectElement>) => {
      if (!expanded) return
      const costAtPointer = costFromClientPoint(event.clientX, event.clientY)
      if (costAtPointer === null) return

      if (pinnedCost !== null) {
        setPinnedCost(null)
        setHoverCost(costAtPointer)
        return
      }

      const nextPin = togglePinnedCost(null, hoverCost ?? costAtPointer)
      if (nextPin !== null) {
        setPinnedCost(nextPin)
        setHoverCost(nextPin)
      }
    },
    [expanded, pinnedCost, hoverCost, costFromClientPoint],
  )

  useEffect(() => {
    if (!expanded || pinnedCost === null) return

    const onPointerDownOutside = (event: globalThis.PointerEvent) => {
      const capture = hoverCaptureRef.current
      const target = event.target
      if (capture && target instanceof Node && (capture === target || capture.contains(target))) {
        return
      }
      setPinnedCost(null)
      setHoverCost(null)
    }

    document.addEventListener("pointerdown", onPointerDownOutside)
    return () => document.removeEventListener("pointerdown", onPointerDownOutside)
  }, [expanded, pinnedCost])

  useEffect(() => {
    if (!expanded || pinnedCost === null) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return
      event.preventDefault()
      event.stopImmediatePropagation()
      setPinnedCost(null)
    }

    window.addEventListener("keydown", onKeyDown, true)
    return () => window.removeEventListener("keydown", onKeyDown, true)
  }, [expanded, pinnedCost])

  const showExpand = shouldShowChartExpand(expanded, onExpand, expandLabel)
  const svgViewBox = `${-CLASSIC_VIEWBOX_PAD_LEFT} 0 ${chartW + CLASSIC_VIEWBOX_PAD_LEFT} ${CHART_H + CLASSIC_VIEWBOX_PAD_BOTTOM}`

  const projectLayerOpacity = (projectId: string): number =>
    sCurveProjectLayerOpacity(projectId, selectedProjectIds, hoveredProjectId)

  if (curves.length === 0) {
    return (
      <ChartExpandHost
        label={showExpand ? expandLabel : undefined}
        onClick={showExpand ? onExpand : undefined}
        className="section-body flex h-40 items-center justify-center rounded-md border border-dashed border-border/60 bg-muted/15"
      >
        {t("empty.noData")}
      </ChartExpandHost>
    )
  }

  return (
    <ChartExpandHost
      label={showExpand ? expandLabel : undefined}
      onClick={showExpand ? onExpand : undefined}
      className="space-y-2"
    >
      <div
        className={cn(
          "flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1",
          CHART_HTML_LEGEND_TEXT_CLASS,
          showExpand && "min-h-7",
          // Keep clear of absolute ChartExpandHost expand control.
          showExpand && "pr-9",
        )}
        data-scurve-legend=""
      >
        {curves.map((c) => {
          const isReference = c.emphasis === "reference"
          const isSelected = selectedProjectIds.includes(c.id)
          if (isReference) {
            return (
              <span
                key={c.id}
                className="inline-flex min-w-0 max-w-full items-center gap-1.5 text-muted-foreground/80"
                data-scurve-legend-item={c.id}
                data-scurve-legend-emphasis="reference"
                title={c.label}
              >
                <span
                  className="inline-block w-3 shrink-0 border-t border-dashed border-muted-foreground/70"
                  aria-hidden
                />
                <span className="scurve-legend-label">{c.label}</span>
              </span>
            )
          }
          return (
            <button
              key={c.id}
              type="button"
              className={cn(
                "scurve-legend-item inline-flex min-w-0 max-w-full items-center gap-1.5 bg-transparent p-0 text-inherit",
                isSelected && "scurve-legend-item--selected",
              )}
              data-scurve-legend-item={c.id}
              data-scurve-legend-selected={isSelected ? "true" : undefined}
              aria-pressed={isSelected}
              aria-label={c.label}
              title={c.label}
              onMouseEnter={() => setHoveredProjectId(c.id)}
              onMouseLeave={() => setHoveredProjectId(null)}
              onFocus={() => setHoveredProjectId(c.id)}
              onBlur={() => setHoveredProjectId(null)}
              onClick={() => onToggleProjectSelection?.(c.id)}
            >
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: `var(${c.colorVar})` }}
                aria-hidden
              />
              <span className="scurve-legend-label">{c.label}</span>
            </button>
          )
        })}
      </div>

      <div
        className={
          expanded
            ? "rounded-md border border-border/50 bg-muted/20 p-4 sm:p-5"
            : "rounded-md border border-border/50 bg-muted/20 p-3"
        }
        data-scurve-expanded={expanded ? "true" : undefined}
      >
        <div
          className={expanded ? SCURVE_EXPANDED_SHELL_CLASS : SCURVE_INLINE_SHELL_CLASS}
          data-scurve-available=""
        >
          <div className={cn("relative w-full", SCURVE_PLOT_ASPECT_CLASS)} data-scurve-plot="">
            <svg
              ref={svgRef}
              viewBox={svgViewBox}
              preserveAspectRatio="xMidYMid meet"
              className="h-full w-full"
              role="img"
              aria-label="S-kurve for simuleringsresultater"
            >
              <defs>
                <clipPath id={curveClipPathId}>
                  <rect
                    x={PAD_X - CURVE_CLIP_PAD}
                    y={curveTopPad - CURVE_CLIP_PAD}
                    width={chartW - PAD_X * 2 + CURVE_CLIP_PAD * 2}
                    height={CHART_H - curveTopPad - CURVE_BOTTOM_PAD + CURVE_CLIP_PAD * 2}
                  />
                </clipPath>
              </defs>
              {xTicks.map((tick) => {
                const x = xForValue(tick, axisMinX, axisMaxX, chartW)
                const tickText = formatSCurveCost(tick, costDisplayScale, language)
                const hideTickText = shouldHideOrdinaryXTickLabel({
                  tickX: x,
                  tickY: CHART_H - PAD_Y + 1.8,
                  tickText,
                  customLabels: classicXLabelRender,
                })
                return (
                  <g key={`x-grid-${tick}`}>
                    <line
                      x1={x}
                      x2={x}
                      y1={curveTopPad}
                      y2={CHART_H - PAD_Y}
                      stroke="currentColor"
                      strokeWidth={CHART_GRID_STROKE_WIDTH}
                      className={CHART_GRID_STROKE_CLASS}
                    />
                    {!hideTickText ? (
                      <text
                        x={x}
                        y={CHART_H - PAD_Y + 1.8}
                        textAnchor="middle"
                        dominantBaseline="hanging"
                        className={CHART_TICK_FILL_CLASS}
                        fontSize={CHART_SVG_TICK_FONT_SIZE}
                        fontWeight={400}
                        data-scurve-x-tick=""
                      >
                        {tickText}
                      </text>
                    ) : null}
                  </g>
                )
              })}
              {Y_TICKS.map((tick) => {
                const y = yForProbability(tick, curveTopPad)
                const tickPercentile = Math.round(tick * 100)
                const tickText = formatSCurveYAxisPercentileTick(tick)
                const hideTickText = shouldHideOrdinaryYTickLabel({
                  tickY: y,
                  tickText,
                  padX: PAD_X,
                  customLabels: classicYLabels,
                  tickPercentile,
                })
                return (
                  <g key={`y-grid-${tick}`}>
                    <line
                      x1={PAD_X}
                      x2={chartW - PAD_X}
                      y1={y}
                      y2={y}
                      stroke="currentColor"
                      strokeWidth={CHART_GRID_STROKE_WIDTH}
                      className={CHART_GRID_STROKE_CLASS}
                    />
                    {!hideTickText ? (
                      <text
                        x={PAD_X - 1.5}
                        y={y}
                        textAnchor="end"
                        dominantBaseline="middle"
                        className={CHART_TICK_FILL_CLASS}
                        fontSize={CHART_SVG_TICK_FONT_SIZE}
                        fontWeight={400}
                        data-scurve-y-tick=""
                        data-scurve-y-tick-p={tickPercentile}
                      >
                        {tickText}
                      </text>
                    ) : null}
                  </g>
                )
              })}
              <path
                d={`M ${PAD_X} ${CHART_H - PAD_Y} H ${chartW - PAD_X}`}
                stroke="currentColor"
                strokeWidth={CHART_AXIS_STROKE_WIDTH}
                className={CHART_AXIS_STROKE_CLASS}
                fill="none"
              />
              <text
                x={AXIS_P_X}
                y={AXIS_P_Y}
                dominantBaseline="hanging"
                className={CHART_TICK_FILL_CLASS}
                fontSize={CHART_SVG_TICK_FONT_SIZE}
                fontWeight={400}
              >
                {t("charts.axisY")}
              </text>
              <text
                x={axisCX}
                y={AXIS_C_Y}
                textAnchor="end"
                dominantBaseline="auto"
                className={CHART_TICK_FILL_CLASS}
                fontSize={CHART_SVG_TICK_FONT_SIZE}
                fontWeight={400}
              >
                {t("charts.axisX")}
              </text>

              <g clipPath={`url(#${curveClipPathId})`}>
                {curves.map((c) => {
                  const isReference = c.emphasis === "reference"
                  return (
                    <g
                      key={c.id}
                      className="scurve-project-layer"
                      style={{
                        opacity: isReference ? 0.55 : projectLayerOpacity(c.id),
                      }}
                      data-scurve-curve={c.id}
                      data-scurve-emphasis={c.emphasis}
                    >
                      <path
                        d={toPath(c.points, axisMinX, axisMaxX, chartW, curveTopPad)}
                        fill="none"
                        stroke={isReference ? "var(--muted-foreground)" : `var(${c.colorVar})`}
                        strokeWidth={
                          isReference
                            ? CHART_PRIMARY_STROKE_WIDTH * 0.9
                            : CHART_PRIMARY_STROKE_WIDTH
                        }
                        strokeLinecap={SCURVE_CURVE_STROKE_LINECAP}
                        strokeLinejoin={SCURVE_CURVE_STROKE_LINEJOIN}
                        strokeDasharray={isReference ? "2.4 1.8" : undefined}
                      />
                    </g>
                  )
                })}
              </g>

              <g data-scurve-classic-guides="">
                {classicGuides.map((g) => (
                  <g
                    key={`classic-${g.projectId}-${g.percentile}`}
                    className="scurve-project-layer"
                    style={{ opacity: projectLayerOpacity(g.projectId) }}
                    data-scurve-classic-guide={`${g.projectId}-${g.percentile}`}
                  >
                    <line
                      x1={PAD_X}
                      x2={g.x}
                      y1={g.y}
                      y2={g.y}
                      stroke={`var(${g.colorVar})`}
                      strokeOpacity={chartPercentileGuideOpacity(g.percentile)}
                      strokeDasharray={g.dash}
                      strokeWidth={CHART_SECONDARY_STROKE_WIDTH}
                    />
                    <line
                      x1={g.x}
                      x2={g.x}
                      y1={g.y}
                      y2={REF_LINE_BOTTOM_Y}
                      stroke={`var(${g.colorVar})`}
                      strokeOpacity={chartPercentileGuideOpacity(g.percentile)}
                      strokeDasharray={g.dash}
                      strokeWidth={CHART_SECONDARY_STROKE_WIDTH}
                    />
                    <circle
                      cx={g.x}
                      cy={g.y}
                      r={0.9}
                      fill={`var(${g.colorVar})`}
                      fillOpacity={CHART_CLASSIC_MARKER_FILL_OPACITY}
                    />
                  </g>
                ))}
                {classicYLabels.map((label) => (
                  <text
                    key={`classic-y-${label.percentile}`}
                    x={classicYLabelX(PAD_X, label.lane)}
                    y={label.labelY}
                    textAnchor="end"
                    dominantBaseline="middle"
                    className={CHART_PRIMARY_ANNOTATION_FILL_CLASS}
                    fontSize={CHART_SVG_TICK_FONT_SIZE}
                    fontWeight={500}
                    letterSpacing="0.02em"
                    data-scurve-classic-y-label={label.percentile}
                    data-scurve-classic-y-lane={label.lane}
                  >
                    {label.text}
                  </text>
                ))}
                {classicXLabelRender.map((label) => (
                  <text
                    key={`classic-x-${label.key}`}
                    className="scurve-project-layer"
                    style={{ opacity: projectLayerOpacity(label.projectId) }}
                    x={label.x}
                    y={label.y}
                    textAnchor="middle"
                    dominantBaseline="hanging"
                    fill={`var(${label.colorVar})`}
                    fillOpacity={CHART_PRIMARY_ANNOTATION_FILL_OPACITY}
                    fontSize={label.fontSize}
                    fontWeight={500}
                    data-scurve-classic-x-label={label.key}
                    data-scurve-classic-x-row={label.row}
                  >
                    {label.text}
                  </text>
                ))}
              </g>

              {expanded && inspectionCost !== null && inspectionPlotX !== null && hoverRows ? (
                <g
                  data-scurve-hover-overlay=""
                  data-scurve-pinned={isPinned ? "true" : undefined}
                  pointerEvents="none"
                >
                  <line
                    data-scurve-crosshair=""
                    x1={inspectionPlotX}
                    x2={inspectionPlotX}
                    y1={curveTopPad}
                    y2={REF_LINE_BOTTOM_Y}
                    stroke="currentColor"
                    strokeWidth={SCURVE_HOVER_CROSSHAIR_STROKE_WIDTH}
                    className="text-foreground/28"
                  />
                  {hoverProjects.map((project, idx) => {
                    const row = hoverRows[idx]!
                    return (
                      <circle
                        key={`hover-marker-${project.id}`}
                        className="scurve-project-layer stroke-background"
                        style={{ opacity: projectLayerOpacity(project.id) }}
                        data-scurve-hover-marker={project.id}
                        cx={inspectionPlotX}
                        cy={plotYFromProbability(row.probability, curveTopPad)}
                        r={SCURVE_HOVER_MARKER_RADIUS}
                        fill={`var(${project.colorVar})`}
                        strokeWidth="0.35"
                      />
                    )
                  })}
                </g>
              ) : null}

              {expanded ? (
                <rect
                  ref={hoverCaptureRef}
                  data-scurve-hover-capture=""
                  x={PAD_X}
                  y={curveTopPad}
                  width={chartW - PAD_X * 2}
                  height={CHART_H - curveTopPad - PAD_Y}
                  fill="transparent"
                  style={{ touchAction: "none", cursor: "crosshair" }}
                  onPointerDown={handlePlotPointerDown}
                  onPointerMove={updateHoverFromPointer}
                  onPointerLeave={clearHover}
                  onPointerCancel={clearHover}
                />
              ) : null}
            </svg>
            {expanded && inspectionCost !== null && inspectionPlotX !== null && hoverRows ? (
              <div
                data-scurve-hover-tooltip=""
                data-scurve-pinned={isPinned ? "true" : undefined}
                role="status"
                className={cn(
                  "pointer-events-none absolute top-[10%] z-10 min-w-[7.5rem] max-w-[min(100%,16rem)] rounded-md border bg-background/95 px-2 py-1.5 text-[11px] shadow-sm",
                  isPinned ? "border-border" : "border-border/70",
                )}
                style={{
                  left: `${(inspectionPlotX / chartW) * 100}%`,
                  transform:
                    tooltipSide === "right" ? "translateX(10px)" : "translateX(calc(-100% - 10px))",
                }}
              >
                <div className="font-medium tabular-nums text-foreground">
                  {formatSCurveCost(inspectionCost, costDisplayScale, language)}
                </div>
                <div className="mt-1 space-y-0.5">
                  {hoverRows.map((row, idx) => (
                    <div
                      key={row.id}
                      className="flex items-baseline justify-between gap-3 text-muted-foreground"
                    >
                      <span className="inline-flex min-w-0 items-center gap-1.5">
                        <span
                          className="h-1.5 w-1.5 shrink-0 rounded-full"
                          style={{
                            backgroundColor: `var(${hoverProjects[idx]!.colorVar})`,
                          }}
                          aria-hidden
                        />
                        <span className="truncate">{row.label}</span>
                      </span>
                      <span className="shrink-0 tabular-nums text-foreground">
                        {row.percentileLabel}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </ChartExpandHost>
  )
}

function buildXTicks(minX: number, maxX: number, approxCount: number): number[] {
  const span = maxX - minX
  if (!Number.isFinite(span) || span <= 0) return [minX]

  const maxTicks = Math.max(7, approxCount)
  const minTicks = Math.min(5, Math.max(3, Math.floor(approxCount * 0.55)))
  const target = Math.min(maxTicks, Math.max(minTicks, approxCount))
  let step = niceStep(span / Math.max(1, target - 1))
  let ticks = ticksForStep(minX, maxX, step)

  for (let i = 0; i < 8; i++) {
    if (ticks.length > maxTicks) {
      step = nextNiceStep(step)
      ticks = ticksForStep(minX, maxX, step)
      continue
    }
    if (ticks.length < minTicks) {
      step = prevNiceStep(step)
      ticks = ticksForStep(minX, maxX, step)
      continue
    }
    break
  }

  return ticks
}

function niceStep(rawStep: number): number {
  const exp = Math.floor(Math.log10(Math.max(rawStep, Number.EPSILON)))
  const base = 10 ** exp
  const m = rawStep / base
  if (m <= 1) return 1 * base
  if (m <= 2) return 2 * base
  if (m <= 2.5) return 2.5 * base
  if (m <= 5) return 5 * base
  return 10 * base
}

function ticksForStep(minX: number, maxX: number, step: number): number[] {
  const start = Math.floor(minX / step) * step
  const end = Math.ceil(maxX / step) * step
  const ticks: number[] = []
  for (let x = start; x <= end + step * 0.5; x += step) {
    ticks.push(Number(x.toFixed(6)))
  }
  return ticks
}

function nextNiceStep(step: number): number {
  const exp = Math.floor(Math.log10(Math.max(step, Number.EPSILON)))
  const base = 10 ** exp
  const m = step / base
  if (m < 1.5) return 2 * base
  if (m < 2.25) return 2.5 * base
  if (m < 3.75) return 5 * base
  if (m < 7.5) return 10 * base
  return 20 * base
}

function prevNiceStep(step: number): number {
  const exp = Math.floor(Math.log10(Math.max(step, Number.EPSILON)))
  const base = 10 ** exp
  const m = step / base
  if (m > 7.5) return 5 * base
  if (m > 3.75) return 2.5 * base
  if (m > 2.25) return 2 * base
  if (m > 1.5) return 1 * base
  return 5 * 10 ** (exp - 1)
}

function yForProbability(probability: number, curveTopPad: number = DEFAULT_CURVE_TOP_PAD): number {
  const innerH = CHART_H - curveTopPad - CURVE_BOTTOM_PAD
  return CHART_H - CURVE_BOTTOM_PAD - probability * innerH
}

function toPath(
  points: readonly { x: number; y: number }[],
  minX: number,
  maxX: number,
  chartWidth: number,
  curveTopPad: number = DEFAULT_CURVE_TOP_PAD,
): string {
  if (points.length === 0) return ""
  const spanX = maxX - minX || 1
  const innerW = chartWidth - PAD_X * 2
  const innerH = CHART_H - curveTopPad - CURVE_BOTTOM_PAD

  const d: string[] = []
  for (let i = 0; i < points.length; i++) {
    const p = points[i]!
    const nx = (p.x - minX) / spanX
    const x = PAD_X + nx * innerW
    const y = CHART_H - CURVE_BOTTOM_PAD - p.y * innerH
    d.push(`${i === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`)
  }
  return d.join(" ")
}

function xForValue(value: number, minX: number, maxX: number, chartWidth: number): number {
  const spanX = maxX - minX || 1
  const innerW = chartWidth - PAD_X * 2
  const nx = (value - minX) / spanX
  return PAD_X + nx * innerW
}
