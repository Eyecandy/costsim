import { readFileSync } from "node:fs"
import { join } from "node:path"
import { createElement, type ReactElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { AnalysisModeIndicator } from "@/components/AnalysisModeIndicator"
import { CheckpointNav } from "@/components/CheckpointNav"
import { I18nProvider } from "@/i18n/I18nProvider"
import type { AnalysisCheckpoint } from "@/lib/analysisCheckpoint"
import { toAnalysisSummary } from "@/lib/analysisDocument"
import { createBlankWorkspaceRuntimeState } from "@/lib/workspaceReset"
import {
  ANALYSIS_DOCUMENT_SCHEMA_VERSION,
  nowIso,
  type AnalysisDocument,
} from "@/lib/analysisDocument"

const repoRoot = join(import.meta.dirname, "../..")

function renderWithI18n(node: ReactElement) {
  return renderToStaticMarkup(createElement(I18nProvider, null, node))
}

function sampleCheckpoint(
  overrides: Partial<AnalysisCheckpoint> & Pick<AnalysisCheckpoint, "id" | "sequence" | "status">,
): AnalysisCheckpoint {
  const blank = createBlankWorkspaceRuntimeState()
  return {
    name: `Checkpoint ${overrides.sequence}`,
    createdAt: nowIso(),
    archivedAt: overrides.status === "archived" ? nowIso() : null,
    workspace: {
      projects: blank.projects,
      activeProjectId: blank.activeProjectId,
    },
    ...overrides,
  }
}

describe("analysis mode presentation", () => {
  it("CheckpointNav renders timeline chrome, not tab chrome", () => {
    const checkpoints = [
      sampleCheckpoint({ id: "c1", sequence: 1, status: "archived", name: "Concept" }),
      sampleCheckpoint({ id: "c2", sequence: 2, status: "draft", name: "Active" }),
    ]
    const html = renderWithI18n(
      createElement(CheckpointNav, {
        checkpoints,
        activeCheckpointId: "c2",
        onSelect: () => {},
      }),
    )
    expect(html).toContain('data-checkpoint-nav="timeline"')
    expect(html).toContain("role=\"tablist\"")
    expect(html).toContain("checkpoint-tab-c1")
    expect(html).toContain("checkpoint-tab-c2")
    expect(html).not.toContain("rounded-t-lg")
    expect(html).not.toContain("border-b-[1.5px]")
  })

  it("AnalysisModeIndicator is icon-only with tooltip for ongoing mode", () => {
    const ongoing = renderWithI18n(
      createElement(AnalysisModeIndicator, { mode: "ongoing" }),
    )
    expect(ongoing).toContain('data-analysis-mode="ongoing"')
    expect(ongoing).toContain('title="')
    expect(ongoing).toContain('aria-label="')
    expect(ongoing).not.toContain(">Løpende<")
    expect(ongoing).not.toContain(">Ongoing<")

    const single = renderWithI18n(
      createElement(AnalysisModeIndicator, { mode: "single" }),
    )
    expect(single).toBe("")

    const legacy = renderWithI18n(
      createElement(AnalysisModeIndicator, { mode: undefined }),
    )
    expect(legacy).toBe("")
  })

  it("toAnalysisSummary exposes authoritative analysisMode", () => {
    const blank = createBlankWorkspaceRuntimeState()
    const ts = nowIso()
    const base = {
      id: "doc-1",
      name: "A",
      folderId: null,
      status: "draft" as const,
      createdAt: ts,
      updatedAt: ts,
      lastOpenedAt: ts,
      schemaVersion: ANALYSIS_DOCUMENT_SCHEMA_VERSION,
      deletedAt: null,
      workspace: {
        projects: blank.projects,
        activeProjectId: blank.activeProjectId,
      },
    }
    const ongoingDoc: AnalysisDocument = {
      ...base,
      analysisMode: "ongoing",
    }
    expect(toAnalysisSummary(ongoingDoc).analysisMode).toBe("ongoing")

    const singleDoc: AnalysisDocument = {
      ...base,
      id: "doc-2",
      analysisMode: "single",
    }
    expect(toAnalysisSummary(singleDoc).analysisMode).toBe("single")
  })

  it("Library surfaces share AnalysisModeIndicator", () => {
    const page = readFileSync(
      join(repoRoot, "src/AnalysisLibraryPage.tsx"),
      "utf8",
    )
    const nav = readFileSync(
      join(repoRoot, "src/components/AnalysisLibraryNav.tsx"),
      "utf8",
    )
    expect(page).toContain("AnalysisModeIndicator")
    expect(nav).toContain("AnalysisModeIndicator")
    expect(page).toContain("mode={item.analysisMode}")
    expect(nav).toContain("mode={item.analysisMode}")
  })

  it("Single Analysis App branch still uses project tablist chrome", () => {
    const app = readFileSync(join(repoRoot, "src/App.tsx"), "utf8")
    expect(app).toContain("projects.selectProjectTablist")
    expect(app).toContain("border-b-[1.5px] border-[#1d868c]")
    expect(app).toContain("rounded-t-lg")
    expect(app).toMatch(/isOngoingAnalysis\s*\?\s*\([\s\S]*CheckpointNav/)
    expect(app).toContain("STICKY_CONTROL_STRIP_BOTTOM_PAD_CLASS")
    expect(app).toContain("RESULTS_ALIGN_WITH_COST_ITEMS_CLASS")
    expect(app).toContain("RESULTS_COLUMN_CLASS")
    // Single keeps mirrored Results padding; Ongoing uses shared row 3 instead.
    expect(app).toContain("ONGOING_RESULTS_CELL_CLASS")
    expect(app).toContain("RESULTS_ALIGN_WITH_COST_ITEMS_CLASS")
  })

  it("Ongoing Analysis uses shared desktop grid rows instead of padding hacks", () => {
    const app = readFileSync(join(repoRoot, "src/App.tsx"), "utf8")
    expect(app).toContain("ONGOING_WORKSPACE_LAYOUT_CLASS")
    expect(app).toContain("md:grid-rows-[auto_auto_auto]")
    expect(app).toContain("md:gap-y-7")
    expect(app).toContain("md:contents")
    expect(app).toContain('data-analysis-workspace-layout={')
    expect(app).toContain("ONGOING_TIMELINE_CELL_CLASS")
    expect(app).toContain("ONGOING_SIMULATION_CELL_CLASS")
    // Equal sticky gutters: stretch both row-1 cells to the taller simulation height.
    expect(app).toMatch(
      /ONGOING_TIMELINE_CELL_CLASS = cn\(\s*STICKY_CONTROL_STRIP_CLASSNAME,\s*"min-w-0 md:col-start-1 md:row-start-1 md:self-stretch"/,
    )
    expect(app).toMatch(
      /ONGOING_SIMULATION_CELL_CLASS = cn\(\s*STICKY_CONTROL_STRIP_CLASSNAME,\s*"min-w-0 md:col-start-2 md:row-start-1 md:self-stretch"/,
    )
    expect(app).not.toContain("ONGOING_TIMELINE_STICKY_PAD_COMPENSATE_CLASS")
    expect(app).not.toMatch(/ONGOING_TIMELINE[\s\S]{0,200}-mt-\[/)
    expect(app).toContain("md:col-start-1 md:row-start-1")
    expect(app).toContain("md:col-start-1 md:row-start-2")
    expect(app).toContain("md:col-start-1 md:row-start-3")
    expect(app).toContain("md:col-start-2 md:row-start-1")
    expect(app).toContain("md:col-start-2 md:row-start-3")
    expect(app).toContain("ONGOING_PROJECT_PROFILE_CELL_CLASS")
    expect(app).not.toContain("md:grid-rows-subgrid")
    expect(app).not.toContain("ONGOING_LEFT_CONTENT_AFTER_TIMELINE_CLASS")
    expect(app).not.toContain("ONGOING_TIMELINE_STRIP_MATCH_MIN_H_CLASS")
    expect(app).not.toContain("ONGOING_PROJECT_PROFILE_SPACING_CLASS")
    // Single-only bottom pad stays off the Ongoing sticky cells.
    const timelineCellMatch = app.match(
      /const ONGOING_TIMELINE_CELL_CLASS = cn\(([\s\S]*?)\)\nconst ONGOING_PROJECT_PROFILE/,
    )
    expect(timelineCellMatch?.[1] ?? "").not.toContain(
      "STICKY_CONTROL_STRIP_BOTTOM_PAD_CLASS",
    )
    const simulationCellMatch = app.match(
      /const ONGOING_SIMULATION_CELL_CLASS = cn\(([\s\S]*?)\)\nconst ONGOING_RESULTS/,
    )
    expect(simulationCellMatch?.[1] ?? "").not.toContain(
      "STICKY_CONTROL_STRIP_BOTTOM_PAD_CLASS",
    )
  })
})
