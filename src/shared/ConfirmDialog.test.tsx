// @vitest-environment jsdom
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { ConfirmDialog } from "@/shared/ConfirmDialog"

function renderDialog(open = true) {
  const onCancel = vi.fn()
  const onConfirm = vi.fn()
  render(
    <ConfirmDialog
      open={open}
      title="Slette?"
      message="Er du sikker?"
      cancelLabel="Avbryt"
      confirmLabel="Bekreft"
      onCancel={onCancel}
      onConfirm={onConfirm}
    />,
  )
  return { onCancel, onConfirm }
}

describe("ConfirmDialog", () => {
  it("renders nothing while closed", () => {
    renderDialog(false)
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
  })

  it("shows title and message", () => {
    renderDialog()
    expect(screen.getByRole("dialog")).toBeInTheDocument()
    expect(screen.getByText("Slette?")).toBeInTheDocument()
    expect(screen.getByText("Er du sikker?")).toBeInTheDocument()
  })

  it("calls the matching callback for each button", async () => {
    const user = userEvent.setup()
    const { onCancel, onConfirm } = renderDialog()
    await user.click(screen.getByRole("button", { name: "Bekreft" }))
    expect(onConfirm).toHaveBeenCalledTimes(1)
    await user.click(screen.getByRole("button", { name: "Avbryt" }))
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it("cancels on a backdrop click but not on a click inside the dialog", async () => {
    const user = userEvent.setup()
    const { onCancel } = renderDialog()
    await user.click(screen.getByText("Er du sikker?"))
    expect(onCancel).not.toHaveBeenCalled()
    const backdrop = screen.getByRole("dialog").parentElement as HTMLElement
    await user.click(backdrop)
    expect(onCancel).toHaveBeenCalledTimes(1)
  })
})
