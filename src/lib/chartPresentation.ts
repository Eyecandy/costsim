/**
 * Shared chart presentation constants — visual hierarchy only.
 * Keep small; prefer existing CSS color tokens for theme colors.
 *
 * Intended prominence (S-curve):
 * 1) labels / values  2) distribution curve  3) P50/P85 guides  4) grid
 */

/** Primary analytical stroke — slim / elegant (matches prior display stroke). */
export const CHART_PRIMARY_STROKE_WIDTH = 1.25

/** Secondary / reference stroke (P50·P85 guides) — quieter than the curve. */
export const CHART_SECONDARY_STROKE_WIDTH = 0.55

/** Quiet plot grid — below guides and labels. */
export const CHART_GRID_STROKE_WIDTH = 0.4

/** Axis baseline (stronger than grid, quieter than curves). */
export const CHART_AXIS_STROKE_WIDTH = 0.5

/**
 * Classic P50/P85 guide stroke opacity.
 * Middle ground: clearly visible, not competing with labels or the curve.
 */
export const CHART_CLASSIC_GUIDE_STROKE_OPACITY = 0.45

/** Classic percentile marker fill opacity. */
export const CHART_CLASSIC_MARKER_FILL_OPACITY = 0.58

/** Classic cost-label fill opacity. */
export const CHART_PRIMARY_ANNOTATION_FILL_OPACITY = 0.95

/**
 * Opacity for percentile guides/markers.
 * Equal prominence for all levels — P50 is never weaker than P85.
 */
export function chartPercentileGuideOpacity(_percentile: number): number {
  return CHART_CLASSIC_GUIDE_STROKE_OPACITY
}

/** SVG tick / axis-letter size (user units) — readable at laptop size. */
export const CHART_SVG_TICK_FONT_SIZE = 3.45

/**
 * Highlighted y-axis percentiles (P50/P85/selected) — same size as ordinary
 * axis ticks (P25/P75). Emphasis comes from color / weight / guides, not size.
 */
export const CHART_SVG_ANNOTATION_FONT_SIZE = CHART_SVG_TICK_FONT_SIZE

/** SVG data labels attached to plotted cost values (Classic x-axis cost labels). */
export const CHART_SVG_DATA_LABEL_FONT_SIZE = 3.35

/** Tailwind fill class for ordinary ticks and compact axis letters. */
export const CHART_TICK_FILL_CLASS = "fill-muted-foreground/90"

/** Tailwind fill class for shared Classic Y percentile labels. */
export const CHART_PRIMARY_ANNOTATION_FILL_CLASS = "fill-foreground/80"

/** Tailwind stroke class for grid lines. */
export const CHART_GRID_STROKE_CLASS = "text-border/40"

/** Tailwind stroke class for the primary axis baseline. */
export const CHART_AXIS_STROKE_CLASS = "text-border/65"

/** HTML legend / supporting chart chrome (~11px family). */
export const CHART_HTML_LEGEND_TEXT_CLASS = "text-[11px] text-muted-foreground"
