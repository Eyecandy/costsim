/**
 * Ongoing PDF Contribution parity with app AttributionWaterfall (A–G).
 */
import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { join } from "node:path"

import {
  archiveCheckpoint,
  createInitialOngoingState,
  createNextCheckpoint,
  getLatestCheckpoint,
} from "@/lib/analysisCheckpoint"
import {
  assertNoHeavyValuesInOngoingSnapshot,
  buildOngoingCheckpointResultSnapshot,
  isOngoingCheckpointResultSnapshot,
} from "@/lib/ongoingCheckpointResultSnapshot"
import { DEFAULT_RESULT_PREFERENCES } from "@/lib/resultPreferences"
import { buildSimulationInputSignature } from "@/lib/simulationInputSignature"
import { PRODUCT_NAME } from "@/lib/brand"
import { createBlankWorkspaceRuntimeState } from "@/lib/workspaceReset"
import type { ShapleyAttributionResult } from "@/lib/shapleyAttribution"
import {
  formatAdaptiveMonetarySignedDelta,
  formatAdaptiveMonetaryValue,
} from "@/lib/formatWaterfallValue"
import { groupWaterfallContributors } from "@/lib/waterfallContributors"
import { buildWaterfallChartLayout } from "@/lib/waterfallLayout"
import {
  mapShapleyToPdfContribution,
  type PdfContributionWaterfall,
} from "@/pdf/buildPdfReportModel"
import { buildOngoingPdfReportModel } from "@/pdf/ongoing/buildOngoingPdfReportModel"
import {
  PDF_WATERFALL_PLOT_WIDTH,
  pdfWaterfallTotalSpanBar,
  pdfWaterfallValueToX,
  preparePdfWaterfallPresentation,
} from "@/pdf/pdfWaterfallChart"
import type { ProjectResult } from "@/simulation.worker"
import { repoRoot } from "@/test-utils/repoRoot"


function readSrc(relativePath: string): string {
  return readFileSync(join(repoRoot, relativePath), "utf8")
}

function projectResults(projectId: string, values: number[]): ProjectResult[] {
  return [{ projectId, incurredCosts: 0, values, inputSeries: [] }]
}

function valuesForPercentiles(p50: number, p85: number): number[] {
  return [
    ...Array.from({ length: 50 }, () => p50 - 10),
    ...Array.from({ length: 35 }, () => p50),
    ...Array.from({ length: 15 }, () => p85),
  ]
}

function emptyDiagnostics(): ShapleyAttributionResult["diagnostics"] {
  return {
    permutationsUsed: 0,
    simulationRunsPerSubset: 0,
    subsetsEvaluated: 0,
    cacheHits: 0,
    calculationTimeMs: 0,
    additivityResidual: 0,
    reserveAdditivityResidual: 0,
    estimatedP50FullModel: 0,
    estimatedP85FullModel: 0,
    estimatedP50EmptyModel: 0,
    estimatedP85EmptyModel: 0,
    rawShapleyFullP50: null,
    rawShapleyFullP85: null,
    mainSimulationP50: null,
    mainSimulationP85: null,
    p50ReconciliationDelta: null,
    p85ReconciliationDelta: null,
    rawShapleyReserveSpread: null,
    mainSimulationReserveSpread: null,
    reserveSpreadReconciliationDelta: null,
    fullCoalitionReconciliationDelta: null,
    mainSimulationP50Difference: null,
    mainSimulationP85Difference: null,
    permutationLastPositionCounts: null,
    convergenceMaxAbsDelta: null,
    convergenceMaxRelativeDelta: null,
    correlationPrepKind: "none",
    approximateMemoryBytes: null,
  }
}

/** Eight factors so Top-6 + Other grouping is exercised (same as app). */
function sampleShapleyContribution(args: {
  baseCost: number
  p50: number
  p85: number
}): ShapleyAttributionResult {
  const expected = [
    { type: "cost" as const, id: "c1", name: "Steel", contribution: 1_900_000 },
    { type: "cost" as const, id: "c2", name: "Concrete", contribution: 837_400 },
    { type: "driver" as const, id: "d1", name: "Market", contribution: 731_200 },
    { type: "cost" as const, id: "c3", name: "Labour", contribution: 295_800 },
    { type: "driver" as const, id: "d2", name: "Weather", contribution: -140_000 },
    { type: "cost" as const, id: "c4", name: "Transport", contribution: 95_000 },
    { type: "cost" as const, id: "c5", name: "Small A", contribution: 12_000 },
    { type: "cost" as const, id: "c6", name: "Small B", contribution: 8_000 },
  ]
  const expectedSum = expected.reduce((s, r) => s + r.contribution, 0)
  // Keep start/end consistent with contribution sum for endpoint checks.
  const endP50 = args.baseCost + expectedSum
  const reserve = [
    { type: "cost" as const, id: "c1", name: "Steel", contribution: 400_000 },
    { type: "driver" as const, id: "d1", name: "Market", contribution: 220_000 },
    { type: "cost" as const, id: "c2", name: "Concrete", contribution: 80_000 },
  ]
  const reserveSum = reserve.reduce((s, r) => s + r.contribution, 0)
  const endP85 = endP50 + reserveSum

  return {
    baseCost: args.baseCost,
    estimatedP50: endP50,
    estimatedP85: endP85,
    expectedAddition: expectedSum,
    uncertaintyReserve: reserveSum,
    contributions: expected,
    expectedAdditionDecomposition: {
      startValue: args.baseCost,
      endValue: endP50,
      contributions: expected,
    },
    uncertaintyReserveDecomposition: {
      startValue: endP50,
      endValue: endP85,
      contributions: reserve,
    },
    diagnostics: emptyDiagnostics(),
  }
}

const coverCopy = {
  reportBasisArchivedOnly:
    "Report basis: Archived checkpoints up to and including {cutoffLabel}.",
  reportBasisWithExcludedDraft:
    "Report basis: Archived checkpoints up to and including {cutoffLabel}. {draftLabel} is active and is not included in the report.",
  reportMeaning: "Ongoing report meaning.",
  assumptionsContext:
    "The assumptions below apply to {cutoffLabel}, the latest archived checkpoint included in the report.",
}

const baseInput = {
  analysisName: "Contribution parity",
  lifecycle: "active" as const,
  language: "en" as const,
  brandName: PRODUCT_NAME,
  reportKindLabel: "Ongoing uncertainty analysis",
  keyFigureLabels: {
    baseCost: "Base cost",
    p50: "P50",
    p85: "P85",
    expectedValue: "Expected value",
  },
  sectionLabels: {
    development: "Development",
    latest: "Latest",
    sCurve: "S-curve",
    tornado: "Tornado",
    contribution: "Contribution analysis",
    history: "History",
    assumptions: "Assumptions",
    method: "Method",
  },
  coverCopy,
  methodParagraphs: ["Method."],
  generatedAt: "2026-09-17T12:00:00.000Z",
}

function archiveWithContribution(
  ongoing: ReturnType<typeof createInitialOngoingState>,
  args: {
    base: number
    p50: number
    p85: number
    contribution: ShapleyAttributionResult
  },
) {
  const tip = getLatestCheckpoint(ongoing)!
  const project = tip.workspace.projects[0]!
  const values = valuesForPercentiles(args.p50, args.p85)
  const compact = buildOngoingCheckpointResultSnapshot({
    analysisId: "analysis-contrib",
    checkpointId: tip.id,
    projects: tip.workspace.projects,
    activeProjectId: project.id,
    projectResults: projectResults(project.id, values),
    simulatedBaseCostByProjectId: { [project.id]: args.base },
    inputSignature: buildSimulationInputSignature(tip.workspace.projects),
    simulationCount: values.length,
    resultPreferences: DEFAULT_RESULT_PREFERENCES,
    contribution: args.contribution,
  })
  assertNoHeavyValuesInOngoingSnapshot(compact)
  return archiveCheckpoint(ongoing, tip.id, compact)
}

describe("Ongoing PDF Contribution app parity A–G", () => {
  it("A: PDF factor order matches app Top-6+|Other presentation", () => {
    const shapley = sampleShapleyContribution({
      baseCost: 100_000_000,
      p50: 103_000_000,
      p85: 104_000_000,
    })
    const mapped = mapShapleyToPdfContribution("Alt A", shapley)
    const appRows = groupWaterfallContributors(shapley.contributions, {
      otherLabel: "Other",
    })
    const prepared = preparePdfWaterfallPresentation({
      waterfall: mapped.expectedAddition,
      otherLabel: "Other",
      language: "en",
      valueFormat: "adaptive",
    })
    expect(prepared.displayRows.map((r) => r.id)).toEqual(
      appRows.map((r) => r.id),
    )
    expect(prepared.displayRows.map((r) => r.name)).toEqual(
      appRows.map((r) => r.name),
    )
    expect(prepared.displayRows).toHaveLength(7) // 6 + Other
    expect(prepared.displayRows[6]!.id).toBe("__other__")
  })

  it("B: start/end/delta values match normalized contribution data", () => {
    const shapley = sampleShapleyContribution({
      baseCost: 100_000_000,
      p50: 103_000_000,
      p85: 104_000_000,
    })
    const mapped = mapShapleyToPdfContribution("Alt A", shapley)
    const prepared = preparePdfWaterfallPresentation({
      waterfall: mapped.expectedAddition,
      otherLabel: "Other",
      language: "en",
      valueFormat: "adaptive",
    })
    const appLayout = buildWaterfallChartLayout(
      mapped.expectedAddition.startValue,
      mapped.expectedAddition.endValue,
      groupWaterfallContributors(shapley.contributions, { otherLabel: "Other" }),
    )
    expect(prepared.layout.startValue).toBe(appLayout.startValue)
    expect(prepared.layout.endValue).toBe(appLayout.endValue)
    expect(prepared.layout.spanTotal).toBe(appLayout.spanTotal)
    expect(prepared.layout.contributionRows.map((r) => r.contribution)).toEqual(
      appLayout.contributionRows.map((r) => r.contribution),
    )
    expect(prepared.layout.contributionRows.map((r) => r.cumulativeBefore)).toEqual(
      appLayout.contributionRows.map((r) => r.cumulativeBefore),
    )
  })

  it("C: Ongoing PDF uses adaptive amount formatting like the app", () => {
    const waterfall: PdfContributionWaterfall = {
      startValue: 100_000_000,
      endValue: 103_729_400,
      contributions: [
        { id: "c1", name: "Steel", contribution: 1_900_000, type: "cost" },
        { id: "c2", name: "Concrete", contribution: 837_400, type: "cost" },
        { id: "d2", name: "Weather", contribution: -140_000, type: "driver" },
      ],
    }
    const prepared = preparePdfWaterfallPresentation({
      waterfall,
      otherLabel: "Other",
      language: "en",
      valueFormat: "adaptive",
    })
    expect(prepared.formatted.start).toBe(
      formatAdaptiveMonetaryValue(100_000_000, "en"),
    )
    expect(prepared.formatted.rows[0]!.delta).toBe(
      formatAdaptiveMonetarySignedDelta(1_900_000, "en"),
    )
    expect(prepared.formatted.rows[0]!.delta).toBe("+1.9 M")
    expect(prepared.formatted.rows[1]!.delta).toBe("+837 k")
    expect(prepared.formatted.rows[2]!.delta).toBe("-140 k")

    const ongoingCharts = readSrc("src/pdf/ongoing/ongoingPdfCharts.tsx")
    expect(ongoingCharts).toContain('valueFormat="adaptive"')
    expect(ongoingCharts).toContain("PdfWaterfallChart")
    expect(ongoingCharts).not.toContain("formatWaterfallValueWithScale")
  })

  it("D: endpoints reconcile exactly with archived Contribution result", () => {
    const shapley = sampleShapleyContribution({
      baseCost: 50_000_000,
      p50: 52_000_000,
      p85: 53_000_000,
    })
    const mapped = mapShapleyToPdfContribution("Alt A", shapley)
    expect(mapped.expectedAddition.startValue).toBe(shapley.baseCost)
    expect(mapped.expectedAddition.endValue).toBe(shapley.estimatedP50)
    const sumExpected = mapped.expectedAddition.contributions.reduce(
      (s, c) => s + c.contribution,
      0,
    )
    expect(mapped.expectedAddition.startValue + sumExpected).toBeCloseTo(
      mapped.expectedAddition.endValue,
      6,
    )
    expect(mapped.uncertaintyReserve.startValue).toBe(shapley.estimatedP50)
    expect(mapped.uncertaintyReserve.endValue).toBe(shapley.estimatedP85)
  })

  it("E: historical cutoff uses Contribution from the cutoff checkpoint only", () => {
    const blank = createBlankWorkspaceRuntimeState()
    let ongoing = createInitialOngoingState(blank, { checkpointName: "CP1" })
    const cp1Contribution = sampleShapleyContribution({
      baseCost: 10_000_000,
      p50: 11_000_000,
      p85: 12_000_000,
    })
    // Distinct first factor so we can assert which snapshot was used.
    cp1Contribution.contributions[0] = {
      ...cp1Contribution.contributions[0]!,
      name: "CP1-Steel",
      contribution: 500_000,
    }
    ongoing = archiveWithContribution(ongoing, {
      base: 10_000_000,
      p50: 11_000_000,
      p85: 12_000_000,
      contribution: cp1Contribution,
    })

    const n2 = createNextCheckpoint(ongoing, { name: "CP2" })
    expect(n2.ok).toBe(true)
    if (!n2.ok) return
    const cp2Contribution = sampleShapleyContribution({
      baseCost: 20_000_000,
      p50: 22_000_000,
      p85: 24_000_000,
    })
    cp2Contribution.contributions[0] = {
      ...cp2Contribution.contributions[0]!,
      name: "CP2-Steel",
      contribution: 1_900_000,
    }
    ongoing = archiveWithContribution(n2.ongoing, {
      base: 20_000_000,
      p50: 22_000_000,
      p85: 24_000_000,
      contribution: cp2Contribution,
    })

    const cp1 = ongoing.checkpoints.find((c) => c.sequence === 1)!
    const built = buildOngoingPdfReportModel({
      ...baseInput,
      checkpoints: ongoing.checkpoints,
      cutoffCheckpointId: cp1.id,
    })
    expect(built.ok).toBe(true)
    if (!built.ok) return
    expect(built.model.latestDetail.contribution).not.toBeNull()
    const names =
      built.model.latestDetail.contribution!.expectedAddition.contributions.map(
        (c) => c.name,
      )
    expect(names).toContain("CP1-Steel")
    expect(names).not.toContain("CP2-Steel")
    expect(built.model.cutoff.sequence).toBe(1)

    const snap = cp1.archivedSnapshot
    expect(isOngoingCheckpointResultSnapshot(snap)).toBe(true)
    if (!isOngoingCheckpointResultSnapshot(snap)) return
    expect(snap.contribution?.contributions[0]?.name).toBe("CP1-Steel")
  })

  it("F: Contribution section starts on a new PDF page", () => {
    const doc = readSrc("src/pdf/ongoing/OngoingReportDocument.tsx")
    const block = doc.slice(
      doc.indexOf("Contribution — always starts on a new page"),
      doc.indexOf("Checkpoint history"),
    )
    expect(block).toContain("<Page")
    expect(block).toContain("OngoingPdfContributionCharts")
    expect(block).toContain("ONGOING_PDF_SECTION_IDS.contribution")
  })

  it("G: Single PDF Contribution still uses shared chart with chart-level format", () => {
    const singleDoc = readSrc("src/pdf/ProjectReportDocument.tsx")
    expect(singleDoc).toContain('from "@/pdf/pdfWaterfallChart"')
    expect(singleDoc).toContain("PdfWaterfallChart")
    // Default chart-level format — no adaptive override on Single.
    expect(singleDoc).not.toContain('valueFormat="adaptive"')
    const shared = readSrc("src/pdf/pdfWaterfallChart.tsx")
    expect(shared).toContain('valueFormat = "chart"')
    expect(shared).toContain("PDF_WATERFALL_PLOT_WIDTH")
    expect(PDF_WATERFALL_PLOT_WIDTH).toBe(96)
  })

  it("H: total-span summary bar uses same valueToX as waterfall bars", () => {
    // A: small total contribution → short summary bar
    const small = preparePdfWaterfallPresentation({
      waterfall: {
        startValue: 100_000_000,
        endValue: 101_000_000,
        contributions: [
          { id: "a", name: "A", contribution: 1_000_000, type: "cost" },
        ],
      },
      otherLabel: "Other",
      language: "en",
      valueFormat: "adaptive",
    })
    // B: large total contribution → wider summary bar (same base, larger span/domain ratio via overshoot contrast)
    const large = preparePdfWaterfallPresentation({
      waterfall: {
        startValue: 100,
        endValue: 200,
        contributions: [
          { id: "a", name: "A", contribution: 100, type: "cost" },
        ],
      },
      otherLabel: "Other",
      language: "en",
      valueFormat: "adaptive",
    })
    // C: mixed positive/negative — start→end still correct
    const mixed = preparePdfWaterfallPresentation({
      waterfall: {
        startValue: 100,
        endValue: 110,
        contributions: [
          { id: "neg", name: "Neg", contribution: -50, type: "cost" },
          { id: "pos", name: "Pos", contribution: 60, type: "cost" },
        ],
      },
      otherLabel: "Other",
      language: "en",
      valueFormat: "adaptive",
    })
    // D: Top-6 + Other still reconciles to endpoint
    const shapley = sampleShapleyContribution({
      baseCost: 50_000_000,
      p50: 52_000_000,
      p85: 53_000_000,
    })
    const mapped = mapShapleyToPdfContribution("Alt A", shapley)
    const grouped = preparePdfWaterfallPresentation({
      waterfall: mapped.expectedAddition,
      otherLabel: "Other",
      language: "en",
      valueFormat: "adaptive",
    })

    const smallBar = pdfWaterfallTotalSpanBar(small.layout)
    const largeBar = pdfWaterfallTotalSpanBar(large.layout)
    const mixedBar = pdfWaterfallTotalSpanBar(mixed.layout)
    const groupedBar = pdfWaterfallTotalSpanBar(grouped.layout)

    // Summary start/end = waterfall start/final endpoint (same mapping as bars).
    expect(smallBar.xStart).toBe(
      pdfWaterfallValueToX(small.layout.startValue, small.layout),
    )
    expect(smallBar.xEnd).toBe(
      pdfWaterfallValueToX(small.layout.endValue, small.layout),
    )
    expect(smallBar.xStart).toBe(
      pdfWaterfallValueToX(
        small.layout.contributionRows[0]!.cumulativeBefore,
        small.layout,
      ),
    )
    expect(smallBar.xEnd).toBe(
      pdfWaterfallValueToX(
        small.layout.contributionRows.at(-1)!.cumulativeAfter,
        small.layout,
      ),
    )

    // Changing span changes summary width (not a fixed default).
    // Same analytical span (10) with overshoot → shorter bar than tight path.
    const tight = preparePdfWaterfallPresentation({
      waterfall: {
        startValue: 100,
        endValue: 110,
        contributions: [
          { id: "a", name: "A", contribution: 10, type: "cost" },
        ],
      },
      otherLabel: "Other",
      language: "en",
      valueFormat: "adaptive",
    })
    const tightBar = pdfWaterfallTotalSpanBar(tight.layout)
    expect(mixedBar.width).toBeLessThan(tightBar.width)
    expect(mixedBar.width).toBeLessThan(PDF_WATERFALL_PLOT_WIDTH * 0.5)
    expect(largeBar.width).toBeGreaterThan(0)
    expect(smallBar.width).toBeGreaterThan(0)
    expect(smallBar.width).toBeLessThan(PDF_WATERFALL_PLOT_WIDTH * 0.95)

    // Mixed: endpoint is start+net, not geometric bar bbox extremes.
    expect(mixed.layout.endValue).toBe(110)
    expect(mixedBar.xEnd).toBe(
      pdfWaterfallValueToX(mixed.layout.endValue, mixed.layout),
    )

    // Grouped Top-6+Other: last cumulativeAfter equals endValue.
    expect(grouped.layout.contributionRows.at(-1)!.cumulativeAfter).toBeCloseTo(
      grouped.layout.endValue,
      9,
    )
    expect(groupedBar.xEnd).toBe(
      pdfWaterfallValueToX(grouped.layout.endValue, grouped.layout),
    )
    expect(grouped.displayRows.some((r) => r.id === "__other__")).toBe(true)

    const shared = readSrc("src/pdf/pdfWaterfallChart.tsx")
    expect(shared).toContain("showTotalSpanBar")
    expect(shared).toContain("pdfWaterfallTotalSpanBar")
    expect(shared).toContain("PDF_WATERFALL_TOTAL_BAR_H")
    expect(shared).toContain("PDF_WATERFALL_TOTAL_CAP_H")
    // End markers use totalSpan.xStart / xEnd — same geometry as the bar.
    expect(shared).toContain("totalSpan.xStart")
    expect(shared).toContain("totalSpan.xEnd")
    expect(shared).not.toContain("showReferenceStrip")
    expect(shared).not.toContain("referenceStripRow")
    expect(shared).not.toContain('marginLeft: "28%"')
    const ongoingCharts = readSrc("src/pdf/ongoing/ongoingPdfCharts.tsx")
    expect(ongoingCharts).toContain("showTotalSpanBar")
    expect(ongoingCharts).not.toContain("showReferenceStrip")

    // Marker positions === summary bar endpoints (no separate scale).
    expect(smallBar.xStart).toBe(smallBar.x)
    expect(smallBar.xEnd).toBe(smallBar.x + smallBar.width)
  })
})
