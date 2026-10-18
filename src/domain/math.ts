/** Limit `value` to the range [min, max]. */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

const NEAR_ZERO = 1e-9

/** Snap values closer to zero than 1e-9 to exactly 0 (removes floating-point noise before comparing). */
export function nearZeroToZero(n: number): number {
  return Math.abs(n) < NEAR_ZERO ? 0 : n
}
