import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { join } from "node:path"

import {
  archiveCheckpoint,
  createInitialOngoingState,
  createNextCheckpoint,
} from "@/domain/analysis/analysisCheckpoint"
import { buildArchivedAnalysisSnapshot } from "@/domain/analysis/buildArchivedAnalysisSnapshot"
import {
  getLiveResultValidity,
  isLiveResultValid,
} from "@/domain/simulation/liveSimulationState"
import type { Project } from "@/domain/analysis/project"
import { DEFAULT_RESULT_PREFERENCES } from "@/domain/results/resultPreferences"
import { buildSimulationInputSignature } from "@/domain/simulation/simulationInputSignature"
import { createBlankWorkspaceRuntimeState } from "@/domain/analysis/workspaceReset"
import type { ProjectResult } from "@/domain/simulation/simulationTypes"
import { repoRoot } from "@/test-utils/repoRoot"

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
    inputSignature: buildSimulationInputSignature(projects),
    simulationCount: 20_000,
    resultPreferences: DEFAULT_RESULT_PREFERENCES,
  })
}

function archiveTip(
  ongoing: ReturnType<typeof createInitialOngoingState>,
  projects: Project[],
  activeProjectId: string,
) {
  const tip = [...ongoing.checkpoints]
    .sort((a, b) => a.sequence - b.sequence)
    .at(-1)!
  return archiveCheckpoint(
    ongoing,
    tip.id,
    snapshotFor(projects, activeProjectId),
  )
}

describe("ongoing checkpoint Project.name from analysis name", () => {
  it("CP2+ uses Ongoing Analysis name; CP1 history stays frozen; IDs preserved", () => {
    const blank = createBlankWorkspaceRuntimeState()
    const cp1Project: Project = {
      ...blank.projects[0]!,
      name: "Alternativ A",
    }
    const costIds = cp1Project.costRows.map((r) => r.id)
    const driverIds = cp1Project.driverRows.map((r) => r.id)
    const projectId = cp1Project.id
    const analysisName = "Nytt laboratoriebygg"

    let ongoing = createInitialOngoingState({
      projects: [cp1Project],
      activeProjectId: cp1Project.id,
    })
    ongoing = archiveTip(ongoing, [cp1Project], cp1Project.id)

    const cp1Before = structuredClone(ongoing.checkpoints[0]!)
    expect(cp1Before.workspace.projects[0]!.name).toBe("Alternativ A")

    const cp2 = createNextCheckpoint(ongoing, {
      name: "Checkpoint 2",
      analysisName,
    })
    expect(cp2.ok).toBe(true)
    if (!cp2.ok) return

    expect(cp2.newCheckpoint.workspace.projects[0]!.name).toBe(analysisName)
    expect(cp2.sourceCheckpoint.workspace.projects[0]!.name).toBe(
      "Alternativ A",
    )
    expect(
      cp2.ongoing.checkpoints.find((c) => c.sequence === 1)!.workspace
        .projects[0]!.name,
    ).toBe("Alternativ A")
    // Source checkpoint object in the returned ongoing is not rewritten.
    expect(
      JSON.stringify(
        cp2.ongoing.checkpoints.find((c) => c.id === cp1Before.id)!.workspace,
      ),
    ).toBe(JSON.stringify(cp1Before.workspace))

    const cp2Project = cp2.newCheckpoint.workspace.projects[0]!
    expect(cp2Project.id).toBe(projectId)
    expect(cp2Project.costRows.map((r) => r.id)).toEqual(costIds)
    expect(cp2Project.driverRows.map((r) => r.id)).toEqual(driverIds)

    // Name-only change must not invalidate inherited analytical results.
    expect(cp2.inheritedResult.inputSignature).toBe(
      buildSimulationInputSignature(cp2.newCheckpoint.workspace.projects),
    )
    expect(cp2.inheritedResult.checkpointId).toBe(cp2.newCheckpoint.id)
    expect(JSON.stringify(cp2.inheritedResult)).not.toContain('"values"')

    // Signature equality: renamed vs original project name are analytically identical.
    expect(buildSimulationInputSignature([cp2Project])).toBe(
      buildSimulationInputSignature([{ ...cp2Project, name: "Alternativ A" }]),
    )

    // Archive CP2 and create CP3 — same rule.
    ongoing = archiveCheckpoint(
      cp2.ongoing,
      cp2.newCheckpoint.id,
      snapshotFor(
        cp2.newCheckpoint.workspace.projects,
        cp2.newCheckpoint.workspace.activeProjectId,
      ),
    )
    const cp2Archived = ongoing.checkpoints.find((c) => c.sequence === 2)!
    expect(cp2Archived.workspace.projects[0]!.name).toBe(analysisName)

    const cp3 = createNextCheckpoint(ongoing, {
      name: "Checkpoint 3",
      analysisName,
    })
    expect(cp3.ok).toBe(true)
    if (!cp3.ok) return
    expect(cp3.newCheckpoint.workspace.projects[0]!.name).toBe(analysisName)
    expect(cp3.newCheckpoint.workspace.projects[0]!.id).toBe(projectId)
    expect(
      cp3.ongoing.checkpoints.find((c) => c.sequence === 1)!.workspace
        .projects[0]!.name,
    ).toBe("Alternativ A")
    expect(
      cp3.ongoing.checkpoints.find((c) => c.sequence === 2)!.workspace
        .projects[0]!.name,
    ).toBe(analysisName)
  })

  it("without analysisName, cloned Project.name is preserved (no silent rename)", () => {
    const blank = createBlankWorkspaceRuntimeState()
    const project: Project = {
      ...blank.projects[0]!,
      name: "Alternativ A",
    }
    let ongoing = createInitialOngoingState({
      projects: [project],
      activeProjectId: project.id,
    })
    ongoing = archiveTip(ongoing, [project], project.id)
    const created = createNextCheckpoint(ongoing)
    expect(created.ok).toBe(true)
    if (!created.ok) return
    expect(created.newCheckpoint.workspace.projects[0]!.name).toBe(
      "Alternativ A",
    )
  })

  it("Single Analysis multi-alternative naming is unaffected by this Ongoing-only path", () => {
    const blank = createBlankWorkspaceRuntimeState()
    const a = { ...blank.projects[0]!, id: "a", name: "Alternativ A" }
    const b = {
      ...structuredClone(blank.projects[0]!),
      id: "b",
      name: "Alternativ B",
    }
    // Single Analysis keeps independent Project names; createNextCheckpoint is Ongoing-only.
    expect(a.name).toBe("Alternativ A")
    expect(b.name).toBe("Alternativ B")
    expect(a.name).not.toBe(b.name)

    const session = readFileSync(
      join(repoRoot, "src/lib/useLibraryAnalysisSession.ts"),
      "utf8",
    )
    expect(session).toContain("analysisName: existing.name")
    const checkpoint = readFileSync(
      join(repoRoot, "src/domain/analysis/analysisCheckpoint.ts"),
      "utf8",
    )
    expect(checkpoint).toContain("applyOngoingAnalysisNameToWorkspace")
    expect(checkpoint).toContain("options?.analysisName")
  })
})
