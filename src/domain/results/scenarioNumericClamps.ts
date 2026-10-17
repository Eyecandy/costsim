import { parseNumberField } from "@/domain/results/tableRows"

const COST_M_ABS_MAX = 20_000_000_000

function formatClampedPercent(n: number): string {
  if (Number.isInteger(n)) return String(n)
  return String(n)
}

/**
 * Clamp cost/driver optimistic % (P10 offset): empty ok; else in [-100, 0].
 * Wrong-direction magnitudes are folded (e.g. `10` → `-10`) before clamping.
 */
export function clampCostOptimisticPercent(value: string): string {
  if (value.trim() === "") return value
  const n = Number(value.replace(",", "."))
  if (!Number.isFinite(n)) return value
  // Optimistic endpoints are non-positive: fold opposite-sign magnitude.
  const signed = n > 0 ? -n : n
  if (signed < -100) return "-100"
  if (signed > 0) return "0"
  if (signed === 0) return "0"
  if (n > 0) return formatClampedPercent(signed)
  return value
}

/** Clamp cost most-likely absolute amount: empty ok; else in [0, COST_M_ABS_MAX]. */
export function clampCostLikelyAbs(value: string): string {
  if (value.trim() === "") return value
  const n = Number(value.replace(",", "."))
  if (!Number.isFinite(n)) return value
  if (n < 0) return "0"
  if (n > COST_M_ABS_MAX) return String(COST_M_ABS_MAX)
  return value
}

/**
 * Clamp cost/driver pessimistic % (P90 offset): empty ok; else in [0, 100].
 * Wrong-direction magnitudes are folded (e.g. `-10` → `10`) before clamping.
 */
export function clampCostPessimisticPercent(value: string): string {
  if (value.trim() === "") return value
  const n = Number(value.replace(",", "."))
  if (!Number.isFinite(n)) return value
  // Pessimistic endpoints are non-negative: fold opposite-sign magnitude.
  const signed = n < 0 ? -n : n
  if (signed < 0) return "0"
  if (signed > 100) return "100"
  if (signed === 0) return "0"
  if (n < 0) return formatClampedPercent(signed)
  return value
}

/**
 * Clamp driver most-likely % into [min(P10,P90), max(P10,P90)] when both
 * endpoints parse; otherwise leave unchanged (same as table editor).
 */
export function clampDriverLikelyPercent(
  value: string,
  optimistic: string,
  pessimistic: string,
): string {
  if (value.trim() === "") return value
  const n = Number(value.replace(",", "."))
  if (!Number.isFinite(n)) return value
  const opt = parseNumberField(optimistic)
  const pes = parseNumberField(pessimistic)
  if (opt === null || pes === null) return value
  const min = Math.min(opt, pes)
  const max = Math.max(opt, pes)
  if (n < min) return String(min)
  if (n > max) return String(max)
  return value
}
