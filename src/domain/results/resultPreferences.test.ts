import { afterEach, describe, expect, it, vi } from "vitest"

import {
  DEFAULT_RESULT_PREFERENCES,
  addKeyFigurePercentile,
  formatResultPreferenceAmount,
  normalizeResultPreferences,
  parseResultPreferenceAmount,
  removeKeyFigurePercentile,
  resolveSCurvePercentiles,
  sanitizePercentileList,
  sanitizeProbabilityBelowAmount,
  shouldShowProbabilityBelowCostLevel,
} from "@/domain/results/resultPreferences"
import {
  RESULT_PREFERENCES_STORAGE_KEY,
  loadResultPreferences,
  resetResultPreferences,
  saveResultPreferences,
} from "@/persistence/resultPreferencesStorage"
import {
  mean,
  percentile,
  probabilityAtOrBelowPercent,
  relativeStandardDeviationPercent,
  standardDeviation,
} from "@/domain/simulation/stats"
import {
  formatKeyFigurePercent,
  formatKeyFigurePct,
  formatKeyFigurePctDecimal,
} from "@/domain/results/keyFiguresDisplay"
import { repoRoot as root } from "@/test-utils/repoRoot"

describe("Result Preferences model", () => {
  it("defaults preserve current Key Figures / S-curve experience", () => {
    expect(DEFAULT_RESULT_PREFERENCES.keyFigures.showBaseCost).toBe(true)
    expect(DEFAULT_RESULT_PREFERENCES.keyFigures.showExpectedAddition).toBe(true)
    expect(DEFAULT_RESULT_PREFERENCES.keyFigures.showUncertaintyReserve).toBe(
      true,
    )
    expect(DEFAULT_RESULT_PREFERENCES.keyFigures.percentiles).toEqual([50, 85])
    expect(DEFAULT_RESULT_PREFERENCES.keyFigures.showExpectedValue).toBe(false)
    expect(DEFAULT_RESULT_PREFERENCES.keyFigures.showStdDev).toBe(false)
    expect(
      DEFAULT_RESULT_PREFERENCES.keyFigures.showProbabilityAtBaseCost,
    ).toBe(false)
    expect(
      DEFAULT_RESULT_PREFERENCES.keyFigures.probabilityBelowCostLevel,
    ).toEqual({ enabled: false, amount: null })
    expect(DEFAULT_RESULT_PREFERENCES.sCurve.useKeyFigurePercentiles).toBe(true)
    expect("displayMode" in DEFAULT_RESULT_PREFERENCES.sCurve).toBe(false)
    expect(resolveSCurvePercentiles(DEFAULT_RESULT_PREFERENCES)).toEqual([
      50, 85,
    ])
  })

  it("sanitizes percentiles: integers 1–99, unique, sorted", () => {
    expect(sanitizePercentileList([85, 15, 50, 15, 0, 100, 50.4])).toEqual([
      15, 50, 85,
    ])
    expect(sanitizePercentileList(["70", "x", null])).toEqual([70])
    expect(sanitizePercentileList(null)).toEqual([])
  })

  it("normalize falls back safely for malformed input", () => {
    expect(normalizeResultPreferences(null)).toEqual(DEFAULT_RESULT_PREFERENCES)
    expect(normalizeResultPreferences("{bad")).toEqual(
      DEFAULT_RESULT_PREFERENCES,
    )
    const partial = normalizeResultPreferences({
      version: 99,
      keyFigures: { showBaseCost: false, percentiles: [70] },
    })
    expect(partial.keyFigures.showBaseCost).toBe(false)
    expect(partial.keyFigures.percentiles).toEqual([70])
    expect(partial.keyFigures.showExpectedAddition).toBe(true)
    expect(partial.keyFigures.probabilityBelowCostLevel).toEqual({
      enabled: false,
      amount: null,
    })
    expect(partial.version).toBe(1)
  })

  it("probabilityBelowCostLevel enable + amount persist through normalize", () => {
    const normalized = normalizeResultPreferences({
      version: 1,
      keyFigures: {
        probabilityBelowCostLevel: { enabled: true, amount: 8_181_000_000 },
      },
    })
    expect(normalized.keyFigures.probabilityBelowCostLevel).toEqual({
      enabled: true,
      amount: 8_181_000_000,
    })
    expect(shouldShowProbabilityBelowCostLevel(normalized.keyFigures.probabilityBelowCostLevel)).toBe(
      true,
    )
  })

  it("malformed probabilityBelowCostLevel amounts fall back safely", () => {
    expect(sanitizeProbabilityBelowAmount(-1)).toBeNull()
    expect(sanitizeProbabilityBelowAmount(Number.NaN)).toBeNull()
    expect(sanitizeProbabilityBelowAmount("x")).toBeNull()
    expect(sanitizeProbabilityBelowAmount(0)).toBe(0)
    expect(
      normalizeResultPreferences({
        keyFigures: {
          probabilityBelowCostLevel: { enabled: true, amount: -5 },
        },
      }).keyFigures.probabilityBelowCostLevel,
    ).toEqual({ enabled: true, amount: null })
    expect(
      shouldShowProbabilityBelowCostLevel({ enabled: true, amount: null }),
    ).toBe(false)
    expect(
      shouldShowProbabilityBelowCostLevel({ enabled: false, amount: 100 }),
    ).toBe(false)
  })

  it("parses and formats preference amounts in NO/EN", () => {
    expect(parseResultPreferenceAmount("8 181 000 000", "no")).toBe(
      8_181_000_000,
    )
    expect(parseResultPreferenceAmount("8,181,000,000", "en")).toBe(
      8_181_000_000,
    )
    expect(parseResultPreferenceAmount("", "no")).toBeNull()
    expect(parseResultPreferenceAmount("abc", "en")).toBeNull()
    expect(parseResultPreferenceAmount("-10", "en")).toBeNull()
    expect(formatResultPreferenceAmount(8_181_000_000, "no")).toBe(
      "8 181 000 000",
    )
    expect(formatResultPreferenceAmount(8_181_000_000, "en")).toBe(
      "8,181,000,000",
    )
  })

  it("add/remove percentiles and keep at least one", () => {
    let prefs = addKeyFigurePercentile(DEFAULT_RESULT_PREFERENCES, 15)
    expect(prefs.keyFigures.percentiles).toEqual([15, 50, 85])
    prefs = removeKeyFigurePercentile(prefs, 85)
    expect(prefs.keyFigures.percentiles).toEqual([15, 50])
    prefs = removeKeyFigurePercentile(prefs, 15)
    prefs = removeKeyFigurePercentile(prefs, 50)
    expect(prefs.keyFigures.percentiles).toEqual([50, 85])
  })

  it("S-curve sync vs separate percentiles", () => {
    const synced = addKeyFigurePercentile(DEFAULT_RESULT_PREFERENCES, 15)
    expect(resolveSCurvePercentiles(synced)).toEqual([15, 50, 85])
    const separate = {
      ...synced,
      sCurve: {
        ...synced.sCurve,
        useKeyFigurePercentiles: false,
        percentiles: [40, 70],
      },
    }
    expect(resolveSCurvePercentiles(separate)).toEqual([40, 70])
  })
})

describe("Result Preferences storage", () => {
  const memory = new Map<string, string>()

  afterEach(() => {
    memory.clear()
  })

  it("save/load round-trip through storage abstraction", () => {
    vi.stubGlobal("localStorage", {
      getItem: (k: string) => memory.get(k) ?? null,
      setItem: (k: string, v: string) => {
        memory.set(k, v)
      },
      removeItem: (k: string) => {
        memory.delete(k)
      },
    })
    const next = addKeyFigurePercentile(DEFAULT_RESULT_PREFERENCES, 15)
    saveResultPreferences(next)
    expect(loadResultPreferences().keyFigures.percentiles).toEqual([15, 50, 85])
    vi.unstubAllGlobals()
  })

  it("malformed localStorage falls back to defaults", () => {
    vi.stubGlobal("localStorage", {
      getItem: () => "{not-json",
      setItem: () => {},
      removeItem: () => {},
    })
    expect(loadResultPreferences()).toEqual(DEFAULT_RESULT_PREFERENCES)
    vi.unstubAllGlobals()
  })

  it("reset restores defaults and persists them", () => {
    vi.stubGlobal("localStorage", {
      getItem: (k: string) => memory.get(k) ?? null,
      setItem: (k: string, v: string) => {
        memory.set(k, v)
      },
      removeItem: (k: string) => {
        memory.delete(k)
      },
    })
    saveResultPreferences(addKeyFigurePercentile(DEFAULT_RESULT_PREFERENCES, 15))
    expect(resetResultPreferences().keyFigures.percentiles).toEqual([50, 85])
    expect(loadResultPreferences().keyFigures.percentiles).toEqual([50, 85])
    vi.unstubAllGlobals()
  })

  it("probabilityBelowCostLevel amount persists via storage", () => {
    vi.stubGlobal("localStorage", {
      getItem: (k: string) => memory.get(k) ?? null,
      setItem: (k: string, v: string) => {
        memory.set(k, v)
      },
      removeItem: (k: string) => {
        memory.delete(k)
      },
    })
    const next = normalizeResultPreferences({
      ...DEFAULT_RESULT_PREFERENCES,
      keyFigures: {
        ...DEFAULT_RESULT_PREFERENCES.keyFigures,
        probabilityBelowCostLevel: { enabled: true, amount: 1000 },
      },
    })
    saveResultPreferences(next)
    expect(loadResultPreferences().keyFigures.probabilityBelowCostLevel).toEqual(
      { enabled: true, amount: 1000 },
    )
    expect(resetResultPreferences().keyFigures.probabilityBelowCostLevel).toEqual(
      { enabled: false, amount: null },
    )
    vi.unstubAllGlobals()
  })

  it("storage key is device-scoped, not project/share", () => {
    expect(RESULT_PREFERENCES_STORAGE_KEY).toBe(
      "cost-simulator:v1:resultPreferences",
    )
    expect(RESULT_PREFERENCES_STORAGE_KEY).not.toContain("projects")
    expect(RESULT_PREFERENCES_STORAGE_KEY).not.toContain("share")
  })
})

describe("Result metric helpers", () => {
  it("arbitrary percentile uses authoritative helper", () => {
    const values = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100]
    expect(percentile(values, 15)).not.toBeNull()
    expect(percentile(values, 50)).toBe(55)
  })

  it("standard deviation absolute value is unchanged", () => {
    expect(standardDeviation([10, 10, 10])).toBe(0)
    expect(standardDeviation([0, 10])).toBeCloseTo(5, 8)
  })

  it("relative standard deviation uses Expected Value as denominator", () => {
    const values = [0, 10]
    const abs = standardDeviation(values)
    const ev = mean(values)
    expect(abs).toBeCloseTo(5, 8)
    expect(ev).toBe(5)
    // 5 / 5 × 100 = 100
    expect(relativeStandardDeviationPercent(abs, ev)).toBeCloseTo(100, 8)

    // Explicit definition: stdDev / expectedValue × 100 (not Base, not P50)
    expect(relativeStandardDeviationPercent(133, 1000)).toBeCloseTo(13.3, 8)
    expect(relativeStandardDeviationPercent(10, 50)).toBeCloseTo(20, 8)
  })

  it("relative standard deviation is null when Expected Value is zero or non-finite", () => {
    expect(relativeStandardDeviationPercent(5, 0)).toBeNull()
    expect(relativeStandardDeviationPercent(5, null)).toBeNull()
    expect(relativeStandardDeviationPercent(null, 100)).toBeNull()
    expect(relativeStandardDeviationPercent(5, Number.NaN)).toBeNull()
    expect(relativeStandardDeviationPercent(Number.POSITIVE_INFINITY, 100)).toBeNull()
  })

  it("relative stddev secondary percent formats with one decimal (NO/EN)", () => {
    expect(formatKeyFigurePercent(13.3, "no")).toBe("13,3 %")
    expect(formatKeyFigurePercent(13.3, "en")).toBe("13.3 %")
    expect(formatKeyFigurePercent(null, "no")).toBe("—")
    expect(formatKeyFigurePercent(Number.NaN, "en")).toBe("—")
    expect(formatKeyFigurePct(13.3, "en")).toBe("13.3 %")
    expect(formatKeyFigurePctDecimal(13.3, "no", 1)).toBe("13,3 %")
  })

  it("probability at or below is P(total ≤ threshold) as percent", () => {
    const values = [80, 90, 100, 110, 120]
    expect(probabilityAtOrBelowPercent(values, 100)).toBe(60)
    expect(probabilityAtOrBelowPercent(values, 70)).toBe(0)
    expect(probabilityAtOrBelowPercent(values, 120)).toBe(100)
    // Exact equality counts as <=
    expect(probabilityAtOrBelowPercent([10, 20, 30], 20)).toBeCloseTo(
      (2 / 3) * 100,
      8,
    )
  })

  it("probability below cost level uses same helper per project distribution", () => {
    const amount = 100
    const projectA = [80, 90, 100, 110, 120]
    const projectB = [50, 60, 70, 80, 90]
    expect(probabilityAtOrBelowPercent(projectA, amount)).toBe(60)
    expect(probabilityAtOrBelowPercent(projectB, amount)).toBe(100)
  })

  it("probability below secondary percent formats with one decimal (NO/EN)", () => {
    expect(formatKeyFigurePercent(72.5, "no")).toBe("72,5 %")
    expect(formatKeyFigurePercent(72.5, "en")).toBe("72.5 %")
  })

  it("probability at base cost is P(total ≤ base) as percent", () => {
    const values = [80, 90, 100, 110, 120]
    expect(probabilityAtOrBelowPercent(values, 100)).toBe(60)
    expect(probabilityAtOrBelowPercent(values, 70)).toBe(0)
  })
})

describe("Result Preferences UI wiring", () => {
  it("panel and consumers are wired without touching share/project schema", async () => {
    const { readFileSync } = await import("node:fs")
    const { join } = await import("node:path")
    const panel = readFileSync(
      join(root, "src/features/results/ResultsPanel.tsx"),
      "utf8",
    )
    const share = readFileSync(join(root, "src/persistence/shareLink.ts"), "utf8")
    const expander = readFileSync(
      join(root, "src/shared/SectionExpander.tsx"),
      "utf8",
    )
    const keyFigures = readFileSync(
      join(root, "src/features/results/ResultsKeyFiguresTable.tsx"),
      "utf8",
    )
    const expandHost = readFileSync(
      join(root, "src/features/results/ChartExpandButton.tsx"),
      "utf8",
    )
    expect(panel).toContain("ResultPreferencesPanel")
    expect(panel).toContain("liveResultPreferences")
    const app = readFileSync(join(root, "src/app/App.tsx"), "utf8")
    expect(app).toContain("useResultPreferences")
    expect(app).toContain("liveResultPreferences={resultPreferences}")
    expect(panel).toContain("headerTrailing=")
    expect(panel).toMatch(
      /results\.resultsHeading[\s\S]{0,400}headerTrailing=\{/,
    )
    // Global Result Preferences live on the Results header, not Key Figures toolbar.
    expect(panel).not.toContain("toolbarLeading=")
    expect(keyFigures).not.toContain("toolbarLeading")
    // ChartExpandHost still supports an optional toolbarLeading slot.
    expect(expandHost).toContain("toolbarLeading")
    expect(expandHost).toContain("data-chart-expand-toolbar-leading")
    const scurve = readFileSync(
      join(root, "src/features/results/ResultsSCurve.tsx"),
      "utf8",
    )
    expect(scurve).not.toContain("toolbarLeading")
    expect(scurve).not.toContain("displayModeControl")
    expect(scurve).not.toContain("horizontalZoomControl")
    expect(expander).toContain("headerTrailing")
    expect(expander).toContain('data-section-expander-title-group=""')
    expect(expander).toContain('data-section-expander-trailing=""')
    expect(expander).toContain('data-section-expander-end=""')
    expect(expander).toContain('data-section-expander-toggle=""')
    expect(expander).toContain("pointer-events-none")
    expect(expander).toContain("pointer-events-auto")
    expect(expander).toContain("absolute inset-0")
    // Title stays left; trailing controls + chevron share the right-end group.
    expect(expander).toMatch(
      /data-section-expander-toggle=""[\s\S]*?data-section-expander-title-group=""[\s\S]*?data-section-expander-end=""[\s\S]*?headerTrailing[\s\S]*?data-section-expander-chevron/,
    )
    // Chevron is outermost in the end group (after trailing).
    const endGroup = expander.slice(
      expander.indexOf('data-section-expander-end=""'),
      expander.indexOf('data-section-expander-chevron=""') + 40,
    )
    expect(endGroup.indexOf("headerTrailing")).toBeLessThan(
      endGroup.indexOf("data-section-expander-chevron"),
    )
    // Exactly one real <button> in the expander header (full-row toggle).
    expect(expander.match(/^\s*<button\b/gm)?.length ?? 0).toBe(1)
    expect(expander).toContain("gap-1.5")
    expect(expander).toContain("justify-between")
    expect(keyFigures).toContain("relativeStandardDeviationPercent")
    expect(keyFigures).toContain("formatKeyFigurePercent")
    expect(keyFigures).toMatch(
      /id: "stdDev"[\s\S]*?relativeStandardDeviationPercent\([\s\S]*?expectedValue/,
    )
    expect(keyFigures).toMatch(
      /id: "stdDev"[\s\S]*?formatKeyFigurePercent\(relativePct, language\)/,
    )
    expect(keyFigures).toMatch(
      /id: "expectedAddition"[\s\S]*?renderMetricValue\([\s\S]*?formatKeyFigurePercent/,
    )
    expect(keyFigures).toMatch(
      /id: "stdDev"[\s\S]*?renderMetricValue\([\s\S]*?formatKeyFigurePercent/,
    )
    expect(keyFigures).toContain("shouldShowProbabilityBelowCostLevel")
    expect(keyFigures).toContain('id: "probBelowCostLevel"')
    expect(keyFigures).toMatch(
      /id: "probBelowCostLevel"[\s\S]*?probabilityAtOrBelowPercent\(values, amount\)/,
    )
    expect(keyFigures).toMatch(
      /id: "probBelowCostLevel"[\s\S]*?formatKeyFigurePercent\(pct, language\)/,
    )
    expect(keyFigures).toContain("formatProbabilityBelowRowLabel")
    expect(keyFigures).toContain("probabilityBelowWithAmount")
    expect(keyFigures).toMatch(
      /id: "probBelowCostLevel"[\s\S]*?formatKeyFigurePercent\(pct, language\)[\s\S]*?undefined/,
    )
    const prefsPanel = readFileSync(
      join(root, "src/features/results/ResultPreferencesPanel.tsx"),
      "utf8",
    )
    expect(prefsPanel).toContain("showProbabilityBelowCostLevel")
    expect(prefsPanel).toContain("ProbabilityBelowAmountField")
    expect(prefsPanel).toContain("parseResultPreferenceAmount")
    expect(prefsPanel).toContain("fixed inset-0")
    expect(prefsPanel).toContain("items-center justify-center")
    expect(prefsPanel).toContain("data-result-preferences-backdrop")
    expect(prefsPanel).toContain("max-h-[min(75vh,32rem)]")
    expect(prefsPanel).toContain("overflow-y-auto")
    expect(prefsPanel).not.toContain("useLayoutEffect")
    // Amount changes update preferences only — no simulation call site in the panel.
    expect(prefsPanel).not.toContain("runSimulation")
    expect(prefsPanel).not.toContain("requestCalculation")
    expect(panel).toContain("markerPercentiles={sCurveMarkerPercentiles}")
    expect(panel).toContain("preferences={resultPreferences}")
    expect(share).not.toContain("resultPreferences")
    expect(share).not.toContain("RESULT_PREFERENCES")
    expect(share).not.toContain("probabilityBelowCostLevel")
  })
})
