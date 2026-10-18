// @vitest-environment jsdom
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"

import { H_VARIANTS } from "@/design-lab/families/h"
import { HPage } from "@/design-lab/families/h/HPage"
import { ENTRIES } from "@/design-lab/registry"
import { I18nProvider } from "@/i18n/I18nProvider"

function show(variant: (typeof H_VARIANTS)[number]) {
  window.localStorage.clear()
  render(
    <I18nProvider>
      <HPage variant={variant} />
    </I18nProvider>,
  )
}

describe("family H", () => {
  it("has five looks, registered, with allowed themes", () => {
    expect(H_VARIANTS.length).toBeGreaterThanOrEqual(5)
    expect(ENTRIES.filter((e) => e.family === "h")).toHaveLength(H_VARIANTS.length)
    for (const v of H_VARIANTS) expect(["clay", "current", "harbour"]).toContain(v.theme)
  })

  for (const variant of H_VARIANTS) {
    it(`H${variant.id} follows the owner rules and toggles Les/Rediger`, async () => {
      show(variant)
      expect(screen.getByRole("button", { name: /Neste checkpoint/ })).toBeDisabled()
      expect(screen.getByRole("button", { name: /Arkiver checkpoint/ })).toBeEnabled()
      expect(screen.getByRole("list", { name: "Analysepunkter" })).toBeInTheDocument()
      expect(screen.getByRole("button", { name: /Fokusmodus/ })).toBeInTheDocument()
      expect(screen.queryByRole("button", { name: /Lagre/ })).toBeNull()
      expect(screen.getByRole("region", { name: "Prosjektprofil" })).toBeInTheDocument()
      expect(screen.getByRole("region", { name: "Kostnadsposter" })).toBeInTheDocument()
      expect(screen.getByRole("region", { name: "Drivere" })).toBeInTheDocument()
      expect(screen.getByRole("button", { name: "Les" })).toHaveAttribute("aria-pressed", "true")
      expect(screen.queryByLabelText("Rediger inndata")).toBeNull()

      await userEvent.click(screen.getByRole("button", { name: "Rediger" }))
      expect(screen.getByRole("button", { name: "Rediger" })).toHaveAttribute(
        "aria-pressed",
        "true",
      )
      expect(screen.getByLabelText("Rediger inndata")).toBeInTheDocument()
      expect(screen.getByRole("region", { name: "Kostnadsposter" })).toBeInTheDocument()
      expect(screen.getByRole("region", { name: "Drivere" })).toBeInTheDocument()
      expect(screen.getByRole("region", { name: "Prosjektprofil" })).toBeInTheDocument()

      await userEvent.click(screen.getByRole("button", { name: "Les" }))
      expect(screen.queryByLabelText("Rediger inndata")).toBeNull()
    })
  }
})
