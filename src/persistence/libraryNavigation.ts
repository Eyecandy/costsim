import { LIBRARY_PATH } from "@/persistence/analysisLibraryRoutes"

export type LibraryNavFilter =
  | { kind: "home" }
  | { kind: "all" }
  /** @deprecated Removed from sidebar; retained for type compatibility. */
  | { kind: "recent" }
  /** @deprecated Removed from sidebar; retained for type compatibility. */
  | { kind: "archived" }
  | { kind: "trash" }
  | { kind: "folder"; folderId: string | null }

const LIBRARY_VIEW_PARAM = "view"

const LIBRARY_FOLDER_PARAM = "folderId"

/**
 * Canonical Library destinations (custom router — pathname + search).
 * Home: `/library`
 * All: `/library?view=all`
 * Deleted: `/library?view=trash`
 * Folder: `/library?view=folder&folderId=<id>` (omit folderId for ungrouped)
 */
export function buildLibraryPath(filter: LibraryNavFilter): string {
  switch (filter.kind) {
    case "all":
      return `${LIBRARY_PATH}?${LIBRARY_VIEW_PARAM}=all`
    case "trash":
      return `${LIBRARY_PATH}?${LIBRARY_VIEW_PARAM}=trash`
    case "folder": {
      const params = new URLSearchParams()
      params.set(LIBRARY_VIEW_PARAM, "folder")
      if (filter.folderId != null && filter.folderId !== "") {
        params.set(LIBRARY_FOLDER_PARAM, filter.folderId)
      }
      return `${LIBRARY_PATH}?${params.toString()}`
    }
    case "home":
    default:
      return LIBRARY_PATH
  }
}

/** Parse the authoritative Library view from the current URL search. */
export function readLibraryFilterFromLocation(
  search = typeof window !== "undefined" ? window.location.search : "",
): LibraryNavFilter {
  const params = new URLSearchParams(search)
  const view = params.get(LIBRARY_VIEW_PARAM)
  if (view === "all") return { kind: "all" }
  if (view === "trash") return { kind: "trash" }
  if (view === "folder") {
    const folderId = params.get(LIBRARY_FOLDER_PARAM)
    return {
      kind: "folder",
      folderId: folderId && folderId.length > 0 ? folderId : null,
    }
  }
  return { kind: "home" }
}

/** A failed best-effort save is surfaced separately and never traps navigation. */
export async function runBeforeLeaveWithoutBlocking(
  beforeLeaveWorkspace?: () => void | Promise<void>,
): Promise<void> {
  try {
    await beforeLeaveWorkspace?.()
  } catch {
    /* intentional: navigation remains available after persistence failure */
  }
}

/**
 * @deprecated Prefer {@link readLibraryFilterFromLocation}. Kept so older
 * sessionStorage handoffs still resolve once if present.
 */
export function takeLibraryInitialFilter(): LibraryNavFilter | null {
  try {
    const key = "cost-simulator:v1:libraryInitialFilter"
    const raw = sessionStorage.getItem(key)
    if (!raw) return null
    sessionStorage.removeItem(key)
    if (raw === "trash") return { kind: "trash" }
    if (raw === "home") return { kind: "home" }
    if (raw === "all") return { kind: "all" }
    if (raw.startsWith("folder:")) {
      const id = raw.slice("folder:".length)
      if (id === "" || id === "null") return { kind: "folder", folderId: null }
      return { kind: "folder", folderId: id }
    }
  } catch {
    /* private mode */
  }
  return null
}
