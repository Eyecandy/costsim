import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { join } from "node:path"

import { messages } from "@/i18n/messages"
import { clearLocalAnalysisLibraryStorageForTests } from "@/persistence/localAnalysisLibraryRepository"
import { getAnalysisLibraryRepository } from "@/persistence/analysisLibraryRepository"
import { buildArchivedAnalysisSnapshot } from "@/domain/analysis/buildArchivedAnalysisSnapshot"
import { DEFAULT_RESULT_PREFERENCES } from "@/domain/results/resultPreferences"
import { createBlankWorkspaceRuntimeState } from "@/domain/analysis/workspaceReset"
import type { ProjectResult } from "@/domain/simulation/simulationTypes"
import { repoRoot } from "@/test-utils/repoRoot"
import { readAppSource } from "@/test-utils/appSource"
import { readGuidedInputSource } from "@/test-utils/guidedInputSource"
import { readScenarioTableSource } from "@/test-utils/scenarioTableSource"

function readSrc(rel: string) {
  return readFileSync(join(repoRoot, rel), "utf8")
}

describe("archived analysis inspection (read-only)", () => {
  it("A: cost/driver Define inspection opens while Save is omitted", () => {
    const table = readScenarioTableSource()
    const editor = readSrc("src/features/scenario-tables/DefineRowEditor.tsx")
    const app = readAppSource()

    // Selection for Define is allowed even when archived/read-only.
    expect(table).toContain("defineMode.onSelectRow(dataRow.id)")
    expect(table).toMatch(/if \(defineMode\?\.active\) \{[\s\S]*?defineMode\.onSelectRow/)
    expect(table).not.toMatch(
      /onCellClicked = useCallback\(\s*\(cell: Item\) => \{\s*if \(readOnly\) return/,
    )
    expect(app).toContain("if (!defineModeActive) return")
    expect(app).not.toContain("if (!defineModeActive || analysisReadOnly) return")

    expect(editor).toContain("readOnly = props.readOnly === true")
    expect(editor).toContain('data-readonly={readOnly ? "" : undefined}')
    expect(editor).toContain('t("common.close")')
    expect(table).toMatch(/readOnly\s*\n\s*\? undefined/)
    expect(messages.no.inputs.defineViewDetails).toBe("Vis detaljer")
    expect(messages.en.inputs.defineViewDetails).toBe("View details")
    expect(messages.no.common.close).toBe("Lukk")
    expect(messages.en.common.close).toBe("Close")
  })

  it("B: driver Define mode shows description + shared uncertainty notes (read-only safe)", () => {
    const editor = readSrc("src/features/scenario-tables/DefineRowEditor.tsx")
    expect(editor).not.toContain("uncertaintyAssessment")
    expect(editor).not.toContain("defineUncertainty")
    expect(editor).toContain("DriverUncertaintyNotesEditor")
    expect(editor).toContain("readOnly={readOnly}")
    expect(editor).toContain('kind: "driver"')
    // Textareas stay readable (readOnly), not disabled/faint.
    expect(editor).not.toContain("disabled={readOnly}")
    const guided = readGuidedInputSource()
    expect(guided).toContain("DriverUncertaintyNotesEditor")
  })

  it("C: Impact selection works when archived; mutation paths stay gated", () => {
    const table = readScenarioTableSource()
    const app = readAppSource()
    expect(app).toContain("if (!impactModeActive) return")
    expect(app).not.toContain("if (!impactModeActive || analysisReadOnly) return")
    expect(table).toContain("driverImpactMode.onSelectDriver(dataRow.id)")
    expect(table).toContain("if (readOnly) return")
    expect(table).toContain("disabled={readOnly}")
    expect(app).toMatch(/onImpactChange:[\s\S]*?if \(analysisReadOnly\) return/)
  })

  it("D: Correlation remains inspectable; Apply hidden when read-only", () => {
    const table = readScenarioTableSource()
    expect(table).toContain("costCorrelationMode.onToggleCostSelection")
    expect(table).toContain("{!readOnly ? (")
    expect(table).toMatch(/\{!readOnly \? \([\s\S]*?costCorrelationApply[\s\S]*?\) : null\}/)
    expect(table).toContain("if (readOnly) return")
  })

  it("E: draft Define/Impact selection and Save wiring remain intact", () => {
    const table = readScenarioTableSource()
    const editor = readSrc("src/features/scenario-tables/DefineRowEditor.tsx")
    expect(table).toContain('t("expanders.define")')
    expect(editor).toContain('t("inputs.defineSave")')
    expect(table).toContain("withCostDescription")
    expect(table).toContain("withDriverDescription")
    expect(table).toContain("onApplyGroupCorrelation")
  })

  it("F: opening inspection UI does not rewrite archived documents", async () => {
    clearLocalAnalysisLibraryStorageForTests()
    const repo = getAnalysisLibraryRepository()
    const blank = createBlankWorkspaceRuntimeState()
    blank.projects[0]!.costRows[0] = {
      ...blank.projects[0]!.costRows[0]!,
      name: "Bygg",
      description: "Inkl. riving",
    }
    blank.projects[0]!.assumptions = [{ id: "a1", text: "Campus i bruk" }]
    const doc = await repo.create({
      name: "Inspect archive",
      folderId: null,
      workspace: {
        projects: blank.projects,
        activeProjectId: blank.activeProjectId,
      },
    })
    const fakeResults: ProjectResult[] = [
      {
        projectId: blank.projects[0]!.id,
        incurredCosts: 0,
        values: [1, 2, 3],
        inputSeries: [],
      },
    ]
    const archived = await repo.archive({
      analysisId: doc.id,
      snapshot: buildArchivedAnalysisSnapshot({
        projects: blank.projects,
        activeProjectId: blank.activeProjectId,
        projectResults: fakeResults,
        simulatedBaseCostByProjectId: { [blank.projects[0]!.id]: 100 },
        inputSignature: JSON.stringify(blank.projects),
        simulationCount: 20_000,
        resultPreferences: DEFAULT_RESULT_PREFERENCES,
      }),
    })
    const before = structuredClone(archived)

    // Inspection is UI-only; repository must still reject content writes.
    await expect(
      repo.saveDraft({
        ...archived,
        status: "draft",
        workspace: {
          ...archived.workspace,
          projects: archived.workspace.projects.map((p) => ({
            ...p,
            name: "mutated",
          })),
        },
      }),
    ).rejects.toThrow(/archived/i)

    const still = await repo.get(archived.id)
    expect(still).toEqual(before)
    expect(still?.workspace.projects[0]!.costRows[0]!.description).toBe("Inkl. riving")
    expect(still?.workspace.projects[0]!.assumptions?.[0]?.text).toBe("Campus i bruk")
  })
})
