import { SCURVE_ASPECT_RATIO } from "@/domain/results/sCurveDisplay"
import {
  PDF_SCURVE_LABEL_FONT,
  PDF_SCURVE_Y_TICKS,
  type PdfSCurveGeometry,
} from "@/pdf/pdfSCurveClassic"
import { createChartGeometry } from "@/pdf/shared/chartGeometry"

export const CHART_W = 520
export const CHART_H = Math.round(CHART_W / SCURVE_ASPECT_RATIO)
export const CHART_PAD_Y = 30
export const CHART_RIGHT_MARGIN = 14
export const CHART_LEFT_AXIS = 44
export const CHART_PLOT_LEFT = CHART_LEFT_AXIS
export const CHART_PLOT_RIGHT = CHART_W - CHART_RIGHT_MARGIN
export const CHART_INNER_W = CHART_PLOT_RIGHT - CHART_PLOT_LEFT
/** Classic S-curve has no top label band — small headroom only. */
export const CURVE_TOP_PAD = 28
export const CURVE_BOTTOM_PAD = CHART_PAD_Y
export const CHART_PLOT_TOP = CURVE_TOP_PAD
export const CHART_PLOT_BOTTOM = CHART_H - CURVE_BOTTOM_PAD
export const CHART_INNER_H = CHART_PLOT_BOTTOM - CHART_PLOT_TOP

export const { xForValue, yForProbability, pathFromPoints } = createChartGeometry({
  plotLeft: CHART_PLOT_LEFT,
  plotBottom: CHART_PLOT_BOTTOM,
  innerWidth: CHART_INNER_W,
  innerHeight: CHART_INNER_H,
})
export const CHART_GRID_STROKE = "#e8edf3"
export const CHART_GRID_WIDTH = 0.55
export const CHART_AXIS_TICK_FONT = 7
export const CHART_AXIS_TICK_FILL = "#7c8796"
export const CHART_AXIS_EMPHASIS_FILL = "#334155"
export const CHART_Y_PROB_TICKS = PDF_SCURVE_Y_TICKS
export const SCURVE_LABEL_FONT = PDF_SCURVE_LABEL_FONT
export const SCURVE_PDF_GEOMETRY: PdfSCurveGeometry = {
  plotLeft: CHART_PLOT_LEFT,
  plotRight: CHART_PLOT_RIGHT,
  plotTop: CHART_PLOT_TOP,
  plotBottom: CHART_PLOT_BOTTOM,
}
export const TORNADO_W = 520
export const TORNADO_LABEL_COL_W = Math.round(TORNADO_W * 0.33)
export const TORNADO_BAR_COL_X = TORNADO_LABEL_COL_W
export const TORNADO_BAR_PAD_X = 8
export const TORNADO_VALUE_LABEL_GUTTER = 34
export const TORNADO_BAR_START_X =
  TORNADO_BAR_COL_X + TORNADO_BAR_PAD_X + TORNADO_VALUE_LABEL_GUTTER
export const TORNADO_BAR_END_X = TORNADO_W - TORNADO_BAR_PAD_X - TORNADO_VALUE_LABEL_GUTTER
export const TORNADO_ZERO_X = (TORNADO_BAR_START_X + TORNADO_BAR_END_X) / 2
export const TORNADO_ROW_H = 16
export const TORNADO_BAR_H = 6
export const TORNADO_LABEL_X = 8
export const TORNADO_FONT_SIZE = 7
export const TORNADO_FACTOR_FONT_SIZE = 8
export const TORNADO_BAR_RADIUS = TORNADO_BAR_H / 2
export const TORNADO_VALUE_LABEL_GAP = 6
export const TORNADO_VALUE_LABEL_PAD = 3
export const TORNADO_P10_COLOR = "#7a9181"
export const TORNADO_P90_COLOR = "#7680ac"
