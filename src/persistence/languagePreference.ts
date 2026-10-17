import type { Language } from "@/i18n/i18nContext"

const STORAGE_KEY = "language"

/** The saved UI language, or Norwegian when nothing (valid) is saved. */
export function loadLanguage(): Language {
  if (typeof window === "undefined") return "no"
  const saved = window.localStorage.getItem(STORAGE_KEY)
  return saved === "en" ? "en" : "no"
}

export function saveLanguage(language: Language): void {
  if (typeof window === "undefined") return
  window.localStorage.setItem(STORAGE_KEY, language)
}
