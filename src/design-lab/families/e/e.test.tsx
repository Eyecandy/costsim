// @vitest-environment jsdom
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { E_VARIANTS } from "@/design-lab/families/e"
import { EPage } from "@/design-lab/families/e/EPage"
import { ENTRIES } from "@/design-lab/registry"
import { I18nProvider } from "@/i18n/I18nProvider"

describe("family E", () => {
  it("has five looks, registered, with allowed themes", () => {
    expect(E_VARIANTS.length).toBeGreaterThanOrEqual(5)
    expect(ENTRIES.filter((e) => e.family === "e")).toHaveLength(E_VARIANTS.length)
    for (const v of E_VARIANTS) expect(["clay", "current", "harbour"]).toContain(v.theme)
  })

  for (const variant of E_VARIANTS) {
    it(`E${variant.id} follows the owner rules`, () => {
      window.localStorage.clear()
      render(
        <I18nProvider>
          <EPage variant={variant} />
        </I18nProvider>,
      )
      expect(screen.getByRole("button", { name: /Neste checkpoint/ })).toBeDisabled()
      expect(screen.getByRole("button", { name: /Arkiver checkpoint/ })).toBeEnabled()
      expect(screen.getByRole("button", { name: /Fokusmodus/ })).toBeInTheDocument()
      expect(screen.queryByRole("button", { name: /Lagre/ })).toBeNull()
      expect(screen.getByRole("region", { name: "Prosjektprofil" })).toBeInTheDocument()
      expect(screen.getByRole("region", { name: "Kostnadsposter" })).toBeInTheDocument()
      expect(screen.getByRole("region", { name: "Drivere" })).toBeInTheDocument()
      expect(screen.getAllByRole("table").length).toBeGreaterThanOrEqual(3)
      expect(screen.queryByText(/Ny mappe/) !== null).toBe(variant.library)
    })
  }
})
