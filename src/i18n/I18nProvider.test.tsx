// @vitest-environment jsdom
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it } from "vitest"

import { I18nProvider } from "@/i18n/I18nProvider"
import { useI18n } from "@/i18n/useI18n"

function LanguageSwitch() {
  const { language, setLanguage, t } = useI18n()
  return (
    <>
      <p data-testid="title">{t("errorBoundary.title")}</p>
      <p data-testid="language">{language}</p>
      <button type="button" onClick={() => setLanguage("en")}>
        en
      </button>
      <button type="button" onClick={() => setLanguage("no")}>
        no
      </button>
    </>
  )
}

function renderSwitch() {
  return render(
    <I18nProvider>
      <LanguageSwitch />
    </I18nProvider>,
  )
}

describe("I18nProvider", () => {
  beforeEach(() => {
    window.localStorage.clear()
    document.documentElement.lang = ""
  })

  it("defaults to Norwegian and sets <html lang>", () => {
    renderSwitch()
    expect(screen.getByTestId("language")).toHaveTextContent("no")
    expect(document.documentElement.lang).toBe("no")
  })

  it("switches the texts and <html lang> together", async () => {
    const user = userEvent.setup()
    renderSwitch()
    const norwegian = screen.getByTestId("title").textContent
    await user.click(screen.getByRole("button", { name: "en" }))
    expect(document.documentElement.lang).toBe("en")
    expect(screen.getByTestId("title").textContent).not.toBe(norwegian)
    await user.click(screen.getByRole("button", { name: "no" }))
    expect(screen.getByTestId("title").textContent).toBe(norwegian)
    expect(document.documentElement.lang).toBe("no")
  })

  it("remembers the choice for the next visit", async () => {
    const user = userEvent.setup()
    const first = renderSwitch()
    await user.click(screen.getByRole("button", { name: "en" }))
    first.unmount()
    renderSwitch()
    expect(screen.getByTestId("language")).toHaveTextContent("en")
  })
})
