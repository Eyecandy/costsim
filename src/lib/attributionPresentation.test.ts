import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"

import { messages } from "@/i18n/messages"
import { isShapleyCacheEntryValid } from "@/lib/lazyShapleyAttribution"
import { runShapleyAttributionForPayload } from "@/lib/shapleyWorkerMessages"
import { buildSimulationProjectPayload } from "@/lib/buildSimulationProjectPayload"
import { createProject } from "@/lib/project"

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = join(__dirname, "../..")

function sampleProject() {
  const base = createProject({ id: "p1", name: "Project A" })
  return {
    ...base,
    costRows: [
      {
        ...base.costRows[0]!,
        name: "Cost A",
        optimistic: "-10",
        likely: "100",
        pessimistic: "30",
      },
    ],
    driverRows: [
      {
        ...base.driverRows[0]!,
        name: "Driver 1",
        optimistic: "-5",
        likely: "0",
        pessimistic: "8",
      },
    ],
  }
}

function resultsPanelSource() {
  return readFileSync(join(repoRoot, "src/components/ResultsPanel.tsx"), "utf8")
}

function sectionExpanderSource() {
  return readFileSync(join(repoRoot, "src/components/SectionExpander.tsx"), "utf8")
}

function resultsLayoutSource() {
  const src = resultsPanelSource()
  const start = src.indexOf('space-y-6 [&>div:not(:first-child)]:pt-3')
  return src.slice(start)
}

function contributionBlockSource() {
  const layout = resultsLayoutSource()
  const start = layout.indexOf('charts.attributionTitle')
  const end = layout.indexOf("appFeatures.allowShareLink", start)
  return layout.slice(start, end)
}

function preCalculationBranchSource() {
  const src = contributionBlockSource()
  const branchStart = src.indexOf("!attributionUi.allReady ? (")
  const readyMarker = src.indexOf("attributionUi.states.map", branchStart)
  const branchEnd = src.lastIndexOf(") : (", readyMarker)
  return src.slice(branchStart, branchEnd)
}

function afterCalculationBranchSource() {
  const src = contributionBlockSource()
  const readyMarker = src.indexOf("attributionUi.states.map")
  const branchStart =
    src.lastIndexOf(") : (", readyMarker) + ") : (".length
  return src.slice(branchStart)
}

describe("attribution waterfall presentation", () => {
  it("G: contribution headings use contribution-specific wording, not standalone key-figure labels", () => {
    expect(messages.no.charts.attributionTitle).toBe("BIDRAGSANALYSE")
    expect(messages.en.charts.attributionTitle).toBe("CONTRIBUTION ANALYSIS")
    expect(messages.no.charts.attributionSubtitle).toBe(
      "Viser hvordan kostnadsposter og drivere bidrar til forventet tillegg og usikkerhetsavsetning. Større bidrag betyr større påvirkning på det aktuelle resultatet.",
    )
    expect(messages.en.charts.attributionSubtitle).toBe(
      "Shows how cost items and drivers contribute to the expected addition and uncertainty reserve. Larger contributions mean greater impact on the relevant result.",
    )
    expect(messages.no.charts.waterfallTitle).toBe("BIDRAG TIL FORVENTET TILLEGG")
    expect(messages.en.charts.waterfallTitle).toBe(
      "CONTRIBUTIONS TO EXPECTED ADDITION",
    )
    expect(messages.no.charts.reserveWaterfallTitle).toBe(
      "BIDRAG TIL USIKKERHETSAVSETNING",
    )
    expect(messages.en.charts.reserveWaterfallTitle).toBe(
      "CONTRIBUTIONS TO UNCERTAINTY RESERVE",
    )
    expect(messages.no.charts.waterfallTitle).not.toBe("FORVENTET TILLEGG")
    expect(messages.no.charts.reserveWaterfallTitle).not.toBe("USIKKERHETSAVSETNING")
    expect(messages.en.charts.waterfallTitle).not.toBe("EXPECTED ADDITION")
    expect(messages.en.charts.reserveWaterfallTitle).not.toBe("UNCERTAINTY RESERVE")
  })

  it("E: before ready keeps heading, description, and auto loading (no calculate button)", () => {
    const block = contributionBlockSource()
    const preCalc = preCalculationBranchSource()

    expect(block).toContain("charts.attributionTitle")
    expect(block).toContain("charts.attributionSubtitle")
    expect(preCalc).not.toContain("results.calculateContributions")
    expect(preCalc).toContain("results.calculatingContributions")
    expect(preCalc).toContain("SpotlightLoadingText")
    expect(preCalc).toContain('data-contribution-loading=""')
    expect(preCalc).not.toContain("ResultsWaterfall")
    expect(preCalc).not.toContain("ResultsReserveWaterfall")
    expect(block.indexOf("charts.attributionSubtitle")).toBeLessThan(
      block.indexOf("!attributionUi.allReady"),
    )
  })

  it("during calculation keeps heading, description, and one shared loading state", () => {
    const block = contributionBlockSource()
    const preCalc = preCalculationBranchSource()
    expect(block).toContain("charts.attributionTitle")
    expect(block).toContain("charts.attributionSubtitle")
    expect(preCalc.match(/results\.calculatingContributions/g)?.length).toBe(1)
    expect(preCalc).toContain("SpotlightLoadingText")
    expect(preCalc).toContain('data-contribution-loading=""')
    expect(preCalc).not.toContain("ResultsWaterfall")
    expect(preCalc).not.toContain("ResultsReserveWaterfall")
  })

  it("contribution loading uses shared SpotlightLoadingText and seamless CSS", () => {
    const preCalc = preCalculationBranchSource()
    const ready = afterCalculationBranchSource()
    const css = readFileSync(join(repoRoot, "src/index.css"), "utf8")
    const component = readFileSync(
      join(repoRoot, "src/components/SpotlightLoadingText.tsx"),
      "utf8",
    )
    expect(preCalc).toContain("SpotlightLoadingText")
    expect(preCalc).not.toContain("contribution-loading-pulse")
    expect(ready).not.toContain("SpotlightLoadingText")
    expect(component).toContain("spotlight-loading-text")
    expect(component).toContain("spotlight-loading-text-base")
    expect(component).toContain("spotlight-loading-text-highlight")
    expect(css).toContain("@keyframes spotlight-loading-text")
    expect(css).toContain("background-position: 105% center")
    expect(css).toContain("background-position: -5% center")
    expect(css).toContain("background-clip: text")
    expect(css).toContain("animation: spotlight-loading-text 1.1s linear infinite")
    expect(css).not.toContain("animation-delay: 0.5")
    expect(css).not.toContain("@keyframes contribution-loading-pulse")
    const baseBlock = css.slice(
      css.indexOf(".spotlight-loading-text {"),
      css.indexOf(".spotlight-loading-text-base"),
    )
    expect(baseBlock).toContain(
      "color: color-mix(in oklab, var(--muted-foreground) 85%, transparent)",
    )
    expect(baseBlock).not.toContain("color: transparent")
    expect(baseBlock).not.toContain("animation:")
    const highlightBlock = css.slice(
      css.indexOf(".spotlight-loading-text-highlight {"),
      css.indexOf("@media (prefers-reduced-motion: reduce)"),
    )
    expect(highlightBlock).toContain("color: transparent")
    expect(highlightBlock).toContain(
      "animation: spotlight-loading-text 1.1s linear infinite",
    )
    expect(css).toContain("prefers-reduced-motion: reduce")
    const reduced = css.slice(css.indexOf("prefers-reduced-motion: reduce"))
    expect(reduced).toContain(".spotlight-loading-text-highlight")
    expect(reduced).toContain("display: none")
    expect(reduced).toContain("animation: none")
  })

  it("F: after calculation heading and description remain visible with project waterfalls", () => {
    const block = contributionBlockSource()
    const ready = afterCalculationBranchSource()

    expect(block.indexOf("charts.attributionTitle")).toBeLessThan(
      block.indexOf("!attributionUi.allReady"),
    )
    expect(block.indexOf("charts.attributionSubtitle")).toBeLessThan(
      block.indexOf("!attributionUi.allReady"),
    )
    expect(ready).not.toContain("results.calculateContributions")
    expect(ready).not.toContain("results.calculatingContributions")
    expect(ready).toContain("{state.projectName}")
    expect(ready).toContain("ResultsWaterfall")
    expect(ready).toContain("ResultsReserveWaterfall")
    expect(ready).toContain("charts.waterfallTitle")
    expect(ready).toContain("charts.reserveWaterfallTitle")
  })

  it("removes redundant waterfall legend and axis-break copy from chart chrome", () => {
    const waterfall = readFileSync(
      join(repoRoot, "src/components/AttributionWaterfall.tsx"),
      "utf8",
    )
    const expected = readFileSync(
      join(repoRoot, "src/components/ResultsWaterfall.tsx"),
      "utf8",
    )
    const reserve = readFileSync(
      join(repoRoot, "src/components/ResultsReserveWaterfall.tsx"),
      "utf8",
    )
    expect(waterfall).not.toContain("referenceLegendStart")
    expect(waterfall).not.toContain("axisBreakMessage")
    expect(waterfall).not.toContain("layout.axisBreak")
    expect(expected).not.toContain("Verdiaksen starter ikke på null")
    expect(reserve).not.toContain("Verdiaksen starter ikke på null")
    expect(expected).not.toContain("Value axis does not start at zero")
    expect(reserve).not.toContain("Value axis does not start at zero")
    // In-chart start / span / end labels remain
    expect(waterfall).toContain("{startLabel}")
    expect(waterfall).toContain("{spanLabel}")
    expect(waterfall).toContain("{endLabel}")
  })

  it("J: each project contains both contribution waterfalls in project-centric grouping", () => {
    const src = resultsPanelSource()
    expect(src).toContain("projectName: project.name")

    const ready = afterCalculationBranchSource()
    const projectMapStart = ready.indexOf("attributionUi.states.map")
    const projectBlock = ready.slice(projectMapStart)
    const projectNameIndex = projectBlock.indexOf("state.projectName")
    const waterfallIndex = projectBlock.indexOf("ResultsWaterfall")
    const reserveIndex = projectBlock.indexOf("ResultsReserveWaterfall")
    expect(projectNameIndex).toBeGreaterThan(-1)
    expect(waterfallIndex).toBeGreaterThan(projectNameIndex)
    expect(reserveIndex).toBeGreaterThan(waterfallIndex)
    expect(ready).toContain("key={state.projectId}")
    expect(ready).toContain("space-y-8")
    expect(ready).not.toMatch(
      /charts\.waterfallTitle[\s\S]*attributionUi\.states\.map[\s\S]*charts\.reserveWaterfallTitle[\s\S]*attributionUi\.states\.map/,
    )
  })

  it("D: opening Contribution Analysis does not start Shapley; retry uses requestCalculation", () => {
    const block = contributionBlockSource()
    expect(block).toContain("onOpenChange={setContributionOpen}")
    expect(block).not.toContain("onOpenChange={requestCalculation")
    expect(block).toContain("results.tryAgain")
    expect(block).toMatch(
      /onClick=\{\(\) => \{[\s\S]*requestCalculation\(project\.id\)/,
    )
    const openHandler = block.slice(
      block.indexOf("onOpenChange={setContributionOpen}"),
      block.indexOf("onOpenChange={setContributionOpen}") +
        "onOpenChange={setContributionOpen}".length,
    )
    expect(openHandler).not.toContain("requestCalculation")
  })

  it("H: collapsing/reopening keeps children mounted and does not touch the Shapley cache", () => {
    const expander = sectionExpanderSource()
    expect(expander).toContain("hidden={!isOpen}")
    expect(expander).not.toMatch(/\{isOpen\s*&&\s*children\}/)
    expect(expander).not.toMatch(/\{isOpen \? children/)

    const panel = resultsPanelSource()
    expect(panel).toContain("onOpenChange={setContributionOpen}")
    expect(panel).not.toMatch(/setContributionOpen[\s\S]{0,80}requestCalculation/)
  })

  it("I: new simulation run invalidates the shared cached pair together", () => {
    const payload = buildSimulationProjectPayload(sampleProject())!
    const result = runShapleyAttributionForPayload(payload, 130_000, 150_000)
    const entry = {
      inputSignature: "sig",
      simulationRunId: "run-1",
      result,
    }

    expect(isShapleyCacheEntryValid(entry, "sig", "run-1")).toBe(true)
    expect(isShapleyCacheEntryValid(entry, "sig", "run-2")).toBe(false)
  })

  it("one attribution result supplies both decompositions after completion", () => {
    const payload = buildSimulationProjectPayload(sampleProject())!
    const result = runShapleyAttributionForPayload(payload, 130_000, 150_000)

    expect(result.expectedAdditionDecomposition.endValue).toBe(result.estimatedP50)
    expect(result.uncertaintyReserveDecomposition.endValue).toBe(result.estimatedP85)
    expect(result.uncertaintyReserveDecomposition.contributions.length).toBeGreaterThan(
      0,
    )
  })

  it("does not add nested expanders inside Contribution Analysis", () => {
    const block = contributionBlockSource()
    const body = block.slice(block.indexOf("charts.attributionSubtitle"))
    expect(body).not.toContain("<SectionExpander")
  })
})
