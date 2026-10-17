import { snapCorrelationCoefficient } from "@/domain/simulation/costCorrelation"

export type ScenarioTableVariant = "allPercent" | "costMixed" | "driverMixed"

/** True while Impact/Correlation/Define mode owns the table (selection over cell rename/edit). */
export function isRelationshipEditingModeActive(opts: {
  variant: ScenarioTableVariant
  driverImpactModeActive?: boolean
  costCorrelationModeActive?: boolean
  defineModeActive?: boolean
}): boolean {
  if (opts.defineModeActive === true) {
    return opts.variant === "costMixed" || opts.variant === "driverMixed"
  }
  return (
    (opts.variant === "driverMixed" && opts.driverImpactModeActive === true) ||
    (opts.variant === "costMixed" && opts.costCorrelationModeActive === true)
  )
}

/** Hint while Define mode is on but no row is selected yet. */
export function shouldShowDefineSelectHint(opts: {
  defineModeActive?: boolean
  selectedRowId: string | null
}): boolean {
  return opts.defineModeActive === true && opts.selectedRowId === null
}

/** Hint while Impact mode is on but no driver is selected yet (sliders not shown). */
export function shouldShowRelationshipSelectHint(opts: {
  variant: ScenarioTableVariant
  driverImpactMode?: { active: boolean; selectedDriverRowId: string | null } | null
}): boolean {
  if (opts.variant === "driverMixed" && opts.driverImpactMode?.active) {
    return opts.driverImpactMode.selectedDriverRowId === null
  }
  return false
}

/** Correlation mode control-area instruction when fewer than two costs are selected. */
export function shouldShowCorrelationSelectInstruction(opts: {
  correlationActive?: boolean
  selectedCount: number
  saveConfirmVisible?: boolean
}): boolean {
  return (
    opts.correlationActive === true && opts.selectedCount < 2 && opts.saveConfirmVisible !== true
  )
}

export function shouldShowCorrelationGroupControls(opts: {
  correlationActive?: boolean
  selectedCount: number
}): boolean {
  return opts.correlationActive === true && opts.selectedCount >= 2
}

/** Format pending group ρ for the compact control row (+0,5 / +0.5). */
export function formatCorrelationControlValue(
  value: number,
  language: "no" | "en",
  mixed?: boolean,
): string {
  if (mixed) return "—"
  const snapped = snapCorrelationCoefficient(value)
  const abs = Math.abs(snapped).toFixed(1)
  const body = language === "no" ? abs.replace(".", ",") : abs
  if (snapped > 0) return `+${body}`
  if (snapped < 0) return `-${body}`
  return body
}
