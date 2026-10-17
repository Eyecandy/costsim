import { readFileSync } from "node:fs"
import { join } from "node:path"

import { beforeEach, describe, expect, it } from "vitest"

import {
  archiveCheckpoint,
  createInitialOngoingState,
  createNextCheckpoint,
  ensureSingleProjectWorkspace,
  getActiveCheckpoint,
  selectCheckpoint as selectCheckpointInState,
} from "@/domain/analysis/analysisCheckpoint"
import {
  clearLocalAnalysisLibraryStorageForTests,
  getLocalAnalysisLibraryRepository,
} from "@/persistence/localAnalysisLibraryRepository"
import { buildOngoingCheckpointResultSnapshot } from "@/domain/analysis/ongoingCheckpointResultSnapshot"
import { DEFAULT_RESULT_PREFERENCES } from "@/domain/results/resultPreferences"
import { buildSimulationInputSignature } from "@/domain/simulation/simulationInputSignature"
import { createBlankWorkspaceRuntimeState } from "@/domain/analysis/workspaceReset"
import type { OngoingAnalysisState } from "@/domain/analysis/analysisCheckpoint"
import type { Project } from "@/domain/analysis/project"
import type { ProjectResult } from "@/domain/simulation/simulationTypes"
import { repoRoot } from "@/test-utils/repoRoot"

const sessionSource = readFileSync(
  join(repoRoot, "src/features/analysis-library/useLibraryAnalysisSession.ts"),
  "utf8",
)

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

function makeCompact(
  analysisId: string,
  checkpointId: string,
  project: Project,
) {
  return buildOngoingCheckpointResultSnapshot({
    analysisId,
    checkpointId,
    projects: [project],
    activeProjectId: project.id,
    projectResults: resultsFor(project, 1000),
    simulatedBaseCostByProjectId: { [project.id]: 100 },
    inputSignature: buildSimulationInputSignature([project]),
    simulationCount: 20_000,
    resultPreferences: DEFAULT_RESULT_PREFERENCES,
  })
}

/**
 * Same contract as session `enqueueSave`: serialize ops; recover from rejects.
 */
function createSaveChain() {
  let chain: Promise<unknown> = Promise.resolve()
  const enqueue = (op: () => Promise<void>) => {
    const next = chain.catch(() => undefined).then(op)
    chain = next.catch(() => undefined)
    return next
  }
  const drain = () => chain.then(() => undefined)
  return { enqueue, drain }
}

beforeEach(() => clearLocalAnalysisLibraryStorageForTests())

describe("Ongoing checkpoint save ordering (createNext / selectCheckpoint)", () => {
  it("source: createNext is durable-first; selectCheckpoint joins enqueueSave after refs", () => {
    const createNextFn = sessionSource.slice(
      sessionSource.indexOf("const createNextCheckpointSession"),
      sessionSource.indexOf("const selectCheckpoint ="),
    )
    const selectFn = sessionSource.slice(
      sessionSource.indexOf("const selectCheckpoint ="),
      sessionSource.indexOf("const moveCurrentToTrash"),
    )

    // Durable-first: candidate saveDraft before committing React/session UI.
    expect(createNextFn.indexOf("await repo.saveDraft(createNextDoc)")).toBeLessThan(
      createNextFn.indexOf("setOngoing(created.ongoing)"),
    )
    expect(createNextFn.indexOf("await enqueueSave")).toBeLessThan(
      createNextFn.indexOf("setOngoing(created.ongoing)"),
    )
    expect(createNextFn).toContain("persistence_failed")
    // On failure, refs must not already show CP2.
    expect(createNextFn).toMatch(
      /catch \(error\) \{[\s\S]*?return \{ ok: false, reason: "persistence_failed" \}/,
    )

    expect(selectFn).toContain("ongoingRef.current = nextOngoing")
    expect(selectFn.indexOf("ongoingRef.current = nextOngoing")).toBeLessThan(
      selectFn.indexOf("await enqueueSave"),
    )
    expect(selectFn).not.toMatch(
      /skipNextSaveRef\.current = true\s*\n\s*if \(existing!\.status === "draft"\) \{\s*\n\s*await repo\.saveDraft/,
    )
  })

  it("A: createNext vs stale queued save — disk stays on CP2", async () => {
    const repo = getLocalAnalysisLibraryRepository()
    const blank = createBlankWorkspaceRuntimeState()
    const project = blank.projects[0]!
    const workspace = { projects: [project], activeProjectId: project.id }
    const doc = await repo.create({
      name: "Save order createNext",
      analysisMode: "ongoing",
      workspace,
    })

    let ongoing = createInitialOngoingState(workspace)
    const cp1Id = ongoing.activeCheckpointId
    const compact = makeCompact(doc.id, cp1Id, project)
    ongoing = archiveCheckpoint(ongoing, cp1Id, compact)
    await repo.saveDraft({
      ...doc,
      ongoing,
      workspace,
      ongoingDraftResult: compact,
    })

    const ongoingRef = { current: ongoing as OngoingAnalysisState }
    const { enqueue, drain } = createSaveChain()

    let releaseStale!: () => void
    const staleGate = new Promise<void>((resolve) => {
      releaseStale = resolve
    })

    // Older save already on the chain — reads authoritative ref at execution.
    const staleSave = enqueue(async () => {
      await staleGate
      const existing = await repo.get(doc.id)
      const ongoingNow = ongoingRef.current
      const active = getActiveCheckpoint(ongoingNow)!
      await repo.saveDraft({
        ...existing!,
        ongoing: ongoingNow,
        workspace: ensureSingleProjectWorkspace(active.workspace),
      })
    })

    const created = createNextCheckpoint(ongoingRef.current, {
      name: "CP2",
      analysisId: doc.id,
    })
    expect(created.ok).toBe(true)
    if (!created.ok) return

    // Durable-first contract: write candidate CP2, then commit ref in the same op.
    const createNextSave = enqueue(async () => {
      const existing = await repo.get(doc.id)
      const active = getActiveCheckpoint(created.ongoing)!
      await repo.saveDraft({
        ...existing!,
        ongoing: created.ongoing,
        workspace: ensureSingleProjectWorkspace(active.workspace),
        draftResultSeed: undefined,
        ongoingDraftResult: {
          ...created.inheritedResult,
          projectsAtRun:
            created.inheritedResult.projectsAtRun ??
            structuredClone(active.workspace.projects),
        },
      })
      ongoingRef.current = created.ongoing
    })

    releaseStale()
    await Promise.all([staleSave, createNextSave])
    await drain()

    const cold = await repo.get(doc.id)
    expect(cold!.ongoing!.activeCheckpointId).toBe(created.newCheckpoint.id)
    expect(cold!.ongoing!.checkpoints).toHaveLength(2)
    const cp1 = cold!.ongoing!.checkpoints.find((c) => c.id === cp1Id)
    expect(cp1?.status).toBe("archived")
    expect(
      cold!.ongoing!.checkpoints.find((c) => c.id === created.newCheckpoint.id)
        ?.status,
    ).toBe("draft")
  })

  it("B: selectCheckpoint vs stale queued save — selection not regressed", async () => {
    const repo = getLocalAnalysisLibraryRepository()
    const blank = createBlankWorkspaceRuntimeState()
    const project = blank.projects[0]!
    const workspace = { projects: [project], activeProjectId: project.id }
    const doc = await repo.create({
      name: "Save order select",
      analysisMode: "ongoing",
      workspace,
    })

    let ongoing = createInitialOngoingState(workspace)
    const cp1Id = ongoing.activeCheckpointId
    ongoing = archiveCheckpoint(
      ongoing,
      cp1Id,
      makeCompact(doc.id, cp1Id, project),
    )
    const created = createNextCheckpoint(ongoing, {
      name: "CP2",
      analysisId: doc.id,
    })
    expect(created.ok).toBe(true)
    if (!created.ok) return
    ongoing = created.ongoing
    const cp2Id = created.newCheckpoint.id

    await repo.saveDraft({
      ...doc,
      ongoing,
      workspace: ensureSingleProjectWorkspace(created.newCheckpoint.workspace),
      ongoingDraftResult: created.inheritedResult,
    })

    const ongoingRef = { current: ongoing as OngoingAnalysisState }
    const { enqueue, drain } = createSaveChain()

    let releaseStale!: () => void
    const staleGate = new Promise<void>((resolve) => {
      releaseStale = resolve
    })

    const staleSave = enqueue(async () => {
      await staleGate
      const existing = await repo.get(doc.id)
      const ongoingNow = ongoingRef.current
      const active = getActiveCheckpoint(ongoingNow)!
      await repo.saveDraft({
        ...existing!,
        ongoing: ongoingNow,
        workspace: ensureSingleProjectWorkspace(active.workspace),
      })
    })

    // Select archived CP1 while CP2 is active — refs first, then enqueue.
    const selected = selectCheckpointInState(ongoingRef.current, cp1Id)
    expect(selected).toBeTruthy()
    ongoingRef.current = selected!
    const selectSave = enqueue(async () => {
      const existing = await repo.get(doc.id)
      const ongoingNow = ongoingRef.current
      const active = getActiveCheckpoint(ongoingNow)!
      await repo.saveDraft({
        ...existing!,
        ongoing: ongoingNow,
        workspace: ensureSingleProjectWorkspace(active.workspace),
      })
    })

    releaseStale()
    await Promise.all([staleSave, selectSave])
    await drain()

    const cold = await repo.get(doc.id)
    expect(cold!.ongoing!.activeCheckpointId).toBe(cp1Id)
    expect(cold!.ongoing!.checkpoints.map((c) => c.id).sort()).toEqual(
      [cp1Id, cp2Id].sort(),
    )
  })

  it("C: controls — createNext normal persist + compact reload identity", async () => {
    const repo = getLocalAnalysisLibraryRepository()
    const blank = createBlankWorkspaceRuntimeState()
    const project = blank.projects[0]!
    const workspace = { projects: [project], activeProjectId: project.id }
    const doc = await repo.create({
      name: "CreateNext control",
      analysisMode: "ongoing",
      workspace,
    })
    let ongoing = createInitialOngoingState(workspace)
    const cp1 = ongoing.activeCheckpointId
    const compact = makeCompact(doc.id, cp1, project)
    ongoing = archiveCheckpoint(ongoing, cp1, compact)
    const created = createNextCheckpoint(ongoing, {
      name: "CP2",
      analysisId: doc.id,
    })
    expect(created.ok).toBe(true)
    if (!created.ok) return

    await repo.saveDraft({
      ...doc,
      ongoing: created.ongoing,
      workspace: ensureSingleProjectWorkspace(created.newCheckpoint.workspace),
      ongoingDraftResult: {
        ...created.inheritedResult,
        projectsAtRun: structuredClone(
          created.newCheckpoint.workspace.projects,
        ) as Project[],
      },
    })

    const cold = await repo.get(doc.id)
    expect(cold!.ongoing!.activeCheckpointId).toBe(created.newCheckpoint.id)
    expect(cold!.ongoingDraftResult?.checkpointId).toBe(
      created.newCheckpoint.id,
    )
    expect(cold!.ongoingDraftResult?.projectsAtRun?.length).toBe(1)
    expect(JSON.stringify(cold!.ongoingDraftResult)).not.toContain('"values":[')
  })
})
