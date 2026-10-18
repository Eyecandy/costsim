import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react"
import { createPortal } from "react-dom"
import { Menu } from "lucide-react"

import { AnalysisLibraryNav } from "@/features/analysis-library/AnalysisLibraryNav"
import {
  buildLibraryPath,
  readLibraryFilterFromLocation,
  type LibraryNavFilter,
} from "@/persistence/libraryNavigation"
import { BrandWordmark } from "@/shared/BrandWordmark"
import { PRODUCT_NAME } from "@/shared/brand"
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
import type { AnalysisFolder, AnalysisSummary } from "@/domain/analysis/analysisDocument"
import {
  buildAnalysisWorkspacePath,
  getLocationPathKey,
  LIBRARY_PATH,
  subscribeLocation,
} from "@/persistence/analysisLibraryRoutes"
import { navigateTo } from "@/shared/auth/auth"
import { cn } from "@/shared/utils"
import {
  HOME_RECENT_LIMIT,
  LIBRARY_MAIN_COLUMN,
  resolveLibraryHeading,
  type LibraryStatusFilter,
  type LibrarySortMode,
  type ConfirmKind,
  sortLibraryList,
  applyStatusFilter,
} from "@/features/analysis-library/page/libraryListModel"
import { LibraryListToolbarSelect } from "@/features/analysis-library/page/LibraryListToolbarSelect"
import { LibraryHomeContent } from "@/features/analysis-library/page/LibraryHomeContent"
import { TrashView } from "@/features/analysis-library/page/TrashView"
import { FolderNewAnalysisButton } from "@/features/analysis-library/page/LibraryNewAnalysisButtons"
import { LibraryListRow } from "@/features/analysis-library/page/LibraryListRows"

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
  const [statusFilter, setStatusFilter] = useState<LibraryStatusFilter>("all")
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
    setNewAnalysisFolderOverride(folderId !== undefined ? folderId : undefined)
    setNewAnalysisOpenRequest((n) => n + 1)
  }

  const isRealFolderView = filter.kind === "folder" && filter.folderId != null

  const folderIsEmpty = useMemo(() => {
    if (!isRealFolderView || filter.kind !== "folder") return false
    const folderId = filter.folderId
    return !summaries.some((a) => a.folderId === folderId)
  }, [isRealFolderView, filter, summaries])

  const recentForHome = useMemo(
    () =>
      summaries
        .slice()
        .sort((a, b) => new Date(b.lastOpenedAt).getTime() - new Date(a.lastOpenedAt).getTime())
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
  }, [summaries, trashItems, filter, recentForHome, statusFilter, sortMode, language])

  const pageHeading = useMemo(() => resolveLibraryHeading(filter, folders, t), [filter, folders, t])

  const emptyFilterMessage = useMemo(() => {
    const inFolder = filter.kind === "folder"
    if (statusFilter === "draft") {
      return inFolder ? t("library.noDraftsInFolder") : t("library.noDrafts")
    }
    if (statusFilter === "archived") {
      return inFolder ? t("library.noArchivedInFolder") : t("library.noArchived")
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
        isAnalysisNameConflictOnMoveError(error) || isAnalysisNameConflictError(error)
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
        <nav className="hidden w-56 shrink-0 md:block" aria-label={t("library.title")}>
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
              onDeletePermanently={(id) => setConfirm({ kind: "permanent", id })}
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
                            onMoveToTrash={() => setConfirm({ kind: "trash", id: item.id })}
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

      <div className="mt-auto flex justify-center pt-10 pb-8 text-center" role="contentinfo">
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
              onClick={(e) => {
                if (e.target !== e.currentTarget) return
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
                  <p className="m-0 mb-3 font-sans text-[12px] text-destructive" role="alert">
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
