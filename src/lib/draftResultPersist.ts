/**
 * Draft compact result persistence contract:
 *
 * - omit field from the save patch → preserve whatever is already on `{...existing}`
 * - concrete snapshot value → replace
 * - explicit clear → delete the key via {@link omitDraftResultFields} (never `field: undefined`)
 *
 * `JSON.stringify` drops `undefined` properties, so ` { ...existing, result: undefined } `
 * permanently deletes a previously persisted compact result.
 */

export function replaceDraftResultField<K extends string, T>(
  key: K,
  value: T | null | undefined,
): Partial<Record<K, T>> {
  if (value == null) return {}
  return { [key]: value } as Partial<Record<K, T>>
}

/** Explicit clear: remove keys so they are absent after JSON persist. */
export function omitDraftResultFields<T extends Record<string, unknown>>(
  doc: T,
  ...keys: (keyof T)[]
): T {
  const next = { ...doc }
  for (const key of keys) {
    delete next[key]
  }
  return next
}
