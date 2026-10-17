import { useMemo } from "react"

import { useI18n as useI18nContext } from "@/i18n/i18nContext"
import { messages } from "@/i18n/messages"

function getNestedValue(obj: Record<string, unknown>, path: string): string | null {
  const parts = path.split(".")
  let current: unknown = obj

  for (const part of parts) {
    if (typeof current !== "object" || current === null) return null
    current = (current as Record<string, unknown>)[part]
  }

  return typeof current === "string" ? current : null
}

export function useI18n() {
  const { language, setLanguage } = useI18nContext()

  const t = useMemo(
    () =>
      (key: string): string =>
        getNestedValue(messages[language] as Record<string, unknown>, key) ?? key,
    [language],
  )

  return {
    language,
    setLanguage,
    t,
  }
}
