// @vitest-environment jsdom
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { useState } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { I18nProvider } from "@/i18n/I18nProvider"
import { ErrorBoundary } from "@/shared/ErrorBoundary"

function Bomb({ explode }: { explode: boolean }) {
  if (explode) throw new Error("boom")
  return <p>all good</p>
}

/** Lets the test flip the child from throwing to healthy without remounting the boundary. */
function Harness() {
  const [explode, setExplode] = useState(true)
  return (
    <I18nProvider>
      <button type="button" onClick={() => setExplode(false)}>
        fix it
      </button>
      <ErrorBoundary>
        <Bomb explode={explode} />
      </ErrorBoundary>
    </I18nProvider>
  )
}

describe("ErrorBoundary", () => {
  beforeEach(() => {
    // React and logError both print the caught error; keep the test output readable.
    vi.spyOn(console, "error").mockImplementation(() => {})
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("renders children when nothing throws", () => {
    render(
      <I18nProvider>
        <ErrorBoundary>
          <Bomb explode={false} />
        </ErrorBoundary>
      </I18nProvider>,
    )
    expect(screen.getByText("all good")).toBeInTheDocument()
    expect(screen.queryByRole("alert")).not.toBeInTheDocument()
  })

  it("shows a recoverable message instead of a blank page when a child throws", () => {
    render(<Harness />)
    expect(screen.getByRole("alert")).toBeInTheDocument()
    expect(screen.queryByText("all good")).not.toBeInTheDocument()
  })

  it("renders the children again after Try again once the cause is gone", async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await user.click(screen.getByRole("button", { name: "fix it" }))
    const buttons = screen.getAllByRole("button")
    const tryAgain = buttons.find((b) => b.textContent !== "fix it")
    expect(tryAgain).toBeDefined()
    await user.click(tryAgain!)
    expect(screen.getByText("all good")).toBeInTheDocument()
  })
})
