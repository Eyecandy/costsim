import { useCallback, useEffect, useMemo, type Dispatch, type SetStateAction } from "react"
import { deriveSavedCorrelationSummaries } from "@/domain/simulation/costCorrelationSummaries"
import {
  patchProjectCostCorrelationGroup,
  isCostCorrelationGroupPatchValid,
  type Project,
} from "@/domain/analysis/project"
import { parseCostForSimulation } from "@/domain/results/tableRows"
import type { useGuidedFocusState } from "@/app/workspace/useGuidedFocusState"

type GuidedFocusState = ReturnType<typeof useGuidedFocusState>

/** Selecting cost rows, editing and saving/removing correlation groups in Correlation mode. */
export function useCorrelationGroupEditing({
  activeProject,
  analysisReadOnly,
  clearCorrelationEditingState,
  clearCorrelationSaveConfirm,
  flashCorrelationFeedback,
  guidedFocusState,
  setProjects,
  syncCorrelationPendingFromSelection,
}: {
  activeProject: Project | null
  analysisReadOnly: boolean
  clearCorrelationEditingState: () => void
  clearCorrelationSaveConfirm: () => void
  flashCorrelationFeedback: (kind: "saved" | "removed") => void
  guidedFocusState: GuidedFocusState
  setProjects: Dispatch<SetStateAction<Project[]>>
  syncCorrelationPendingFromSelection: (
    selectedIds: readonly string[],
    correlations: Project["costCorrelations"],
  ) => void
}) {
  const {
    correlationModeActive,
    correlationPendingMixed,
    correlationPendingRho,
    correlationSelectedCostIds,
    setCorrelationEditBlocked,
    setCorrelationPendingMixed,
    setCorrelationPendingRho,
    setCorrelationSelectedCostIds,
  } = guidedFocusState

  const validSimCostRows = useMemo(() => {
    if (!activeProject) return []
    return activeProject.costRows.filter((row) => parseCostForSimulation(row) !== null)
  }, [activeProject])

  useEffect(() => {
    if (!correlationModeActive || !activeProject) return
    const validIds = new Set(
      activeProject.costRows
        .filter((row) => parseCostForSimulation(row) !== null)
        .map((row) => row.id),
    )
    setCorrelationSelectedCostIds((prev) => {
      const next = prev.filter((id) => validIds.has(id))
      if (next.length === prev.length && next.every((id, i) => id === prev[i])) {
        return prev
      }
      syncCorrelationPendingFromSelection(next, activeProject.costCorrelations)
      return next
    })
  }, [
    correlationModeActive,
    activeProject,
    syncCorrelationPendingFromSelection,
    setCorrelationSelectedCostIds,
  ])

  const handleToggleCorrelationCost = useCallback(
    (costRowId: string) => {
      if (!correlationModeActive || !activeProject) return
      if (activeProject.costRows.find((r) => r.id === costRowId) === undefined) {
        return
      }
      if (
        parseCostForSimulation(activeProject.costRows.find((r) => r.id === costRowId)!) === null
      ) {
        return
      }
      setCorrelationSelectedCostIds((prev) => {
        const next = prev.includes(costRowId)
          ? prev.filter((id) => id !== costRowId)
          : [...prev, costRowId]
        syncCorrelationPendingFromSelection(next, activeProject.costCorrelations)
        setCorrelationEditBlocked(false)
        return next
      })
    },
    [
      correlationModeActive,
      activeProject,
      syncCorrelationPendingFromSelection,
      setCorrelationEditBlocked,
      setCorrelationSelectedCostIds,
    ],
  )

  const handleCorrelationPendingChange = useCallback(
    (value: number) => {
      setCorrelationPendingRho(value)
      setCorrelationPendingMixed(false)
      setCorrelationEditBlocked(false)
    },
    [setCorrelationEditBlocked, setCorrelationPendingMixed, setCorrelationPendingRho],
  )

  const handleOpenCorrelationSummary = useCallback(
    (rowIds: readonly string[]) => {
      if (!correlationModeActive || !activeProject) return
      const validIds = new Set(
        activeProject.costRows
          .filter((row) => parseCostForSimulation(row) !== null)
          .map((row) => row.id),
      )
      const next = rowIds.filter((id) => validIds.has(id))
      if (next.length < 2) return
      setCorrelationSelectedCostIds(next)
      syncCorrelationPendingFromSelection(next, activeProject.costCorrelations)
      setCorrelationEditBlocked(false)
      clearCorrelationSaveConfirm()
    },
    [
      correlationModeActive,
      activeProject,
      syncCorrelationPendingFromSelection,
      clearCorrelationSaveConfirm,
      setCorrelationEditBlocked,
      setCorrelationSelectedCostIds,
    ],
  )

  const handleRemoveCorrelationSummary = useCallback(
    (rowIds: readonly string[]) => {
      if (analysisReadOnly) return
      if (!correlationModeActive || !activeProject) return
      if (rowIds.length < 2) return
      if (
        !isCostCorrelationGroupPatchValid(
          validSimCostRows,
          activeProject.costCorrelations,
          rowIds,
          "0",
        )
      ) {
        setCorrelationEditBlocked(true)
        return
      }
      setCorrelationEditBlocked(false)
      setProjects((prev) => patchProjectCostCorrelationGroup(prev, activeProject.id, rowIds, "0"))
      clearCorrelationEditingState()
      flashCorrelationFeedback("removed")
    },
    [
      analysisReadOnly,
      correlationModeActive,
      activeProject,
      validSimCostRows,
      clearCorrelationEditingState,
      flashCorrelationFeedback,
      setCorrelationEditBlocked,
      setProjects,
    ],
  )

  const handleCostCorrelationGroupApply = useCallback(() => {
    if (analysisReadOnly) return
    if (!activeProject) return
    if (correlationSelectedCostIds.length < 2) return
    if (correlationPendingMixed) return
    const raw = String(correlationPendingRho)
    if (
      !isCostCorrelationGroupPatchValid(
        validSimCostRows,
        activeProject.costCorrelations,
        correlationSelectedCostIds,
        raw,
      )
    ) {
      setCorrelationEditBlocked(true)
      return
    }
    setCorrelationEditBlocked(false)
    setProjects((prev) =>
      patchProjectCostCorrelationGroup(prev, activeProject.id, correlationSelectedCostIds, raw),
    )
    clearCorrelationEditingState()
    flashCorrelationFeedback("saved")
  }, [
    analysisReadOnly,
    activeProject,
    correlationSelectedCostIds,
    correlationPendingRho,
    correlationPendingMixed,
    validSimCostRows,
    clearCorrelationEditingState,
    flashCorrelationFeedback,
    setCorrelationEditBlocked,
    setProjects,
  ])

  const savedCorrelationSummaries = useMemo(() => {
    if (!correlationModeActive || !activeProject) return []
    return deriveSavedCorrelationSummaries(validSimCostRows, activeProject.costCorrelations)
  }, [correlationModeActive, activeProject, validSimCostRows])

  return {
    handleCostCorrelationGroupApply,
    handleCorrelationPendingChange,
    handleOpenCorrelationSummary,
    handleRemoveCorrelationSummary,
    handleToggleCorrelationCost,
    savedCorrelationSummaries,
  }
}
