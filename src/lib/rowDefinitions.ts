import type {
  CostElementRow,
  DriverRow,
  DriverUncertaintyNotes,
  ScenarioRow,
} from "@/lib/tableRows"

/** Cost-item description character cap. */
export const COST_DESCRIPTION_MAX_LENGTH = 500
/** Driver description character cap. */
export const DRIVER_DESCRIPTION_MAX_LENGTH = 500
/** Max length of a single qualitative uncertainty note. */
export const DRIVER_UNCERTAINTY_NOTE_MAX_LENGTH = 200
/** Max notes per side (lowerOutcome / higherOutcome). */
export const DRIVER_UNCERTAINTY_NOTES_MAX_PER_SIDE = 12

function clampMultiline(raw: string, maxLength: number): string {
  const trimmed = raw.trim()
  if (trimmed.length <= maxLength) return trimmed
  return trimmed.slice(0, maxLength).trimEnd()
}

/** Empty / whitespace-only → null (do not save). */
export function parseDefinitionText(
  raw: string,
  maxLength: number,
): string | null {
  const clamped = clampMultiline(raw, maxLength)
  return clamped === "" ? null : clamped
}

export function parseCostDescription(raw: string): string | null {
  return parseDefinitionText(raw, COST_DESCRIPTION_MAX_LENGTH)
}

export function parseDriverDescription(raw: string): string | null {
  return parseDefinitionText(raw, DRIVER_DESCRIPTION_MAX_LENGTH)
}

export function parseDriverUncertaintyNote(raw: string): string | null {
  return parseDefinitionText(raw, DRIVER_UNCERTAINTY_NOTE_MAX_LENGTH)
}

function normalizeNoteList(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  const out: string[] = []
  for (const item of raw) {
    if (typeof item !== "string") continue
    const parsed = parseDriverUncertaintyNote(item)
    if (parsed === null) continue
    out.push(parsed)
    if (out.length >= DRIVER_UNCERTAINTY_NOTES_MAX_PER_SIDE) break
  }
  return out
}

/**
 * Normalize structured driver uncertainty notes.
 * Returns undefined when both sides are empty (omit from storage).
 */
export function normalizeDriverUncertaintyNotes(
  raw: DriverUncertaintyNotes | null | undefined | unknown,
): DriverUncertaintyNotes | undefined {
  if (!raw || typeof raw !== "object") return undefined
  const record = raw as Record<string, unknown>
  const lowerOutcome = normalizeNoteList(record.lowerOutcome)
  const higherOutcome = normalizeNoteList(record.higherOutcome)
  if (lowerOutcome.length === 0 && higherOutcome.length === 0) {
    return undefined
  }
  return { lowerOutcome, higherOutcome }
}

export function driverUncertaintyNotesHasContent(
  notes: DriverUncertaintyNotes | null | undefined,
): boolean {
  return normalizeDriverUncertaintyNotes(notes) !== undefined
}

/** Strip optional descriptive fields for stale/sim comparable signatures. */
export function stripRowDefinitions<T extends ScenarioRow>(row: T): ScenarioRow {
  return {
    id: row.id,
    name: row.name,
    optimistic: row.optimistic,
    likely: row.likely,
    pessimistic: row.pessimistic,
  }
}

export function costRowHasDefinition(row: CostElementRow): boolean {
  return typeof row.description === "string" && row.description.trim() !== ""
}

export function driverRowHasDefinition(row: DriverRow): boolean {
  return (
    (typeof row.description === "string" && row.description.trim() !== "") ||
    driverUncertaintyNotesHasContent(row.uncertaintyNotes)
  )
}

/** Normalize optional description fields from storage/share (omit when empty). */
export function normalizeCostRowDefinitions(
  row: CostElementRow,
): CostElementRow {
  const description = parseCostDescription(row.description ?? "")
  if (description === null) {
    if (row.description === undefined) return row
    const { description: _omit, ...rest } = row
    return rest
  }
  return { ...row, description }
}

export function normalizeDriverRowDefinitions(row: DriverRow): DriverRow {
  const description = parseDriverDescription(row.description ?? "")
  const uncertaintyNotes = normalizeDriverUncertaintyNotes(row.uncertaintyNotes)
  const next: DriverRow = {
    id: row.id,
    name: row.name,
    optimistic: row.optimistic,
    likely: row.likely,
    pessimistic: row.pessimistic,
  }
  if (description !== null) next.description = description
  if (uncertaintyNotes !== undefined) next.uncertaintyNotes = uncertaintyNotes
  return next
}

export function withCostDescription(
  row: CostElementRow,
  raw: string,
): CostElementRow {
  const description = parseCostDescription(raw)
  if (description === null) {
    const { description: _omit, ...rest } = row
    return rest
  }
  return { ...row, description }
}

export function withDriverDescription(
  row: DriverRow,
  descriptionRaw: string,
): DriverRow {
  const description = parseDriverDescription(descriptionRaw)
  const uncertaintyNotes = normalizeDriverUncertaintyNotes(row.uncertaintyNotes)
  const next: DriverRow = {
    id: row.id,
    name: row.name,
    optimistic: row.optimistic,
    likely: row.likely,
    pessimistic: row.pessimistic,
  }
  if (description !== null) next.description = description
  if (uncertaintyNotes !== undefined) next.uncertaintyNotes = uncertaintyNotes
  return next
}

/** @deprecated Prefer {@link withDriverDescription}. */
export function withDriverDefinitions(
  row: DriverRow,
  descriptionRaw: string,
  _uncertaintyRaw?: string,
): DriverRow {
  return withDriverDescription(row, descriptionRaw)
}

export function withDriverUncertaintyNotes(
  row: DriverRow,
  notes: DriverUncertaintyNotes | null | undefined,
): DriverRow {
  const uncertaintyNotes = normalizeDriverUncertaintyNotes(notes)
  const next: DriverRow = { ...row }
  if (uncertaintyNotes === undefined) {
    delete next.uncertaintyNotes
  } else {
    next.uncertaintyNotes = uncertaintyNotes
  }
  return next
}
