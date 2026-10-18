// @vitest-environment jsdom
import { render, screen, within } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { G_VARIANTS } from "@/design-lab/families/g"
import { GPage } from "@/design-lab/families/g/GPage"
import { ENTRIES } from "@/design-lab/registry"
import { I18nProvider } from "@/i18n/I18nProvider"

describe("family G", () => {
  it("has five looks, registered, with allowed themes", () => {
    expect(G_VARIANTS.length).toBeGreaterThanOrEqual(5)
    expect(ENTRIES.filter((e) => e.family === "g")).toHaveLength(G_VARIANTS.length)
    for (const v of G_VARIANTS) expect(["clay", "current", "harbour"]).toContain(v.theme)
  })

  for (const variant of G_VARIANTS) {
    it(`G${variant.id} renders and follows the owner rules`, () => {
      window.localStorage.clear()
      render(
        <I18nProvider>
          <GPage variant={variant} />
        </I18nProvider>,
      )
      expect(screen.getByRole("button", { name: /Neste checkpoint/ })).toBeDisabled()
      expect(screen.getByRole("button", { name: /Arkiver checkpoint/ })).toBeEnabled()
      expect(screen.getByRole("list", { name: "Analysepunkter" })).toBeInTheDocument()
      expect(screen.getByRole("button", { name: /Fokusmodus/ })).toBeInTheDocument()
      expect(screen.queryByRole("button", { name: /Lagre/ })).toBeNull()
      expect(screen.getByRole("region", { name: "Prosjektprofil" })).toBeInTheDocument()
      expect(screen.getByRole("button", { name: /Kjør simulering/ })).toBeInTheDocument()
      expect(screen.getByRole("button", { name: "Rediger Grunnarbeid" })).toBeInTheDocument()
      expect(screen.getByRole("button", { name: "Rediger Forsinkelse" })).toBeInTheDocument()
      const costs = screen.getByRole("region", { name: "Kostnadsposter" })
      expect(within(costs).getAllByRole("button")).toHaveLength(5)
      expect(screen.getByText(/Ny mappe/)).toBeInTheDocument()
    })
  }
})
