/**
 * After-fix scaling check for Development series (20k × N checkpoints).
 * Asserts one large sort per checkpoint on cold build; cache hits on rebuild.
 */
import { describe, expect, it } from "vitest"

import {
  archiveCheckpoint,
  createInitialOngoingState,
  createNextCheckpoint,
  getLatestCheckpoint,
} from "@/lib/analysisCheckpoint"
import { buildArchivedAnalysisSnapshot } from "@/lib/buildArchivedAnalysisSnapshot"
import { buildOngoingDevelopmentSeries } from "@/lib/ongoingDevelopmentSeries"
import { DEFAULT_RESULT_PREFERENCES } from "@/domain/results/resultPreferences"
import { createBlankWorkspaceRuntimeState } from "@/lib/workspaceReset"
import type { ProjectResult } from "@/simulation.worker"

function makeValues(n: number, seed = 100): number[] {
  const out = new Array<number>(n)
  for (let i = 0; i < n; i++) out[i] = seed + (i % 97) * 0.11
  return out
}

function countLargeSorts(run: () => void, minLength = 1_000): number {
  const orig = Array.prototype.sort
  let sorts = 0
  Array.prototype.sort = function (this: unknown[], compareFn?) {
    if (Array.isArray(this) && this.length >= minLength) sorts += 1
    return orig.call(this, compareFn)
  }
  try {
    run()
  } finally {
    Array.prototype.sort = orig
  }
  return sorts
}

function archiveCp(
  ongoing: ReturnType<typeof createInitialOngoingState>,
  tag: string,
  valuesLength: number,
) {
  const tip = getLatestCheckpoint(ongoing)!
  const projectId = tip.workspace.activeProjectId
  const results: ProjectResult[] = [
    {
      projectId,
      incurredCosts: 0,
      values: makeValues(valuesLength, 100 + tip.sequence),
      inputSeries: [],
    },
  ]
  const snap = buildArchivedAnalysisSnapshot({
    projects: tip.workspace.projects,
    activeProjectId: projectId,
    projectResults: results,
    simulatedBaseCostByProjectId: { [projectId]: 100 + tip.sequence },
    inputSignature: `sig-${tag}`,
    simulationCount: valuesLength,
    resultPreferences: DEFAULT_RESULT_PREFERENCES,
  })
  return archiveCheckpoint(ongoing, tip.id, snap)
}

function buildOngoingWithArchived(count: number, valuesLength: number) {
  const blank = createBlankWorkspaceRuntimeState()
  let ongoing = createInitialOngoingState({
    projects: blank.projects,
    activeProjectId: blank.activeProjectId,
  })
  ongoing = archiveCp(ongoing, "1", valuesLength)
  for (let i = 2; i <= count; i++) {
    const next = createNextCheckpoint(ongoing, { name: `CP${i}` })
    if (!next.ok) throw new Error("createNext")
    ongoing = archiveCp(next.ongoing, String(i), valuesLength)
  }
  return ongoing
}

describe("Development series after-fix scaling", () => {
  it("uses one large sort per checkpoint cold and zero on cached rebuild", () => {
    for (const n of [1, 2, 5]) {
      const ongoing = buildOngoingWithArchived(n, 20_000)
      const coldSorts = countLargeSorts(() => {
        buildOngoingDevelopmentSeries({ checkpoints: ongoing.checkpoints })
      })
      expect(coldSorts).toBe(n)

      const warmSorts = countLargeSorts(() => {
        buildOngoingDevelopmentSeries({ checkpoints: ongoing.checkpoints })
      })
      expect(warmSorts).toBe(0)
    }
  })
})
