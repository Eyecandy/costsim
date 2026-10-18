import type { ArchivedAnalysisSnapshotV1 } from "@/domain/analysis/archivedAnalysisSnapshot"
import type { SingleDraftResultSnapshotV1 } from "@/domain/analysis/singleDraftResultSnapshot"
import type { SingleArchivedResultSnapshotV1 } from "@/domain/analysis/singleArchivedResultSnapshot"
import type { OngoingCheckpointResultSnapshotV1 } from "@/domain/analysis/ongoingCheckpointResultSnapshot"
import type { CheckpointResultSource } from "@/domain/analysis/checkpointComparison"
import type { ResultPreferencesV1 } from "@/domain/results/resultPreferences"
import type { Project } from "@/domain/analysis/project"
import { useMemo } from "react"

import {
  computeDeterministicTornadoRows,
  type DeterministicTornadoRow,
} from "@/domain/simulation/deterministicTornado"
import { compareCheckpoints } from "@/domain/analysis/checkpointComparison"
import { formatCheckpointLegendLabel } from "@/domain/analysis/checkpointComparisonPresentation"
import { listVisibleComparableKeyFigureRowIds } from "@/domain/results/keyFigureVisibility"
import { getProjectColorCssVar } from "@/domain/results/projectColors"
import {
  buildTornadoSharedLayout,
  computeTornadoSharedSymmetricMaxAbs,
} from "@/features/results/tornadoShared"
import { resolveTornadoDisplayScales } from "@/domain/results/formatWaterfallValue"
import { buildOngoingDevelopmentSeries } from "@/domain/analysis/ongoingDevelopmentSeries"
import type { CompactProjectResultV1 } from "@/domain/analysis/compactAnalysisResult"
import type { ResultsPanelProps } from "@/features/results/panel/panelTypes"
import type { useI18n } from "@/i18n/useI18n"

/** Maps, series and tornado layouts the Results sections render, derived from the panel's inputs. */
export function useResultsDerivedData({
  projects,
  simulatedBaseCostByProjectId,
  projectResults,
  useCompactResults,
  useArchivedResults,
  archivedSnapshot,
  singleDraftResult,
  singleArchivedCompact,
  ongoingCompactResult,
  ongoingCheckpoints,
  viewedCheckpointId,
  checkpointComparisonResultSource,
  resultPreferences,
  displayProjects,
  t,
}: {
  projects: ResultsPanelProps["projects"]
  simulatedBaseCostByProjectId: ResultsPanelProps["simulatedBaseCostByProjectId"]
  projectResults: ResultsPanelProps["projectResults"]
  useCompactResults: boolean
  useArchivedResults: boolean
  archivedSnapshot: ArchivedAnalysisSnapshotV1 | null
  singleDraftResult: SingleDraftResultSnapshotV1 | null
  singleArchivedCompact: SingleArchivedResultSnapshotV1 | null
  ongoingCompactResult: OngoingCheckpointResultSnapshotV1 | null
  ongoingCheckpoints: ResultsPanelProps["ongoingCheckpoints"]
  viewedCheckpointId: ResultsPanelProps["viewedCheckpointId"]
  checkpointComparisonResultSource: CheckpointResultSource | null
  resultPreferences: ResultPreferencesV1
  displayProjects: Project[]
  t: ReturnType<typeof useI18n>["t"]
}) {
  const baseCostByProjectId = useMemo(() => {
    const m = new Map<string, number | null>()
    for (const p of projects) {
      m.set(p.id, simulatedBaseCostByProjectId[p.id] ?? null)
    }
    return m
  }, [projects, simulatedBaseCostByProjectId])

  const resultsByProjectId = useMemo(() => {
    return new Map(projectResults.map((r) => [r.projectId, r.values]))
  }, [projectResults])
  const compactResultByProjectId = useMemo(() => {
    const map = new Map<string, CompactProjectResultV1>()
    if (!useCompactResults) return map
    if (singleDraftResult) {
      for (const [projectId, result] of Object.entries(singleDraftResult.byProjectId)) {
        map.set(projectId, result)
      }
    }
    if (singleArchivedCompact) {
      for (const [projectId, result] of Object.entries(singleArchivedCompact.byProjectId)) {
        map.set(projectId, result)
      }
    }
    if (ongoingCompactResult) {
      map.set(ongoingCompactResult.activeProjectId, {
        projectId: ongoingCompactResult.activeProjectId,
        incurredCosts: ongoingCompactResult.incurredCosts,
        simulatedBaseCost: ongoingCompactResult.simulatedBaseCost,
        keyFigures: ongoingCompactResult.keyFigures,
        sCurve: ongoingCompactResult.sCurve,
        tornado: ongoingCompactResult.tornado,
        contribution: ongoingCompactResult.contribution,
      })
    }
    return map
  }, [ongoingCompactResult, singleArchivedCompact, singleDraftResult, useCompactResults])
  const frozenKeyFiguresByProjectId = useMemo(() => {
    const map = new Map()
    for (const [projectId, result] of compactResultByProjectId) {
      map.set(projectId, result.keyFigures)
    }
    return map
  }, [compactResultByProjectId])

  const simulatedIncurredByProjectId = useMemo(() => {
    const map = new Map(projectResults.map((r) => [r.projectId, r.incurredCosts]))
    for (const [projectId, result] of compactResultByProjectId) {
      map.set(projectId, result.incurredCosts)
    }
    return map
  }, [compactResultByProjectId, projectResults])

  const checkpointComparison = useMemo(() => {
    if (!ongoingCheckpoints || !viewedCheckpointId || !checkpointComparisonResultSource) {
      return null
    }
    return compareCheckpoints({
      checkpoints: ongoingCheckpoints,
      viewedCheckpointId,
      viewedResultSource: checkpointComparisonResultSource,
      keyFigureMetricIds: listVisibleComparableKeyFigureRowIds(resultPreferences.keyFigures),
      probabilityBelowAmount: resultPreferences.keyFigures.probabilityBelowCostLevel.amount,
    })
  }, [ongoingCheckpoints, viewedCheckpointId, checkpointComparisonResultSource, resultPreferences])

  /**
   * Live tip source only while viewing a draft checkpoint. Archived navigation
   * must not depend on changing viewed result identity (history is frozen).
   */
  const viewedDraftCheckpointId = useMemo(() => {
    if (!ongoingCheckpoints || !viewedCheckpointId) return null
    const cp = ongoingCheckpoints.find((c) => c.id === viewedCheckpointId)
    return cp?.status === "draft" ? viewedCheckpointId : null
  }, [ongoingCheckpoints, viewedCheckpointId])

  const developmentLiveResultSource = viewedDraftCheckpointId
    ? checkpointComparisonResultSource
    : null

  const developmentSeries = useMemo(() => {
    if (!ongoingCheckpoints || ongoingCheckpoints.length === 0) return null
    return buildOngoingDevelopmentSeries({
      checkpoints: ongoingCheckpoints,
      viewedCheckpointId: viewedDraftCheckpointId,
      viewedResultSource: developmentLiveResultSource,
    })
  }, [ongoingCheckpoints, viewedDraftCheckpointId, developmentLiveResultSource])

  const cdfSeries = useMemo(() => {
    const primary = displayProjects.map((p, i) => ({
      id: p.id,
      label: p.name,
      values: resultsByProjectId.get(p.id) ?? [],
      ...(compactResultByProjectId.has(p.id)
        ? {
            displayPoints: compactResultByProjectId.get(p.id)!.sCurve.points,
            values: undefined,
          }
        : {}),
      colorVar: getProjectColorCssVar(i),
      emphasis: "primary" as const,
    }))
    const previous =
      checkpointComparison?.kind === "comparison"
        ? checkpointComparison.extensions?.sCurve?.previous
        : undefined
    if (
      !previous ||
      ((!previous.values || previous.values.length === 0) &&
        (!previous.displayPoints || previous.displayPoints.length === 0))
    )
      return primary
    return [
      ...primary,
      {
        id: `checkpoint-ref-${previous.checkpointId}`,
        label: formatCheckpointLegendLabel(previous.sequence, t("checkpoints.sequenceLabel")),
        values: previous.values,
        displayPoints: previous.displayPoints,
        colorVar: getProjectColorCssVar(0),
        emphasis: "reference" as const,
      },
    ]
  }, [displayProjects, resultsByProjectId, compactResultByProjectId, checkpointComparison, t])

  const tornadoRowsByProjectId = useMemo(() => {
    const m = new Map<string, DeterministicTornadoRow[]>()
    if (useCompactResults) {
      for (const [projectId, result] of compactResultByProjectId) {
        m.set(projectId, result.tornado ?? [])
      }
      return m
    }
    if (useArchivedResults && archivedSnapshot) {
      for (const p of displayProjects) {
        m.set(p.id, archivedSnapshot.tornadoByProjectId[p.id] ?? [])
      }
      return m
    }
    for (const p of displayProjects) {
      const pr = projectResults.find((r) => r.projectId === p.id)
      m.set(p.id, pr && pr.values.length > 0 ? computeDeterministicTornadoRows(p, 6) : [])
    }
    return m
  }, [
    archivedSnapshot,
    displayProjects,
    projectResults,
    useArchivedResults,
    useCompactResults,
    compactResultByProjectId,
  ])

  const tornadoRowsGroups = useMemo(
    () => displayProjects.map((p) => tornadoRowsByProjectId.get(p.id) ?? []),
    [displayProjects, tornadoRowsByProjectId],
  )
  const tornadoDisplayScales = useMemo(
    () => resolveTornadoDisplayScales(tornadoRowsGroups),
    [tornadoRowsGroups],
  )
  const tornadoDisplayScaleByProjectId = useMemo(() => {
    const m = new Map<string, (typeof tornadoDisplayScales)[number]>()
    displayProjects.forEach((project, index) => {
      const scale = tornadoDisplayScales[index]
      if (scale) m.set(project.id, scale)
    })
    return m
  }, [displayProjects, tornadoDisplayScales])
  const sharedTornadoLayout = useMemo(
    () => buildTornadoSharedLayout(tornadoRowsGroups, tornadoDisplayScales),
    [tornadoRowsGroups, tornadoDisplayScales],
  )
  const sharedTornadoSymmetricMaxAbs = useMemo(
    () => computeTornadoSharedSymmetricMaxAbs(tornadoRowsGroups),
    [tornadoRowsGroups],
  )

  return {
    baseCostByProjectId,
    resultsByProjectId,
    compactResultByProjectId,
    frozenKeyFiguresByProjectId,
    simulatedIncurredByProjectId,
    developmentSeries,
    cdfSeries,
    tornadoRowsByProjectId,
    tornadoDisplayScaleByProjectId,
    sharedTornadoLayout,
    sharedTornadoSymmetricMaxAbs,
  }
}

export type ResultsDerivedData = ReturnType<typeof useResultsDerivedData>
