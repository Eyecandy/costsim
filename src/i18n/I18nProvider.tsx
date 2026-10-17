import { useEffect, useMemo, useState, type ReactNode } from "react"
import { I18nContext, type I18nContextValue, type Language } from "@/i18n/i18nContext"
import { loadLanguage, saveLanguage } from "@/persistence/languagePreference"

type I18nProviderProps = {
  children: ReactNode
}

export function I18nProvider({ children }: I18nProviderProps) {
  const [language, setLanguageState] = useState<Language>(loadLanguage)

  const setLanguage = (next: Language) => {
    setLanguageState(next)
    saveLanguage(next)
  }

  useEffect(() => {
    saveLanguage(language)
    // Screen readers and spell-checkers pick the page language from <html lang>.
    document.documentElement.lang = language
  }, [language])

  const value = useMemo<I18nContextValue>(() => ({ language, setLanguage }), [language])

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}
