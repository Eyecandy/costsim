/**
 * Library analysis name uniqueness within a folder (or root when folderId is null).
 *
 * Comparison: trimmed + case-insensitive.
 * Scope: visible non-trashed analyses only (draft and archived both count).
 */

export const ANALYSIS_NAME_CONFLICT_ERROR = "duplicate_analysis_name" as const
export const ANALYSIS_NAME_CONFLICT_ON_MOVE_ERROR =
  "duplicate_analysis_name_on_move" as const

export type AnalysisNameConflictKind =
  | typeof ANALYSIS_NAME_CONFLICT_ERROR
  | typeof ANALYSIS_NAME_CONFLICT_ON_MOVE_ERROR

/** Trim + lowercase for equality. Empty after trim is never a conflict key. */
export function normalizeAnalysisName(name: string): string {
  return name.trim().toLowerCase()
}

export function sameLibraryFolderId(
  a: string | null | undefined,
  b: string | null | undefined,
): boolean {
  return (a ?? null) === (b ?? null)
}

export type AnalysisNameOccupant = {
  id: string
  name: string
  folderId: string | null
}

/**
 * True when another analysis in the same folder already uses this name
 * (trimmed, case-insensitive). Excludes `excludeId` (rename/move self).
 */
export function hasAnalysisNameConflict(args: {
  name: string
  folderId: string | null
  analyses: readonly AnalysisNameOccupant[]
  /** Analysis being renamed or moved — ignored in the scan. */
  excludeId?: string | null
}): boolean {
  const needle = normalizeAnalysisName(args.name)
  if (!needle) return false
  return args.analyses.some(
    (a) =>
      a.id !== args.excludeId &&
      sameLibraryFolderId(a.folderId, args.folderId) &&
      normalizeAnalysisName(a.name) === needle,
  )
}

export function isAnalysisNameConflictError(error: unknown): boolean {
  return (
    error instanceof Error &&
    (error.message === ANALYSIS_NAME_CONFLICT_ERROR ||
      error.message === ANALYSIS_NAME_CONFLICT_ON_MOVE_ERROR)
  )
}

export function isAnalysisNameConflictOnMoveError(error: unknown): boolean {
  return (
    error instanceof Error &&
    error.message === ANALYSIS_NAME_CONFLICT_ON_MOVE_ERROR
  )
}

export function throwAnalysisNameConflict(
  kind: AnalysisNameConflictKind = ANALYSIS_NAME_CONFLICT_ERROR,
): never {
  throw new Error(kind)
}
