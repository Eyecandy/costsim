import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { join } from "node:path"

import {
  MAX_CHECKPOINTS,
  archiveCheckpoint,
  canCreateNextCheckpoint,
  checkpointPrimaryStageId,
  cloneWorkspacePreservingIds,
  createInitialOngoingState,
  createNextCheckpoint,
  ensureSingleProjectWorkspace,
  getCreateNextCheckpointBlockReason,
  hasDraftCheckpoint,
  selectCheckpoint,
} from "@/domain/analysis/analysisCheckpoint"
import {
  diffRowIds,
  extractCheckpointAnalyticalSlice,
  getPrecedingCheckpointPair,
} from "@/domain/analysis/checkpointDiff"
import { buildArchivedAnalysisSnapshot } from "@/domain/analysis/buildArchivedAnalysisSnapshot"
import {
  canArchiveCurrentResults,
  getArchiveBlockReason,
} from "@/domain/analysis/buildArchivedAnalysisSnapshot"
import { DEFAULT_RESULT_PREFERENCES } from "@/domain/results/resultPreferences"
import { createBlankWorkspaceRuntimeState } from "@/domain/analysis/workspaceReset"
import { buildSimulationInputSignature } from "@/domain/simulation/simulationInputSignature"
import type { ProjectResult } from "@/domain/simulation/simulationTypes"
import type { Project } from "@/domain/analysis/project"
import { repoRoot } from "@/test-utils/repoRoot"
import { readAppSource } from "@/test-utils/appSource"


function snapshotFor(projects: Project[], activeProjectId: string) {
  const fakeResults: ProjectResult[] = projects.map((p) => ({
    projectId: p.id,
    incurredCosts: 0,
    values: [100, 110, 120, 130, 140],
    inputSeries: [],
  }))
  return buildArchivedAnalysisSnapshot({
    projects,
    activeProjectId,
    projectResults: fakeResults,
    simulatedBaseCostByProjectId: Object.fromEntries(
      projects.map((p) => [p.id, 100]),
    ),
    inputSignature: JSON.stringify(projects),
    simulationCount: 20_000,
    resultPreferences: DEFAULT_RESULT_PREFERENCES,
  })
}

function archiveTip(
  ongoing: ReturnType<typeof createInitialOngoingState>,
  projects: Project[],
  activeProjectId: string,
) {
  const tip = [...ongoing.checkpoints].sort((a, b) => a.sequence - b.sequence).at(
    -1,
  )!
  return archiveCheckpoint(
    ongoing,
    tip.id,
    snapshotFor(projects, activeProjectId),
  )
}

describe("checkpoint lifecycle", () => {
  it("cannot create next checkpoint while active checkpoint is draft", () => {
    const blank = createBlankWorkspaceRuntimeState()
    const ongoing = createInitialOngoingState({
      projects: blank.projects,
      activeProjectId: blank.activeProjectId,
    })
    expect(hasDraftCheckpoint(ongoing)).toBe(true)
    expect(getCreateNextCheckpointBlockReason(ongoing)).toBe("has_draft")
    expect(canCreateNextCheckpoint(ongoing)).toBe(false)
    expect(createNextCheckpoint(ongoing).ok).toBe(false)
  })

  it("cannot archive checkpoint without valid simulation / when stale", () => {
    const blank = createBlankWorkspaceRuntimeState()
    expect(
      getArchiveBlockReason({
        projects: blank.projects,
        projectResults: [],
        lastSimulatedInputSignature: "",
      }),
    ).toBe("no_results")
    expect(
      canArchiveCurrentResults({
        projects: blank.projects,
        projectResults: [],
        lastSimulatedInputSignature: "",
      }),
    ).toBe(false)

    const sig = JSON.stringify(blank.projects)
    const results: ProjectResult[] = [
      {
        projectId: blank.projects[0]!.id,
        incurredCosts: 0,
        values: [1, 2, 3],
        inputSeries: [],
      },
    ]
    expect(
      getArchiveBlockReason({
        projects: blank.projects,
        projectResults: results,
        lastSimulatedInputSignature: sig,
      }),
    ).toBeNull()

    const editedName = [
      { ...blank.projects[0]!, name: "Changed" },
    ]
    expect(
      getArchiveBlockReason({
        projects: editedName,
        projectResults: results,
        lastSimulatedInputSignature: sig,
      }),
    ).toBeNull()

    const editedModel = [
      {
        ...blank.projects[0]!,
        costRows: blank.projects[0]!.costRows.map((r, i) =>
          i === 0
            ? {
                ...r,
                name: "Cost",
                optimistic: "90",
                likely: "100",
                pessimistic: "110",
              }
            : r,
        ),
      },
    ]
    expect(
      getArchiveBlockReason({
        projects: editedModel,
        projectResults: results,
        lastSimulatedInputSignature: sig,
      }),
    ).toBe("stale_results")
  })

  it("archives tip then creates next with new id, sequence, preserved row ids", () => {
    const blank = createBlankWorkspaceRuntimeState()
    const project = blank.projects[0]!
    // Ensure there is at least one cost and driver id to preserve.
    const withRows: Project = {
      ...project,
      costRows:
        project.costRows.length > 0
          ? project.costRows
          : [
              {
                id: "cost-stable",
                name: "C",
                optimistic: "90",
                likely: "100",
                pessimistic: "110",
              },
            ],
      driverRows:
        project.driverRows.length > 0
          ? project.driverRows
          : [
              {
                id: "drv-stable",
                name: "D",
                optimistic: "0.9",
                likely: "1",
                pessimistic: "1.1",
              },
            ],
      driverImpacts: project.driverImpacts,
      costCorrelations: project.costCorrelations,
      profile: { phase: "preliminary_design" },
    }
    let ongoing = createInitialOngoingState({
      projects: [withRows],
      activeProjectId: withRows.id,
    })
    const costIds = withRows.costRows.map((r) => r.id)
    const driverIds = withRows.driverRows.map((r) => r.id)
    const projectId = withRows.id

    ongoing = archiveTip(ongoing, [withRows], withRows.id)
    expect(ongoing.checkpoints[0]!.status).toBe("archived")
    expect(ongoing.checkpoints[0]!.archivedSnapshot).toBeDefined()
    expect(canCreateNextCheckpoint(ongoing)).toBe(true)

    const created = createNextCheckpoint(ongoing, {
      name: "Investment decision",
    })
    expect(created.ok).toBe(true)
    if (!created.ok) return

    expect(created.newCheckpoint.id).not.toBe(created.sourceCheckpoint.id)
    expect(created.newCheckpoint.sequence).toBe(2)
    expect(created.newCheckpoint.status).toBe("draft")
    expect(created.newCheckpoint.archivedAt).toBeNull()
    expect(created.newCheckpoint.name).toBe("Investment decision")
    expect(created.ongoing.checkpoints.filter((c) => c.status === "draft")).toHaveLength(
      1,
    )
    expect(created.ongoing.activeCheckpointId).toBe(created.newCheckpoint.id)

    const cloned = created.newCheckpoint.workspace.projects[0]!
    // Project.id intentionally preserved (same alternative over time).
    expect(cloned.id).toBe(projectId)
    expect(cloned.costRows.map((r) => r.id)).toEqual(costIds)
    expect(cloned.driverRows.map((r) => r.id)).toEqual(driverIds)
    expect(cloned.profile?.phase).toBe("preliminary_design")
    expect(cloned.driverImpacts).toEqual(withRows.driverImpacts)
  })

  it("prior checkpoint profile remains immutable after editing next", () => {
    const blank = createBlankWorkspaceRuntimeState()
    const p0 = {
      ...blank.projects[0]!,
      profile: { phase: "preliminary_design" },
    }
    let ongoing = createInitialOngoingState({
      projects: [p0],
      activeProjectId: p0.id,
    })
    ongoing = archiveTip(ongoing, [p0], p0.id)
    const created = createNextCheckpoint(ongoing)
    expect(created.ok).toBe(true)
    if (!created.ok) return

    const edited = {
      ...created.ongoing,
      checkpoints: created.ongoing.checkpoints.map((c) =>
        c.id === created.newCheckpoint.id
          ? {
              ...c,
              workspace: ensureSingleProjectWorkspace({
                projects: [
                  {
                    ...c.workspace.projects[0]!,
                    profile: { phase: "execution" },
                  },
                ],
                activeProjectId: c.workspace.activeProjectId,
              }),
            }
          : c,
      ),
    }
    expect(checkpointPrimaryStageId(edited.checkpoints[0]!)).toBe(
      "preliminary_design",
    )
    expect(checkpointPrimaryStageId(edited.checkpoints[1]!)).toBe("execution")
  })

  it("inherits a compact result whose signature detects later edits", () => {
    const blank = createBlankWorkspaceRuntimeState()
    let ongoing = createInitialOngoingState({
      projects: blank.projects,
      activeProjectId: blank.activeProjectId,
    })
    ongoing = archiveTip(ongoing, blank.projects, blank.activeProjectId)
    const created = createNextCheckpoint(ongoing)
    expect(created.ok).toBe(true)
    if (!created.ok) return

    const inherited = created.inheritedResult
    expect(inherited.sCurve.points.length).toBeGreaterThan(0)
    expect(JSON.stringify(inherited)).not.toContain('"values"')
    expect(inherited.inputSignature).toBe(
      buildSimulationInputSignature(created.newCheckpoint.workspace.projects),
    )

    const editedProjects = [
      {
        ...created.newCheckpoint.workspace.projects[0]!,
        costRows: created.newCheckpoint.workspace.projects[0]!.costRows.map(
          (r, i) =>
            i === 0
              ? {
                  ...r,
                  name: "Cost",
                  optimistic: "90",
                  likely: "999",
                  pessimistic: "110",
                }
              : r,
        ),
      },
    ]
    const rerunSig = buildSimulationInputSignature(editedProjects)
    expect(rerunSig).not.toBe(inherited.inputSignature)
  })

  it("navigation restores historical workspace from selected checkpoint", () => {
    const blank = createBlankWorkspaceRuntimeState()
    const p1 = {
      ...blank.projects[0]!,
      profile: { phase: "concept" },
    }
    let ongoing = createInitialOngoingState({
      projects: [p1],
      activeProjectId: p1.id,
    })
    ongoing = archiveTip(ongoing, [p1], p1.id)
    const created = createNextCheckpoint(ongoing, { name: "CP2" })
    expect(created.ok).toBe(true)
    if (!created.ok) return

    const back = selectCheckpoint(created.ongoing, created.sourceCheckpoint.id)
    expect(back?.activeCheckpointId).toBe(created.sourceCheckpoint.id)
    expect(checkpointPrimaryStageId(back!.checkpoints[0]!)).toBe("concept")

    const fwd = selectCheckpoint(back!, created.newCheckpoint.id)
    expect(fwd?.activeCheckpointId).toBe(created.newCheckpoint.id)
  })

  it("enforces MAX_CHECKPOINTS safely", () => {
    const blank = createBlankWorkspaceRuntimeState()
    let ongoing = createInitialOngoingState({
      projects: blank.projects,
      activeProjectId: blank.activeProjectId,
    })
    for (let i = 0; i < MAX_CHECKPOINTS - 1; i++) {
      ongoing = archiveTip(
        ongoing,
        ongoing.checkpoints.at(-1)!.workspace.projects,
        ongoing.checkpoints.at(-1)!.workspace.activeProjectId,
      )
      const next = createNextCheckpoint(ongoing)
      expect(next.ok).toBe(true)
      if (!next.ok) return
      ongoing = next.ongoing
    }
    expect(ongoing.checkpoints).toHaveLength(MAX_CHECKPOINTS)
    ongoing = archiveTip(
      ongoing,
      ongoing.checkpoints.at(-1)!.workspace.projects,
      ongoing.checkpoints.at(-1)!.workspace.activeProjectId,
    )
    expect(getCreateNextCheckpointBlockReason(ongoing)).toBe("at_limit")
    expect(createNextCheckpoint(ongoing).ok).toBe(false)
  })

  it("cloneWorkspacePreservingIds does not regenerate row ids (unlike duplicateProject)", () => {
    const blank = createBlankWorkspaceRuntimeState()
    const source = {
      projects: blank.projects,
      activeProjectId: blank.activeProjectId,
    }
    const cloned = cloneWorkspacePreservingIds(source)
    expect(cloned.projects[0]!.id).toBe(source.projects[0]!.id)
    expect(cloned.projects[0]!.costRows.map((r) => r.id)).toEqual(
      source.projects[0]!.costRows.map((r) => r.id),
    )
  })

  it("checkpointDiff helpers expose shared row identity for future comparison", () => {
    const blank = createBlankWorkspaceRuntimeState()
    let ongoing = createInitialOngoingState({
      projects: blank.projects,
      activeProjectId: blank.activeProjectId,
    })
    ongoing = archiveTip(ongoing, blank.projects, blank.activeProjectId)
    const created = createNextCheckpoint(ongoing)
    expect(created.ok).toBe(true)
    if (!created.ok) return
    const pair = getPrecedingCheckpointPair(
      created.ongoing.checkpoints,
      created.newCheckpoint.id,
    )
    expect(pair).not.toBeNull()
    const earlier = extractCheckpointAnalyticalSlice(pair!.earlier)
    const later = extractCheckpointAnalyticalSlice(pair!.later)
    expect(earlier.projectId).toBe(later.projectId)
    const costs = diffRowIds(earlier.costRowIds, later.costRowIds)
    expect(costs.shared.length).toBe(earlier.costRowIds.length)
    expect(costs.onlyEarlier).toEqual([])
    expect(costs.onlyLater).toEqual([])
  })

  it("Single Analysis UI paths remain gated away from checkpoint lifecycle", () => {
    const app = readAppSource()
    expect(app).toContain("archiveActiveCheckpoint")
    expect(app).toContain("CreateNextCheckpointDialog")
    expect(app).toContain('isOngoingAnalysis')
    expect(app).toMatch(/isOngoingAnalysis\s*\?\s*[\s\S]*archiveActiveCheckpoint/)
    expect(app).toContain('librarySession.docMeta?.status === "archived"')
    const dup = readFileSync(
      join(repoRoot, "src/domain/analysis/cloneAnalysisWorkspace.ts"),
      "utf8",
    )
    expect(dup).toContain("fresh project/row IDs")
  })
})
