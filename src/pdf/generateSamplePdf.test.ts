/**
 * Generates representative cover/layout PDFs for manual visual QA.
 * Run: npx vitest run src/pdf/generateSamplePdf.test.ts
 */
import { createElement, type ComponentProps } from "react"
import { mkdirSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"
import { pdf } from "@react-pdf/renderer"

import { createProject, type Project } from "@/lib/project"
import { PRODUCT_NAME } from "@/lib/brand"
import { appFeatures } from "@/config/appVariant"
import { ProjectReportDocument } from "@/pdf/ProjectReportDocument"
import {
  buildPdfAssumptionTexts,
  buildPdfCorrelationSection,
  buildPdfCostItemBlocks,
  buildPdfDriverBlocks,
  buildPdfImpactOverrides,
} from "@/pdf/buildPdfReportModel"
import { ensurePdfFonts } from "@/pdf/pdfFonts"
import { computeDeterministicTornadoRows } from "@/lib/deterministicTornado"
import { getProjectColorHex } from "@/lib/projectColors"
import {
  PDF_A4_PAGE_SIZE,
  PDF_CHAPTER_IDS,
  formatPdfCoverProjectContext,
  resolvePdfCoverLayout,
} from "@/pdf/pdfCoverLayout"

const __dirname = dirname(fileURLToPath(import.meta.url))
const outDir = join(__dirname, "../../tmp/pdf-review")

function makeProject(
  id: string,
  name: string,
  opts: {
    withCorr?: boolean
    costCount?: number
    assumptions?: Array<{ id: string; text: string }>
  } = {},
): Project {
  const n = opts.costCount ?? 6
  const costRows = Array.from({ length: n }, (_, i) => ({
    id: `${id}-c${i}`,
    name: `K${i + 1}`,
    optimistic: "-10",
    likely: String(15_000_000 * (i + 1)),
    pessimistic: "15",
  }))
  const driverRows = [
    {
      id: `${id}-d0`,
      name: "Marked",
      optimistic: "-12",
      likely: "0",
      pessimistic: "18",
    },
  ]
  let costCorrelations: Record<string, Record<string, string>> | undefined
  if (opts.withCorr) {
    costCorrelations = {}
    const limit = Math.min(4, n)
    for (let i = 0; i < limit; i++) {
      costCorrelations[`${id}-c${i}`] = {}
      for (let j = i + 1; j < limit; j++) {
        costCorrelations[`${id}-c${i}`]![`${id}-c${j}`] = "0.4"
      }
    }
  }
  return {
    ...createProject({ id, name }),
    costRows,
    driverRows,
    driverImpacts: { [`${id}-d0`]: { [`${id}-c0`]: "40" } },
    costCorrelations,
    ...(opts.assumptions ? { assumptions: opts.assumptions } : {}),
  }
}

function seriesAround(center: number, n = 1200): number[] {
  return Array.from({ length: n }, (_, i) => center + (i - n / 2) * 20_000)
}

type DocProps = ComponentProps<typeof ProjectReportDocument>

function baseDocProps(
  projects: Project[],
  overrides: Partial<DocProps> = {},
): DocProps {
  const columns = projects.map((p) => ({ label: p.name }))
  const rows = [
    {
      label: "Basiskostnad",
      values: projects.map((_, i) => String(400_000_000 + i * 100_000_000)),
    },
    {
      label: "Forventet tillegg",
      values: projects.map(() => "28 000 000 (7 %)"),
    },
    {
      label: "P50",
      values: projects.map((_, i) => String(428_000_000 + i * 100_000_000)),
    },
    {
      label: "Usikkerhetsavsetning",
      values: projects.map(() => "40 000 000 (9 %)"),
    },
    {
      label: "P85",
      values: projects.map((_, i) => String(468_000_000 + i * 100_000_000)),
    },
  ]

  return {
    brandName: PRODUCT_NAME,
    title: "Usikkerhetsanalyse",
    projectNames: projects.map((p) => p.name),
    generatedAtLabel: "Generert: 07.09.2026",
    contentsTitle: "Innhold",
    resultsSectionLabel: "01  Resultater",
    metricsTitle: "NØKKELTALL",
    metricColumnLabel: "Kostnadsnivå",
    columns,
    rows,
    sCurveTitle: "S-KURVE",
    sCurveFootnote:
      "S-kurven viser fordelingen av totale kostnader. P50 og P85 er markert.",
    sCurveSeries: projects.map((project, idx) => ({
      id: project.id,
      label: project.name,
      values: seriesAround(450_000_000 + idx * 80_000_000),
      color: getProjectColorHex(idx),
    })),
    uncertaintyPictureTitle: "02  Usikkerhetsbilde",
    tornadoTitle: "TORNADO",
    tornadoExplanation:
      "Viser den isolerte effekten av hver kostnadspost og driver fra P10 til P90, mens øvrige faktorer holdes på mest sannsynlig verdi.",
    tornadoProjects: projects.map((project) => ({
      projectName: project.name,
      rows: computeDeterministicTornadoRows(project, 4).map((r) => ({
        name: r.name,
        lowImpact: r.lowImpact,
        highImpact: r.highImpact,
      })),
    })),
    contributionTitle: "Bidragsanalyse",
    contributionExpectedLabel: "Bidrag til forventet tillegg",
    contributionReserveLabel: "Bidrag til usikkerhetsavsetning",
    contributionBaseCostLabel: "Basiskostnad",
    contributionP50Label: "P50",
    contributionP85Label: "P85",
    contributionOtherLabel: "Øvrige",
    contributionBlocks: [],
    assumptionsTitle: "03  Forutsetninger",
    assumptionsEmptyText: "Ingen forutsetninger er definert.",
    analysisBasisTitle: "04  Analysegrunnlag",
    estimateUncertaintyTitle: "Estimatusikkerhet",
    driversTitle: "Usikkerhetsdrivere",
    modelRelationshipsTitle: "05  Modellforhold",
    impactTitle: "Påvirkning",
    impactDefaultNote:
      "Drivere påvirker som standard alle aktuelle kostnadsposter 100 %. Avvik er vist nedenfor.",
    impactNoOverrides:
      "Ingen justeringer i driverpåvirkning. Alle drivere bruker standard påvirkning på 100 %.",
    impactColDriver: "Driver",
    impactColCost: "Kostnadspost",
    impactColPct: "Påvirkning",
    correlationTitle: "Korrelasjon",
    correlationNone: "Det er ikke lagt inn korrelasjon mellom kostnadspostene.",
    correlationUnlistedNote:
      "Ikke oppførte sammenhenger behandles som ukorrelerte.",
    correlationColA: "Kostnadspost A",
    correlationColB: "Kostnadspost B",
    correlationColRho: "ρ",
    projectsBasis: projects.map((project) => ({
      projectName: project.name,
      assumptions: buildPdfAssumptionTexts(project),
      costItems: buildPdfCostItemBlocks(project),
      drivers: buildPdfDriverBlocks(project),
      impactOverrides: buildPdfImpactOverrides(project),
      correlation: buildPdfCorrelationSection(project),
    })),
    methodTitle: "06  Om analysen",
    definitionLabel: "Definisjon",
    mostLikelyLabel: "Mest sannsynlig",
    methodParagraphs: [
      "Resultatene er basert på Monte Carlo-simulering med 20 000 kjøringer.",
      "Usikkerhetsdrivere anvendes multiplikativt på aktuelle kostnadsposter.",
      "Tornadodiagrammet viser den isolerte effekten av hver faktor.",
    ],
    openAnalysisTitle: "Åpne analysen",
    openAnalysisHelper:
      "Åpner analysegrunnlaget i nettleseren med samme kostnadsposter og drivere.",
    shareLinkAppendix: {
      url: "https://example.com/?s=v3-sample",
      linkLabel: `Åpne analysen i ${PRODUCT_NAME}`,
    },
    footerText: `Generert av ${PRODUCT_NAME}`,
    language: "no",
    ...overrides,
  }
}

function countPdfPages(buffer: Buffer): number {
  const matches = buffer.toString("latin1").match(/\/Type\s*\/Page[^s]/g)
  return matches?.length ?? 0
}

function mediaBoxes(buffer: Buffer): string[] {
  return [
    ...buffer
      .toString("latin1")
      .matchAll(/\/MediaBox\s*\[\s*([^\]]+)\]/g),
  ].map((m) => m[1]!.trim().replace(/\s+/g, " "))
}

function assertUniformA4(buffer: Buffer) {
  const boxes = mediaBoxes(buffer)
  expect(boxes.length).toBeGreaterThanOrEqual(2)
  const unique = new Set(boxes)
  expect(unique.size).toBe(1)
  const box = boxes[0]!
  // A4 portrait ≈ 595.28 × 841.89 (allow integer rounding)
  expect(box).toMatch(/0(\.0+)? 0(\.0+)? 595(\.\d+)? 841(\.\d+)?/)
  // Documented constant used by the renderer
  expect(PDF_A4_PAGE_SIZE.width).toBeCloseTo(595.28, 1)
  expect(PDF_A4_PAGE_SIZE.height).toBeCloseTo(841.89, 1)
}

async function writeCase(name: string, projects: Project[]) {
  await ensurePdfFonts()
  const blob = await pdf(
    createElement(ProjectReportDocument, baseDocProps(projects)),
  ).toBlob()
  mkdirSync(outDir, { recursive: true })
  const outPath = join(outDir, name)
  const buffer = Buffer.from(await blob.arrayBuffer())
  writeFileSync(outPath, buffer)
  return buffer
}

const sampleAssumptionsA = [
  {
    id: "a1",
    text: "Universitetet skal være i drift under gjennomføring",
  },
  { id: "a2", text: "Prisnivå per Q2 2026" },
  { id: "a3", text: "Eksisterende tekniske føringer beholdes" },
]

describe("sample PDF generation — cover layout + assumptions chapter", () => {
  it("CASE A: one project with assumptions", async () => {
    const projects = [
      makeProject("a", "Alternativ A", {
        withCorr: true,
        costCount: 10,
        assumptions: sampleAssumptionsA,
      }),
    ]
    expect(buildPdfAssumptionTexts(projects[0]!)).toEqual(
      sampleAssumptionsA.map((a) => a.text),
    )
    expect(formatPdfCoverProjectContext(projects.map((p) => p.name), "no")).toBe(
      "Alternativ A",
    )
    expect(resolvePdfCoverLayout(1).showTocSubsections).toBe(true)

    const buffer = await writeCase("case-a-assumptions-one-project.pdf", projects)
    expect(buffer.byteLength).toBeGreaterThan(8_000)
    expect(countPdfPages(buffer)).toBeGreaterThanOrEqual(3)
    assertUniformA4(buffer)
    const latin = buffer.toString("latin1")
    expect(latin).toContain("NotoSans")
    expect(latin).toContain(PDF_CHAPTER_IDS.results)
    expect(latin).toContain(PDF_CHAPTER_IDS.assumptions)
    expect(latin).toContain(PDF_CHAPTER_IDS.analysisBasis)
  }, 90_000)

  it("CASE B: one project with no assumptions", async () => {
    const projects = [makeProject("a", "Alternativ A", { withCorr: false })]
    expect(buildPdfAssumptionTexts(projects[0]!)).toEqual([])
    const buffer = await writeCase(
      "case-b-assumptions-empty-one-project.pdf",
      projects,
    )
    expect(buffer.byteLength).toBeGreaterThan(8_000)
    assertUniformA4(buffer)
    expect(buffer.toString("latin1")).toContain(PDF_CHAPTER_IDS.assumptions)
  }, 90_000)

  it("CASE C: two projects — one with assumptions, one without", async () => {
    const projects = [
      makeProject("a", "Alternativ A", {
        assumptions: sampleAssumptionsA.slice(0, 2),
      }),
      makeProject("b", "Alternativ B", { withCorr: true }),
    ]
    expect(buildPdfAssumptionTexts(projects[0]!)).toHaveLength(2)
    expect(buildPdfAssumptionTexts(projects[1]!)).toEqual([])
    const buffer = await writeCase(
      "case-c-assumptions-mixed-projects.pdf",
      projects,
    )
    expect(buffer.byteLength).toBeGreaterThan(8_000)
    assertUniformA4(buffer)
    expect(buffer.toString("latin1")).toContain(PDF_CHAPTER_IDS.assumptions)
  }, 90_000)

  it("CASE D: four projects — cover density + TOC subsections", async () => {
    const projects = [
      makeProject("a", "Alternativ A"),
      makeProject("b", "Alternativ B", { withCorr: true }),
      makeProject("c", "Alternativ C"),
      makeProject("d", "Alternativ D", { withCorr: true }),
    ]
    expect(formatPdfCoverProjectContext(projects.map((p) => p.name), "no")).toBe(
      "4 alternativer",
    )
    expect(resolvePdfCoverLayout(4).showTocSubsections).toBe(true)
    const buffer = await writeCase("case-d-cover-four-projects.pdf", projects)
    expect(buffer.byteLength).toBeGreaterThan(8_000)
    assertUniformA4(buffer)
  }, 90_000)

  it("CASE E: max projects for current variant", async () => {
    const max = appFeatures.maxProjects
    const projects = Array.from({ length: max }, (_, i) =>
      makeProject(`p${i}`, `Alternativ ${String.fromCharCode(65 + i)}`, {
        withCorr: i % 2 === 1,
      }),
    )
    expect(projects).toHaveLength(max)
    const buffer = await writeCase(
      `case-e-cover-max-${max}-projects.pdf`,
      projects,
    )
    expect(buffer.byteLength).toBeGreaterThan(8_000)
    expect(resolvePdfCoverLayout(max).metricFontSize).toBeGreaterThanOrEqual(7)
    assertUniformA4(buffer)
  }, 90_000)
})
