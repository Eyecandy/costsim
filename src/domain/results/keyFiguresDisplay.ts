import { formatNumber, type AppLanguage } from "@/domain/results/formatNumber"
import type { SampleSummary } from "@/simulation"

/** Switch to million compact form at this absolute magnitude (inclusive). */
const PROBABILITY_THRESHOLD_MILLIONS_AT = 1_000_000

export function formatKeyFigureStat(
  v: number | null,
  language: "no" | "en",
): string {
  return v === null ? "—" : formatNumber(v, 0, language)
}

/**
 * Authoritative Key Figures percentage: one decimal, locale separators,
 * space before `%` (e.g. NO `12,0 %` / EN `12.0 %`).
 */
export function formatKeyFigurePercent(
  v: number | null,
  language: AppLanguage,
): string {
  if (v === null || !Number.isFinite(v)) return "—"
  return `${formatNumber(v, 1, language)} %`
}

/**
 * Absolute + percentage in parentheses — same pattern as Expected Addition,
 * Uncertainty Reserve, and Std Dev in the main Key Figures table.
 * Example EN: `17 (12.4 %)` · NO: `17 (12,4 %)`.
 */
export function formatKeyFigureAbsoluteWithPercent(
  absolute: number | null,
  percent: number | null,
  language: AppLanguage,
): string {
  return `${formatKeyFigureStat(absolute, language)} (${formatKeyFigurePercent(percent, language)})`
}

/** @deprecated Prefer {@link formatKeyFigurePercent}. */
export function formatKeyFigurePct(
  v: number | null,
  language: AppLanguage = "en",
): string {
  return formatKeyFigurePercent(v, language)
}

/**
 * @deprecated Prefer {@link formatKeyFigurePercent}.
 * Kept for call-site compatibility; fractionDigits is ignored (always 1).
 */
export function formatKeyFigurePctDecimal(
  v: number | null,
  language: AppLanguage,
  _fractionDigits = 1,
): string {
  return formatKeyFigurePercent(v, language)
}

/**
 * Adaptive display for the Probability-below threshold (presentation only).
 *
 * Rule: `|amount| < 1_000_000` → full amount; otherwise millions.
 * NO uses `mill.`; EN uses `M`. Million values use up to 1 decimal and drop
 * trailing zeros (e.g. `1 mill.` / `1.2 M`).
 */
export function formatProbabilityThreshold(
  amount: number,
  language: AppLanguage,
): string {
  if (!Number.isFinite(amount)) return "—"
  if (amount === 0) return formatNumber(0, 0, language)

  const abs = Math.abs(amount)
  if (abs < PROBABILITY_THRESHOLD_MILLIONS_AT) {
    const digits = Number.isInteger(amount) ? 0 : 2
    return formatNumber(amount, digits, language)
  }

  const millions = amount / 1_000_000
  const rounded1 = Math.round(millions * 10) / 10
  const displayDigits = Number.isInteger(rounded1) ? 0 : 1
  const body = formatNumber(rounded1, displayDigits, language)
  return language === "no" ? `${body} mill.` : `${body} M`
}

/**
 * Amount text for the Probability-below Key Figures row label.
 * @see {@link formatProbabilityThreshold}
 */
export function formatProbabilityBelowLabelAmount(
  amount: number,
  language: AppLanguage,
): string {
  return formatProbabilityThreshold(amount, language)
}

/** Key Figures row label: "Sannsynlighet under 200 mill." / "Probability below 200 M". */
export function formatProbabilityBelowRowLabel(
  amount: number,
  template: string,
  language: AppLanguage,
): string {
  return template.replace(
    "{amount}",
    formatProbabilityBelowLabelAmount(amount, language),
  )
}

export type KeyFiguresProjectValues = {
  summaryByProjectId: ReadonlyMap<string, SampleSummary>
  baseCostByProjectId: ReadonlyMap<string, number | null>
  simulatedIncurredByProjectId: ReadonlyMap<string, number>
}
