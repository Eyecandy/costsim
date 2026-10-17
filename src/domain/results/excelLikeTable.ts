import type { ScenarioRow } from "@/domain/results/tableRows"

export const SCENARIO_COLUMN_KEYS = [
  "name",
  "optimistic",
  "likely",
  "pessimistic",
] as const satisfies readonly (keyof ScenarioRow)[]

/** Tillater desimaltall under redigering; tom streng bevares (ikke 0) */
export function sanitizeScenarioNumericInput(value: string): string {
  let s = value.replace(/\s/g, "").replace(",", ".")
  s = s.replace(/[^\d.-]/g, "")
  const parts = s.split(".")
  if (parts.length > 2) {
    s = `${parts[0]}.${parts.slice(1).join("")}`
  }
  if ((s.match(/-/g) ?? []).length > 1) {
    s = s.replace(/-/g, "")
  }
  if (s.includes("-") && !s.startsWith("-")) {
    s = s.replace(/-/g, "")
  }
  return s
}

export function patchScenarioRow<T extends ScenarioRow>(
  rows: T[],
  index: number,
  patch: Partial<T>,
): T[] {
  return rows.map((r, i) => (i === index ? { ...r, ...patch } : r))
}
