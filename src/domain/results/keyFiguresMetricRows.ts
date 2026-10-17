/**
 * Preference-driven Key Figures rows for PDF (and other non-React consumers).
 * Mirrors ResultsKeyFiguresTable inclusion/order — presentation only.
 */

import { appFeatures } from "@/config/appVariant"
import type { AppLanguage } from "@/domain/results/formatNumber"
import {
  formatKeyFigureAbsoluteWithPercent,
  formatKeyFigurePercent,
  formatKeyFigureStat,
  formatProbabilityBelowRowLabel,
} from "@/domain/results/keyFiguresDisplay"
import { computeUncertainDeltaWithPct } from "@/lib/project"
import {
  formatPercentileLabel,
  shouldShowProbabilityBelowCostLevel,
  type ResolvedResultView,
} from "@/domain/results/resultPreferences"
import { frozenProbabilityBelowForAmount } from "@/domain/results/resultSettingsPresentation"
import {
  mean,
  percentile,
  probabilityAtOrBelowPercent,
  relativeStandardDeviationPercent,
  standardDeviation,
} from "@/domain/simulation/stats"
import type { OngoingFrozenKeyFiguresV1 } from "@/lib/ongoingCheckpointResultSnapshot"

export type KeyFigureMetricTableRow = {
  id: string
  label: string
  values: string[]
}

export type KeyFigureMetricRowLabels = {
  baseCost: string
  expectedAddition: string
  expectedValue: string
  uncertaintyPremium: string
  stdDev: string
  probabilityAtBaseCost: string
  /** Template with `{amount}`, e.g. "Sannsynlighet under {amount}". */
  probabilityBelowCostLevel: string
  locked: string
}

type ProjectInput = {
  id: string
  incurredCosts: number
}

/**
 * Build Key Figures table rows from the CURRENT resolved result view.
 * Does not read localStorage. Uses existing simulation totals only.
 */
export function buildKeyFigureMetricTableRows(opts: {
  resultView: ResolvedResultView
  projects: readonly ProjectInput[]
  valuesByProjectId: ReadonlyMap<string, readonly number[]>
  baseCostByProjectId: ReadonlyMap<string, number | null>
  simulatedIncurredByProjectId: ReadonlyMap<string, number>
  language: AppLanguage
  labels: KeyFigureMetricRowLabels
}): KeyFigureMetricTableRow[] {
  const {
    resultView,
    projects,
    valuesByProjectId,
    baseCostByProjectId,
    simulatedIncurredByProjectId,
    language,
    labels,
  } = opts
  const kf = resultView.keyFigures
  const rows: KeyFigureMetricTableRow[] = []

  if (kf.showBaseCost) {
    rows.push({
      id: "baseCost",
      label: labels.baseCost,
      values: projects.map((project) =>
        formatKeyFigureStat(baseCostByProjectId.get(project.id) ?? null, language),
      ),
    })
  }

  if (kf.showExpectedAddition && appFeatures.showExpectedAddition) {
    rows.push({
      id: "expectedAddition",
      label: labels.expectedAddition,
      values: projects.map((project) => {
        const values = valuesByProjectId.get(project.id) ?? []
        const p50 = percentile(values, 50)
        const base = baseCostByProjectId.get(project.id) ?? null
        const simulatedIncurred =
          simulatedIncurredByProjectId.get(project.id) ?? project.incurredCosts
        const delta = computeUncertainDeltaWithPct(
          p50,
          base,
          simulatedIncurred,
        )
        return formatKeyFigureAbsoluteWithPercent(
          delta.absolute,
          delta.percent,
          language,
        )
      }),
    })
  }

  for (const pLevel of kf.percentiles) {
    const lockedP85 = pLevel === 85 && !appFeatures.showP85
    rows.push({
      id: `p${pLevel}`,
      label: formatPercentileLabel(pLevel),
      values: projects.map((project) => {
        if (lockedP85) return labels.locked
        const values = valuesByProjectId.get(project.id) ?? []
        return formatKeyFigureStat(percentile(values, pLevel), language)
      }),
    })

    if (
      pLevel === 50 &&
      kf.showUncertaintyReserve &&
      !rows.some((r) => r.id === "uncertaintyReserve")
    ) {
      rows.push({
        id: "uncertaintyReserve",
        label: labels.uncertaintyPremium,
        values: projects.map((project) => {
          if (!appFeatures.showContingency) return labels.locked
          const values = valuesByProjectId.get(project.id) ?? []
          const p85 = percentile(values, 85)
          const p50 = percentile(values, 50)
          const simulatedIncurred =
            simulatedIncurredByProjectId.get(project.id) ?? project.incurredCosts
          const premium = computeUncertainDeltaWithPct(
            p85,
            p50,
            simulatedIncurred,
          )
          return formatKeyFigureAbsoluteWithPercent(
            premium.absolute,
            premium.percent,
            language,
          )
        }),
      })
    }
  }

  if (
    kf.showUncertaintyReserve &&
    !rows.some((r) => r.id === "uncertaintyReserve")
  ) {
    rows.push({
      id: "uncertaintyReserve",
      label: labels.uncertaintyPremium,
      values: projects.map((project) => {
        if (!appFeatures.showContingency) return labels.locked
        const values = valuesByProjectId.get(project.id) ?? []
        const p85 = percentile(values, 85)
        const p50 = percentile(values, 50)
        const simulatedIncurred =
          simulatedIncurredByProjectId.get(project.id) ?? project.incurredCosts
        const premium = computeUncertainDeltaWithPct(
          p85,
          p50,
          simulatedIncurred,
        )
        return formatKeyFigureAbsoluteWithPercent(
          premium.absolute,
          premium.percent,
          language,
        )
      }),
    })
  }

  if (kf.showExpectedValue) {
    rows.push({
      id: "expectedValue",
      label: labels.expectedValue,
      values: projects.map((project) =>
        formatKeyFigureStat(
          mean(valuesByProjectId.get(project.id) ?? []),
          language,
        ),
      ),
    })
  }

  if (kf.showStdDev) {
    rows.push({
      id: "stdDev",
      label: labels.stdDev,
      values: projects.map((project) => {
        const values = valuesByProjectId.get(project.id) ?? []
        const abs = standardDeviation(values)
        const expectedValue = mean(values)
        const relativePct = relativeStandardDeviationPercent(
          abs,
          expectedValue,
        )
        return formatKeyFigureAbsoluteWithPercent(abs, relativePct, language)
      }),
    })
  }

  if (kf.showProbabilityAtBaseCost) {
    rows.push({
      id: "probAtBase",
      label: labels.probabilityAtBaseCost,
      values: projects.map((project) => {
        const base = baseCostByProjectId.get(project.id)
        const values = valuesByProjectId.get(project.id) ?? []
        const pct =
          base === null || base === undefined
            ? null
            : probabilityAtOrBelowPercent(values, base)
        return formatKeyFigurePercent(pct, language)
      }),
    })
  }

  const probBelow = kf.probabilityBelowCostLevel
  if (shouldShowProbabilityBelowCostLevel(probBelow)) {
    const amount = probBelow.amount!
    rows.push({
      id: "probBelowCostLevel",
      label: formatProbabilityBelowRowLabel(
        amount,
        labels.probabilityBelowCostLevel,
        language,
      ),
      values: projects.map((project) => {
        const values = valuesByProjectId.get(project.id) ?? []
        const pct = probabilityAtOrBelowPercent(values, amount)
        return formatKeyFigurePercent(pct, language)
      }),
    })
  }

  return rows
}

/** PDF/non-React adapter for frozen compact Ongoing Key Figures. */
export function buildKeyFigureMetricTableRowsFromFrozen(opts: {
  resultView: ResolvedResultView
  projectIds: readonly string[]
  frozenByProjectId: ReadonlyMap<string, OngoingFrozenKeyFiguresV1>
  language: AppLanguage
  labels: KeyFigureMetricRowLabels
}): KeyFigureMetricTableRow[] {
  const { resultView, projectIds, frozenByProjectId, language, labels } = opts
  const kf = resultView.keyFigures
  const rows: KeyFigureMetricTableRow[] = []
  const values = (
    pick: (frozen: OngoingFrozenKeyFiguresV1) => string,
  ): string[] =>
    projectIds.map((id) => {
      const frozen = frozenByProjectId.get(id)
      return frozen ? pick(frozen) : "—"
    })
  if (kf.showBaseCost) {
    rows.push({
      id: "baseCost",
      label: labels.baseCost,
      values: values((f) => formatKeyFigureStat(f.baseCost, language)),
    })
  }
  if (kf.showExpectedAddition && appFeatures.showExpectedAddition) {
    rows.push({
      id: "expectedAddition",
      label: labels.expectedAddition,
      values: values((f) =>
        formatKeyFigureAbsoluteWithPercent(
          f.expectedAddition,
          f.expectedAdditionPct,
          language,
        ),
      ),
    })
  }
  for (const level of kf.percentiles) {
    rows.push({
      id: `p${level}`,
      label: formatPercentileLabel(level),
      values: values((f) =>
        level === 85 && !appFeatures.showP85
          ? labels.locked
          : formatKeyFigureStat(
              f.percentiles[String(level)] ?? null,
              language,
            ),
      ),
    })
    if (
      level === 50 &&
      kf.showUncertaintyReserve &&
      !rows.some((row) => row.id === "uncertaintyReserve")
    ) {
      rows.push({
        id: "uncertaintyReserve",
        label: labels.uncertaintyPremium,
        values: values((f) =>
          appFeatures.showContingency
            ? formatKeyFigureAbsoluteWithPercent(
                f.uncertaintyReserve,
                f.uncertaintyReservePct,
                language,
              )
            : labels.locked,
        ),
      })
    }
  }
  if (
    kf.showUncertaintyReserve &&
    !rows.some((row) => row.id === "uncertaintyReserve")
  ) {
    rows.push({
      id: "uncertaintyReserve",
      label: labels.uncertaintyPremium,
      values: values((f) =>
        appFeatures.showContingency
          ? formatKeyFigureAbsoluteWithPercent(
              f.uncertaintyReserve,
              f.uncertaintyReservePct,
              language,
            )
          : labels.locked,
      ),
    })
  }
  if (kf.showExpectedValue) {
    rows.push({
      id: "expectedValue",
      label: labels.expectedValue,
      values: values((f) => formatKeyFigureStat(f.expectedValue, language)),
    })
  }
  if (kf.showStdDev) {
    rows.push({
      id: "stdDev",
      label: labels.stdDev,
      values: values((f) =>
        formatKeyFigureAbsoluteWithPercent(f.stdDev, f.stdDevPct, language),
      ),
    })
  }
  if (kf.showProbabilityAtBaseCost) {
    rows.push({
      id: "probAtBase",
      label: labels.probabilityAtBaseCost,
      values: values((f) => formatKeyFigurePercent(f.probAtBase, language)),
    })
  }
  if (shouldShowProbabilityBelowCostLevel(kf.probabilityBelowCostLevel)) {
    const amount = kf.probabilityBelowCostLevel.amount!
    rows.push({
      id: "probBelowCostLevel",
      label: formatProbabilityBelowRowLabel(
        amount,
        labels.probabilityBelowCostLevel,
        language,
      ),
      values: values((f) =>
        formatKeyFigurePercent(
          frozenProbabilityBelowForAmount(f, amount),
          language,
        ),
      ),
    })
  }
  return rows
}
