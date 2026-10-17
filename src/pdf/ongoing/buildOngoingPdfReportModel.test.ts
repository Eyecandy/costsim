/**
 * Ongoing PDF information architecture tests (A–K refinement).
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
import { buildArchivedAnalysisSnapshot } from "@/lib/buildArchivedAnalysisSnapshot"
import { buildOngoingDevelopmentSeries } from "@/lib/ongoingDevelopmentSeries"
import {
  assertNoHeavyValuesInOngoingSnapshot,
  buildOngoingCheckpointResultSnapshot,
  isLegacyHeavyArchivedSnapshot,
  isOngoingCheckpointResultSnapshot,
} from "@/lib/ongoingCheckpointResultSnapshot"
import { DEFAULT_RESULT_PREFERENCES } from "@/lib/resultPreferences"
import { buildSimulationInputSignature } from "@/lib/simulationInputSignature"
import { PRODUCT_NAME } from "@/lib/brand"
import { createBlankWorkspaceRuntimeState } from "@/lib/workspaceReset"
import type { ProjectResult } from "@/simulation.worker"
import {
  buildOngoingPdfReportModel,
  extractFrozenPdfKeyFigures,
} from "@/pdf/ongoing/buildOngoingPdfReportModel"
import {
  ONGOING_PDF_REPORT_KIND,
  ONGOING_PDF_SECTION_IDS,
} from "@/pdf/ongoing/ongoingPdfTypes"
import { buildPdfReportModelForMode } from "@/pdf/exportPdfReport"
import { messages } from "@/i18n/messages"

const repoRoot = join(import.meta.dirname, "../../..")

function readSrc(relativePath: string): string {
  return readFileSync(join(repoRoot, relativePath), "utf8")
}

function projectResults(
  projectId: string,
  values: number[],
  incurredCosts = 0,
): ProjectResult[] {
  return [
    {
      projectId,
      incurredCosts,
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

function setTipAssumptions(
  ongoing: ReturnType<typeof createInitialOngoingState>,
  texts: string[],
) {
  const tip = getLatestCheckpoint(ongoing)!
  tip.workspace.projects[0] = {
    ...tip.workspace.projects[0]!,
    assumptions: texts.map((text, i) => ({ id: `a-${i}`, text })),
  }
  return ongoing
}

function archiveCompact(
  ongoing: ReturnType<typeof createInitialOngoingState>,
  args: {
    base: number
    p50: number
    p85: number
    analysisId?: string
    assumptionTexts?: string[]
  },
) {
  let state = ongoing
  if (args.assumptionTexts) {
    state = setTipAssumptions(state, args.assumptionTexts)
  }
  const tip = getLatestCheckpoint(state)!
  const project = tip.workspace.projects[0]!
  const values = valuesForPercentiles(args.p50, args.p85)
  const compact = buildOngoingCheckpointResultSnapshot({
    analysisId: args.analysisId ?? "analysis-pdf",
    checkpointId: tip.id,
    projects: tip.workspace.projects,
    activeProjectId: project.id,
    projectResults: projectResults(project.id, values),
    simulatedBaseCostByProjectId: { [project.id]: args.base },
    inputSignature: buildSimulationInputSignature(tip.workspace.projects),
    simulationCount: values.length,
    resultPreferences: DEFAULT_RESULT_PREFERENCES,
  })
  assertNoHeavyValuesInOngoingSnapshot(compact)
  return archiveCheckpoint(state, tip.id, compact)
}

function archiveLegacyHeavy(
  ongoing: ReturnType<typeof createInitialOngoingState>,
  args: { base: number; p50: number; p85: number },
) {
  const tip = getLatestCheckpoint(ongoing)!
  const projectId = tip.workspace.activeProjectId
  const values = valuesForPercentiles(args.p50, args.p85)
  const snap = buildArchivedAnalysisSnapshot({
    projects: tip.workspace.projects,
    activeProjectId: projectId,
    projectResults: projectResults(projectId, values),
    simulatedBaseCostByProjectId: { [projectId]: args.base },
    inputSignature: `legacy-${tip.sequence}-${args.base}`,
    simulationCount: values.length,
    resultPreferences: DEFAULT_RESULT_PREFERENCES,
  })
  return archiveCheckpoint(ongoing, tip.id, snap)
}

const keyFigureLabels = {
  baseCost: "Base cost",
  p50: "P50",
  p85: "P85",
  expectedValue: "Expected value",
}

const sectionLabels = {
  development: "Development",
  latest: "Latest archived checkpoint",
  sCurve: "S-curve",
  tornado: "Tornado",
  contribution: "Contribution",
  history: "Checkpoint history",
  assumptions: "Assumptions",
  method: "About the analysis method",
}

const coverCopy = {
  reportBasisArchivedOnly:
    "Report basis: Archived checkpoints up to and including {cutoffLabel}.",
  reportBasisWithExcludedDraft:
    "Report basis: Archived checkpoints up to and including {cutoffLabel}. {draftLabel} is active and is not included in the report.",
  reportMeaning:
    "The report shows how the ongoing uncertainty analysis has developed up to the latest archived checkpoint included in the report basis.",
  assumptionsContext:
    "The assumptions below apply to {cutoffLabel}, the latest archived checkpoint included in the report.",
}

const baseInput = {
  analysisName: "Bridge upgrade",
  lifecycle: "active" as const,
  language: "en" as const,
  brandName: PRODUCT_NAME,
  reportKindLabel: "Ongoing uncertainty analysis",
  keyFigureLabels,
  sectionLabels,
  coverCopy,
  methodParagraphs: ["Method paragraph."],
  generatedAt: "2026-09-16T12:00:00.000Z",
}

function latestArchivedCutoffId(
  checkpoints: readonly { id: string; status: string; sequence: number }[],
): string {
  const archived = checkpoints
    .filter((c) => c.status === "archived")
    .sort((a, b) => a.sequence - b.sequence)
  return archived[archived.length - 1]!.id
}

function buildWithCutoff(
  checkpoints: ReturnType<typeof createInitialOngoingState>["checkpoints"],
  cutoffCheckpointId: string,
) {
  return buildOngoingPdfReportModel({
    ...baseInput,
    checkpoints,
    cutoffCheckpointId,
  })
}

function buildWithLatestCutoff(
  checkpoints: ReturnType<typeof createInitialOngoingState>["checkpoints"],
) {
  return buildWithCutoff(checkpoints, latestArchivedCutoffId(checkpoints))
}

describe("Ongoing PDF information architecture A–K", () => {
  it("A: active draft report basis names cutoff and excluded draft", () => {
    const blank = createBlankWorkspaceRuntimeState()
    let ongoing = createInitialOngoingState(blank, { checkpointName: "CP1" })
    ongoing = archiveCompact(ongoing, { base: 100, p50: 120, p85: 150 })
    const n2 = createNextCheckpoint(ongoing, { name: "CP2" })
    expect(n2.ok).toBe(true)
    if (!n2.ok) return
    ongoing = archiveCompact(n2.ongoing, { base: 200, p50: 220, p85: 280 })
    const n3 = createNextCheckpoint(ongoing, { name: "CP3 draft" })
    expect(n3.ok).toBe(true)
    if (!n3.ok) return
    ongoing = n3.ongoing

    const cp2 = ongoing.checkpoints.find((c) => c.sequence === 2)!
    const built = buildWithCutoff(ongoing.checkpoints, cp2.id)
    expect(built.ok).toBe(true)
    if (!built.ok) return
    expect(built.model.cutoff.sequence).toBe(2)
    expect(built.model.cutoff.displayLabel).toBe("CP2")
    expect(built.model.excludedDraft?.sequence).toBe(3)
    expect(built.model.excludedDraft?.displayLabel).toBe("CP3")
    expect(built.model.cover.reportBasisText).toContain("CP2")
    expect(built.model.cover.reportBasisText).toContain("CP3")
    expect(built.model.cover.reportBasisText).toMatch(/not included/i)
    expect(built.model.cover.reportMeaningText.length).toBeGreaterThan(20)
    expect(built.model.history).toHaveLength(2)
    expect(built.model.history.every((h) => h.sequence <= 2)).toBe(true)
  })

  it("B: archived cutoff uses simple report-basis copy (no draft message)", () => {
    const blank = createBlankWorkspaceRuntimeState()
    let ongoing = createInitialOngoingState(blank, { checkpointName: "CP1" })
    ongoing = archiveCompact(ongoing, { base: 100, p50: 120, p85: 150 })
    const n2 = createNextCheckpoint(ongoing, { name: "CP2" })
    expect(n2.ok).toBe(true)
    if (!n2.ok) return
    ongoing = archiveCompact(n2.ongoing, { base: 200, p50: 220, p85: 280 })

    const cp2 = ongoing.checkpoints.find((c) => c.sequence === 2)!
    const built = buildWithCutoff(ongoing.checkpoints, cp2.id)
    expect(built.ok).toBe(true)
    if (!built.ok) return
    expect(built.model.excludedDraft).toBeNull()
    expect(built.model.cover.reportBasisText).toBe(
      "Report basis: Archived checkpoints up to and including CP2.",
    )
    expect(built.model.cover.reportBasisText).not.toMatch(/not included/i)
  })

  it("C: cover comparison table includes previous, current, and delta", () => {
    const blank = createBlankWorkspaceRuntimeState()
    let ongoing = createInitialOngoingState(blank)
    ongoing = archiveCompact(ongoing, { base: 100, p50: 120, p85: 150 })
    const next = createNextCheckpoint(ongoing, { name: "CP2" })
    expect(next.ok).toBe(true)
    if (!next.ok) return
    ongoing = archiveCompact(next.ongoing, { base: 130, p50: 140, p85: 145 })

    const built = buildWithLatestCutoff(ongoing.checkpoints)
    expect(built.ok).toBe(true)
    if (!built.ok) return
    expect(built.model.cover.comparison).not.toBeNull()
    expect(built.model.cover.comparison!.previous.sequence).toBe(1)
    expect(built.model.cover.comparison!.current.sequence).toBe(2)
    const base = built.model.cover.comparison!.rows.find(
      (r) => r.metricId === "baseCost",
    )!
    expect(base.previous).toBe(100)
    expect(base.current).toBe(130)
    expect(base.change).toBe(30)
    expect(base.previousFormatted.length).toBeGreaterThan(0)
    expect(base.currentFormatted.length).toBeGreaterThan(0)
    expect(base.changeFormatted).toMatch(/\+/)
  })

  it("D: standalone Change since previous section is absent", () => {
    const blank = createBlankWorkspaceRuntimeState()
    let ongoing = createInitialOngoingState(blank)
    ongoing = archiveCompact(ongoing, { base: 100, p50: 120, p85: 150 })
    const next = createNextCheckpoint(ongoing, { name: "CP2" })
    expect(next.ok).toBe(true)
    if (!next.ok) return
    ongoing = archiveCompact(next.ongoing, { base: 110, p50: 130, p85: 170 })

    const built = buildWithLatestCutoff(ongoing.checkpoints)
    expect(built.ok).toBe(true)
    if (!built.ok) return
    expect(built.model).not.toHaveProperty("changeSincePrevious")
    expect(
      built.model.cover.tocEntries.some((e) => String(e.id).includes("change")),
    ).toBe(false)

    const doc = readSrc("src/pdf/ongoing/OngoingReportDocument.tsx")
    expect(doc).not.toContain("ONGOING_PDF_SECTION_IDS.change")
    expect(doc).not.toMatch(/Change since previous checkpoint/)
    expect(ONGOING_PDF_SECTION_IDS).not.toHaveProperty("change")
  })

  it("E: compact Development remains below comparison in cover model", () => {
    const blank = createBlankWorkspaceRuntimeState()
    let ongoing = createInitialOngoingState(blank)
    ongoing = archiveCompact(ongoing, { base: 100, p50: 120, p85: 150 })
    const next = createNextCheckpoint(ongoing, { name: "Decision" })
    expect(next.ok).toBe(true)
    if (!next.ok) return
    ongoing = archiveCompact(next.ongoing, { base: 110, p50: 130, p85: 170 })

    const expected = buildOngoingDevelopmentSeries({
      checkpoints: ongoing.checkpoints,
    })
    const built = buildWithLatestCutoff(ongoing.checkpoints)
    expect(built.ok).toBe(true)
    if (!built.ok) return
    expect(built.model.development).toEqual(expected)
    expect(built.model.cover.comparison).not.toBeNull()
    expect(built.model.cover.reportBasisText.length).toBeGreaterThan(0)

    const doc = readSrc("src/pdf/ongoing/OngoingReportDocument.tsx")
    const comparisonIdx = doc.indexOf("cover.comparison")
    const developmentIdx = doc.indexOf("labels.developmentTitle")
    expect(comparisonIdx).toBeGreaterThan(0)
    expect(developmentIdx).toBeGreaterThan(comparisonIdx)
  })

  it("F: assumptions come from cutoff frozen checkpoint, not later draft", () => {
    const blank = createBlankWorkspaceRuntimeState()
    let ongoing = createInitialOngoingState(blank, { checkpointName: "CP1" })
    ongoing = archiveCompact(ongoing, {
      base: 100,
      p50: 110,
      p85: 120,
      assumptionTexts: ["CP1 premise"],
    })
    const n2 = createNextCheckpoint(ongoing, { name: "CP2" })
    expect(n2.ok).toBe(true)
    if (!n2.ok) return
    ongoing = archiveCompact(n2.ongoing, {
      base: 200,
      p50: 210,
      p85: 220,
      assumptionTexts: ["CP2 frozen premise"],
    })
    const n3 = createNextCheckpoint(ongoing, { name: "CP3 draft" })
    expect(n3.ok).toBe(true)
    if (!n3.ok) return
    ongoing = setTipAssumptions(n3.ongoing, ["CP3 draft premise — exclude"])

    const cp2 = ongoing.checkpoints.find((c) => c.sequence === 2)!
    const built = buildWithCutoff(ongoing.checkpoints, cp2.id)
    expect(built.ok).toBe(true)
    if (!built.ok) return
    expect(built.model.latestDetail.assumptions).toEqual(["CP2 frozen premise"])
    expect(built.model.latestDetail.assumptions).not.toContain(
      "CP3 draft premise — exclude",
    )
    expect(built.model.latestDetail.assumptionsContextText).toContain("CP2")
  })

  it("G: empty assumptions omit section and TOC entry", () => {
    const blank = createBlankWorkspaceRuntimeState()
    let ongoing = createInitialOngoingState(blank)
    ongoing = archiveCompact(ongoing, { base: 50, p50: 60, p85: 70 })

    const built = buildWithLatestCutoff(ongoing.checkpoints)
    expect(built.ok).toBe(true)
    if (!built.ok) return
    expect(built.model.latestDetail.assumptions).toEqual([])
    expect(built.model.latestDetail.assumptionsContextText).toBeNull()
    expect(
      built.model.cover.tocEntries.some(
        (e) => e.id === ONGOING_PDF_SECTION_IDS.assumptions,
      ),
    ).toBe(false)

    const doc = readSrc("src/pdf/ongoing/OngoingReportDocument.tsx")
    expect(doc).toContain("hasAssumptions")
    expect(doc).not.toContain("assumptionsEmptyText")
  })

  it("H: Tornado section has explicit new-page behavior", () => {
    const doc = readSrc("src/pdf/ongoing/OngoingReportDocument.tsx")
    const tornadoBlock = doc.slice(
      doc.indexOf("Tornado — always starts on a new page"),
      doc.indexOf("Contribution — always starts on a new page"),
    )
    expect(tornadoBlock).toContain("<Page")
    expect(tornadoBlock).toContain("ONGOING_PDF_SECTION_IDS.tornado")
    expect(doc).toContain("Tornado — always starts on a new page")
  })

  it("I: Contribution section has explicit new-page behavior", () => {
    const doc = readSrc("src/pdf/ongoing/OngoingReportDocument.tsx")
    const contributionBlock = doc.slice(
      doc.indexOf("Contribution — always starts on a new page"),
      doc.indexOf("Checkpoint history"),
    )
    expect(contributionBlock).toContain("<Page")
    expect(contributionBlock).toContain("ONGOING_PDF_SECTION_IDS.contribution")
  })

  it("J: method remains after analytical/history content; renamed for Ongoing", () => {
    const blank = createBlankWorkspaceRuntimeState()
    let ongoing = createInitialOngoingState(blank)
    ongoing = archiveCompact(ongoing, {
      base: 80,
      p50: 90,
      p85: 110,
      assumptionTexts: ["Premise A"],
    })

    const built = buildWithLatestCutoff(ongoing.checkpoints)
    expect(built.ok).toBe(true)
    if (!built.ok) return
    const tocIds = built.model.cover.tocEntries.map((e) => e.id)
    const assumptionsIdx = tocIds.indexOf(ONGOING_PDF_SECTION_IDS.assumptions)
    const latestIdx = tocIds.indexOf(ONGOING_PDF_SECTION_IDS.latest)
    const historyIdx = tocIds.indexOf(ONGOING_PDF_SECTION_IDS.history)
    const methodIdx = tocIds.indexOf(ONGOING_PDF_SECTION_IDS.method)
    expect(assumptionsIdx).toBeGreaterThanOrEqual(0)
    expect(assumptionsIdx).toBeLessThan(latestIdx)
    expect(latestIdx).toBeLessThan(historyIdx)
    expect(historyIdx).toBeLessThan(methodIdx)

    expect(messages.no.results.pdfOngoingMethodTitle).toBe("Om analysemetoden")
    expect(messages.en.results.pdfOngoingMethodTitle).toBe(
      "About the analysis method",
    )
    // Single PDF method title unchanged
    expect(messages.no.results.pdfMethodTitle).toMatch(/^06/)
    expect(messages.en.results.pdfMethodTitle).toMatch(/^06/)
  })

  it("K: Single PDF builders remain separate (regression smoke)", () => {
    const exportSrc = readSrc("src/pdf/exportPdfReport.ts")
    expect(exportSrc).toContain('mode === "ongoing"')
    const panel = readSrc("src/components/ResultsPanel.tsx")
    expect(panel).toContain('if (analysisMode === "ongoing")')
    expect(panel).toContain("ProjectReportDocument")
    expect(panel).toContain("OngoingReportDocument")
    expect(
      buildPdfReportModelForMode("single", {
        ...baseInput,
        checkpoints: [],
        cutoffCheckpointId: "unused",
      }).mode,
    ).toBe("single")

    const singleModel = readSrc("src/pdf/buildPdfReportModel.ts")
    expect(singleModel).not.toContain("OngoingPdfReportModel")
    const singleDoc = readSrc("src/pdf/ProjectReportDocument.tsx")
    expect(singleDoc).toContain("methodTitle")
    expect(panel).toContain('t("results.pdfMethodTitle")')
    expect(panel).toContain('t("results.pdfOngoingMethodTitle")')
  })

  it("legacy: cover latest status / draft exclusion / history / compact path", () => {
    const blank = createBlankWorkspaceRuntimeState()
    let ongoing = createInitialOngoingState(blank)
    ongoing = archiveCompact(ongoing, { base: 100, p50: 120, p85: 150 })
    const next = createNextCheckpoint(ongoing, { name: "CP2" })
    expect(next.ok).toBe(true)
    if (!next.ok) return
    ongoing = archiveCompact(next.ongoing, { base: 200, p50: 220, p85: 280 })

    const built = buildWithLatestCutoff(ongoing.checkpoints)
    expect(built.ok).toBe(true)
    if (!built.ok) return
    expect(built.model.kind).toBe(ONGOING_PDF_REPORT_KIND)
    expect(built.model.cover.currentStatus.baseCost).toBe(200)
    expect(built.model.latestDetail.keyFigures.baseCost).toBe(200)
    expect(built.model.cover.checkpointContext.archivedCount).toBe(2)

    // single CP omits comparison
    let single = createInitialOngoingState(blank)
    single = archiveCompact(single, { base: 50, p50: 60, p85: 70 })
    const singleBuilt = buildWithLatestCutoff(single.checkpoints)
    expect(singleBuilt.ok).toBe(true)
    if (!singleBuilt.ok) return
    expect(singleBuilt.model.cover.comparison).toBeNull()

    // draft excluded
    const draftNext = createNextCheckpoint(ongoing, { name: "Draft CP3" })
    expect(draftNext.ok).toBe(true)
    if (!draftNext.ok) return
    const withDraft = draftNext.ongoing
    const draftBuilt = buildWithLatestCutoff(withDraft.checkpoints)
    expect(draftBuilt.ok).toBe(true)
    if (!draftBuilt.ok) return
    expect(draftBuilt.model.history).toHaveLength(2)
    expect(
      draftBuilt.model.history.some((h) => h.name === "Draft CP3"),
    ).toBe(false)

    // compact / legacy frozen sources
    const snap = ongoing.checkpoints.find((c) => c.sequence === 1)!
      .archivedSnapshot
    expect(isOngoingCheckpointResultSnapshot(snap)).toBe(true)
    expect(JSON.stringify(built.model)).not.toMatch(/"values":\s*\[/)

    let legacyOngoing = createInitialOngoingState(blank)
    legacyOngoing = archiveLegacyHeavy(legacyOngoing, {
      base: 80,
      p50: 90,
      p85: 110,
    })
    expect(
      isLegacyHeavyArchivedSnapshot(
        legacyOngoing.checkpoints[0]!.archivedSnapshot,
      ),
    ).toBe(true)
    const legacyBuilt = buildWithLatestCutoff(legacyOngoing.checkpoints)
    expect(legacyBuilt.ok).toBe(true)
    if (!legacyBuilt.ok) return
    expect(legacyBuilt.model.history[0]!.frozenSource).toBe("legacy")
    expect(
      extractFrozenPdfKeyFigures(legacyOngoing.checkpoints[0]!)?.baseCost,
    ).toBe(80)
  })

  it("TOC maps to rendered section ids (no change / assumptionsMethod)", () => {
    const blank = createBlankWorkspaceRuntimeState()
    let ongoing = createInitialOngoingState(blank)
    ongoing = archiveCompact(ongoing, {
      base: 100,
      p50: 120,
      p85: 150,
      assumptionTexts: ["Keep"],
    })
    const next = createNextCheckpoint(ongoing, { name: "CP2" })
    expect(next.ok).toBe(true)
    if (!next.ok) return
    ongoing = archiveCompact(next.ongoing, { base: 110, p50: 130, p85: 170 })

    const built = buildWithLatestCutoff(ongoing.checkpoints)
    expect(built.ok).toBe(true)
    if (!built.ok) return

    const tocIds = built.model.cover.tocEntries.flatMap((e) => [
      e.id,
      ...(e.subsections?.map((s) => s.id) ?? []),
    ])
    expect(tocIds).toContain(ONGOING_PDF_SECTION_IDS.development)
    expect(tocIds).toContain(ONGOING_PDF_SECTION_IDS.assumptions)
    expect(tocIds).toContain(ONGOING_PDF_SECTION_IDS.latest)
    expect(tocIds).toContain(ONGOING_PDF_SECTION_IDS.history)
    expect(tocIds).toContain(ONGOING_PDF_SECTION_IDS.method)
    expect(tocIds).not.toContain("ongoing-pdf-change")
    expect(tocIds).not.toContain("ongoing-pdf-assumptions-method")

    const doc = readSrc("src/pdf/ongoing/OngoingReportDocument.tsx")
    expect(doc).toContain("ONGOING_PDF_SECTION_IDS.development")
    expect(doc).toContain("ONGOING_PDF_SECTION_IDS.assumptions")
    expect(doc).toContain("ONGOING_PDF_SECTION_IDS.latest")
    expect(doc).toContain("ONGOING_PDF_SECTION_IDS.history")
    expect(doc).toContain("ONGOING_PDF_SECTION_IDS.method")
    expect(doc).toContain("ONGOING_PDF_SECTION_IDS.tornado")
    expect(doc).toContain("ONGOING_PDF_SECTION_IDS.contribution")
  })
})
