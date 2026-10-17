/**
 * Internal product configuration for the main Monte Carlo simulation.
 *
 * Not a user setting — no Result Settings, UI control, or localStorage preference.
 * Shapley/Contribution keeps its own sampling config (`DEFAULT_SHAPLEY_ATTRIBUTION_CONFIG`).
 */

export const simulationConfig = {
  /** Monte Carlo draws per project for the main simulation worker request. */
  mainRuns: 20_000,
} as const

/**
 * Prefer a persisted result's `simulationCount` for method/report copy.
 * Falls back to the current product `mainRuns` when metadata is missing.
 *
 * Does not affect analytical validity / input signatures.
 */
export function resolveReportedSimulationCount(persisted: number | null | undefined): number {
  if (typeof persisted === "number" && Number.isFinite(persisted) && persisted > 0) {
    return Math.trunc(persisted)
  }
  return simulationConfig.mainRuns
}

type SimulationCountCarrier = {
  simulationCount?: number
}

/** First finite positive `simulationCount` among snapshot-like sources. */
export function firstPersistedSimulationCount(
  ...sources: ReadonlyArray<SimulationCountCarrier | null | undefined>
): number | undefined {
  for (const source of sources) {
    const n = source?.simulationCount
    if (typeof n === "number" && Number.isFinite(n) && n > 0) {
      return Math.trunc(n)
    }
  }
  return undefined
}
