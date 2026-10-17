import { useCallback } from "react"

import { isShareDeepLink, LIBRARY_PATH } from "@/persistence/analysisLibraryRoutes"

/** Query param on `/login` carrying the post-auth destination (path + search + hash). */
export const LOGIN_REDIRECT_PARAM = "redirect"

export function navigateTo(path: string) {
  window.history.pushState(null, "", path)
  window.dispatchEvent(new PopStateEvent("popstate"))
}

export function useNavigate() {
  return useCallback((path: string) => {
    navigateTo(path)
  }, [])
}

/** Current URL when on an app/library route; used to preserve share links through login. */
export function captureCurrentAppUrl(): string {
  if (typeof window === "undefined") return LIBRARY_PATH
  const { pathname, search, hash } = window.location
  if (pathname === "/app" || pathname.startsWith("/app/")) {
    return `${pathname}${search}${hash}`
  }
  if (pathname === LIBRARY_PATH || pathname.startsWith(`${LIBRARY_PATH}/`)) {
    return pathname
  }
  return LIBRARY_PATH
}

function sanitizePostLoginPath(raw: string | null): string {
  if (!raw) return LIBRARY_PATH
  try {
    const url = new URL(raw, window.location.origin)
    if (url.origin !== window.location.origin) return LIBRARY_PATH
    if (url.pathname === LIBRARY_PATH || url.pathname.startsWith(`${LIBRARY_PATH}/`)) {
      return LIBRARY_PATH
    }
    if (url.pathname !== "/app" && !url.pathname.startsWith("/app/")) {
      return LIBRARY_PATH
    }
    const dest = `${url.pathname}${url.search}${url.hash}`
    if (
      url.pathname === "/app" &&
      !isShareDeepLink(url.search, url.hash) &&
      !new URLSearchParams(url.search).has("analysis")
    ) {
      return LIBRARY_PATH
    }
    return dest
  } catch {
    return LIBRARY_PATH
  }
}

/** Resolved destination after login (`/library`, `/app?analysis=…`, or share URL). */
export function readPostLoginPath(): string {
  if (typeof window === "undefined") return LIBRARY_PATH
  const params = new URLSearchParams(window.location.search)
  return sanitizePostLoginPath(params.get(LOGIN_REDIRECT_PARAM))
}

export function buildLoginUrl(intendedPath: string): string {
  const params = new URLSearchParams()
  params.set(LOGIN_REDIRECT_PARAM, intendedPath)
  return `/login?${params.toString()}`
}
