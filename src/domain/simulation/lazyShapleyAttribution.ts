import type { ShapleyAttributionResult } from "@/domain/simulation/shapleyAttribution"

export type ShapleyProjectStatus = "idle" | "calculating" | "ready" | "error"

export type ShapleyCacheEntry = {
  result: ShapleyAttributionResult
  inputSignature: string
  simulationRunId: string
}

export function isShapleyCacheEntryValid(
  entry: ShapleyCacheEntry | undefined,
  inputSignature: string,
  simulationRunId: string,
): entry is ShapleyCacheEntry {
  if (!entry) return false
  if (simulationRunId === "") return false
  return entry.inputSignature === inputSignature && entry.simulationRunId === simulationRunId
}

export function resolveShapleyProjectStatus(
  projectId: string,
  inputSignature: string,
  simulationRunId: string,
  cache: Readonly<Record<string, ShapleyCacheEntry>>,
  calculatingProjectId: string | null,
  errorProjectIds: Readonly<Record<string, string>>,
  inputsStale: boolean,
): ShapleyProjectStatus {
  if (errorProjectIds[projectId]) return "error"
  if (calculatingProjectId === projectId) return "calculating"
  if (isShapleyCacheEntryValid(cache[projectId], inputSignature, simulationRunId)) {
    return "ready"
  }
  // Stale live inputs: keep showing a ready cache above; otherwise idle (no recalc).
  if (inputsStale) return "idle"
  return "idle"
}

/** Whether a fresh simulation should auto-enqueue Contribution Analysis. */
export function shouldAutoRequestShapleyCalculation(input: {
  inputsStale: boolean
  hasSimulationValues: boolean
  simulationRunId: string
  inputSignature: string
  cacheEntry: ShapleyCacheEntry | undefined
  hasError: boolean
}): boolean {
  if (input.inputsStale) return false
  if (!input.hasSimulationValues) return false
  if (!input.simulationRunId) return false
  if (input.hasError) return false
  if (isShapleyCacheEntryValid(input.cacheEntry, input.inputSignature, input.simulationRunId)) {
    return false
  }
  return true
}

/** Sequential queue — one project id at a time, no duplicates. */
export class ShapleyRequestQueue {
  private readonly pending: string[] = []
  private active: string | null = null

  enqueue(projectId: string): void {
    if (this.active === projectId || this.pending.includes(projectId)) return
    this.pending.push(projectId)
  }

  startNext(): string | null {
    if (this.active !== null) return null
    const next = this.pending.shift() ?? null
    this.active = next
    return next
  }

  complete(projectId: string): void {
    if (this.active === projectId) this.active = null
  }

  remove(projectId: string): void {
    if (this.active === projectId) this.active = null
    const idx = this.pending.indexOf(projectId)
    if (idx >= 0) this.pending.splice(idx, 1)
  }

  getActiveProjectId(): string | null {
    return this.active
  }

  isQueued(projectId: string): boolean {
    return this.active === projectId || this.pending.includes(projectId)
  }
}
