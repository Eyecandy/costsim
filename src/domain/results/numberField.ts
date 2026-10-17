/** Tom eller ugyldig tall → null (brukes kun ved parsing til simulering) */
export function parseNumberField(raw: string): number | null {
  const t = raw.trim().replace(",", ".")
  if (t === "") return null
  const n = Number(t)
  return Number.isFinite(n) ? n : null
}
