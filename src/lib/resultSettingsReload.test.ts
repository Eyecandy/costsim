import { describe, expect, it } from "vitest"

import { buildSimulationInputSignature } from "@/domain/simulation/simulationInputSignature"
import { getLiveResultValidity } from "@/domain/simulation/liveSimulationState"
import {
  DEFAULT_RESULT_PREFERENCES,
  cloneResultPreferences,
} from "@/domain/results/resultPreferences"
import {
  frozenProbabilityBelowForAmount,
  shouldShowResultSettingsEditor,
  shouldUseCompactResultAnalytics,
} from "@/domain/results/resultSettingsPresentation"
import {
  clearLocalAnalysisLibraryStorageForTests,
  getLocalAnalysisLibraryRepository,
} from "@/lib/localAnalysisLibraryRepository"
import { buildSingleDraftResultSnapshot } from "@/lib/singleDraftResultSnapshot"
import { buildOngoingCheckpointResultSnapshot } from "@/lib/ongoingCheckpointResultSnapshot"
import { createBlankWorkspaceRuntimeState } from "@/lib/workspaceReset"
import { createInitialOngoingState } from "@/lib/analysisCheckpoint"
import type { Project } from "@/lib/project"
import type { ProjectResult } from "@/simulation.worker"
import { beforeEach } from "vitest"

function valuesAround(center: number): number[] {
  return Array.from({ length: 200 }, (_, i) => center + (i - 100) * 0.01)
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

beforeEach(() => clearLocalAnalysisLibraryStorageForTests())

describe("Result Settings compact-reload presentation", () => {
  it("A: Single compact-only editable draft → settings editor shown", () => {
    expect(
      shouldShowResultSettingsEditor({
        analysisArchivedView: false,
        useArchivedResults: false,
      }),
    ).toBe(true)
    expect(
      shouldUseCompactResultAnalytics({
        projectResults: [],
        ongoingCompactResult: null,
        singleArchivedCompact: null,
        singleDraftResult: { kind: "single_draft_result_v1" },
      }),
    ).toBe(true)
  })

  it("B: Ongoing compact-only editable tip → settings editor shown", () => {
    expect(
      shouldShowResultSettingsEditor({
        analysisArchivedView: false,
        useArchivedResults: false,
      }),
    ).toBe(true)
    expect(
      shouldUseCompactResultAnalytics({
        projectResults: [],
        ongoingCompactResult: { kind: "ongoing_checkpoint_result_v1" },
        singleArchivedCompact: null,
        singleDraftResult: null,
      }),
    ).toBe(true)
  })

  it("C: Live Single with persisted session draft → live mode wins", () => {
    const blank = createBlankWorkspaceRuntimeState()
    const project = blank.projects[0]!
    const live = resultsFor(project, 1000)
    expect(
      shouldUseCompactResultAnalytics({
        projectResults: live,
        ongoingCompactResult: null,
        singleArchivedCompact: null,
        singleDraftResult: { kind: "single_draft_result_v1" },
      }),
    ).toBe(false)
    expect(
      shouldShowResultSettingsEditor({
        analysisArchivedView: false,
        useArchivedResults: false,
      }),
    ).toBe(true)
  })

  it("D: Preference reload — draftResultPreferences survives leave/reopen", async () => {
    const repo = getLocalAnalysisLibraryRepository()
    const blank = createBlankWorkspaceRuntimeState()
    const project = blank.projects[0]!
    const doc = await repo.create({
      name: "Prefs reload",
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
    const edited = cloneResultPreferences(DEFAULT_RESULT_PREFERENCES)
    edited.keyFigures.showStdDev = true
    await repo.saveDraft({
      ...doc,
      singleDraftResult: draft,
      draftResultPreferences: edited,
    })
    const cold = await repo.get(doc.id)
    expect(cold!.draftResultPreferences?.keyFigures.showStdDev).toBe(true)
    // Frozen snapshot prefs remain the simulation-time freeze.
    expect(
      cold!.singleDraftResult?.resultPreferences.keyFigures.showStdDev,
    ).toBe(DEFAULT_RESULT_PREFERENCES.keyFigures.showStdDev)
  })

  it("E: Preferences do not affect inputSignature / stale validity", () => {
    const blank = createBlankWorkspaceRuntimeState()
    const project = blank.projects[0]!
    const sig = buildSimulationInputSignature([project])
    const draft = buildSingleDraftResultSnapshot({
      analysisId: "a1",
      projects: [project],
      activeProjectId: project.id,
      projectResults: resultsFor(project, 1000),
      simulatedBaseCostByProjectId: { [project.id]: 100 },
      inputSignature: sig,
      simulationCount: 20_000,
      resultPreferences: DEFAULT_RESULT_PREFERENCES,
    })
    const editedPrefs = cloneResultPreferences(DEFAULT_RESULT_PREFERENCES)
    editedPrefs.keyFigures.showBaseCost = false
    expect(
      getLiveResultValidity({
        analysisId: "a1",
        checkpointId: null,
        currentProjects: [project],
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
        singleDraftResult: {
          ...draft,
          resultPreferences: editedPrefs,
        },
      }).kind,
    ).toBe("valid")
  })

  it("F: Archived Single → settings editor hidden", () => {
    expect(
      shouldShowResultSettingsEditor({
        analysisArchivedView: true,
        useArchivedResults: true,
      }),
    ).toBe(false)
  })

  it("G: Archived Ongoing checkpoint → settings editor hidden", () => {
    expect(
      shouldShowResultSettingsEditor({
        analysisArchivedView: true,
        useArchivedResults: false,
      }),
    ).toBe(false)
    expect(
      shouldShowResultSettingsEditor({
        analysisArchivedView: false,
        useArchivedResults: true,
      }),
    ).toBe(false)
  })

  it("H: Historical CP → active CP visibility flips correctly", () => {
    expect(
      shouldShowResultSettingsEditor({
        analysisArchivedView: true,
        useArchivedResults: true,
      }),
    ).toBe(false)
    expect(
      shouldShowResultSettingsEditor({
        analysisArchivedView: false,
        useArchivedResults: false,
      }),
    ).toBe(true)
  })

  it("I: Compact KF still present; mismatched P(≤amount) not invented", async () => {
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
      resultPreferences: {
        ...DEFAULT_RESULT_PREFERENCES,
        keyFigures: {
          ...DEFAULT_RESULT_PREFERENCES.keyFigures,
          probabilityBelowCostLevel: { enabled: true, amount: 5000 },
        },
      },
    })
    const frozen = draft.byProjectId[project.id]!.keyFigures
    expect(Object.keys(frozen.percentiles).length).toBeGreaterThan(0)
    expect(frozen.probabilityBelowAmount).toBe(5000)
    expect(frozenProbabilityBelowForAmount(frozen, 5000)).toBe(
      frozen.probBelowCostLevel,
    )
    expect(frozenProbabilityBelowForAmount(frozen, 9999)).toBeNull()
    expect(JSON.stringify(draft)).not.toContain('"values":[')
  })

  it("J: Ongoing draft prefs field persists without heavy arrays", async () => {
    const repo = getLocalAnalysisLibraryRepository()
    const blank = createBlankWorkspaceRuntimeState()
    const project = blank.projects[0]!
    const workspace = { projects: [project], activeProjectId: project.id }
    const doc = await repo.create({
      name: "Ongoing prefs",
      analysisMode: "ongoing",
      workspace,
    })
    const ongoing = createInitialOngoingState(workspace)
    const compact = buildOngoingCheckpointResultSnapshot({
      analysisId: doc.id,
      checkpointId: ongoing.activeCheckpointId,
      projects: [project],
      activeProjectId: project.id,
      projectResults: resultsFor(project, 1000),
      simulatedBaseCostByProjectId: { [project.id]: 100 },
      inputSignature: buildSimulationInputSignature([project]),
      simulationCount: 20_000,
      resultPreferences: DEFAULT_RESULT_PREFERENCES,
    })
    const edited = cloneResultPreferences(DEFAULT_RESULT_PREFERENCES)
    edited.keyFigures.showExpectedValue = false
    await repo.saveDraft({
      ...doc,
      ongoing,
      ongoingDraftResult: compact,
      draftResultPreferences: edited,
    })
    const cold = await repo.get(doc.id)
    expect(cold!.draftResultPreferences?.keyFigures.showExpectedValue).toBe(
      false,
    )
    expect(JSON.stringify(cold!.ongoingDraftResult)).not.toContain('"values":[')
  })
})
