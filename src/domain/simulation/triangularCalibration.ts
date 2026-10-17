export type CalibratedTriangular = {
  low: number
  mode: number
  high: number
}

export const TRIANGULAR_PERCENTILE_ALPHA = 0.1
export const TRIANGULAR_PERCENTILE_BETA = 0.9

/**
 * CDF of a triangular distribution on [low, high] with mode.
 * Returns values in [0, 1]. Degenerate support → step at mode.
 */
export function triangularCdf(
  x: number,
  low: number,
  mode: number,
  high: number,
): number {
  if (
    !Number.isFinite(x) ||
    !Number.isFinite(low) ||
    !Number.isFinite(mode) ||
    !Number.isFinite(high)
  ) {
    return Number.NaN
  }
  if (high <= low) return x >= mode ? 1 : 0
  if (x <= low) return 0
  if (x >= high) return 1
  if (x <= mode) {
    return ((x - low) ** 2) / ((high - low) * (mode - low))
  }
  return 1 - ((high - x) ** 2) / ((high - low) * (high - mode))
}

function solveLeftSupportWidth(
  leftSpan: number,
  rightSpan: number,
  alpha: number,
  oneMinusBeta: number,
): number | null {
  // dL must exceed leftSpan / (1 - √α) so the implied dR is positive.
  const minFactor = 1 - Math.sqrt(alpha)
  if (!(minFactor > 0) || !(leftSpan > 0) || !(rightSpan > 0)) return null

  const dLMin = leftSpan / minFactor
  // Find the smallest dL where implied dR > rightSpan (strict).
  const lo = dLMin * (1 + 1e-12)
  let hi = Math.max(dLMin, leftSpan, rightSpan) * 8
  const impliedDr = (dL: number) => {
    const num = (dL - leftSpan) ** 2
    return num / (alpha * dL) - dL
  }

  // Expand hi until dR > rightSpan.
  for (let i = 0; i < 40; i++) {
    if (impliedDr(hi) > rightSpan) break
    hi *= 2
    if (!Number.isFinite(hi)) return null
  }
  if (!(impliedDr(hi) > rightSpan)) return null

  // Bisect for dR(dL) = rightSpan boundary, then search g(dL)=0 above it.
  let a = lo
  let b = hi
  for (let i = 0; i < 80; i++) {
    const mid = 0.5 * (a + b)
    if (impliedDr(mid) > rightSpan) b = mid
    else a = mid
  }
  const dLAtDrEqualsR = b

  const g = (dL: number) => {
    const dR = impliedDr(dL)
    return (dR - rightSpan) ** 2 - oneMinusBeta * dR * (dL + dR)
  }

  // g(dLAtDrEqualsR) < 0; seek a bracket where g changes sign.
  let left = dLAtDrEqualsR
  let right = hi
  const gLeft = g(left)
  let gRight = g(right)
  if (!Number.isFinite(gLeft) || !Number.isFinite(gRight)) return null

  if (gLeft > 0) {
    // Rare: root is at/near boundary.
    return left
  }

  for (let i = 0; i < 40 && gRight <= 0; i++) {
    right *= 2
    gRight = g(right)
    if (!Number.isFinite(right) || !Number.isFinite(gRight)) return null
  }
  if (!(gRight > 0)) return null

  for (let i = 0; i < 100; i++) {
    const mid = 0.5 * (left + right)
    const gm = g(mid)
    if (!Number.isFinite(gm)) return null
    if (gm < 0) left = mid
    else right = mid
  }
  return 0.5 * (left + right)
}

/**
 * Mode at P10: F(mode)=α ⇒ dR/dL = (1-α)/α.
 * Then F(p90)=β fixes the scale from the right span R = p90 − mode.
 */
function calibrateModeAtP10(
  mode: number,
  p90: number,
  alpha: number,
  beta: number,
): CalibratedTriangular | null {
  const rightSpan = p90 - mode
  if (!(rightSpan > 0)) return null
  const k = (1 - alpha) / alpha
  const inner = (1 - beta) * k * (1 + k)
  if (!(inner > 0)) return null
  const denom = k - Math.sqrt(inner)
  if (!(denom > 0)) return null
  const dL = rightSpan / denom
  const dR = k * dL
  if (!(dL > 0 && dR > rightSpan)) return null
  const low = mode - dL
  const high = mode + dR
  if (!(low < mode && p90 < high)) return null
  return { low, mode, high }
}

/**
 * Mode at P90: F(mode)=β ⇒ dL/dR = β/(1-β).
 * Then F(p10)=α fixes the scale from the left span L = mode − p10.
 */
function calibrateModeAtP90(
  p10: number,
  mode: number,
  alpha: number,
  beta: number,
): CalibratedTriangular | null {
  const leftSpan = mode - p10
  if (!(leftSpan > 0)) return null
  const m = beta / (1 - beta)
  const inner = alpha * m * (1 + m)
  if (!(inner > 0)) return null
  const denom = m - Math.sqrt(inner)
  if (!(denom > 0)) return null
  const dR = leftSpan / denom
  const dL = m * dR
  if (!(dR > 0 && dL > leftSpan)) return null
  const low = mode - dL
  const high = mode + dR
  if (!(low < p10 && mode < high)) return null
  return { low, mode, high }
}

/**
 * Convert user P10 / mode / P90 estimates into triangular support [low, high].
 *
 * Validity: p10 ≤ mode ≤ p90 (equalities allowed).
 *
 * Solves for support such that:
 *   CDF(p10) = alpha (default 0.1)
 *   CDF(p90) = beta  (default 0.9)
 *
 * - Interior mode: deterministic 1-D bisection (symmetric closed form is a special case)
 * - Mode at P10 or P90: explicit closed-form limiting solutions
 * - All three equal: deterministic point mass
 */
export function calibrateTriangularFromPercentiles(
  p10: number,
  mode: number,
  p90: number,
  options?: { alpha?: number; beta?: number },
): CalibratedTriangular | null {
  const alpha = options?.alpha ?? TRIANGULAR_PERCENTILE_ALPHA
  const beta = options?.beta ?? TRIANGULAR_PERCENTILE_BETA

  if (
    !Number.isFinite(p10) ||
    !Number.isFinite(mode) ||
    !Number.isFinite(p90) ||
    !Number.isFinite(alpha) ||
    !Number.isFinite(beta)
  ) {
    return null
  }
  if (!(alpha > 0 && alpha < 1 && beta > 0 && beta < 1 && alpha < beta)) {
    return null
  }

  // Degenerate point mass.
  if (p10 === mode && mode === p90) {
    return { low: mode, mode, high: mode }
  }

  if (!(p10 <= mode && mode <= p90)) return null

  // Mode coincides with P10 (left boundary).
  if (p10 === mode) {
    return calibrateModeAtP10(mode, p90, alpha, beta)
  }

  // Mode coincides with P90 (right boundary).
  if (mode === p90) {
    return calibrateModeAtP90(p10, mode, alpha, beta)
  }

  const leftSpan = mode - p10
  const rightSpan = p90 - mode
  const oneMinusBeta = 1 - beta

  const dL = solveLeftSupportWidth(leftSpan, rightSpan, alpha, oneMinusBeta)
  if (dL === null || !(dL > leftSpan)) return null

  const dR = (dL - leftSpan) ** 2 / (alpha * dL) - dL
  if (!(dR > rightSpan) || !Number.isFinite(dR)) return null

  const low = mode - dL
  const high = mode + dR
  if (!(low < p10 && p90 < high)) return null
  if (!Number.isFinite(low) || !Number.isFinite(high)) return null

  return { low, mode, high }
}

/**
 * User absolute P10 / mode / P90 → { min, mode, max } for triangularQuantile.
 */
export function triangularParamsFromPercentiles(
  p10: number,
  mode: number,
  p90: number,
): { min: number; mode: number; max: number } | null {
  const calibrated = calibrateTriangularFromPercentiles(p10, mode, p90)
  if (!calibrated) return null
  return {
    min: calibrated.low,
    mode: calibrated.mode,
    max: calibrated.high,
  }
}
