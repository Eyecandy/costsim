/**
 * Shared Key Figures visibility + ordering (presentation only).
 *
 * Authoritative source for which metric rows appear, and in what order,
 * matching ResultsKeyFiguresTable / buildKeyFigureMetricTableRows.
 * Checkpoint comparison reuses this — no separate preference state.
 *
 * Metrics that show absolute + % in the main table (Expected Addition,
 * Uncertainty Reserve, Std Dev) keep a single comparison row; the % is
 * formatted inline, not as a separate companion row.
 */

import { appFeatures } from "@/config/appVariant"
import {
  shouldShowProbabilityBelowCostLevel,
  type ResultPreferencesV1,
} from "@/lib/resultPreferences"

/** Row ids used by the main Key Figures table and PDF metric rows. */
export type KeyFigureRowId = string

/** Semantic value type for formatting comparison deltas. */
export type KeyFigureValueKind = "currency" | "percentage"

/**
 * Visible Key Figure row ids in display order for the active preferences.
 * Includes locked variant rows (e.g. P85 when feature-gated) the same way
 * the main Key Figures table does.
 */
export function listVisibleKeyFigureRowIds(
  keyFigures: ResultPreferencesV1["keyFigures"],
): KeyFigureRowId[] {
  const ids: KeyFigureRowId[] = []

  if (keyFigures.showBaseCost) {
    ids.push("baseCost")
  }

  if (keyFigures.showExpectedAddition && appFeatures.showExpectedAddition) {
    ids.push("expectedAddition")
  }

  for (const pLevel of keyFigures.percentiles) {
    ids.push(`p${pLevel}`)

    if (
      pLevel === 50 &&
      keyFigures.showUncertaintyReserve &&
      !ids.includes("uncertaintyReserve")
    ) {
      ids.push("uncertaintyReserve")
    }
  }

  if (
    keyFigures.showUncertaintyReserve &&
    !ids.includes("uncertaintyReserve")
  ) {
    ids.push("uncertaintyReserve")
  }

  if (keyFigures.showExpectedValue) {
    ids.push("expectedValue")
  }

  if (keyFigures.showStdDev) {
    ids.push("stdDev")
  }

  if (keyFigures.showProbabilityAtBaseCost) {
    ids.push("probAtBase")
  }

  if (shouldShowProbabilityBelowCostLevel(keyFigures.probabilityBelowCostLevel)) {
    ids.push("probBelowCostLevel")
  }

  return ids
}

/**
 * Metrics that checkpoint comparison can delta from stored/hydrated results.
 * Matches main Key Figures row ids only (no separate % companion rows).
 */
export function isComparableKeyFigureRowId(id: KeyFigureRowId): boolean {
  if (
    id === "baseCost" ||
    id === "expectedAddition" ||
    id === "uncertaintyReserve" ||
    id === "expectedValue" ||
    id === "stdDev" ||
    id === "probAtBase" ||
    id === "probBelowCostLevel"
  ) {
    return true
  }
  return /^p\d+$/.test(id)
}

/**
 * Visible comparable ids for the comparison table — same order as the main
 * Key Figures table (shared Result Preferences; no extra toggles).
 */
export function listVisibleComparableKeyFigureRowIds(
  keyFigures: ResultPreferencesV1["keyFigures"],
): KeyFigureRowId[] {
  return listVisibleKeyFigureRowIds(keyFigures).filter(isComparableKeyFigureRowId)
}

/**
 * Internal companion id used to extract the % that the main Key Figures table
 * shows inline for this absolute metric. Not a separate visible row.
 */
export function keyFigureInlinePercentCompanionId(
  id: KeyFigureRowId,
): KeyFigureRowId | null {
  switch (id) {
    case "expectedAddition":
      return "expectedAdditionPct"
    case "uncertaintyReserve":
      return "uncertaintyReservePct"
    case "stdDev":
      return "stdDevPct"
    default:
      return null
  }
}

/** True when the main Key Figures table shows absolute + % in one cell. */
export function keyFigureHasInlinePercent(id: KeyFigureRowId): boolean {
  return keyFigureInlinePercentCompanionId(id) !== null
}

/** True when the main table would show a locked placeholder for this row. */
export function isKeyFigureRowLocked(id: KeyFigureRowId): boolean {
  if (id === "p85" && !appFeatures.showP85) return true
  if (id === "uncertaintyReserve" && !appFeatures.showContingency) {
    return true
  }
  return false
}

export function keyFigureValueKind(id: KeyFigureRowId): KeyFigureValueKind {
  if (
    id === "expectedAdditionPct" ||
    id === "uncertaintyReservePct" ||
    id === "stdDevPct" ||
    id === "probAtBase" ||
    id === "probBelowCostLevel"
  ) {
    return "percentage"
  }
  return "currency"
}

/**
 * Cost-movement metrics — absolute change maps to cost direction:
 * higher cost (positive change) → red; lower cost (negative) → green.
 * Probability metrics stay neutral (not cost level).
 */
export function isCostMovementKeyFigureRowId(id: KeyFigureRowId): boolean {
  return keyFigureSemanticType(id) === "cost"
}

/** Shared semantic for delta coloring — prefer over label checks. */
export type KeyFigureSemanticType = "cost" | "probability"

export function keyFigureSemanticType(id: KeyFigureRowId): KeyFigureSemanticType {
  if (id === "probAtBase" || id === "probBelowCostLevel") {
    return "probability"
  }
  // Remaining comparable Key Figures are cost levels / cost dispersion.
  return "cost"
}

/** @deprecated Prefer isCostMovementKeyFigureRowId */
export function isMonetaryKeyFigureRowId(id: KeyFigureRowId): boolean {
  return isCostMovementKeyFigureRowId(id) && keyFigureValueKind(id) === "currency"
}
