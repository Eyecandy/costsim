/**
 * Ongoing PDF cutoff + draft confirmation planning tests (A–J).
 */
import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { join } from "node:path"

import {
  archiveCheckpoint,
  createInitialOngoingState,
  createNextCheckpoint,
  getLatestCheckpoint,
} from "@/domain/analysis/analysisCheckpoint"
import {
  assertNoHeavyValuesInOngoingSnapshot,
  buildOngoingCheckpointResultSnapshot,
} from "@/domain/analysis/ongoingCheckpointResultSnapshot"
import { DEFAULT_RESULT_PREFERENCES } from "@/domain/results/resultPreferences"
import { buildSimulationInputSignature } from "@/domain/simulation/simulationInputSignature"
import { PRODUCT_NAME } from "@/shared/brand"
import { createBlankWorkspaceRuntimeState } from "@/domain/analysis/workspaceReset"
import type { ProjectResult } from "@/domain/simulation/simulationTypes"
import { buildOngoingPdfReportModel } from "@/pdf/ongoing/buildOngoingPdfReportModel"
import {
  buildOngoingPdfDraftConfirmCopy,
  planOngoingPdfExport,
  resolveOngoingPdfCutoff,
} from "@/pdf/ongoing/resolveOngoingPdfCutoff"
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

function archiveCompact(
  ongoing: ReturnType<typeof createInitialOngoingState>,
  args: { base: number; p50: number; p85: number; name?: string },
) {
  const tip = getLatestCheckpoint(ongoing)!
  const project = tip.workspace.projects[0]!
  const values = valuesForPercentiles(args.p50, args.p85)
  const compact = buildOngoingCheckpointResultSnapshot({
    analysisId: "analysis-cutoff",
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
  return archiveCheckpoint(ongoing, tip.id, compact)
}

const baseInput = {
  analysisName: "Cutoff study",
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
    contribution: "Contribution",
    history: "History",
    assumptions: "Assumptions",
    method: "Method",
  },
  coverCopy: {
    reportBasisArchivedOnly:
      "Report basis: Archived checkpoints up to and including {cutoffLabel}.",
    reportBasisWithExcludedDraft:
      "Report basis: Archived checkpoints up to and including {cutoffLabel}. {draftLabel} is active and is not included in the report.",
    reportMeaning: "Ongoing report meaning.",
    assumptionsContext:
      "The assumptions below apply to {cutoffLabel}, the latest archived checkpoint included in the report.",
  },
  methodParagraphs: ["Method."],
  generatedAt: "2026-09-16T12:00:00.000Z",
}

async function threeArchived() {
  const blank = createBlankWorkspaceRuntimeState()
  let ongoing = createInitialOngoingState(blank, { checkpointName: "CP1" })
  ongoing = archiveCompact(ongoing, { base: 100, p50: 110, p85: 120 })
  const n2 = createNextCheckpoint(ongoing, { name: "CP2" })
  expect(n2.ok).toBe(true)
  if (!n2.ok) throw new Error("n2")
  ongoing = archiveCompact(n2.ongoing, { base: 200, p50: 210, p85: 220 })
  const n3 = createNextCheckpoint(ongoing, { name: "CP3" })
  expect(n3.ok).toBe(true)
  if (!n3.ok) throw new Error("n3")
  ongoing = archiveCompact(n3.ongoing, { base: 300, p50: 310, p85: 320 })
  return ongoing
}

describe("Ongoing PDF cutoff A–J", () => {
  it("A: archived historical cutoff includes CP1+CP2 only; latest is CP2", async () => {
    const ongoing = await threeArchived()
    const cp2 = ongoing.checkpoints.find((c) => c.sequence === 2)!
    const cp3 = ongoing.checkpoints.find((c) => c.sequence === 3)!

    const resolved = resolveOngoingPdfCutoff({
      checkpoints: ongoing.checkpoints,
      selectedCheckpointId: cp2.id,
    })
    expect(resolved.ok).toBe(true)
    if (!resolved.ok) return
    expect(resolved.cutoffCheckpointId).toBe(cp2.id)
    expect(resolved.selectedIsDraft).toBe(false)

    const built = buildOngoingPdfReportModel({
      ...baseInput,
      checkpoints: ongoing.checkpoints,
      cutoffCheckpointId: cp2.id,
    })
    expect(built.ok).toBe(true)
    if (!built.ok) return
    expect(built.model.cutoff.checkpointId).toBe(cp2.id)
    expect(built.model.cutoff.sequence).toBe(2)
    expect(built.model.history.map((h) => h.sequence)).toEqual([1, 2])
    expect(built.model.cover.currentStatus.baseCost).toBe(200)
    expect(built.model.latestDetail.keyFigures.baseCost).toBe(200)
    expect(built.model.history.some((h) => h.id === cp3.id)).toBe(false)
  })

  it("B: development ends at cutoff CP2", async () => {
    const ongoing = await threeArchived()
    const cp2 = ongoing.checkpoints.find((c) => c.sequence === 2)!
    const built = buildOngoingPdfReportModel({
      ...baseInput,
      checkpoints: ongoing.checkpoints,
      cutoffCheckpointId: cp2.id,
    })
    expect(built.ok).toBe(true)
    if (!built.ok) return
    expect(built.model.development.points.map((p) => p.sequence)).toEqual([
      1, 2,
    ])
    expect(built.model.development.points.at(-1)!.baseCost).toBe(200)
  })

  it("C: history rows CP1 + CP2 only", async () => {
    const ongoing = await threeArchived()
    const cp2 = ongoing.checkpoints.find((c) => c.sequence === 2)!
    const built = buildOngoingPdfReportModel({
      ...baseInput,
      checkpoints: ongoing.checkpoints,
      cutoffCheckpointId: cp2.id,
    })
    expect(built.ok).toBe(true)
    if (!built.ok) return
    expect(built.model.history.map((h) => h.name)).toEqual(["CP1", "CP2"])
  })

  it("D: detail uses CP2 frozen snapshot, not CP3", async () => {
    const ongoing = await threeArchived()
    const cp2 = ongoing.checkpoints.find((c) => c.sequence === 2)!
    const built = buildOngoingPdfReportModel({
      ...baseInput,
      checkpoints: ongoing.checkpoints,
      cutoffCheckpointId: cp2.id,
    })
    expect(built.ok).toBe(true)
    if (!built.ok) return
    expect(built.model.latestDetail.checkpointId).toBe(cp2.id)
    expect(built.model.latestDetail.keyFigures.baseCost).toBe(200)
    expect(built.model.latestDetail.sCurve).not.toBeNull()
  })

  it("E: change is CP2 vs CP1", async () => {
    const ongoing = await threeArchived()
    const cp2 = ongoing.checkpoints.find((c) => c.sequence === 2)!
    const built = buildOngoingPdfReportModel({
      ...baseInput,
      checkpoints: ongoing.checkpoints,
      cutoffCheckpointId: cp2.id,
    })
    expect(built.ok).toBe(true)
    if (!built.ok) return
    expect(built.model.cover.comparison?.previous.sequence).toBe(1)
    expect(built.model.cover.comparison?.current.sequence).toBe(2)
    const base = built.model.cover.comparison!.rows.find(
      (r) => r.metricId === "baseCost",
    )!
    expect(base.change).toBe(100)
  })

  it("F: active draft selection plans confirm; continue uses CP2 cutoff", async () => {
    const blank = createBlankWorkspaceRuntimeState()
    let ongoing = createInitialOngoingState(blank, { checkpointName: "CP1" })
    ongoing = archiveCompact(ongoing, { base: 100, p50: 110, p85: 120 })
    const n2 = createNextCheckpoint(ongoing, { name: "CP2" })
    expect(n2.ok).toBe(true)
    if (!n2.ok) return
    ongoing = archiveCompact(n2.ongoing, { base: 200, p50: 210, p85: 220 })
    const n3 = createNextCheckpoint(ongoing, { name: "CP3 draft" })
    expect(n3.ok).toBe(true)
    if (!n3.ok) return
    ongoing = n3.ongoing
    const draft = getLatestCheckpoint(ongoing)!
    expect(draft.status).toBe("draft")

    const plan = planOngoingPdfExport({
      checkpoints: ongoing.checkpoints,
      selectedCheckpointId: draft.id,
    })
    expect(plan.action).toBe("confirm")
    if (plan.action !== "confirm") return
    expect(plan.cutoffCheckpoint.sequence).toBe(2)
    expect(plan.selectedCheckpoint.id).toBe(draft.id)

    const built = buildOngoingPdfReportModel({
      ...baseInput,
      checkpoints: ongoing.checkpoints,
      cutoffCheckpointId: plan.cutoffCheckpointId,
    })
    expect(built.ok).toBe(true)
    if (!built.ok) return
    expect(built.model.cutoff.sequence).toBe(2)
    expect(built.model.history).toHaveLength(2)
    expect(built.model.history.every((h) => h.sequence <= 2)).toBe(true)
    expect(built.model.development.points.every((p) => p.sequence <= 2)).toBe(
      true,
    )
    expect(built.model.excludedDraft?.sequence).toBe(3)
    expect(built.model.excludedDraft?.name).toBe("CP3 draft")
    // Draft name may appear in exclusion metadata only — not as analytical content.
    expect(built.model.history.some((h) => h.name === "CP3 draft")).toBe(false)
    expect(built.model.latestDetail.name).not.toBe("CP3 draft")
  })

  it("G: first draft / no archive blocks export", () => {
    const blank = createBlankWorkspaceRuntimeState()
    const ongoing = createInitialOngoingState(blank)
    const draft = ongoing.checkpoints[0]!
    const plan = planOngoingPdfExport({
      checkpoints: ongoing.checkpoints,
      selectedCheckpointId: draft.id,
    })
    expect(plan).toEqual({
      action: "block",
      reason: "no_archived_checkpoints",
    })
  })

  it("H: archived selected generates directly (no confirm)", async () => {
    const ongoing = await threeArchived()
    const cp2 = ongoing.checkpoints.find((c) => c.sequence === 2)!
    const plan = planOngoingPdfExport({
      checkpoints: ongoing.checkpoints,
      selectedCheckpointId: cp2.id,
    })
    expect(plan.action).toBe("generate")
    if (plan.action !== "generate") return
    expect(plan.cutoffCheckpointId).toBe(cp2.id)
  })

  it("I: Single PDF path unchanged (smoke)", () => {
    const panel = readSrc("src/features/results/ResultsPanel.tsx") + readSrc("src/features/results/pdfExport.tsx")
    expect(panel).toContain('if (analysisMode === "ongoing")')
    expect(panel).toContain("planOngoingPdfExport")
    expect(panel).toContain("ConfirmDialog")
    expect(panel).toContain("ProjectReportDocument")
    expect(panel).toMatch(
      /analysisMode === "ongoing"[\s\S]*planOngoingPdfExport/,
    )
  })

  it("J: no later leakage — CP3 values/names absent from cutoff CP2 model", async () => {
    const ongoing = await threeArchived()
    const cp2 = ongoing.checkpoints.find((c) => c.sequence === 2)!
    const cp3 = ongoing.checkpoints.find((c) => c.sequence === 3)!
    const built = buildOngoingPdfReportModel({
      ...baseInput,
      checkpoints: ongoing.checkpoints,
      cutoffCheckpointId: cp2.id,
    })
    expect(built.ok).toBe(true)
    if (!built.ok) return
    const serialized = JSON.stringify(built.model)
    expect(serialized).not.toContain(cp3.id)
    expect(serialized).not.toContain('"CP3"')
    expect(serialized).not.toContain('"baseCost":300')
    expect(built.model.cover.currentStatus.baseCost).toBe(200)
    expect(built.model.cover.checkpointContext.archivedCount).toBe(2)
  })

  it("K: draft confirm copy interpolates CP labels, not i18n key paths", () => {
    const no = buildOngoingPdfDraftConfirmCopy({
      draftSequence: 3,
      cutoffSequence: 2,
      titleTemplate: "{label} er ikke arkivert",
      bodyTemplate:
        "Rapporten vil baseres på arkiverte sjekkpunkter til og med {cutoffLabel}. {draftLabel} må arkiveres før det kan inkluderes i rapporten.",
    })
    expect(no.title).toBe("CP3 er ikke arkivert")
    expect(no.message).toBe(
      "Rapporten vil baseres på arkiverte sjekkpunkter til og med CP2. CP3 må arkiveres før det kan inkluderes i rapporten.",
    )
    expect(no.message).not.toContain("checkpoint.sequenceLabel")
    expect(no.message).not.toContain("checkpoints.sequenceLabel")

    const en = buildOngoingPdfDraftConfirmCopy({
      draftSequence: 3,
      cutoffSequence: 2,
      titleTemplate: "{label} is not archived",
      bodyTemplate:
        "The report will be based on archived checkpoints up to and including {cutoffLabel}. {draftLabel} must be archived before it can be included in the report.",
    })
    expect(en.title).toBe("CP3 is not archived")
    expect(en.message).toBe(
      "The report will be based on archived checkpoints up to and including CP2. CP3 must be archived before it can be included in the report.",
    )
    expect(en.message).not.toContain("checkpoint.sequenceLabel")

    const panel = readSrc("src/features/results/ResultsPanel.tsx")
    expect(panel).toContain("buildOngoingPdfDraftConfirmCopy")
    expect(panel).not.toContain('t("checkpoint.sequenceLabel")')
  })
})
