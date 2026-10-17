/**
 * Ephemeral S-curve legend emphasis: click multi-select + hover preview.
 * Presentation only — no simulation / layout side effects.
 */

export const SCURVE_PROJECT_FULL_OPACITY = 1
/** Dimmed enough for emphasis, strong enough not to vanish against guides. */
export const SCURVE_PROJECT_DIM_OPACITY = 0.45

export function toSelectedProjectIdSet(
  selectedProjectIds: ReadonlySet<string> | readonly string[],
): ReadonlySet<string> {
  return selectedProjectIds instanceof Set
    ? selectedProjectIds
    : new Set(selectedProjectIds)
}

/**
 * Effective emphasis set:
 * - no selection → all projects, or only hovered if hovering
 * - with selection → selected ∪ hovered
 */
export function isSCurveProjectEmphasized(
  projectId: string,
  selectedProjectIds: ReadonlySet<string> | readonly string[],
  hoveredProjectId: string | null,
): boolean {
  const selected = toSelectedProjectIdSet(selectedProjectIds)
  if (selected.size === 0) {
    if (hoveredProjectId === null) return true
    return projectId === hoveredProjectId
  }
  if (selected.has(projectId)) return true
  return hoveredProjectId !== null && projectId === hoveredProjectId
}

export function sCurveProjectLayerOpacity(
  projectId: string,
  selectedProjectIds: ReadonlySet<string> | readonly string[],
  hoveredProjectId: string | null,
): number {
  return isSCurveProjectEmphasized(
    projectId,
    selectedProjectIds,
    hoveredProjectId,
  )
    ? SCURVE_PROJECT_FULL_OPACITY
    : SCURVE_PROJECT_DIM_OPACITY
}

/** Immutable toggle for React state (array form). */
export function toggleSelectedProjectId(
  selectedProjectIds: readonly string[],
  projectId: string,
): readonly string[] {
  if (selectedProjectIds.includes(projectId)) {
    return selectedProjectIds.filter((id) => id !== projectId)
  }
  return [...selectedProjectIds, projectId]
}
