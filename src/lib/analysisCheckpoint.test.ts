import { describe, expect, it } from "vitest"

import {
  archiveCheckpoint,
  checkpointPrimaryStageId,
  cloneWorkspacePreservingIds,
  createInitialOngoingState,
  ensureSingleProjectWorkspace,
  normalizeOngoingState,
  planOngoingFromSingleArchiveProjects,
  selectCheckpoint,
  syncActiveCheckpointWorkspace,
} from "@/lib/analysisCheckpoint"
import { createBlankWorkspaceRuntimeState } from "@/lib/workspaceReset"
import { buildArchivedAnalysisSnapshot } from "@/lib/buildArchivedAnalysisSnapshot"
import { DEFAULT_RESULT_PREFERENCES } from "@/lib/resultPreferences"
import type { ProjectResult } from "@/simulation.worker"

describe("analysisCheckpoint", () => {
  it("creates Checkpoint 1 with exactly one project", () => {
    const blank = createBlankWorkspaceRuntimeState()
    const multi = {
      projects: [
        blank.projects[0]!,
        { ...blank.projects[0]!, id: "p2", name: "B" },
      ],
      activeProjectId: blank.activeProjectId,
    }
    const ongoing = createInitialOngoingState(multi, {
      checkpointName: "Concept review",
    })
    expect(ongoing.lifecycle).toBe("active")
    expect(ongoing.checkpoints).toHaveLength(1)
    expect(ongoing.checkpoints[0]!.sequence).toBe(1)
    expect(ongoing.checkpoints[0]!.name).toBe("Concept review")
    expect(ongoing.checkpoints[0]!.status).toBe("draft")
    expect(ongoing.checkpoints[0]!.workspace.projects).toHaveLength(1)
    expect(ongoing.activeCheckpointId).toBe(ongoing.checkpoints[0]!.id)
  })

  it("preserves row ids when cloning workspace for future diffs", () => {
    const blank = createBlankWorkspaceRuntimeState()
    const costId = blank.projects[0]!.costRows[0]?.id
    const cloned = cloneWorkspacePreservingIds({
      projects: blank.projects,
      activeProjectId: blank.activeProjectId,
    })
    expect(cloned.projects[0]!.id).toBe(blank.projects[0]!.id)
    if (costId) {
      expect(cloned.projects[0]!.costRows[0]?.id).toBe(costId)
    }
  })

  it("planOngoingFromSingleArchiveProjects selects one alternative", () => {
    const blank = createBlankWorkspaceRuntimeState()
    const a = blank.projects[0]!
    const b = { ...a, id: "alt-b", name: "Alt B" }
    const planned = planOngoingFromSingleArchiveProjects([a, b], "alt-b", {
      checkpointName: "Start",
    })
    expect(planned).not.toBeNull()
    expect(planned!.workspace.projects).toHaveLength(1)
    expect(planned!.workspace.projects[0]!.id).toBe("alt-b")
    expect(planned!.ongoing.checkpoints).toHaveLength(1)
  })

  it("reads primary stage from Project Profile, not checkpoint fields", () => {
    const blank = createBlankWorkspaceRuntimeState()
    const withPhase = {
      projects: [
        {
          ...blank.projects[0]!,
          profile: { phase: "preliminary_design" },
        },
      ],
      activeProjectId: blank.activeProjectId,
    }
    const ongoing = createInitialOngoingState(withPhase)
    expect(checkpointPrimaryStageId(ongoing.checkpoints[0]!)).toBe(
      "preliminary_design",
    )
    expect(
      "phase" in (ongoing.checkpoints[0]! as Record<string, unknown>),
    ).toBe(false)
  })

  it("selectCheckpoint switches active id; archive freezes snapshot", () => {
    const blank = createBlankWorkspaceRuntimeState()
    let ongoing = createInitialOngoingState({
      projects: blank.projects,
      activeProjectId: blank.activeProjectId,
    })
    const cp1 = ongoing.checkpoints[0]!
    const cp2 = {
      ...cp1,
      id: "cp-2",
      sequence: 2,
      name: "Investment decision",
      status: "draft" as const,
      workspace: ensureSingleProjectWorkspace({
        projects: [
          {
            ...blank.projects[0]!,
            profile: { phase: "execution" },
          },
        ],
        activeProjectId: blank.activeProjectId,
      }),
    }
    ongoing = {
      ...ongoing,
      checkpoints: [
        {
          ...cp1,
          workspace: ensureSingleProjectWorkspace({
            projects: [
              {
                ...blank.projects[0]!,
                profile: { phase: "preliminary_design" },
              },
            ],
            activeProjectId: blank.activeProjectId,
          }),
        },
        cp2,
      ],
    }
    const selected = selectCheckpoint(ongoing, "cp-2")
    expect(selected?.activeCheckpointId).toBe("cp-2")
    expect(checkpointPrimaryStageId(selected!.checkpoints[1]!)).toBe(
      "execution",
    )

    const fakeResults: ProjectResult[] = [
      {
        projectId: blank.projects[0]!.id,
        incurredCosts: 0,
        values: [1, 2, 3],
        inputSeries: [],
      },
    ]
    const snapshot = buildArchivedAnalysisSnapshot({
      projects: blank.projects,
      activeProjectId: blank.activeProjectId,
      projectResults: fakeResults,
      simulatedBaseCostByProjectId: { [blank.projects[0]!.id]: 10 },
      inputSignature: "sig",
      simulationCount: 1000,
      resultPreferences: DEFAULT_RESULT_PREFERENCES,
    })
    const archived = archiveCheckpoint(ongoing, cp1.id, snapshot)
    expect(archived.checkpoints[0]!.status).toBe("archived")
    expect(archived.checkpoints[0]!.archivedSnapshot).toBeDefined()
  })

  it("syncActiveCheckpointWorkspace does not mutate archived checkpoints", () => {
    const blank = createBlankWorkspaceRuntimeState()
    let ongoing = createInitialOngoingState({
      projects: blank.projects,
      activeProjectId: blank.activeProjectId,
    })
    const snap = buildArchivedAnalysisSnapshot({
      projects: blank.projects,
      activeProjectId: blank.activeProjectId,
      projectResults: [
        {
          projectId: blank.projects[0]!.id,
          incurredCosts: 0,
          values: [1],
          inputSeries: [],
        },
      ],
      simulatedBaseCostByProjectId: { [blank.projects[0]!.id]: 1 },
      inputSignature: "s",
      simulationCount: 10,
      resultPreferences: DEFAULT_RESULT_PREFERENCES,
    })
    ongoing = archiveCheckpoint(ongoing, ongoing.activeCheckpointId, snap)
    const before = ongoing.checkpoints[0]!.workspace.projects[0]!.name
    const next = syncActiveCheckpointWorkspace(ongoing, {
      projects: [{ ...blank.projects[0]!, name: "Should not write" }],
      activeProjectId: blank.activeProjectId,
    })
    expect(next.checkpoints[0]!.workspace.projects[0]!.name).toBe(before)
  })

  it("normalizeOngoingState rejects empty / invalid payloads", () => {
    expect(normalizeOngoingState(null)).toBeUndefined()
    expect(normalizeOngoingState({ checkpoints: [] })).toBeUndefined()
    const blank = createBlankWorkspaceRuntimeState()
    const valid = createInitialOngoingState({
      projects: blank.projects,
      activeProjectId: blank.activeProjectId,
    })
    const normalized = normalizeOngoingState(valid)
    expect(normalized?.checkpoints).toHaveLength(1)
  })
})
