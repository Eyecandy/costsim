import { beforeEach, describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { join } from "node:path"

import {
  archiveCheckpoint,
  createInitialOngoingState,
  createNextCheckpoint,
  getActiveCheckpoint,
} from "@/domain/analysis/analysisCheckpoint"
import {
  buildArchivedAnalysisSnapshot,
  canArchiveCurrentResults,
  getArchiveBlockReason,
} from "@/domain/analysis/buildArchivedAnalysisSnapshot"
import { getAnalysisLibraryRepository } from "@/persistence/analysisLibraryRepository"
import { clearLocalAnalysisLibraryStorageForTests } from "@/persistence/localAnalysisLibraryRepository"
import { DEFAULT_RESULT_PREFERENCES } from "@/domain/results/resultPreferences"
import { createBlankWorkspaceRuntimeState } from "@/domain/analysis/workspaceReset"
import { buildSimulationInputSignature } from "@/domain/simulation/simulationInputSignature"
import type { ProjectResult } from "@/domain/simulation/simulationTypes"
import { repoRoot } from "@/test-utils/repoRoot"

function resultsFor(projectId: string): ProjectResult[] {
  return [
    {
      projectId,
      incurredCosts: 0,
      values: [100, 110, 120, 130, 140],
      inputSeries: [],
    },
  ]
}

function snapshotFor(
  projects: ReturnType<typeof createBlankWorkspaceRuntimeState>["projects"],
  activeProjectId: string,
) {
  return buildArchivedAnalysisSnapshot({
    projects,
    activeProjectId,
    projectResults: resultsFor(activeProjectId),
    simulatedBaseCostByProjectId: { [activeProjectId]: 100 },
    inputSignature: JSON.stringify(projects),
    simulationCount: 20_000,
    resultPreferences: DEFAULT_RESULT_PREFERENCES,
  })
}

describe("archive validation after simulation", () => {
  beforeEach(() => {
    clearLocalAnalysisLibraryStorageForTests()
  })

  it("rejects archive with no results; accepts immediately after matching simulation signature", () => {
    const blank = createBlankWorkspaceRuntimeState()
    const projects = blank.projects

    expect(
      getArchiveBlockReason({
        projects,
        projectResults: [],
        lastSimulatedInputSignature: "",
      }),
    ).toBe("no_results")
    expect(
      canArchiveCurrentResults({
        projects,
        projectResults: [],
        lastSimulatedInputSignature: "",
      }),
    ).toBe(false)

    // Successful simulation: results + signature of current projects
    const signature = JSON.stringify(projects)
    const projectResults = resultsFor(projects[0]!.id)
    expect(
      getArchiveBlockReason({
        projects,
        projectResults,
        lastSimulatedInputSignature: signature,
      }),
    ).toBeNull()
    expect(
      canArchiveCurrentResults({
        projects,
        projectResults,
        lastSimulatedInputSignature: signature,
      }),
    ).toBe(true)
  })

  it("editing inputs after simulation makes archive invalid until rerun", () => {
    const blank = createBlankWorkspaceRuntimeState()
    const signature = JSON.stringify(blank.projects)
    const projectResults = resultsFor(blank.projects[0]!.id)

    expect(
      getArchiveBlockReason({
        projects: blank.projects,
        projectResults,
        lastSimulatedInputSignature: signature,
      }),
    ).toBeNull()

    const edited = [
      {
        ...blank.projects[0]!,
        costRows: blank.projects[0]!.costRows.map((r, i) =>
          i === 0 ? { ...r, likely: "999" } : r,
        ),
      },
    ]
    expect(
      getArchiveBlockReason({
        projects: edited,
        projectResults,
        lastSimulatedInputSignature: signature,
      }),
    ).toBe("stale_results")

    const rerunSig = JSON.stringify(edited)
    expect(
      getArchiveBlockReason({
        projects: edited,
        projectResults,
        lastSimulatedInputSignature: rerunSig,
      }),
    ).toBeNull()
  })

  it("ongoing: active draft checkpoint archives from live results; prior archived CP unchanged", async () => {
    const repo = getAnalysisLibraryRepository()
    const blank = createBlankWorkspaceRuntimeState()
    const project = blank.projects[0]!

    const created = await repo.create({
      name: "Ongoing archive eligibility",
      analysisMode: "ongoing",
      workspace: {
        projects: blank.projects,
        activeProjectId: blank.activeProjectId,
      },
    })
    expect(created.analysisMode).toBe("ongoing")
    expect(created.ongoing?.checkpoints).toHaveLength(1)

    // No results yet
    expect(
      getArchiveBlockReason({
        projects: blank.projects,
        projectResults: [],
        lastSimulatedInputSignature: "",
      }),
    ).toBe("no_results")

    // Simulate then archive CP1
    const sig1 = JSON.stringify(blank.projects)
    const snap1 = snapshotFor(blank.projects, blank.activeProjectId)
    expect(
      canArchiveCurrentResults({
        projects: blank.projects,
        projectResults: snap1.projectResults,
        lastSimulatedInputSignature: sig1,
      }),
    ).toBe(true)

    let ongoing = archiveCheckpoint(
      created.ongoing!,
      created.ongoing!.activeCheckpointId,
      snap1,
    )
    await repo.saveDraft({
      ...created,
      ongoing,
      workspace: ensureWorkspace(ongoing),
      draftResultSeed: undefined,
    })

    const cp1Id = ongoing.checkpoints[0]!.id
    expect(ongoing.checkpoints[0]!.status).toBe("archived")

    const next = createNextCheckpoint(ongoing)
    expect(next.ok).toBe(true)
    if (!next.ok) return
    ongoing = next.ongoing

    // Create-next carries only compact display results, never live MC totals.
    expect(next.inheritedResult.inputSignature).toBe(
      buildSimulationInputSignature(next.newCheckpoint.workspace.projects),
    )
    expect(JSON.stringify(next.inheritedResult)).not.toContain('"values"')

    // Edit display name — descriptive only; still archive-eligible
    const renamedProjects = [
      {
        ...next.newCheckpoint.workspace.projects[0]!,
        name: "CP2 renamed",
      },
    ]
    expect(buildSimulationInputSignature(renamedProjects)).toBe(
      next.inheritedResult.inputSignature,
    )

    // Model edit + "simulate" on CP2
    const editedProjects = [
      {
        ...next.newCheckpoint.workspace.projects[0]!,
        name: "CP2 edited",
        costRows: next.newCheckpoint.workspace.projects[0]!.costRows.map(
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
    expect(buildSimulationInputSignature(editedProjects)).not.toBe(
      next.inheritedResult.inputSignature,
    )

    const sig2 = buildSimulationInputSignature(editedProjects)
    const snap2 = snapshotFor(editedProjects, editedProjects[0]!.id)
    expect(
      getArchiveBlockReason({
        projects: editedProjects,
        projectResults: snap2.projectResults,
        lastSimulatedInputSignature: sig2,
      }),
    ).toBeNull()

    ongoing = {
      ...ongoing,
      checkpoints: ongoing.checkpoints.map((c) =>
        c.id === next.newCheckpoint.id
          ? {
              ...c,
              workspace: {
                projects: editedProjects,
                activeProjectId: editedProjects[0]!.id,
              },
            }
          : c,
      ),
    }
    ongoing = archiveCheckpoint(
      ongoing,
      ongoing.activeCheckpointId,
      snap2,
    )

    const cp1 = ongoing.checkpoints.find((c) => c.id === cp1Id)!
    const cp2 = getActiveCheckpoint(ongoing)!
    expect(cp1.status).toBe("archived")
    expect(
      cp1.archivedSnapshot &&
        "projectResults" in cp1.archivedSnapshot
        ? cp1.archivedSnapshot.projectResults[0]?.values
        : undefined,
    ).toEqual(
      snap1.projectResults[0]?.values,
    )
    expect(cp2.status).toBe("archived")
    expect(
      cp2.archivedSnapshot &&
        "projectsAtArchive" in cp2.archivedSnapshot
        ? cp2.archivedSnapshot.projectsAtArchive[0]?.name
        : undefined,
    ).toBe("CP2 edited")
  })

  it("session archive path heals save chain and reads live eligibility refs", () => {
    const session = readFileSync(
      join(repoRoot, "src/features/analysis-library/useLibraryAnalysisSession.ts"),
      "utf8",
    )
    expect(session).toContain("enqueueSave")
    expect(session).toContain("liveArchiveStateRef")
    expect(session).toContain("readLiveArchiveBlockReason")
    expect(session).toContain(".catch(() => undefined)")
    expect(session).toContain("getArchiveBlockReason: readLiveArchiveBlockReason")
  })

  it("App gates archive menu/button on librarySession.canArchive", () => {
    const app = readFileSync(
      join(repoRoot, "src/app/App.tsx"),
      "utf8",
    )
    expect(app).toContain("canArchive={librarySession.canArchive}")
    expect(app).toContain(
      "isOngoingAnalysis && librarySession.canArchive",
    )
    expect(app).toContain("getArchiveBlockReason")
  })
})

function ensureWorkspace(
  ongoing: ReturnType<typeof createInitialOngoingState>,
) {
  const active = getActiveCheckpoint(ongoing)!
  return {
    projects: active.workspace.projects,
    activeProjectId: active.workspace.activeProjectId,
  }
}
