/**
 * Thin compatibility wrapper around production deterministic Tornado.
 * Comparison tests and older call sites may use these names.
 */
import { computeDeterministicTornado } from "@/domain/simulation/deterministicTornado"
import {
  buildSimulationCostCorrelationMatrix,
  type Project,
} from "@/domain/analysis/project"
import { parseCostForSimulation } from "@/domain/results/tableRows"

export {
  costUserPercentileAbsolutes,
  driverUserPercentiles,
} from "@/domain/simulation/deterministicTornado"

export type CrystalBallTornadoRow = {
  name: string
  type: "cost" | "driver"
  factorIndex: number
  lowImpact: number
  modeImpact: number
  highImpact: number
  spread: number
  totalAtP10: number
  totalAtMode: number
  totalAtP90: number
}

export type CrystalBallTornadoResult = {
  baseCost: number
  totalAllAtMode: number
  rows: CrystalBallTornadoRow[]
}

/**
 * Deterministic one-factor-at-a-time Tornado (same math as production).
 * Impacts are relative to allModeTotal (= referenceValue).
 */
export function computeCrystalBallTornadoReference(
  project: Project,
  topN = 12,
): CrystalBallTornadoResult | null {
  const computed = computeDeterministicTornado(project, topN)
  if (!computed) return null

  const rows: CrystalBallTornadoRow[] = computed.rows.map((r) => ({
    name: r.name,
    type: r.type,
    factorIndex: r.sourceSeriesIndex,
    lowImpact: r.lowImpact,
    modeImpact: 0,
    highImpact: r.highImpact,
    spread: r.spread,
    totalAtP10: computed.referenceValue + r.lowImpact,
    totalAtMode: computed.referenceValue,
    totalAtP90: computed.referenceValue + r.highImpact,
  }))

  return {
    baseCost: computed.baseCost,
    totalAllAtMode: computed.referenceValue,
    rows,
  }
}

export function projectHasCostCorrelations(project: Project): boolean {
  const costRows = project.costRows.filter((r) => parseCostForSimulation(r))
  const matrix = buildSimulationCostCorrelationMatrix(
    costRows,
    project.costCorrelations,
  )
  for (let i = 0; i < matrix.length; i++) {
    for (let j = i + 1; j < matrix.length; j++) {
      if (matrix[i]![j] !== 0) return true
    }
  }
  return false
}
