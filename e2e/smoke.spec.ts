import { expect, test, type Page } from "@playwright/test"

/** A valid project (percent deviations around a base cost) so the simulation can run. */
function seedProject() {
  const row = (name: string, optimistic: string, likely: string, pessimistic: string) => ({
    id: `${name}-id`,
    name,
    optimistic,
    likely,
    pessimistic,
  })
  return [
    {
      id: "p-seed-1",
      name: "Alt A",
      incurredCosts: "10",
      costRows: [
        row("Build", "-10", "150", "30"),
        row("Design", "-5", "60", "20"),
        row("Test", "-10", "30", "40"),
      ],
      driverRows: [row("Delay", "-10", "5", "20"), row("Scope", "-5", "10", "15")],
    },
  ]
}

async function seedWorkspace(page: Page) {
  await page.addInitScript((project) => {
    if (window.localStorage.getItem("e2e-seeded")) return
    window.localStorage.setItem("e2e-seeded", "1")
    window.localStorage.setItem("language", "en")
    window.localStorage.setItem("cost-simulator:v1:projects", JSON.stringify(project))
    window.localStorage.setItem("cost-simulator:v1:activeProjectId", "p-seed-1")
  }, seedProject())
}

test("runs a simulation and shows results", async ({ page }) => {
  await seedWorkspace(page)
  await page.goto("/app")
  await page.getByRole("button", { name: "RUN SIMULATION" }).click()
  await expect(page.getByRole("button", { name: "Open larger view" }).first()).toBeVisible({
    timeout: 60_000,
  })
})

test("Focus mode steps forward and back", async ({ page }) => {
  await seedWorkspace(page)
  await page.goto("/app")
  await page.getByRole("button", { name: "Focus mode", exact: true }).first().click()
  const next = page.getByRole("button", { name: "Next", exact: true })
  await expect(next).toBeVisible()
  for (let i = 0; i < 3; i++) await next.click()
  await expect(page.getByRole("button", { name: "Previous", exact: true })).toBeVisible()
  await page.getByRole("button", { name: "Close", exact: true }).click()
  await expect(page.getByRole("button", { name: "RUN SIMULATION" })).toBeVisible()
})

test("creates an analysis from the library", async ({ page }) => {
  await page.addInitScript(() => window.localStorage.setItem("language", "en"))
  await page.goto("/library")
  await page.getByRole("button", { name: "New analysis" }).first().click()
  await page.getByRole("textbox").first().fill("Smoke analysis")
  await page.getByRole("button", { name: "Create", exact: true }).click()
  await expect(page).toHaveURL(/\/app\?analysis=/)
  await expect(page.getByText("Smoke analysis").first()).toBeVisible()
})
