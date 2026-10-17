import { newId } from "@/domain/results/tableRows"

/** Descriptive premise for an uncertainty analysis (not a model input). */
export type ProjectAssumption = {
  id: string
  text: string
}

export const ASSUMPTION_MAX_LENGTH = 280

export function trimAssumptionText(raw: string): string {
  return raw.trim().replace(/\s+/g, " ")
}

export function clampAssumptionText(raw: string): string {
  const trimmed = trimAssumptionText(raw)
  if (trimmed.length <= ASSUMPTION_MAX_LENGTH) return trimmed
  return trimmed.slice(0, ASSUMPTION_MAX_LENGTH).trimEnd()
}

/** Empty / whitespace-only → null (do not save). */
export function parseAssumptionText(raw: string): string | null {
  const clamped = clampAssumptionText(raw)
  return clamped === "" ? null : clamped
}

export function createAssumption(text: string): ProjectAssumption | null {
  const parsed = parseAssumptionText(text)
  if (parsed === null) return null
  return { id: newId(), text: parsed }
}

/**
 * Normalize unknown JSON into ordered assumptions.
 * Invalid entries are skipped. Empty → undefined (omit from project).
 */
export function normalizeAssumptions(
  raw: unknown,
): ProjectAssumption[] | undefined {
  if (!Array.isArray(raw)) return undefined
  const out: ProjectAssumption[] = []
  const seen = new Set<string>()
  for (const item of raw) {
    if (typeof item !== "object" || item === null) continue
    const o = item as Record<string, unknown>
    if (typeof o.text !== "string") continue
    const text = parseAssumptionText(o.text)
    if (text === null) continue
    const id =
      typeof o.id === "string" && o.id.trim() !== "" && !seen.has(o.id)
        ? o.id
        : newId()
    if (seen.has(id)) continue
    seen.add(id)
    out.push({ id, text })
  }
  return out.length > 0 ? out : undefined
}

/** Share/local compact form: ordered texts only (ids regenerated on import). */
export function assumptionsToShareTexts(
  assumptions: readonly ProjectAssumption[] | undefined,
): string[] | undefined {
  if (!assumptions || assumptions.length === 0) return undefined
  return assumptions.map((a) => a.text)
}

export function assumptionsFromShareTexts(
  texts: unknown,
): ProjectAssumption[] | undefined {
  if (!Array.isArray(texts)) return undefined
  const out: ProjectAssumption[] = []
  for (const t of texts) {
    if (typeof t !== "string") continue
    const created = createAssumption(t)
    if (created) out.push(created)
  }
  return out.length > 0 ? out : undefined
}
