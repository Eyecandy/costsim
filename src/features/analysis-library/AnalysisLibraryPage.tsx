import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react"
import { createPortal } from "react-dom"
import { ChevronDown, Archive, Menu, MoreHorizontal, Plus } from "lucide-react"

import { AnalysisLibraryNav } from "@/features/analysis-library/AnalysisLibraryNav"
import { buildLibraryPath, readLibraryFilterFromLocation, type LibraryNavFilter } from "@/features/analysis-library/libraryNavigation"
import { BrandWordmark } from "@/shared/BrandWordmark"
import { PRODUCT_NAME } from "@/shared/brand"
import { AnalysisModeIndicator } from "@/features/analysis-library/AnalysisModeIndicator"
import { ConfirmDialog } from "@/shared/ConfirmDialog"
import { GlobalHeaderUtilities } from "@/shared/GlobalHeaderUtilities"
import { MoveAnalysisDialog } from "@/features/analysis-library/MoveAnalysisDialog"
import { useI18n } from "@/i18n/useI18n"
import { getAnalysisLibraryRepository } from "@/persistence/analysisLibraryRepository"
import {
  hasAnalysisNameConflict,
  isAnalysisNameConflictError,
  isAnalysisNameConflictOnMoveError,
} from "@/domain/analysis/analysisNameUniqueness"
import type {
  AnalysisFolder,
  AnalysisSummary,
} from "@/domain/analysis/analysisDocument"
import {
  buildAnalysisWorkspacePath,
  getLocationPathKey,
  LIBRARY_PATH,
  subscribeLocation,
} from "@/persistence/analysisLibraryRoutes"
import { navigateTo } from "@/shared/auth/auth"
import { cn } from "@/shared/utils"

const HOME_RECENT_LIMIT = 5

/** Compact main-content column shared by Library Home and analysis list views. */
const LIBRARY_MAIN_COLUMN = "w-full max-w-xl"

function formatShortDate(iso: string, language: "no" | "en"): string {
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

function resolveLibraryHeading(
  filter: LibraryNavFilter,
  folders: AnalysisFolder[],
  t: (key: string) => string,
): string {
  if (filter.kind === "home") return ""
  if (filter.kind === "trash") return t("library.trashHeading")
  if (filter.kind === "all") return t("library.allAnalyses")
  if (filter.kind === "folder") {
    if (filter.folderId === null) return t("library.ungrouped")
    return (
      folders.find((f) => f.id === filter.folderId)?.name ??
      t("library.folders")
    )
  }
  // Legacy recent/archived nav kinds — fall back to All heading if reached.
  return t("library.allAnalyses")
}

export type LibraryStatusFilter = "all" | "draft" | "archived"
export type LibrarySortMode = "updatedAt" | "nameAsc" | "nameDesc"
export type TrashSortMode = "deletedAt" | LibrarySortMode

type ConfirmKind =
  | { kind: "trash"; id: string }
  | { kind: "permanent"; id: string }
  | { kind: "empty" }

function compareAnalysisNames(
  a: string,
  b: string,
  language: "no" | "en",
  direction: "asc" | "desc",
): number {
  const locale = language === "en" ? "en" : "nb"
  const cmp = a.localeCompare(b, locale, { sensitivity: "base" })
  return direction === "asc" ? cmp : -cmp
}

function sortLibraryList(
  list: AnalysisSummary[],
  sortMode: LibrarySortMode | TrashSortMode,
  language: "no" | "en",
): AnalysisSummary[] {
  const next = list.slice()
  if (sortMode === "deletedAt") {
    next.sort(
      (a, b) =>
        new Date(b.deletedAt ?? 0).getTime() -
        new Date(a.deletedAt ?? 0).getTime(),
    )
  } else if (sortMode === "nameAsc") {
    next.sort((a, b) => compareAnalysisNames(a.name, b.name, language, "asc"))
  } else if (sortMode === "nameDesc") {
    next.sort((a, b) => compareAnalysisNames(a.name, b.name, language, "desc"))
  } else {
    next.sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    )
  }
  return next
}

function applyStatusFilter(
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

export function AnalysisLibraryPage() {
  const { t, language } = useI18n()
  const repo = getAnalysisLibraryRepository()
  const [summaries, setSummaries] = useState<AnalysisSummary[]>([])
  const [trashItems, setTrashItems] = useState<AnalysisSummary[]>([])
  const [folders, setFolders] = useState<AnalysisFolder[]>([])
  /** URL search is the authoritative Library destination (survives StrictMode). */
  const locationKey = useSyncExternalStore(
    subscribeLocation,
    getLocationPathKey,
    () => LIBRARY_PATH,
  )
  const filter = useMemo(() => {
    void locationKey
    return readLibraryFilterFromLocation(
      typeof window !== "undefined" ? window.location.search : "",
    )
  }, [locationKey])
  const setFilter = useCallback((next: LibraryNavFilter) => {
    navigateTo(buildLibraryPath(next))
  }, [])
  const [statusFilter, setStatusFilter] =
    useState<LibraryStatusFilter>("all")
  const [sortMode, setSortMode] = useState<LibrarySortMode>("updatedAt")
  const [loading, setLoading] = useState(true)
  const [confirm, setConfirm] = useState<ConfirmKind | null>(null)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [newAnalysisOpenRequest, setNewAnalysisOpenRequest] = useState(0)
  const [newAnalysisFolderOverride, setNewAnalysisFolderOverride] = useState<
    string | null | undefined
  >(undefined)
  /** Same action as sidebar `+ New analysis` — set by AnalysisLibraryNav. */
  const openNewAnalysisActionRef = useRef<(() => void) | null>(null)
  const [libraryEpoch, setLibraryEpoch] = useState(0)
  const [renameTarget, setRenameTarget] = useState<AnalysisSummary | null>(null)
  const [renameValue, setRenameValue] = useState("")
  const [renameBusy, setRenameBusy] = useState(false)
  const [renameError, setRenameError] = useState<string | null>(null)
  const [moveTarget, setMoveTarget] = useState<AnalysisSummary | null>(null)
  const [moveError, setMoveError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    const [s, trash, f] = await Promise.all([
      repo.listSummaries(),
      repo.listTrash(),
      repo.listFolders(),
    ])
    setSummaries(s)
    setTrashItems(trash)
    setFolders(f)
    setLoading(false)
    setLibraryEpoch((n) => n + 1)
  }, [repo])

  useEffect(() => {
    void refresh()
  }, [refresh])

  useEffect(() => {
    if (filter.kind === "trash") {
      void refresh()
    }
  }, [filter.kind, refresh])

  /** Open New Analysis with optional folder preselection (folder empty states). Home CTA uses openNewAnalysisActionRef instead. */
  const requestNewAnalysis = (folderId?: string | null) => {
    setNewAnalysisFolderOverride(
      folderId !== undefined ? folderId : undefined,
    )
    setNewAnalysisOpenRequest((n) => n + 1)
  }

  const isRealFolderView =
    filter.kind === "folder" && filter.folderId != null

  const folderIsEmpty = useMemo(() => {
    if (!isRealFolderView || filter.kind !== "folder") return false
    const folderId = filter.folderId
    return !summaries.some((a) => a.folderId === folderId)
  }, [isRealFolderView, filter, summaries])

  const recentForHome = useMemo(
    () =>
      summaries
        .slice()
        .sort(
          (a, b) =>
            new Date(b.lastOpenedAt).getTime() -
            new Date(a.lastOpenedAt).getTime(),
        )
        .slice(0, HOME_RECENT_LIMIT),
    [summaries],
  )

  const visible = useMemo(() => {
    if (filter.kind === "home") {
      return recentForHome
    }
    if (filter.kind === "trash") {
      return trashItems
    }

    // Scope → status filter → sort
    let list = summaries.slice()
    if (filter.kind === "folder") {
      list = list.filter((a) => a.folderId === filter.folderId)
    }

    list = applyStatusFilter(list, statusFilter)
    return sortLibraryList(list, sortMode, language)
  }, [
    summaries,
    trashItems,
    filter,
    recentForHome,
    statusFilter,
    sortMode,
    language,
  ])

  const pageHeading = useMemo(
    () => resolveLibraryHeading(filter, folders, t),
    [filter, folders, t],
  )

  const emptyFilterMessage = useMemo(() => {
    const inFolder = filter.kind === "folder"
    if (statusFilter === "draft") {
      return inFolder ? t("library.noDraftsInFolder") : t("library.noDrafts")
    }
    if (statusFilter === "archived") {
      return inFolder
        ? t("library.noArchivedInFolder")
        : t("library.noArchived")
    }
    return t("library.noAnalysesInFilter")
  }, [filter.kind, statusFilter, t])

  const openAnalysis = (id: string) => {
    navigateTo(buildAnalysisWorkspacePath(id))
  }

  const runConfirm = async () => {
    if (!confirm) return
    if (confirm.kind === "trash") {
      await repo.moveToTrash(confirm.id)
    } else if (confirm.kind === "permanent") {
      await repo.deletePermanently(confirm.id)
    } else {
      await repo.emptyTrash()
    }
    setConfirm(null)
    await refresh()
  }

  const restoreItem = async (id: string) => {
    await repo.restore(id)
    await refresh()
  }

  const commitRename = async () => {
    if (!renameTarget) return
    const trimmed = renameValue.trim()
    if (!trimmed || renameBusy) return
    setRenameBusy(true)
    setRenameError(null)
    if (
      hasAnalysisNameConflict({
        name: trimmed,
        folderId: renameTarget.folderId ?? null,
        analyses: summaries,
        excludeId: renameTarget.id,
      })
    ) {
      setRenameError(t("library.duplicateNameInFolder"))
      setRenameBusy(false)
      return
    }
    try {
      await repo.touchMetadata(renameTarget.id, { name: trimmed })
      setRenameTarget(null)
      setRenameValue("")
      setRenameError(null)
      await refresh()
    } catch (error) {
      setRenameError(
        isAnalysisNameConflictError(error)
          ? t("library.duplicateNameInFolder")
          : t("library.saveError"),
      )
    } finally {
      setRenameBusy(false)
    }
  }

  const commitMove = async (folderId: string | null) => {
    if (!moveTarget) return
    setMoveError(null)
    if (
      hasAnalysisNameConflict({
        name: moveTarget.name,
        folderId,
        analyses: summaries,
        excludeId: moveTarget.id,
      })
    ) {
      setMoveError(t("library.duplicateNameOnMove"))
      throw new Error("duplicate_analysis_name_on_move")
    }
    try {
      await repo.touchMetadata(moveTarget.id, { folderId })
      setMoveTarget(null)
      setMoveError(null)
      await refresh()
    } catch (error) {
      setMoveError(
        isAnalysisNameConflictOnMoveError(error) ||
          isAnalysisNameConflictError(error)
          ? t("library.duplicateNameOnMove")
          : t("library.saveError"),
      )
      throw error
    }
  }

  const isEmptyLibrary = !loading && summaries.length === 0
  const isHome = filter.kind === "home"
  const isTrash = filter.kind === "trash"

  const confirmTitle =
    confirm?.kind === "trash"
      ? t("library.deleteConfirmTitle")
      : confirm?.kind === "permanent"
        ? t("library.deletePermanentlyConfirmTitle")
        : confirm?.kind === "empty"
          ? t("library.emptyTrashConfirmTitle")
          : undefined
  const confirmMessage =
    confirm?.kind === "trash"
      ? t("library.deleteConfirm")
      : confirm?.kind === "permanent"
        ? t("library.deletePermanentlyConfirm")
        : confirm?.kind === "empty"
          ? t("library.emptyTrashConfirm")
          : ""
  const confirmLabel =
    confirm?.kind === "trash"
      ? t("library.deleteConfirmAction")
      : confirm?.kind === "permanent"
        ? t("library.deletePermanentlyConfirmAction")
        : confirm?.kind === "empty"
          ? t("library.emptyTrashConfirmAction")
          : t("common.confirm")

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-50 border-b border-border/40 bg-background/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-[90rem] items-center justify-between gap-3 px-3 py-3 md:px-5 lg:px-6">
          <div className="flex min-w-0 items-center gap-2">
            <button
              type="button"
              className="ml-0.5 flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted/70 sm:ml-1 md:hidden"
              aria-label={t("library.openSidebar")}
              onClick={() => setMobileNavOpen(true)}
            >
              <Menu className="size-4" aria-hidden />
            </button>
            <BrandWordmark
              as="button"
              aria-label={t("library.goToHome")}
              title={t("library.goToHome")}
              onClick={() => setFilter({ kind: "home" })}
            />
          </div>
          <GlobalHeaderUtilities />
        </div>
      </header>

      {mobileNavOpen ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-[80] bg-transparent md:hidden"
            aria-label={t("library.closeSidebar")}
            onClick={() => setMobileNavOpen(false)}
          />
          <aside
            className="fixed left-0 top-0 z-[90] flex h-full w-[min(240px,88vw)] flex-col border-r border-border/50 bg-background shadow-md md:hidden"
            aria-label={t("library.sidebarLabel")}
          >
            <AnalysisLibraryNav
              filter={filter}
              onFilterChange={(next) => {
                setFilter(next)
              }}
              onNavigated={() => setMobileNavOpen(false)}
              newAnalysisOpenRequest={newAnalysisOpenRequest}
              newAnalysisFolderOverride={newAnalysisFolderOverride}
              className="min-h-0 flex-1 overflow-y-auto px-2 py-3"
            />
          </aside>
        </>
      ) : null}

      <div className="mx-auto flex w-full max-w-[90rem] flex-1 gap-8 px-3 py-6 md:px-5 lg:px-6">
        <nav
          className="hidden w-56 shrink-0 md:block"
          aria-label={t("library.title")}
        >
          <AnalysisLibraryNav
            filter={filter}
            onFilterChange={setFilter}
            newAnalysisOpenRequest={newAnalysisOpenRequest}
            newAnalysisFolderOverride={newAnalysisFolderOverride}
            openNewAnalysisActionRef={openNewAnalysisActionRef}
            libraryEpoch={libraryEpoch}
            onLibraryChanged={() => void refresh()}
            className="sticky top-16 max-h-[calc(100vh-5rem)]"
          />
        </nav>

        <main className="min-w-0 flex-1">
          {isHome ? (
            <LibraryHomeContent
              loading={loading}
              isEmptyLibrary={isEmptyLibrary}
              recent={recentForHome}
              language={language}
              onNewAnalysis={() => openNewAnalysisActionRef.current?.()}
              onOpenAnalysis={openAnalysis}
              onViewAll={() => setFilter({ kind: "all" })}
              onMoveToTrash={(id) => setConfirm({ kind: "trash", id })}
              onRename={(item) => {
                setRenameError(null)
                setRenameTarget(item)
                setRenameValue(item.name)
              }}
              onMove={(item) => {
                setMoveError(null)
                setMoveTarget(item)
              }}
            />
          ) : isTrash ? (
            <TrashView
              loading={loading}
              items={trashItems}
              language={language}
              onRestore={(id) => void restoreItem(id)}
              onDeletePermanently={(id) =>
                setConfirm({ kind: "permanent", id })
              }
              onEmptyTrash={() => setConfirm({ kind: "empty" })}
            />
          ) : (
            <div className={cn(LIBRARY_MAIN_COLUMN, "flex flex-col")}>
              {isRealFolderView && folderIsEmpty ? (
                <div className="flex flex-col gap-3">
                  <h1 className="m-0 truncate font-sans text-lg font-medium text-foreground">
                    {pageHeading}
                  </h1>
                  <p className="m-0 font-sans text-[13px] text-muted-foreground">
                    {t("library.folderEmpty")}
                  </p>
                  <FolderNewAnalysisButton
                    onClick={() => {
                      if (filter.kind === "folder" && filter.folderId) {
                        requestNewAnalysis(filter.folderId)
                      }
                    }}
                  />
                </div>
              ) : (
                <>
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
                    <h1 className="m-0 min-w-0 flex-1 truncate font-sans text-lg font-medium text-foreground">
                      {pageHeading}
                    </h1>
                    <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                      {isRealFolderView ? (
                        <FolderNewAnalysisButton
                          onClick={() => {
                            if (filter.kind === "folder" && filter.folderId) {
                              requestNewAnalysis(filter.folderId)
                            }
                          }}
                        />
                      ) : null}
                      <LibraryListToolbarSelect
                        ariaLabel={t("library.showFilterLabel")}
                        value={statusFilter}
                        onChange={setStatusFilter}
                        options={[
                          {
                            value: "all",
                            label: t("library.filterShowAll"),
                          },
                          {
                            value: "draft",
                            label: t("library.filterShowDrafts"),
                          },
                          {
                            value: "archived",
                            label: t("library.filterShowArchived"),
                          },
                        ]}
                      />
                      <LibraryListToolbarSelect
                        ariaLabel={t("library.sortAnalysesLabel")}
                        value={sortMode}
                        onChange={setSortMode}
                        options={[
                          {
                            value: "updatedAt",
                            label: t("library.sortLastModified"),
                          },
                          {
                            value: "nameAsc",
                            label: t("library.sortNameAsc"),
                          },
                          {
                            value: "nameDesc",
                            label: t("library.sortNameDesc"),
                          },
                        ]}
                      />
                    </div>
                  </div>

                  {isEmptyLibrary ? (
                    <div className="flex max-w-sm flex-col gap-3 py-16">
                      <p className="m-0 font-sans text-[15px] font-medium text-foreground">
                        {t("library.emptyTitle")}
                      </p>
                      <p className="m-0 font-sans text-[13px] text-muted-foreground">
                        {t("library.emptyBody")}
                      </p>
                    </div>
                  ) : (
                    <ul className="m-0 flex list-none flex-col gap-0 border-t border-border/50 p-0">
                      {visible.length === 0 ? (
                        <li className="py-8 font-sans text-[13px] text-muted-foreground">
                          {emptyFilterMessage}
                        </li>
                      ) : (
                        visible.map((item) => (
                          <LibraryListRow
                            key={item.id}
                            item={item}
                            language={language}
                            onOpen={() => openAnalysis(item.id)}
                            onRename={() => {
                              setRenameError(null)
                              setRenameTarget(item)
                              setRenameValue(item.name)
                            }}
                            onMove={() => {
                              setMoveError(null)
                              setMoveTarget(item)
                            }}
                            onMoveToTrash={() =>
                              setConfirm({ kind: "trash", id: item.id })
                            }
                          />
                        ))
                      )}
                    </ul>
                  )}
                </>
              )}
            </div>
          )}
        </main>
      </div>

      <div
        className="mt-auto flex justify-center pt-10 pb-8 text-center"
        role="contentinfo"
      >
        <span className="block font-sans text-[10px] leading-none text-muted-foreground/70">
          © 2026 {PRODUCT_NAME}
        </span>
      </div>

      <ConfirmDialog
        open={confirm != null}
        title={confirmTitle}
        message={confirmMessage}
        cancelLabel={t("common.cancel")}
        confirmLabel={confirmLabel}
        onCancel={() => setConfirm(null)}
        onConfirm={() => void runConfirm()}
      />

      {renameTarget && typeof document !== "undefined"
        ? createPortal(
            <div
              className="fixed inset-0 z-[220] flex items-center justify-center bg-black/40 p-4"
              role="presentation"
              onClick={() => {
                setRenameTarget(null)
                setRenameValue("")
                setRenameError(null)
              }}
            >
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="rename-library-analysis-title"
                className="w-full max-w-sm rounded-lg border border-border/60 bg-background p-4 shadow-md"
                onClick={(e) => e.stopPropagation()}
              >
                <h2
                  id="rename-library-analysis-title"
                  className="m-0 mb-3 font-sans text-[15px] font-medium"
                >
                  {t("library.renameTitle")}
                </h2>
                <input
                  autoFocus
                  className="mb-2 h-9 w-full rounded-md border border-border bg-background px-2 font-sans text-[13px]"
                  value={renameValue}
                  onChange={(e) => {
                    setRenameValue(e.target.value)
                    if (renameError) setRenameError(null)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void commitRename()
                  }}
                />
                {renameError ? (
                  <p
                    className="m-0 mb-3 font-sans text-[12px] text-destructive"
                    role="alert"
                  >
                    {renameError}
                  </p>
                ) : (
                  <div className="mb-3" />
                )}
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    className="h-8 rounded-md px-3 font-sans text-[12px] text-muted-foreground hover:bg-muted"
                    onClick={() => {
                      setRenameTarget(null)
                      setRenameValue("")
                      setRenameError(null)
                    }}
                  >
                    {t("common.cancel")}
                  </button>
                  <button
                    type="button"
                    className="h-8 rounded-md bg-[#1d868c] px-3 font-sans text-[12px] text-white hover:bg-[#1d868c]/90 disabled:opacity-50"
                    disabled={!renameValue.trim() || renameBusy}
                    onClick={() => void commitRename()}
                  >
                    {t("common.confirm")}
                  </button>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}

      <MoveAnalysisDialog
        open={moveTarget != null}
        analysisName={moveTarget?.name ?? ""}
        currentFolderId={moveTarget?.folderId ?? null}
        folders={folders}
        error={moveError}
        onClose={() => {
          setMoveTarget(null)
          setMoveError(null)
        }}
        onMoved={async (folderId) => {
          await commitMove(folderId)
        }}
      />

      <span className="sr-only" data-library-path={LIBRARY_PATH} />
    </div>
  )
}

function LibraryListToolbarSelect<T extends string>({
  ariaLabel,
  value,
  onChange,
  options,
}: {
  ariaLabel: string
  value: T
  onChange: (next: T) => void
  options: { value: T; label: string }[]
}) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement | null>(null)
  const menuId = useId()

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false)
    }
    document.addEventListener("mousedown", onDoc)
    window.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("mousedown", onDoc)
      window.removeEventListener("keydown", onKey)
    }
  }, [open])

  const currentLabel =
    options.find((o) => o.value === value)?.label ?? options[0]?.label ?? ""

  return (
    <div className="relative shrink-0" ref={rootRef}>
      <button
        type="button"
        className={cn(
          "inline-flex h-8 max-w-[11rem] items-center gap-1 rounded-md border border-border/60 bg-background px-2",
          "font-sans text-[12px] text-muted-foreground hover:bg-muted/40 hover:text-foreground",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        )}
        aria-label={`${ariaLabel}: ${currentLabel}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="min-w-0 truncate">{currentLabel}</span>
        <ChevronDown className="size-3.5 shrink-0 opacity-70" aria-hidden />
      </button>
      {open ? (
        <div
          id={menuId}
          role="listbox"
          aria-label={ariaLabel}
          className="absolute right-0 top-full z-[100] mt-1 min-w-[9.5rem] rounded-md border border-border/60 bg-background py-1 shadow-md"
        >
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              role="option"
              aria-selected={opt.value === value}
              className={cn(
                "flex w-full px-3 py-1.5 text-left font-sans text-[12px] hover:bg-muted/60",
                opt.value === value
                  ? "font-medium text-foreground"
                  : "text-foreground/90",
              )}
              onClick={() => {
                onChange(opt.value)
                setOpen(false)
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}

function LibraryHomeContent({
  loading,
  isEmptyLibrary,
  recent,
  language,
  onNewAnalysis,
  onOpenAnalysis,
  onViewAll,
  onMoveToTrash,
  onRename,
  onMove,
}: {
  loading: boolean
  isEmptyLibrary: boolean
  recent: AnalysisSummary[]
  language: "no" | "en"
  onNewAnalysis: () => void
  onOpenAnalysis: (id: string) => void
  onViewAll: () => void
  onMoveToTrash: (id: string) => void
  onRename: (item: AnalysisSummary) => void
  onMove: (item: AnalysisSummary) => void
}) {
  const { t } = useI18n()

  if (loading) {
    return (
      <p className="m-0 py-8 font-sans text-[13px] text-muted-foreground">…</p>
    )
  }

  if (isEmptyLibrary) {
    return (
      <div className="flex max-w-md flex-col gap-4 py-10">
        <div className="flex flex-col gap-1.5">
          <h1 className="m-0 font-sans text-lg font-medium text-foreground">
            {t("library.emptyTitle")}
          </h1>
          <p className="m-0 font-sans text-[13px] text-muted-foreground">
            {t("library.emptyBody")}
          </p>
        </div>
        <HomeNewAnalysisButton onClick={onNewAnalysis} />
      </div>
    )
  }

  return (
    <div className={cn(LIBRARY_MAIN_COLUMN, "flex flex-col gap-2")}>
      <h1 className="m-0 font-sans text-lg font-medium text-foreground">
        {t("library.recentAnalysesHeading")}
      </h1>
      <ul className="m-0 flex list-none flex-col gap-0 border-t border-border/50 p-0">
        {recent.map((item) => (
          <LibraryListRow
            key={item.id}
            item={item}
            language={language}
            onOpen={() => onOpenAnalysis(item.id)}
            onRename={() => onRename(item)}
            onMove={() => onMove(item)}
            onMoveToTrash={() => onMoveToTrash(item.id)}
          />
        ))}
      </ul>
      <button
        type="button"
        className="mt-1 self-start font-sans text-[12px] text-[#1d868c] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        onClick={onViewAll}
      >
        {t("library.viewAllAnalyses")}
      </button>
    </div>
  )
}

function TrashView({
  loading,
  items,
  language,
  onRestore,
  onDeletePermanently,
  onEmptyTrash,
}: {
  loading: boolean
  items: AnalysisSummary[]
  language: "no" | "en"
  onRestore: (id: string) => void
  onDeletePermanently: (id: string) => void
  onEmptyTrash: () => void
}) {
  const { t } = useI18n()
  const [statusFilter, setStatusFilter] =
    useState<LibraryStatusFilter>("all")
  const [sortMode, setSortMode] = useState<TrashSortMode>("deletedAt")

  const visible = useMemo(() => {
    const filtered = applyStatusFilter(items, statusFilter)
    return sortLibraryList(filtered, sortMode, language)
  }, [items, statusFilter, sortMode, language])

  const emptyFilterMessage =
    statusFilter === "draft"
      ? t("library.noDraftsAmongDeleted")
      : statusFilter === "archived"
        ? t("library.noArchivedAmongDeleted")
        : t("library.trashEmpty")

  if (loading) {
    return (
      <p className="m-0 py-8 font-sans text-[13px] text-muted-foreground">…</p>
    )
  }

  const hasItems = items.length > 0

  return (
    <div className={cn(LIBRARY_MAIN_COLUMN, "flex flex-col gap-3")}>
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
          <h1 className="m-0 min-w-0 flex-1 truncate font-sans text-lg font-medium text-foreground">
            {t("library.trashHeading")}
          </h1>
          {hasItems ? (
            <div className="flex shrink-0 flex-wrap items-center gap-1.5">
              <LibraryListToolbarSelect
                ariaLabel={t("library.showFilterLabel")}
                value={statusFilter}
                onChange={setStatusFilter}
                options={[
                  {
                    value: "all",
                    label: t("library.filterShowAll"),
                  },
                  {
                    value: "draft",
                    label: t("library.filterShowDrafts"),
                  },
                  {
                    value: "archived",
                    label: t("library.filterShowArchived"),
                  },
                ]}
              />
              <LibraryListToolbarSelect
                ariaLabel={t("library.sortAnalysesLabel")}
                value={sortMode}
                onChange={setSortMode}
                options={[
                  {
                    value: "deletedAt",
                    label: t("library.sortRecentlyDeleted"),
                  },
                  {
                    value: "updatedAt",
                    label: t("library.sortLastModified"),
                  },
                  {
                    value: "nameAsc",
                    label: t("library.sortNameAsc"),
                  },
                  {
                    value: "nameDesc",
                    label: t("library.sortNameDesc"),
                  },
                ]}
              />
            </div>
          ) : null}
        </div>
        <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
          <p className="m-0 min-w-0 flex-1 font-sans text-[12px] text-muted-foreground">
            {t("library.trashRetentionHint")}
          </p>
          {hasItems ? (
            <button
              type="button"
              className="shrink-0 rounded px-2 py-1.5 font-sans text-[12px] text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              onClick={onEmptyTrash}
            >
              {t("library.emptyTrash")}
            </button>
          ) : null}
        </div>
      </div>

      {!hasItems ? (
        <p className="m-0 py-10 font-sans text-[13px] text-muted-foreground">
          {t("library.trashEmpty")}
        </p>
      ) : (
        <ul className="m-0 flex list-none flex-col gap-0 border-t border-border/50 p-0">
          {visible.length === 0 ? (
            <li className="py-8 font-sans text-[13px] text-muted-foreground">
              {emptyFilterMessage}
            </li>
          ) : (
            visible.map((item) => (
              <TrashListRow
                key={item.id}
                item={item}
                language={language}
                onRestore={() => onRestore(item.id)}
                onDeletePermanently={() => onDeletePermanently(item.id)}
              />
            ))
          )}
        </ul>
      )}
    </div>
  )
}

function FolderNewAnalysisButton({ onClick }: { onClick: () => void }) {
  const { t } = useI18n()
  return (
    <button
      type="button"
      className={cn(
        "inline-flex h-8 shrink-0 items-center gap-1 rounded-md px-2",
        "font-sans text-[12px] text-muted-foreground",
        "hover:bg-muted/40 hover:text-foreground",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
      )}
      aria-label={t("library.newAnalysis")}
      onClick={onClick}
    >
      <Plus className="size-3.5 shrink-0" aria-hidden />
      {t("library.newAnalysis")}
    </button>
  )
}

function HomeNewAnalysisButton({ onClick }: { onClick: () => void }) {
  const { t } = useI18n()
  return (
    <button
      type="button"
      className={cn(
        "inline-flex w-fit items-center gap-1.5 rounded-md bg-[#1d868c] px-3.5 py-2",
        "font-sans text-[13px] font-medium text-white",
        "hover:bg-[#1d868c]/90",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
      )}
      onClick={onClick}
    >
      <Plus className="size-3.5 shrink-0" aria-hidden />
      {t("library.newAnalysis")}
    </button>
  )
}

function LibraryRowActionsMenu({
  items,
  revealWithRow = false,
}: {
  items: { label: string; onSelect: () => void }[]
  /** Quiet until parent `.group` hover/focus; reserved width avoids layout shift. */
  revealWithRow?: boolean
}) {
  const { t } = useI18n()
  const [menuOpen, setMenuOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement | null>(null)
  const menuId = useId()

  useEffect(() => {
    if (!menuOpen) return
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setMenuOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false)
    }
    document.addEventListener("mousedown", onDoc)
    window.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("mousedown", onDoc)
      window.removeEventListener("keydown", onKey)
    }
  }, [menuOpen])

  return (
    <div
      className={cn(
        "relative shrink-0",
        revealWithRow &&
          cn(
            "transition-opacity duration-150",
            menuOpen
              ? "opacity-100"
              : cn(
                  "opacity-0",
                  "group-hover:opacity-100 group-focus-within:opacity-100",
                  "[@media(hover:none)]:opacity-100",
                ),
          ),
      )}
      style={revealWithRow ? { width: "2rem" } : undefined}
      ref={rootRef}
    >
      <button
        type="button"
        className={cn(
          "flex size-8 items-center justify-center rounded-md text-muted-foreground",
          // Row owns hover surface — no nested action background.
          "hover:text-foreground",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        )}
        aria-label={t("library.analysisActions")}
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        aria-controls={menuId}
        title={t("library.analysisActions")}
        onClick={(e) => {
          e.stopPropagation()
          setMenuOpen((v) => !v)
        }}
      >
        <MoreHorizontal className="size-4" aria-hidden />
      </button>
      {menuOpen ? (
        <div
          id={menuId}
          role="menu"
          className="absolute right-0 top-full z-[100] mt-1 min-w-[11rem] rounded-md border border-border/60 bg-background py-1 shadow-md"
        >
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              className="flex w-full px-3 py-1.5 text-left font-sans text-[12px] text-foreground hover:bg-muted/60"
              onClick={(e) => {
                e.stopPropagation()
                setMenuOpen(false)
                item.onSelect()
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}

function LibraryListRow({
  item,
  language,
  onOpen,
  onRename,
  onMove,
  onMoveToTrash,
}: {
  item: AnalysisSummary
  language: "no" | "en"
  onOpen: () => void
  onRename: () => void
  onMove: () => void
  onMoveToTrash: () => void
}) {
  const { t } = useI18n()
  return (
    <li
      className={cn(
        "group flex items-center gap-1 border-b border-border/40 py-0.5",
        // One shared hover/focus field for name + ⋯
        "rounded-md hover:bg-muted/50",
      )}
    >
      <button
        type="button"
        className={cn(
          "min-w-0 flex-1 px-2 py-1.5 text-left text-foreground/90",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        )}
        title={
          item.status === "archived"
            ? `${item.name} — ${t("library.statusArchived")}`
            : item.name
        }
        aria-label={
          item.status === "archived"
            ? `${item.name} — ${t("library.statusArchived")}`
            : item.name
        }
        onClick={onOpen}
      >
        <span className="inline-flex min-w-0 max-w-full items-center gap-1.5">
          <span className="min-w-0 truncate font-sans text-[13px] font-medium text-foreground">
            {item.name}
          </span>
          <AnalysisModeIndicator mode={item.analysisMode} />
          {item.status === "archived" ? (
            <Archive
              className="size-3.5 shrink-0 text-muted-foreground"
              aria-hidden
              data-archived-icon=""
            />
          ) : null}
        </span>
        <span className="mt-0.5 flex flex-wrap items-center gap-x-2 font-sans text-[11px] text-muted-foreground">
          <span>
            {item.status === "archived"
              ? t("library.statusArchived")
              : t("library.statusDraft")}
          </span>
          <span aria-hidden>·</span>
          <span>
            {formatShortDate(
              item.status === "archived"
                ? (item.archivedAt ?? item.updatedAt)
                : item.updatedAt,
              language,
            )}
          </span>
        </span>
      </button>

      <LibraryRowActionsMenu
        revealWithRow
        items={[
          {
            label: t("library.renameAnalysis"),
            onSelect: onRename,
          },
          {
            label: t("library.moveAnalysis"),
            onSelect: onMove,
          },
          {
            label: t("library.delete"),
            onSelect: onMoveToTrash,
          },
        ]}
      />
    </li>
  )
}

function TrashListRow({
  item,
  language,
  onRestore,
  onDeletePermanently,
}: {
  item: AnalysisSummary
  language: "no" | "en"
  onRestore: () => void
  onDeletePermanently: () => void
}) {
  const { t } = useI18n()

  return (
    <li className="flex items-center justify-between gap-2 border-b border-border/40 py-1.5">
      <div
        className={cn(
          "min-w-0 flex-1 rounded px-2 py-1.5",
          "text-foreground/90",
        )}
      >
        <span className="inline-flex min-w-0 max-w-full items-center gap-1.5">
          <span className="min-w-0 truncate font-sans text-[13px] font-medium text-foreground">
            {item.name}
          </span>
          <AnalysisModeIndicator mode={item.analysisMode} />
          {item.status === "archived" ? (
            <Archive
              className="size-3.5 shrink-0 text-muted-foreground"
              aria-hidden
              data-archived-icon=""
            />
          ) : null}
        </span>
        <span className="mt-0.5 flex flex-wrap items-center gap-x-2 font-sans text-[11px] text-muted-foreground">
          <span>
            {item.status === "archived"
              ? t("library.statusArchived")
              : t("library.statusDraft")}
          </span>
          {item.deletedAt ? (
            <>
              <span aria-hidden>·</span>
              <span>{formatShortDate(item.deletedAt, language)}</span>
            </>
          ) : null}
        </span>
      </div>
      <LibraryRowActionsMenu
        items={[
          {
            label: t("library.restore"),
            onSelect: onRestore,
          },
          {
            label: t("library.deletePermanently"),
            onSelect: onDeletePermanently,
          },
        ]}
      />
    </li>
  )
}
