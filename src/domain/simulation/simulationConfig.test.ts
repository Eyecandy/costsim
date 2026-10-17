import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

import { messages } from "@/i18n/messages"
import { formatNumber } from "@/domain/results/formatNumber"
import { createProject } from "@/domain/analysis/project"
import { DEFAULT_SHAPLEY_ATTRIBUTION_CONFIG } from "@/domain/simulation/shapleyAttribution"
import { buildSimulationInputSignature } from "@/domain/simulation/simulationInputSignature"
import {
  firstPersistedSimulationCount,
  resolveReportedSimulationCount,
  simulationConfig,
} from "@/domain/simulation/simulationConfig"
import { repoRoot } from "@/test-utils/repoRoot"


function readSrc(relativePath: string): string {
  return readFileSync(join(repoRoot, relativePath), "utf8")
}

describe("simulationConfig product architecture", () => {
  it("A: product mainRuns default is 20,000", () => {
    expect(simulationConfig.mainRuns).toBe(20_000)
  })

  it("B: App wires main simulation request from simulationConfig.mainRuns", () => {
    const app = readSrc("src/App.tsx")
    expect(app).toContain("import { simulationConfig } from \"@/domain/simulation/simulationConfig\"")
    expect(app).toContain("const runs = simulationConfig.mainRuns")
    expect(app).toContain("w.postMessage({ runs, projects: payloads })")
    expect(app).not.toContain("useState(20_000)")
    expect(app).not.toMatch(/const\s+\[\s*runs\s*\]\s*=\s*useState/)
    const worker = readSrc("src/workers/simulation.worker.ts")
    expect(worker).not.toContain("simulationConfig")
    expect(worker).not.toContain("20_000")
    expect(worker).toContain("const { runs, projects } = e.data")
  })

  it("C: Shapley runsPerSubset stays independent of mainRuns", () => {
    expect(DEFAULT_SHAPLEY_ATTRIBUTION_CONFIG.runsPerSubset).toBe(3000)
    expect(DEFAULT_SHAPLEY_ATTRIBUTION_CONFIG.runsPerSubset).not.toBe(
      simulationConfig.mainRuns,
    )
    const shapleySrc = readSrc("src/domain/simulation/shapleyAttribution.ts")
    expect(shapleySrc).not.toContain("simulationConfig")
  })

  it("D: run count is not part of project input signature / stale semantics", () => {
    const project = createProject({ id: "p1" })
    project.costRows[0]!.name = "A"
    project.costRows[0]!.likely = "100"
    project.costRows[0]!.optimistic = "-10"
    project.costRows[0]!.pessimistic = "20"
    const sig = buildSimulationInputSignature([project])
    expect(sig).not.toContain("20000")
    expect(sig).not.toContain("20_000")
    expect(sig).not.toContain("mainRuns")
    expect(sig).not.toContain("simulationCount")
    const signatureSrc = readSrc("src/domain/simulation/simulationInputSignature.ts")
    expect(signatureSrc).not.toContain("simulationConfig")
    expect(signatureSrc).not.toContain("simulationCount")
    expect(signatureSrc).not.toContain("mainRuns")
    expect(buildSimulationInputSignature([project])).toBe(sig)
  })

  it("E: persisted simulationCount: 20_000 is reported even vs a different live/product count", () => {
    const reported = resolveReportedSimulationCount(
      firstPersistedSimulationCount(
        { simulationCount: 20_000 },
        { simulationCount: 10_000 },
      ),
    )
    expect(reported).toBe(20_000)
  })

  it("F: missing historical simulationCount falls back to simulationConfig.mainRuns", () => {
    expect(resolveReportedSimulationCount(undefined)).toBe(
      simulationConfig.mainRuns,
    )
    expect(resolveReportedSimulationCount(null)).toBe(simulationConfig.mainRuns)
    expect(resolveReportedSimulationCount(0)).toBe(simulationConfig.mainRuns)
    expect(resolveReportedSimulationCount(Number.NaN)).toBe(
      simulationConfig.mainRuns,
    )
    expect(firstPersistedSimulationCount(null, {}, { simulationCount: -1 })).toBe(
      undefined,
    )
    expect(
      resolveReportedSimulationCount(
        firstPersistedSimulationCount(undefined, { simulationCount: undefined }),
      ),
    ).toBe(simulationConfig.mainRuns)
  })

  it("G: About Model NO/EN count derives from configuration, not hardcoded copy", () => {
    expect(messages.no.aboutModel.paragraph1).toContain("{count}")
    expect(messages.en.aboutModel.paragraph1).toContain("{count}")
    expect(messages.no.aboutModel.paragraph1).not.toContain("20 000")
    expect(messages.en.aboutModel.paragraph1).not.toContain("20,000")
    const header = readSrc("src/components/GlobalHeaderUtilities.tsx")
    expect(header).toContain("simulationConfig.mainRuns")
    expect(header).toContain("fillUncertaintyModelCopy")
    expect(header).toMatch(
      /formatNumber\(\s*simulationConfig\.mainRuns,\s*0,\s*language,/m,
    )
    expect(
      messages.no.aboutModel.paragraph1.replace(
        "{count}",
        formatNumber(simulationConfig.mainRuns, 0, "no"),
      ),
    ).toContain(formatNumber(simulationConfig.mainRuns, 0, "no"))
    expect(
      messages.en.aboutModel.paragraph1.replace(
        "{count}",
        formatNumber(simulationConfig.mainRuns, 0, "en"),
      ),
    ).toContain(formatNumber(simulationConfig.mainRuns, 0, "en"))
  })
})
