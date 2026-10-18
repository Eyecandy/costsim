// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { useState } from "react"
import { describe, expect, it, vi } from "vitest"

import { RenameAnalysisDialog } from "@/app/workspace/RenameAnalysisDialog"
import { throwAnalysisNameConflict } from "@/domain/analysis/analysisNameUniqueness"
import { I18nProvider } from "@/i18n/I18nProvider"
import type { useLibraryAnalysisSession } from "@/features/analysis-library/useLibraryAnalysisSession"

type Session = ReturnType<typeof useLibraryAnalysisSession>

/** Owns the dialog state the way the workspace does, so typing and closing behave for real. */
function Harness({ renameAnalysis }: { renameAnalysis: (name: string) => Promise<void> }) {
  const [open, setOpen] = useState(true)
  const [value, setValue] = useState("Gammelt navn")
  const [error, setError] = useState<string | null>(null)
  const session = { renameAnalysis } as unknown as Session
  return (
    <I18nProvider>
      <p data-testid="state">{open ? "open" : "closed"}</p>
      <RenameAnalysisDialog
        librarySession={session}
        renameError={error}
        renameOpen={open}
        renameValue={value}
        setRenameError={setError}
        setRenameOpen={setOpen}
        setRenameValue={setValue}
      />
    </I18nProvider>
  )
}

describe("RenameAnalysisDialog", () => {
  it("saves the new name and closes", async () => {
    const user = userEvent.setup()
    const renameAnalysis = vi.fn().mockResolvedValue(undefined)
    render(<Harness renameAnalysis={renameAnalysis} />)
    const input = screen.getByRole("textbox")
    await user.clear(input)
    await user.type(input, "Nytt navn{Enter}")
    await waitFor(() => expect(screen.getByTestId("state")).toHaveTextContent("closed"))
    expect(renameAnalysis).toHaveBeenCalledWith("Nytt navn")
  })

  it("keeps the dialog open and explains a name conflict", async () => {
    const user = userEvent.setup()
    const renameAnalysis = vi.fn().mockImplementation(() => {
      throwAnalysisNameConflict()
    })
    render(<Harness renameAnalysis={renameAnalysis} />)
    await user.click(screen.getAllByRole("button").at(-1) as HTMLElement)
    expect(await screen.findByRole("alert")).toBeInTheDocument()
    expect(screen.getByTestId("state")).toHaveTextContent("open")
  })

  it("cannot be confirmed with an empty name", async () => {
    const user = userEvent.setup()
    render(<Harness renameAnalysis={vi.fn()} />)
    await user.clear(screen.getByRole("textbox"))
    expect(screen.getAllByRole("button").at(-1)).toBeDisabled()
  })

  it("closes on a backdrop click but not on a click inside", async () => {
    const user = userEvent.setup()
    render(<Harness renameAnalysis={vi.fn()} />)
    await user.click(screen.getByRole("textbox"))
    expect(screen.getByTestId("state")).toHaveTextContent("open")
    await user.click(screen.getByRole("dialog").parentElement as HTMLElement)
    expect(screen.getByTestId("state")).toHaveTextContent("closed")
  })
})
