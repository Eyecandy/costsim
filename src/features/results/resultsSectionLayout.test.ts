import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import { repoRoot } from "@/test-utils/repoRoot"

function resultsPanelSource() {
  return readFileSync(join(repoRoot, "src/features/results/ResultsPanel.tsx"), "utf8")
}

function resultsLayoutSource() {
  const src = resultsPanelSource()
  const start = src.indexOf("space-y-6 [&>div:not(:first-child)]:pt-3")
  return src.slice(start)
}

function optionsBlock() {
  const layout = resultsLayoutSource()
  return layout.slice(layout.indexOf("results.optionsHeading"))
}

describe("results section layout", () => {
  it("A: main result order is context → Key figures → comparison change → S-curve → Tornado → Contribution → Options", () => {
    const layout = resultsLayoutSource()
    const context = layout.indexOf('slot="context"')
    const keyFigures = layout.indexOf("results.keyMetricsTitle")
    const change = layout.indexOf('slot="change"')
    const sCurve = layout.indexOf("charts.sCurveTitle")
    const tornado = layout.indexOf("charts.tornadoTitle")
    const contribution = layout.indexOf("charts.attributionTitle")
    const options = layout.indexOf("results.optionsHeading")

    expect(context).toBeGreaterThan(-1)
    expect(context).toBeLessThan(keyFigures)
    expect(keyFigures).toBeGreaterThan(-1)
    expect(change).toBeGreaterThan(keyFigures)
    expect(sCurve).toBeGreaterThan(change)
    expect(tornado).toBeGreaterThan(sCurve)
    expect(contribution).toBeGreaterThan(tornado)
    expect(options).toBeGreaterThan(contribution)
  })

  it("B: chart sections start open; Options starts collapsed", () => {
    const src = resultsPanelSource()
    expect(src).toContain("const [keyFiguresOpen, setKeyFiguresOpen] = useState(true)")
    expect(src).toContain("const [sCurveOpen, setSCurveOpen] = useState(true)")
    expect(src).toContain("const [tornadoOpen, setTornadoOpen] = useState(true)")
    expect(src).toContain("const [contributionOpen, setContributionOpen] = useState(true)")
    expect(src).toContain("const [exportOpen, setExportOpen] = useState(false)")

    const layout = resultsLayoutSource()
    expect(layout).toMatch(/title=\{t\("results\.keyMetricsTitle"\)\}[\s\S]*?defaultOpen/)
    expect(layout).toMatch(/title=\{t\("charts\.sCurveTitle"\)\}[\s\S]*?defaultOpen/)
    const tornadoBlock = layout.slice(
      layout.indexOf("charts.tornadoTitle"),
      layout.indexOf("charts.attributionTitle"),
    )
    expect(tornadoBlock).toContain("defaultOpen")
    expect(tornadoBlock).not.toContain("defaultOpen={false}")
    expect(tornadoBlock).toContain("open={tornadoOpen}")

    const contributionBlock = layout.slice(
      layout.indexOf("charts.attributionTitle"),
      layout.indexOf("results.optionsHeading"),
    )
    expect(contributionBlock).toContain("defaultOpen")
    expect(contributionBlock).not.toContain("defaultOpen={false}")
    expect(contributionBlock).toContain("open={contributionOpen}")
    expect(contributionBlock).toContain("onOpenChange={setContributionOpen}")
    expect(contributionBlock).toContain("SpotlightLoadingText")
    expect(contributionBlock).toContain("results.tryAgain")
    expect(contributionBlock).not.toContain("results.calculateContributions")
    expect(contributionBlock).not.toContain("onOpenChange={requestCalculation")
    expect(contributionBlock).toMatch(
      /onClick=\{\(\) => \{[\s\S]*requestCalculation\(project\.id\)/,
    )

    const options = optionsBlock()
    expect(options).toContain("defaultOpen={false}")
    expect(options).toContain("open={exportOpen}")
  })

  it("C: sections can be independently expanded and collapsed", () => {
    const layout = resultsLayoutSource()
    expect(layout).toContain("open={keyFiguresOpen}")
    expect(layout).toContain("onOpenChange={setKeyFiguresOpen}")
    expect(layout).toContain("open={sCurveOpen}")
    expect(layout).toContain("onOpenChange={setSCurveOpen}")
    expect(layout).toContain("open={tornadoOpen}")
    expect(layout).toContain("onOpenChange={setTornadoOpen}")
    expect(layout).toContain("open={contributionOpen}")
    expect(layout).toContain("onOpenChange={setContributionOpen}")
    expect(layout).toContain("open={exportOpen}")
    expect(layout).toContain("onOpenChange={setExportOpen}")
    expect(layout).not.toContain("accordion")
  })

  it("Options can be independently collapsed without affecting other sections", () => {
    const layout = resultsLayoutSource()
    expect(layout).toContain("onOpenChange={setExportOpen}")
    expect(layout).not.toMatch(
      /setExportOpen\([^)]*\)[\s\S]{0,80}set(KeyFigures|SCurve|Tornado|Contribution)Open/,
    )
    const options = optionsBlock()
    expect(options).toContain("onOpenChange={setExportOpen}")
    expect(options).not.toContain("setKeyFiguresOpen")
    expect(options).not.toContain("setSCurveOpen")
    expect(options).not.toContain("setTornadoOpen")
    expect(options).not.toContain("setContributionOpen")
  })

  it("Options expander reuses existing PDF/share/AI actions", () => {
    const options = optionsBlock()
    expect(options).toContain("results.actionsHeading")
    expect(options).toContain("results.aiAnalyzeHeading")
    expect(options).toContain("handleDownloadPdf")
    expect(options).toContain("handleCopyShareLink")
    expect(options).toContain("handleCopyAiBriefPackage")
    expect(options).not.toContain("onRequestReset")
    expect(options).not.toContain("results.startOverButton")
    expect(options).toContain('className="h-8 min-w-0 flex-1 font-sans text-xs font-medium"')
  })

  it("resets expander defaults after a new simulation without invalidating Shapley from expander toggles", () => {
    const src = resultsPanelSource()
    expect(src).toContain("resultsLayoutResetKey")
    expect(src).toContain("setKeyFiguresOpen(true)")
    expect(src).toContain("setSCurveOpen(true)")
    expect(src).toContain("setTornadoOpen(true)")
    expect(src).toContain("setContributionOpen(true)")
    expect(src).toContain("setExportOpen(false)")
    expect(src).toContain("[resultsLayoutResetKey]")
    expect(src).not.toMatch(/resultsLayoutResetKey[\s\S]{0,200}requestCalculation/)
  })

  it("wraps Development, Key figures, S-curve, Tornado, Contribution Analysis and Options", () => {
    const layout = resultsLayoutSource()
    // Shared result expanders only (comparison change expander lives in CheckpointComparisonSection).
    expect(layout.match(/<SectionExpander/g)?.length).toBe(6)
    expect(layout).toContain('data-ongoing-development-section=""')
    expect(layout).toContain('title={t("results.optionsHeading")}')
  })

  it("Archive is neutral at rest with subtle primary hover/press", () => {
    const options = optionsBlock()
    expect(options).not.toContain("data-archive-and-create-next-wrap")
    expect(options).toContain('data-archive-and-create-next=""')
    expect(options).toContain('variant="outline"')
    expect(options).toContain(
      'className="h-8 w-full font-sans text-xs font-medium hover:border-[#1d868c]/40 hover:bg-[#1d868c]/[0.04] hover:text-foreground active:border-[#1d868c]/45 active:bg-[#1d868c]/[0.08] focus-visible:border-[#1d868c]/35 focus-visible:ring-[#1d868c]/15"',
    )
    expect(options).not.toContain(
      "border-transparent bg-[#1d868c] font-sans text-xs font-medium text-white",
    )
  })
})
