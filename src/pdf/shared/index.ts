/**
 * Shared PDF primitives — typography, page size, number formatting.
 * Single and Ongoing report composition stay in their own layers.
 */
export { ensurePdfFonts } from "@/pdf/pdfFonts"
export {
  PDF_A4_PAGE_SIZE,
  PDF_KEY_FIGURES_DEFAULT_FONT_SIZE,
  PDF_KEY_FIGURES_MIN_FONT_SIZE,
} from "@/pdf/pdfCoverLayout"
export {
  formatPdfAbsoluteAmount,
  formatPdfSignedPct,
  resolvePdfAmountScale,
  type PdfAmountScale,
} from "@/pdf/buildPdfReportModel"
