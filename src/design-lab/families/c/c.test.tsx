// @vitest-environment jsdom
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { C_VARIANTS } from "@/design-lab/families/c"
import { CPage } from "@/design-lab/families/c/CPage"
import { I18nProvider } from "@/i18n/I18nProvider"

function renderLook(id: string) {
  const variant = C_VARIANTS.find((v) => v.id === id)
  if (!variant) throw new Error(`no C${id}`)
  return render(
    <I18nProvider>
      <CPage variant={variant} />
    </I18nProvider>,
  )
}

describe("family C looks", () => {
  it("only uses allowed themes", () => {
    for (const v of C_VARIANTS) expect(["clay", "current", "harbour"]).toContain(v.theme)
  })

  it("every look has the checkpoint rules and Fokusmodus", () => {
    for (const v of C_VARIANTS.filter((x) => Number(x.id) >= 11)) {
      const { unmount } = renderLook(v.id)
      expect(screen.getByRole("button", { name: /Arkiver checkpoint/ })).toBeEnabled()
      expect(screen.getByRole("button", { name: /Neste checkpoint/ })).toBeDisabled()
      expect(screen.getAllByRole("button", { name: /Fokusmodus/ })[0]).toBeInTheDocument()
      unmount()
    }
  })

  it("C13 shows totals and C14 reveals row actions", () => {
    const first = renderLook("13")
    expect(screen.getAllByText("8 600 000 kr").length).toBeGreaterThan(0)
    first.unmount()
    renderLook("14")
    expect(screen.getAllByRole("button", { name: /Rediger Grunnarbeid/ })).toHaveLength(1)
  })
})
