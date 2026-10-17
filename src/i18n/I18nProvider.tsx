import {
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import { I18nContext, type I18nContextValue, type Language } from "@/i18n/i18nContext"

const STORAGE_KEY = "language"

function getInitialLanguage(): Language {
  if (typeof window === "undefined") return "no"
  const saved = window.localStorage.getItem(STORAGE_KEY)
  return saved === "en" ? "en" : "no"
}

type I18nProviderProps = {
  children: ReactNode
}

export function I18nProvider({ children }: I18nProviderProps) {
  const [language, setLanguageState] = useState<Language>(getInitialLanguage)

  const setLanguage = (next: Language) => {
    setLanguageState(next)
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, next)
    }
  }

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, language)
  }, [language])

  const value = useMemo<I18nContextValue>(
    () => ({ language, setLanguage }),
    [language],
  )

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

