import { createContext, useContext } from "react"

export type Language = "no" | "en"

export type I18nContextValue = {
  language: Language
  setLanguage: (language: Language) => void
}

export const I18nContext = createContext<I18nContextValue | undefined>(undefined)

export function useI18n() {
  const ctx = useContext(I18nContext)
  if (!ctx) {
    throw new Error("useI18n must be used within I18nProvider")
  }
  return ctx
}
