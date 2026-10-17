import { parseNumberField } from "@/domain/results/numberField"

/** How a cost-item correlation matrix was prepared for Gaussian-copula sampling. */
export type CostCorrelationPrepStatus =
  | {
      kind: "identity"
      reason: "missing" | "single_item" | "all_zero_off_diagonal"
    }
  | { kind: "valid" }
  | { kind: "repaired" }
  | { kind: "fallback_identity"; reason: "cholesky_failed_after_repair" }

export type CostCorrelationPrepResult = {
  /** Lower-triangular Cholesky factor L where R ≈ L Lᵀ. */
  choleskyL: number[][]
  status: CostCorrelationPrepStatus
}

const EIGENVALUE_FLOOR = 1e-6

/** Standard normal CDF Φ(z) via erf. */
export function standardNormalCdf(z: number): number {
  if (!Number.isFinite(z)) return z > 0 ? 1 : 0
  return 0.5 * (1 + erf(z / Math.SQRT2))
}

function erf(x: number): number {
  // Abramowitz & Stegun 7.1.26
  const sign = x < 0 ? -1 : 1
  const ax = Math.abs(x)
  const t = 1 / (1 + 0.3275911 * ax)
  const y =
    1 -
    (((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t -
      0.284496736) *
      t +
      0.254829592) *
      t *
      Math.exp(-ax * ax))
  return sign * y
}

/** Box–Muller: one independent N(0,1) draw. `rng` defaults to Math.random. */
export function randomStandardNormal(rng: () => number = Math.random): number {
  let u = 0
  let v = 0
  while (u === 0) u = rng()
  while (v === 0) v = rng()
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
}

export function sampleStandardNormals(
  n: number,
  rng: () => number = Math.random,
): number[] {
  const out = new Array<number>(n)
  for (let i = 0; i < n; i++) out[i] = randomStandardNormal(rng)
  return out
}

export function clampCorrelationCoefficient(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.max(-1, Math.min(1, value))
}

/** Snap correlation to 0.1 steps within slider range [-0.9, 0.9]. */
export function snapCorrelationCoefficient(value: number): number {
  const snapped = Math.round(clampCorrelationCoefficient(value) * 10) / 10
  return Math.max(-0.9, Math.min(0.9, snapped))
}

export function parseCorrelationCoefficient(raw: string | undefined): number {
  if (raw === undefined || raw.trim() === "") return 0
  const n = parseNumberField(raw)
  if (n === null) return 0
  return clampCorrelationCoefficient(n)
}

/** n×n identity correlation matrix. */
export function identityCorrelationMatrix(n: number): number[][] {
  const m = Array.from({ length: n }, () => new Array<number>(n).fill(0))
  for (let i = 0; i < n; i++) m[i]![i] = 1
  return m
}

/** Symmetrize and clamp off-diagonal entries to [-1, 1]; force unit diagonal. */
export function sanitizeCorrelationMatrix(matrix: number[][]): number[][] {
  const n = matrix.length
  const out = identityCorrelationMatrix(n)
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const avg = clampCorrelationCoefficient(
        (matrix[i]![j]! + matrix[j]![i]!) / 2,
      )
      out[i]![j] = avg
      out[j]![i] = avg
    }
  }
  return out
}

export function isIdentityCorrelationMatrix(matrix: number[][]): boolean {
  const n = matrix.length
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const expected = i === j ? 1 : 0
      if (Math.abs(matrix[i]![j]! - expected) > 1e-10) return false
    }
  }
  return true
}

/** True when matrix is a valid correlation matrix (SPD after sanitize). */
export function isValidCorrelationMatrix(matrix: number[][]): boolean {
  if (matrix.length <= 1) return true
  return choleskyLower(sanitizeCorrelationMatrix(matrix)) !== null
}

/** Lower-triangular Cholesky factor; null if matrix is not SPD. */
export function choleskyLower(matrix: number[][]): number[][] | null {
  const n = matrix.length
  const L = Array.from({ length: n }, () => new Array<number>(n).fill(0))
  for (let i = 0; i < n; i++) {
    for (let j = 0; j <= i; j++) {
      let sum = 0
      for (let k = 0; k < j; k++) sum += L[i]![k]! * L[j]![k]!
      if (i === j) {
        const diag = matrix[i]![i]! - sum
        if (diag <= 0) return null
        L[i]![j] = Math.sqrt(diag)
      } else {
        const denom = L[j]![j]!
        if (denom === 0) return null
        L[i]![j] = (matrix[i]![j]! - sum) / denom
      }
    }
  }
  return L
}

/** z = L ε for lower-triangular L and independent standard normals ε. */
export function applyCholeskyTransform(
  L: readonly (readonly number[])[],
  independentNormals: readonly number[],
): number[] {
  const n = L.length
  const z = new Array<number>(n)
  for (let i = 0; i < n; i++) {
    let sum = 0
    for (let j = 0; j <= i; j++) sum += L[i]![j]! * independentNormals[j]!
    z[i] = sum
  }
  return z
}

/** Map correlated standard normals to uniform probabilities via Φ. */
export function normalsToUniforms(z: readonly number[]): number[] {
  return z.map((v) => standardNormalCdf(v))
}

/**
 * One Gaussian-copula draw: correlated standard normals → uniform probabilities.
 * Distribution-agnostic; marginals are applied by the caller.
 */
export function sampleCorrelatedUniforms(
  choleskyL: readonly (readonly number[])[],
  rng: () => number = Math.random,
): number[] {
  const n = choleskyL.length
  if (n === 0) return []
  const eps = sampleStandardNormals(n, rng)
  const z = applyCholeskyTransform(choleskyL, eps)
  return normalsToUniforms(z)
}

/** Jacobi eigen-decomposition for small symmetric matrices (n ≤ ~20). */
function symmetricEigenDecomposition(matrix: number[][]): {
  eigenvalues: number[]
  eigenvectors: number[][]
} {
  const n = matrix.length
  const a = matrix.map((row) => [...row])
  const v = identityCorrelationMatrix(n)

  const maxSweeps = 50
  const tolerance = 1e-12

  for (let sweep = 0; sweep < maxSweeps; sweep++) {
    let offNorm = 0
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        offNorm += a[i]![j]! * a[i]![j]!
      }
    }
    if (offNorm < tolerance) break

    for (let p = 0; p < n - 1; p++) {
      for (let q = p + 1; q < n; q++) {
        const app = a[p]![p]!
        const aqq = a[q]![q]!
        const apq = a[p]![q]!
        if (Math.abs(apq) < tolerance) continue

        const tau = (aqq - app) / (2 * apq)
        const t =
          Math.sign(tau) / (Math.abs(tau) + Math.sqrt(1 + tau * tau))
        const c = 1 / Math.sqrt(1 + t * t)
        const s = t * c

        for (let k = 0; k < n; k++) {
          if (k !== p && k !== q) {
            const akp = a[k]![p]!
            const akq = a[k]![q]!
            a[k]![p] = c * akp - s * akq
            a[p]![k] = a[k]![p]!
            a[k]![q] = s * akp + c * akq
            a[q]![k] = a[k]![q]!
          }
        }

        a[p]![p] = c * c * app - 2 * s * c * apq + s * s * aqq
        a[q]![q] = s * s * app + 2 * s * c * apq + c * c * aqq
        a[p]![q] = 0
        a[q]![p] = 0

        for (let k = 0; k < n; k++) {
          const vkp = v[k]![p]!
          const vkq = v[k]![q]!
          v[k]![p] = c * vkp - s * vkq
          v[k]![q] = s * vkp + c * vkq
        }
      }
    }
  }

  const eigenvalues = new Array<number>(n)
  for (let i = 0; i < n; i++) eigenvalues[i] = a[i]![i]!
  return { eigenvalues, eigenvectors: v }
}

/** Nearest correlation matrix via eigenvalue clipping + unit-diagonal normalization. */
export function repairCorrelationMatrixToPsd(matrix: number[][]): number[][] {
  const n = matrix.length
  const sym = sanitizeCorrelationMatrix(matrix)
  const { eigenvalues, eigenvectors: q } = symmetricEigenDecomposition(sym)

  const lambda = eigenvalues.map((v) => Math.max(v, EIGENVALUE_FLOOR))

  // R' = Q Λ Qᵀ
  const rebuilt = Array.from({ length: n }, () => new Array<number>(n).fill(0))
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      let sum = 0
      for (let k = 0; k < n; k++) {
        sum += q[i]![k]! * lambda[k]! * q[j]![k]!
      }
      rebuilt[i]![j] = sum
    }
  }

  // Normalize to unit diagonal
  const out = identityCorrelationMatrix(n)
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const denom = Math.sqrt(Math.max(rebuilt[i]![i]!, 0) * Math.max(rebuilt[j]![j]!, 0))
      const rho = denom > 0 ? clampCorrelationCoefficient(rebuilt[i]![j]! / denom) : 0
      out[i]![j] = rho
      out[j]![i] = rho
    }
  }
  return out
}

/**
 * Prepare Cholesky factor once per simulation from a correlation matrix.
 * Falls back to identity on failure; status records repair / fallback.
 * Pass `undefined` only when no matrix was supplied (caller uses `costItemCount`).
 */
export function prepareCostCorrelationCholesky(
  correlationMatrix: number[][] | undefined,
  costItemCount?: number,
): CostCorrelationPrepResult {
  if (correlationMatrix === undefined) {
    const n = Math.max(costItemCount ?? 0, 1)
    return {
      choleskyL: identityCorrelationMatrix(n),
      status: {
        kind: "identity",
        reason:
          (costItemCount ?? 0) <= 1 ? "single_item" : "missing",
      },
    }
  }

  const n = correlationMatrix.length
  if (n <= 1) {
    return {
      choleskyL: identityCorrelationMatrix(Math.max(n, 1)),
      status: {
        kind: "identity",
        reason: "single_item",
      },
    }
  }

  const sanitized = sanitizeCorrelationMatrix(correlationMatrix!)
  if (isIdentityCorrelationMatrix(sanitized)) {
    return {
      choleskyL: identityCorrelationMatrix(n),
      status: { kind: "identity", reason: "all_zero_off_diagonal" },
    }
  }

  let working = sanitized
  let status: CostCorrelationPrepStatus = { kind: "valid" }

  let L = choleskyLower(working)
  if (L === null) {
    working = repairCorrelationMatrixToPsd(working)
    status = { kind: "repaired" }
    L = choleskyLower(working)
  }

  if (L === null) {
    return {
      choleskyL: identityCorrelationMatrix(n),
      status: {
        kind: "fallback_identity",
        reason: "cholesky_failed_after_repair",
      },
    }
  }

  return { choleskyL: L, status }
}
