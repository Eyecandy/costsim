import type { WaterfallDisplayRow } from "@/lib/waterfallContributors"

export type WaterfallContributionRow = {
  key: string
  label: string
  contribution: number
  cumulativeBefore: number
  cumulativeAfter: number
}

export type WaterfallChartLayout = {
  /** Shapley contribution deltas only — excludes start/end reference values. */
  contributionRows: WaterfallContributionRow[]
  domainMin: number
  domainMax: number
  axisBreak: boolean
  startValue: number
  endValue: number
  spanTotal: number
}

export function buildWaterfallChartLayout(
  startValue: number,
  endValue: number,
  displayRows: readonly WaterfallDisplayRow[],
): WaterfallChartLayout {
  let cumulative = startValue
  const contributionRows: WaterfallContributionRow[] = []

  for (const row of displayRows) {
    const cumulativeBefore = cumulative
    cumulative += row.contribution
    contributionRows.push({
      key: row.id,
      label: row.name,
      contribution: row.contribution,
      cumulativeBefore,
      cumulativeAfter: cumulative,
    })
  }

  const runningValues = [startValue, endValue]
  let running = startValue
  for (const row of displayRows) {
    running += row.contribution
    runningValues.push(running, running - row.contribution)
  }

  const minRunning = Math.min(...runningValues)
  const maxRunning = Math.max(...runningValues)
  const maxAbsContribution = Math.max(
    0,
    ...displayRows.map((row) => Math.abs(row.contribution)),
  )
  const span = Math.max(
    Math.abs(endValue - startValue),
    maxAbsContribution,
    1,
  )
  const pad = Math.max(span * 0.2, maxAbsContribution * 0.35, 1)

  const domainMin = Math.min(startValue, endValue, minRunning) - pad
  const domainMax = Math.max(startValue, endValue, maxRunning) + pad

  return {
    contributionRows,
    domainMin,
    domainMax,
    axisBreak: domainMin > 0,
    startValue,
    endValue,
    spanTotal: endValue - startValue,
  }
}

export function valueToX(
  value: number,
  domainMin: number,
  domainMax: number,
  plotLeft: number,
  plotWidth: number,
): number {
  const span = Math.max(domainMax - domainMin, 1e-12)
  return plotLeft + ((value - domainMin) / span) * plotWidth
}
