import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { join } from "node:path"

import { buildAiBriefV3 } from "@/domain/results/aiBrief"
import { buildKeyFigureMetricTableRows } from "@/domain/results/keyFiguresMetricRows"
import {
  DEFAULT_RESULT_PREFERENCES,
  cloneResultPreferences,
  resolveResultView,
} from "@/domain/results/resultPreferences"
import type { Project } from "@/domain/analysis/project"
import type { ProjectResult } from "@/domain/simulation/simulationTypes"
import { messages } from "@/i18n/messages"
import { repoRoot } from "@/test-utils/repoRoot"


function readSrc(rel: string) {
  return readFileSync(join(repoRoot, rel), "utf8")
}

const labels = {
  baseCost: "Base",
  expectedAddition: "Expected addition",
  expectedValue: "Expected value",
  uncertaintyPremium: "Uncertainty reserve",
  stdDev: "Std Dev",
  probabilityAtBaseCost: "P(at base)",
  probabilityBelowCostLevel: "Probability below {amount}",
  locked: "Locked",
}

function sampleValues(): number[] {
  return Array.from({ length: 101 }, (_, i) => 1_000_000 + i * 100_000)
}

describe("resolveResultView + export consumers", () => {
  it("snapshots active prefs including resolved S-curve percentiles", () => {
    const active = cloneResultPreferences(DEFAULT_RESULT_PREFERENCES)
    active.keyFigures.percentiles = [15, 50, 85]
    active.keyFigures.showStdDev = true
    active.keyFigures.probabilityBelowCostLevel = {
      enabled: true,
      amount: 8_181_000_000,
    }
    active.sCurve.useKeyFigurePercentiles = true

    const view = resolveResultView(active)
    expect(view.keyFigures.percentiles).toEqual([15, 50, 85])
    expect(view.keyFigures.showStdDev).toBe(true)
    expect(view.keyFigures.probabilityBelowCostLevel).toEqual({
      enabled: true,
      amount: 8_181_000_000,
    })
    expect(view.sCurve.percentiles).toEqual([15, 50, 85])
    expect("displayMode" in view.sCurve).toBe(false)

    // Mutating the source after snapshot must not change the snapshot.
    active.keyFigures.percentiles = [50, 85]
    expect(view.keyFigures.percentiles).toEqual([15, 50, 85])
  })

  it("PDF Key Figures follow ACTIVE view, not saved default P50/P85", () => {
    const savedDefault = cloneResultPreferences(DEFAULT_RESULT_PREFERENCES)
    expect(savedDefault.keyFigures.percentiles).toEqual([50, 85])

    const active = cloneResultPreferences(savedDefault)
    active.keyFigures.percentiles = [15, 50, 85]
    active.keyFigures.showBaseCost = true
    active.keyFigures.showExpectedValue = false
    active.keyFigures.showExpectedAddition = false
    active.keyFigures.showUncertaintyReserve = false
    active.keyFigures.showStdDev = true
    active.keyFigures.probabilityBelowCostLevel = {
      enabled: true,
      amount: 8_181_000_000,
    }

    const resultView = resolveResultView(active)
    const projects = [{ id: "a", incurredCosts: 0 }]
    const values = sampleValues()
    const rows = buildKeyFigureMetricTableRows({
      resultView,
      projects,
      valuesByProjectId: new Map([["a", values]]),
      baseCostByProjectId: new Map([["a", 5_000_000]]),
      simulatedIncurredByProjectId: new Map([["a", 0]]),
      language: "en",
      labels,
    })

    const ids = rows.map((r) => r.id)
    expect(ids).toContain("p15")
    expect(ids).toContain("p50")
    expect(ids).toContain("p85")
    expect(ids).toContain("stdDev")
    expect(ids).toContain("probBelowCostLevel")
    expect(ids).not.toContain("expectedAddition")
    expect(ids).not.toContain("uncertaintyReserve")
  })

  it("AI Brief receives active resultView while keeping full analysis data", () => {
    const savedDefault = cloneResultPreferences(DEFAULT_RESULT_PREFERENCES)
    expect(savedDefault.keyFigures.percentiles).toEqual([50, 85])

    const active = cloneResultPreferences(savedDefault)
    active.keyFigures.percentiles = [15, 50, 85]
    active.keyFigures.showStdDev = true
    active.keyFigures.probabilityBelowCostLevel = {
      enabled: true,
      amount: 8_181_000_000,
    }
    active.sCurve.useKeyFigurePercentiles = true

    const project: Project = {
      id: "proj-a",
      name: "Alt A",
      incurredCosts: 0,
      assumptions: [],
      costRows: [
        {
          id: "c1",
          name: "Cost",
          optimistic: "-10",
          likely: "100",
          pessimistic: "20",
        },
      ],
      driverRows: [],
      driverImpacts: {},
      costCorrelations: {},
    }
    const values = sampleValues()
    const projectResults: ProjectResult[] = [
      {
        projectId: "proj-a",
        incurredCosts: 0,
        values,
        inputSeries: [],
      },
    ]

    const brief = buildAiBriefV3({
      language: "en",
      projects: [project],
      activeProjectId: "proj-a",
      projectResults,
      simulatedBaseCostByProjectId: { "proj-a": 5_000_000 },
      simulationCount: 20_000,
      resultView: resolveResultView(active),
    })

    expect(brief.currentResultView.keyFigures.percentiles).toEqual([
      15, 50, 85,
    ])
    expect(brief.currentResultView.sCurve.percentiles).toEqual([15, 50, 85])
    expect(
      brief.currentResultView.keyFigures.probabilityBelowCostLevel.amount,
    ).toBe(8_181_000_000)
    expect(
      brief.currentResultView.keyFigures.probabilityBelowCostLevel
        .probabilityPercentByProjectId?.["proj-a"],
    ).not.toBeNull()
    // Full analysis still present (not filtered to visible KF only)
    expect(brief.projects[0]!.metrics.p50).not.toBeNull()
    expect(brief.projects[0]!.metrics.p85).not.toBeNull()
    expect(brief.projects[0]!.distribution.p10).not.toBeNull()
    expect(brief.projects[0]!.costItems.length).toBeGreaterThan(0)
  })

  it("PDF/AI generation paths snapshot active prefs and do not read localStorage", () => {
    const panel = readSrc("src/features/results/ResultsPanel.tsx") + readSrc("src/features/results/pdfExport.tsx")
    const pdfDoc = readSrc("src/pdf/ProjectReportDocument.tsx")
    const aiBrief = readSrc("src/domain/results/aiBrief.ts")
    const kfRows = readSrc("src/domain/results/keyFiguresMetricRows.ts")

    expect(panel).toContain("resolveResultView(resultPreferences)")
    expect(panel).toContain("resultViewSnapshot")
    expect(panel).toContain("buildKeyFigureMetricTableRows")
    // The snapshot is taken in ResultsPanel and handed to pdfExport as sCurvePercentiles.
    expect(panel).toContain(
      "sCurvePercentiles: resultViewSnapshot.sCurve.percentiles",
    )
    expect(panel).toContain("sCurveMarkerPercentiles={sCurvePercentiles}")
    expect(panel).toContain("resultView: resultViewSnapshot")
    expect(panel).not.toMatch(
      /handleDownloadPdf[\s\S]{0,2500}loadResultPreferences/,
    )
    expect(panel).not.toMatch(
      /handleCopyAiBriefPackage[\s\S]{0,1200}loadResultPreferences/,
    )
    expect(panel).not.toMatch(
      /handleDownloadPdf[\s\S]{0,2500}RESULT_PREFERENCES_STORAGE_KEY/,
    )
    expect(panel).not.toMatch(
      /handleCopyAiBriefPackage[\s\S]{0,1200}RESULT_PREFERENCES_STORAGE_KEY/,
    )

    expect(pdfDoc).toContain("sCurveMarkerPercentiles")
    expect(pdfDoc).not.toContain("sCurveDisplayMode")
    expect(pdfDoc).not.toContain("loadResultPreferences")
    expect(pdfDoc).not.toContain("localStorage")

    expect(aiBrief).toContain("currentResultView")
    expect(aiBrief).toContain("resultView: ResolvedResultView")
    expect(aiBrief).not.toContain("loadResultPreferences")
    expect(aiBrief).not.toContain("RESULT_PREFERENCES_STORAGE_KEY")
    expect(aiBrief).not.toMatch(/\blocalStorage\.(get|set)Item\b/)

    expect(kfRows).not.toContain("loadResultPreferences")
    expect(kfRows).not.toContain("RESULT_PREFERENCES_STORAGE_KEY")
    expect(kfRows).not.toMatch(/\blocalStorage\.(get|set)Item\b/)

    expect(messages.no.results.pdfSCurveFootnote).toContain("{percentiles}")
    expect(messages.en.results.pdfSCurveFootnote).toContain("{percentiles}")
    expect(messages.no.results.aiBriefClipboardPromptNo).toContain(
      "currentResultView",
    )
    expect(messages.en.results.aiBriefClipboardPromptEn).toContain(
      "currentResultView",
    )
  })
})
