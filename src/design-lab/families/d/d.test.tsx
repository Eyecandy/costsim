// @vitest-environment jsdom
import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"

import { D_VARIANTS } from "@/design-lab/families/d"
import { DPage } from "@/design-lab/families/d/DPage"
import { THEMES } from "@/design-lab/themes"
import { I18nProvider } from "@/i18n/I18nProvider"

function show(id: string) {
  const variant = D_VARIANTS.find((v) => v.id === id)
  if (!variant) throw new Error(`no D${id}`)
  render(
    <I18nProvider>
      <DPage variant={variant} />
    </I18nProvider>,
  )
}

describe("family D", () => {
  it("has ten looks with themes the owner allows", () => {
    expect(D_VARIANTS.length).toBeGreaterThanOrEqual(10)
    for (const v of D_VARIANTS) {
      expect(["clay", "current", "harbour"]).toContain(v.theme)
      expect(THEMES).toHaveProperty(v.theme)
      expect(v.changes.length).toBeGreaterThan(0)
    }
  })

  for (const variant of D_VARIANTS) {
    it(`D${variant.id} shows the checkpoints with a locked next checkpoint`, () => {
      show(variant.id)
      const list = screen.getByRole("list", { name: "Analysepunkter" })
      expect(within(list).getAllByRole("listitem")).toHaveLength(4)
      expect(screen.getByRole("button", { name: /Neste checkpoint/ })).toBeDisabled()
    })
  }

  it("D05 shows progress that grows", async () => {
    const user = userEvent.setup()
    show("05")
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "0")
    await user.click(screen.getByRole("button", { name: /Neste steg/ }))
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "25")
  })

  it("D06 has a help panel and a validation hint", async () => {
    const user = userEvent.setup()
    show("06")
    await user.click(screen.getByRole("button", { name: /Neste steg/ }))
    expect(screen.getByRole("complementary", { name: "Hjelp" })).toBeVisible()
    expect(screen.getByRole("status")).toHaveTextContent("Fyll inn lav, mest sannsynlig og høy")
  })

  it("D07 moves on with Enter and lists the drivers with values", async () => {
    const user = userEvent.setup()
    show("07")
    await user.keyboard("{Enter}")
    expect(screen.getByRole("heading", { name: /2\. Kostnadsposter/ })).toBeVisible()
    expect(screen.getByRole("complementary", { name: "Oppsummering" })).toHaveTextContent("5 %")
  })

  it("D08 reviews before running, then shows the headline number", async () => {
    const user = userEvent.setup()
    show("08")
    for (let i = 0; i < 3; i++) await user.click(screen.getByRole("button", { name: /Neste steg/ }))
    expect(screen.getByText("Kontroller før kjøring")).toBeVisible()
    await user.click(screen.getByRole("button", { name: /Kjør simulering/i }))
    expect(screen.getByText(/9 970 000 kr/)).toBeVisible()
  })
})
