import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import { repoRoot } from "@/test-utils/repoRoot"
import { readAppSource } from "@/test-utils/appSource"

function read(pathFromRepo: string) {
  return readFileSync(join(repoRoot, pathFromRepo), "utf8")
}

describe("archive and create next Results shortcut", () => {
  it("exposes NO/EN labels for Options and archive action", () => {
    const messages = read("src/i18n/messages.ts")
    expect(messages).toContain('archiveAndCreateNextAction: "Arkiver og opprett neste checkpoint"')
    expect(messages).toContain('archiveAndCreateNextAction: "Archive and create next checkpoint"')
    expect(messages).toContain('optionsHeading: "Valg"')
    expect(messages).toContain('optionsHeading: "Options"')
  })

  it("Results Options expander hosts archive when callback is provided", () => {
    const panel = read("src/features/results/ResultsPanel.tsx")
    expect(panel).toContain("onRequestArchiveAndCreateNext")
    expect(panel).toContain('data-archive-and-create-next=""')
    expect(panel).toContain("checkpoints.archiveAndCreateNextAction")
    expect(panel).toContain("results.optionsHeading")
    expect(panel).not.toContain("results.startOverButton")
    expect(panel).not.toContain("onRequestReset")
    expect(panel).toContain("onRequestArchiveAndCreateNext ? (")
  })

  it("App wires the same requestArchiveCheckpoint handler for menu and Results", () => {
    const app = readAppSource()
    expect(app).toContain("const requestArchiveCheckpoint = useCallback")
    expect(app).toContain("onArchive={requestArchiveCheckpoint}")
    expect(app).toContain("canArchive={librarySession.canArchive}")
    expect(app).toContain("isOngoingAnalysis && librarySession.canArchive")
    expect(app).toContain("getArchiveBlockReason")
    expect(app).toContain("archiveActiveCheckpoint")
    expect(app).toContain("canCreateNextCheckpoint(result.ongoing)")
    expect(app).toContain("setNextCheckpointOpen(true)")
    expect(app).toContain("archiveCurrent")
  })

  it("does not show Archive block for archived Results views", () => {
    const panel = read("src/features/results/ResultsPanel.tsx")
    expect(panel).toContain("{!analysisArchivedView && onRequestArchiveAndCreateNext ? (")
    const app = readAppSource()
    expect(app).toContain("isOngoingAnalysis && librarySession.canArchive")
  })

  it("Reset / Nullstill is removed from Results Options", () => {
    const panel = read("src/features/results/ResultsPanel.tsx")
    const app = readAppSource()
    const messages = read("src/i18n/messages.ts")
    expect(panel).not.toContain("onRequestReset")
    expect(panel).not.toContain("results.startOverButton")
    expect(panel).not.toContain("startOverCardHeading")
    expect(app).not.toContain("setResetConfirmOpen")
    expect(app).not.toContain("confirmResetWorkspace")
    expect(app).not.toContain("onRequestReset")
    expect(messages).not.toContain("startOverButton")
    expect(messages).not.toContain('startOverButton: "Nullstill"')
    expect(messages).not.toContain('startOverButton: "Reset"')
  })
})
