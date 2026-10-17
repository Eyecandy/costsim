import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { join } from "node:path"

import { messages } from "@/i18n/messages"
import {
  formatKeyFigurePercent,
  formatProbabilityBelowLabelAmount,
  formatProbabilityBelowRowLabel,
  formatProbabilityThreshold,
} from "@/domain/results/keyFiguresDisplay"
import { buildKeyFigureMetricTableRows } from "@/domain/results/keyFiguresMetricRows"
import {
  DEFAULT_RESULT_PREFERENCES,
  cloneResultPreferences,
  resolveResultView,
} from "@/domain/results/resultPreferences"
import { probabilityAtOrBelowPercent } from "@/domain/simulation/stats"
import { repoRoot as root } from "@/test-utils/repoRoot"


function tableSource() {
  return readFileSync(
    join(root, "src/components/ResultsKeyFiguresTable.tsx"),
    "utf8",
  )
}

describe("Key Figures percentage presentation", () => {
  it("uses one decimal with locale and space before %", () => {
    expect(formatKeyFigurePercent(12, "no")).toBe("12,0 %")
    expect(formatKeyFigurePercent(8.5, "no")).toBe("8,5 %")
    expect(formatKeyFigurePercent(13.3, "no")).toBe("13,3 %")
    expect(formatKeyFigurePercent(72.5, "no")).toBe("72,5 %")

    expect(formatKeyFigurePercent(12, "en")).toBe("12.0 %")
    expect(formatKeyFigurePercent(8.5, "en")).toBe("8.5 %")
    expect(formatKeyFigurePercent(13.3, "en")).toBe("13.3 %")
    expect(formatKeyFigurePercent(72.5, "en")).toBe("72.5 %")

    expect(formatKeyFigurePercent(null, "no")).toBe("—")
    expect(formatKeyFigurePercent(Number.NaN, "en")).toBe("—")
  })

  it("UI Key Figures routes all table percentages through formatKeyFigurePercent", () => {
    const src = tableSource()
    expect(src).toContain("formatKeyFigurePercent")
    expect(src).not.toContain("formatKeyFigurePct(")
    expect(src).not.toContain("formatKeyFigurePctDecimal")
    expect(src).not.toContain("Math.round(pct)")
    expect(src).toMatch(
      /id: "expectedAddition"[\s\S]*?formatKeyFigurePercent\(delta\.percent, language\)/,
    )
    expect(src).toMatch(
      /id: "uncertaintyReserve"[\s\S]*?formatKeyFigurePercent\(premium\.percent, language\)/,
    )
    expect(src).toMatch(
      /id: "stdDev"[\s\S]*?formatKeyFigurePercent\(relativePct, language\)/,
    )
    expect(src).toMatch(
      /id: "probAtBase"[\s\S]*?formatKeyFigurePercent\(pct, language\)/,
    )
    expect(src).toMatch(
      /id: "probBelowCostLevel"[\s\S]*?formatKeyFigurePercent\(pct, language\)/,
    )
  })
})

describe("Probability below cost level row presentation", () => {
  it("formats threshold amounts adaptively (full below 1M, millions at/above)", () => {
    // Below 1M — full amount (never "0 mill." / "k")
    expect(formatProbabilityThreshold(0, "no")).toBe("0")
    expect(formatProbabilityThreshold(0, "en")).toBe("0")
    expect(formatProbabilityThreshold(100, "no")).toBe("100")
    expect(formatProbabilityThreshold(100, "en")).toBe("100")
    expect(formatProbabilityThreshold(12_500, "no")).toBe("12 500")
    expect(formatProbabilityThreshold(12_500, "en")).toBe("12,500")
    expect(formatProbabilityThreshold(850_000, "no")).toBe("850 000")
    expect(formatProbabilityThreshold(850_000, "en")).toBe("850,000")
    expect(formatProbabilityThreshold(999_999, "no")).toBe("999 999")

    // At/above 1M — compact millions
    expect(formatProbabilityThreshold(1_000_000, "no")).toBe("1 mill.")
    expect(formatProbabilityThreshold(1_000_000, "en")).toBe("1 M")
    expect(formatProbabilityThreshold(1_200_000, "no")).toBe("1,2 mill.")
    expect(formatProbabilityThreshold(1_200_000, "en")).toBe("1.2 M")
    expect(formatProbabilityThreshold(8_181_000, "no")).toBe("8,2 mill.")
    expect(formatProbabilityThreshold(8_181_000, "en")).toBe("8.2 M")
    expect(formatProbabilityThreshold(200_000_000, "no")).toBe("200 mill.")
    expect(formatProbabilityThreshold(200_000_000, "en")).toBe("200 M")
    expect(formatProbabilityThreshold(1_010_000_000, "no")).toBe("1 010 mill.")
    expect(formatProbabilityThreshold(8_181_000_000, "no")).toBe(
      "8 181 mill.",
    )
    expect(formatProbabilityThreshold(8_181_000_000, "en")).toBe("8,181 M")

    // Alias used by Key Figures / PDF
    expect(formatProbabilityBelowLabelAmount(100, "no")).toBe("100")
  })

  it("puts adaptive amount in the shared row label (NO mill. / EN M)", () => {
    expect(
      formatProbabilityBelowRowLabel(
        100,
        messages.no.keyMetrics.probabilityBelowWithAmount,
        "no",
      ),
    ).toBe("Sannsynlighet under 100")
    expect(
      formatProbabilityBelowRowLabel(
        12_500,
        messages.en.keyMetrics.probabilityBelowWithAmount,
        "en",
      ),
    ).toBe("Probability below 12,500")
    expect(
      formatProbabilityBelowRowLabel(
        200_000_000,
        messages.no.keyMetrics.probabilityBelowWithAmount,
        "no",
      ),
    ).toBe("Sannsynlighet under 200 mill.")
    expect(
      formatProbabilityBelowRowLabel(
        1_010_000_000,
        messages.no.keyMetrics.probabilityBelowWithAmount,
        "no",
      ),
    ).toBe("Sannsynlighet under 1 010 mill.")
    expect(
      formatProbabilityBelowRowLabel(
        200_000_000,
        messages.en.keyMetrics.probabilityBelowWithAmount,
        "en",
      ),
    ).toBe("Probability below 200 M")
    expect(
      formatProbabilityBelowRowLabel(
        8_181_000_000,
        messages.no.keyMetrics.probabilityBelowWithAmount,
        "no",
      ),
    ).toBe("Sannsynlighet under 8 181 mill.")
    expect(
      formatProbabilityBelowRowLabel(
        8_181_000_000,
        messages.en.keyMetrics.probabilityBelowWithAmount,
        "en",
      ),
    ).toBe("Probability below 8,181 M")
  })

  it("does not change other Key Figures monetary formatting helpers", () => {
    const src = readFileSync(
      join(root, "src/domain/results/keyFiguresDisplay.ts"),
      "utf8",
    )
    expect(src).toContain("formatProbabilityBelowLabelAmount")
    const statFn = src.slice(
      src.indexOf("export function formatKeyFigureStat"),
      src.indexOf("export function formatKeyFigurePercent"),
    )
    expect(statFn).toContain("formatNumber(v, 0, language)")
    expect(statFn).not.toContain("mill.")
  })

  it("prefs keep the longer static label; Key Figures row uses WithAmount", () => {
    expect(messages.no.keyMetrics.probabilityBelowCostLevel).toBe(
      "Sannsynlighet under kostnadsnivå",
    )
    expect(messages.en.keyMetrics.probabilityBelowCostLevel).toBe(
      "Probability below cost level",
    )
    expect(messages.no.resultPreferences.showProbabilityBelowCostLevel).toBe(
      "Sannsynlighet under kostnadsnivå",
    )
    expect(tableSource()).toContain("probabilityBelowWithAmount")
    expect(tableSource()).toContain("formatProbabilityBelowRowLabel")
  })

  it("PDF/metric rows: shared label with amount; value cells are probability only", () => {
    const prefs = cloneResultPreferences(DEFAULT_RESULT_PREFERENCES)
    prefs.keyFigures.probabilityBelowCostLevel = {
      enabled: true,
      amount: 200_000_000,
    }
    const view = resolveResultView(prefs)
    const projectA = { id: "a", incurredCosts: 0 }
    const projectB = { id: "b", incurredCosts: 0 }
    const valuesA = [80_000_000, 150_000_000, 200_000_000, 250_000_000, 300_000_000]
    const valuesB = [50_000_000, 100_000_000, 150_000_000, 180_000_000, 190_000_000]
    const rows = buildKeyFigureMetricTableRows({
      resultView: view,
      projects: [projectA, projectB],
      valuesByProjectId: new Map([
        ["a", valuesA],
        ["b", valuesB],
      ]),
      baseCostByProjectId: new Map([
        ["a", null],
        ["b", null],
      ]),
      simulatedIncurredByProjectId: new Map([
        ["a", 0],
        ["b", 0],
      ]),
      language: "no",
      labels: {
        baseCost: "Base",
        expectedAddition: "EA",
        expectedValue: "EV",
        uncertaintyPremium: "Reserve",
        stdDev: "SD",
        probabilityAtBaseCost: "P(base)",
        probabilityBelowCostLevel:
          messages.no.keyMetrics.probabilityBelowWithAmount,
        locked: "Locked",
      },
    })

    const row = rows.find((r) => r.id === "probBelowCostLevel")
    expect(row).toBeDefined()
    expect(row!.label).toBe("Sannsynlighet under 200 mill.")
    expect(row!.values).toHaveLength(2)
    expect(row!.values[0]).toBe(
      formatKeyFigurePercent(
        probabilityAtOrBelowPercent(valuesA, 200_000_000),
        "no",
      ),
    )
    expect(row!.values[1]).toBe(
      formatKeyFigurePercent(
        probabilityAtOrBelowPercent(valuesB, 200_000_000),
        "no",
      ),
    )
    expect(row!.values[0]).not.toEqual(row!.values[1])
    for (const cell of row!.values) {
      expect(cell).toMatch(/%$/)
      expect(cell).not.toContain("200")
      expect(cell).not.toContain("mill.")
      expect(cell).not.toContain(" M")
    }

    // Other monetary Key Figures stay absolute (no mill. unit).
    const addition = rows.find((r) => r.id === "expectedAddition")
    if (addition) {
      for (const cell of addition.values) {
        expect(cell).not.toContain("mill.")
      }
    }

    // Small threshold uses full amount in the same shared row builder (active + archived).
    prefs.keyFigures.probabilityBelowCostLevel = {
      enabled: true,
      amount: 100,
    }
    const smallRows = buildKeyFigureMetricTableRows({
      resultView: resolveResultView(prefs),
      projects: [projectA],
      valuesByProjectId: new Map([["a", valuesA]]),
      baseCostByProjectId: new Map([["a", null]]),
      simulatedIncurredByProjectId: new Map([["a", 0]]),
      language: "no",
      labels: {
        baseCost: "Base",
        expectedAddition: "EA",
        expectedValue: "EV",
        uncertaintyPremium: "Reserve",
        stdDev: "SD",
        probabilityAtBaseCost: "P(base)",
        probabilityBelowCostLevel:
          messages.no.keyMetrics.probabilityBelowWithAmount,
        locked: "Locked",
      },
    })
    expect(
      smallRows.find((r) => r.id === "probBelowCostLevel")?.label,
    ).toBe("Sannsynlighet under 100")
  })
})
