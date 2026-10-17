import { beforeEach, describe, expect, it, vi } from "vitest"
import { readFileSync } from "node:fs"
import { join } from "node:path"

import {
  clearLocalAnalysisLibraryStorageForTests,
} from "@/lib/localAnalysisLibraryRepository"
import { getAnalysisLibraryRepository } from "@/lib/analysisLibraryRepository"
import {
  buildArchivedAnalysisSnapshot,
  canArchiveCurrentResults,
  getArchiveBlockReason,
} from "@/lib/buildArchivedAnalysisSnapshot"
import { buildDraftResultSeedFromArchive } from "@/lib/draftResultSeed"
import { cloneProjectsWithMaps } from "@/lib/cloneAnalysisWorkspace"
import {
  DEFAULT_RESULT_PREFERENCES,
  normalizeResultPreferences,
  resolveResultView,
} from "@/lib/resultPreferences"
import type { ShapleyAttributionResult } from "@/domain/simulation/shapleyAttribution"
import { createBlankWorkspaceRuntimeState } from "@/lib/workspaceReset"
import { buildSimulationInputSignature } from "@/domain/simulation/simulationInputSignature"
import { messages } from "@/i18n/messages"
import type { ProjectResult } from "@/simulation.worker"
import { repoRoot } from "@/test-utils/repoRoot"


function fakeShapley(id: string): ShapleyAttributionResult {
  return {
    baseCost: 100,
    estimatedP50: 120,
    estimatedP85: 150,
    expectedAddition: 20,
    uncertaintyReserve: 30,
    contributions: [
      { type: "cost", id, name: "Cost A", contribution: 20 },
    ],
    expectedAdditionDecomposition: {
      startValue: 100,
      endValue: 120,
      contributions: [
        { type: "cost", id, name: "Cost A", contribution: 20 },
      ],
    },
    uncertaintyReserveDecomposition: {
      startValue: 120,
      endValue: 150,
      contributions: [
        { type: "cost", id, name: "Cost A", contribution: 30 },
      ],
    },
    diagnostics: {} as ShapleyAttributionResult["diagnostics"],
  }
}

function fakeResults(projectId: string): ProjectResult[] {
  return [
    {
      projectId,
      incurredCosts: 0,
      values: [100, 110, 120, 130, 140],
      inputSeries: [],
    },
  ]
}

describe("archive validity", () => {
  it("blocks archive when there are no simulation results", () => {
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
  })

  it("blocks archive when analytical inputs diverge from last simulation signature", () => {
    const blank = createBlankWorkspaceRuntimeState()
    const results = fakeResults(blank.projects[0]!.id)
    const withInput = [
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
    const signature = buildSimulationInputSignature(withInput)
    const edited = [
      {
        ...withInput[0]!,
        costRows: withInput[0]!.costRows.map((r, i) =>
          i === 0 ? { ...r, likely: "200" } : r,
        ),
      },
    ]
    expect(
      getArchiveBlockReason({
        projects: edited,
        projectResults: results,
        lastSimulatedInputSignature: signature,
      }),
    ).toBe("stale_results")
  })

  it("descriptive name edit does not block archive", () => {
    const blank = createBlankWorkspaceRuntimeState()
    const results = fakeResults(blank.projects[0]!.id)
    const signature = JSON.stringify(blank.projects)
    blank.projects[0]!.name = "Edited after sim"
    expect(
      getArchiveBlockReason({
        projects: blank.projects,
        projectResults: results,
        lastSimulatedInputSignature: signature,
      }),
    ).toBeNull()
  })

  it("allows archive when results match current input signature", () => {
    const blank = createBlankWorkspaceRuntimeState()
    const results = fakeResults(blank.projects[0]!.id)
    const signature = JSON.stringify(blank.projects)
    expect(
      getArchiveBlockReason({
        projects: blank.projects,
        projectResults: results,
        lastSimulatedInputSignature: signature,
      }),
    ).toBeNull()
    expect(
      canArchiveCurrentResults({
        projects: blank.projects,
        projectResults: results,
        lastSimulatedInputSignature: signature,
      }),
    ).toBe(true)
  })

  it("exposes discreet NO/EN feedback copy for blocked archive", () => {
    expect(messages.no.library.archiveNeedsSimulation).toBe(
      "Kjør simuleringen før analysen arkiveres.",
    )
    expect(messages.en.library.archiveNeedsSimulation).toBe(
      "Run the simulation before archiving the analysis.",
    )
    expect(messages.no.library.archiveNeedsRerun).toBe(
      "Input er endret. Kjør simuleringen på nytt før analysen arkiveres.",
    )
    expect(messages.en.library.archiveNeedsRerun).toBe(
      "Inputs have changed. Run the simulation again before archiving the analysis.",
    )
    const app = readFileSync(join(repoRoot, "src/App.tsx"), "utf8")
    expect(app).toContain("getArchiveBlockReason")
    expect(app).toContain("archiveNeedsSimulation")
    expect(app).toContain("archiveNeedsRerun")
    expect(app).toContain("showArchiveBlockedNotice")
    // Validation before confirm dialog (shared menu + Results shortcut).
    expect(app).toContain("const requestArchiveCheckpoint = useCallback")
    expect(app).toMatch(
      /requestArchiveCheckpoint = useCallback\(\(\) => \{[\s\S]*?getArchiveBlockReason[\s\S]*?setArchiveConfirmOpen\(true\)/,
    )
    expect(app).toContain("onArchive={requestArchiveCheckpoint}")
  })
})

describe("archived Result View capture", () => {
  beforeEach(() => {
    clearLocalAnalysisLibraryStorageForTests()
  })

  it("freezes non-default Result Preferences into snapshot.resultView", async () => {
    const blank = createBlankWorkspaceRuntimeState()
    const project = blank.projects[0]!
    const prefs = normalizeResultPreferences({
      ...DEFAULT_RESULT_PREFERENCES,
      keyFigures: {
        ...DEFAULT_RESULT_PREFERENCES.keyFigures,
        percentiles: [40, 50, 85],
      },
      sCurve: {
        ...DEFAULT_RESULT_PREFERENCES.sCurve,
        useKeyFigurePercentiles: false,
        percentiles: [40, 50, 85],
      },
    })
    const resolved = resolveResultView(prefs)
    const signature = JSON.stringify(blank.projects)
    const snapshot = buildArchivedAnalysisSnapshot({
      projects: blank.projects,
      activeProjectId: blank.activeProjectId,
      projectResults: fakeResults(project.id),
      simulatedBaseCostByProjectId: { [project.id]: 100 },
      inputSignature: signature,
      simulationCount: 20_000,
      resultPreferences: prefs,
      shapleyByProjectId: {
        [project.id]: fakeShapley(project.costRows[0]?.id ?? "c1"),
      },
    })

    expect(snapshot.resultPreferences.keyFigures.percentiles).toEqual([
      40, 50, 85,
    ])
    expect(snapshot.resultView).toEqual(resolved)
    expect(snapshot.resultView.sCurve.percentiles).toEqual([40, 50, 85])

    const repo = getAnalysisLibraryRepository()
    const doc = await repo.create({
      name: "Prefs archive",
      folderId: null,
      workspace: {
        projects: blank.projects,
        activeProjectId: blank.activeProjectId,
      },
    })
    const archived = await repo.archive({
      analysisId: doc.id,
      snapshot,
    })
    expect(archived.archivedSnapshot?.resultView).toEqual(resolved)

    // Snapshot is self-contained — non-default percentiles must survive archive.
    expect(DEFAULT_RESULT_PREFERENCES.keyFigures.percentiles).not.toEqual([
      40, 50, 85,
    ])
  })

  it("App archives from the same live Result Preferences hook as ResultsPanel", () => {
    const app = readFileSync(join(repoRoot, "src/App.tsx"), "utf8")
    const panel = readFileSync(
      join(repoRoot, "src/components/ResultsPanel.tsx"),
      "utf8",
    )
    expect(app).toContain("useResultPreferences")
    expect(app).toContain("resultPreferences,")
    expect(app).toContain("liveResultPreferences={resultPreferences}")
    expect(panel).not.toContain("useResultPreferences")
    expect(panel).toContain("liveResultPreferences")
    expect(panel).toContain("archivedSnapshot!.resultPreferences")
    expect(panel).toContain("archivedSnapshot!.resultView")
  })
})

describe("create new version inherits archived results", () => {
  beforeEach(() => {
    clearLocalAnalysisLibraryStorageForTests()
  })

  it("seeds remapped results + Result View without invoking workers", async () => {
    const shapleySpy = vi.spyOn(
      await import("@/domain/simulation/shapleyWorkerMessages"),
      "runShapleyAttributionForPayload",
    )
    const blank = createBlankWorkspaceRuntimeState()
    // Ensure at least one cost row id for shapley remap coverage.
    if (!blank.projects[0]!.costRows[0]) {
      blank.projects[0]!.costRows = [
        {
          id: "cost-a",
          name: "Cost A",
          optimistic: "90",
          likely: "100",
          pessimistic: "110",
        },
      ]
    }
    const costId = blank.projects[0]!.costRows[0]!.id
    const prefs = normalizeResultPreferences({
      ...DEFAULT_RESULT_PREFERENCES,
      keyFigures: {
        ...DEFAULT_RESULT_PREFERENCES.keyFigures,
        percentiles: [40, 50],
      },
      sCurve: {
        ...DEFAULT_RESULT_PREFERENCES.sCurve,
        useKeyFigurePercentiles: true,
        percentiles: [40, 50],
      },
    })
    const signature = JSON.stringify(blank.projects)
    const repo = getAnalysisLibraryRepository()
    const doc = await repo.create({
      name: "Source",
      folderId: null,
      workspace: {
        projects: blank.projects,
        activeProjectId: blank.activeProjectId,
      },
    })
    const archived = await repo.archive({
      analysisId: doc.id,
      snapshot: buildArchivedAnalysisSnapshot({
        projects: blank.projects,
        activeProjectId: blank.activeProjectId,
        projectResults: fakeResults(blank.projects[0]!.id),
        simulatedBaseCostByProjectId: { [blank.projects[0]!.id]: 100 },
        inputSignature: signature,
        simulationCount: 20_000,
        resultPreferences: prefs,
        shapleyByProjectId: { [blank.projects[0]!.id]: fakeShapley(costId) },
      }),
    })
    const archivedSnapshotBefore = structuredClone(archived.archivedSnapshot)

    const draft = await repo.createDraftFromArchived({
      archivedId: archived.id,
      name: "Source (ny versjon)",
    })

    expect(draft.id).not.toBe(archived.id)
    expect(draft.status).toBe("draft")
    expect(draft.archivedSnapshot).toBeUndefined()
    expect(draft.draftResultSeed).toBeDefined()
    const seed = draft.draftResultSeed!
    expect(seed.projectResults).toEqual([])
    expect(seed.compactByProjectId?.[draft.workspace.projects[0]!.id]).toBeTruthy()
    expect(JSON.stringify(seed)).not.toContain('"values"')
    expect(seed.inputSignature).toBe(JSON.stringify(draft.workspace.projects))
    expect(seed.resultView.sCurve.percentiles).toEqual(
      resolveResultView(prefs).sCurve.percentiles,
    )
    const remappedShapley =
      seed.shapleyByProjectId[draft.workspace.projects[0]!.id]
    expect(remappedShapley).toBeTruthy()
    expect(remappedShapley!.contributions[0]!.id).toBe(
      draft.workspace.projects[0]!.costRows[0]!.id,
    )
    expect(remappedShapley!.contributions[0]!.id).not.toBe(costId)

    // No Shapley recomputation during version creation.
    expect(shapleySpy).not.toHaveBeenCalled()
    shapleySpy.mockRestore()

    const stillArchived = await repo.get(archived.id)
    expect(stillArchived?.archivedSnapshot).toEqual(archivedSnapshotBefore)
    expect(stillArchived?.workspace.projects[0]!.id).toBe(blank.projects[0]!.id)
  })

  it("inherited compact seed matches signature until first edit; Single archive needs live results", () => {
    const blank = createBlankWorkspaceRuntimeState()
    const { projects: cloned, projectIdMap, rowIdMap } =
      cloneProjectsWithMaps(blank.projects)
    const snapshot = buildArchivedAnalysisSnapshot({
      projects: blank.projects,
      activeProjectId: blank.activeProjectId,
      projectResults: fakeResults(blank.projects[0]!.id),
      simulatedBaseCostByProjectId: { [blank.projects[0]!.id]: 100 },
      inputSignature: JSON.stringify(blank.projects),
      simulationCount: 20_000,
      resultPreferences: DEFAULT_RESULT_PREFERENCES,
      shapleyByProjectId: {},
    })
    const seed = buildDraftResultSeedFromArchive({
      snapshot,
      projectIdMap,
      rowIdMap,
      inputSignature: JSON.stringify(cloned),
    })

    expect(seed.inputSignature).toBe(JSON.stringify(cloned))
    expect(seed.projectResults).toEqual([])
    expect(Object.keys(seed.compactByProjectId ?? {})).toHaveLength(1)
    // Compact display seed alone is not a Single live archive source.
    expect(
      canArchiveCurrentResults({
        projects: cloned,
        projectResults: seed.projectResults,
        lastSimulatedInputSignature: seed.inputSignature,
      }),
    ).toBe(false)
    expect(
      getArchiveBlockReason({
        projects: cloned,
        projectResults: seed.projectResults,
        lastSimulatedInputSignature: seed.inputSignature,
      }),
    ).toBe("no_results")

    cloned[0]!.costRows = cloned[0]!.costRows.map((r, i) =>
      i === 0
        ? {
            ...r,
            name: "Cost",
            optimistic: "90",
            likely: "100",
            pessimistic: "110",
          }
        : r,
    )
    expect(JSON.stringify(cloned)).not.toBe(seed.inputSignature)
  })

  it("ResultsPanel uses draftResultSeed Shapley and does not auto-run while seeded", () => {
    const panel = readFileSync(
      join(repoRoot, "src/components/ResultsPanel.tsx"),
      "utf8",
    )
    expect(panel).toContain("draftResultSeed")
    expect(panel).toContain("useSeededShapley")
    expect(panel).toContain("draftResultSeed.shapleyByProjectId")
    expect(panel).toMatch(
      /inputsStale:[\s\S]*?useSeededShapley/,
    )
    const seed = readFileSync(
      join(repoRoot, "src/lib/draftResultSeed.ts"),
      "utf8",
    )
    expect(seed).toContain("buildDraftResultSeedFromArchive")
    expect(seed).not.toContain("DraftResultSnapshotV1")
    const app = readFileSync(join(repoRoot, "src/App.tsx"), "utf8")
    expect(app).toContain("clearDraftResultSeedRef")
    expect(app).toContain("applyDraftResultSeed")
  })
})
