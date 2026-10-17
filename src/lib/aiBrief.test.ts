import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { join } from "node:path"

import {
  AI_BRIEF_SCHEMA_VERSION,
  buildAiBriefOngoingDevelopment,
  buildAiBriefV3,
  buildDriverImpactEntries,
  buildProjectDisplayNames,
  collectNonZeroCostCorrelations,
  compactContributionFactors,
  filterCheckpointsUpToViewed,
  mapContributionAnalysis,
} from "@/lib/aiBrief"
import { messages } from "@/i18n/messages"
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
  type OngoingCheckpointResultSnapshotV1,
} from "@/lib/ongoingCheckpointResultSnapshot"
import type { Project } from "@/lib/project"
import type { ShapleyAttributionResult } from "@/domain/simulation/shapleyAttribution"
import type { ProjectResult } from "@/simulation.worker"
import {
  DEFAULT_RESULT_PREFERENCES,
  resolveResultView,
} from "@/lib/resultPreferences"
import { createBlankWorkspaceRuntimeState } from "@/lib/workspaceReset"
import { repoRoot } from "@/test-utils/repoRoot"

const defaultResultView = resolveResultView(DEFAULT_RESULT_PREFERENCES)

function resultsPanelSource() {
  return readFileSync(
    join(repoRoot, "src/components/ResultsPanel.tsx"),
    "utf8",
  )
}

function richProject(): Project {
  return {
    id: "proj-rich",
    name: "Campus",
    incurredCosts: 5_000_000,
    assumptions: [
      { id: "a1", text: "Campus remains in use during construction" },
      { id: "a2", text: "Price level Q3 2026" },
    ],
    costRows: [
      {
        id: "c-felles",
        name: "Felleskostnader",
        description: "Site establishment and shared site costs",
        optimistic: "-15",
        likely: "18000000",
        pessimistic: "20",
      },
      {
        id: "c-bygg",
        name: "Bygning",
        description: "Building structure and facade",
        optimistic: "-10",
        likely: "95000000",
        pessimistic: "15",
      },
      {
        id: "c-vvs",
        name: "VVS",
        optimistic: "-12",
        likely: "24000000",
        pessimistic: "18",
      },
    ],
    driverRows: [
      {
        id: "d-marked",
        name: "Marked",
        description: "Market price pressure on labour and materials",
        optimistic: "-5",
        likely: "0",
        pessimistic: "12",
      },
      {
        id: "d-teknikk",
        name: "Teknikk",
        description: "Technical complexity in MEP packages",
        optimistic: "-8",
        likely: "0",
        pessimistic: "15",
      },
    ],
    driverImpacts: {
      "d-teknikk": {
        "c-felles": "20",
        "c-bygg": "40",
        "c-vvs": "100",
      },
    },
    costCorrelations: {
      "c-felles": {
        "c-bygg": "0.5",
        "c-vvs": "0.5",
      },
      "c-bygg": {
        "c-vvs": "0.5",
      },
    },
  }
}

function sparseProject(): Project {
  return {
    id: "proj-sparse",
    name: "Minimal",
    incurredCosts: 0,
    costRows: [
      {
        id: "c1",
        name: "A",
        optimistic: "-10",
        likely: "1000000",
        pessimistic: "15",
      },
    ],
    driverRows: [
      {
        id: "d1",
        name: "D",
        optimistic: "-5",
        likely: "0",
        pessimistic: "10",
      },
    ],
  }
}

function emptyResult(projectId: string): ProjectResult {
  return {
    projectId,
    incurredCosts: 0,
    values: [100, 110, 120, 130, 140],
    inputSeries: [],
  }
}

function fakeShapley(): ShapleyAttributionResult {
  return {
    baseCost: 100,
    estimatedP50: 120,
    estimatedP85: 140,
    expectedAddition: 20,
    uncertaintyReserve: 20,
    contributions: [
      { type: "cost", id: "c1", name: "A", contribution: 12 },
      { type: "driver", id: "d1", name: "D", contribution: 8 },
    ],
    expectedAdditionDecomposition: {
      startValue: 100,
      endValue: 120,
      contributions: [
        { type: "cost", id: "c1", name: "A", contribution: 12 },
        { type: "driver", id: "d1", name: "D", contribution: 8 },
      ],
    },
    uncertaintyReserveDecomposition: {
      startValue: 120,
      endValue: 140,
      contributions: [
        { type: "driver", id: "d1", name: "D", contribution: 11 },
        { type: "cost", id: "c1", name: "A", contribution: 9 },
      ],
    },
    diagnostics: {
      permutationsUsed: 100,
      simulationRunsPerSubset: 3000,
      subsetsEvaluated: 10,
      cacheHits: 0,
      calculationTimeMs: 1,
      additivityResidual: 0,
      reserveAdditivityResidual: 0,
      estimatedP50FullModel: 120,
      estimatedP85FullModel: 140,
      estimatedP50EmptyModel: 100,
      estimatedP85EmptyModel: 100,
      rawShapleyFullP50: null,
      rawShapleyFullP85: null,
      mainSimulationP50: 120,
      mainSimulationP85: 140,
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
      correlationPrepKind: "identity",
      approximateMemoryBytes: null,
    },
  }
}

function manyContributionShapley(): ShapleyAttributionResult {
  const expected = [
    { type: "cost" as const, id: "c1", name: "C1", contribution: 50 },
    { type: "cost" as const, id: "c2", name: "C2", contribution: -20 },
    { type: "driver" as const, id: "d1", name: "D1", contribution: 30 },
    { type: "cost" as const, id: "c3", name: "C3", contribution: 15 },
    { type: "driver" as const, id: "d2", name: "D2", contribution: 10 },
    { type: "cost" as const, id: "c4", name: "C4", contribution: 8 },
    { type: "driver" as const, id: "d3", name: "D3", contribution: 5 },
    { type: "cost" as const, id: "c5", name: "C5", contribution: 2 },
  ]
  // sum = 50-20+30+15+10+8+5+2 = 100
  const reserve = [
    { type: "driver" as const, id: "d1", name: "D1", contribution: 40 },
    { type: "cost" as const, id: "c1", name: "C1", contribution: 25 },
    { type: "cost" as const, id: "c2", name: "C2", contribution: -10 },
    { type: "driver" as const, id: "d2", name: "D2", contribution: 20 },
    { type: "cost" as const, id: "c3", name: "C3", contribution: 12 },
    { type: "driver" as const, id: "d3", name: "D3", contribution: 8 },
    { type: "cost" as const, id: "c4", name: "C4", contribution: 3 },
    { type: "cost" as const, id: "c5", name: "C5", contribution: 2 },
  ]
  // sum = 40+25-10+20+12+8+3+2 = 100
  return {
    ...fakeShapley(),
    baseCost: 1000,
    estimatedP50: 1100,
    estimatedP85: 1200,
    expectedAddition: 100,
    uncertaintyReserve: 100,
    contributions: expected,
    expectedAdditionDecomposition: {
      startValue: 1000,
      endValue: 1100,
      contributions: expected,
    },
    uncertaintyReserveDecomposition: {
      startValue: 1100,
      endValue: 1200,
      contributions: reserve,
    },
  }
}

describe("ai-brief-v3", () => {
  it("displayName A–D: unique names unchanged; duplicates numbered by order; ids kept", () => {
    expect(
      buildProjectDisplayNames([
        { name: "Alternativ A" },
        { name: "Alternativ B" },
        { name: "Alternativ C" },
      ]),
    ).toEqual(["Alternativ A", "Alternativ B", "Alternativ C"])

    const a = { ...sparseProject(), id: "id-b1", name: "Alternativ B" }
    const b = { ...sparseProject(), id: "id-b2", name: "Alternativ B" }
    const c = { ...sparseProject(), id: "id-c", name: "Alternativ C" }
    const brief = buildAiBriefV3({
      resultView: defaultResultView,
      language: "en",
      projects: [a, b, c],
      activeProjectId: "id-b1",
      projectResults: [],
      simulatedBaseCostByProjectId: {},
      simulationCount: 20_000,
    })
    expect(brief.projects.map((p) => p.displayName)).toEqual([
      "Alternativ B (1)",
      "Alternativ B (2)",
      "Alternativ C",
    ])
    expect(brief.projects.map((p) => p.name)).toEqual([
      "Alternativ B",
      "Alternativ B",
      "Alternativ C",
    ])
    expect(brief.projects.map((p) => p.id)).toEqual(["id-b1", "id-b2", "id-c"])
    expect(a.name).toBe("Alternativ B")
    expect(b.name).toBe("Alternativ B")
  })

  it("displayName E/F/H: instructions use displayName; never surface ids; NO/EN work", () => {
    expect(messages.no.results.aiBriefClipboardPromptNo).toContain(
      "Bruk `displayName`",
    )
    expect(messages.no.results.aiBriefClipboardPromptNo).toContain(
      "skal aldri vises eller forkortes",
    )
    expect(messages.no.results.aiBriefClipboardPromptNo).not.toContain(
      "Bruk prosjekt-id som stabil identitet",
    )
    expect(messages.en.results.aiBriefClipboardPromptEn).toContain(
      "Use `displayName`",
    )
    expect(messages.en.results.aiBriefClipboardPromptEn).toContain(
      "must never be shown or abbreviated",
    )
    expect(messages.en.results.aiBriefClipboardPromptEn).not.toContain(
      "Treat project id as stable identity",
    )

    const no = buildAiBriefV3({
      resultView: defaultResultView,
      language: "no",
      projects: [
        { ...sparseProject(), id: "p1", name: "X" },
        { ...sparseProject(), id: "p2", name: "X" },
      ],
      activeProjectId: "p1",
      projectResults: [],
      simulatedBaseCostByProjectId: {},
      simulationCount: 20_000,
    })
    const en = buildAiBriefV3({
      resultView: defaultResultView,
      language: "en",
      projects: [
        { ...sparseProject(), id: "p1", name: "X" },
        { ...sparseProject(), id: "p2", name: "X" },
      ],
      activeProjectId: "p1",
      projectResults: [],
      simulatedBaseCostByProjectId: {},
      simulationCount: 20_000,
    })
    expect(no.projects.map((p) => p.displayName)).toEqual(["X (1)", "X (2)"])
    expect(en.projects.map((p) => p.displayName)).toEqual(["X (1)", "X (2)"])
  })

  it("displayName G: metrics from simulation unchanged when displayName added", () => {
    const values = [90, 100, 110, 120, 200]
    const brief = buildAiBriefV3({
      resultView: defaultResultView,
      language: "en",
      projects: [sparseProject()],
      activeProjectId: "proj-sparse",
      projectResults: [
        {
          projectId: "proj-sparse",
          incurredCosts: 0,
          values,
          inputSeries: [],
        },
      ],
      simulatedBaseCostByProjectId: { "proj-sparse": 100 },
      simulationCount: 20_000,
    })
    expect(brief.projects[0]!.displayName).toBe("Minimal")
    expect(brief.projects[0]!.metrics.baseCost).toBe(100)
    expect(brief.projects[0]!.metrics.p50).not.toBeNull()
  })

  it("quality A: metrics retain numerical key figures without riskProfile", () => {
    const brief = buildAiBriefV3({
      resultView: defaultResultView,
      language: "en",
      projects: [sparseProject()],
      activeProjectId: "proj-sparse",
      projectResults: [emptyResult("proj-sparse")],
      simulatedBaseCostByProjectId: { "proj-sparse": 100 },
      simulationCount: 20_000,
    })
    const metrics = brief.projects[0]!.metrics
    expect(metrics.baseCost).toBe(100)
    expect(metrics).toHaveProperty("p50")
    expect(metrics).toHaveProperty("p85")
    expect(metrics).toHaveProperty("expectedAddition")
    expect(metrics).toHaveProperty("uncertaintyAllowance")
    expect(metrics).not.toHaveProperty("riskProfile")
    expect(brief.method).not.toHaveProperty("riskProfileDefinition")
    expect(brief.interpretationHints).not.toHaveProperty(
      "useRiskProfileOnlyPerMethodDefinition",
    )
  })

  it("quality B: driverConcentration exported only with explicit method definition", () => {
    const brief = buildAiBriefV3({
      resultView: defaultResultView,
      language: "en",
      projects: [sparseProject()],
      activeProjectId: "proj-sparse",
      projectResults: [],
      simulatedBaseCostByProjectId: {},
      simulationCount: 20_000,
    })
    expect(brief.method.driverConcentrationDefinition.topN).toBe(6)
    expect(
      brief.method.driverConcentrationDefinition.categories.high,
    ).toContain("0.50")
    expect(
      brief.interpretationHints.useDriverConcentrationOnlyPerMethodDefinition,
    ).toBe(true)
  })

  it("quality C/D: correlationSummary removed; correlations[] remain", () => {
    const brief = buildAiBriefV3({
      resultView: defaultResultView,
      language: "no",
      projects: [richProject()],
      activeProjectId: "proj-rich",
      projectResults: [],
      simulatedBaseCostByProjectId: {},
      simulationCount: 20_000,
    })
    expect(brief.projects[0]!).not.toHaveProperty("correlationSummary")
    expect(brief.projects[0]!.correlations).toHaveLength(3)
    expect(collectNonZeroCostCorrelations(
      richProject().costRows,
      richProject().costCorrelations,
    )).toHaveLength(3)
  })

  it("quality E–H: Contribution Analysis Top 6 + exact Other; negatives preserved", () => {
    const mapped = mapContributionAnalysis(manyContributionShapley(), "en")
    expect(mapped.status).toBe("calculated")
    if (mapped.status !== "calculated") return
    const ea = mapped.expectedAddition.contributions
    expect(ea).toHaveLength(7)
    expect(ea.slice(0, 6).every((c) => c.type !== "other")).toBe(true)
    const other = ea[6]!
    expect(other.type).toBe("other")
    expect(other.name).toBe("Other")
    expect(other.rank).toBeNull()
    expect(other.id).toBeNull()
    // Top by |contrib|: 50, -20, 30, 15, 10, 8 → remainder 5+2=7
    expect(other.contribution).toBe(7)
    expect(ea.some((c) => c.contribution < 0)).toBe(true)
    const eaSum = ea.reduce((s, c) => s + c.contribution, 0)
    expect(eaSum).toBe(100)
    expect(mapped.endpoints.baseCost + eaSum).toBe(mapped.endpoints.p50)

    const ur = mapped.uncertaintyReserve.contributions
    const urSum = ur.reduce((s, c) => s + c.contribution, 0)
    expect(urSum).toBe(100)
    expect(mapped.endpoints.p50 + urSum).toBe(mapped.endpoints.p85)

    const no = compactContributionFactors(
      manyContributionShapley().expectedAdditionDecomposition.contributions,
      "Øvrige",
    )
    expect(no[no.length - 1]!.name).toBe("Øvrige")
  })

  it("quality I: prompt no longer references obsolete uncertaintyAssessment field", () => {
    expect(messages.no.results.aiBriefClipboardPromptNo).not.toContain(
      "uncertaintyAssessment",
    )
    expect(messages.en.results.aiBriefClipboardPromptEn).not.toContain(
      "uncertaintyAssessment",
    )
    expect(
      buildAiBriefV3({
        resultView: defaultResultView,
        language: "en",
        projects: [sparseProject()],
        activeProjectId: "proj-sparse",
        projectResults: [],
        simulatedBaseCostByProjectId: {},
        simulationCount: 20_000,
      }).interpretationHints,
    ).not.toHaveProperty("uncertaintyAssessmentIsUserRationaleNotObjectiveProof")
  })

  it("quality J: empty overrides mean default 100% on all cost items", () => {
    const market = buildDriverImpactEntries(
      richProject().costRows,
      richProject().driverRows,
      richProject().driverImpacts,
    ).find((e) => e.driverId === "d-marked")!
    expect(market.defaultImpactPct).toBe(100)
    expect(market.overrides).toEqual([])
    expect(
      buildAiBriefV3({
      resultView: defaultResultView,
        language: "en",
        projects: [richProject()],
        activeProjectId: "proj-rich",
        projectResults: [],
        simulatedBaseCostByProjectId: {},
        simulationCount: 20_000,
      }).interpretationHints.emptyDriverImpactOverridesMeansDefaultOnAllCostItems,
    ).toBe(true)
    expect(messages.en.results.aiBriefClipboardPromptEn).toContain(
      'not "no impact"',
    )
  })

  it("quality K: AI Brief generation does not trigger simulation or Shapley", () => {
    const src = resultsPanelSource()
    const copyBlock = src.slice(
      src.indexOf("handleCopyAiBriefPackage"),
      src.indexOf("handleCopyAiBriefPackage") + 2500,
    )
    expect(copyBlock).not.toContain("requestCalculation")
    // Archive-aware cached Shapley only — never kicks off live calculation.
    expect(copyBlock).toContain("getShapleyResult(project.id)")
  })

  it("quality L/M + first-response A–K: concise conversational structure; safeguards kept", () => {
    const no = messages.no.results.aiBriefClipboardPromptNo
    const en = messages.en.results.aiBriefClipboardPromptEn

    // A: old five-section structure removed
    expect(no).not.toContain("1. Kort konklusjon")
    expect(no).not.toContain("2. Tre viktigste innsikter")
    expect(no).not.toContain("3. Vurdering av analysegrunnlaget")
    expect(no).not.toContain("4. Viktigste oppfølgingstiltak")
    expect(no).not.toContain("5. Metode og begrensninger")
    expect(en).not.toContain("1. Short conclusion")
    expect(en).not.toContain("2. Three most important insights")
    expect(en).not.toContain("5. Method and limitations")
    expect(no).not.toContain("Hvis du vil gjøre vurderingen mer presis")
    expect(en).not.toContain("If you want a more precise assessment")

    // B/K: new structure NO/EN
    expect(no).toContain("1. Kort vurdering")
    expect(no).toContain("2. Det viktigste å se nærmere på")
    expect(no).toContain("3. Spørsmål for videre arbeid")
    expect(en).toContain("1. Short assessment")
    expect(en).toContain("2. What matters most to look at next")
    expect(en).toContain("3. Questions for further work")

    // C: concise
    expect(no).toContain("150–300 ord")
    expect(en).toContain("150–300 words")
    expect(no).toContain("startpunkt for videre analyse")
    expect(en).toContain("starting point for further analysis")

    // D/E: max 2 points, max 3 questions
    expect(no).toContain("Maks 2 punkter")
    expect(en).toContain("At most 2 points")
    expect(no).toContain("1–3 målrettede spørsmål")
    expect(no).toContain("Maks 3 spørsmål")
    expect(en).toContain("1–3 targeted questions")
    expect(en).toContain("Maximum 3 questions")

    // F/G: no mandatory method / full audit
    expect(no).toContain("systematisk auditere")
    expect(en).toContain("systematically audit")
    expect(no).toContain(
      "ta dem bare inn i første svar når de faktisk påvirker tolkningen",
    )
    expect(en).toContain(
      "include them in the first response only when they materially affect interpretation",
    )

    // H: do not ask for info already in brief
    expect(no).toContain(
      "Ikke spør etter informasjon som allerede finnes i assumptions",
    )
    expect(en).toContain(
      "Do not ask for information already contained in assumptions",
    )

    // I: reliability rules remain
    expect(no).toContain("Bland ikke disse")
    expect(en).toContain("Do not conflate them")
    expect(no).toContain("Korrelasjon er ikke kausalitet")
    expect(en).toContain("Correlation is not causation")

    // J: displayName
    expect(no).toContain("Bruk `displayName`")
    expect(en).toContain("Use `displayName`")
    expect(no).toContain("skal aldri vises eller forkortes")
    expect(en).toContain("must never be shown or abbreviated")
  })

  it("A: version is ai-brief-v3", () => {
    expect(AI_BRIEF_SCHEMA_VERSION).toBe("ai-brief-v3")
    const brief = buildAiBriefV3({
      resultView: defaultResultView,
      language: "no",
      projects: [sparseProject()],
      activeProjectId: "proj-sparse",
      projectResults: [emptyResult("proj-sparse")],
      simulatedBaseCostByProjectId: { "proj-sparse": 1_000_000 },
      simulationCount: 20_000,
      generatedAt: "2026-01-01T00:00:00.000Z",
    })
    expect(brief.version).toBe("ai-brief-v3")
  })

  it("B: P10/mode/P90 semantics are explicit", () => {
    const brief = buildAiBriefV3({
      resultView: defaultResultView,
      language: "en",
      projects: [sparseProject()],
      activeProjectId: "proj-sparse",
      projectResults: [],
      simulatedBaseCostByProjectId: {},
      simulationCount: 20_000,
    })
    expect(brief.method.estimateSemantics).toEqual({
      optimistic: "p10",
      mostLikely: "mode",
      pessimistic: "p90",
    })
    expect(brief.method.distributionType).toBe("triangular")
    expect(brief.method.triangularSupportCalibratedFromPercentiles).toBe(true)
    expect(
      brief.method.estimateInterpretation.triangularSupportExtendsBeyondPercentiles,
    ).toBe(true)
  })

  it("C–F: assumptions and descriptions included", () => {
    const brief = buildAiBriefV3({
      resultView: defaultResultView,
      language: "no",
      projects: [richProject()],
      activeProjectId: "proj-rich",
      projectResults: [],
      simulatedBaseCostByProjectId: {},
      simulationCount: 20_000,
    })
    const p = brief.projects[0]!
    expect(p.assumptions).toHaveLength(2)
    expect(p.assumptions[0]!.text).toContain("Campus")
    expect(p.costItems[0]!.description).toContain("Site establishment")
    expect(p.costItems.find((c) => c.id === "c-vvs")!.description).toBeNull()
    expect(p.drivers[0]!.description).toContain("Market price")
    expect(p.drivers[0]!).not.toHaveProperty("uncertaintyAssessment")
  })

  it("G: driver impacts are unambiguous (default 100 + overrides)", () => {
    const project = richProject()
    const entries = buildDriverImpactEntries(
      project.costRows,
      project.driverRows,
      project.driverImpacts,
    )
    const tech = entries.find((e) => e.driverId === "d-teknikk")!
    expect(tech.defaultImpactPct).toBe(100)
    expect(tech.overrides).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ costItemId: "c-felles", impactPct: 20 }),
        expect.objectContaining({ costItemId: "c-bygg", impactPct: 40 }),
      ]),
    )
    expect(tech.overrides.find((o) => o.costItemId === "c-vvs")).toBeUndefined()
    const market = entries.find((e) => e.driverId === "d-marked")!
    expect(market.overrides).toEqual([])
  })

  it("H/I: sparse non-zero correlations; omitted pairs documented as zero", () => {
    const project = richProject()
    const pairs = collectNonZeroCostCorrelations(
      project.costRows,
      project.costCorrelations,
    )
    expect(pairs).toHaveLength(3)
    expect(pairs.every((p) => p.rho === 0.5)).toBe(true)
    const brief = buildAiBriefV3({
      resultView: defaultResultView,
      language: "no",
      projects: [project],
      activeProjectId: "proj-rich",
      projectResults: [],
      simulatedBaseCostByProjectId: {},
      simulationCount: 20_000,
    })
    expect(brief.method.omittedPairwiseCostCorrelationMeansZero).toBe(true)
    expect(brief.method.diagonalCostCorrelationRho).toBe(1)
    expect(brief.method.costCorrelationsSymmetric).toBe(true)
    expect(brief.projects[0]!.correlations).toHaveLength(3)
  })

  it("J: contribution analysis included only when already available", () => {
    const without = buildAiBriefV3({
      resultView: defaultResultView,
      language: "en",
      projects: [sparseProject()],
      activeProjectId: "proj-sparse",
      projectResults: [],
      simulatedBaseCostByProjectId: {},
      simulationCount: 20_000,
    })
    expect(without.projects[0]!.contributionAnalysis).toEqual({
      status: "notCalculated",
    })

    const withCalc = buildAiBriefV3({
      resultView: defaultResultView,
      language: "en",
      projects: [sparseProject()],
      activeProjectId: "proj-sparse",
      projectResults: [],
      simulatedBaseCostByProjectId: {},
      simulationCount: 20_000,
      contributionAnalysisByProjectId: { "proj-sparse": fakeShapley() },
    })
    const ca = withCalc.projects[0]!.contributionAnalysis
    expect(ca.status).toBe("calculated")
    if (ca.status === "calculated") {
      expect(ca.endpoints.expectedAddition).toBe(20)
      expect(ca.expectedAddition.contributions[0]!.type).toBe("costItem")
      expect(ca.uncertaintyReserve.contributions[0]!.rank).toBe(1)
    }
    expect(mapContributionAnalysis(undefined).status).toBe("notCalculated")
  })

  it("K: generating AI Brief does NOT trigger Shapley", () => {
    const src = resultsPanelSource()
    expect(src).toContain("buildAiBriefV3")
    expect(src).toContain("contributionAnalysisByProjectId")
    expect(src).toContain("getShapleyResult(project.id)")
    const copyBlock = src.slice(
      src.indexOf("handleCopyAiBriefPackage"),
      src.indexOf("handleCopyAiBriefPackage") + 2500,
    )
    expect(copyBlock).not.toContain("requestCalculation")
  })

  it("L/M: stale independence flags removed; correlation metadata reflects state", () => {
    const withCorr = buildAiBriefV3({
      resultView: defaultResultView,
      language: "no",
      projects: [richProject()],
      activeProjectId: "proj-rich",
      projectResults: [],
      simulatedBaseCostByProjectId: {},
      simulationCount: 20_000,
    })
    expect(withCorr.method).not.toHaveProperty("costItemsIndependent")
    expect(withCorr.method).not.toHaveProperty("correlationModelled")
    expect(withCorr.method.costItemDependenceModel).toBe("gaussian-copula")
    expect(withCorr.method.costCorrelationsPresent).toBe(true)

    const sparse = buildAiBriefV3({
      resultView: defaultResultView,
      language: "en",
      projects: [sparseProject()],
      activeProjectId: "proj-sparse",
      projectResults: [],
      simulatedBaseCostByProjectId: {},
      simulationCount: 20_000,
    })
    expect(sparse.method.costCorrelationsPresent).toBe(false)
    expect(sparse.projects[0]!.correlations).toEqual([])
    expect(sparse.projects[0]!.assumptions).toEqual([])
  })

  it("N/O/P: instruction distinguishes tornado vs contribution; overlap caution; label safeguards", () => {
    expect(messages.no.results.aiBriefClipboardPromptNo).toContain("ai-brief-v3")
    expect(messages.en.results.aiBriefClipboardPromptEn).toContain("ai-brief-v3")
    expect(messages.no.results.aiBriefClipboardPromptNo).toContain(
      "Bland ikke disse",
    )
    expect(messages.en.results.aiBriefClipboardPromptEn).toContain(
      "Do not conflate them",
    )
    expect(messages.no.results.aiBriefClipboardPromptNo).toContain(
      "kan være overlappende",
    )
    expect(messages.en.results.aiBriefClipboardPromptEn).toContain(
      "may be overlapping",
    )
    expect(messages.no.results.aiBriefClipboardPromptNo).toContain(
      "ikke finn på detaljert faglig betydning",
    )
    expect(messages.en.results.aiBriefClipboardPromptEn).toContain(
      "do not invent detailed technical meaning",
    )
    const brief = buildAiBriefV3({
      resultView: defaultResultView,
      language: "no",
      projects: [sparseProject()],
      activeProjectId: "proj-sparse",
      projectResults: [],
      simulatedBaseCostByProjectId: {},
      simulationCount: 20_000,
    })
    expect(brief.interpretationHints.doNotConflateTornadoAndContribution).toBe(
      true,
    )
    expect(brief.interpretationHints).not.toHaveProperty(
      "useTornadoAsSourceOfTruthForDriverPriority",
    )
  })

  it("Q: missing optional contextual data represented honestly", () => {
    const brief = buildAiBriefV3({
      resultView: defaultResultView,
      language: "en",
      projects: [sparseProject()],
      activeProjectId: "proj-sparse",
      projectResults: [],
      simulatedBaseCostByProjectId: {},
      simulationCount: 20_000,
    })
    const p = brief.projects[0]!
    expect(p.assumptions).toEqual([])
    expect(p.costItems[0]!.description).toBeNull()
    expect(p.drivers[0]!.description).toBeNull()
    expect(p.correlations).toEqual([])
    expect(p.contributionAnalysis).toEqual({ status: "notCalculated" })
  })

  it("R: NO/EN brief generation both work", () => {
    const no = buildAiBriefV3({
      resultView: defaultResultView,
      language: "no",
      projects: [richProject()],
      activeProjectId: "proj-rich",
      projectResults: [],
      simulatedBaseCostByProjectId: {},
      simulationCount: 20_000,
    })
    const en = buildAiBriefV3({
      resultView: defaultResultView,
      language: "en",
      projects: [richProject()],
      activeProjectId: "proj-rich",
      projectResults: [],
      simulatedBaseCostByProjectId: {},
      simulationCount: 20_000,
    })
    expect(no.language).toBe("no")
    expect(en.language).toBe("en")
    expect(no.projects[0]!.correlations).toHaveLength(3)
    expect(en.projects[0]!.correlations).toHaveLength(3)
  })

  it("S: metrics remain derived from simulation values unchanged in meaning", () => {
    const values = [90, 100, 110, 120, 200]
    const brief = buildAiBriefV3({
      resultView: defaultResultView,
      language: "en",
      projects: [sparseProject()],
      activeProjectId: "proj-sparse",
      projectResults: [
        {
          projectId: "proj-sparse",
          incurredCosts: 0,
          values,
          inputSeries: [],
        },
      ],
      simulatedBaseCostByProjectId: { "proj-sparse": 100 },
      simulationCount: 20_000,
    })
    expect(brief.projects[0]!.metrics.baseCost).toBe(100)
    expect(brief.projects[0]!.metrics.p50).not.toBeNull()
    expect(brief.projects[0]!.distribution.p50).toBe(
      brief.projects[0]!.metrics.p50,
    )
  })
})

describe("ai-brief Ongoing development context", () => {
  function projectResults(
    projectId: string,
    values: number[],
  ): ProjectResult[] {
    return [
      {
        projectId,
        incurredCosts: 0,
        values,
        inputSeries: [],
      },
    ]
  }

  function valuesForPercentiles(p50: number, p85: number): number[] {
    return [
      ...Array.from({ length: 50 }, () => p50 - 10),
      ...Array.from({ length: 35 }, () => p50),
      ...Array.from({ length: 15 }, () => p85),
    ]
  }

  function archiveCompact(
    ongoing: ReturnType<typeof createInitialOngoingState>,
    args: { base: number; p50: number; p85: number },
  ) {
    const tip = getLatestCheckpoint(ongoing)!
    const project = tip.workspace.projects[0]!
    const values = valuesForPercentiles(args.p50, args.p85)
    const compact = buildOngoingCheckpointResultSnapshot({
      analysisId: "analysis-ai-brief",
      checkpointId: tip.id,
      projects: tip.workspace.projects,
      activeProjectId: project.id,
      projectResults: projectResults(project.id, values),
      simulatedBaseCostByProjectId: { [project.id]: args.base },
      inputSignature: `sig-${tip.sequence}-${args.base}`,
      simulationCount: values.length,
      resultPreferences: DEFAULT_RESULT_PREFERENCES,
    })
    assertNoHeavyValuesInOngoingSnapshot(compact)
    return archiveCheckpoint(ongoing, tip.id, compact)
  }

  function buildFiveCheckpointTimeline() {
    const blank = createBlankWorkspaceRuntimeState()
    let ongoing = createInitialOngoingState({
      projects: blank.projects,
      activeProjectId: blank.activeProjectId,
    })
    // CP1–CP4 archived with rising base/p50/p85; CP5 draft tip
    const archivedBases = [
      { base: 100, p50: 120, p85: 150 },
      { base: 110, p50: 130, p85: 165 },
      { base: 120, p50: 140, p85: 180 },
      { base: 125, p50: 145, p85: 190 },
    ]
    for (const m of archivedBases) {
      ongoing = archiveCompact(ongoing, m)
      const next = createNextCheckpoint(ongoing)
      expect(next.ok).toBe(true)
      if (!next.ok) throw new Error("createNext failed")
      ongoing = next.ongoing
    }
    return ongoing
  }

  it("A: Single AI Brief omits ongoingDevelopment; base prompt unchanged", () => {
    const brief = buildAiBriefV3({
      resultView: defaultResultView,
      language: "en",
      projects: [sparseProject()],
      activeProjectId: "proj-sparse",
      projectResults: [emptyResult("proj-sparse")],
      simulatedBaseCostByProjectId: { "proj-sparse": 100 },
      simulationCount: 20_000,
    })
    expect(brief).not.toHaveProperty("ongoingDevelopment")
    expect(messages.no.results.aiBriefClipboardPromptNo).not.toContain(
      "ongoingDevelopment",
    )
    expect(messages.en.results.aiBriefClipboardPromptEn).not.toContain(
      "ongoingDevelopment",
    )
    expect(messages.no.results.aiBriefClipboardPromptNo).not.toContain(
      "løpende analyse",
    )
    const src = resultsPanelSource()
    expect(src).toContain("aiBriefClipboardPromptOngoingAddendum")
    expect(src).toContain('analysisMode === "ongoing"')
  })

  it("B: viewed checkpoint is the analytical focus", () => {
    const ongoing = buildFiveCheckpointTimeline()
    const cp3 = ongoing.checkpoints.find((c) => c.sequence === 3)!
    const development = buildAiBriefOngoingDevelopment({
      checkpoints: ongoing.checkpoints,
      viewedCheckpointId: cp3.id,
    })
    expect(development).not.toBeNull()
    expect(development!.viewedCheckpointId).toBe(cp3.id)
    expect(development!.viewedSequence).toBe(3)
    expect(development!.interpretationNotes.currentCheckpointIsPrimaryFocus).toBe(
      true,
    )
    expect(development!.series[development!.series.length - 1]!.checkpointId).toBe(
      cp3.id,
    )
    const brief = buildAiBriefV3({
      resultView: defaultResultView,
      language: "en",
      projects: cp3.workspace.projects,
      activeProjectId: cp3.workspace.activeProjectId,
      projectResults: [],
      simulatedBaseCostByProjectId: {
        [cp3.workspace.activeProjectId]: 120,
      },
      simulationCount: 100,
      ongoingCompactResult: isOngoingCheckpointResultSnapshot(
        cp3.archivedSnapshot,
      )
        ? cp3.archivedSnapshot
        : null,
      ongoingDevelopment: development,
    })
    expect(brief.ongoingDevelopment!.viewedSequence).toBe(3)
    expect(brief.projects[0]!.metrics.baseCost).toBe(120)
  })

  it("C: historical cutoff — viewing CP3 excludes CP4+", () => {
    const ongoing = buildFiveCheckpointTimeline()
    const cp3 = ongoing.checkpoints.find((c) => c.sequence === 3)!
    const scoped = filterCheckpointsUpToViewed(ongoing.checkpoints, cp3.id)
    expect(scoped.map((c) => c.sequence)).toEqual([1, 2, 3])
    const development = buildAiBriefOngoingDevelopment({
      checkpoints: ongoing.checkpoints,
      viewedCheckpointId: cp3.id,
    })!
    expect(development.series.map((p) => p.sequence)).toEqual([1, 2, 3])
    expect(development.series.some((p) => p.sequence >= 4)).toBe(false)
  })

  it("D: active CP5 is focus; archived CP1–CP4 provide history", () => {
    const ongoing = buildFiveCheckpointTimeline()
    const tip = getLatestCheckpoint(ongoing)!
    expect(tip.status).toBe("draft")
    expect(tip.sequence).toBe(5)
    const projectId = tip.workspace.activeProjectId
    const liveValues = valuesForPercentiles(150, 200)
    const development = buildAiBriefOngoingDevelopment({
      checkpoints: ongoing.checkpoints,
      viewedCheckpointId: tip.id,
      viewedResultSource: {
        projectResults: projectResults(projectId, liveValues),
        simulatedBaseCostByProjectId: { [projectId]: 130 },
        resultsComparable: true,
      },
    })!
    expect(development.viewedStatus).toBe("draft")
    expect(development.viewedSequence).toBe(5)
    expect(development.series).toHaveLength(5)
    expect(development.series[4]!.source).toBe("live")
    expect(development.series[4]!.baseCost).toBe(130)
    expect(development.series.slice(0, 4).every((p) => p.source === "archived")).toBe(
      true,
    )
  })

  it("E: previous-checkpoint deltas are supplied for key figures", () => {
    const ongoing = buildFiveCheckpointTimeline()
    const tip = getLatestCheckpoint(ongoing)!
    const projectId = tip.workspace.activeProjectId
    const development = buildAiBriefOngoingDevelopment({
      checkpoints: ongoing.checkpoints,
      viewedCheckpointId: tip.id,
      viewedResultSource: {
        projectResults: projectResults(projectId, valuesForPercentiles(150, 200)),
        simulatedBaseCostByProjectId: { [projectId]: 130 },
        resultsComparable: true,
      },
    })!
    expect(development.previousComparison).not.toBeNull()
    expect(development.previousComparison!.previousSequence).toBe(4)
    // CP5 base 130 vs CP4 base 125
    expect(development.previousComparison!.deltas.baseCost).toBe(5)
    expect(development.previousComparison!.deltas.p50).not.toBeNull()
    expect(development.previousComparison!.deltas.p85).not.toBeNull()
    expect(
      development.previousComparison!.deltas.uncertaintySpanP85MinusBase,
    ).not.toBeNull()
  })

  it("F: P85 − Base Cost is calculated consistently per checkpoint", () => {
    const ongoing = buildFiveCheckpointTimeline()
    const cp2 = ongoing.checkpoints.find((c) => c.sequence === 2)!
    const development = buildAiBriefOngoingDevelopment({
      checkpoints: ongoing.checkpoints,
      viewedCheckpointId: cp2.id,
    })!
    for (const point of development.series) {
      if (point.baseCost !== null && point.p85 !== null) {
        expect(point.uncertaintySpanP85MinusBase).toBe(point.p85 - point.baseCost)
      }
      if (point.p50 !== null && point.p85 !== null) {
        expect(point.spreadP85MinusP50).toBe(point.p85 - point.p50)
      }
    }
    const cp2Point = development.series.find((p) => p.sequence === 2)!
    expect(cp2Point.baseCost).toBe(110)
    expect(cp2Point.uncertaintySpanP85MinusBase).toBe(
      (cp2Point.p85 as number) - (cp2Point.baseCost as number),
    )
  })

  it("G: prompt tells the AI to distinguish cost level from uncertainty", () => {
    expect(messages.no.results.aiBriefClipboardPromptOngoingAddendumNo).toContain(
      "kostnadsnivå",
    )
    expect(messages.no.results.aiBriefClipboardPromptOngoingAddendumNo).toContain(
      "usikkerhet",
    )
    expect(messages.no.results.aiBriefClipboardPromptOngoingAddendumNo).toContain(
      "uncertaintySpanP85MinusBase",
    )
    expect(messages.en.results.aiBriefClipboardPromptOngoingAddendumEn).toContain(
      "cost level",
    )
    expect(messages.en.results.aiBriefClipboardPromptOngoingAddendumEn).toContain(
      "uncertainty",
    )
    expect(messages.en.results.aiBriefClipboardPromptOngoingAddendumEn).toMatch(
      /distinguish/i,
    )
    const ongoing = buildFiveCheckpointTimeline()
    const cp2 = ongoing.checkpoints.find((c) => c.sequence === 2)!
    const development = buildAiBriefOngoingDevelopment({
      checkpoints: ongoing.checkpoints,
      viewedCheckpointId: cp2.id,
    })!
    expect(
      development.interpretationNotes
        .distinguishCostLevelMovementFromUncertaintyMovement,
    ).toBe(true)
  })

  it("H: CP1 produces a valid Ongoing brief without inventing history", () => {
    const blank = createBlankWorkspaceRuntimeState()
    const ongoing = createInitialOngoingState({
      projects: blank.projects,
      activeProjectId: blank.activeProjectId,
    })
    const tip = ongoing.checkpoints[0]!
    const projectId = tip.workspace.activeProjectId
    const development = buildAiBriefOngoingDevelopment({
      checkpoints: ongoing.checkpoints,
      viewedCheckpointId: tip.id,
      viewedResultSource: {
        projectResults: projectResults(projectId, valuesForPercentiles(120, 150)),
        simulatedBaseCostByProjectId: { [projectId]: 100 },
        resultsComparable: true,
      },
    })!
    expect(development.hasHistoricalDevelopment).toBe(false)
    expect(development.previousComparison).toBeNull()
    expect(development.series).toHaveLength(1)
    const brief = buildAiBriefV3({
      resultView: defaultResultView,
      language: "no",
      projects: tip.workspace.projects,
      activeProjectId: projectId,
      projectResults: projectResults(projectId, valuesForPercentiles(120, 150)),
      simulatedBaseCostByProjectId: { [projectId]: 100 },
      simulationCount: 100,
      ongoingDevelopment: development,
    })
    expect(brief.ongoingDevelopment!.hasHistoricalDevelopment).toBe(false)
  })

  it("I: archived results use frozen snapshot data (not recalculated arrays)", () => {
    const ongoing = buildFiveCheckpointTimeline()
    const cp2 = ongoing.checkpoints.find((c) => c.sequence === 2)!
    expect(isOngoingCheckpointResultSnapshot(cp2.archivedSnapshot)).toBe(true)
    const snap = cp2.archivedSnapshot as OngoingCheckpointResultSnapshotV1
    const development = buildAiBriefOngoingDevelopment({
      checkpoints: ongoing.checkpoints,
      viewedCheckpointId: cp2.id,
      // Intentionally omit live source — archived path must still work.
    })!
    const point = development.series.find((p) => p.checkpointId === cp2.id)!
    expect(point.source).toBe("archived")
    expect(point.baseCost).toBe(snap.keyFigures.baseCost)
    expect(point.p50).toBe(snap.keyFigures.percentiles["50"])
    expect(point.p85).toBe(snap.keyFigures.percentiles["85"])
    expect(point.expectedValue).toBe(snap.keyFigures.expectedValue)
  })

  it("J: Ongoing AI context stays compact with no raw Monte Carlo arrays", () => {
    const ongoing = buildFiveCheckpointTimeline()
    const tip = getLatestCheckpoint(ongoing)!
    const projectId = tip.workspace.activeProjectId
    const development = buildAiBriefOngoingDevelopment({
      checkpoints: ongoing.checkpoints,
      viewedCheckpointId: tip.id,
      viewedResultSource: {
        projectResults: projectResults(projectId, valuesForPercentiles(150, 200)),
        simulatedBaseCostByProjectId: { [projectId]: 130 },
        resultsComparable: true,
      },
    })!
    const brief = buildAiBriefV3({
      resultView: defaultResultView,
      language: "en",
      projects: tip.workspace.projects,
      activeProjectId: projectId,
      projectResults: [],
      simulatedBaseCostByProjectId: { [projectId]: 130 },
      simulationCount: 100,
      ongoingDevelopment: development,
    })
    const json = JSON.stringify(brief.ongoingDevelopment)
    expect(json).not.toMatch(/"values"\s*:/)
    expect(json).not.toMatch(/"inputSeries"\s*:/)
    // Compact series of scalars — far smaller than raw MC payloads.
    expect(json.length).toBeLessThan(8_000)
    for (const point of brief.ongoingDevelopment!.series) {
      expect(typeof point.baseCost === "number" || point.baseCost === null).toBe(
        true,
      )
      expect(Object.keys(point).sort()).toEqual(
        [
          "baseCost",
          "checkpointId",
          "expectedValue",
          "name",
          "p50",
          "p85",
          "sequence",
          "source",
          "spreadP85MinusP50",
          "uncertaintySpanP85MinusBase",
        ].sort(),
      )
    }
  })
})
