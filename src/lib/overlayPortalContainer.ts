import { useEffect, useState } from "react"

import {
  getFullscreenElement,
  subscribeFullscreenChange,
} from "@/lib/browserFullscreen"

/**
 * Mount node for overlays that must stay visible above Focus / fullscreen.
 *
 * Priority:
 * 1. Active browser fullscreen element (Focus FS host when Focus is fullscreen)
 * 2. Active (non-dormant) Focus session host for contained Focus
 * 3. `document.body` outside Focus
 */
export function resolveOverlayPortalContainer(): HTMLElement {
  if (typeof document === "undefined") {
    throw new Error("resolveOverlayPortalContainer requires document")
  }
  const active = getFullscreenElement()
  if (active instanceof HTMLElement) return active
  const focusHost = document.querySelector(
    "[data-focus-session-host]:not([data-focus-host-dormant='true'])",
  )
  if (focusHost instanceof HTMLElement) return focusHost
  return document.body
}

/**
 * Live portal container that tracks `fullscreenchange` / webkit equivalent.
 * Does not cache a stale fullscreen element across enter/exit.
 * Callers that open while Focus is already mounted should also call
 * `resolveOverlayPortalContainer()` at portal time so contained Focus is found
 * even if this hook last synced before the Focus host existed.
 */
export function useOverlayPortalContainer(): HTMLElement | null {
  const [container, setContainer] = useState<HTMLElement | null>(() =>
    typeof document !== "undefined" ? resolveOverlayPortalContainer() : null,
  )

  useEffect(() => {
    const sync = () => setContainer(resolveOverlayPortalContainer())
    sync()
    return subscribeFullscreenChange(sync)
  }, [])

  return container
}
