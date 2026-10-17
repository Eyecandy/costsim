/**
 * Visningstall med valgt locale.
 * Erstatter typiske usynlige mellomrom fra `toLocaleString` med vanlig mellomrom.
 */
export type AppLanguage = "no" | "en"

export function localeFromLanguage(language: AppLanguage): string {
  return language === "en" ? "en-GB" : "nb-NO"
}

export function formatNumber(
  value: number,
  fractionDigits = 2,
  language: AppLanguage = "no",
): string {
  if (!Number.isFinite(value)) return "—"
  const s = value.toLocaleString(localeFromLanguage(language), {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  })
  return s
    .replace(/\u00a0/g, " ")
    .replace(/\u202f/g, " ")
    .replace(/\u2212/g, "-")
}
