// @vitest-environment jsdom
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"

import { F_VARIANTS } from "@/design-lab/families/f"
import { FPage } from "@/design-lab/families/f/FPage"
import { ENTRIES } from "@/design-lab/registry"
import { I18nProvider } from "@/i18n/I18nProvider"

describe("family F", () => {
  it("has five looks, registered, with allowed themes", () => {
    expect(F_VARIANTS.length).toBeGreaterThanOrEqual(5)
    expect(ENTRIES.filter((e) => e.family === "f")).toHaveLength(F_VARIANTS.length)
    for (const v of F_VARIANTS) expect(["clay", "current", "harbour"]).toContain(v.theme)
  })

  for (const variant of F_VARIANTS) {
    it(`F${variant.id} follows the owner rules`, () => {
      window.localStorage.clear()
      render(
        <I18nProvider>
          <FPage variant={variant} />
        </I18nProvider>,
      )
      expect(screen.getByRole("button", { name: /Neste checkpoint/ })).toBeDisabled()
      expect(screen.getByRole("button", { name: /Arkiver checkpoint/ })).toBeEnabled()
      expect(screen.getByRole("region", { name: "Analysepunkter" })).toBeInTheDocument()
      expect(screen.getByRole("button", { name: /Fokusmodus/ })).toBeInTheDocument()
      expect(screen.queryByRole("button", { name: /Lagre/ })).toBeNull()
      expect(screen.getByRole("region", { name: "Prosjektprofil" })).toBeInTheDocument()
      expect(screen.getByRole("table", { name: "Regneark" })).toBeInTheDocument()
      expect(screen.getByText("Kostnadsposter")).toBeInTheDocument()
      expect(screen.getByText("Drivere")).toBeInTheDocument()
      expect(screen.getByRole("region", { name: "Resultater" })).toBeInTheDocument()
      expect(screen.queryByText(/Ny mappe/) !== null).toBe(variant.library)
    })
  }

  it("shows the selected cell in the formula bar", async () => {
    window.localStorage.clear()
    const variant = F_VARIANTS[0]
    if (!variant) throw new Error("no variants")
    render(
      <I18nProvider>
        <FPage variant={variant} />
      </I18nProvider>,
    )
    await userEvent.click(screen.getByRole("button", { name: /^C\d+ Mest sannsynlig: 3 %/ }))
    expect(screen.getByLabelText("Formellinje")).toHaveTextContent("Markedsprisvekst")
  })
})
