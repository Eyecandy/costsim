import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"

import { messages } from "@/i18n/messages"

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = join(__dirname, "../..")

function appSource() {
  return readFileSync(join(repoRoot, "src/App.tsx"), "utf8")
}

describe("simulation run spotlight loading", () => {
  it("A/B: idle shows run CTA; running swaps to text-only Simulerer…", () => {
    expect(messages.no.buttons.runSimulation).toBe("Kjør simulering")
    expect(messages.en.buttons.runSimulation).toBe("Run simulation")
    expect(messages.no.buttons.simulating).toBe("Simulerer…")
    expect(messages.en.buttons.simulating).toBe("Simulating…")

    const app = appSource()
    expect(app).toContain('t("buttons.runSimulation")')
    expect(app).toContain('t("buttons.simulating")')
    expect(app).toContain("SpotlightLoadingText")
    expect(app).toContain('data-simulation-loading=""')
    expect(app).toContain("isRunning ? (")
    expect(app).not.toContain('role={isRunning ? "progressbar"')
    expect(app).not.toContain("bg-white/20")
    expect(app).not.toContain("simulationPhaseMessageKey")
  })

  it("G: keeps a stable h-8 full-width slot for the swap", () => {
    const app = appSource()
    const slotStart = app.indexOf(
      "flex h-8 w-full shrink-0 items-center justify-center",
    )
    expect(slotStart).toBeGreaterThan(-1)
    // Include archived disabled CTA branch; idle/running/archive all stay in-slot.
    const slot = app.slice(slotStart, slotStart + 1600)
    expect(slot).toContain("SpotlightLoadingText")
    expect(slot).toContain("buttons.runSimulation")
    expect(slot).toContain("buttons.simulating")
    expect(slot).toContain("h-8 w-full")
    expect(slot).toContain('data-simulation-loading=""')
    expect(slot).toContain("analysisReadOnly")
  })

  it("reuses the same spotlight component/CSS as Contribution Analysis", () => {
    const app = appSource()
    const panel = readFileSync(
      join(repoRoot, "src/components/ResultsPanel.tsx"),
      "utf8",
    )
    const component = readFileSync(
      join(repoRoot, "src/components/SpotlightLoadingText.tsx"),
      "utf8",
    )
    const css = readFileSync(join(repoRoot, "src/index.css"), "utf8")
    expect(app).toContain('from "@/components/SpotlightLoadingText"')
    expect(panel).toContain('from "@/components/SpotlightLoadingText"')
    expect(component).toContain("spotlight-loading-text-highlight")
    expect(css).toContain("@keyframes spotlight-loading-text")
    expect(css).toContain("animation: spotlight-loading-text 1.1s linear infinite")
  })

  it("matches run-button typography for Simulerer… / Simulating…", () => {
    const app = appSource()
    const slotStart = app.indexOf(
      "flex h-8 w-full shrink-0 items-center justify-center",
    )
    const slot = app.slice(slotStart, slotStart + 1600)
    expect(slot).toContain("font-sans text-xs font-semibold")
    expect(slot).toContain("brandPrimaryTextClass")
    expect(slot).toContain(
      "font-sans text-xs font-semibold uppercase tracking-wide",
    )
  })

  it("uses theme primary token for simulation loading only", () => {
    const app = appSource()
    const css = readFileSync(join(repoRoot, "src/index.css"), "utf8")
    const component = readFileSync(
      join(repoRoot, "src/components/SpotlightLoadingText.tsx"),
      "utf8",
    )
    const brand = readFileSync(join(repoRoot, "src/lib/brand.ts"), "utf8")
    const logo = readFileSync(
      join(repoRoot, "src/components/BrandWordmark.tsx"),
      "utf8",
    )
    const panel = readFileSync(
      join(repoRoot, "src/components/ResultsPanel.tsx"),
      "utf8",
    )
    expect(app).toContain('tone="primary"')
    expect(app).toContain("brandPrimaryTextClass")
    expect(app).not.toMatch(
      /data-simulation-loading[\s\S]{0,200}text-\[#1d868c\]/,
    )
    expect(component).toContain('tone = "muted"')
    expect(panel).not.toContain('tone="primary"')
    expect(brand).toContain('brandPrimaryTextClass = "text-[#1d868c]"')
    expect(logo).toContain("brandPrimaryTextClass")
    expect(logo).not.toContain("text-[#1d868c]")
    expect(css).toContain('.spotlight-loading-text[data-tone="primary"]')
    expect(css).toContain("--spotlight-brand: currentColor")
    expect(css).toContain(
      "color-mix(in oklab, var(--spotlight-brand) 45%, white)",
    )
    expect(css).not.toContain(
      '.spotlight-loading-text[data-tone="primary"] {\n  /* Theme primary token',
    )
    expect(css).not.toMatch(
      /\.spotlight-loading-text\[data-tone="primary"\] \{[^}]*color: var\(--primary\)/,
    )
  })

  it("does not alter Monte Carlo worker / progress timing machinery", () => {
    const app = appSource()
    expect(app).toContain("startProgressAnimation")
    expect(app).toContain("MIN_RUN_UI_MS")
    expect(app).toContain("FAKE_PROGRESS_CAP")
    expect(app).toContain("new SimulationWorker()")
    expect(app).toContain("setIsRunning(false)")
  })
})
