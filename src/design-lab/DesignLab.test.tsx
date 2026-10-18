// @vitest-environment jsdom
import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it } from "vitest"

import { LabGallery } from "@/design-lab/Gallery"
import { LabPage } from "@/design-lab/LabPage"
import { THEMES } from "@/design-lab/themes"
import { getVariant, VARIANTS } from "@/design-lab/variants"
import { I18nProvider } from "@/i18n/I18nProvider"

function renderVariant(id: string) {
  const variant = getVariant(id)
  if (!variant) throw new Error(`no variant ${id}`)
  return render(
    <I18nProvider>
      <LabPage variant={variant} bare />
    </I18nProvider>,
  )
}

describe("design lab registry", () => {
  it("finds every variant file, with unique, sorted, two-digit ids", () => {
    const ids = VARIANTS.map((v) => v.id)
    expect(ids.length).toBeGreaterThanOrEqual(9)
    expect(new Set(ids).size).toBe(ids.length)
    expect([...ids].sort()).toEqual(ids)
    for (const id of ids) expect(id).toMatch(/^\d{2}$/)
  })

  it("only uses known themes", () => {
    for (const variant of VARIANTS) expect(THEMES).toHaveProperty(variant.options.theme)
  })
})

describe("every variant renders", () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  for (const variant of VARIANTS) {
    it(`${variant.id} ${variant.title}`, () => {
      renderVariant(variant.id)
      expect(screen.getByRole("banner")).toBeInTheDocument()
      expect(screen.getAllByRole("table").length).toBeGreaterThanOrEqual(2)
    })
  }
})

describe("what the numbered notes change", () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it("note 1 and 4: the file name leaves the header and takes the INPUT label's place", () => {
    renderVariant("01")
    expect(within(screen.getByRole("banner")).queryByText("Ullern renovering")).toBeNull()
    expect(screen.getByRole("heading", { name: "Ullern renovering" })).toBeInTheDocument()
    expect(screen.queryByText("INPUT")).toBeNull()
  })

  it("the current page keeps the file name in the header and the INPUT label", () => {
    renderVariant("00")
    expect(within(screen.getByRole("banner")).getByText("Ullern renovering")).toBeInTheDocument()
    expect(screen.getByText("INPUT")).toBeInTheDocument()
  })

  it("note 3: Checkpoint 1 appears twice today and once in the tidy header", () => {
    const { unmount } = renderVariant("00")
    expect(within(screen.getByRole("tablist")).getAllByText("Checkpoint 1")).toHaveLength(2)
    unmount()
    renderVariant("01")
    expect(within(screen.getByRole("tablist")).getAllByText("Checkpoint 1")).toHaveLength(1)
  })

  it("note 7: the user menu exists only where the variant asks for it", () => {
    const { unmount } = renderVariant("00")
    expect(screen.queryByRole("button", { name: "Konto" })).toBeNull()
    unmount()
    renderVariant("01")
    expect(screen.getByRole("button", { name: "Konto" })).toBeInTheDocument()
  })

  it("note 2: the open sidebar can be hidden and shown again", async () => {
    const user = userEvent.setup()
    renderVariant("02")
    await user.click(screen.getByRole("button", { name: "Skjul meny" }))
    expect(screen.queryByRole("button", { name: "Skjul meny" })).toBeNull()
    await user.click(screen.getByRole("button", { name: "Vis meny" }))
    expect(screen.getByRole("button", { name: "Skjul meny" })).toBeInTheDocument()
  })

  it("note 5: the toolbar shows text next to the icons from step 03", () => {
    const { unmount } = renderVariant("02")
    expect(screen.queryAllByRole("button", { name: "Legg til rad" }).length).toBeGreaterThan(0)
    // Icon-only buttons carry the text as their label, so tell them apart by visible text.
    expect(screen.queryByText("Legg til rad")).toBeNull()
    unmount()
    renderVariant("03")
    expect(screen.getAllByText("Legg til rad").length).toBeGreaterThan(0)
  })

  it("note 6: row actions and the open impact only appear in the row-actions looks", () => {
    const { unmount } = renderVariant("03")
    expect(screen.queryByText(/Påvirkning · Forsinkelse/)).toBeNull()
    unmount()
    renderVariant("04")
    expect(screen.getByText(/Påvirkning · Forsinkelse/)).toBeInTheDocument()
    expect(screen.getAllByRole("button", { name: "Definer" }).length).toBeGreaterThan(3)
  })

  it("the layout ideas: side by side puts both input cards in one grid, full screen adds the mock-up", () => {
    const { unmount } = renderVariant("05")
    expect(screen.queryByLabelText("Fullskjerm resultatvisning")).toBeNull()
    unmount()
    renderVariant("06")
    expect(screen.getByLabelText("Fullskjerm resultatvisning")).toBeInTheDocument()
    expect(screen.getAllByRole("button", { name: /Kjør simulering/i }).length).toBe(1)
  })
})

describe("gallery", () => {
  function renderGallery() {
    return render(
      <I18nProvider>
        <LabGallery />
      </I18nProvider>,
    )
  }

  it("links to every variant", () => {
    renderGallery()
    for (const variant of VARIANTS) {
      expect(screen.getByRole("link", { name: `Åpne ${variant.title}` })).toHaveAttribute(
        "href",
        `/design/${variant.id}`,
      )
    }
  })

  it("loads a preview only when asked, one card at a time", async () => {
    const user = userEvent.setup()
    const { container } = renderGallery()
    expect(container.querySelectorAll("iframe")).toHaveLength(0)
    await user.click(
      screen.getAllByRole("button", { name: "Vis forhåndsvisning" })[0] as HTMLElement,
    )
    expect(container.querySelectorAll("iframe")).toHaveLength(1)
  })
})
