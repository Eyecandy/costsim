/**
 * Behavioral regression: Ongoing state ownership + canonical result validity.
 *
 * Covers simulate→archive, stale edits, CP2 stickiness, descriptive vs model
 * edits, wrong-checkpoint, and distinct archive error reasons.
 */

import { beforeEach, describe, expect, it } from "vitest"

import {
  archiveCheckpoint,
  createInitialOngoingState,
  createNextCheckpoint,
  getActiveCheckpoint,
  syncActiveCheckpointWorkspace,
} from "@/lib/analysisCheckpoint"
import {
  buildArchivedAnalysisSnapshot,
  canArchiveCurrentResults,
  getArchiveBlockReason,
} from "@/lib/buildArchivedAnalysisSnapshot"
import { getAnalysisLibraryRepository } from "@/lib/analysisLibraryRepository"
import {
  emptyLiveSimulationState,
  getLiveResultValidity,
} from "@/domain/simulation/liveSimulationState"
import { clearLocalAnalysisLibraryStorageForTests } from "@/lib/localAnalysisLibraryRepository"
import { DEFAULT_RESULT_PREFERENCES } from "@/domain/results/resultPreferences"
import { buildSimulationInputSignature } from "@/domain/simulation/simulationInputSignature"
import { createBlankWorkspaceRuntimeState } from "@/lib/workspaceReset"
import type { Project } from "@/lib/project"
import type { ProjectResult } from "@/simulation.worker"

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

/** Blank workspace with one meaningfully filled cost row (analytical input). */
function projectsWithCostInput(): {
  projects: Project[]
  activeProjectId: string
} {
  const blank = createBlankWorkspaceRuntimeState()
  const projects: Project[] = [
    {
      ...blank.projects[0]!,
      costRows: blank.projects[0]!.costRows.map((r, i) =>
        i === 0
          ? {
              ...r,
              name: "Cost A",
              optimistic: "90",
              likely: "100",
              pessimistic: "120",
            }
          : r,
      ),
    },
  ]
  return { projects, activeProjectId: projects[0]!.id }
}

function liveStateFor(
  projects: readonly Project[],
  opts: {
    analysisId: string
    checkpointId: string | null
    projectResults?: ProjectResult[]
  },
) {
  const projectResults =
    opts.projectResults ?? resultsFor(projects[0]!.id)
  return emptyLiveSimulationState({
    analysisId: opts.analysisId,
    checkpointId: opts.checkpointId,
    inputSignature: buildSimulationInputSignature(projects),
    projectResults,
    simulatedBaseCostByProjectId: { [projects[0]!.id]: 100 },
    activeProjectIdAtRun: projects[0]!.id,
    simulationCount: 20_000,
    projectsAtRun: structuredClone(projects) as Project[],
  })
}

function snapshotFor(
  projects: readonly Project[],
  activeProjectId: string,
) {
  return buildArchivedAnalysisSnapshot({
    projects,
    activeProjectId,
    projectResults: resultsFor(activeProjectId),
    simulatedBaseCostByProjectId: { [activeProjectId]: 100 },
    inputSignature: buildSimulationInputSignature(projects),
    simulationCount: 20_000,
    resultPreferences: DEFAULT_RESULT_PREFERENCES,
  })
}

describe("ongoing state ownership + canonical validity", () => {
  beforeEach(() => {
    clearLocalAnalysisLibraryStorageForTests()
  })

  it("A: simulate → validity valid → archive succeeds", () => {
    const { projects, activeProjectId } = projectsWithCostInput()
    const analysisId = "a1"
    const ongoing = createInitialOngoingState({
      projects,
      activeProjectId,
    })
    const cpId = ongoing.activeCheckpointId
    const sim = liveStateFor(projects, { analysisId, checkpointId: cpId })

    expect(
      getLiveResultValidity({
        analysisId,
        checkpointId: cpId,
        currentProjects: projects,
        simulationState: sim,
      }).kind,
    ).toBe("valid")

    expect(
      getArchiveBlockReason({
        analysisId,
        checkpointId: cpId,
        projects,
        projectResults: sim.projectResults,
        lastSimulatedInputSignature: sim.inputSignature,
        simulationState: sim,
      }),
    ).toBeNull()

    const archived = archiveCheckpoint(
      ongoing,
      cpId,
      snapshotFor(projects, activeProjectId),
    )
    expect(getActiveCheckpoint(archived)?.status).toBe("archived")
  })

  it("B: model edit → stale → archive rejected → rerun → archive ok", () => {
    const { projects, activeProjectId } = projectsWithCostInput()
    const analysisId = "a1"
    const ongoing = createInitialOngoingState({
      projects,
      activeProjectId,
    })
    const cpId = ongoing.activeCheckpointId
    const sim = liveStateFor(projects, { analysisId, checkpointId: cpId })

    const edited: Project[] = [
      {
        ...projects[0]!,
        costRows: projects[0]!.costRows.map((r, i) =>
          i === 0 ? { ...r, likely: "999" } : r,
        ),
      },
    ]

    expect(
      getLiveResultValidity({
        analysisId,
        checkpointId: cpId,
        currentProjects: edited,
        simulationState: sim,
      }).kind,
    ).toBe("stale")
    expect(
      getArchiveBlockReason({
        analysisId,
        checkpointId: cpId,
        projects: edited,
        projectResults: sim.projectResults,
        lastSimulatedInputSignature: sim.inputSignature,
        simulationState: sim,
      }),
    ).toBe("stale_results")

    const rerun = liveStateFor(edited, { analysisId, checkpointId: cpId })
    expect(
      getLiveResultValidity({
        analysisId,
        checkpointId: cpId,
        currentProjects: edited,
        simulationState: rerun,
      }).kind,
    ).toBe("valid")
    expect(
      canArchiveCurrentResults({
        analysisId,
        checkpointId: cpId,
        projects: edited,
        projectResults: rerun.projectResults,
        lastSimulatedInputSignature: rerun.inputSignature,
        simulationState: rerun,
      }),
    ).toBe(true)
  })

  it("C: CP2 stays active across edit, autosave sync, and reload", async () => {
    const repo = getAnalysisLibraryRepository()
    const { projects, activeProjectId } = projectsWithCostInput()
    const created = await repo.create({
      name: "CP stickiness",
      analysisMode: "ongoing",
      workspace: { projects, activeProjectId },
    })
    const cp1 = created.ongoing!.checkpoints[0]!
    const snap = snapshotFor(projects, activeProjectId)
    let ongoing = archiveCheckpoint(created.ongoing!, cp1.id, snap)
    const next = createNextCheckpoint(ongoing, { name: "CP2" })
    expect(next.ok).toBe(true)
    if (!next.ok) return
    ongoing = next.ongoing
    const cp2Id = next.newCheckpoint.id
    expect(ongoing.activeCheckpointId).toBe(cp2Id)

    await repo.saveDraft({
      ...created,
      ongoing,
      workspace: {
        projects: next.newCheckpoint.workspace.projects,
        activeProjectId: next.newCheckpoint.workspace.activeProjectId,
      },
      ongoingDraftResult: next.inheritedResult,
    })

    const editedProjects: Project[] = [
      {
        ...next.newCheckpoint.workspace.projects[0]!,
        costRows: next.newCheckpoint.workspace.projects[0]!.costRows.map(
          (r, i) => (i === 0 ? { ...r, likely: "42" } : r),
        ),
      },
    ]
    const workspace = {
      projects: editedProjects,
      activeProjectId: editedProjects[0]!.id,
    }
    ongoing = syncActiveCheckpointWorkspace(ongoing, workspace)
    expect(ongoing.activeCheckpointId).toBe(cp2Id)

    await repo.saveDraft({
      ...created,
      ongoing,
      workspace,
      draftResultSeed: undefined,
    })
    expect(ongoing.activeCheckpointId).toBe(cp2Id)

    const reloaded = await repo.get(created.id)
    expect(reloaded?.ongoing?.activeCheckpointId).toBe(cp2Id)
    expect(
      reloaded?.ongoing?.checkpoints.find((c) => c.id === cp1.id)?.status,
    ).toBe("archived")
    expect(
      reloaded?.ongoing?.checkpoints.find((c) => c.id === cp1.id)?.workspace
        .projects[0]?.costRows[0]?.likely,
    ).not.toBe("42")
    expect(
      reloaded?.ongoing?.checkpoints.find((c) => c.id === cp2Id)?.workspace
        .projects[0]?.costRows[0]?.likely,
    ).toBe("42")

    const profileEdit = {
      projects: [
        {
          ...editedProjects[0]!,
          profile: { phase: "execution" as const },
        },
      ],
      activeProjectId: editedProjects[0]!.id,
    }
    ongoing = syncActiveCheckpointWorkspace(ongoing, profileEdit)
    expect(ongoing.activeCheckpointId).toBe(cp2Id)
    await repo.saveDraft({
      ...created,
      ongoing,
      workspace: profileEdit,
    })
    const again = await repo.get(created.id)
    expect(again?.ongoing?.activeCheckpointId).toBe(cp2Id)
  })

  it("D: descriptive edit does not stale; archive remains eligible", () => {
    const { projects, activeProjectId } = projectsWithCostInput()
    const analysisId = "a1"
    const ongoing = createInitialOngoingState({
      projects,
      activeProjectId,
    })
    const cpId = ongoing.activeCheckpointId
    const sim = liveStateFor(projects, { analysisId, checkpointId: cpId })

    const descriptive: Project[] = [
      {
        ...projects[0]!,
        profile: { phase: "execution" },
        costRows: projects[0]!.costRows.map((r) => ({
          ...r,
          name: r.name, // keep analytical name
        })),
      },
    ]
    // Pure descriptive fields
    descriptive[0]!.name = "Renamed display"
    descriptive[0]!.assumptions = [{ id: "a1", text: "New assumption" }]
    descriptive[0]!.profile = { phase: "execution" }
    descriptive[0]!.costRows = descriptive[0]!.costRows.map((r, i) =>
      i === 0 ? { ...r, description: "docs only" } : r,
    )

    expect(buildSimulationInputSignature(descriptive)).toBe(
      buildSimulationInputSignature(projects),
    )
    expect(
      getLiveResultValidity({
        analysisId,
        checkpointId: cpId,
        currentProjects: descriptive,
        simulationState: sim,
      }).kind,
    ).toBe("valid")
    expect(
      getArchiveBlockReason({
        analysisId,
        checkpointId: cpId,
        projects: descriptive,
        projectResults: sim.projectResults,
        lastSimulatedInputSignature: sim.inputSignature,
        simulationState: sim,
      }),
    ).toBeNull()
  })

  it("E: model edits stale (likely/P-bounds, incurred, impact, correlation)", () => {
    const { projects, activeProjectId } = projectsWithCostInput()
    const base = projects[0]!
    const analysisId = "a1"
    const ongoing = createInitialOngoingState({
      projects,
      activeProjectId,
    })
    const cpId = ongoing.activeCheckpointId
    const sim = liveStateFor(projects, { analysisId, checkpointId: cpId })

    const variants: Project[][] = [
      [{ ...base, incurredCosts: 50 }],
      [
        {
          ...base,
          costRows: base.costRows.map((r, i) =>
            i === 0
              ? { ...r, optimistic: "80", likely: "200", pessimistic: "130" }
              : r,
          ),
        },
      ],
      [
        {
          ...base,
          driverRows: base.driverRows.map((r, i) =>
            i === 0
              ? {
                  ...r,
                  name: "Driver",
                  optimistic: "10",
                  likely: "20",
                  pessimistic: "30",
                }
              : r,
          ),
        },
      ],
      [
        {
          ...base,
          driverImpacts: {
            [base.driverRows[0]!.id]: { [base.costRows[0]!.id]: "50" },
          },
        },
      ],
      [
        {
          ...base,
          costCorrelations: {
            [base.costRows[0]!.id]: {
              [base.costRows[1]?.id ?? base.costRows[0]!.id]: "0.5",
            },
          },
        },
      ],
    ]

    for (const edited of variants) {
      expect(
        getLiveResultValidity({
          analysisId,
          checkpointId: cpId,
          currentProjects: edited,
          simulationState: sim,
        }).kind,
      ).toBe("stale")
    }
  })

  it("F: CP1 live results do not authorize CP2 archive", () => {
    const { projects, activeProjectId } = projectsWithCostInput()
    const analysisId = "a1"
    const ongoing = createInitialOngoingState({
      projects,
      activeProjectId,
    })
    const cp1 = ongoing.activeCheckpointId
    const simCp1 = liveStateFor(projects, {
      analysisId,
      checkpointId: cp1,
    })

    expect(
      getLiveResultValidity({
        analysisId,
        checkpointId: "cp2-other",
        currentProjects: projects,
        simulationState: simCp1,
      }).kind,
    ).toBe("wrong_checkpoint")
    expect(
      getArchiveBlockReason({
        analysisId,
        checkpointId: "cp2-other",
        projects,
        projectResults: simCp1.projectResults,
        lastSimulatedInputSignature: simCp1.inputSignature,
        simulationState: simCp1,
      }),
    ).toBe("wrong_checkpoint")
  })

  it("G: archive error reasons are distinct", () => {
    const { projects, activeProjectId } = projectsWithCostInput()
    const analysisId = "a1"
    const ongoing = createInitialOngoingState({
      projects,
      activeProjectId,
    })
    const cpId = ongoing.activeCheckpointId

    expect(
      getArchiveBlockReason({
        analysisId,
        checkpointId: cpId,
        projects,
        projectResults: [],
        lastSimulatedInputSignature: "",
      }),
    ).toBe("no_results")

    const sim = liveStateFor(projects, { analysisId, checkpointId: cpId })
    const edited: Project[] = [
      {
        ...projects[0]!,
        costRows: projects[0]!.costRows.map((r, i) =>
          i === 0 ? { ...r, likely: "77" } : r,
        ),
      },
    ]
    expect(
      getArchiveBlockReason({
        analysisId,
        checkpointId: cpId,
        projects: edited,
        projectResults: sim.projectResults,
        lastSimulatedInputSignature: sim.inputSignature,
        simulationState: sim,
      }),
    ).toBe("stale_results")

    expect(
      getArchiveBlockReason({
        analysisId,
        checkpointId: "other",
        projects,
        projectResults: sim.projectResults,
        lastSimulatedInputSignature: sim.inputSignature,
        simulationState: sim,
      }),
    ).toBe("wrong_checkpoint")

    expect(
      getArchiveBlockReason({
        analysisId,
        checkpointId: cpId,
        projects,
        projectResults: sim.projectResults,
        lastSimulatedInputSignature: sim.inputSignature,
        simulationState: sim,
      }),
    ).not.toBe("not_draft")
  })

  it("repository saveDraft does not mutate activeCheckpointId or sync workspace", async () => {
    const repo = getAnalysisLibraryRepository()
    const { projects, activeProjectId } = projectsWithCostInput()
    const created = await repo.create({
      name: "No sync in repo",
      analysisMode: "ongoing",
      workspace: { projects, activeProjectId },
    })
    const cp1Id = created.ongoing!.activeCheckpointId
    const unsyncedWorkspace = {
      projects: [
        {
          ...projects[0]!,
          name: "Editor only",
          costRows: projects[0]!.costRows.map((r, i) =>
            i === 0 ? { ...r, likely: "123" } : r,
          ),
        },
      ],
      activeProjectId,
    }
    await repo.saveDraft({
      ...created,
      ongoing: created.ongoing,
      workspace: unsyncedWorkspace,
    })
    const loaded = await repo.get(created.id)
    expect(loaded?.ongoing?.activeCheckpointId).toBe(cp1Id)
    // Checkpoint workspace unchanged — repo did not sync editor into it.
    expect(
      loaded?.ongoing?.checkpoints[0]!.workspace.projects[0]!.costRows[0]!
        .likely,
    ).toBe("100")
    // get() re-derives document.workspace from the active checkpoint (load
    // normalization), so unsynced editor workspace is not what get() returns.
    expect(loaded?.workspace.projects[0]!.costRows[0]!.likely).toBe("100")
  })

  it("legacy full-project signature still validates via coerce", () => {
    const { projects } = projectsWithCostInput()
    const legacySig = JSON.stringify(projects)
    const sim = emptyLiveSimulationState({
      analysisId: "a1",
      checkpointId: null,
      inputSignature: legacySig,
      projectResults: resultsFor(projects[0]!.id),
      projectsAtRun: projects,
    })
    expect(
      getLiveResultValidity({
        analysisId: "a1",
        checkpointId: null,
        currentProjects: projects,
        simulationState: sim,
      }).kind,
    ).toBe("valid")
  })
})
