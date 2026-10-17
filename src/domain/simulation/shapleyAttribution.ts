import {
  applyCholeskyTransform,
  prepareCostCorrelationCholesky,
  sampleStandardNormals,
  standardNormalCdf,
} from "@/domain/simulation/costCorrelation"
import {
  computeTotalFromSampledValues,
  triangularQuantile,
  type DriverImpactMatrix,
  type TriangularParams,
} from "@/domain/simulation/simulation"

export type ShapleyAttributionConfig = {
  /** Randomly sampled player permutations (default 100). */
  permutations: number
  /** Monte Carlo draws per subset P50 evaluation (default 3000). */
  runsPerSubset: number
  /** Permutations per batch when estimating convergence (default 50). */
  convergenceBatchSize: number
}

export const DEFAULT_SHAPLEY_ATTRIBUTION_CONFIG: ShapleyAttributionConfig = {
  permutations: 100,
  runsPerSubset: 3000,
  convergenceBatchSize: 50,
}

export type ShapleyContribution = {
  type: "cost" | "driver"
  id: string
  name: string
  contribution: number
}

export type ShapleyAttributionDecomposition = {
  startValue: number
  endValue: number
  contributions: ShapleyContribution[]
}

export type ShapleyAttributionDiagnostics = {
  permutationsUsed: number
  simulationRunsPerSubset: number
  subsetsEvaluated: number
  cacheHits: number
  calculationTimeMs: number
  /** baseCost + sum(expected contributions) − estimatedP50 (exact apart from float noise). */
  additivityResidual: number
  /** estimatedP50 + sum(reserve contributions) − estimatedP85. */
  reserveAdditivityResidual: number
  estimatedP50FullModel: number
  estimatedP85FullModel: number
  /** Analytical empty coalition P50 (= baseCost). */
  estimatedP50EmptyModel: number
  /** Analytical empty coalition P85 (= baseCost). */
  estimatedP85EmptyModel: number
  /** 3,000-draw full-coalition P50 before main-simulation reconciliation. */
  rawShapleyFullP50: number | null
  /** 3,000-draw full-coalition P85 before main-simulation reconciliation. */
  rawShapleyFullP85: number | null
  /** Main 20,000-run simulation P50 supplied for reconciliation, if any. */
  mainSimulationP50: number | null
  /** Main 20,000-run simulation P85 supplied for reconciliation, if any. */
  mainSimulationP85: number | null
  /** mainSimulationP50 − rawShapleyFullP50 when reconciliation is applied. */
  p50ReconciliationDelta: number | null
  /** mainSimulationP85 − rawShapleyFullP85 when reconciliation is applied. */
  p85ReconciliationDelta: number | null
  /** rawShapleyFullP85 − rawShapleyFullP50 before reconciliation. */
  rawShapleyReserveSpread: number | null
  /** mainSimulationP85 − mainSimulationP50 when both are supplied. */
  mainSimulationReserveSpread: number | null
  /** mainSimulationReserveSpread − rawShapleyReserveSpread for diagnostics. */
  reserveSpreadReconciliationDelta: number | null
  /** Alias of p50ReconciliationDelta for backward compatibility. */
  fullCoalitionReconciliationDelta: number | null
  /** estimatedP50 − mainSimulationP50 when main P50 is supplied. */
  mainSimulationP50Difference: number | null
  /** estimatedP85 − mainSimulationP85 when main P85 is supplied. */
  mainSimulationP85Difference: number | null
  /** How often each player index appears last across sampled permutations. */
  permutationLastPositionCounts: readonly number[] | null
  convergenceMaxAbsDelta: number | null
  convergenceMaxRelativeDelta: number | null
  correlationPrepKind: string
  /** Approximate peak RSS delta during calculation (bytes), when measurable. */
  approximateMemoryBytes: number | null
}

export type ShapleyAttributionResult = {
  baseCost: number
  estimatedP50: number
  estimatedP85: number
  /** P50 − base cost (reconciled when main P50 is supplied). */
  expectedAddition: number
  /** P85 − P50 (reconciled when main P50/P85 are supplied). */
  uncertaintyReserve: number
  /** Expected-addition contributions (alias of expectedAdditionDecomposition.contributions). */
  contributions: ShapleyContribution[]
  expectedAdditionDecomposition: ShapleyAttributionDecomposition
  uncertaintyReserveDecomposition: ShapleyAttributionDecomposition
  diagnostics: ShapleyAttributionDiagnostics
}

export type ShapleyAttributionInput = {
  costTriangles: readonly TriangularParams[]
  costIds: readonly string[]
  costNames: readonly string[]
  drivers: readonly TriangularParams[]
  driverIds: readonly string[]
  driverNames: readonly string[]
  driverImpacts?: DriverImpactMatrix
  costCorrelation?: number[][]
  incurredCosts: number
  config?: Partial<ShapleyAttributionConfig>
  seed?: number
  /** Optional P50 from the main simulation run (different MC budget). */
  mainSimulationP50?: number | null
  /** Optional P85 from the main simulation run (different MC budget). */
  mainSimulationP85?: number | null
}

/** Subset activation bitmask — BigInt avoids signed 32-bit player-index bugs. */
export type PlayerMask = bigint

export const EMPTY_PLAYER_MASK = 0n

export type SubsetQuantiles = {
  p50: number
  p85: number
}

/** Mulberry32 PRNG — fast, seedable, suitable for worker MC. */
export function createSeededRng(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state += 0x6d2b79f5
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function playerBit(playerIndex: number): PlayerMask {
  return 1n << BigInt(playerIndex)
}

export function fullPlayerMask(nPlayers: number): PlayerMask {
  if (nPlayers <= 0) return EMPTY_PLAYER_MASK
  if (nPlayers >= 32) return (1n << 32n) - 1n
  return (1n << BigInt(nPlayers)) - 1n
}

export function maskWithPlayer(mask: PlayerMask, playerIndex: number): PlayerMask {
  return mask | playerBit(playerIndex)
}

export function costActive(mask: PlayerMask, costIndex: number): boolean {
  return (mask & playerBit(costIndex)) !== 0n
}

export function driverActive(
  mask: PlayerMask,
  driverIndex: number,
  nCosts: number,
): boolean {
  return (mask & playerBit(nCosts + driverIndex)) !== 0n
}

function shuffleInPlace(order: number[], rng: () => number): void {
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    const tmp = order[i]!
    order[i] = order[j]!
    order[j] = tmp
  }
}

function pregenerateCostUniforms(
  runs: number,
  choleskyL: readonly (readonly number[])[],
  rng: () => number,
): number[][] {
  const n = choleskyL.length
  const uniforms: number[][] = new Array(runs)
  if (n === 0) return uniforms
  for (let r = 0; r < runs; r++) {
    const eps = sampleStandardNormals(n, rng)
    const z = applyCholeskyTransform(choleskyL, eps)
    const row = new Array<number>(n)
    for (let i = 0; i < n; i++) row[i] = standardNormalCdf(z[i]!)
    uniforms[r] = row
  }
  return uniforms
}

function pregenerateDriverUniforms(
  runs: number,
  nDrivers: number,
  rng: () => number,
): number[][] {
  const uniforms: number[][] = new Array(runs)
  for (let r = 0; r < runs; r++) {
    const row = new Array<number>(nDrivers)
    for (let d = 0; d < nDrivers; d++) row[d] = rng()
    uniforms[r] = row
  }
  return uniforms
}

function quickselectCopy(values: readonly number[], k: number): number {
  const arr = values.slice()
  let lo = 0
  let hi = arr.length - 1
  while (lo < hi) {
    const pivot = arr[(lo + hi) >>> 1]!
    let i = lo
    let j = hi
    while (i <= j) {
      while (arr[i]! < pivot) i++
      while (arr[j]! > pivot) j--
      if (i <= j) {
        const tmp = arr[i]!
        arr[i] = arr[j]!
        arr[j] = tmp
        i++
        j--
      }
    }
    if (k <= j) hi = j
    else if (k >= i) lo = i
    else return arr[k]!
  }
  return arr[k]!
}

/**
 * Linear-interpolation percentile matching `percentile(values, p)` without full sort.
 */
export function percentileOfNumbers(
  values: readonly number[],
  p: number,
): number | null {
  if (!Number.isFinite(p) || p < 0 || p > 100) return null
  const n = values.length
  if (n === 0) return null
  if (n === 1) return values[0]!

  const h = ((n - 1) * p) / 100
  const lo = Math.floor(h)
  const hi = Math.ceil(h)
  const loVal = quickselectCopy(values, lo)
  if (lo === hi) return loVal
  const hiVal = quickselectCopy(values, hi)
  return loVal + (h - lo) * (hiVal - loVal)
}

/** Linear-interpolation P50 matching `percentile(values, 50)` without full sort. */
export function medianOfNumbers(values: readonly number[]): number | null {
  return percentileOfNumbers(values, 50)
}

/** Derive P50 and P85 from the same simulated subset totals. */
export function quantilesFromSampleTotals(
  totals: readonly number[],
): SubsetQuantiles {
  return {
    p50: percentileOfNumbers(totals, 50) ?? NaN,
    p85: percentileOfNumbers(totals, 85) ?? NaN,
  }
}

export function reserveValueFromQuantiles(quantiles: SubsetQuantiles): number {
  return quantiles.p85 - quantiles.p50
}

type ShapleyEngineContext = {
  nCosts: number
  nDrivers: number
  nPlayers: number
  baseCost: number
  costTriangles: readonly TriangularParams[]
  costModes: readonly number[]
  drivers: readonly TriangularParams[]
  driverImpacts: DriverImpactMatrix | undefined
  incurred: number
  runs: number
  costUniforms: number[][]
  driverUniforms: number[][]
  subsetCache: Map<PlayerMask, SubsetQuantiles>
  cacheHits: number
  subsetsEvaluated: number
  totalsBuffer: number[]
}

function computeBaseCost(
  costModes: readonly number[],
  incurredCosts: number,
): number {
  let sum = Number.isFinite(incurredCosts) ? Math.max(0, incurredCosts) : 0
  for (const m of costModes) sum += m
  return sum
}

function evaluateSubsetQuantiles(
  ctx: ShapleyEngineContext,
  mask: PlayerMask,
): SubsetQuantiles {
  const cached = ctx.subsetCache.get(mask)
  if (cached !== undefined) {
    ctx.cacheHits += 1
    return cached
  }

  if (mask === EMPTY_PLAYER_MASK) {
    const entry = { p50: ctx.baseCost, p85: ctx.baseCost }
    ctx.subsetCache.set(mask, entry)
    ctx.subsetsEvaluated += 1
    return entry
  }

  const totals = ctx.totalsBuffer
  for (let r = 0; r < ctx.runs; r++) {
    const costValues = new Array<number>(ctx.nCosts)
    for (let c = 0; c < ctx.nCosts; c++) {
      const tri = ctx.costTriangles[c]!
      if (costActive(mask, c)) {
        const u = ctx.costUniforms[r]?.[c] ?? 0.5
        costValues[c] = triangularQuantile(tri.min, tri.mode, tri.max, u)
      } else {
        costValues[c] = ctx.costModes[c]!
      }
    }

    const driverPctValues = new Array<number>(ctx.nDrivers)
    for (let d = 0; d < ctx.nDrivers; d++) {
      if (driverActive(mask, d, ctx.nCosts)) {
        const tri = ctx.drivers[d]!
        const u = ctx.driverUniforms[r]?.[d] ?? 0.5
        driverPctValues[d] = triangularQuantile(tri.min, tri.mode, tri.max, u)
      } else {
        driverPctValues[d] = 0
      }
    }

    totals[r] = computeTotalFromSampledValues({
      costValues,
      driverPctValues,
      driverImpacts: ctx.driverImpacts,
      incurredCosts: ctx.incurred,
    })
  }

  const entry = quantilesFromSampleTotals(totals)
  ctx.subsetCache.set(mask, entry)
  ctx.subsetsEvaluated += 1
  return entry
}

function readMemoryDeltaBytes(startBytes: number | null): number | null {
  const proc = (
    globalThis as { process?: { memoryUsage?: () => { heapUsed: number } } }
  ).process
  if (startBytes === null || !proc?.memoryUsage) return null
  return proc.memoryUsage().heapUsed - startBytes
}

function buildContributionRows(
  contributions: readonly number[],
  input: Pick<
    ShapleyAttributionInput,
    "costIds" | "costNames" | "driverIds" | "driverNames"
  >,
  nCosts: number,
): ShapleyContribution[] {
  const rows: ShapleyContribution[] = []
  for (let c = 0; c < nCosts; c++) {
    rows.push({
      type: "cost",
      id: input.costIds[c] ?? String(c),
      name: input.costNames[c]?.trim() || `Cost ${c + 1}`,
      contribution: contributions[c]!,
    })
  }
  for (let d = 0; d < input.driverIds.length; d++) {
    const idx = nCosts + d
    rows.push({
      type: "driver",
      id: input.driverIds[d] ?? String(d),
      name: input.driverNames[d]?.trim() || `Driver ${d + 1}`,
      contribution: contributions[idx]!,
    })
  }
  return rows
}

function emptyAttributionDiagnostics(
  config: ShapleyAttributionConfig,
  baseCost: number,
  estimatedP50: number,
  estimatedP85: number,
  mainSimulationP50: number | null,
  mainSimulationP85: number | null,
  correlationPrepKind: string,
): ShapleyAttributionDiagnostics {
  const p50ReconciliationDelta =
    mainSimulationP50 === null ? null : mainSimulationP50 - baseCost
  const p85ReconciliationDelta =
    mainSimulationP85 === null ? null : mainSimulationP85 - baseCost
  const rawShapleyReserveSpread = 0
  const mainSimulationReserveSpread =
    mainSimulationP50 !== null && mainSimulationP85 !== null
      ? mainSimulationP85 - mainSimulationP50
      : null
  const reserveSpreadReconciliationDelta =
    mainSimulationReserveSpread === null
      ? null
      : mainSimulationReserveSpread - rawShapleyReserveSpread

  return {
    permutationsUsed: 0,
    simulationRunsPerSubset: config.runsPerSubset,
    subsetsEvaluated: 0,
    cacheHits: 0,
    calculationTimeMs: 0,
    additivityResidual: 0,
    reserveAdditivityResidual: 0,
    estimatedP50FullModel: estimatedP50,
    estimatedP85FullModel: estimatedP85,
    estimatedP50EmptyModel: baseCost,
    estimatedP85EmptyModel: baseCost,
    rawShapleyFullP50: null,
    rawShapleyFullP85: null,
    mainSimulationP50,
    mainSimulationP85,
    p50ReconciliationDelta,
    p85ReconciliationDelta,
    rawShapleyReserveSpread,
    mainSimulationReserveSpread,
    reserveSpreadReconciliationDelta,
    fullCoalitionReconciliationDelta: p50ReconciliationDelta,
    mainSimulationP50Difference:
      mainSimulationP50 === null ? null : estimatedP50 - mainSimulationP50,
    mainSimulationP85Difference:
      mainSimulationP85 === null ? null : estimatedP85 - mainSimulationP85,
    permutationLastPositionCounts: null,
    convergenceMaxAbsDelta: null,
    convergenceMaxRelativeDelta: null,
    correlationPrepKind,
    approximateMemoryBytes: null,
  }
}

/**
 * Random-permutation Monte Carlo Shapley attribution of:
 * - Expected addition: P50(full) − base cost
 * - Uncertainty reserve: P85(full) − P50(full)
 */
export function computeShapleyAttribution(
  input: ShapleyAttributionInput,
): ShapleyAttributionResult {
  const started = typeof performance !== "undefined" ? performance.now() : Date.now()
  const proc = (
    globalThis as { process?: { memoryUsage?: () => { heapUsed: number } } }
  ).process
  const memoryStart = proc?.memoryUsage?.().heapUsed ?? null

  const config: ShapleyAttributionConfig = {
    ...DEFAULT_SHAPLEY_ATTRIBUTION_CONFIG,
    ...input.config,
  }

  const nCosts = input.costTriangles.length
  const nDrivers = input.drivers.length
  const nPlayers = nCosts + nDrivers
  const incurred = Number.isFinite(input.incurredCosts)
    ? Math.max(0, input.incurredCosts)
    : 0
  const costModes = input.costTriangles.map((t) => t.mode)
  const baseCost = computeBaseCost(costModes, incurred)

  const mainSimulationP50 =
    input.mainSimulationP50 != null &&
    Number.isFinite(input.mainSimulationP50)
      ? input.mainSimulationP50
      : null
  const mainSimulationP85 =
    input.mainSimulationP85 != null &&
    Number.isFinite(input.mainSimulationP85)
      ? input.mainSimulationP85
      : null

  if (nPlayers === 0) {
    const estimatedP50 = mainSimulationP50 ?? baseCost
    const estimatedP85 = mainSimulationP85 ?? baseCost
    const expectedAddition = estimatedP50 - baseCost
    const uncertaintyReserve = estimatedP85 - estimatedP50
    const emptyDecomposition: ShapleyAttributionDecomposition = {
      startValue: baseCost,
      endValue: estimatedP50,
      contributions: [],
    }
    const reserveDecomposition: ShapleyAttributionDecomposition = {
      startValue: estimatedP50,
      endValue: estimatedP85,
      contributions: [],
    }
    return {
      baseCost,
      estimatedP50,
      estimatedP85,
      expectedAddition,
      uncertaintyReserve,
      contributions: [],
      expectedAdditionDecomposition: emptyDecomposition,
      uncertaintyReserveDecomposition: reserveDecomposition,
      diagnostics: emptyAttributionDiagnostics(
        config,
        baseCost,
        estimatedP50,
        estimatedP85,
        mainSimulationP50,
        mainSimulationP85,
        "none",
      ),
    }
  }

  const rng = createSeededRng(input.seed ?? 0x5a4e_1e00)
  const correlationPrep = prepareCostCorrelationCholesky(
    input.costCorrelation === undefined
      ? undefined
      : input.costCorrelation,
    nCosts,
  )

  const ctx: ShapleyEngineContext = {
    nCosts,
    nDrivers,
    nPlayers,
    baseCost,
    costTriangles: input.costTriangles,
    costModes,
    drivers: input.drivers,
    driverImpacts: input.driverImpacts,
    incurred,
    runs: config.runsPerSubset,
    costUniforms: pregenerateCostUniforms(
      config.runsPerSubset,
      correlationPrep.choleskyL,
      rng,
    ),
    driverUniforms: pregenerateDriverUniforms(
      config.runsPerSubset,
      nDrivers,
      rng,
    ),
    subsetCache: new Map(),
    cacheHits: 0,
    subsetsEvaluated: 0,
    totalsBuffer: new Array<number>(config.runsPerSubset),
  }

  const fullMask = fullPlayerMask(nPlayers)

  const emptyQuantiles = evaluateSubsetQuantiles(ctx, EMPTY_PLAYER_MASK)
  const estimatedP50EmptyModel = emptyQuantiles.p50
  const estimatedP85EmptyModel = emptyQuantiles.p85

  const rawFullQuantiles = evaluateSubsetQuantiles(ctx, fullMask)
  const rawShapleyFullP50 = rawFullQuantiles.p50
  const rawShapleyFullP85 = rawFullQuantiles.p85
  const rawShapleyReserveSpread = rawShapleyFullP85 - rawShapleyFullP50

  let estimatedP50FullModel = rawShapleyFullP50
  let estimatedP85FullModel = rawShapleyFullP85
  let p50ReconciliationDelta: number | null = null
  let p85ReconciliationDelta: number | null = null

  if (mainSimulationP50 !== null || mainSimulationP85 !== null) {
    const pinned: SubsetQuantiles = {
      p50: mainSimulationP50 ?? rawShapleyFullP50,
      p85: mainSimulationP85 ?? rawShapleyFullP85,
    }
    ctx.subsetCache.set(fullMask, pinned)
    if (mainSimulationP50 !== null) {
      p50ReconciliationDelta = mainSimulationP50 - rawShapleyFullP50
      estimatedP50FullModel = mainSimulationP50
    }
    if (mainSimulationP85 !== null) {
      p85ReconciliationDelta = mainSimulationP85 - rawShapleyFullP85
      estimatedP85FullModel = mainSimulationP85
    }
  }

  const mainSimulationReserveSpread =
    mainSimulationP50 !== null && mainSimulationP85 !== null
      ? mainSimulationP85 - mainSimulationP50
      : null
  const reserveSpreadReconciliationDelta =
    mainSimulationReserveSpread === null
      ? null
      : mainSimulationReserveSpread - rawShapleyReserveSpread

  const expectedContributions = new Array<number>(nPlayers).fill(0)
  const reserveContributions = new Array<number>(nPlayers).fill(0)
  const lastPositionCounts = new Array<number>(nPlayers).fill(0)
  const batchSize = Math.min(
    config.convergenceBatchSize,
    Math.max(1, Math.floor(config.permutations / 2)),
  )
  const batch1 = new Array<number>(nPlayers).fill(0)
  const batch2 = new Array<number>(nPlayers).fill(0)
  let batch1Count = 0
  let batch2Count = 0

  const playerOrder = Array.from({ length: nPlayers }, (_, i) => i)

  for (let p = 0; p < config.permutations; p++) {
    shuffleInPlace(playerOrder, rng)
    let mask = EMPTY_PLAYER_MASK
    let prevP50 = estimatedP50EmptyModel
    let prevReserve = reserveValueFromQuantiles(emptyQuantiles)

    for (let step = 0; step < nPlayers; step++) {
      const player = playerOrder[step]!
      mask = maskWithPlayer(mask, player)
      const quantiles = evaluateSubsetQuantiles(ctx, mask)
      const nextP50 = quantiles.p50
      const nextReserve = reserveValueFromQuantiles(quantiles)
      const expectedMarginal = nextP50 - prevP50
      const reserveMarginal = nextReserve - prevReserve
      expectedContributions[player]! += expectedMarginal
      reserveContributions[player]! += reserveMarginal
      if (p < batchSize) batch1[player]! += expectedMarginal
      else batch2[player]! += expectedMarginal
      prevP50 = nextP50
      prevReserve = nextReserve
      if (step === nPlayers - 1) {
        lastPositionCounts[player]! += 1
      }
    }

    if (p < batchSize) batch1Count += 1
    else batch2Count += 1
  }

  for (let i = 0; i < nPlayers; i++) {
    expectedContributions[i] = expectedContributions[i]! / config.permutations
    reserveContributions[i] = reserveContributions[i]! / config.permutations
  }

  let convergenceMaxAbsDelta: number | null = null
  let convergenceMaxRelativeDelta: number | null = null
  if (batch1Count > 0 && batch2Count > 0) {
    convergenceMaxAbsDelta = 0
    convergenceMaxRelativeDelta = 0
    for (let i = 0; i < nPlayers; i++) {
      const mean1 = batch1[i]! / batch1Count
      const mean2 = batch2[i]! / batch2Count
      const absDelta = Math.abs(mean2 - mean1)
      convergenceMaxAbsDelta = Math.max(convergenceMaxAbsDelta, absDelta)
      const scale = Math.max(Math.abs(mean1), Math.abs(mean2), 1e-9)
      convergenceMaxRelativeDelta = Math.max(
        convergenceMaxRelativeDelta,
        absDelta / scale,
      )
    }
  }

  const expectedContributionRows = buildContributionRows(
    expectedContributions,
    input,
    nCosts,
  )
  const reserveContributionRows = buildContributionRows(
    reserveContributions,
    input,
    nCosts,
  )

  const expectedContributionSum = expectedContributionRows.reduce(
    (acc, row) => acc + row.contribution,
    0,
  )
  const reserveContributionSum = reserveContributionRows.reduce(
    (acc, row) => acc + row.contribution,
    0,
  )
  const additivityResidual =
    baseCost + expectedContributionSum - estimatedP50FullModel
  const reserveAdditivityResidual =
    estimatedP50FullModel + reserveContributionSum - estimatedP85FullModel
  const expectedAddition = estimatedP50FullModel - baseCost
  const uncertaintyReserve = estimatedP85FullModel - estimatedP50FullModel
  const mainSimulationP50Difference =
    mainSimulationP50 === null
      ? null
      : estimatedP50FullModel - mainSimulationP50
  const mainSimulationP85Difference =
    mainSimulationP85 === null
      ? null
      : estimatedP85FullModel - mainSimulationP85

  const finished =
    typeof performance !== "undefined" ? performance.now() : Date.now()

  const expectedAdditionDecomposition: ShapleyAttributionDecomposition = {
    startValue: baseCost,
    endValue: estimatedP50FullModel,
    contributions: expectedContributionRows,
  }
  const uncertaintyReserveDecomposition: ShapleyAttributionDecomposition = {
    startValue: estimatedP50FullModel,
    endValue: estimatedP85FullModel,
    contributions: reserveContributionRows,
  }

  return {
    baseCost,
    estimatedP50: estimatedP50FullModel,
    estimatedP85: estimatedP85FullModel,
    expectedAddition,
    uncertaintyReserve,
    contributions: expectedContributionRows,
    expectedAdditionDecomposition,
    uncertaintyReserveDecomposition,
    diagnostics: {
      permutationsUsed: config.permutations,
      simulationRunsPerSubset: config.runsPerSubset,
      subsetsEvaluated: ctx.subsetsEvaluated,
      cacheHits: ctx.cacheHits,
      calculationTimeMs: finished - started,
      additivityResidual,
      reserveAdditivityResidual,
      estimatedP50FullModel,
      estimatedP85FullModel,
      estimatedP50EmptyModel,
      estimatedP85EmptyModel,
      rawShapleyFullP50,
      rawShapleyFullP85,
      mainSimulationP50,
      mainSimulationP85,
      p50ReconciliationDelta,
      p85ReconciliationDelta,
      rawShapleyReserveSpread,
      mainSimulationReserveSpread,
      reserveSpreadReconciliationDelta,
      fullCoalitionReconciliationDelta: p50ReconciliationDelta,
      mainSimulationP50Difference,
      mainSimulationP85Difference,
      permutationLastPositionCounts: [...lastPositionCounts],
      convergenceMaxAbsDelta,
      convergenceMaxRelativeDelta,
      correlationPrepKind: correlationPrep.status.kind,
      approximateMemoryBytes: readMemoryDeltaBytes(memoryStart),
    },
  }
}
