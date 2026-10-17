import { beforeEach, describe, expect, it } from "vitest"

import {
  archiveCheckpoint,
  createInitialOngoingState,
  createNextCheckpoint,
} from "@/lib/analysisCheckpoint"
import {
  clearLocalAnalysisLibraryStorageForTests,
  getLocalAnalysisLibraryRepository,
} from "@/lib/localAnalysisLibraryRepository"
import { getLiveResultValidity } from "@/domain/simulation/liveSimulationState"
import {
  buildOngoingCheckpointResultSnapshot,
} from "@/lib/ongoingCheckpointResultSnapshot"
import {
  changedCostTableCellKeySet,
} from "@/lib/simInputSnapshotDiff"
import { createSimulationRunIdsForProjects } from "@/domain/simulation/simulationRunId"
import { DEFAULT_RESULT_PREFERENCES } from "@/domain/results/resultPreferences"
import { buildSimulationInputSignature } from "@/domain/simulation/simulationInputSignature"
import {
  buildSingleDraftResultSnapshot,
  freezeSingleDraftForArchive,
} from "@/lib/singleDraftResultSnapshot"
import { createBlankWorkspaceRuntimeState } from "@/lib/workspaceReset"
import type { Project } from "@/lib/project"
import type { ProjectResult } from "@/simulation.worker"

function valuesAround(center: number): number[] {
  return Array.from({ length: 20_000 }, (_, i) => center + (i - 10_000) * 0.01)
}

function resultsFor(project: Project, center: number): ProjectResult[] {
  return [
    {
      projectId: project.id,
      incurredCosts: project.incurredCosts,
      values: valuesAround(center),
      inputSeries: [],
    },
  ]
}

function editLikely(project: Project, likely: string): Project {
  return {
    ...project,
    costRows: project.costRows.map((row, i) =>
      i === 0 ? { ...row, likely } : row,
    ),
  }
}

function costChangedKeys(current: Project, baseline: Project): Set<string> {
  return changedCostTableCellKeySet(
    { costRows: current.costRows, incurredCosts: current.incurredCosts },
    { costRows: baseline.costRows, incurredCosts: baseline.incurredCosts },
  )
}

beforeEach(() => clearLocalAnalysisLibraryStorageForTests())

describe("simulation input baseline reload (green-cell / Undo)", () => {
  it("A: Single field highlight survives reload", async () => {
    const repo = getLocalAnalysisLibraryRepository()
    const blank = createBlankWorkspaceRuntimeState()
    const project = blank.projects[0]!
    // Ensure a comparable cost cell exists.
    const withCost: Project = {
      ...project,
      costRows: [
        {
          id: "cost-1",
          name: "Item",
          optimistic: "90",
          likely: "100",
          pessimistic: "110",
        },
      ],
    }
    const doc = await repo.create({
      name: "Baseline A",
      workspace: { projects: [withCost], activeProjectId: withCost.id },
    })
    const draft = buildSingleDraftResultSnapshot({
      analysisId: doc.id,
      projects: [withCost],
      activeProjectId: withCost.id,
      projectResults: resultsFor(withCost, 1000),
      simulatedBaseCostByProjectId: { [withCost.id]: 100 },
      inputSignature: buildSimulationInputSignature([withCost]),
      simulationCount: 20_000,
      resultPreferences: DEFAULT_RESULT_PREFERENCES,
      simulationRunIdByProjectId: createSimulationRunIdsForProjects(
        [withCost.id],
        1,
      ),
    })
    expect(draft.projectsAtRun?.[0]?.costRows[0]?.likely).toBe("100")

    const edited = editLikely(withCost, "250")
    await repo.saveDraft({
      ...doc,
      workspace: { projects: [edited], activeProjectId: edited.id },
      singleDraftResult: draft,
    })

    const cold = await repo.get(doc.id)
    const baseline = cold!.singleDraftResult!.projectsAtRun!
    expect(baseline[0]!.costRows[0]!.likely).toBe("100")
    expect(cold!.workspace.projects[0]!.costRows[0]!.likely).toBe("250")
    expect(
      getLiveResultValidity({
        analysisId: doc.id,
        checkpointId: null,
        currentProjects: cold!.workspace.projects,
        simulationState: {
          analysisId: null,
          checkpointId: null,
          inputSignature: "",
          projectResults: [],
          simulatedBaseCostByProjectId: {},
          activeProjectIdAtRun: "",
          simulationCount: 0,
          projectsAtRun: [],
        },
        singleDraftResult: cold!.singleDraftResult,
      }).kind,
    ).toBe("stale")
    const keys = costChangedKeys(cold!.workspace.projects[0]!, baseline[0]!)
    expect(keys.has("cost-1:likely")).toBe(true)
  })

  it("B: Single Undo after reload restores A baseline", async () => {
    const repo = getLocalAnalysisLibraryRepository()
    const blank = createBlankWorkspaceRuntimeState()
    const project = blank.projects[0]!
    const withCost: Project = {
      ...project,
      costRows: [
        {
          id: "cost-1",
          name: "Item",
          optimistic: "90",
          likely: "100",
          pessimistic: "110",
        },
      ],
    }
    const doc = await repo.create({
      name: "Undo",
      workspace: { projects: [withCost], activeProjectId: withCost.id },
    })
    const draft = buildSingleDraftResultSnapshot({
      analysisId: doc.id,
      projects: [withCost],
      activeProjectId: withCost.id,
      projectResults: resultsFor(withCost, 1000),
      simulatedBaseCostByProjectId: { [withCost.id]: 100 },
      inputSignature: buildSimulationInputSignature([withCost]),
      simulationCount: 20_000,
      resultPreferences: DEFAULT_RESULT_PREFERENCES,
    })
    await repo.saveDraft({
      ...doc,
      workspace: {
        projects: [editLikely(withCost, "250")],
        activeProjectId: withCost.id,
      },
      singleDraftResult: draft,
    })
    const cold = await repo.get(doc.id)
    const restored = structuredClone(
      cold!.singleDraftResult!.projectsAtRun!,
    ) as Project[]
    expect(restored[0]!.costRows[0]!.likely).toBe("100")
    expect(
      getLiveResultValidity({
        analysisId: doc.id,
        checkpointId: null,
        currentProjects: restored,
        simulationState: {
          analysisId: null,
          checkpointId: null,
          inputSignature: "",
          projectResults: [],
          simulatedBaseCostByProjectId: {},
          activeProjectIdAtRun: "",
          simulationCount: 0,
          projectsAtRun: [],
        },
        singleDraftResult: cold!.singleDraftResult,
      }).kind,
    ).toBe("valid")
    expect(costChangedKeys(restored[0]!, restored[0]!).size).toBe(0)
  })

  it("C: Single rerun baseline becomes B", async () => {
    const blank = createBlankWorkspaceRuntimeState()
    const project = blank.projects[0]!
    const a: Project = {
      ...project,
      costRows: [
        {
          id: "cost-1",
          name: "Item",
          optimistic: "90",
          likely: "100",
          pessimistic: "110",
        },
      ],
    }
    const b = editLikely(a, "250")
    const draftB = buildSingleDraftResultSnapshot({
      analysisId: "a1",
      projects: [b],
      activeProjectId: b.id,
      projectResults: resultsFor(b, 5000),
      simulatedBaseCostByProjectId: { [b.id]: 250 },
      inputSignature: buildSimulationInputSignature([b]),
      simulationCount: 20_000,
      resultPreferences: DEFAULT_RESULT_PREFERENCES,
    })
    expect(draftB.projectsAtRun?.[0]?.costRows[0]?.likely).toBe("250")
    const editedAfterB = editLikely(b, "300")
    expect(
      costChangedKeys(editedAfterB, draftB.projectsAtRun![0]!).has(
        "cost-1:likely",
      ),
    ).toBe(true)
    expect(
      costChangedKeys(editedAfterB, a).has("cost-1:likely"),
    ).toBe(true)
    // Baseline is B (250), not A (100).
    expect(draftB.projectsAtRun![0]!.costRows[0]!.likely).not.toBe("100")
  })

  it("D: Ongoing createNext inherits baseline; edit+reload keeps highlight", async () => {
    const repo = getLocalAnalysisLibraryRepository()
    const blank = createBlankWorkspaceRuntimeState()
    const project = blank.projects[0]!
    const withCost: Project = {
      ...project,
      costRows: [
        {
          id: "cost-1",
          name: "Item",
          optimistic: "90",
          likely: "100",
          pessimistic: "110",
        },
      ],
    }
    const workspace = { projects: [withCost], activeProjectId: withCost.id }
    const doc = await repo.create({
      name: "Ongoing baseline",
      analysisMode: "ongoing",
      workspace,
    })
    let ongoing = createInitialOngoingState(workspace)
    const cp1 = ongoing.activeCheckpointId
    const compact = buildOngoingCheckpointResultSnapshot({
      analysisId: doc.id,
      checkpointId: cp1,
      projects: [withCost],
      activeProjectId: withCost.id,
      projectResults: resultsFor(withCost, 1000),
      simulatedBaseCostByProjectId: { [withCost.id]: 100 },
      inputSignature: buildSimulationInputSignature([withCost]),
      simulationCount: 20_000,
      resultPreferences: DEFAULT_RESULT_PREFERENCES,
    })
    expect(compact.projectsAtRun?.[0]?.costRows[0]?.likely).toBe("100")
    ongoing = archiveCheckpoint(ongoing, cp1, compact)
    const created = createNextCheckpoint(ongoing, {
      name: "CP2",
      analysisId: doc.id,
    })
    expect(created.ok).toBe(true)
    if (!created.ok) return
    const inherited = {
      ...created.inheritedResult,
      projectsAtRun:
        created.inheritedResult.projectsAtRun ??
        structuredClone(created.newCheckpoint.workspace.projects),
    }
    const edited = editLikely(withCost, "250")
    await repo.saveDraft({
      ...doc,
      ongoing: {
        ...created.ongoing,
        checkpoints: created.ongoing.checkpoints.map((cp) =>
          cp.id === created.newCheckpoint.id
            ? {
                ...cp,
                workspace: {
                  projects: [edited],
                  activeProjectId: edited.id,
                },
              }
            : cp,
        ),
      },
      workspace: { projects: [edited], activeProjectId: edited.id },
      ongoingDraftResult: inherited,
    })
    const cold = await repo.get(doc.id)
    const baseline = cold!.ongoingDraftResult!.projectsAtRun!
    expect(baseline[0]!.costRows[0]!.likely).toBe("100")
    expect(
      costChangedKeys(cold!.workspace.projects[0]!, baseline[0]!).has(
        "cost-1:likely",
      ),
    ).toBe(true)
  })

  it("E: Ongoing rerun baseline becomes B", () => {
    const blank = createBlankWorkspaceRuntimeState()
    const project = blank.projects[0]!
    const a: Project = {
      ...project,
      costRows: [
        {
          id: "cost-1",
          name: "Item",
          optimistic: "90",
          likely: "100",
          pessimistic: "110",
        },
      ],
    }
    const b = editLikely(a, "250")
    const compactB = buildOngoingCheckpointResultSnapshot({
      analysisId: "a1",
      checkpointId: "cp2",
      projects: [b],
      activeProjectId: b.id,
      projectResults: resultsFor(b, 5000),
      simulatedBaseCostByProjectId: { [b.id]: 250 },
      inputSignature: buildSimulationInputSignature([b]),
      simulationCount: 20_000,
      resultPreferences: DEFAULT_RESULT_PREFERENCES,
    })
    expect(compactB.projectsAtRun?.[0]?.costRows[0]?.likely).toBe("250")
  })

  it("F: create new version seeds projectsAtRun from cloned workspace", async () => {
    const repo = getLocalAnalysisLibraryRepository()
    const blank = createBlankWorkspaceRuntimeState()
    const project = blank.projects[0]!
    const withCost: Project = {
      ...project,
      costRows: [
        {
          id: "cost-1",
          name: "Item",
          optimistic: "90",
          likely: "100",
          pessimistic: "110",
        },
      ],
    }
    const draft = await repo.create({
      name: "Version source",
      workspace: { projects: [withCost], activeProjectId: withCost.id },
    })
    const compact = buildSingleDraftResultSnapshot({
      analysisId: draft.id,
      projects: [withCost],
      activeProjectId: withCost.id,
      projectResults: resultsFor(withCost, 1000),
      simulatedBaseCostByProjectId: { [withCost.id]: 100 },
      inputSignature: buildSimulationInputSignature([withCost]),
      simulationCount: 20_000,
      resultPreferences: DEFAULT_RESULT_PREFERENCES,
    })
    await repo.archive({
      analysisId: draft.id,
      snapshot: freezeSingleDraftForArchive({
        draft: compact,
        projects: [withCost],
      }),
    })
    const next = await repo.createDraftFromArchived({
      archivedId: draft.id,
      name: "Version next",
    })
    expect(next.singleDraftResult?.projectsAtRun?.length).toBe(1)
    expect(next.singleDraftResult?.projectsAtRun?.[0]?.costRows[0]?.likely).toBe(
      "100",
    )
    const edited = editLikely(next.workspace.projects[0]!, "250")
    expect(
      costChangedKeys(edited, next.singleDraftResult!.projectsAtRun![0]!).has(
        next.workspace.projects[0]!.costRows[0]!.id + ":likely",
      ),
    ).toBe(true)
  })

  it("G: result/baseline stay paired on authoritative session pick", async () => {
    const { pickAuthoritativeSingleDraftResult } = await import(
      "@/lib/singleDraftResultSnapshot"
    )
    const blank = createBlankWorkspaceRuntimeState()
    const project = blank.projects[0]!
    const a: Project = {
      ...project,
      costRows: [
        {
          id: "cost-1",
          name: "Item",
          optimistic: "90",
          likely: "100",
          pessimistic: "110",
        },
      ],
    }
    const b = editLikely(a, "250")
    const draftA = buildSingleDraftResultSnapshot({
      analysisId: "a1",
      projects: [a],
      activeProjectId: a.id,
      projectResults: resultsFor(a, 1000),
      simulatedBaseCostByProjectId: { [a.id]: 100 },
      inputSignature: buildSimulationInputSignature([a]),
      simulationCount: 20_000,
      resultPreferences: DEFAULT_RESULT_PREFERENCES,
      simulationRunIdByProjectId: createSimulationRunIdsForProjects([a.id], 50),
    })
    const draftB = buildSingleDraftResultSnapshot({
      analysisId: "a1",
      projects: [b],
      activeProjectId: b.id,
      projectResults: resultsFor(b, 5000),
      simulatedBaseCostByProjectId: { [b.id]: 250 },
      inputSignature: buildSimulationInputSignature([b]),
      simulationCount: 20_000,
      resultPreferences: DEFAULT_RESULT_PREFERENCES,
      simulationRunIdByProjectId: createSimulationRunIdsForProjects([b.id], 1),
    })
    const picked = pickAuthoritativeSingleDraftResult(draftB, draftA)!
    expect(picked.projectsAtRun?.[0]?.costRows[0]?.likely).toBe("250")
    expect(picked.inputSignature).toBe(draftB.inputSignature)
  })

  it("H: baseline storage has no heavy simulation arrays", () => {
    const blank = createBlankWorkspaceRuntimeState()
    const project = blank.projects[0]!
    const draft = buildSingleDraftResultSnapshot({
      analysisId: "a1",
      projects: [project],
      activeProjectId: project.id,
      projectResults: resultsFor(project, 1000),
      simulatedBaseCostByProjectId: { [project.id]: 100 },
      inputSignature: buildSimulationInputSignature([project]),
      simulationCount: 20_000,
      resultPreferences: DEFAULT_RESULT_PREFERENCES,
    })
    const withoutBaseline = { ...draft, projectsAtRun: undefined }
    const withBaseline = draft
    const delta =
      JSON.stringify(withBaseline).length - JSON.stringify(withoutBaseline).length
    console.info("projectsAtRun baseline added bytes", delta)
    expect(JSON.stringify(draft)).not.toContain('"values":[')
    expect(delta).toBeLessThan(50_000)
    expect(delta).toBeGreaterThan(0)
  })

  it("I: existing compact result reload still works with projectsAtRun", async () => {
    const repo = getLocalAnalysisLibraryRepository()
    const blank = createBlankWorkspaceRuntimeState()
    const project = blank.projects[0]!
    const doc = await repo.create({
      name: "Reload control",
      workspace: blank,
    })
    const draft = buildSingleDraftResultSnapshot({
      analysisId: doc.id,
      projects: [project],
      activeProjectId: project.id,
      projectResults: resultsFor(project, 1000),
      simulatedBaseCostByProjectId: { [project.id]: 100 },
      inputSignature: buildSimulationInputSignature([project]),
      simulationCount: 20_000,
      resultPreferences: DEFAULT_RESULT_PREFERENCES,
    })
    await repo.saveDraft({ ...doc, singleDraftResult: draft })
    const cold = await repo.get(doc.id)
    expect(cold?.singleDraftResult?.projectsAtRun?.length).toBe(1)
    expect(
      getLiveResultValidity({
        analysisId: doc.id,
        checkpointId: null,
        currentProjects: cold!.workspace.projects,
        simulationState: {
          analysisId: null,
          checkpointId: null,
          inputSignature: "",
          projectResults: [],
          simulatedBaseCostByProjectId: {},
          activeProjectIdAtRun: "",
          simulationCount: 0,
          projectsAtRun: [],
        },
        singleDraftResult: cold!.singleDraftResult,
      }).kind,
    ).toBe("valid")
  })
})
