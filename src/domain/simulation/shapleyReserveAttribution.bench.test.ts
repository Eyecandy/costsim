import { describe, expect, it } from "vitest"

import {
  medianOfNumbers,
  percentileOfNumbers,
  quantilesFromSampleTotals,
} from "@/domain/simulation/shapleyAttribution"
import { percentile } from "@/domain/simulation/stats"

describe("subset quantile extraction benchmark", () => {
  it("reports incremental cost of P85 on top of P50 from the same totals", () => {
    const totals = Array.from({ length: 3000 }, (_, i) => 200_000_000 + i * 912.7)
    const iterations = 5000

    const p50OnlyStart = performance.now()
    for (let i = 0; i < iterations; i++) {
      medianOfNumbers(totals)
    }
    const p50OnlyMs = performance.now() - p50OnlyStart

    const bothStart = performance.now()
    for (let i = 0; i < iterations; i++) {
      quantilesFromSampleTotals(totals)
    }
    const bothMs = performance.now() - bothStart

    const p85OnlyStart = performance.now()
    for (let i = 0; i < iterations; i++) {
      percentileOfNumbers(totals, 85)
    }
    const p85OnlyMs = performance.now() - p85OnlyStart

    const report = {
      iterations,
      p50OnlyMs: Number(p50OnlyMs.toFixed(3)),
      p85OnlyMs: Number(p85OnlyMs.toFixed(3)),
      bothMs: Number(bothMs.toFixed(3)),
      incrementalBothOverP50Ms: Number((bothMs - p50OnlyMs).toFixed(3)),
      incrementalBothOverP50Pct: Number(
        (((bothMs - p50OnlyMs) / p50OnlyMs) * 100).toFixed(1),
      ),
      p50MatchesStats: medianOfNumbers(totals),
      p85MatchesStats: percentileOfNumbers(totals, 85),
      statsP50: percentile(totals, 50),
      statsP85: percentile(totals, 85),
    }

    // eslint-disable-next-line no-console
    console.table(report)

    expect(report.p50MatchesStats).toBeCloseTo(report.statsP50!, 9)
    expect(report.p85MatchesStats).toBeCloseTo(report.statsP85!, 9)
    // Relative % is noisy under CI load (p50-only ms is small); keep a loose
    // ceiling that still flags multi-x regressions. Local runs typically ~60–120%.
    expect(report.incrementalBothOverP50Pct).toBeLessThan(500)
  })
})
