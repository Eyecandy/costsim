import {
  formatNumber,
  type AppLanguage,
} from "@/lib/formatNumber"

export type WaterfallDisplayScale =
  | { kind: "millions"; unitSuffix: "M" }
  | { kind: "thousands"; unitSuffix: "k" }
  | { kind: "absolute"; unitSuffix: "" }

/** Choose one display unit for an entire waterfall chart. */
export function resolveWaterfallDisplayScale(
  values: readonly number[],
): WaterfallDisplayScale {
  const maxAbs = values.reduce((max, value) => {
    if (!Number.isFinite(value)) return max
    return Math.max(max, Math.abs(value))
  }, 0)

  if (maxAbs >= 1_000_000) return { kind: "millions", unitSuffix: "M" }
  if (maxAbs >= 10_000) return { kind: "thousands", unitSuffix: "k" }
  return { kind: "absolute", unitSuffix: "" }
}

function scaledMagnitude(value: number, scale: WaterfallDisplayScale): number {
  switch (scale.kind) {
    case "millions":
      return value / 1_000_000
    case "thousands":
      return value / 1_000
    case "absolute":
      return value
  }
}

function fractionDigitsForScaledMagnitude(
  scaledAbs: number,
  defaultDigits: number,
): number {
  if (scaledAbs === 0) return defaultDigits

  const roundedDefault =
    Math.round(scaledAbs * 10 ** defaultDigits) / 10 ** defaultDigits
  if (roundedDefault === 0) {
    if (scaledAbs >= 0.01) return 2
    if (scaledAbs >= 0.001) return 3
    return 4
  }

  return defaultDigits
}

function defaultFractionDigits(scale: WaterfallDisplayScale): number {
  switch (scale.kind) {
    case "millions":
      return 1
    case "thousands":
      return 1
    case "absolute":
      return scaledMagnitude(1, scale) >= 100 ? 0 : 2
  }
}

function formatScaledValue(
  scaledValue: number,
  scale: WaterfallDisplayScale,
  language: AppLanguage,
  options?: { stripTrailingZeroFraction?: boolean },
): string {
  const defaultDigits = defaultFractionDigits(scale)
  const digits = fractionDigitsForScaledMagnitude(
    Math.abs(scaledValue),
    defaultDigits,
  )
  const rounded =
    Math.round(scaledValue * 10 ** digits) / 10 ** digits
  let displayDigits = digits
  if (
    options?.stripTrailingZeroFraction &&
    digits === 1 &&
    Number.isInteger(rounded)
  ) {
    displayDigits = 0
  }
  const body = formatNumber(rounded, displayDigits, language)
  return scale.unitSuffix ? `${body} ${scale.unitSuffix}` : body
}

/** Format one waterfall value using a chart-level scale (display only). */
export function formatWaterfallValueWithScale(
  value: number,
  scale: WaterfallDisplayScale,
  language: AppLanguage,
): string {
  if (!Number.isFinite(value)) return "—"
  return formatScaledValue(scaledMagnitude(value, scale), scale, language)
}

export function formatWaterfallSignedDeltaWithScale(
  value: number,
  scale: WaterfallDisplayScale,
  language: AppLanguage,
): string {
  if (!Number.isFinite(value)) return "—"
  if (value === 0) return formatWaterfallValueWithScale(0, scale, language)
  const sign = value > 0 ? "+" : "-"
  return `${sign}${formatWaterfallValueWithScale(Math.abs(value), scale, language)}`
}

/**
 * Tornado label formatting: same chart-level units as waterfall, but strip
 * unnecessary trailing .0/,0 on whole k/M values (e.g. 620 k not 620.0 k).
 */
export function formatTornadoValueWithScale(
  value: number,
  scale: WaterfallDisplayScale,
  language: AppLanguage,
): string {
  if (!Number.isFinite(value)) return "—"
  return formatScaledValue(scaledMagnitude(value, scale), scale, language, {
    stripTrailingZeroFraction: true,
  })
}

export function formatTornadoSignedDeltaWithScale(
  value: number,
  scale: WaterfallDisplayScale,
  language: AppLanguage,
): string {
  if (!Number.isFinite(value)) return "—"
  if (value === 0) return formatTornadoValueWithScale(0, scale, language)
  const sign = value > 0 ? "+" : "-"
  return `${sign}${formatTornadoValueWithScale(Math.abs(value), scale, language)}`
}

/** @deprecated Use chart-level scale via resolveWaterfallDisplayScale. */
export function formatWaterfallValue(
  value: number,
  language: AppLanguage,
): string {
  return formatWaterfallValueWithScale(
    value,
    resolveWaterfallDisplayScale([value]),
    language,
  )
}

/** @deprecated Use chart-level scale via resolveWaterfallDisplayScale. */
export function formatWaterfallSignedDelta(
  value: number,
  language: AppLanguage,
): string {
  return formatWaterfallSignedDeltaWithScale(
    value,
    resolveWaterfallDisplayScale([value]),
    language,
  )
}

export function collectWaterfallDisplayValues(input: {
  startValue: number
  endValue: number
  contributions: readonly number[]
}): number[] {
  return [input.startValue, input.endValue, ...input.contributions]
}

export function collectTornadoDisplayValues(
  rows: readonly { lowImpact: number; highImpact: number }[],
): number[] {
  const values: number[] = []
  for (const row of rows) {
    if (Number.isFinite(row.lowImpact)) values.push(row.lowImpact)
    if (Number.isFinite(row.highImpact)) values.push(row.highImpact)
  }
  return values
}

/**
 * Tornado prefers `k` for small/medium charts so values like 3,202 are shown as
 * 3.2 k instead of noisy absolute currency. Millions threshold matches waterfall.
 */
export function resolveTornadoDisplayScale(
  values: readonly number[],
): WaterfallDisplayScale {
  const maxAbs = values.reduce((max, value) => {
    if (!Number.isFinite(value)) return max
    return Math.max(max, Math.abs(value))
  }, 0)

  if (maxAbs >= 1_000_000) return { kind: "millions", unitSuffix: "M" }
  if (maxAbs > 0) return { kind: "thousands", unitSuffix: "k" }
  return { kind: "absolute", unitSuffix: "" }
}

/**
 * Per-value adaptive unit for Contribution Analysis labels.
 * Same magnitude bands as Tornado for M vs k, with absolute below 1k.
 */
export function resolveAdaptiveMonetaryScale(
  value: number,
): WaterfallDisplayScale {
  const abs = Math.abs(value)
  if (!Number.isFinite(abs) || abs === 0) {
    return { kind: "absolute", unitSuffix: "" }
  }
  if (abs >= 1_000_000) return { kind: "millions", unitSuffix: "M" }
  if (abs >= 1_000) return { kind: "thousands", unitSuffix: "k" }
  return { kind: "absolute", unitSuffix: "" }
}

/** Contribution Analysis precision: M → 1 dp, k/absolute → 0 dp. */
function adaptiveFractionDigits(scale: WaterfallDisplayScale): number {
  switch (scale.kind) {
    case "millions":
      return 1
    case "thousands":
    case "absolute":
      return 0
  }
}

export function formatAdaptiveMonetaryValue(
  value: number,
  language: AppLanguage,
): string {
  if (!Number.isFinite(value)) return "—"
  if (value === 0) return formatNumber(0, 0, language)

  const scale = resolveAdaptiveMonetaryScale(value)
  const scaled = scaledMagnitude(value, scale)
  const digits = adaptiveFractionDigits(scale)
  const rounded = Math.round(scaled * 10 ** digits) / 10 ** digits

  // Keep whole millions readable as "5 M" rather than "5.0 M".
  let displayDigits = digits
  if (scale.kind === "millions" && Number.isInteger(rounded)) {
    displayDigits = 0
  }

  const body = formatNumber(rounded, displayDigits, language)
  return scale.unitSuffix ? `${body} ${scale.unitSuffix}` : body
}

export function formatAdaptiveMonetarySignedDelta(
  value: number,
  language: AppLanguage,
): string {
  if (!Number.isFinite(value)) return "—"
  if (value === 0) return formatAdaptiveMonetaryValue(0, language)
  const sign = value > 0 ? "+" : "-"
  return `${sign}${formatAdaptiveMonetaryValue(Math.abs(value), language)}`
}

/**
 * One display unit per Tornado chart. When compared projects are in a similar
 * magnitude range, share one unit so labels stay comparable. If magnitudes
 * diverge enough that a shared unit would hurt readability, keep per-chart
 * units (bar geometry / sharedSymmetricMaxAbs is unchanged).
 */
export function resolveTornadoDisplayScales(
  rowsGroups: readonly (readonly { lowImpact: number; highImpact: number }[])[],
): WaterfallDisplayScale[] {
  if (rowsGroups.length === 0) return []

  const valueGroups = rowsGroups.map((rows) => collectTornadoDisplayValues(rows))
  const perChart = valueGroups.map((values) => resolveTornadoDisplayScale(values))
  const chartMaxAbs = valueGroups.map((values) =>
    values.reduce((max, value) => {
      if (!Number.isFinite(value)) return max
      return Math.max(max, Math.abs(value))
    }, 0),
  )
  const globalMaxAbs = chartMaxAbs.reduce((max, value) => Math.max(max, value), 0)
  const kinds = new Set(perChart.map((scale) => scale.kind))
  const magnitudesSimilar =
    globalMaxAbs === 0 ||
    chartMaxAbs.every(
      (maxAbs) => maxAbs === 0 || globalMaxAbs / maxAbs <= 100,
    )

  if (kinds.size <= 1 || magnitudesSimilar) {
    const shared = resolveTornadoDisplayScale(valueGroups.flat())
    return rowsGroups.map(() => shared)
  }
  return perChart
}
