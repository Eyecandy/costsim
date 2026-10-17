import { describe, expect, it } from "vitest"
import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"

import { createProject, type Project } from "@/domain/analysis/project"
import { PRODUCT_NAME } from "@/lib/brand"
import { messages } from "@/i18n/messages"
import {
  PDF_CORRELATION_MATRIX_MAX_COST_ITEMS,
  buildPdfAssumptionTexts,
  buildPdfCorrelationSection,
  buildPdfCostItemBlocks,
  buildPdfDriverBlocks,
  buildPdfImpactOverrides,
  formatPdfAbsoluteAmount,
  formatPdfSignedPct,
  formatPdfSCurveMarkerValue,
  mapShapleyToPdfContribution,
  pdfCorrelationCellFill,
  resolvePdfAmountScale,
} from "@/pdf/buildPdfReportModel"
import { groupWaterfallContributors } from "@/domain/results/waterfallContributors"
import { repoRoot } from "@/test-utils/repoRoot"


function pdfDocSource() {
  return readFileSync(
    join(repoRoot, "src/pdf/ProjectReportDocument.tsx"),
    "utf8",
  )
}

function resultsPanelSource() {
  return readFileSync(join(repoRoot, "src/components/ResultsPanel.tsx"), "utf8")
}

function richProject(): Project {
  return {
    ...createProject({ id: "p1", name: "Campus A" }),
    assumptions: [
      { id: "a1", text: "Campus forblir i bruk under bygging" },
      { id: "a2", text: "Entreprenørmarkedet er stramt" },
    ],
    costRows: [
      {
        id: "c1",
        name: "Bygning",
        description: "Bygningsmessige arbeider",
        optimistic: "-10",
        likely: "95000000",
        pessimistic: "15",
      },
      {
        id: "c2",
        name: "Elektro",
        description: "",
        optimistic: "-12",
        likely: "20000000",
        pessimistic: "18",
      },
      {
        id: "c3",
        name: "Uteareal",
        description: "External works",
        optimistic: "-8",
        likely: "12000000",
        pessimistic: "22",
      },
    ],
    driverRows: [
      {
        id: "d1",
        name: "Marked",
        description: "Pris- og kapasitetsutvikling",
        optimistic: "-16",
        likely: "0",
        pessimistic: "16",
      },
      {
        id: "d2",
        name: "Prosjektutvikling",
        description: "Scope maturity",
        optimistic: "-5",
        likely: "0",
        pessimistic: "10",
      },
    ],
    driverImpacts: {
      d1: { c2: "30" },
      d2: { c3: "50" },
    },
    costCorrelations: {
      c1: { c2: "0.4", c3: "0" },
      c2: { c3: "-0.2" },
    },
  }
}

describe("buildPdfReportModel", () => {
  it("E: includes assumptions when present", () => {
    expect(buildPdfAssumptionTexts(richProject())).toEqual([
      "Campus forblir i bruk under bygging",
      "Entreprenørmarkedet er stramt",
    ])
    expect(buildPdfAssumptionTexts(createProject({ id: "x", name: "X" }))).toEqual(
      [],
    )
  })

  it("F/I: cost descriptions and P10/M/P90 from user inputs", () => {
    const items = buildPdfCostItemBlocks(richProject())
    expect(items[0]).toMatchObject({
      name: "Bygning",
      description: "Bygningsmessige arbeider",
      optimisticPct: -10,
      mostLikely: 95_000_000,
      pessimisticPct: 15,
    })
    expect(items[1]?.description).toBeNull()
  })

  it("G/H/J: driver description and P10/M/P90", () => {
    const drivers = buildPdfDriverBlocks(richProject())
    expect(drivers[0]).toMatchObject({
      name: "Marked",
      description: "Pris- og kapasitetsutvikling",
      optimisticPct: -16,
      mostLikely: 0,
      pessimisticPct: 16,
    })
    expect(drivers[0]).not.toHaveProperty("uncertaintyAssessment")
    expect(drivers[1]?.description).toBe("Scope maturity")
  })

  it("K/L: impact overrides only — no full 100% matrix", () => {
    const overrides = buildPdfImpactOverrides(richProject())
    expect(overrides).toEqual([
      { driverName: "Marked", costItemName: "Elektro", impactPct: 30 },
      {
        driverName: "Prosjektutvikling",
        costItemName: "Uteareal",
        impactPct: 50,
      },
    ])
    expect(overrides.every((o) => o.impactPct !== 100)).toBe(true)
  })

  it("correlation matrix includes all cost items; diagonal 1; zeros 0; symmetric", () => {
    const section = buildPdfCorrelationSection(richProject())
    expect(section.kind).toBe("matrix")
    if (section.kind === "matrix") {
      expect(section.names).toEqual(["Bygning", "Elektro", "Uteareal"])
      expect(section.cells).toHaveLength(3)
      expect(section.cells.every((row) => row.length === 3)).toBe(true)
      expect(section.cells[0]![0]).toBe(1)
      expect(section.cells[1]![1]).toBe(1)
      expect(section.cells[2]![2]).toBe(1)
      expect(section.cells[0]![1]).toBe(0.4)
      expect(section.cells[1]![0]).toBe(0.4)
      expect(section.cells[1]![2]).toBe(-0.2)
      expect(section.cells[2]![1]).toBe(-0.2)
      expect(section.cells[0]![2]).toBe(0)
      expect(section.cells[2]![0]).toBe(0)
    }
    const bare: Project = {
      ...createProject({ id: "b", name: "B" }),
      costRows: [
        {
          id: "x1",
          name: "A",
          optimistic: "-10",
          likely: "1000000",
          pessimistic: "10",
        },
        {
          id: "x2",
          name: "B",
          optimistic: "-10",
          likely: "2000000",
          pessimistic: "10",
        },
      ],
      costCorrelations: undefined,
    }
    expect(buildPdfCorrelationSection(bare).kind).toBe("none")
  })

  it("uses pair table when cost items exceed matrix threshold", () => {
    expect(PDF_CORRELATION_MATRIX_MAX_COST_ITEMS).toBe(20)
    const costs = Array.from({ length: 22 }, (_, i) => ({
      id: `c${i}`,
      name: `Cost ${i}`,
      optimistic: "-10",
      likely: String(1_000_000 * (i + 1)),
      pessimistic: "10",
    }))
    const corr: Record<string, Record<string, string>> = {}
    for (let i = 0; i < 21; i++) {
      corr[`c${i}`] = { [`c${i + 1}`]: "0.5" }
    }
    const project: Project = {
      ...createProject({ id: "big", name: "Big" }),
      costRows: costs,
      driverRows: [],
      costCorrelations: corr,
    }
    const section = buildPdfCorrelationSection(project)
    expect(section.kind).toBe("pairs")
  })

  it("14×14 matrix includes uncorrelated cost items with zeros", () => {
    const costs = Array.from({ length: 14 }, (_, i) => ({
      id: `c${i}`,
      name: `K${i + 1}`,
      optimistic: "-10",
      likely: String(1_000_000 * (i + 1)),
      pessimistic: "10",
    }))
    const corr: Record<string, Record<string, string>> = {}
    for (let i = 0; i < 9; i++) {
      corr[`c${i}`] = {}
      for (let j = i + 1; j < 9; j++) {
        corr[`c${i}`]![`c${j}`] = "0.5"
      }
    }
    const project: Project = {
      ...createProject({ id: "group", name: "Group" }),
      costRows: costs,
      driverRows: [],
      costCorrelations: corr,
    }
    const section = buildPdfCorrelationSection(project)
    expect(section.kind).toBe("matrix")
    if (section.kind === "matrix") {
      expect(section.names).toHaveLength(14)
      expect(section.cells).toHaveLength(14)
      expect(section.cells[0]![0]).toBe(1)
      expect(section.cells[13]![13]).toBe(1)
      expect(section.cells[0]![1]).toBe(0.5)
      expect(section.cells[1]![0]).toBe(0.5)
      expect(section.cells[0]![13]).toBe(0)
      expect(section.cells[13]![0]).toBe(0)
      expect(section.groupSummary?.rho).toBe(0.5)
      expect(section.groupSummary?.names).toHaveLength(9)
    }
  })

  it("maps |ρ| to restrained cell emphasis", () => {
    expect(pdfCorrelationCellFill(0)).toBeNull()
    expect(pdfCorrelationCellFill(0.02)).toBeNull()
    expect(pdfCorrelationCellFill(0.2)).toBeTruthy()
    expect(pdfCorrelationCellFill(0.6)).toBeTruthy()
    expect(pdfCorrelationCellFill(0.9)).toBeTruthy()
    expect(pdfCorrelationCellFill(1)).toBeTruthy()
    expect(pdfCorrelationCellFill(-0.8)).toBe(pdfCorrelationCellFill(0.8))
    const weak = pdfCorrelationCellFill(0.2)!
    const strong = pdfCorrelationCellFill(0.9)!
    expect(weak).not.toBe(strong)
  })

  it("formats mill. amounts for large costs", () => {
    expect(resolvePdfAmountScale([95_000_000])).toBe("mill")
    expect(formatPdfAbsoluteAmount(1_357_000_000, "no", "mill")).toMatch(/1.?357/)
    expect(formatPdfAbsoluteAmount(1_357_000_000, "no", "mill")).toContain("mill.")
  })

  it("D: contribution mapping only from provided Shapley result (no Top-N compact)", () => {
    const contributions = [
      { id: "1", name: "Bygning", contribution: 12, type: "cost" as const },
      { id: "2", name: "Marked", contribution: 5, type: "driver" as const },
      { id: "3", name: "A", contribution: 1, type: "cost" as const },
      { id: "4", name: "B", contribution: 1, type: "cost" as const },
      { id: "5", name: "C", contribution: 1, type: "cost" as const },
      { id: "6", name: "D", contribution: 1, type: "cost" as const },
      { id: "7", name: "E", contribution: 1, type: "cost" as const },
      { id: "8", name: "F", contribution: 0.5, type: "cost" as const },
    ]
    const mapped = mapShapleyToPdfContribution("Campus A", {
      baseCost: 100,
      estimatedP50: 122.5,
      contributions,
      expectedAdditionDecomposition: {
        startValue: 100,
        endValue: 122.5,
        contributions,
      },
      uncertaintyReserveDecomposition: {
        startValue: 122.5,
        endValue: 140,
        contributions: [
          { id: "1", name: "Bygning", contribution: 8, type: "cost" },
        ],
      },
    })
    expect(mapped.expectedAddition.contributions).toHaveLength(8)
    expect(mapped.expectedAddition.startValue).toBe(100)
    expect(mapped.expectedAddition.endValue).toBe(122.5)
    const grouped = groupWaterfallContributors(
      mapped.expectedAddition.contributions.map((c) => ({
        ...c,
        type: c.type ?? "cost",
      })),
      { otherLabel: "Øvrige", maxIndividual: 6 },
    )
    expect(grouped).toHaveLength(7)
    expect(grouped.at(-1)?.name).toBe("Øvrige")
  })

  it("formats signed percent for NO/EN", () => {
    expect(formatPdfSignedPct(-10, "no")).toContain("10")
    expect(formatPdfSignedPct(15, "en")).toMatch(/\+15/)
  })
})

describe("PDF document contracts", () => {
  it("chapter headings share majorSectionTitle typography (no sectionLabel special-case)", () => {
    expect(pdfDocSource()).toContain("styles.majorSectionTitle")
    expect(pdfDocSource()).toContain("ChapterTitle")
    expect(pdfDocSource()).toMatch(
      /majorSectionTitle:\s*\{[\s\S]*?fontSize:\s*12[\s\S]*?textTransform:\s*"uppercase"/,
    )
    expect(pdfDocSource()).not.toContain("styles.sectionLabel")
    expect(pdfDocSource()).not.toContain("styles.analysisMeta")
  })

  it("cover uses one shared Key Figures table; percent stacked below absolute", () => {
    expect(pdfDocSource()).toContain("CoverKeyFigures")
    expect(pdfDocSource()).toContain("splitPdfMetricValueParts")
    expect(pdfDocSource()).not.toContain("chunkProjectIndices")
    expect(pdfDocSource()).toContain("layout.metricPctFontSize")
  })

  it("cover TOC always includes fixed subsections", () => {
    expect(pdfDocSource()).toContain("sCurveLabel: sCurveTitle")
    expect(pdfDocSource()).toContain("tornadoLabel: tornadoTitle")
    expect(pdfDocSource()).toContain("contributionLabel: contributionTitle")
    expect(pdfDocSource()).not.toContain("includeSubsections:")
  })

  it("TOC is chapter-based with destinations and pageRefs", () => {
    expect(pdfDocSource()).toContain("buildPdfTocChapters")
    expect(pdfDocSource()).toContain("PDF_CHAPTER_IDS")
    expect(pdfDocSource()).toContain('src={`#${chapter.id}`}')
    expect(pdfDocSource()).toContain("pageRefs")
    expect(messages.no.results.pdfContentsTitle).toBe("Innhold")
    expect(messages.en.results.pdfContentsTitle).toBe("Contents")
  })

  it("Key Figure values use regular weight; percentage not de-emphasized", () => {
    expect(pdfDocSource()).toContain("styles.metricValue")
    expect(pdfDocSource()).toMatch(
      /metricValue:\s*\{[\s\S]*?fontWeight:\s*"normal"/,
    )
    expect(pdfDocSource()).not.toContain("metricValueMain")
    expect(pdfDocSource()).not.toContain("metricValuePct")
    expect(pdfDocSource()).not.toContain("splitMetricValueParts")
    // PDF metrics reuse Key Figures rows (space-before-% via formatKeyFigurePercent).
    expect(resultsPanelSource()).toContain("buildKeyFigureMetricTableRows")
  })

  it("Cost level header is present for NO/EN; columns use project names", () => {
    expect(messages.no.results.pdfMetricsColMetric).toBe("Kostnadsnivå")
    expect(messages.en.results.pdfMetricsColMetric).toBe("Cost level")
    expect(resultsPanelSource()).toContain("pdfMetricsColMetric")
    expect(resultsPanelSource()).toContain("projectNames={comparisonProjects.map")
    expect(resultsPanelSource()).toMatch(
      /metricColumns = comparisonProjects\.map\(\(project\) => \(\{\s*label: project\.name/,
    )
  })

  it("page-1 Monte Carlo intro sentence is removed from PDF path", () => {
    const pdfHandler = resultsPanelSource().slice(
      resultsPanelSource().indexOf("handleDownloadPdf"),
      resultsPanelSource().indexOf("handleCopyAiBriefPackage"),
    )
    expect(pdfHandler).not.toContain("pdfAnalysisMeta")
    expect(pdfHandler).not.toContain("analysisMetaLine")
    expect(pdfDocSource()).not.toContain("analysisMetaLine")
  })

  it("S-curve uses Classic L-guides (no Minimal top-band marker layout)", () => {
    const src = pdfDocSource()
    expect(src).not.toContain("layoutPdfSCurveMarkers")
    expect(src).not.toContain("pdfSCurveLabels")
    expect(src).not.toContain("GUIDE_LABEL_STEP")
    expect(src).toContain("buildPdfClassicGuides")
    expect(src).toContain("layoutPdfClassicYLabels")
    expect(src).toContain("layoutPdfClassicXCostLabels")
    expect(src).toContain("<Circle")
    expect(src).toContain("PDF_SCURVE_GUIDE_STROKE_WIDTH")
    expect(existsSync(join(repoRoot, "src/pdf/pdfSCurveLabels.ts"))).toBe(false)
  })

  it("Chapter 05 orders PÅVIRKNING then KORRELASJON; correlation once per project", () => {
    const src = pdfDocSource()
    const impactIdx = src.indexOf("PDF_SECTION_IDS.impact")
    const corrIdx = src.indexOf("PDF_SECTION_IDS.correlation")
    expect(impactIdx).toBeGreaterThan(0)
    expect(corrIdx).toBeGreaterThan(impactIdx)
    expect(src.split("<CorrelationBlock").length - 1).toBe(1)
    expect(src).not.toContain("Dedicated page(s) for full correlation")
    expect(src).toContain("impact-${pIdx}")
    expect(src).toContain("corr-${pIdx}")
  })

  it("dedicated assumptions chapter precedes analysis basis; not duplicated there", () => {
    const src = pdfDocSource()
    const assumptionsChapterIdx = src.indexOf("PDF_CHAPTER_IDS.assumptions")
    const analysisBasisIdx = src.indexOf("PDF_CHAPTER_IDS.analysisBasis")
    expect(assumptionsChapterIdx).toBeGreaterThan(0)
    expect(analysisBasisIdx).toBeGreaterThan(assumptionsChapterIdx)
    expect(src).toContain("assumptionsEmptyText")
    expect(src).toContain("assumptions-${pIdx}")
    // Analysis basis only renders cost/driver blocks — no nested assumptions section
    const basisSlice = src.slice(analysisBasisIdx, src.indexOf("PDF_CHAPTER_IDS.modelRelationships"))
    expect(basisSlice).not.toContain("project.assumptions")
    expect(basisSlice).toContain("estimateUncertaintyTitle")
    expect(basisSlice).toContain("driversTitle")
  })

  it("assumptions chapter uses saved order via buildPdfAssumptionTexts; empty state is explicit", () => {
    expect(buildPdfAssumptionTexts(richProject())).toEqual([
      "Campus forblir i bruk under bygging",
      "Entreprenørmarkedet er stramt",
    ])
    expect(messages.no.results.pdfAssumptionsTitle).toContain("Forutsetninger")
    expect(messages.no.results.pdfAssumptionsTitle).toMatch(/^03/)
    expect(messages.en.results.pdfAssumptionsTitle).toMatch(/^03/)
    expect(messages.no.results.pdfAssumptionsEmpty).toBe(
      "Ingen forutsetninger er definert.",
    )
    expect(messages.en.results.pdfAssumptionsEmpty).toBe(
      "No assumptions have been defined.",
    )
    expect(messages.no.results.pdfAnalysisBasisTitle).toMatch(/^04/)
    expect(messages.no.results.pdfModelRelationshipsTitle).toMatch(/^05/)
    expect(messages.no.results.pdfMethodTitle).toMatch(/^06/)
    expect(resultsPanelSource()).toContain("pdfAssumptionsEmpty")
    expect(resultsPanelSource()).toContain("assumptionsEmptyText")
  })

  it("all pages share explicit A4 dimensions (cover does not shrink)", () => {
    expect(pdfDocSource()).toContain("size={PDF_A4_PAGE_SIZE}")
    expect(pdfDocSource()).not.toMatch(/size=\"A4\"/)
    // Cover uses wrap so MediaBox stays full A4; content is unbreakable
    expect(pdfDocSource()).toMatch(
      /Cover[\s\S]*?<Page size=\{PDF_A4_PAGE_SIZE\} wrap/,
    )
    expect(pdfDocSource()).toContain(
      "Inner wrap={false} keeps the cover block together",
    )
    const pageOpens = pdfDocSource().split("<Page size={PDF_A4_PAGE_SIZE}").length - 1
    expect(pageOpens).toBeGreaterThanOrEqual(4)
  })

  it("A: first page includes key metrics title prop usage", () => {
    expect(pdfDocSource()).toContain("metricsTitle")
    expect(pdfDocSource()).toContain("Page size={PDF_A4_PAGE_SIZE}")
    expect(resultsPanelSource()).toContain("keyMetrics.baseCost")
    expect(resultsPanelSource()).toContain("keyMetrics.p50")
    expect(resultsPanelSource()).toContain("keyMetrics.p85")
  })

  it("B: S-curve uses computeSCurveDisplaySeries and configured percentiles", () => {
    expect(pdfDocSource()).toContain("computeSCurveDisplaySeries")
    expect(pdfDocSource()).toContain("sCurveMarkerPercentiles")
    expect(pdfDocSource()).toContain("markerLevels.flatMap")
    expect(pdfDocSource()).toContain("percentile(series.values, p)")
  })

  it("C: ResultsPanel wires deterministic tornado rows into PDF", () => {
    expect(resultsPanelSource()).toContain("tornadoRowsByProjectId")
    expect(resultsPanelSource()).toContain("computeDeterministicTornadoRows")
    expect(resultsPanelSource()).not.toContain("monteCarloConditionalTornado")
  })

  it("D: contribution only from cached/archived Shapley — no requestCalculation in PDF path", () => {
    const pdfHandler = resultsPanelSource().slice(
      resultsPanelSource().indexOf("handleDownloadPdf"),
      resultsPanelSource().indexOf("handleCopyAiBriefPackage"),
    )
    // Archive-aware getter; must not kick off live Shapley during export.
    expect(pdfHandler).toContain("getShapleyResult(project.id)")
    expect(pdfHandler).not.toContain("requestCalculation")
    expect(pdfHandler).toContain("mapShapleyToPdfContribution")
  })

  it("contribution PDF uses shared waterfall grouping/layout helpers", () => {
    expect(pdfDocSource()).toContain("PdfWaterfallChart")
    const shared = readFileSync(
      join(repoRoot, "src/pdf/pdfWaterfallChart.tsx"),
      "utf8",
    )
    expect(shared).toContain("groupWaterfallContributors")
    expect(shared).toContain("buildWaterfallChartLayout")
    expect(shared).toContain("DEFAULT_WATERFALL_TOP_N")
    expect(shared).toContain('valueFormat = "chart"')
  })

  it("P: method section strings reflect current model semantics", () => {
    expect(messages.no.results.pdfMethodParagraph1).toContain("Monte Carlo")
    expect(messages.no.results.pdfMethodParagraph1).toContain("P10")
    expect(messages.no.results.pdfMethodParagraph1).toContain("{distributions}")
    expect(messages.en.results.pdfMethodParagraph1).toContain("{distributions}")
    expect(messages.no.results.pdfMethodParagraph2).toMatch(/multiplikativt/i)
    expect(messages.en.results.pdfMethodParagraph2).toMatch(/Gaussian copula/i)
    expect(messages.no.results.pdfMethodParagraph3).toMatch(/Tornado/i)
  })

  it("Q: share link uses buildShareUrl (canonical v3 builder)", () => {
    const pdfHandler = resultsPanelSource().slice(
      resultsPanelSource().indexOf("handleDownloadPdf"),
      resultsPanelSource().indexOf("handleCopyAiBriefPackage"),
    )
    expect(pdfHandler).toContain("buildShareUrl")
    expect(pdfHandler).toContain('pdfShareLinkAnchorText')
  })

  it("share link uses product brand placeholder; raw URL stays hidden", () => {
    expect(messages.no.results.pdfShareLinkAnchorText).toBe(
      `Åpne analysen i ${PRODUCT_NAME}`,
    )
    expect(messages.en.results.pdfShareLinkAnchorText).toBe(
      `Open analysis in ${PRODUCT_NAME}`,
    )
    expect(messages.no.results.pdfBrandName).toBe(PRODUCT_NAME)
    expect(pdfDocSource()).toContain("styles.openLink")
    expect(pdfDocSource()).toMatch(/openLink:\s*\{[\s\S]*?fontSize:\s*8/)
    expect(pdfDocSource()).toMatch(/sectionTitle:\s*\{[\s\S]*?fontSize:\s*9\.5/)
    expect(pdfDocSource()).not.toContain("styles.openUrl")
    expect(pdfDocSource()).not.toMatch(
      /<Text[^>\n]*>\s*\{shareLinkAppendix\.url\}\s*<\/Text>/,
    )
  })

  it("R: oversized share does not embed broken URL", () => {
    const pdfHandler = resultsPanelSource().slice(
      resultsPanelSource().indexOf("handleDownloadPdf"),
      resultsPanelSource().indexOf("handleCopyAiBriefPackage"),
    )
    expect(pdfHandler).toContain('built.reason === "oversized"')
    expect(pdfHandler).toContain("shareUnavailableNote")
    expect(pdfHandler).not.toContain("built.url.slice")
  })

  it("S: NO/EN PDF copy exists for analysis basis sections", () => {
    for (const lang of ["no", "en"] as const) {
      const r = messages[lang].results
      expect(r.pdfAssumptionsTitle.length).toBeGreaterThan(0)
      expect(r.pdfAssumptionsEmpty.length).toBeGreaterThan(0)
      expect(r.pdfAnalysisBasisTitle.length).toBeGreaterThan(0)
      expect(r.pdfEstimateUncertaintyTitle.length).toBeGreaterThan(0)
      expect(r.pdfDriversTitle.length).toBeGreaterThan(0)
      expect(r.pdfOpenAnalysisTitle.length).toBeGreaterThan(0)
      expect(r.pdfTornadoExplanation.length).toBeGreaterThan(20)
      expect(r.pdfModelRelationshipsTitle.length).toBeGreaterThan(0)
    }
    expect(messages.no.results.pdfAnalysisBasisTitle).toContain("Analysegrunnlag")
    expect(messages.en.results.pdfAnalysisBasisTitle).toContain("Analysis basis")
  })

  it("T: multi-project grouping uses project headings in analysis basis", () => {
    expect(pdfDocSource()).toContain("multiProject")
    expect(pdfDocSource()).toContain("projectHeading")
  })

  it("correlation matrix uses cell emphasis helper", () => {
    expect(pdfDocSource()).toContain("pdfCorrelationCellFill")
    expect(pdfDocSource()).toContain("wrap={false}")
  })

  it("does not include a QR dependency", () => {
    expect(pdfDocSource()).not.toMatch(/qrcode|QRCode/i)
    const pkg = readFileSync(join(repoRoot, "package.json"), "utf8")
    expect(pkg).not.toMatch(/qrcode/i)
  })

  it("uses Noto Sans for Norwegian glyph support", () => {
    expect(pdfDocSource()).toContain('fontFamily: "NotoSans"')
    const fontsSrc = readFileSync(
      join(repoRoot, "src/pdf/pdfFonts.ts"),
      "utf8",
    )
    expect(fontsSrc).toContain("ensurePdfFonts")
    expect(fontsSrc).toContain("NotoSans-Regular.ttf")
    expect(resultsPanelSource()).toContain("ensurePdfFonts")
  })

  it("layouts P10/M/P90 as a percentile triplet", () => {
    expect(pdfDocSource()).toContain("PercentileTriplet")
    expect(pdfDocSource()).toContain("percentileRow")
    expect(pdfDocSource()).toContain("mostLikelyLabel")
  })

  it("labels driver definitions explicitly", () => {
    expect(pdfDocSource()).toContain("definitionLabel")
    expect(messages.no.results.pdfDefinitionLabel).toBe("Definisjon")
    expect(messages.en.results.pdfDefinitionLabel).toBe("Definition")
  })

  it("S-curve Classic cost labels use the shared chart-level cost scale", () => {
    const src = pdfDocSource()
    expect(src).toContain("resolvePdfSCurveCostScale(minX, maxX)")
    expect(src).toContain("formatPdfSCurveCost(xv, costScale, language)")
    expect(src).not.toContain("formatPdfSCurveMarkerValue")
    expect(src).not.toContain("formatAxisCost")
    // P-notation Y ticks and unique emphasized percentile labels.
    expect(src).toContain("layoutPdfClassicOrdinaryYTicks")
    expect(src).toContain("uniquePdfMarkerPercentiles(curves)")
    expect(src).not.toContain("Math.round(p * 100)}%")
    // Classic does not need the Minimal top label band.
    expect(src).toMatch(/const CURVE_TOP_PAD = (2[4-9]|3[0-2])\b/)
    // formatPdfSCurveMarkerValue remains a model-level fallback helper.
    expect(formatPdfSCurveMarkerValue(1_250_000, "en")).toMatch(/1/)
    expect(formatPdfSCurveMarkerValue(1_250_000, "no")).toMatch(/1/)
  })

  it("Ongoing PDF S-curve also uses Classic semantics", () => {
    const src = readFileSync(
      join(repoRoot, "src/pdf/ongoing/ongoingPdfCharts.tsx"),
      "utf8",
    )
    expect(src).not.toContain("layoutPdfSCurveMarkers")
    expect(src).toContain("buildPdfClassicGuides")
    expect(src).toContain("resolvePdfSCurveCostScale(minX, maxX)")
    expect(src).toContain("layoutPdfClassicYLabels")
    expect(src).toMatch(/const CURVE_TOP_PAD = (2[4-9]|3[0-2])\b/)
  })
})
