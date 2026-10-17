/**
 * Pure cover-page layout helpers for the PDF executive-summary page.
 * Documented thresholds keep the cover on exactly one A4 page.
 */
import type { AppLanguage } from "@/lib/formatNumber"

/**
 * A4 portrait in PDF user points (1/72").
 * Used for the cover and every subsequent page so MediaBox dimensions match.
 */
export const PDF_A4_PAGE_SIZE = { width: 595.28, height: 841.89 } as const

/** Destinations used by TOC links and chapter headings. */
export const PDF_CHAPTER_IDS = {
  results: "pdf-chapter-results",
  uncertainty: "pdf-chapter-uncertainty",
  assumptions: "pdf-chapter-assumptions",
  analysisBasis: "pdf-chapter-analysis-basis",
  modelRelationships: "pdf-chapter-model-relationships",
  method: "pdf-chapter-method",
} as const

export const PDF_SECTION_IDS = {
  sCurve: "pdf-section-s-curve",
  tornado: "pdf-section-tornado",
  contribution: "pdf-section-contribution",
  estimateUncertainty: "pdf-section-estimate-uncertainty",
  drivers: "pdf-section-drivers",
  impact: "pdf-section-impact",
  correlation: "pdf-section-correlation",
} as const

/**
 * Minimum body font size for Key Figures values/headers on the cover.
 * Documented floor — do not go below this for readability.
 */
export const PDF_KEY_FIGURES_MIN_FONT_SIZE = 7

/** Default Key Figures font size when space allows. */
export const PDF_KEY_FIGURES_DEFAULT_FONT_SIZE = 9

export type PdfKeyFiguresDensity = "comfortable" | "compact" | "dense"

export type PdfCoverLayout = {
  projectCount: number
  density: PdfKeyFiguresDensity
  metricFontSize: number
  metricPctFontSize: number
  metricNameColWidth: number
  cellPaddingVertical: number
  cellPaddingHorizontal: number
  allowHeaderWrap: boolean
  /** Subsections are always shown on the cover TOC. */
  showTocSubsections: true
  tocRowGap: number
  tocTopMargin: number
}

/**
 * Resolve adaptive cover density from project count.
 * Always one shared Key Figures table (no stacked groups).
 * Always keep TOC subsections visible.
 */
export function resolvePdfCoverLayout(projectCount: number): PdfCoverLayout {
  const n = Math.max(projectCount, 1)

  if (n <= 1) {
    return {
      projectCount: n,
      density: "comfortable",
      metricFontSize: PDF_KEY_FIGURES_DEFAULT_FONT_SIZE,
      metricPctFontSize: 8,
      metricNameColWidth: 140,
      cellPaddingVertical: 5,
      cellPaddingHorizontal: 6,
      allowHeaderWrap: false,
      showTocSubsections: true,
      tocRowGap: 3.5,
      tocTopMargin: 12,
    }
  }

  if (n === 2) {
    return {
      projectCount: n,
      density: "comfortable",
      metricFontSize: PDF_KEY_FIGURES_DEFAULT_FONT_SIZE,
      metricPctFontSize: 8,
      metricNameColWidth: 110,
      cellPaddingVertical: 4,
      cellPaddingHorizontal: 4,
      allowHeaderWrap: true,
      showTocSubsections: true,
      tocRowGap: 3,
      tocTopMargin: 10,
    }
  }

  if (n === 3) {
    return {
      projectCount: n,
      density: "compact",
      metricFontSize: 8,
      metricPctFontSize: 7,
      metricNameColWidth: 92,
      cellPaddingVertical: 3.5,
      cellPaddingHorizontal: 3,
      allowHeaderWrap: true,
      showTocSubsections: true,
      tocRowGap: 2.5,
      tocTopMargin: 8,
    }
  }

  // 4+ — still one shared table; tighter columns; TOC subsections remain
  return {
    projectCount: n,
    density: "dense",
    metricFontSize: PDF_KEY_FIGURES_MIN_FONT_SIZE,
    metricPctFontSize: 6.5,
    metricNameColWidth: 84,
    cellPaddingVertical: 3,
    cellPaddingHorizontal: 2,
    allowHeaderWrap: true,
    showTocSubsections: true,
    tocRowGap: 2,
    tocTopMargin: 6,
  }
}

/** Compact cover context line — does not grow vertically with project count. */
export function formatPdfCoverProjectContext(
  projectNames: readonly string[],
  language: AppLanguage,
): string {
  const names = projectNames.map((n) => n.trim()).filter(Boolean)
  if (names.length === 0) return ""
  if (names.length === 1) return names[0]!
  if (names.length <= 3) return names.join(" · ")
  if (language === "en") return `${names.length} alternatives`
  return `${names.length} alternativer`
}

/**
 * Split Key Figure cell text into absolute + optional trailing percent.
 * Percent is rendered on the line below in the cover table.
 */
export function splitPdfMetricValueParts(value: string): {
  absolute: string
  percent: string | null
} {
  const match = value.match(/^(.*?)(\s*\([^()]*%[^()]*\))\s*$/)
  if (!match) return { absolute: value, percent: null }
  return {
    absolute: (match[1] ?? value).trim(),
    percent: (match[2] ?? "").trim() || null,
  }
}

export type PdfTocChapter = {
  id: string
  label: string
  subsections?: Array<{ id: string; label: string }>
}

/** Chapter-based TOC with fixed subsection structure (project-count independent). */
export function buildPdfTocChapters(args: {
  resultsLabel: string
  sCurveLabel: string
  uncertaintyLabel: string
  tornadoLabel: string
  contributionLabel: string
  assumptionsLabel: string
  analysisBasisLabel: string
  estimateUncertaintyLabel: string
  driversLabel: string
  modelRelationshipsLabel: string
  impactLabel: string
  correlationLabel: string
  methodLabel: string
}): PdfTocChapter[] {
  return [
    {
      id: PDF_CHAPTER_IDS.results,
      label: args.resultsLabel,
      subsections: [{ id: PDF_SECTION_IDS.sCurve, label: args.sCurveLabel }],
    },
    {
      id: PDF_CHAPTER_IDS.uncertainty,
      label: args.uncertaintyLabel,
      subsections: [
        { id: PDF_SECTION_IDS.tornado, label: args.tornadoLabel },
        { id: PDF_SECTION_IDS.contribution, label: args.contributionLabel },
      ],
    },
    {
      id: PDF_CHAPTER_IDS.assumptions,
      label: args.assumptionsLabel,
    },
    {
      id: PDF_CHAPTER_IDS.analysisBasis,
      label: args.analysisBasisLabel,
      subsections: [
        {
          id: PDF_SECTION_IDS.estimateUncertainty,
          label: args.estimateUncertaintyLabel,
        },
        { id: PDF_SECTION_IDS.drivers, label: args.driversLabel },
      ],
    },
    {
      id: PDF_CHAPTER_IDS.modelRelationships,
      label: args.modelRelationshipsLabel,
      subsections: [
        { id: PDF_SECTION_IDS.impact, label: args.impactLabel },
        { id: PDF_SECTION_IDS.correlation, label: args.correlationLabel },
      ],
    },
    { id: PDF_CHAPTER_IDS.method, label: args.methodLabel },
  ]
}
