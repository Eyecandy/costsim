import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"

export type Language = "no" | "en"

type I18nContextValue = {
  language: Language
  setLanguage: (language: Language) => void
}

const STORAGE_KEY = "language"

const I18nContext = createContext<I18nContextValue | undefined>(undefined)

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

export function useI18n() {
  const ctx = useContext(I18nContext)
  if (!ctx) {
    throw new Error("useI18n must be used within I18nProvider")
  }
  return ctx
}
