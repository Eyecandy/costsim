import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

import { messages } from "@/i18n/messages"
import { createProject } from "@/domain/analysis/project"
import { DEFAULT_SHAPLEY_ATTRIBUTION_CONFIG } from "@/domain/simulation/shapleyAttribution"
import { buildSimulationInputSignature } from "@/domain/simulation/simulationInputSignature"
import {
  fillUncertaintyModelCopy,
  formatMarginalDistributionLabel,
  formatMarginalDistributionPlural,
  uncertaintyModelConfig,
} from "@/domain/simulation/uncertaintyModelConfig"
import { repoRoot } from "@/test-utils/repoRoot"

function readSrc(relativePath: string): string {
  return readFileSync(join(repoRoot, relativePath), "utf8")
}

describe("uncertaintyModelConfig product architecture", () => {
  it("A: config names triangular + p10_mode_p90", () => {
    expect(uncertaintyModelConfig.marginalDistribution).toBe("triangular")
    expect(uncertaintyModelConfig.inputInterpretation).toBe("p10_mode_p90")
  })

  it("B: About Model NO/EN family derives from config presentation mapping", () => {
    expect(messages.no.aboutModel.paragraph1).toContain("{distributions}")
    expect(messages.en.aboutModel.paragraph1).toContain("{distributions}")
    expect(messages.no.aboutModel.paragraph1).not.toMatch(/triangulær/i)
    expect(messages.en.aboutModel.paragraph1).not.toMatch(/triangular distribution/i)

    const header = readSrc("src/shared/GlobalHeaderUtilities.tsx")
    expect(header).toContain("fillUncertaintyModelCopy")
    expect(header).toContain("aboutModel.paragraph1")

    const no = fillUncertaintyModelCopy(messages.no.aboutModel.paragraph1, {
      language: "no",
      count: "20 000",
    })
    const en = fillUncertaintyModelCopy(messages.en.aboutModel.paragraph1, {
      language: "en",
      count: "20,000",
    })
    expect(no).toContain(formatMarginalDistributionPlural("no"))
    expect(en).toContain(formatMarginalDistributionPlural("en"))
    expect(formatMarginalDistributionLabel("no")).toBe("trekantfordeling")
    expect(formatMarginalDistributionLabel("en")).toBe("triangular distribution")
    expect(no).not.toContain("{distributions}")
    expect(en).not.toContain("{distributions}")
  })

  it("C: Single and Ongoing PDF method copy resolve configured triangular family", () => {
    expect(messages.no.results.pdfMethodParagraph1).toContain("{distributions}")
    expect(messages.en.results.pdfMethodParagraph1).toContain("{distributions}")
    expect(messages.no.results.pdfMethodParagraph1).not.toContain("trekantfordelinger")
    expect(messages.en.results.pdfMethodParagraph1).not.toContain("triangular distributions")

    const panel = readSrc("src/features/results/ResultsPanel.tsx")
    expect(panel).toContain("fillUncertaintyModelCopy")
    expect(panel).toContain("results.pdfMethodParagraph1")
    // Ongoing + Single both build methodParagraphs via the same ResultsPanel path.
    const methodFills = panel.match(
      /fillUncertaintyModelCopy\(t\("results\.pdfMethodParagraph1"\)/g,
    )
    expect(methodFills?.length ?? 0).toBeGreaterThanOrEqual(2)

    const no = fillUncertaintyModelCopy(messages.no.results.pdfMethodParagraph1, {
      language: "no",
      count: "20 000",
    })
    const en = fillUncertaintyModelCopy(messages.en.results.pdfMethodParagraph1, {
      language: "en",
      count: "20,000",
    })
    expect(no).toContain("trekantfordelinger")
    expect(en).toContain("triangular distributions")
  })

  it("D: AI brief distributionType derives from config", () => {
    const aiBrief = readSrc("src/domain/results/aiBrief.ts")
    expect(aiBrief).toContain("uncertaintyModelConfig.marginalDistribution")
    expect(aiBrief).not.toMatch(/distributionType:\s*"triangular"/)
    expect(uncertaintyModelConfig.marginalDistribution).toBe("triangular")
  })

  it("E/F: main MC and Shapley still use explicit triangular implementation", () => {
    const sim = readSrc("src/domain/simulation/simulation.ts")
    const shapley = readSrc("src/domain/simulation/shapleyAttribution.ts")
    expect(sim).toContain("triangularQuantile")
    expect(sim).toContain("triangularParamsFromPercentiles")
    expect(shapley).toContain("triangularQuantile(tri.min, tri.mode, tri.max")
    expect(shapley).not.toContain("uncertaintyModelConfig")
    expect(DEFAULT_SHAPLEY_ATTRIBUTION_CONFIG.runsPerSubset).toBe(3000)
    expect(uncertaintyModelConfig.marginalDistribution).toBe("triangular")
  })

  it("G: input signature unchanged — no distribution / interpretation fields", () => {
    const project = createProject({ id: "p1" })
    project.costRows[0]!.name = "A"
    project.costRows[0]!.likely = "100"
    project.costRows[0]!.optimistic = "-10"
    project.costRows[0]!.pessimistic = "20"
    const sig = buildSimulationInputSignature([project])
    expect(sig).not.toContain("triangular")
    expect(sig).not.toContain("marginalDistribution")
    expect(sig).not.toContain("inputInterpretation")
    expect(sig).not.toContain("p10_mode_p90")
    const signatureSrc = readSrc("src/domain/simulation/simulationInputSignature.ts")
    expect(signatureSrc).not.toContain("uncertaintyModelConfig")
    expect(signatureSrc).not.toContain("marginalDistribution")
  })
})
