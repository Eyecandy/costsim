import { describe, expect, it } from "vitest"

import {
  PDF_A4_PAGE_SIZE,
  PDF_CHAPTER_IDS,
  PDF_KEY_FIGURES_MIN_FONT_SIZE,
  PDF_SECTION_IDS,
  buildPdfTocChapters,
  formatPdfCoverProjectContext,
  resolvePdfCoverLayout,
  splitPdfMetricValueParts,
} from "@/pdf/pdfCoverLayout"

describe("pdfCoverLayout", () => {
  it("exports explicit A4 page size for cover and body pages", () => {
    expect(PDF_A4_PAGE_SIZE.width).toBeCloseTo(595.28, 2)
    expect(PDF_A4_PAGE_SIZE.height).toBeCloseTo(841.89, 2)
  })

  it("formats compact cover project context", () => {
    expect(formatPdfCoverProjectContext(["A"], "no")).toBe("A")
    expect(formatPdfCoverProjectContext(["A", "B"], "no")).toBe("A · B")
    expect(formatPdfCoverProjectContext(["A", "B", "C"], "en")).toBe("A · B · C")
    expect(formatPdfCoverProjectContext(["A", "B", "C", "D"], "no")).toBe("4 alternativer")
  })

  it("always keeps one shared Key Figures table and TOC subsections", () => {
    for (const n of [1, 2, 3, 4]) {
      const layout = resolvePdfCoverLayout(n)
      expect(layout.showTocSubsections).toBe(true)
      expect(layout.metricFontSize).toBeGreaterThanOrEqual(PDF_KEY_FIGURES_MIN_FONT_SIZE)
    }
  })

  it("splits absolute and percent for stacked Key Figure cells", () => {
    expect(splitPdfMetricValueParts("1 241 338 295 (9,0 %)")).toEqual({
      absolute: "1 241 338 295",
      percent: "(9,0 %)",
    })
    expect(splitPdfMetricValueParts("1 241 338 295 (9 %)")).toEqual({
      absolute: "1 241 338 295",
      percent: "(9 %)",
    })
    expect(splitPdfMetricValueParts("420 000 000")).toEqual({
      absolute: "420 000 000",
      percent: null,
    })
  })

  it("TOC has fixed chapter/subsection structure independent of project count", () => {
    const chapters = buildPdfTocChapters({
      resultsLabel: "01 Resultater",
      sCurveLabel: "S-KURVE",
      uncertaintyLabel: "02 Usikkerhetsbilde",
      tornadoLabel: "TORNADO",
      contributionLabel: "Bidragsanalyse",
      assumptionsLabel: "03 Forutsetninger",
      analysisBasisLabel: "04 Analysegrunnlag",
      estimateUncertaintyLabel: "Estimatusikkerhet",
      driversLabel: "Usikkerhetsdrivere",
      modelRelationshipsLabel: "05 Modellforhold",
      impactLabel: "Påvirkning",
      correlationLabel: "Korrelasjon",
      methodLabel: "06 Om analysen",
    })
    expect(chapters).toHaveLength(6)
    expect(chapters[0]?.id).toBe(PDF_CHAPTER_IDS.results)
    expect(chapters[0]?.subsections?.map((s) => s.id)).toEqual([PDF_SECTION_IDS.sCurve])
    expect(chapters[1]?.subsections?.map((s) => s.label)).toEqual(["TORNADO", "Bidragsanalyse"])
    expect(chapters[2]?.id).toBe(PDF_CHAPTER_IDS.assumptions)
    expect(chapters[2]?.label).toBe("03 Forutsetninger")
    expect(chapters[2]?.subsections).toBeUndefined()
    expect(chapters[3]?.id).toBe(PDF_CHAPTER_IDS.analysisBasis)
    expect(chapters[3]?.subsections?.length).toBe(2)
    expect(chapters[4]?.subsections?.length).toBe(2)
    expect(chapters[5]?.id).toBe(PDF_CHAPTER_IDS.method)
    expect(chapters[5]?.subsections).toBeUndefined()
  })
})
