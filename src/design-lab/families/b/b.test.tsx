// @vitest-environment jsdom
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"

import { B_VARIANTS } from "@/design-lab/families/b"
import { BPage } from "@/design-lab/families/b/BPage"
import { I18nProvider } from "@/i18n/I18nProvider"

function renderB(id: string) {
  const variant = B_VARIANTS.find((v) => v.id === id)
  if (!variant) throw new Error(`no B${id}`)
  return render(
    <I18nProvider>
      <BPage variant={variant} />
    </I18nProvider>,
  )
}

describe("family B options", () => {
  it("folder library has Ny mappe and the filters", () => {
    renderB("15")
    expect(screen.getByRole("button", { name: /Ny mappe/ })).toBeTruthy()
    expect(screen.getByRole("button", { name: /Arkiverte/ })).toBeTruthy()
  })

  it("detail drawer is closed by default and opens on request", async () => {
    renderB("18")
    expect(screen.queryByLabelText("Detaljer")).toBeNull()
    await userEvent.click(screen.getByRole("button", { name: /Vis detaljer/ }))
    expect(screen.getByLabelText("Detaljer")).toBeTruthy()
  })

  it("key strip replaces the big tiles", () => {
    renderB("17")
    expect(screen.getByRole("group", { name: "NØKKELTALL" })).not.toBeNull()
  })

  it("never has a Save button, and the next checkpoint is locked", () => {
    for (const id of ["15", "16", "17", "18", "19", "20"]) {
      const { unmount } = renderB(id)
      expect(screen.queryByRole("button", { name: /^(Lagre|Save)$/i })).toBeNull()
      const next = screen.getByRole("button", { name: /Neste checkpoint|Next checkpoint/i })
      expect((next as HTMLButtonElement).disabled).toBe(true)
      unmount()
    }
  })
})
