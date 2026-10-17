import { normalizeIncurredCosts, type Project } from "@/domain/analysis/project"
import { normalizeAssumptions } from "@/domain/analysis/assumptions"
import { normalizeProjectProfile } from "@/domain/analysis/projectProfile"
import {
  normalizeCostRowDefinitions,
  normalizeDriverRowDefinitions,
} from "@/domain/results/rowDefinitions"
import { appFeatures } from "@/config/appVariant"

function isScenarioRow(x: unknown): boolean {
  if (typeof x !== "object" || x === null) return false
  const o = x as Record<string, unknown>
  return (
    typeof o.id === "string" &&
    typeof o.name === "string" &&
    typeof o.optimistic === "string" &&
    typeof o.likely === "string" &&
    typeof o.pessimistic === "string"
  )
}

function isProject(x: unknown): x is Project {
  if (typeof x !== "object" || x === null) return false
  const o = x as Record<string, unknown>
  if (
    typeof o.id !== "string" ||
    typeof o.name !== "string" ||
    !Array.isArray(o.costRows) ||
    !Array.isArray(o.driverRows)
  ) {
    return false
  }
  return o.costRows.every(isScenarioRow) && o.driverRows.every(isScenarioRow)
}

/** Validates and normalizes a stored/shared projects array. Returns null when the payload is not usable. */
export function parseProjectsPayload(data: unknown): Project[] | null {
  if (!Array.isArray(data)) return null
  const out: Project[] = []
  for (const item of data.slice(0, appFeatures.maxProjects)) {
    if (!isProject(item)) return null
    const p = item as Project & { incurredCosts?: unknown; assumptions?: unknown }
    const {
      assumptions: _rawAssumptions,
      profile: _rawProfile,
      ...base
    } = p as Project & {
      assumptions?: unknown
      profile?: unknown
    }
    const assumptions = normalizeAssumptions(_rawAssumptions)
    const profile = normalizeProjectProfile(_rawProfile)
    out.push({
      ...base,
      incurredCosts: normalizeIncurredCosts(p.incurredCosts),
      costRows: p.costRows.map(normalizeCostRowDefinitions),
      driverRows: p.driverRows.map(normalizeDriverRowDefinitions),
      ...(assumptions ? { assumptions } : {}),
      ...(profile ? { profile } : {}),
    })
  }
  return out
}

/**
 * Older saved input signatures were the full projects as JSON. Returns those projects, or null when the
 * string is not such a payload (for example the current canonical signature).
 */
export function projectsFromLegacySignature(signature: string): Project[] | null {
  try {
    return parseProjectsPayload(JSON.parse(signature))
  } catch {
    // intentional: not JSON, so it is a canonical signature rather than a legacy projects payload
    return null
  }
}
