import type { ProjectResult } from "@/domain/simulation/simulationTypes"
import LZString from "lz-string"

import { decodeShareV1FromHash, isShareV2Hash, isShareV2Search } from "@/persistence/shareLink"
import { parseProjectsPayload } from "@/domain/analysis/projectsPayload"
import { STORAGE_KEYS } from "@/persistence/storage"

export const LAST_SIMULATION_SNAPSHOT_VERSION = 1 as const

/**
 * Single persisted blob after a successful simulation run.
 * `inputSignature` is the canonical analytical simulation signature for that run.
 */
export type LastSimulationSnapshotV1 = {
  v: typeof LAST_SIMULATION_SNAPSHOT_VERSION
  inputSignature: string
  projectResults: ProjectResult[]
  simulatedBaseCostByProjectId: Record<string, number | null>
  activeProjectIdAtRun: string
}

function toStorageSlimProjectResults(projectResults: readonly ProjectResult[]): ProjectResult[] {
  // Keep total-result samples (key metrics / s-curve), but drop heavy per-factor samples.
  return projectResults.map((pr) => ({
    ...pr,
    inputSeries: pr.inputSeries.map((s) => ({ ...s, values: [] })),
  }))
}

function isSimulationInputSeriesItem(x: unknown): boolean {
  if (typeof x !== "object" || x === null) return false
  const o = x as Record<string, unknown>
  if (typeof o.name !== "string") return false
  if (o.type !== "cost" && o.type !== "driver") return false
  if (!Array.isArray(o.values)) return false
  return o.values.every((v) => typeof v === "number" && Number.isFinite(v))
}

function isProjectResult(x: unknown): x is ProjectResult {
  if (typeof x !== "object" || x === null) return false
  const o = x as Record<string, unknown>
  if (typeof o.projectId !== "string") return false
  if (!Array.isArray(o.values)) return false
  if (!o.values.every((v) => typeof v === "number" && Number.isFinite(v))) {
    return false
  }
  if (!Array.isArray(o.inputSeries)) return false
  return o.inputSeries.every(isSimulationInputSeriesItem)
}

function isBaseCostMap(x: unknown): x is Record<string, number | null> {
  if (typeof x !== "object" || x === null) return false
  for (const v of Object.values(x)) {
    if (v !== null && (typeof v !== "number" || !Number.isFinite(v))) return false
  }
  return true
}

export function parseLastSimulationSnapshot(raw: unknown): LastSimulationSnapshotV1 | null {
  if (typeof raw !== "object" || raw === null) return null
  const o = raw as Record<string, unknown>
  if (o.v !== LAST_SIMULATION_SNAPSHOT_VERSION) return null
  if (typeof o.inputSignature !== "string" || o.inputSignature.trim() === "") return null
  let parsedSig: unknown
  try {
    parsedSig = JSON.parse(o.inputSignature)
  } catch {
    return null
  }
  if (parseProjectsPayload(parsedSig) === null) return null
  if (!Array.isArray(o.projectResults) || !o.projectResults.every(isProjectResult)) {
    return null
  }
  if (!isBaseCostMap(o.simulatedBaseCostByProjectId)) return null
  if (typeof o.activeProjectIdAtRun !== "string") return null
  return {
    v: LAST_SIMULATION_SNAPSHOT_VERSION,
    inputSignature: o.inputSignature,
    projectResults: o.projectResults,
    simulatedBaseCostByProjectId: o.simulatedBaseCostByProjectId,
    activeProjectIdAtRun: o.activeProjectIdAtRun,
  }
}

export function loadLastSimulationSnapshotFromStorage(): LastSimulationSnapshotV1 | null {
  try {
    if (typeof localStorage === "undefined") return null
    const item = localStorage.getItem(STORAGE_KEYS.lastSimulationSnapshot)
    if (item === null || item.trim() === "") return null
    let raw: unknown
    const decompressed = LZString.decompressFromUTF16(item)
    if (decompressed != null && decompressed !== "") {
      try {
        raw = JSON.parse(decompressed)
      } catch {
        raw = undefined
      }
    }
    if (raw === undefined) {
      try {
        raw = JSON.parse(item)
      } catch {
        return null
      }
    }
    return parseLastSimulationSnapshot(raw)
  } catch {
    return null
  }
}

export function persistLastSimulationSnapshot(snapshot: LastSimulationSnapshotV1): void {
  try {
    if (typeof localStorage === "undefined") return
    const writeCompressed = (value: LastSimulationSnapshotV1) => {
      const json = JSON.stringify(value)
      const compressed = LZString.compressToUTF16(json)
      if (compressed === null || compressed === "") return false
      localStorage.setItem(STORAGE_KEYS.lastSimulationSnapshot, compressed)
      return true
    }
    try {
      if (writeCompressed(snapshot)) return
    } catch {
      // Fall back to slim snapshot below.
    }
    const slim: LastSimulationSnapshotV1 = {
      ...snapshot,
      projectResults: toStorageSlimProjectResults(snapshot.projectResults),
    }
    writeCompressed(slim)
  } catch {
    /* quota / private mode — same as saveToStorage */
  }
}

function shouldRestoreSimulationSnapshotOnInitialLoad(): boolean {
  if (typeof window === "undefined") return false
  const s = window.location.search
  const h = window.location.hash
  // Library-backed analyses own their results — do not hydrate legacy device snapshot.
  if (new URLSearchParams(s).get("analysis")) return false
  if (decodeShareV1FromHash(h) !== null) return false
  if (isShareV2Search(s)) return false
  if (isShareV2Hash(h)) return false
  return true
}

export type InitialRestoredSimulationState = {
  projectResults: ProjectResult[]
  simulatedBaseCostByProjectId: Record<string, number | null>
  lastSimulatedInputSignature: string
}

let initialRestoredCache: InitialRestoredSimulationState | undefined

export function getInitialRestoredSimulationState(): InitialRestoredSimulationState {
  if (initialRestoredCache) return initialRestoredCache
  const empty: InitialRestoredSimulationState = {
    projectResults: [],
    simulatedBaseCostByProjectId: {},
    lastSimulatedInputSignature: "",
  }
  if (typeof window === "undefined") {
    initialRestoredCache = empty
    return empty
  }
  if (!shouldRestoreSimulationSnapshotOnInitialLoad()) {
    initialRestoredCache = empty
    return empty
  }
  const snap = loadLastSimulationSnapshotFromStorage()
  if (!snap) {
    initialRestoredCache = empty
    return empty
  }
  initialRestoredCache = {
    projectResults: snap.projectResults,
    simulatedBaseCostByProjectId: snap.simulatedBaseCostByProjectId,
    lastSimulatedInputSignature: snap.inputSignature,
  }
  return initialRestoredCache
}

/** Clears cached restore state so the next read reflects storage (e.g. after removing the snapshot key). */
export function resetInitialRestoredSimulationCache(): void {
  initialRestoredCache = undefined
}
