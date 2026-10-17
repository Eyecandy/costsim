/** URL helpers for Analysis Library ↔ workspace (custom router). */

export const LIBRARY_PATH = "/library"
export const ANALYSIS_QUERY_PARAM = "analysis"

export function isLibraryPath(pathname: string): boolean {
  return pathname === LIBRARY_PATH || pathname.startsWith(`${LIBRARY_PATH}/`)
}

export function buildAnalysisWorkspacePath(analysisId: string): string {
  const params = new URLSearchParams()
  params.set(ANALYSIS_QUERY_PARAM, analysisId)
  return `/app?${params.toString()}`
}

export function readAnalysisIdFromLocation(
  search = typeof window !== "undefined" ? window.location.search : "",
): string | null {
  const id = new URLSearchParams(search).get(ANALYSIS_QUERY_PARAM)
  if (!id || id.trim() === "") return null
  return id.trim()
}

/**
 * Pathname + search — required so `/app?analysis=A` → `/app?analysis=B`
 * triggers subscribers (pathname alone does not change).
 */
export function getLocationPathKey(
  loc: Pick<Location, "pathname" | "search"> = typeof window !== "undefined"
    ? window.location
    : { pathname: "/", search: "" },
): string {
  return `${loc.pathname}${loc.search}`
}

export function subscribeLocation(listener: () => void): () => void {
  window.addEventListener("popstate", listener)
  return () => window.removeEventListener("popstate", listener)
}

/** True when URL is a share deep-link (must not force library). */
export function isShareDeepLink(
  search = typeof window !== "undefined" ? window.location.search : "",
  hash = typeof window !== "undefined" ? window.location.hash : "",
): boolean {
  const params = new URLSearchParams(search)
  if (params.has("s")) return true
  if (hash.startsWith("#share=") || hash.startsWith("#z=")) return true
  return false
}

/**
 * Autosave must only run for the document that is fully loaded and matches the route.
 */
export function shouldAutosaveLibraryDraft(args: {
  routeAnalysisId: string | null
  loadedAnalysisId: string | null
  docId: string | null | undefined
  docStatus: "draft" | "archived" | undefined
  ready: boolean
}): boolean {
  if (!args.ready) return false
  if (!args.routeAnalysisId || !args.loadedAnalysisId || !args.docId) return false
  if (args.routeAnalysisId !== args.loadedAnalysisId) return false
  if (args.routeAnalysisId !== args.docId) return false
  if (args.docStatus !== "draft") return false
  return true
}
