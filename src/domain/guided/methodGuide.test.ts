import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

import { messages } from "@/i18n/messages"
import { METHOD_GUIDE_SECTION_IDS } from "@/domain/guided/methodGuide"
import { repoRoot } from "@/test-utils/repoRoot"


function readSrc(relativePath: string): string {
  return readFileSync(join(repoRoot, relativePath), "utf8")
}

describe("Method Guide chronological content", () => {
  it("uses the intended chronological section order", () => {
    expect([...METHOD_GUIDE_SECTION_IDS]).toEqual([
      "analysisModes",
      "projectProfile",
      "costBasis",
      "assumptions",
      "incurredCosts",
      "costItems",
      "ranges",
      "drivers",
      "impact",
      "correlation",
      "runAnalysis",
      "interpretation",
      "workingApproach",
    ])
  })

  it("places analysis modes after intro and before Project profile", () => {
    const order = [...METHOD_GUIDE_SECTION_IDS]
    expect(order.indexOf("analysisModes")).toBe(0)
    expect(order.indexOf("analysisModes")).toBeLessThan(
      order.indexOf("projectProfile"),
    )
  })

  it("places Project profile before cost modelling; Assumptions before incurred costs", () => {
    const order = [...METHOD_GUIDE_SECTION_IDS]
    expect(order.indexOf("projectProfile")).toBeLessThan(order.indexOf("costBasis"))
    expect(order.indexOf("projectProfile")).toBeLessThan(
      order.indexOf("costItems"),
    )
    expect(order.indexOf("assumptions")).toBeLessThan(
      order.indexOf("incurredCosts"),
    )
    expect(order.indexOf("assumptions")).toBeLessThan(order.indexOf("costItems"))
    expect(order.indexOf("assumptions")).toBeLessThan(order.indexOf("ranges"))
  })

  it("NO and EN provide all chronological headings and bodies", () => {
    for (const id of METHOD_GUIDE_SECTION_IDS) {
      const headingKey = `${id}Heading` as keyof typeof messages.no.methodGuide
      const textKey = `${id}Text` as keyof typeof messages.no.methodGuide
      expect(messages.no.methodGuide[headingKey]).toBeTruthy()
      expect(messages.no.methodGuide[textKey]).toBeTruthy()
      expect(messages.en.methodGuide[headingKey]).toBeTruthy()
      expect(messages.en.methodGuide[textKey]).toBeTruthy()
    }
    expect(messages.no.methodGuide.introLead).toBeTruthy()
    expect(messages.en.methodGuide.introLead).toBeTruthy()
    expect(messages.no.methodGuide.introGuideName).toBe("Fokusmodus")
    expect(messages.en.methodGuide.introGuideName).toBe("Focus mode")
    expect(messages.no.methodGuide.guideTipName).toBe("Fokusmodus")
    expect(messages.en.methodGuide.guideTipName).toBe("Focus mode")
    expect(messages.no.methodGuide.title).toBe("Metodeguide")
    expect(messages.en.methodGuide.title).toBe("Method Guide")
    expect(messages.no.header.navMethodGuide).toBe("Metodeguide")
    expect(messages.en.header.navMethodGuide).toBe("Method Guide")
    expect(messages.no.methodGuide.perspectivesTipText).toMatch(/perspektiv/i)
    expect(messages.en.methodGuide.perspectivesTipText).toMatch(/perspective/i)
  })

  it("reuses the existing Guide Play icon in Method Guide UI", () => {
    const header = readSrc("src/components/GlobalHeaderUtilities.tsx")
    expect(header).toContain('import { Play, X } from "lucide-react"')
    expect(header).toContain("METHOD_GUIDE_SECTION_IDS")
    expect(header).toContain("data-method-guide-intro")
    expect(header).toContain("data-method-guide-guide-icon")
    expect(header).toContain("fill-[#1d868c]")
    // Same icon family as Cost Items / Drivers Guide control.
    const table = readSrc("src/components/ScenarioPercentTable.tsx")
    expect(table).toContain("fill-[#1d868c]")
    expect(table).toContain("<Play")
  })

  it("portals Method Guide / About Model to the overlay container (not sticky header)", () => {
    const header = readSrc("src/components/GlobalHeaderUtilities.tsx")
    expect(header).toContain("useOverlayPortalContainer")
    expect(header).toContain("createPortal")
    expect(header).toContain("portalContainer")
    expect(header).toContain("max-h-[min(90dvh,40rem)]")
    expect(header).toContain("min-h-0 flex-1 overflow-y-auto")
    expect(header).not.toMatch(
      /methodGuideOpen \? \(\s*\n\s*<div\s*\n\s*className="fixed inset-0 z-50/,
    )
  })

  it("Assumptions content distinguishes assumptions from quantitative uncertainty", () => {
    expect(messages.no.methodGuide.assumptionsText).toMatch(/forutsetning/i)
    expect(messages.no.methodGuide.assumptionsText).toMatch(/usikkerhet/i)
    expect(messages.no.methodGuide.assumptionsText).toMatch(/driver/i)
    expect(messages.en.methodGuide.assumptionsText).toMatch(/assumption/i)
    expect(messages.en.methodGuide.assumptionsText).toMatch(/uncertainty/i)
    expect(messages.en.methodGuide.assumptionsText).toMatch(/driver/i)
  })

  it("explains Single analysis vs Ongoing analysis before Project profile", () => {
    expect(messages.no.methodGuide.analysisModesHeading).toBe(
      "Enkeltanalyse eller løpende analyse?",
    )
    expect(messages.no.methodGuide.analysisModesText).toMatch(/Enkeltanalyse/)
    expect(messages.no.methodGuide.analysisModesText).toMatch(
      /sammenligne alternative konsepter eller løsninger/,
    )
    expect(messages.no.methodGuide.analysisModesText).toMatch(/Løpende analyse/)
    expect(messages.no.methodGuide.analysisModesText).toMatch(/sjekkpunkt/)
    expect(messages.en.methodGuide.analysisModesHeading).toBe(
      "Single or ongoing analysis?",
    )
    expect(messages.en.methodGuide.analysisModesText).toMatch(/Single analysis/)
    expect(messages.en.methodGuide.analysisModesText).toMatch(
      /compare alternative concepts or solutions/,
    )
    expect(messages.en.methodGuide.analysisModesText).toMatch(/Ongoing analysis/)
    expect(messages.en.methodGuide.analysisModesText).toMatch(/checkpoint/)
  })

  it("does not treat perspectives as a main chronological step id", () => {
    expect(METHOD_GUIDE_SECTION_IDS).not.toContain(
      "perspectives" as (typeof METHOD_GUIDE_SECTION_IDS)[number],
    )
    const header = readSrc("src/components/GlobalHeaderUtilities.tsx")
    expect(header).toContain('data-method-guide-tip="perspectives"')
  })
})
