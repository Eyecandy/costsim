// @vitest-environment jsdom
import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it } from "vitest"

import { B_VARIANTS } from "@/design-lab/families/b"
import { BPage } from "@/design-lab/families/b/BPage"
import { C_VARIANTS } from "@/design-lab/families/c"
import { CPage } from "@/design-lab/families/c/CPage"
import { D_VARIANTS } from "@/design-lab/families/d"
import { DPage } from "@/design-lab/families/d/DPage"
import { LabGallery } from "@/design-lab/Gallery"
import { LabPage } from "@/design-lab/LabPage"
import { ENTRIES, entryByKey, entryLabel, entryPath, FAMILIES } from "@/design-lab/registry"
import { THEMES } from "@/design-lab/themes"
import { getVariant, VARIANTS } from "@/design-lab/variants"
import { I18nProvider } from "@/i18n/I18nProvider"

function renderVariant(id: string) {
  const variant = getVariant(id)
  if (!variant) throw new Error(`no variant ${id}`)
  return render(
    <I18nProvider>
      <LabPage variant={variant} />
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

  it("checkpoint timeline: three steps on the left, the active one marked, results for checkpoint 3", () => {
    renderVariant("09")
    const timeline = screen.getByRole("navigation", { name: "Analysepunkter" })
    expect(within(timeline).getAllByRole("listitem")).toHaveLength(4)
    expect(within(timeline).getByText("Detaljprosjekt").closest("button")).toHaveAttribute(
      "aria-current",
      "step",
    )
    expect(within(timeline).getByText("Neste checkpoint")).toBeInTheDocument()
    // once as the timeline label and once as the heading of the results card
    expect(screen.getAllByText("Checkpoint 3")).toHaveLength(2)
    expect(screen.queryByRole("tablist")).toBeNull()
  })

  it("checkpoint buttons: none today, no Save anywhere, Neste checkpoint locked until archived", () => {
    const { unmount } = renderVariant("09")
    expect(screen.queryByRole("button", { name: "Arkiver checkpoint" })).toBeNull()
    unmount()

    // open checkpoint: archive is the action, next is locked
    const open = renderVariant("14")
    expect(screen.queryByRole("button", { name: "Lagre" })).toBeNull()
    expect(screen.getByRole("button", { name: "Arkiver checkpoint" })).toBeEnabled()
    expect(
      screen
        .getAllByRole("button", { name: "Neste checkpoint" })
        .every((b) => b.hasAttribute("disabled")),
    ).toBe(true)
    open.unmount()

    // in the header bar (15), still locked
    const header = renderVariant("15")
    const banner = within(screen.getByRole("banner"))
    expect(banner.getByRole("button", { name: "Arkiver checkpoint" })).toBeEnabled()
    expect(banner.getByRole("button", { name: "Neste checkpoint" })).toBeDisabled()
    header.unmount()

    // archived: no archive button, next is open everywhere
    renderVariant("17")
    expect(screen.queryByRole("button", { name: "Arkiver checkpoint" })).toBeNull()
    expect(
      screen
        .getAllByRole("button", { name: "Neste checkpoint" })
        .every((b) => !b.hasAttribute("disabled")),
    ).toBe(true)
  })

  it("Fokusmodus placement: beside the profile, small in its header, a slim bar, or toolbars only", () => {
    const profileButtons = () =>
      within(screen.getByRole("region", { name: "Prosjektprofil" })).queryAllByRole("button", {
        name: /Fokusmodus/,
      })
    const cases: [string, number][] = [
      ["14", 0],
      ["16", 1],
      ["18", 0],
      ["19", 0],
    ]
    for (const [id, inProfile] of cases) {
      const { unmount } = renderVariant(id)
      expect(profileButtons()).toHaveLength(inProfile)
      unmount()
    }
    // the slim bar sits right after the profile; toolbar-only has no extra Fokusmodus button outside the tables
    const bar = renderVariant("18")
    expect(screen.getByText(/Fokusmodus guider deg/)).toBeInTheDocument()
    bar.unmount()
    renderVariant("19")
    expect(screen.queryByText(/Fokusmodus guider deg/)).toBeNull()
    for (const table of screen.getAllByRole("table")) {
      expect(table.closest("section")).not.toBeNull()
    }
    expect(screen.getAllByRole("button", { name: /Fokusmodus/ }).length).toBeGreaterThanOrEqual(2)
  })

  it("project profile example: shown in every look and hidden or shown with the arrow", async () => {
    const user = userEvent.setup()
    for (const entry of ENTRIES) {
      const { unmount } = render(<I18nProvider>{entry.render()}</I18nProvider>)
      const profile = screen.getByRole("region", { name: "Prosjektprofil" })
      expect(within(profile).getByText("Rehabilitering / fornyelse")).toBeVisible()
      expect(within(profile).getByText("Totalentreprise")).toBeVisible()
      unmount()
    }

    renderVariant("12")
    const profile = screen.getByRole("region", { name: "Prosjektprofil" })
    await user.click(within(profile).getByRole("button", { name: "Skjul prosjektprofil" }))
    expect(
      within(profile).getByText("Rehabilitering / fornyelse", { selector: "dd span" }),
    ).not.toBeVisible()
    // collapsed, a one-line summary remains
    expect(within(profile).getByText(/Bygg · Undervisning/)).toBeVisible()
    await user.click(within(profile).getByRole("button", { name: "Vis prosjektprofil" }))
    expect(
      within(profile).getByText("Rehabilitering / fornyelse", { selector: "dd span" }),
    ).toBeVisible()
  })

  it("A12 has no collapse arrows on cost items and drivers, other looks keep them", () => {
    const { unmount } = renderVariant("12")
    for (const name of ["Kostnadsposter", "Drivere"]) {
      const card = screen.getByRole("heading", { name }).closest("section") as HTMLElement
      expect(within(card).queryAllByRole("button", { expanded: true })).toHaveLength(0)
      expect(within(card).queryAllByRole("button", { expanded: false })).toHaveLength(0)
    }
    // the project profile keeps its own arrow
    expect(screen.getByRole("button", { name: "Skjul prosjektprofil" })).toBeInTheDocument()
    unmount()
    renderVariant("10")
    const card = screen
      .getByText("Kostnadsposter", { selector: "span" })
      .closest("section") as HTMLElement
    expect(within(card).getAllByRole("button", { expanded: true }).length).toBeGreaterThan(0)
  })

  it("A21: Fokusmodus on the file name row, not in the toolbars or the profile", () => {
    renderVariant("21")
    const heading = screen.getByRole("heading", { name: "Ullern renovering" })
    const row = heading.parentElement?.parentElement as HTMLElement
    expect(within(row).getByRole("button", { name: /Fokusmodus/ })).toBeInTheDocument()
    expect(screen.getAllByRole("button", { name: /Fokusmodus/ })).toHaveLength(1)
  })

  it("no look uses the Midnight colours", () => {
    expect(Object.keys(THEMES)).not.toContain("midnight")
    expect(Object.values(THEMES).every((theme) => theme.label !== "Midnight")).toBe(true)
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

describe("design families", () => {
  it("every family has looks, keys are unique, and labels are family letter plus id", () => {
    for (const family of FAMILIES) {
      expect(ENTRIES.filter((entry) => entry.family === family.id).length).toBeGreaterThan(0)
    }
    const keys = ENTRIES.map((entry) => entry.key)
    expect(new Set(keys).size).toBe(keys.length)
    const first = ENTRIES.find((entry) => entry.key === "b01")
    expect(first && entryLabel(first)).toBe("B01")
  })

  it("old links without a family letter still mean family A", () => {
    expect(entryByKey("00")?.key).toBe("a00")
    expect(entryByKey("a04")?.key).toBe("a04")
    expect(entryByKey("b03")?.key).toBe("b03")
    expect(entryByKey("zz")).toBeUndefined()
  })

  it("B with the library panel: search and the All / Draft / Archived / Deleted filters work", async () => {
    const user = userEvent.setup()
    const variant = B_VARIANTS.find((candidate) => candidate.sidebar === "library")
    if (!variant) throw new Error("no library variant")
    render(
      <I18nProvider>
        <BPage variant={variant} />
      </I18nProvider>,
    )
    const library = within(screen.getByRole("complementary", { name: "Analysebibliotek" }))
    // "Alle" hides deleted analyses
    expect(library.getByText("Skøyen skole")).toBeInTheDocument()
    expect(library.queryByText("Gammel variant")).toBeNull()
    await user.click(library.getByRole("button", { name: /Slettede/ }))
    expect(library.getByText("Gammel variant")).toBeInTheDocument()
    expect(library.queryByText("Skøyen skole")).toBeNull()
    await user.click(library.getByRole("button", { name: /Utkast/ }))
    expect(library.getByText("Ring 3 utvidelse")).toBeInTheDocument()
    expect(library.queryByText("Fornebu kontor")).toBeNull()
    await user.click(library.getByRole("button", { name: /Alle/ }))
    await user.type(library.getByRole("searchbox", { name: "Søk i analyser" }), "sandvika")
    expect(library.getByText("Sandvika bru")).toBeInTheDocument()
    expect(library.queryByText("Ring 3 utvidelse")).toBeNull()
    // the panel folds into the icon rail and back
    await user.click(screen.getByRole("button", { name: "Skjul bibliotek" }))
    expect(screen.queryByRole("complementary", { name: "Analysebibliotek" })).toBeNull()
    await user.click(screen.getByRole("button", { name: "Vis bibliotek" }))
    expect(screen.getByRole("complementary", { name: "Analysebibliotek" })).toBeInTheDocument()
  })

  it("B nav bar and detail level: the full looks add the key figure table and the change table", () => {
    const withNavBar = B_VARIANTS.filter((variant) => variant.navBar)
    expect(withNavBar.length).toBeGreaterThan(0)
    for (const variant of B_VARIANTS) {
      const { unmount } = render(
        <I18nProvider>
          <BPage variant={variant} />
        </I18nProvider>,
      )
      const header = screen.getAllByRole("banner")
      expect(header.length).toBe(1)
      const brandInBar = screen.queryByText("U·SKOP") !== null
      expect(brandInBar).toBe(variant.navBar)
      const hasChangeTable = screen.queryByRole("columnheader", { name: "Forrige" }) !== null
      expect(hasChangeTable).toBe(variant.detail === "full")
      unmount()
    }
  })

  for (const variant of B_VARIANTS) {
    it(`B${variant.id} ${variant.title} renders its own layout`, async () => {
      const user = userEvent.setup()
      render(
        <I18nProvider>
          <BPage variant={variant} />
        </I18nProvider>,
      )
      expect(screen.getByRole("banner")).toBeInTheDocument()
      // checkpoint steps, the three input tabs and the key figures
      expect(screen.getByRole("list", { name: "Analysepunkter" })).toBeInTheDocument()
      expect(screen.getByText("9 970 000", { selector: "p" })).toBeInTheDocument()
      if (variant.inputs === "tabs") {
        expect(screen.getAllByRole("tab")).toHaveLength(3)
        await user.click(screen.getByRole("tab", { name: /Drivere/ }))
        expect(screen.getByRole("tab", { name: /Drivere/ })).toHaveAttribute(
          "aria-selected",
          "true",
        )
      } else {
        // no tabs: cost items and drivers are both on the page, with the assumptions as a strip
        expect(screen.queryAllByRole("tab")).toHaveLength(0)
        expect(screen.getAllByRole("table").length).toBeGreaterThanOrEqual(2)
        expect(screen.getByRole("heading", { name: /Kostnadsposter/ })).toBeVisible()
        expect(screen.getByRole("heading", { name: /Drivere/ })).toBeVisible()
        expect(screen.getByText("Tomten er ferdig regulert og byggeklar.")).toBeVisible()
      }
    })
  }

  it("B11 puts Fokusmodus by the file name and gives the checkpoints their own colour", () => {
    const variant = B_VARIANTS.find((candidate) => candidate.focusAtTitle)
    if (!variant) throw new Error("no B variant with focusAtTitle")
    render(
      <I18nProvider>
        <BPage variant={variant} />
      </I18nProvider>,
    )
    const commandBar = screen.getAllByRole("banner").at(-1)
    if (!commandBar) throw new Error("no command bar")
    // the only Fokusmodus button inside the command bar, next to the file name
    expect(within(commandBar).getAllByRole("button", { name: "Fokusmodus" })).toHaveLength(1)
    const active = screen.getByRole("button", { current: "step" })
    expect(active.className).toContain("--lab-accent")
  })

  for (const variant of D_VARIANTS) {
    it(`D${variant.id} ${variant.title} walks through the steps`, async () => {
      const user = userEvent.setup()
      render(
        <I18nProvider>
          <DPage variant={variant} />
        </I18nProvider>,
      )
      const steps = screen.getByRole("list", { name: "Steg" })
      expect(within(steps).getAllByRole("listitem")).toHaveLength(4)
      // step 1: Previous is disabled
      expect(screen.getByRole("button", { name: /Forrige steg/ })).toBeDisabled()
      await user.click(screen.getByRole("button", { name: /Neste steg/ }))
      expect(screen.getByRole("heading", { name: /2\. Kostnadsposter/ })).toBeVisible()
      expect(screen.getByRole("table")).toHaveClass("table-fixed")
      // the other input stays in view as a summary
      expect(screen.getByRole("complementary", { name: "Oppsummering" })).toHaveTextContent(
        "Drivere",
      )
      await user.click(screen.getByRole("button", { name: /Neste steg/ }))
      await user.click(screen.getByRole("button", { name: /Neste steg/ }))
      expect(screen.getByRole("heading", { name: /4\. Resultat/ })).toBeVisible()
      // the next checkpoint is locked until the open one is archived
      expect(screen.getByRole("button", { name: /Neste checkpoint/ })).toBeDisabled()
    })
  }

  for (const variant of C_VARIANTS) {
    it(`C${variant.id} ${variant.title} has fixed-size cells and a library with folders`, async () => {
      const user = userEvent.setup()
      render(
        <I18nProvider>
          <CPage variant={variant} />
        </I18nProvider>,
      )
      // cost items and drivers are both visible, in tables with fixed column widths
      const tables = screen.getAllByRole("table")
      expect(tables.length).toBeGreaterThanOrEqual(2)
      expect(tables[0]).toHaveClass("table-fixed")
      // library: search, folders and creating a folder
      const search = screen.getByRole("searchbox", { name: "Søk i analyser" })
      expect(screen.getByRole("button", { name: /Bygg/ })).toBeInTheDocument()
      await user.click(screen.getByRole("button", { name: "Ny mappe" }))
      await user.type(screen.getByRole("textbox", { name: "Navn på ny mappe" }), "Nye prosjekter")
      await user.click(screen.getByRole("button", { name: "Opprett" }))
      expect(screen.getByRole("button", { name: /Nye prosjekter/ })).toBeInTheDocument()
      // search narrows the list
      await user.type(search, "Ring")
      expect(screen.queryByRole("button", { name: /Skøyen skole/ })).not.toBeInTheDocument()
      expect(screen.getByRole("button", { name: /Ring 3 utvidelse/ })).toBeInTheDocument()
    })
  }
})

describe("gallery", () => {
  function renderGallery() {
    return render(
      <I18nProvider>
        <LabGallery />
      </I18nProvider>,
    )
  }

  it("has a section per family and links to every look by family and id", () => {
    renderGallery()
    for (const family of FAMILIES) {
      expect(
        screen.getByRole("heading", { name: new RegExp(`Familie ${family.id.toUpperCase()}`) }),
      ).toBeInTheDocument()
    }
    for (const entry of ENTRIES) {
      expect(screen.getByRole("link", { name: `Åpne ${entry.title}` })).toHaveAttribute(
        "href",
        entryPath(entry),
      )
    }
    expect(screen.getByRole("link", { name: "Åpne Current" })).toHaveAttribute(
      "href",
      "/design/a/00",
    )
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
