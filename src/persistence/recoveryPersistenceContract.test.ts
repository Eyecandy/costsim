import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { join } from "node:path"

import {
  clearLocalAnalysisLibraryStorageForTests,
  getLocalAnalysisLibraryRepository,
} from "@/persistence/localAnalysisLibraryRepository"
import { createBlankWorkspaceRuntimeState } from "@/domain/analysis/workspaceReset"
import { readAppSource } from "@/test-utils/appSource"
import { repoRoot } from "@/test-utils/repoRoot"


describe("checkpoint recovery persistence contract", () => {
  it("has no production API for persisting live draft Monte Carlo totals", () => {
    const productionFiles = [
      "src/domain/analysis/analysisDocument.ts",
      "src/domain/analysis/draftResultSeed.ts",
      "src/persistence/localAnalysisLibraryRepository.ts",
      "src/features/analysis-library/useLibraryAnalysisSession.ts",
      "src/app/App.tsx",
    ]
    const source = productionFiles
      .map((path) =>
        path === "src/app/App.tsx"
          ? readAppSource()
          : readFileSync(join(repoRoot, path), "utf8"),
      )
      .join("\n")

    // Forbid the old heavy draft snapshot API; compact SingleDraft* is allowed.
    expect(source.replaceAll("SingleDraftResultSnapshotV1", "")).not.toContain(
      "DraftResultSnapshotV1",
    )
    expect(source).not.toContain("draftResultSnapshot")
    expect(source).not.toContain("persistDraftResultSnapshot")
    expect(source).toContain("ongoingDraftResult")
    expect(source).toContain("buildOngoingCheckpointResultSnapshot")
    expect(source).toContain("singleDraftResult")
    expect(source).toContain("buildSingleDraftResultSnapshot")
  })

  it("normal autosave remains small when a live 20k result exists outside the document", async () => {
    clearLocalAnalysisLibraryStorageForTests()
    const repo = getLocalAnalysisLibraryRepository()
    const blank = createBlankWorkspaceRuntimeState()
    const doc = await repo.create({
      name: "Small draft",
      analysisMode: "ongoing",
      workspace: {
        projects: blank.projects,
        activeProjectId: blank.activeProjectId,
      },
    })

    const liveSimulationValues = Array.from({ length: 20_000 }, (_, i) => i)
    expect(liveSimulationValues).toHaveLength(20_000)
    await repo.saveDraft(doc)

    const persisted = await repo.get(doc.id)
    const serialized = JSON.stringify(persisted)
    expect(serialized.length).toBeLessThan(50_000)
    expect(serialized).not.toContain('"values"')
  })
})
