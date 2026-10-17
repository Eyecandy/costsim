import {
  computeDeterministicTornadoRows,
  type DeterministicTornadoRow,
} from "@/domain/simulation/deterministicTornado"
import { computeUncertainDeltaWithPct, type Project } from "@/domain/analysis/project"
import type { ResolvedResultView } from "@/domain/results/resultPreferences"
import {
  computeSCurveDisplaySeries,
  SCURVE_DISPLAY_POINT_TARGET,
} from "@/domain/results/sCurveDisplay"
import type { ShapleyAttributionResult } from "@/domain/simulation/shapleyAttribution"
import {
  mean,
  percentile,
  probabilityAtOrBelowPercent,
  relativeStandardDeviationPercent,
  standardDeviation,
} from "@/domain/simulation/stats"
import type { ProjectResult } from "@/domain/simulation/simulationTypes"

export type CompactFrozenKeyFiguresV1 = {
  baseCost: number | null
  expectedValue: number | null
  stdDev: number | null
  stdDevPct: number | null
  expectedAddition: number | null
  expectedAdditionPct: number | null
  uncertaintyReserve: number | null
  uncertaintyReservePct: number | null
  probAtBase: number | null
  probBelowCostLevel: number | null
  probabilityBelowAmount: number | null
  percentiles: Record<string, number>
}

export type CompactSCurveV1 = {
  representation: "display_cdf_v1"
  pointCount: number
  points: Array<{ x: number; y: number }>
}

export type CompactProjectResultV1 = {
  projectId: string
  incurredCosts: number
  simulatedBaseCost: number | null
  keyFigures: CompactFrozenKeyFiguresV1
  sCurve: CompactSCurveV1
  tornado: DeterministicTornadoRow[] | null
  contribution: ShapleyAttributionResult | null
}

function finiteOrNull(value: number | null): number | null {
  return value !== null && Number.isFinite(value) ? value : null
}

export function buildCompactProjectResult(args: {
  project: Project
  result: ProjectResult
  simulatedBaseCost: number | null
  resultView: ResolvedResultView
  contribution?: ShapleyAttributionResult | null
}): CompactProjectResultV1 {
  const values = args.result.values
  const incurredCosts = args.result.incurredCosts ?? args.project.incurredCosts ?? 0
  const baseCost = finiteOrNull(args.simulatedBaseCost)
  const percentileLevels = new Set<number>([
    50,
    85,
    ...args.resultView.keyFigures.percentiles,
    ...args.resultView.sCurve.percentiles,
  ])
  const percentiles: Record<string, number> = {}
  for (const level of percentileLevels) {
    const value = percentile(values, level)
    if (value !== null && Number.isFinite(value)) {
      percentiles[String(level)] = value
    }
  }
  const p50 = percentiles["50"] ?? null
  const p85 = percentiles["85"] ?? null
  const expectedValue = mean(values)
  const stdDev = standardDeviation(values)
  const expectedAddition = computeUncertainDeltaWithPct(p50, baseCost, incurredCosts)
  const uncertaintyReserve = computeUncertainDeltaWithPct(p85, p50, incurredCosts)
  const probabilityBelowAmount = args.resultView.keyFigures.probabilityBelowCostLevel.amount
  const probabilityBelowEnabled =
    args.resultView.keyFigures.probabilityBelowCostLevel.enabled &&
    probabilityBelowAmount !== null &&
    Number.isFinite(probabilityBelowAmount)
  const points = computeSCurveDisplaySeries(values, SCURVE_DISPLAY_POINT_TARGET).map((point) => ({
    ...point,
  }))

  const compact: CompactProjectResultV1 = {
    projectId: args.project.id,
    incurredCosts,
    simulatedBaseCost: baseCost,
    keyFigures: {
      baseCost,
      expectedValue: finiteOrNull(expectedValue),
      stdDev: finiteOrNull(stdDev),
      stdDevPct: finiteOrNull(relativeStandardDeviationPercent(stdDev, expectedValue)),
      expectedAddition: finiteOrNull(expectedAddition.absolute),
      expectedAdditionPct: finiteOrNull(expectedAddition.percent),
      uncertaintyReserve: finiteOrNull(uncertaintyReserve.absolute),
      uncertaintyReservePct: finiteOrNull(uncertaintyReserve.percent),
      probAtBase:
        baseCost === null ? null : finiteOrNull(probabilityAtOrBelowPercent(values, baseCost)),
      probBelowCostLevel: probabilityBelowEnabled
        ? finiteOrNull(probabilityAtOrBelowPercent(values, probabilityBelowAmount))
        : null,
      probabilityBelowAmount: probabilityBelowEnabled ? probabilityBelowAmount : null,
      percentiles,
    },
    sCurve: {
      representation: "display_cdf_v1",
      pointCount: points.length,
      points,
    },
    tornado: values.length > 0 ? computeDeterministicTornadoRows(args.project, 6) : null,
    contribution: args.contribution ?? null,
  }
  assertNoHeavyValuesInCompact(compact)
  return compact
}

/** Throws if a compact payload accidentally contains raw Monte Carlo samples. */
export function assertNoHeavyValuesInCompact(value: unknown): void {
  const walk = (child: unknown, path: string): void => {
    if (Array.isArray(child)) {
      if (path.endsWith(".values") || child.length > SCURVE_DISPLAY_POINT_TARGET) {
        throw new Error(`heavy_values_in_compact_result:${path}`)
      }
      child.forEach((item, index) => walk(item, `${path}[${index}]`))
      return
    }
    if (!child || typeof child !== "object") return
    for (const [key, nested] of Object.entries(child)) {
      walk(nested, `${path}.${key}`)
    }
  }
  walk(value, "compact")
}
