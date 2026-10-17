/**
 * Presentation helpers for checkpoint comparison (formatting only).
 */

import type { AppLanguage } from "@/domain/results/formatNumber"
import { formatNumber } from "@/domain/results/formatNumber"
import {
  formatKeyFigureAbsoluteWithPercent,
  formatKeyFigurePercent,
  formatKeyFigureStat,
  formatProbabilityBelowRowLabel,
} from "@/domain/results/keyFiguresDisplay"
import type {
  CheckpointKeyFigureDelta,
  CheckpointStructuralChangeCounts,
} from "@/domain/analysis/checkpointComparison"
import { hasStructuralChanges } from "@/domain/analysis/checkpointComparison"
import {
  isCostMovementKeyFigureRowId,
  isKeyFigureRowLocked,
  keyFigureHasInlinePercent,
  keyFigureSemanticType,
  keyFigureValueKind,
  listVisibleComparableKeyFigureRowIds,
  type KeyFigureRowId,
} from "@/domain/results/keyFigureVisibility"
import { formatPercentileLabel, type ResultPreferencesV1 } from "@/domain/results/resultPreferences"
import { defaultCheckpointName } from "@/domain/analysis/analysisCheckpoint"
import type { Translate } from "@/i18n/messages"

function pickPlural(n: number, one: string, other: string): string {
  return n === 1 ? one.replace("{n}", "1") : other.replace("{n}", String(n))
}

/** Build compact structural summary phrases joined with " · ". */
export function formatStructuralChangeSummary(
  structural: CheckpointStructuralChangeCounts,
  language: AppLanguage,
): string[] {
  if (!hasStructuralChanges(structural)) return []

  const phrases: string[] = []
  const no = language === "no"

  if (structural.costItemsAdded > 0) {
    phrases.push(
      pickPlural(
        structural.costItemsAdded,
        no ? "{n} kostnadspost lagt til" : "{n} cost item added",
        no ? "{n} kostnadsposter lagt til" : "{n} cost items added",
      ),
    )
  }
  if (structural.costItemsRemoved > 0) {
    phrases.push(
      pickPlural(
        structural.costItemsRemoved,
        no ? "{n} kostnadspost fjernet" : "{n} cost item removed",
        no ? "{n} kostnadsposter fjernet" : "{n} cost items removed",
      ),
    )
  }
  if (structural.driversAdded > 0) {
    phrases.push(
      pickPlural(
        structural.driversAdded,
        no ? "{n} driver lagt til" : "{n} driver added",
        no ? "{n} drivere lagt til" : "{n} drivers added",
      ),
    )
  }
  if (structural.driversRemoved > 0) {
    phrases.push(
      pickPlural(
        structural.driversRemoved,
        no ? "{n} driver fjernet" : "{n} driver removed",
        no ? "{n} drivere fjernet" : "{n} drivers removed",
      ),
    )
  }
  const rangesChanged = structural.costRangesChanged + structural.driverRangesChanged
  if (rangesChanged > 0) {
    phrases.push(
      pickPlural(
        rangesChanged,
        no ? "{n} spenn endret" : "{n} range changed",
        no ? "{n} spenn endret" : "{n} ranges changed",
      ),
    )
  }
  return phrases
}

function formatSignedAbsoluteDelta(change: number, language: AppLanguage): string {
  if (change === 0) return formatKeyFigureStat(0, language)
  const abs = formatKeyFigureStat(Math.abs(change), language)
  return change > 0 ? `+${abs}` : `−${abs}`
}

/** Percentage-point delta: current% − previous% (not relative % of %). */
function formatSignedPercentagePoints(change: number, language: AppLanguage): string {
  const abs = formatNumber(Math.abs(change), 1, language)
  if (change === 0) return `${abs} pp`
  return change > 0 ? `+${abs} pp` : `−${abs} pp`
}

/** Parts for KeyFigureMetricValue — absolute | reserved percent slot. */
export type ComparisonMetricCellParts = {
  absoluteText: string
  percentText?: string
  /** Always reserve % slot so absolute values share one right edge. */
  reservePercentSlot: boolean
}

function joinMetricParts(parts: ComparisonMetricCellParts): string {
  if (!parts.percentText) return parts.absoluteText
  return `${parts.absoluteText} ${parts.percentText}`
}

/**
 * Previous / Current cell parts for the shared Key Figures metric grid.
 */
export function comparisonAbsoluteCellParts(
  row: CheckpointKeyFigureDelta,
  side: "previous" | "current",
  language: AppLanguage,
  lockedLabel: string,
): ComparisonMetricCellParts {
  if (isKeyFigureRowLocked(row.metric)) {
    return { absoluteText: lockedLabel, reservePercentSlot: true }
  }

  const absolute = side === "previous" ? row.previous : row.current
  const percent = side === "previous" ? row.previousPercent : row.currentPercent

  if (keyFigureHasInlinePercent(row.metric)) {
    return {
      absoluteText: formatKeyFigureStat(absolute, language),
      percentText: `(${formatKeyFigurePercent(percent ?? null, language)})`,
      reservePercentSlot: true,
    }
  }

  if (keyFigureValueKind(row.metric) === "percentage") {
    return {
      absoluteText: formatKeyFigurePercent(absolute, language),
      reservePercentSlot: true,
    }
  }

  if (absolute === null || !Number.isFinite(absolute)) {
    return { absoluteText: "—", reservePercentSlot: true }
  }
  return {
    absoluteText: formatKeyFigureStat(absolute, language),
    reservePercentSlot: true,
  }
}

/**
 * Change cell parts: absolute delta in the primary slot; optional (pp) beside it.
 */
export function comparisonDeltaCellParts(
  row: CheckpointKeyFigureDelta,
  language: AppLanguage,
): ComparisonMetricCellParts {
  if (keyFigureHasInlinePercent(row.metric)) {
    if (row.change === null || !Number.isFinite(row.change)) {
      return { absoluteText: "—", reservePercentSlot: true }
    }
    const absoluteText = formatSignedAbsoluteDelta(row.change, language)
    const pct = row.changePercent
    if (pct === null || pct === undefined || !Number.isFinite(pct)) {
      return { absoluteText, reservePercentSlot: true }
    }
    return {
      absoluteText,
      percentText: `(${formatSignedPercentagePoints(pct, language)})`,
      reservePercentSlot: true,
    }
  }

  if (row.change === null || !Number.isFinite(row.change)) {
    return { absoluteText: "—", reservePercentSlot: true }
  }

  if (keyFigureValueKind(row.metric) === "percentage") {
    return {
      absoluteText: formatSignedPercentagePoints(row.change, language),
      reservePercentSlot: true,
    }
  }

  return {
    absoluteText: formatSignedAbsoluteDelta(row.change, language),
    reservePercentSlot: true,
  }
}

/**
 * Change cell: absolute delta, or absolute + (pp) when the metric has inline %.
 * Probability-only metrics use percentage-point formatting alone.
 */
export function formatComparisonDelta(
  rowOrChange: CheckpointKeyFigureDelta | number | null,
  language: AppLanguage,
  metricId?: KeyFigureRowId,
): string {
  if (rowOrChange !== null && typeof rowOrChange === "object") {
    return joinMetricParts(comparisonDeltaCellParts(rowOrChange, language))
  }

  const change = rowOrChange
  if (change === null || !Number.isFinite(change)) return "—"
  const kind = metricId ? keyFigureValueKind(metricId) : "currency"
  if (kind === "percentage") {
    return formatSignedPercentagePoints(change, language)
  }
  return formatSignedAbsoluteDelta(change, language)
}

/**
 * Previous / Current cell as a single string (tests / non-grid consumers).
 * UI should prefer {@link comparisonAbsoluteCellParts} + KeyFigureMetricValue.
 */
export function formatComparisonAbsolute(
  valueOrRow: number | null | CheckpointKeyFigureDelta,
  language: AppLanguage,
  metricIdOrSide?: KeyFigureRowId | "previous" | "current",
  lockedLabel?: string,
): string {
  if (valueOrRow !== null && typeof valueOrRow === "object") {
    const side = metricIdOrSide === "current" ? "current" : "previous"
    return joinMetricParts(
      comparisonAbsoluteCellParts(valueOrRow, side, language, lockedLabel ?? "—"),
    )
  }

  const value = valueOrRow
  const metricId = metricIdOrSide as KeyFigureRowId
  const label = lockedLabel ?? "—"
  if (isKeyFigureRowLocked(metricId)) return label
  if (value === null || !Number.isFinite(value)) return "—"
  if (keyFigureValueKind(metricId) === "percentage") {
    return formatKeyFigurePercent(value, language)
  }
  if (keyFigureHasInlinePercent(metricId)) {
    return formatKeyFigureAbsoluteWithPercent(value, null, language)
  }
  return formatKeyFigureStat(value, language)
}

/**
 * Cost / magnitude delta tone from a signed numeric delta.
 *
 * Absolute monetary and percentage-point deltas are colored **independently**:
 * each uses its own delta (never the other value’s sign).
 *
 * - delta > 0 → increase → red
 * - delta < 0 → decrease → green
 * - zero / null → neutral
 *
 * For absolute cells, pass metricId so non-cost metrics (probabilities) stay neutral.
 * For percentage-point cells, omit metricId / use {@link getPercentageDeltaClass}.
 *
 * Text only — never cell/column backgrounds.
 */
export type CostDeltaTone = "increase" | "decrease" | "neutral"

export function costDeltaTone(delta: number | null, metricId?: KeyFigureRowId): CostDeltaTone {
  if (metricId && keyFigureSemanticType(metricId) !== "cost") {
    return "neutral"
  }
  if (metricId && !isCostMovementKeyFigureRowId(metricId)) {
    return "neutral"
  }
  if (delta === null || !Number.isFinite(delta) || delta === 0) {
    return "neutral"
  }
  return delta > 0 ? "increase" : "decrease"
}

/**
 * Text-only semantic color for signed deltas.
 * No background / pill / cell tint — table chrome stays neutral.
 */
export function costDeltaClassName(tone: CostDeltaTone): string {
  switch (tone) {
    case "increase":
      return "text-[#c24141] dark:text-[#e88989]"
    case "decrease":
      return "text-[#3f7d4e] dark:text-[#7eb88a]"
    case "neutral":
      return "text-foreground"
  }
}

/** Absolute monetary delta → text color (respects cost vs probability metric). */
export function getCostDeltaClass(absoluteDelta: number | null, metricId?: KeyFigureRowId): string {
  return costDeltaClassName(costDeltaTone(absoluteDelta, metricId))
}

/**
 * Percentage-point delta → text color, independent of the absolute monetary delta.
 * Same sign rule: negative green, positive red, zero neutral.
 */
export function getPercentageDeltaClass(percentagePointDelta: number | null): string {
  return costDeltaClassName(costDeltaTone(percentagePointDelta))
}

/**
 * Label for a Key Figure row id — mirrors ResultsKeyFiguresTable labeling.
 */
export function comparisonMetricLabel(
  metricId: KeyFigureRowId,
  t: Translate,
  language: AppLanguage,
  probabilityBelowAmount?: number | null,
): string {
  switch (metricId) {
    case "baseCost":
      return t("keyMetrics.baseCost")
    case "expectedAddition":
      return t("keyMetrics.expectedAddition")
    case "uncertaintyReserve":
      return t("keyMetrics.uncertaintyPremium")
    case "expectedValue":
      return t("keyMetrics.expectedValue")
    case "stdDev":
      return t("keyMetrics.stdDev")
    case "probAtBase":
      return t("keyMetrics.probabilityAtBaseCost")
    case "probBelowCostLevel": {
      const amount = probabilityBelowAmount
      if (amount === null || amount === undefined) {
        return t("keyMetrics.probabilityBelowCostLevel")
      }
      return formatProbabilityBelowRowLabel(
        amount,
        t("keyMetrics.probabilityBelowCostLevel"),
        language,
      )
    }
    default: {
      const m = /^p(\d+)$/.exec(metricId)
      if (m) return formatPercentileLabel(Number(m[1]))
      return metricId
    }
  }
}

/**
 * Order + filter comparison deltas using the SAME active Key Figure preferences
 * that drive the main Key Figures table. No separate comparison prefs.
 */
export function selectComparisonKeyFigures(
  deltas: readonly CheckpointKeyFigureDelta[] | null | undefined,
  keyFigures: ResultPreferencesV1["keyFigures"],
): CheckpointKeyFigureDelta[] {
  if (!deltas || deltas.length === 0) return []
  const byId = new Map(deltas.map((d) => [d.metric, d]))
  const ordered = listVisibleComparableKeyFigureRowIds(keyFigures)
  const rows: CheckpointKeyFigureDelta[] = []
  for (const id of ordered) {
    const row = byId.get(id)
    if (row) {
      rows.push(
        isKeyFigureRowLocked(id)
          ? {
              ...row,
              previous: null,
              current: null,
              change: null,
              previousPercent: null,
              currentPercent: null,
              changePercent: null,
            }
          : row,
      )
    }
  }
  return rows
}

/**
 * @deprecated Use selectComparisonKeyFigures — same active prefs, shared order.
 */
export function filterComparisonKeyFiguresByPreferences(
  rows: readonly CheckpointKeyFigureDelta[],
  keyFigures: ResultPreferencesV1["keyFigures"],
): CheckpointKeyFigureDelta[] {
  return selectComparisonKeyFigures(rows, keyFigures)
}

/**
 * "Checkpoint N" or "Checkpoint N · Custom name".
 * Omits the suffix when the stored name is empty or the default sequence label.
 */
export function formatCheckpointContextLabel(
  sequence: number,
  name: string,
  sequenceLabelTemplate: string,
): string {
  const seq = sequenceLabelTemplate.replace("{n}", String(sequence))
  const trimmed = name.trim()
  if (!trimmed || trimmed === seq || trimmed === defaultCheckpointName(sequence)) {
    return seq
  }
  return `${seq} · ${trimmed}`
}

/** Short legend label — sequence only to avoid chart noise. */
export function formatCheckpointLegendLabel(
  sequence: number,
  sequenceLabelTemplate: string,
): string {
  return sequenceLabelTemplate.replace("{n}", String(sequence))
}
