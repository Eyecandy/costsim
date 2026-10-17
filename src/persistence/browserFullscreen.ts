/**
 * Thin Fullscreen API helpers with Safari/webkit fallbacks.
 * Presentation only — no persistence.
 */

type FullscreenDocument = Document & {
  webkitFullscreenElement?: Element | null
  webkitExitFullscreen?: () => Promise<void> | void
}

type FullscreenElement = Element & {
  webkitRequestFullscreen?: () => Promise<void> | void
}

export function getFullscreenElement(): Element | null {
  if (typeof document === "undefined") return null
  const doc = document as FullscreenDocument
  return doc.fullscreenElement ?? doc.webkitFullscreenElement ?? null
}

export function isElementFullscreen(element: Element | null): boolean {
  if (!element) return false
  return getFullscreenElement() === element
}

export function canRequestFullscreen(element: Element | null): boolean {
  if (!element) return false
  const el = element as FullscreenElement
  return (
    typeof el.requestFullscreen === "function" || typeof el.webkitRequestFullscreen === "function"
  )
}

/** Request fullscreen for `element`. Rejects if unsupported; callers should catch. */
export async function requestElementFullscreen(element: Element): Promise<void> {
  const el = element as FullscreenElement
  if (typeof el.requestFullscreen === "function") {
    await el.requestFullscreen()
    return
  }
  if (typeof el.webkitRequestFullscreen === "function") {
    await Promise.resolve(el.webkitRequestFullscreen())
    return
  }
  throw new Error("Fullscreen API unavailable")
}

/** Exit fullscreen only if `element` (or any element) currently owns it. */
export async function exitFullscreenIfNeeded(element?: Element | null): Promise<void> {
  if (typeof document === "undefined") return
  const active = getFullscreenElement()
  if (!active) return
  if (element && active !== element) return
  const doc = document as FullscreenDocument
  if (typeof doc.exitFullscreen === "function") {
    await doc.exitFullscreen()
    return
  }
  if (typeof doc.webkitExitFullscreen === "function") {
    await Promise.resolve(doc.webkitExitFullscreen())
  }
}

export function subscribeFullscreenChange(listener: () => void): () => void {
  if (typeof document === "undefined") return () => {}
  document.addEventListener("fullscreenchange", listener)
  document.addEventListener("webkitfullscreenchange", listener)
  return () => {
    document.removeEventListener("fullscreenchange", listener)
    document.removeEventListener("webkitfullscreenchange", listener)
  }
}
