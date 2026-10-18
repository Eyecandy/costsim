import { describe, expect, it } from "vitest"
import { readAppSource } from "@/test-utils/appSource"
import { readMessagesSource } from "@/test-utils/messagesSource"
import { readResultsPanelSource } from "@/test-utils/resultsPanelSource"

describe("archive and create next Results shortcut", () => {
  it("exposes NO/EN labels for Options and archive action", () => {
    const messages = readMessagesSource()
    expect(messages).toContain('archiveAndCreateNextAction: "Arkiver og opprett neste checkpoint"')
    expect(messages).toContain('archiveAndCreateNextAction: "Archive and create next checkpoint"')
    expect(messages).toContain('optionsHeading: "Valg"')
    expect(messages).toContain('optionsHeading: "Options"')
  })

  it("Results Options expander hosts archive when callback is provided", () => {
    const panel = readResultsPanelSource()
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
    const panel = readResultsPanelSource()
    expect(panel).toContain("{!analysisArchivedView && onRequestArchiveAndCreateNext ? (")
    const app = readAppSource()
    expect(app).toContain("isOngoingAnalysis && librarySession.canArchive")
  })

  it("Reset / Nullstill is removed from Results Options", () => {
    const panel = readResultsPanelSource()
    const app = readAppSource()
    const messages = readMessagesSource()
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
