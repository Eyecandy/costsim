import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import {
  isShapleyCacheEntryValid,
  resolveShapleyProjectStatus,
  shouldAutoRequestShapleyCalculation,
  ShapleyRequestQueue,
  type ShapleyCacheEntry,
  type ShapleyProjectStatus,
} from "@/domain/simulation/lazyShapleyAttribution"
import type { ShapleyAttributionResult } from "@/domain/simulation/shapleyAttribution"
import { shapleyInputSignature } from "@/domain/simulation/shapleyInputSignature"
import {
  buildShapleyWorkerRequest,
  type ShapleyWorkerResponse,
} from "@/domain/simulation/shapleyWorkerMessages"
import {
  getSimulationRunIdForProject,
  simulationRunKeyForProjects,
  type SimulationRunIdByProjectId,
} from "@/domain/simulation/simulationRunId"
import type { Project } from "@/domain/analysis/project"
import { percentile } from "@/domain/simulation/stats"
import type { ProjectResult } from "@/domain/simulation/simulationTypes"
import ShapleyWorker from "@/workers/shapley.worker.ts?worker"

type UseLazyShapleyAttributionArgs = {
  displayProjects: readonly Project[]
  projectResults: readonly ProjectResult[]
  simulationRunIdByProjectId: SimulationRunIdByProjectId
  inputsStale: boolean
}

export function useLazyShapleyAttribution({
  displayProjects,
  projectResults,
  simulationRunIdByProjectId,
  inputsStale,
}: UseLazyShapleyAttributionArgs) {
  const workerRef = useRef<Worker | null>(null)
  const queueRef = useRef(new ShapleyRequestQueue())
  const [cache, setCache] = useState<Record<string, ShapleyCacheEntry>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [calculatingProjectId, setCalculatingProjectId] = useState<string | null>(null)
  const [queueVersion, setQueueVersion] = useState(0)

  const signaturesByProjectId = useMemo(() => {
    const m = new Map<string, string>()
    for (const project of displayProjects) {
      m.set(project.id, shapleyInputSignature(project))
    }
    return m
  }, [displayProjects])

  const simulationRunKey = useMemo(
    () =>
      simulationRunKeyForProjects(
        displayProjects.map((project) => project.id),
        simulationRunIdByProjectId,
      ),
    [displayProjects, simulationRunIdByProjectId],
  )

  const simulationRunIdByProjectIdRef = useRef(simulationRunIdByProjectId)
  const signaturesByProjectIdRef = useRef(signaturesByProjectId)
  simulationRunIdByProjectIdRef.current = simulationRunIdByProjectId
  signaturesByProjectIdRef.current = signaturesByProjectId

  const mainQuantilesByProjectId = useMemo(() => {
    const m = new Map<string, { p50: number | null; p85: number | null }>()
    for (const project of displayProjects) {
      const pr = projectResults.find((r) => r.projectId === project.id)
      if (pr && pr.values.length > 0) {
        m.set(project.id, {
          p50: percentile(pr.values, 50),
          p85: percentile(pr.values, 85),
        })
      } else {
        m.set(project.id, { p50: null, p85: null })
      }
    }
    return m
  }, [displayProjects, projectResults])

  useEffect(() => {
    setCache({})
    setErrors({})
    setCalculatingProjectId(null)
    queueRef.current = new ShapleyRequestQueue()
    workerRef.current?.terminate()
    workerRef.current = null
    setQueueVersion((v) => v + 1)
  }, [simulationRunKey])

  useEffect(() => {
    if (!inputsStale) return
    // Keep cached Contribution for the current simulation run when inputs go
    // stale — do not recompute against unsimulated edits; do not wipe results.
    setCalculatingProjectId(null)
    queueRef.current = new ShapleyRequestQueue()
    workerRef.current?.terminate()
    workerRef.current = null
    setQueueVersion((v) => v + 1)
  }, [inputsStale])

  const pumpQueue = useCallback(() => {
    if (inputsStale) return

    const queue = queueRef.current
    if (queue.getActiveProjectId() !== null) return

    const projectId = queue.startNext()
    if (!projectId) {
      setCalculatingProjectId(null)
      return
    }

    const project = displayProjects.find((p) => p.id === projectId)
    if (!project) {
      queue.complete(projectId)
      setQueueVersion((v) => v + 1)
      return
    }

    const inputSignature = signaturesByProjectId.get(projectId) ?? ""
    const simulationRunId = getSimulationRunIdForProject(projectId, simulationRunIdByProjectId)
    const cached = cache[projectId]
    if (isShapleyCacheEntryValid(cached, inputSignature, simulationRunId)) {
      queue.complete(projectId)
      setQueueVersion((v) => v + 1)
      return
    }

    const mainQuantiles = mainQuantilesByProjectId.get(projectId)
    const request = buildShapleyWorkerRequest(
      project,
      mainQuantiles?.p50 ?? null,
      mainQuantiles?.p85 ?? null,
      simulationRunId,
    )
    if (!request) {
      queue.complete(projectId)
      setErrors((prev) => ({
        ...prev,
        [projectId]: "No valid simulation inputs for Shapley attribution.",
      }))
      setQueueVersion((v) => v + 1)
      return
    }

    if (!workerRef.current) {
      workerRef.current = new ShapleyWorker()
      workerRef.current.onmessage = (e: MessageEvent<ShapleyWorkerResponse>) => {
        const msg = e.data
        if (msg.type !== "shapley") return

        const currentRunId = getSimulationRunIdForProject(
          msg.projectId,
          simulationRunIdByProjectIdRef.current,
        )
        // Drop stale worker responses from a previous simulation run.
        if (!msg.simulationRunId || msg.simulationRunId !== currentRunId) {
          queueRef.current.complete(msg.projectId)
          setCalculatingProjectId(null)
          setQueueVersion((v) => v + 1)
          return
        }

        queueRef.current.complete(msg.projectId)
        setCalculatingProjectId(null)

        if ("error" in msg) {
          setErrors((prev) => ({ ...prev, [msg.projectId]: msg.error }))
        } else {
          setErrors((prev) => {
            const next = { ...prev }
            delete next[msg.projectId]
            return next
          })
          setCache((prev) => ({
            ...prev,
            [msg.projectId]: {
              result: msg.result,
              inputSignature: signaturesByProjectIdRef.current.get(msg.projectId) ?? "",
              simulationRunId: msg.simulationRunId,
            },
          }))
        }

        setQueueVersion((v) => v + 1)
      }
      workerRef.current.onerror = () => {
        const active = queueRef.current.getActiveProjectId()
        if (active) {
          queueRef.current.complete(active)
          setErrors((prev) => ({
            ...prev,
            [active]: "Shapley worker failed.",
          }))
        }
        setCalculatingProjectId(null)
        workerRef.current?.terminate()
        workerRef.current = null
        setQueueVersion((v) => v + 1)
      }
    }

    setCalculatingProjectId(projectId)
    setErrors((prev) => {
      const next = { ...prev }
      delete next[projectId]
      return next
    })
    workerRef.current.postMessage(request)
  }, [
    cache,
    displayProjects,
    inputsStale,
    mainQuantilesByProjectId,
    signaturesByProjectId,
    simulationRunIdByProjectId,
  ])

  useEffect(() => {
    pumpQueue()
  }, [pumpQueue, queueVersion])

  // After a fresh main simulation, auto-start Contribution Analysis once per
  // project that still needs it. Queue dedupe + cache validity prevent repeats.
  useEffect(() => {
    if (inputsStale) return
    if (!simulationRunKey) return

    let enqueued = false
    for (const project of displayProjects) {
      const projectResult = projectResults.find((result) => result.projectId === project.id)
      const inputSignature = signaturesByProjectId.get(project.id) ?? ""
      const simulationRunId = getSimulationRunIdForProject(project.id, simulationRunIdByProjectId)
      if (
        !shouldAutoRequestShapleyCalculation({
          inputsStale,
          hasSimulationValues: (projectResult?.values.length ?? 0) > 0,
          simulationRunId,
          inputSignature,
          cacheEntry: cache[project.id],
          hasError: Boolean(errors[project.id]),
        })
      ) {
        continue
      }
      if (queueRef.current.isQueued(project.id)) continue
      queueRef.current.enqueue(project.id)
      enqueued = true
    }
    if (enqueued) setQueueVersion((v) => v + 1)
  }, [
    cache,
    displayProjects,
    errors,
    inputsStale,
    projectResults,
    signaturesByProjectId,
    simulationRunIdByProjectId,
    simulationRunKey,
  ])

  useEffect(() => {
    return () => {
      workerRef.current?.terminate()
      workerRef.current = null
    }
  }, [])

  const requestCalculation = useCallback(
    (projectId: string) => {
      if (inputsStale) return

      const inputSignature = signaturesByProjectId.get(projectId) ?? ""
      const simulationRunId = getSimulationRunIdForProject(projectId, simulationRunIdByProjectId)
      if (isShapleyCacheEntryValid(cache[projectId], inputSignature, simulationRunId)) {
        return
      }

      setErrors((prev) => {
        const next = { ...prev }
        delete next[projectId]
        return next
      })
      queueRef.current.enqueue(projectId)
      setQueueVersion((v) => v + 1)
    },
    [cache, inputsStale, signaturesByProjectId, simulationRunIdByProjectId],
  )

  const getStatus = useCallback(
    (projectId: string): ShapleyProjectStatus => {
      const inputSignature = signaturesByProjectId.get(projectId) ?? ""
      const simulationRunId = getSimulationRunIdForProject(projectId, simulationRunIdByProjectId)
      const queued = queueRef.current.isQueued(projectId) && calculatingProjectId !== projectId
      if (queued && !errors[projectId]) {
        return "calculating"
      }
      return resolveShapleyProjectStatus(
        projectId,
        inputSignature,
        simulationRunId,
        cache,
        calculatingProjectId,
        errors,
        inputsStale,
      )
    },
    [
      cache,
      calculatingProjectId,
      errors,
      inputsStale,
      signaturesByProjectId,
      simulationRunIdByProjectId,
      queueVersion,
    ],
  )

  const getResult = useCallback(
    (projectId: string): ShapleyAttributionResult | null => {
      const inputSignature = signaturesByProjectId.get(projectId) ?? ""
      const simulationRunId = getSimulationRunIdForProject(projectId, simulationRunIdByProjectId)
      const entry = cache[projectId]
      if (!isShapleyCacheEntryValid(entry, inputSignature, simulationRunId)) {
        return null
      }
      return entry.result
    },
    [cache, signaturesByProjectId, simulationRunIdByProjectId],
  )

  const getError = useCallback(
    (projectId: string): string | null => errors[projectId] ?? null,
    [errors],
  )

  return {
    requestCalculation,
    getStatus,
    getResult,
    getError,
  }
}
