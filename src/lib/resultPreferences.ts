/**
 * Result Preferences — presentation / user-display preferences.
 *
 * Separate from project/scenario/simulation data and share schema.
 * MVP: persisted via resultPreferencesStorage (localStorage).
 * Future: replace storage adapter with user/org API without rewriting
 * Key Figures / S-curve consumers.
 */

import { formatNumber, type AppLanguage } from "@/lib/formatNumber"

export const RESULT_PREFERENCES_VERSION = 1 as const

export type ProbabilityBelowCostLevelPref = {
  enabled: boolean
  /** Absolute currency threshold; null until the user enters a valid amount. */
  amount: number | null
}

export type ResultPreferencesV1 = {
  version: typeof RESULT_PREFERENCES_VERSION
  keyFigures: {
    showBaseCost: boolean
    showExpectedValue: boolean
    showExpectedAddition: boolean
    showUncertaintyReserve: boolean
    /** Absolute standard deviation + relative % (÷ Expected Value). */
    showStdDev: boolean
    showProbabilityAtBaseCost: boolean
    /**
     * Optional P(total ≤ amount) Key Figure for a user-entered cost level.
     * Presentation only — evaluated on existing simulation totals.
     */
    probabilityBelowCostLevel: ProbabilityBelowCostLevelPref
    /** Integer percentiles in 1..99, unique, stored ascending. */
    percentiles: number[]
  }
  sCurve: {
    /** When true, S-curve markers follow keyFigures.percentiles. */
    useKeyFigurePercentiles: boolean
    /** Used only when useKeyFigurePercentiles is false. */
    percentiles: number[]
  }
}

/** Authoritative defaults for Result Preferences (device-scoped). */
export const DEFAULT_RESULT_PREFERENCES: ResultPreferencesV1 = {
  version: RESULT_PREFERENCES_VERSION,
  keyFigures: {
    showBaseCost: true,
    showExpectedValue: false,
    showExpectedAddition: true,
    showUncertaintyReserve: true,
    showStdDev: false,
    showProbabilityAtBaseCost: false,
    probabilityBelowCostLevel: {
      enabled: false,
      amount: null,
    },
    percentiles: [50, 85],
  },
  sCurve: {
    useKeyFigurePercentiles: true,
    percentiles: [50, 85],
  },
}

export function sanitizePercentileList(raw: unknown): number[] {
  if (!Array.isArray(raw)) return []
  const out: number[] = []
  const seen = new Set<number>()
  for (const item of raw) {
    const n = typeof item === "number" ? item : Number(item)
    if (!Number.isFinite(n)) continue
    const p = Math.round(n)
    if (p < 1 || p > 99) continue
    if (seen.has(p)) continue
    seen.add(p)
    out.push(p)
  }
  out.sort((a, b) => a - b)
  return out
}

function asBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback
}

/** Persistable amount: finite and ≥ 0, else null. */
export function sanitizeProbabilityBelowAmount(raw: unknown): number | null {
  if (raw === null || raw === undefined) return null
  const n = typeof raw === "number" ? raw : Number(raw)
  if (!Number.isFinite(n) || n < 0) return null
  return n
}

export function normalizeProbabilityBelowCostLevel(
  raw: unknown,
): ProbabilityBelowCostLevelPref {
  const defaults =
    DEFAULT_RESULT_PREFERENCES.keyFigures.probabilityBelowCostLevel
  if (typeof raw !== "object" || raw === null) {
    return { ...defaults }
  }
  const o = raw as Record<string, unknown>
  return {
    enabled: asBoolean(o.enabled, defaults.enabled),
    amount: sanitizeProbabilityBelowAmount(o.amount),
  }
}

/**
 * Parse a locale-formatted monetary draft into a finite amount ≥ 0.
 * Blank → null. Malformed / negative → null.
 */
export function parseResultPreferenceAmount(
  raw: string,
  language: AppLanguage,
): number | null {
  let s = raw
    .trim()
    .replace(/\u00a0/g, " ")
    .replace(/\u202f/g, " ")
  if (s === "") return null
  if (language === "en") {
    s = s.replace(/,/g, "")
  } else {
    s = s.replace(/\s/g, "").replace(",", ".")
  }
  const n = Number(s)
  if (!Number.isFinite(n) || n < 0) return null
  return n
}

/** Display formatting for the preferences amount field (whole units preferred). */
export function formatResultPreferenceAmount(
  value: number | null,
  language: AppLanguage,
): string {
  if (value === null || !Number.isFinite(value)) return ""
  const digits = Number.isInteger(value) ? 0 : 2
  return formatNumber(value, digits, language)
}

/**
 * True when the Key Figure row should render (enabled + valid amount).
 */
export function shouldShowProbabilityBelowCostLevel(
  pref: ProbabilityBelowCostLevelPref,
): boolean {
  return (
    pref.enabled &&
    pref.amount !== null &&
    Number.isFinite(pref.amount) &&
    pref.amount >= 0
  )
}

/**
 * Normalize unknown JSON into a valid ResultPreferencesV1.
 * Malformed / unknown shapes fall back to defaults (field-wise where possible).
 * Legacy `sCurve.displayMode` (e.g. "minimal") is ignored and not carried forward.
 */
export function normalizeResultPreferences(raw: unknown): ResultPreferencesV1 {
  const defaults = DEFAULT_RESULT_PREFERENCES
  if (typeof raw !== "object" || raw === null) {
    return structuredClone(defaults)
  }
  const o = raw as Record<string, unknown>
  const kfRaw =
    typeof o.keyFigures === "object" && o.keyFigures !== null
      ? (o.keyFigures as Record<string, unknown>)
      : {}
  const scRaw =
    typeof o.sCurve === "object" && o.sCurve !== null
      ? (o.sCurve as Record<string, unknown>)
      : {}

  let percentiles = sanitizePercentileList(kfRaw.percentiles)
  if (percentiles.length === 0) {
    percentiles = [...defaults.keyFigures.percentiles]
  }

  let sCurvePercentiles = sanitizePercentileList(scRaw.percentiles)
  if (sCurvePercentiles.length === 0) {
    sCurvePercentiles = [...defaults.sCurve.percentiles]
  }

  return {
    version: RESULT_PREFERENCES_VERSION,
    keyFigures: {
      showBaseCost: asBoolean(
        kfRaw.showBaseCost,
        defaults.keyFigures.showBaseCost,
      ),
      showExpectedValue: asBoolean(
        kfRaw.showExpectedValue,
        defaults.keyFigures.showExpectedValue,
      ),
      showExpectedAddition: asBoolean(
        kfRaw.showExpectedAddition,
        defaults.keyFigures.showExpectedAddition,
      ),
      showUncertaintyReserve: asBoolean(
        kfRaw.showUncertaintyReserve,
        defaults.keyFigures.showUncertaintyReserve,
      ),
      showStdDev: asBoolean(kfRaw.showStdDev, defaults.keyFigures.showStdDev),
      showProbabilityAtBaseCost: asBoolean(
        kfRaw.showProbabilityAtBaseCost,
        defaults.keyFigures.showProbabilityAtBaseCost,
      ),
      probabilityBelowCostLevel: normalizeProbabilityBelowCostLevel(
        kfRaw.probabilityBelowCostLevel,
      ),
      percentiles,
    },
    sCurve: {
      useKeyFigurePercentiles: asBoolean(
        scRaw.useKeyFigurePercentiles,
        defaults.sCurve.useKeyFigurePercentiles,
      ),
      percentiles: sCurvePercentiles,
    },
  }
}

export function cloneResultPreferences(
  prefs: ResultPreferencesV1,
): ResultPreferencesV1 {
  return structuredClone(prefs)
}

export function addKeyFigurePercentile(
  prefs: ResultPreferencesV1,
  percentile: number,
): ResultPreferencesV1 {
  const next = cloneResultPreferences(prefs)
  next.keyFigures.percentiles = sanitizePercentileList([
    ...next.keyFigures.percentiles,
    percentile,
  ])
  return next
}

export function removeKeyFigurePercentile(
  prefs: ResultPreferencesV1,
  percentile: number,
): ResultPreferencesV1 {
  const next = cloneResultPreferences(prefs)
  next.keyFigures.percentiles = next.keyFigures.percentiles.filter(
    (p) => p !== percentile,
  )
  if (next.keyFigures.percentiles.length === 0) {
    next.keyFigures.percentiles = [
      ...DEFAULT_RESULT_PREFERENCES.keyFigures.percentiles,
    ]
  }
  return next
}

export function addSCurvePercentile(
  prefs: ResultPreferencesV1,
  percentile: number,
): ResultPreferencesV1 {
  const next = cloneResultPreferences(prefs)
  next.sCurve.percentiles = sanitizePercentileList([
    ...next.sCurve.percentiles,
    percentile,
  ])
  return next
}

export function removeSCurvePercentile(
  prefs: ResultPreferencesV1,
  percentile: number,
): ResultPreferencesV1 {
  const next = cloneResultPreferences(prefs)
  next.sCurve.percentiles = next.sCurve.percentiles.filter(
    (p) => p !== percentile,
  )
  if (next.sCurve.percentiles.length === 0) {
    next.sCurve.percentiles = [...DEFAULT_RESULT_PREFERENCES.sCurve.percentiles]
  }
  return next
}

/** Resolved S-curve marker percentiles for display. */
export function resolveSCurvePercentiles(
  prefs: ResultPreferencesV1,
): number[] {
  if (prefs.sCurve.useKeyFigurePercentiles) {
    return [...prefs.keyFigures.percentiles]
  }
  return [...prefs.sCurve.percentiles]
}

/**
 * Immutable snapshot of the CURRENT active result view (session draft).
 * PDF / AI Brief / on-screen charts should all consume this — never re-read
 * localStorage at generation time.
 */
export type ResolvedResultView = {
  keyFigures: {
    showBaseCost: boolean
    showExpectedValue: boolean
    showExpectedAddition: boolean
    showUncertaintyReserve: boolean
    showStdDev: boolean
    showProbabilityAtBaseCost: boolean
    probabilityBelowCostLevel: ProbabilityBelowCostLevelPref
    percentiles: number[]
  }
  sCurve: {
    /** Already resolved via resolveSCurvePercentiles. */
    percentiles: number[]
    useKeyFigurePercentiles: boolean
  }
}

export function resolveResultView(
  prefs: ResultPreferencesV1,
): ResolvedResultView {
  const kf = prefs.keyFigures
  return {
    keyFigures: {
      showBaseCost: kf.showBaseCost,
      showExpectedValue: kf.showExpectedValue,
      showExpectedAddition: kf.showExpectedAddition,
      showUncertaintyReserve: kf.showUncertaintyReserve,
      showStdDev: kf.showStdDev,
      showProbabilityAtBaseCost: kf.showProbabilityAtBaseCost,
      probabilityBelowCostLevel: {
        enabled: kf.probabilityBelowCostLevel.enabled,
        amount: kf.probabilityBelowCostLevel.amount,
      },
      percentiles: [...kf.percentiles],
    },
    sCurve: {
      percentiles: resolveSCurvePercentiles(prefs),
      useKeyFigurePercentiles: prefs.sCurve.useKeyFigurePercentiles,
    },
  }
}

export function formatPercentileLabel(p: number): string {
  return `P${p}`
}
