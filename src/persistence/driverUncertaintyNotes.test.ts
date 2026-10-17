import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { join } from "node:path"

import { messages } from "@/i18n/messages"
import {
  archiveCheckpoint,
  cloneProjectPreservingIds,
  createInitialOngoingState,
  createNextCheckpoint,
  getLatestCheckpoint,
} from "@/domain/analysis/analysisCheckpoint"
import { buildArchivedAnalysisSnapshot } from "@/domain/analysis/buildArchivedAnalysisSnapshot"
import {
  DRIVER_UNCERTAINTY_NOTE_MAX_LENGTH,
  DRIVER_UNCERTAINTY_NOTES_MAX_PER_SIDE,
  normalizeDriverRowDefinitions,
  normalizeDriverUncertaintyNotes,
  parseDriverUncertaintyNote,
  withDriverUncertaintyNotes,
} from "@/domain/results/rowDefinitions"
import { buildSimulationInputSignature } from "@/domain/simulation/simulationInputSignature"
import { parseProjectsPayload } from "@/domain/analysis/projectsPayload"
import type { DriverRow } from "@/domain/results/tableRows"
import { DEFAULT_RESULT_PREFERENCES } from "@/domain/results/resultPreferences"
import { createBlankWorkspaceRuntimeState } from "@/domain/analysis/workspaceReset"
import { repoRoot } from "@/test-utils/repoRoot"


function readSrc(relativePath: string): string {
  return readFileSync(join(repoRoot, relativePath), "utf8")
}

function driver(partial: Partial<DriverRow> = {}): DriverRow {
  return {
    id: "d1",
    name: "Marked",
    optimistic: "-5",
    likely: "0",
    pessimistic: "12",
    ...partial,
  }
}

describe("driver uncertainty notes", () => {
  it("A: structured notes persist and empty notes normalize cleanly", () => {
    const withNotes = normalizeDriverRowDefinitions(
      driver({
        description: "Market",
        uncertaintyNotes: {
          lowerOutcome: ["  Mild competition  ", ""],
          higherOutcome: ["Tight labour market", "  "],
        },
      }),
    )
    expect(withNotes.uncertaintyNotes).toEqual({
      lowerOutcome: ["Mild competition"],
      higherOutcome: ["Tight labour market"],
    })

    const empty = normalizeDriverUncertaintyNotes({
      lowerOutcome: ["  ", ""],
      higherOutcome: [],
    })
    expect(empty).toBeUndefined()

    const cleared = withDriverUncertaintyNotes(
      driver({
        uncertaintyNotes: {
          lowerOutcome: ["x"],
          higherOutcome: ["y"],
        },
      }),
      { lowerOutcome: [], higherOutcome: [] },
    )
    expect(cleared.uncertaintyNotes).toBeUndefined()

    const roundTrip = parseProjectsPayload([
      {
        id: "p1",
        name: "A",
        incurredCosts: 0,
        costRows: [
          {
            id: "c1",
            name: "Bygg",
            optimistic: "-10",
            likely: "100",
            pessimistic: "20",
          },
        ],
        driverRows: [withNotes],
      },
    ])
    expect(roundTrip![0]!.driverRows[0]!.uncertaintyNotes).toEqual(
      withNotes.uncertaintyNotes,
    )
  })

  it("B: Guide uses Assumptions-style card notes with add/confirm/remove", () => {
    const guided = readSrc("src/features/guided-input/GuidedInputDialog.tsx")
    const editor = readSrc(
      "src/features/scenario-tables/DriverUncertaintyNotesEditor.tsx",
    )
    expect(guided).toContain("DriverUncertaintyNotesEditor")
    expect(guided).toContain("data-guided-driver-uncertainty-notes")
    expect(guided).toContain("pt-3")
    expect(guided).toContain("data-guided-driver-uncertainty-notes-body")
    expect(editor).toContain("data-driver-uncertainty-side={side}")
    expect(editor).toContain("data-driver-uncertainty-add")
    expect(editor).toContain("data-driver-uncertainty-confirm")
    expect(editor).toContain("data-driver-uncertainty-draft")
    expect(editor).toContain("data-driver-uncertainty-card")
    expect(editor).toContain("data-driver-uncertainty-card-expanded")
    expect(editor).toContain("overflow-hidden text-ellipsis whitespace-nowrap")
    expect(editor).toContain("whitespace-pre-wrap break-words")
    expect(editor).toContain("data-driver-uncertainty-remove")
    expect(editor).toContain("data-driver-uncertainty-add-area")
    expect(editor).toContain("parseDriverUncertaintyNote")
    // Cards stack above the add control within each column.
    const listIdx = editor.indexOf("data-driver-uncertainty-list")
    const addIdx = editor.indexOf("data-driver-uncertainty-add-area")
    expect(listIdx).toBeGreaterThan(-1)
    expect(addIdx).toBeGreaterThan(listIdx)
    expect(editor).toContain("text-center")
    expect(editor).toContain('"lowerOutcome"')
    expect(editor).toContain('"higherOutcome"')
    expect(editor).toContain("sm:grid-cols-2")
    expect(editor).toContain("max-h-[11rem]")
    expect(editor).toContain("rounded-md border border-border/60 bg-background")
    // No persistent empty-row creation.
    expect(editor).not.toContain('next[side] = [...next[side], ""]')
    expect(messages.no.inputs.guidedDriverUncertaintyLowerPrompt).toBe(
      "Forhold som kan gi et lavere kostnadsutfall",
    )
    expect(messages.en.inputs.guidedDriverUncertaintyHigherPrompt).toBe(
      "Factors that could lead to a higher cost outcome",
    )
    expect(messages.no.inputs.guidedDriverUncertaintyLowerPercentile).toBe("P10")
    expect(messages.no.inputs.guidedDriverUncertaintyHigherPercentile).toBe(
      "P90",
    )
  })

  it("card UX: empty/whitespace notes are rejected; sides stay independent", () => {
    expect(parseDriverUncertaintyNote("")).toBeNull()
    expect(parseDriverUncertaintyNote("   ")).toBeNull()
    expect(parseDriverUncertaintyNote("  Mild market  ")).toBe("Mild market")

    const editor = readSrc(
      "src/features/scenario-tables/DriverUncertaintyNotesEditor.tsx",
    )
    // Confirm is gated on parse success (empty → disabled / no-op path).
    expect(editor).toContain("draftCanCommit")
    expect(editor).toContain("parseDriverUncertaintyNote(draft)")
    expect(editor).toContain("cancelAdd()")
    // Independent side handlers.
    expect(editor).toContain('addNote("lowerOutcome"')
    expect(editor).toContain('addNote("higherOutcome"')
    expect(editor).toContain('removeNote("lowerOutcome"')
    expect(editor).toContain('removeNote("higherOutcome"')
  })

  it("C: cost items have no structured note UI", () => {
    const guided = readSrc("src/features/guided-input/GuidedInputDialog.tsx")
    const define = readSrc("src/features/scenario-tables/DefineRowEditor.tsx")
    // Driver notes editor only referenced from driver phase, not cost.
    const costPhaseIdx = guided.indexOf('data-guided-phase="cost"')
    const driverPhaseIdx = guided.indexOf('data-guided-phase="driver"')
    expect(driverPhaseIdx).toBeGreaterThan(-1)
    expect(guided.slice(costPhaseIdx, driverPhaseIdx)).not.toContain(
      "DriverUncertaintyNotesEditor",
    )
    // Cost Define path has no notes editor; driver Define reuses the shared one.
    expect(define).toContain('kind === "driver"')
    expect(define).toContain("DriverUncertaintyNotesEditor")
    expect(define).toContain('data-define-kind={props.kind}')
    expect(define).toMatch(
      /props\.kind === "driver" \? \([\s\S]*DriverUncertaintyNotesEditor/,
    )
  })

  it("D: Single round-trip and Ongoing clone/archive freeze notes", () => {
    const blank = createBlankWorkspaceRuntimeState()
    let ongoing = createInitialOngoingState({
      projects: blank.projects,
      activeProjectId: blank.activeProjectId,
    })
    const tip = getLatestCheckpoint(ongoing)!
    const projectId = tip.workspace.activeProjectId
    const project = tip.workspace.projects[0]!
    const withNotes = {
      ...project,
      driverRows: project.driverRows.map((row, index) =>
        index === 0
          ? {
              ...row,
              name: row.name.trim() || "Marked",
              optimistic: "-5",
              likely: "0",
              pessimistic: "12",
              uncertaintyNotes: {
                lowerOutcome: ["Mild competition"],
                higherOutcome: ["Tight market"],
              },
            }
          : row,
      ),
    }
    tip.workspace = {
      ...tip.workspace,
      projects: [withNotes],
    }

    const snap = buildArchivedAnalysisSnapshot({
      projects: tip.workspace.projects,
      activeProjectId: projectId,
      projectResults: [
        {
          projectId,
          incurredCosts: 0,
          values: [100, 110, 120, 130, 140],
          inputSeries: [],
        },
      ],
      simulatedBaseCostByProjectId: { [projectId]: 100 },
      inputSignature: "sig-notes",
      simulationCount: 5,
      resultPreferences: DEFAULT_RESULT_PREFERENCES,
    })
    ongoing = archiveCheckpoint(ongoing, tip.id, snap)
    const archived = ongoing.checkpoints.find((c) => c.status === "archived")!
    const archivedNotes =
      archived.workspace.projects[0]!.driverRows[0]!.uncertaintyNotes
    expect(archivedNotes).toEqual({
      lowerOutcome: ["Mild competition"],
      higherOutcome: ["Tight market"],
    })

    const next = createNextCheckpoint(ongoing, { name: "CP2" })
    expect(next.ok).toBe(true)
    if (!next.ok) return
    ongoing = next.ongoing
    const draft = getLatestCheckpoint(ongoing)!
    expect(draft.workspace.projects[0]!.driverRows[0]!.id).toBe(
      archived.workspace.projects[0]!.driverRows[0]!.id,
    )
    expect(draft.workspace.projects[0]!.driverRows[0]!.uncertaintyNotes).toEqual(
      archivedNotes,
    )

    // Editing the draft must not mutate the archived checkpoint.
    draft.workspace.projects[0]!.driverRows[0] = withDriverUncertaintyNotes(
      draft.workspace.projects[0]!.driverRows[0]!,
      {
        lowerOutcome: ["Changed in draft"],
        higherOutcome: ["Also changed"],
      },
    )
    expect(
      archived.workspace.projects[0]!.driverRows[0]!.uncertaintyNotes,
    ).toEqual({
      lowerOutcome: ["Mild competition"],
      higherOutcome: ["Tight market"],
    })

    const cloned = cloneProjectPreservingIds(withNotes)
    expect(cloned.driverRows[0]!.uncertaintyNotes).toEqual(
      withNotes.driverRows[0]!.uncertaintyNotes,
    )
    expect(cloned.driverRows[0]!.id).toBe(withNotes.driverRows[0]!.id)
  })

  it("E: changing notes does NOT change buildSimulationInputSignature", () => {
    const baseProject = {
      id: "p1",
      name: "A",
      incurredCosts: 0,
      costRows: [
        {
          id: "c1",
          name: "Bygg",
          optimistic: "-10",
          likely: "1000000",
          pessimistic: "20",
        },
      ],
      driverRows: [
        driver({
          optimistic: "-5",
          likely: "0",
          pessimistic: "12",
        }),
      ],
    }
    const withNotes = {
      ...baseProject,
      driverRows: [
        withDriverUncertaintyNotes(baseProject.driverRows[0]!, {
          lowerOutcome: ["A", "B"],
          higherOutcome: ["C"],
        }),
      ],
    }
    expect(buildSimulationInputSignature([baseProject])).toBe(
      buildSimulationInputSignature([withNotes]),
    )
  })

  it("F: two-column layout stacks on narrow screens", () => {
    const editor = readSrc(
      "src/features/scenario-tables/DriverUncertaintyNotesEditor.tsx",
    )
    expect(editor).toContain("grid-cols-1")
    expect(editor).toContain("sm:grid-cols-2")
  })

  it("G: obsolete uncertaintyAssessment removed from active editing paths", () => {
    expect(readSrc("src/features/scenario-tables/DefineRowEditor.tsx")).not.toContain(
      "uncertaintyAssessment",
    )
    expect(readSrc("src/features/guided-input/GuidedInputDialog.tsx")).not.toContain(
      "uncertaintyAssessment",
    )
    expect(readSrc("src/domain/results/tableRows.ts")).not.toContain(
      "uncertaintyAssessment",
    )
    expect(readSrc("src/domain/results/rowDefinitions.ts")).not.toContain(
      "uncertaintyAssessment",
    )
    expect(DRIVER_UNCERTAINTY_NOTE_MAX_LENGTH).toBeGreaterThan(0)
    expect(DRIVER_UNCERTAINTY_NOTES_MAX_PER_SIDE).toBeGreaterThan(0)
  })

  it("Guide modal default size was increased for the two-column notes", () => {
    const guided = readSrc("src/features/guided-input/GuidedInputDialog.tsx")
    expect(guided).toContain("FOCUS_SESSION_CARD_CLASS")
    expect(guided).not.toContain("h-[min(92vh,42rem)] w-[min(96vw,52rem)]")
  })
})
