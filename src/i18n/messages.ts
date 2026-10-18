import { messagesEn } from "@/i18n/messages.en"
import { messagesNo } from "@/i18n/messages.no"

export const messages = { no: messagesNo, en: messagesEn }

type Shape<T> = { [K in keyof T]: T[K] extends string ? string : Shape<T[K]> }
type Assert<T extends true> = T

/** Compile-time guard: Norwegian and English must have exactly the same keys. */
export type MessagesParityCheck = [
  Assert<typeof messages.en extends Shape<typeof messages.no> ? true : false>,
  Assert<typeof messages.no extends Shape<typeof messages.en> ? true : false>,
]

type DotPaths<T> = {
  [K in keyof T & string]: T[K] extends string ? K : `${K}.${DotPaths<T[K]>}`
}[keyof T & string]

/** Every translation key, as a dotted path (`"common.cancel"`). */
export type MessageKey = DotPaths<typeof messages.no>

/** The translate function `useI18n()` returns. */
export type Translate = (key: MessageKey) => string

/**
 * Profile option ids (area, type, phase, ...) are persisted as plain strings, so their label keys cannot be
 * checked at compile time. This is the one place that builds a `projectProfile.options.*` key from an id.
 */
export function profileOptionKey(optionId: string): MessageKey {
  return `projectProfile.options.${optionId}` as MessageKey
}
