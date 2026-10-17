import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { join } from "node:path"

import {
  clearLocalAnalysisLibraryStorageForTests,
  getLocalAnalysisLibraryRepository,
} from "@/lib/localAnalysisLibraryRepository"
import { createBlankWorkspaceRuntimeState } from "@/lib/workspaceReset"
import { repoRoot } from "@/test-utils/repoRoot"


describe("checkpoint recovery persistence contract", () => {
  it("has no production API for persisting live draft Monte Carlo totals", () => {
    const productionFiles = [
      "src/lib/analysisDocument.ts",
      "src/lib/draftResultSeed.ts",
      "src/lib/localAnalysisLibraryRepository.ts",
      "src/lib/useLibraryAnalysisSession.ts",
      "src/App.tsx",
    ]
    const source = productionFiles
      .map((path) => readFileSync(join(repoRoot, path), "utf8"))
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
