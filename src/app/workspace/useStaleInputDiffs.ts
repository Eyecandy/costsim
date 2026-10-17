import { useMemo } from "react"
import type { Project } from "@/domain/analysis/project"
import {
  isMeaningfullyFilledRow,
  invalidCostRowCellKeys,
  invalidDriverRowCellKeys,
  parseCostForSimulation,
  parseDriverForSimulation,
} from "@/domain/results/tableRows"
import {
  changedCostTableCellKeySet,
  changedDriverImpactCellKeySet,
  changedScenarioCellKeySet,
} from "@/domain/analysis/simInputSnapshotDiff"
import {
  EMPTY_STALE_CELL_KEYS,
  projectHasMeaningfulTableInput,
} from "@/app/workspace/workspaceHelpers"

export function useStaleInputDiffs({
  projects,
  activeProjectId,
  lastSimulatedProjects,
  liveResultValidity,
  showStaleInputChanges,
}: {
  projects: Project[]
  activeProjectId: string
  lastSimulatedProjects: Project[]
  liveResultValidity: { kind: string }
  showStaleInputChanges: boolean
}) {
  const staleProjectNameTabIds = useMemo(() => {
    const out = new Set<string>()
    if (lastSimulatedProjects.length === 0) {
      return out
    }
    const nameById = new Map(lastSimulatedProjects.map((p) => [p.id, p.name]))
    for (const p of projects) {
      const baseName = nameById.get(p.id)
      if (baseName !== undefined && p.name !== baseName) {
        out.add(p.id)
      }
    }
    return out
  }, [projects, lastSimulatedProjects])

  const staleInputChangedCellKeys = useMemo(() => {
    // Green-cell / Undo baseline is lastSimulatedProjects (including after
    // compact draft reload). Do not require live projectResults arrays.
    if (
      lastSimulatedProjects.length === 0 ||
      liveResultValidity.kind !== "stale"
    ) {
      return {
        cost: EMPTY_STALE_CELL_KEYS,
        drivers: EMPTY_STALE_CELL_KEYS,
        driverImpacts: EMPTY_STALE_CELL_KEYS,
      }
    }
    const baseline = lastSimulatedProjects
    const proj = projects.find((p) => p.id === activeProjectId)
    if (!proj || !projectHasMeaningfulTableInput(proj)) {
      return {
        cost: EMPTY_STALE_CELL_KEYS,
        drivers: EMPTY_STALE_CELL_KEYS,
        driverImpacts: EMPTY_STALE_CELL_KEYS,
      }
    }
    const baseProj = baseline.find((p) => p.id === activeProjectId)
    return {
      cost: changedCostTableCellKeySet(
        { costRows: proj.costRows, incurredCosts: proj.incurredCosts },
        baseProj
          ? { costRows: baseProj.costRows, incurredCosts: baseProj.incurredCosts }
          : undefined,
      ),
      drivers: changedScenarioCellKeySet(proj.driverRows, baseProj?.driverRows),
      driverImpacts: changedDriverImpactCellKeySet(
        {
          driverImpacts: proj.driverImpacts,
          costRows: proj.costRows,
          driverRows: proj.driverRows,
        },
        baseProj
          ? {
              driverImpacts: baseProj.driverImpacts,
              costRows: baseProj.costRows,
              driverRows: baseProj.driverRows,
            }
          : undefined,
      ),
    }
  }, [
    projects,
    activeProjectId,
    lastSimulatedProjects,
    liveResultValidity.kind,
  ])

  /** Presentation gate over existing changed-cell sets (same comparison, opt-in green). */
  const visibleStaleChangedCellKeys = useMemo(() => {
    if (!showStaleInputChanges) {
      return {
        cost: EMPTY_STALE_CELL_KEYS,
        drivers: EMPTY_STALE_CELL_KEYS,
        driverImpacts: EMPTY_STALE_CELL_KEYS,
      }
    }
    return staleInputChangedCellKeys
  }, [showStaleInputChanges, staleInputChangedCellKeys])

  const validationInvalidCellKeys = useMemo(() => {
    const proj = projects.find((p) => p.id === activeProjectId)
    if (!proj) {
      return {
        cost: EMPTY_STALE_CELL_KEYS,
        drivers: EMPTY_STALE_CELL_KEYS,
        driverImpacts: EMPTY_STALE_CELL_KEYS,
      }
    }
    const cost = new Set<string>()
    const drivers = new Set<string>()
    for (const row of proj.costRows) {
      if (isMeaningfullyFilledRow(row) && parseCostForSimulation(row) === null) {
        for (const key of invalidCostRowCellKeys(row)) cost.add(key)
      }
    }
    for (const row of proj.driverRows) {
      if (isMeaningfullyFilledRow(row) && parseDriverForSimulation(row) === null) {
        for (const key of invalidDriverRowCellKeys(row)) drivers.add(key)
      }
    }
    return { cost, drivers }
  }, [projects, activeProjectId])

  return {
    staleProjectNameTabIds,
    visibleStaleChangedCellKeys,
    validationInvalidCellKeys,
  }
}
