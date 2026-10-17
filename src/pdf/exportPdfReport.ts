/**
 * Mode-aware PDF export router.
 *
 * Single and Ongoing each own their report model + document composition.
 * Shared transport (fonts, blob download) stays common at the call site.
 */

import type { AnalysisMode } from "@/domain/analysis/analysisDocument"
import { buildOngoingPdfReportModel } from "@/pdf/ongoing/buildOngoingPdfReportModel"
import type { BuildOngoingPdfReportModelInput } from "@/pdf/ongoing/buildOngoingPdfReportModel"
import type { BuildOngoingPdfReportModelResult } from "@/pdf/ongoing/ongoingPdfTypes"

export type PdfReportExportMode = AnalysisMode

/**
 * Dispatch Ongoing report-model build.
 * Single continues to assemble props for ProjectReportDocument at the call site
 * (unchanged) — this router exists so Ongoing never folds into Single conditionals.
 */
export function buildPdfReportModelForMode(
  mode: PdfReportExportMode,
  ongoingInput: BuildOngoingPdfReportModelInput,
):
  | { mode: "ongoing"; result: BuildOngoingPdfReportModelResult }
  | { mode: "single" } {
  if (mode === "ongoing") {
    return {
      mode: "ongoing",
      result: buildOngoingPdfReportModel(ongoingInput),
    }
  }
  return { mode: "single" }
}

export { buildOngoingPdfReportModel }
export type { BuildOngoingPdfReportModelInput, BuildOngoingPdfReportModelResult }
