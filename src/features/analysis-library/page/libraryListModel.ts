import { type LibraryNavFilter } from "@/persistence/libraryNavigation"
import type { AnalysisFolder, AnalysisSummary } from "@/domain/analysis/analysisDocument"
import type { Translate } from "@/i18n/messages"

export const HOME_RECENT_LIMIT = 5

/** Compact main-content column shared by Library Home and analysis list views. */
export const LIBRARY_MAIN_COLUMN = "w-full max-w-xl"

export function formatShortDate(iso: string, language: "no" | "en"): string {
  try {
    const d = new Date(iso)
    return d.toLocaleDateString(language === "en" ? "en-GB" : "nb-NO", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  } catch {
    return iso
  }
}

export function resolveLibraryHeading(
  filter: LibraryNavFilter,
  folders: AnalysisFolder[],
  t: Translate,
): string {
  if (filter.kind === "home") return ""
  if (filter.kind === "trash") return t("library.trashHeading")
  if (filter.kind === "all") return t("library.allAnalyses")
  if (filter.kind === "folder") {
    if (filter.folderId === null) return t("library.ungrouped")
    return folders.find((f) => f.id === filter.folderId)?.name ?? t("library.folders")
  }
  // Legacy recent/archived nav kinds — fall back to All heading if reached.
  return t("library.allAnalyses")
}

export type LibraryStatusFilter = "all" | "draft" | "archived"
export type LibrarySortMode = "updatedAt" | "nameAsc" | "nameDesc"
export type TrashSortMode = "deletedAt" | LibrarySortMode

export type ConfirmKind =
  { kind: "trash"; id: string } | { kind: "permanent"; id: string } | { kind: "empty" }

export function compareAnalysisNames(
  a: string,
  b: string,
  language: "no" | "en",
  direction: "asc" | "desc",
): number {
  const locale = language === "en" ? "en" : "nb"
  const cmp = a.localeCompare(b, locale, { sensitivity: "base" })
  return direction === "asc" ? cmp : -cmp
}

export function sortLibraryList(
  list: AnalysisSummary[],
  sortMode: LibrarySortMode | TrashSortMode,
  language: "no" | "en",
): AnalysisSummary[] {
  const next = list.slice()
  if (sortMode === "deletedAt") {
    next.sort((a, b) => new Date(b.deletedAt ?? 0).getTime() - new Date(a.deletedAt ?? 0).getTime())
  } else if (sortMode === "nameAsc") {
    next.sort((a, b) => compareAnalysisNames(a.name, b.name, language, "asc"))
  } else if (sortMode === "nameDesc") {
    next.sort((a, b) => compareAnalysisNames(a.name, b.name, language, "desc"))
  } else {
    next.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
  }
  return next
}

export function applyStatusFilter(
  list: AnalysisSummary[],
  statusFilter: LibraryStatusFilter,
): AnalysisSummary[] {
  if (statusFilter === "draft") {
    return list.filter((a) => a.status === "draft")
  }
  if (statusFilter === "archived") {
    return list.filter((a) => a.status === "archived")
  }
  return list
}
