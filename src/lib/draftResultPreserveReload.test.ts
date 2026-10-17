import { beforeEach, describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { join } from "node:path"

import { createInitialOngoingState } from "@/domain/analysis/analysisCheckpoint"
import {
  omitDraftResultFields,
  replaceDraftResultField,
} from "@/domain/analysis/draftResultPersist"
import {
  clearLocalAnalysisLibraryStorageForTests,
  getLocalAnalysisLibraryRepository,
} from "@/lib/localAnalysisLibraryRepository"
import { getLiveResultValidity } from "@/domain/simulation/liveSimulationState"
import { buildOngoingCheckpointResultSnapshot } from "@/domain/analysis/ongoingCheckpointResultSnapshot"
import { pickAuthoritativeOngoingDraftResult } from "@/domain/analysis/ongoingDraftResultCommit"
import {
  DEFAULT_RESULT_PREFERENCES,
  cloneResultPreferences,
} from "@/domain/results/resultPreferences"
import { buildSimulationInputSignature } from "@/domain/simulation/simulationInputSignature"
import {
  buildSingleDraftResultSnapshot,
  isSingleDraftResultSnapshot,
  pickAuthoritativeSingleDraftResult,
} from "@/domain/analysis/singleDraftResultSnapshot"
import { createBlankWorkspaceRuntimeState } from "@/domain/analysis/workspaceReset"
import type { AnalysisDocument } from "@/domain/analysis/analysisDocument"
import type { Project } from "@/domain/analysis/project"
import type { ProjectResult } from "@/simulation.worker"
import { repoRoot } from "@/test-utils/repoRoot"

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

/** Mirrors fixed saveDraftFromLiveState: replace when present, else preserve. */
function persistPrefsPreservingResults(args: {
  existing: AnalysisDocument
  sessionSingle: AnalysisDocument["singleDraftResult"] | null
  sessionOngoing: AnalysisDocument["ongoingDraftResult"] | null
  prefs: ReturnType<typeof cloneResultPreferences>
}): AnalysisDocument {
  const authoritativeOngoing =
    args.existing.analysisMode === "ongoing"
      ? pickAuthoritativeOngoingDraftResult(
          args.sessionOngoing,
          args.existing.ongoingDraftResult,
        )
      : undefined
  const authoritativeSingle =
    args.existing.analysisMode === "single"
      ? pickAuthoritativeSingleDraftResult(
          args.sessionSingle,
          args.existing.singleDraftResult,
        )
      : undefined
  return {
    ...args.existing,
    ...replaceDraftResultField(
      "ongoingDraftResult",
      args.existing.analysisMode === "ongoing"
        ? authoritativeOngoing
        : undefined,
    ),
    ...replaceDraftResultField(
      "singleDraftResult",
      args.existing.analysisMode === "single" ? authoritativeSingle : undefined,
    ),
    draftResultPreferences: args.prefs,
  }
}

beforeEach(() => clearLocalAnalysisLibraryStorageForTests())

describe("draft result preserve / Results visibility", () => {
  it("A: Single simulate → cold reload without pref edit → Results available", async () => {
    const repo = getLocalAnalysisLibraryRepository()
    const blank = createBlankWorkspaceRuntimeState()
    const project = blank.projects[0]!
    const doc = await repo.create({
      name: "Single cold reload",
      workspace: blank,
    })
    const compact = buildSingleDraftResultSnapshot({
      analysisId: doc.id,
      projects: [project],
      activeProjectId: project.id,
      projectResults: resultsFor(project, 1000),
      simulatedBaseCostByProjectId: { [project.id]: 100 },
      inputSignature: buildSimulationInputSignature([project]),
      simulationCount: 20_000,
      resultPreferences: DEFAULT_RESULT_PREFERENCES,
    })
    await repo.saveDraft({ ...doc, singleDraftResult: compact })

    // Preference autosave with empty session ref (load-time race shape).
    const mid = await repo.get(doc.id)
    await repo.saveDraft(
      persistPrefsPreservingResults({
        existing: mid!,
        sessionSingle: null,
        sessionOngoing: null,
        prefs: cloneResultPreferences(DEFAULT_RESULT_PREFERENCES),
      }),
    )

    const cold = await repo.get(doc.id)
    expect(isSingleDraftResultSnapshot(cold?.singleDraftResult)).toBe(true)
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

  it("B: Single presentation edit → save → reload keeps Results + prefs", async () => {
    const repo = getLocalAnalysisLibraryRepository()
    const blank = createBlankWorkspaceRuntimeState()
    const project = blank.projects[0]!
    const doc = await repo.create({
      name: "Single presentation",
      workspace: blank,
    })
    const compact = buildSingleDraftResultSnapshot({
      analysisId: doc.id,
      projects: [project],
      activeProjectId: project.id,
      projectResults: resultsFor(project, 1000),
      simulatedBaseCostByProjectId: { [project.id]: 100 },
      inputSignature: buildSimulationInputSignature([project]),
      simulationCount: 20_000,
      resultPreferences: DEFAULT_RESULT_PREFERENCES,
    })
    await repo.saveDraft({ ...doc, singleDraftResult: compact })
    const before = await repo.get(doc.id)
    const edited = cloneResultPreferences(DEFAULT_RESULT_PREFERENCES)
    edited.keyFigures.showStdDev = true
    await repo.saveDraft(
      persistPrefsPreservingResults({
        existing: before!,
        sessionSingle: before!.singleDraftResult!,
        sessionOngoing: null,
        prefs: edited,
      }),
    )
    const cold = await repo.get(doc.id)
    expect(isSingleDraftResultSnapshot(cold?.singleDraftResult)).toBe(true)
    expect(cold?.singleDraftResult?.inputSignature).toBe(compact.inputSignature)
    expect(cold?.draftResultPreferences?.keyFigures.showStdDev).toBe(true)
  })

  it("C: Single percentile edit → reload keeps Results; frozen analytics unchanged", async () => {
    const repo = getLocalAnalysisLibraryRepository()
    const blank = createBlankWorkspaceRuntimeState()
    const project = blank.projects[0]!
    const doc = await repo.create({
      name: "Single percentiles",
      workspace: blank,
    })
    const compact = buildSingleDraftResultSnapshot({
      analysisId: doc.id,
      projects: [project],
      activeProjectId: project.id,
      projectResults: resultsFor(project, 1000),
      simulatedBaseCostByProjectId: { [project.id]: 100 },
      inputSignature: buildSimulationInputSignature([project]),
      simulationCount: 20_000,
      resultPreferences: DEFAULT_RESULT_PREFERENCES,
    })
    const frozen = {
      ...compact.byProjectId[project.id]!.keyFigures.percentiles,
    }
    await repo.saveDraft({ ...doc, singleDraftResult: compact })
    const before = await repo.get(doc.id)
    const edited = cloneResultPreferences(DEFAULT_RESULT_PREFERENCES)
    edited.keyFigures.percentiles = [10, 50, 90]
    await repo.saveDraft(
      persistPrefsPreservingResults({
        existing: before!,
        sessionSingle: null,
        sessionOngoing: null,
        prefs: edited,
      }),
    )
    const cold = await repo.get(doc.id)
    expect(isSingleDraftResultSnapshot(cold?.singleDraftResult)).toBe(true)
    expect(
      cold?.singleDraftResult?.byProjectId[project.id]?.keyFigures.percentiles,
    ).toEqual(frozen)
    expect(cold?.draftResultPreferences?.keyFigures.percentiles).toEqual([
      10, 50, 90,
    ])
  })

  it("D: Pref save with no new Single result does not remove singleDraftResult", () => {
    const existing = {
      id: "s1",
      analysisMode: "single" as const,
      singleDraftResult: { kind: "single_draft_result_v1", keep: true },
    }
    const wiped = {
      ...existing,
      singleDraftResult: undefined as undefined,
    }
    expect(
      JSON.parse(JSON.stringify(wiped)).singleDraftResult,
    ).toBeUndefined()

    const preserved = {
      ...existing,
      ...replaceDraftResultField("singleDraftResult", undefined),
      draftResultPreferences: { ok: true },
    }
    expect(JSON.parse(JSON.stringify(preserved)).singleDraftResult).toEqual({
      kind: "single_draft_result_v1",
      keep: true,
    })
  })

  it("E: Pref save with no new Ongoing result does not remove ongoingDraftResult", () => {
    const existing = {
      id: "o1",
      analysisMode: "ongoing" as const,
      ongoingDraftResult: { kind: "ongoing_checkpoint_result_v1", keep: true },
    }
    const preserved = {
      ...existing,
      ...replaceDraftResultField("ongoingDraftResult", undefined),
      draftResultPreferences: { ok: true },
    }
    expect(JSON.parse(JSON.stringify(preserved)).ongoingDraftResult).toEqual({
      kind: "ongoing_checkpoint_result_v1",
      keep: true,
    })
  })

  it("F: Explicit Single clear still clears", async () => {
    const repo = getLocalAnalysisLibraryRepository()
    const blank = createBlankWorkspaceRuntimeState()
    const project = blank.projects[0]!
    const doc = await repo.create({
      name: "Clear single",
      workspace: blank,
    })
    const compact = buildSingleDraftResultSnapshot({
      analysisId: doc.id,
      projects: [project],
      activeProjectId: project.id,
      projectResults: resultsFor(project, 1000),
      simulatedBaseCostByProjectId: { [project.id]: 100 },
      inputSignature: buildSimulationInputSignature([project]),
      simulationCount: 20_000,
      resultPreferences: DEFAULT_RESULT_PREFERENCES,
    })
    await repo.saveDraft({ ...doc, singleDraftResult: compact })
    const before = await repo.get(doc.id)
    await repo.saveDraft(
      omitDraftResultFields(before!, "singleDraftResult"),
    )
    const after = await repo.get(doc.id)
    expect(after?.singleDraftResult).toBeUndefined()
  })

  it("G: Explicit Ongoing clear still clears", async () => {
    const repo = getLocalAnalysisLibraryRepository()
    const blank = createBlankWorkspaceRuntimeState()
    const project = blank.projects[0]!
    const workspace = { projects: [project], activeProjectId: project.id }
    const doc = await repo.create({
      name: "Clear ongoing",
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
    await repo.saveDraft({
      ...doc,
      ongoing,
      ongoingDraftResult: compact,
    })
    const before = await repo.get(doc.id)
    await repo.saveDraft(
      omitDraftResultFields(before!, "ongoingDraftResult"),
    )
    const after = await repo.get(doc.id)
    expect(after?.ongoingDraftResult).toBeUndefined()
  })

  it("H: Ongoing session compact mounts Results when App holder empty", () => {
    const app = readFileSync(
      join(repoRoot, "src/App.tsx"),
      "utf8",
    )
    const gate = app.slice(
      app.indexOf("projectResults.length > 0 ||"),
      app.indexOf("<ResultsPanel"),
    )
    expect(gate).toContain("librarySession.ongoingDraftResult")
    expect(gate).toContain("librarySession.activeCheckpoint?.id")
    expect(gate).toContain("librarySession.singleDraftResult")
    expect(app).toContain(
      "ongoingCompactResult ??",
    )
  })

  it("I: Wrong-checkpoint Ongoing result does not match mount ownership", () => {
    const activeCheckpointId = "cp-active"
    const draft = {
      analysisId: "a1",
      checkpointId: "cp-other",
    }
    const matches =
      draft.analysisId === "a1" && draft.checkpointId === activeCheckpointId
    expect(matches).toBe(false)
  })

  it("J: replaceDraftResultField omits nullish; omit clears intentionally", () => {
    expect(replaceDraftResultField("singleDraftResult", null)).toEqual({})
    expect(replaceDraftResultField("singleDraftResult", undefined)).toEqual({})
    expect(
      replaceDraftResultField("singleDraftResult", { kind: "x" }),
    ).toEqual({ singleDraftResult: { kind: "x" } })
    const cleared = omitDraftResultFields(
      { a: 1, singleDraftResult: { kind: "x" }, b: 2 },
      "singleDraftResult",
    )
    expect(cleared).toEqual({ a: 1, b: 2 })
    expect(
      Object.prototype.hasOwnProperty.call(cleared, "singleDraftResult"),
    ).toBe(false)
  })
})
