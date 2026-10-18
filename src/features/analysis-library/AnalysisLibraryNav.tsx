import { useCallback, useEffect, useMemo, useRef, useState, type MutableRefObject } from "react"
import { FolderPlus, Plus, Trash2 } from "lucide-react"

import { ConfirmDialog } from "@/shared/ConfirmDialog"
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
  AnalysisMode,
  AnalysisSummary,
} from "@/domain/analysis/analysisDocument"
import { DEFAULT_ANALYSIS_MODE } from "@/domain/analysis/analysisDocument"
import { buildAnalysisWorkspacePath, LIBRARY_PATH } from "@/persistence/analysisLibraryRoutes"
import { navigateTo } from "@/shared/auth/auth"
import { createBlankWorkspaceRuntimeState } from "@/domain/analysis/workspaceReset"
import { cn } from "@/shared/utils"
import {
  type LibraryNavFilter,
  buildLibraryPath,
  runBeforeLeaveWithoutBlocking,
} from "@/persistence/libraryNavigation"
import { AnalysisFolderPicker } from "@/features/analysis-library/nav/AnalysisFolderPicker"
import { UserFolderBlock } from "@/features/analysis-library/nav/UserFolderBlock"
import { DialogShell } from "@/features/analysis-library/nav/DialogShell"

/** Disclosure key for the synthetic "no folder" row under Mapper — not a nav section. */
const UNGROUPED_FOLDER_KEY = "__ungrouped__"

function isOnLibraryPath(): boolean {
  return (
    typeof window !== "undefined" &&
    (window.location.pathname === LIBRARY_PATH ||
      window.location.pathname.startsWith(`${LIBRARY_PATH}/`))
  )
}

type AnalysisLibraryNavProps = {
  activeAnalysisId?: string | null
  /** Bump when library docs change (e.g. after archive) so lists refresh. */
  libraryEpoch?: string | number | null
  /** Called after navigating to an analysis (e.g. close overlay). */
  onNavigated?: () => void
  filter?: LibraryNavFilter
  onFilterChange?: (filter: LibraryNavFilter) => void
  /** Increment to open New Analysis. Optional folderId forces preselection. */
  newAnalysisOpenRequest?: number
  /**
   * When `newAnalysisOpenRequest` bumps: if set (including null), use as folder
   * prefill; if undefined, resolve from current nav/workspace context.
   */
  newAnalysisFolderOverride?: string | null
  /** Called after folder create/rename/delete so the parent list can refresh. */
  onLibraryChanged?: () => void
  /**
   * Flush pending draft autosave before leaving an analysis workspace for a
   * Library destination. Omitted on the Library page itself.
   */
  beforeLeaveWorkspace?: () => void | Promise<void>
  /**
   * Parent registers the same `openNewAnalysisFromToolbar` action used by the
   * sidebar `+ New analysis` button (e.g. empty-library Home CTA).
   */
  openNewAnalysisActionRef?: MutableRefObject<(() => void) | null>
  className?: string
}

export function AnalysisLibraryNav({
  activeAnalysisId = null,
  libraryEpoch = null,
  onNavigated,
  filter: controlledFilter,
  onFilterChange,
  newAnalysisOpenRequest = 0,
  newAnalysisFolderOverride,
  onLibraryChanged,
  beforeLeaveWorkspace,
  openNewAnalysisActionRef,
  className,
}: AnalysisLibraryNavProps) {
  const { t, language } = useI18n()
  const repo = getAnalysisLibraryRepository()
  const [summaries, setSummaries] = useState<AnalysisSummary[]>([])
  const [folders, setFolders] = useState<AnalysisFolder[]>([])
  const [internalFilter, setInternalFilter] = useState<LibraryNavFilter>({
    kind: "all",
  })
  const filter = controlledFilter ?? internalFilter
  const setFilter = onFilterChange ?? setInternalFilter
  /**
   * USER-CREATED folder tree under Mapper only (`UserFolderBlock`).
   * Empty ⇒ every real folder starts collapsed; nested analyses are not rendered.
   */
  const [expandedUserFolderIds, setExpandedUserFolderIds] = useState(() => new Set<string>())
  /**
   * Transient visual mark for a clicked folder row. Independent of `filter`
   * (which drives the main library view). Cleared on outside click.
   */
  const [folderHighlightKey, setFolderHighlightKey] = useState<string | null>(null)
  const [newOpen, setNewOpen] = useState(false)
  const [newName, setNewName] = useState("")
  const [newAnalysisMode, setNewAnalysisMode] = useState<AnalysisMode>(DEFAULT_ANALYSIS_MODE)
  const [newFolderId, setNewFolderId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [inlineFolderMode, setInlineFolderMode] = useState(false)
  const [inlineFolderName, setInlineFolderName] = useState("")
  const [inlineFolderCreating, setInlineFolderCreating] = useState(false)
  const [folderPromptOpen, setFolderPromptOpen] = useState(false)
  const [folderName, setFolderName] = useState("")
  const [folderCreating, setFolderCreating] = useState(false)
  const [folderCreated, setFolderCreated] = useState<{
    id: string
    name: string
  } | null>(null)
  const [renameFolderTarget, setRenameFolderTarget] = useState<{
    id: string
    name: string
  } | null>(null)
  const [renameFolderValue, setRenameFolderValue] = useState("")
  const [renameFolderBusy, setRenameFolderBusy] = useState(false)
  const [deleteFolderTarget, setDeleteFolderTarget] = useState<{
    id: string
    name: string
  } | null>(null)
  const [renameAnalysisTarget, setRenameAnalysisTarget] = useState<AnalysisSummary | null>(null)
  const [renameAnalysisValue, setRenameAnalysisValue] = useState("")
  const [renameAnalysisBusy, setRenameAnalysisBusy] = useState(false)
  const [renameAnalysisError, setRenameAnalysisError] = useState<string | null>(null)
  const [moveAnalysisTarget, setMoveAnalysisTarget] = useState<AnalysisSummary | null>(null)
  const [moveAnalysisError, setMoveAnalysisError] = useState<string | null>(null)
  const [trashAnalysisId, setTrashAnalysisId] = useState<string | null>(null)
  const [folderNotEmptyNotice, setFolderNotEmptyNotice] = useState<string | null>(null)
  const folderNotEmptyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const refresh = useCallback(async () => {
    const [s, f] = await Promise.all([repo.listSummaries(), repo.listFolders()])
    setSummaries(s)
    setFolders(f)
  }, [repo])

  const notifyLibraryChanged = useCallback(() => {
    onLibraryChanged?.()
  }, [onLibraryChanged])

  const showFolderNotEmptyNotice = useCallback(() => {
    setFolderNotEmptyNotice(t("library.folderNotEmpty"))
    if (folderNotEmptyTimerRef.current) {
      clearTimeout(folderNotEmptyTimerRef.current)
    }
    folderNotEmptyTimerRef.current = setTimeout(() => {
      setFolderNotEmptyNotice(null)
      folderNotEmptyTimerRef.current = null
    }, 4500)
  }, [t])

  /** Display-only alphabetical order; does not mutate stored folder data. */
  const foldersSorted = useMemo(
    () =>
      folders.slice().sort((a, b) =>
        a.name.localeCompare(b.name, language === "en" ? "en" : "nb", {
          sensitivity: "base",
        }),
      ),
    [folders, language],
  )

  useEffect(() => {
    void refresh()
  }, [refresh, activeAnalysisId, libraryEpoch])

  // Only when a workspace analysis is open (App passes activeAnalysisId).
  // Library Home does not pass it, so user folders stay collapsed there.
  useEffect(() => {
    if (!activeAnalysisId) return
    const hit = summaries.find((s) => s.id === activeAnalysisId)
    if (!hit?.folderId) return
    setExpandedUserFolderIds((prev) => {
      if (prev.has(hit.folderId!)) return prev
      return new Set(prev).add(hit.folderId!)
    })
  }, [activeAnalysisId, summaries])

  // Clear transient folder highlight on outside click; keep current filter/view.
  useEffect(() => {
    if (folderHighlightKey == null) return
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target
      if (!(target instanceof Element)) return
      const hit = target.closest("[data-sidebar-folder-highlight]")
      if (hit instanceof HTMLElement && hit.dataset.sidebarFolderHighlight === folderHighlightKey) {
        return
      }
      setFolderHighlightKey(null)
    }
    document.addEventListener("pointerdown", onPointerDown, true)
    return () => document.removeEventListener("pointerdown", onPointerDown, true)
  }, [folderHighlightKey])

  useEffect(() => {
    if (newAnalysisOpenRequest <= 0) return
    openNewAnalysisDialog(
      newAnalysisFolderOverride !== undefined ? newAnalysisFolderOverride : undefined,
    )
    // Intentionally depend only on the request counter; folder pref is read at open time.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newAnalysisOpenRequest])

  /** Prefill folder only from real folder scope or open workspace analysis folder. */
  const resolveNewAnalysisFolderPrefill = (): string | null => {
    if (filter.kind === "folder") return filter.folderId
    if (activeAnalysisId) {
      const hit = summaries.find((s) => s.id === activeAnalysisId)
      if (hit?.folderId) return hit.folderId
    }
    return null
  }

  const openNewAnalysisDialog = (folderId?: string | null) => {
    setNewName("")
    setNewAnalysisMode(DEFAULT_ANALYSIS_MODE)
    setNewFolderId(folderId !== undefined ? folderId : resolveNewAnalysisFolderPrefill())
    setInlineFolderMode(false)
    setInlineFolderName("")
    setFolderCreated(null)
    setCreateError(null)
    setNewOpen(true)
  }

  const closeNewAnalysisDialog = () => {
    setNewOpen(false)
    setInlineFolderMode(false)
    setInlineFolderName("")
    setCreating(false)
    setCreateError(null)
    setNewAnalysisMode(DEFAULT_ANALYSIS_MODE)
  }

  /**
   * Direct Library destinations from `/library` or an open analysis workspace.
   * Uses canonical `/library?view=…` URLs (not sessionStorage handoff).
   */
  const goToLibraryDestination = async (next: LibraryNavFilter) => {
    if (next.kind === "folder") {
      setFolderHighlightKey(next.folderId === null ? UNGROUPED_FOLDER_KEY : next.folderId)
    } else {
      setFolderHighlightKey(null)
    }

    if (!isOnLibraryPath()) {
      await runBeforeLeaveWithoutBlocking(beforeLeaveWorkspace)
    }

    navigateTo(buildLibraryPath(next))
    onNavigated?.()
  }

  const selectUserFolder = (folderId: string | null) => {
    void goToLibraryDestination({ kind: "folder", folderId })
  }

  const openNewAnalysisFromToolbar = () => {
    if (isOnLibraryPath()) {
      openNewAnalysisDialog()
      return
    }
    void (async () => {
      await runBeforeLeaveWithoutBlocking(beforeLeaveWorkspace)
      openNewAnalysisDialog()
    })()
  }

  // Expose the exact sidebar New Analysis action (not a parallel create path).
  if (openNewAnalysisActionRef) {
    openNewAnalysisActionRef.current = openNewAnalysisFromToolbar
  }

  const toggleUserFolderExpanded = (folderKey: string) => {
    setExpandedUserFolderIds((prev) => {
      const next = new Set(prev)
      if (next.has(folderKey)) next.delete(folderKey)
      else next.add(folderKey)
      return next
    })
  }

  const expandUserFolder = (folderKey: string) => {
    setExpandedUserFolderIds((prev) => {
      if (prev.has(folderKey)) return prev
      return new Set(prev).add(folderKey)
    })
  }

  const openAnalysis = (id: string) => {
    navigateTo(buildAnalysisWorkspacePath(id))
    onNavigated?.()
  }

  const handleCreate = async () => {
    const name = newName.trim()
    if (!name || creating || inlineFolderMode) return
    setCreating(true)
    setCreateError(null)
    const preferredFolder = newFolderId
    if (
      hasAnalysisNameConflict({
        name,
        folderId: preferredFolder,
        analyses: summaries,
      })
    ) {
      setCreateError(t("library.duplicateNameInFolder"))
      setCreating(false)
      return
    }
    try {
      const blank = createBlankWorkspaceRuntimeState()
      const doc = await repo.create({
        name,
        folderId: preferredFolder,
        analysisMode: newAnalysisMode,
        workspace: {
          projects: blank.projects,
          activeProjectId: blank.activeProjectId,
        },
      })
      // Navigate only after the authoritative repository can resolve the new id.
      const verified = await repo.get(doc.id)
      if (!verified || verified.deletedAt) {
        setCreateError(t("library.createFailed"))
        return
      }
      if (preferredFolder) {
        expandUserFolder(preferredFolder)
      }
      await refresh()
      notifyLibraryChanged()
      const openId = verified.id
      closeNewAnalysisDialog()
      setNewName("")
      setNewAnalysisMode(DEFAULT_ANALYSIS_MODE)
      navigateTo(buildAnalysisWorkspacePath(openId))
      onNavigated?.()
    } catch (error) {
      setCreateError(
        isAnalysisNameConflictError(error)
          ? t("library.duplicateNameInFolder")
          : t("library.createFailed"),
      )
    } finally {
      setCreating(false)
    }
  }

  const handleInlineCreateFolder = async () => {
    const name = inlineFolderName.trim()
    if (!name || inlineFolderCreating) return
    setInlineFolderCreating(true)
    try {
      const folder = await repo.createFolder(name)
      await refresh()
      notifyLibraryChanged()
      expandUserFolder(folder.id)
      setNewFolderId(folder.id)
      setInlineFolderMode(false)
      setInlineFolderName("")
    } finally {
      setInlineFolderCreating(false)
    }
  }

  const cancelInlineCreateFolder = () => {
    setInlineFolderMode(false)
    setInlineFolderName("")
  }

  const handleCreateFolder = async () => {
    const name = folderName.trim()
    if (!name || folderCreating) return
    setFolderCreating(true)
    try {
      const folder = await repo.createFolder(name)
      setFolderPromptOpen(false)
      setFolderName("")
      await refresh()
      notifyLibraryChanged()
      expandUserFolder(folder.id)
      selectUserFolder(folder.id)
      setFolderCreated({ id: folder.id, name: folder.name })
    } finally {
      setFolderCreating(false)
    }
  }

  const handleRenameFolder = async () => {
    if (!renameFolderTarget) return
    const name = renameFolderValue.trim()
    if (!name || renameFolderBusy) return
    setRenameFolderBusy(true)
    try {
      await repo.renameFolder(renameFolderTarget.id, name)
      setRenameFolderTarget(null)
      setRenameFolderValue("")
      await refresh()
      notifyLibraryChanged()
    } finally {
      setRenameFolderBusy(false)
    }
  }

  const requestDeleteFolder = (folder: { id: string; name: string }) => {
    const activeCount = summaries.filter((s) => s.folderId === folder.id).length
    if (activeCount > 0) {
      showFolderNotEmptyNotice()
      return
    }
    setDeleteFolderTarget(folder)
  }

  const confirmDeleteFolder = async () => {
    if (!deleteFolderTarget) return
    const id = deleteFolderTarget.id
    setDeleteFolderTarget(null)
    try {
      await repo.deleteFolder(id)
      if (filter.kind === "folder" && filter.folderId === id) {
        setFilter({ kind: "all" })
      }
      setExpandedUserFolderIds((prev) => {
        if (!prev.has(id)) return prev
        const next = new Set(prev)
        next.delete(id)
        return next
      })
      await refresh()
      notifyLibraryChanged()
    } catch {
      showFolderNotEmptyNotice()
      await refresh()
    }
  }

  const commitRenameAnalysis = async () => {
    if (!renameAnalysisTarget) return
    const trimmed = renameAnalysisValue.trim()
    if (!trimmed || renameAnalysisBusy) return
    setRenameAnalysisBusy(true)
    setRenameAnalysisError(null)
    if (
      hasAnalysisNameConflict({
        name: trimmed,
        folderId: renameAnalysisTarget.folderId ?? null,
        analyses: summaries,
        excludeId: renameAnalysisTarget.id,
      })
    ) {
      setRenameAnalysisError(t("library.duplicateNameInFolder"))
      setRenameAnalysisBusy(false)
      return
    }
    try {
      await repo.touchMetadata(renameAnalysisTarget.id, { name: trimmed })
      setRenameAnalysisTarget(null)
      setRenameAnalysisValue("")
      setRenameAnalysisError(null)
      await refresh()
      notifyLibraryChanged()
    } catch (error) {
      setRenameAnalysisError(
        isAnalysisNameConflictError(error)
          ? t("library.duplicateNameInFolder")
          : t("library.saveError"),
      )
    } finally {
      setRenameAnalysisBusy(false)
    }
  }

  const commitMoveAnalysis = async (folderId: string | null) => {
    if (!moveAnalysisTarget) return
    setMoveAnalysisError(null)
    if (
      hasAnalysisNameConflict({
        name: moveAnalysisTarget.name,
        folderId,
        analyses: summaries,
        excludeId: moveAnalysisTarget.id,
      })
    ) {
      setMoveAnalysisError(t("library.duplicateNameOnMove"))
      throw new Error("duplicate_analysis_name_on_move")
    }
    try {
      await repo.touchMetadata(moveAnalysisTarget.id, { folderId })
      setMoveAnalysisTarget(null)
      setMoveAnalysisError(null)
      await refresh()
      notifyLibraryChanged()
    } catch (error) {
      setMoveAnalysisError(
        isAnalysisNameConflictOnMoveError(error) || isAnalysisNameConflictError(error)
          ? t("library.duplicateNameOnMove")
          : t("library.saveError"),
      )
      throw error
    }
  }

  const confirmTrashAnalysis = async () => {
    if (!trashAnalysisId) return
    const id = trashAnalysisId
    setTrashAnalysisId(null)
    if (id === activeAnalysisId) {
      await runBeforeLeaveWithoutBlocking(beforeLeaveWorkspace)
    }
    await repo.moveToTrash(id)
    await refresh()
    notifyLibraryChanged()
    if (id === activeAnalysisId) {
      navigateTo(LIBRARY_PATH)
      onNavigated?.()
    }
  }

  const analysesInFolder = (folderId: string | null) =>
    summaries.filter((s) => s.folderId === folderId)

  const textPad = "px-2 py-1.5 text-[12px]"
  const navItemClass = (selected: boolean) =>
    cn(
      "flex w-full items-center gap-1.5 rounded text-left font-sans",
      textPad,
      selected
        ? "bg-muted font-medium text-foreground"
        : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
    )

  return (
    <div className={cn("flex h-full min-h-0 flex-col gap-3", className)}>
      <button
        type="button"
        className={cn(
          "flex items-center gap-1.5 rounded text-left font-sans font-medium text-[#1d868c] hover:bg-muted/60",
          textPad,
        )}
        onClick={() => openNewAnalysisFromToolbar()}
      >
        <Plus className="size-3.5 shrink-0" aria-hidden />
        {t("library.newAnalysis")}
      </button>

      {/* USER-CREATED folders (Mapper). Not All / Recent / Archived. */}
      <div className="flex shrink-0 flex-col gap-0.5" data-library-user-folders="">
        <div
          className={cn(
            "group/folders-header flex items-center gap-1 rounded-md px-2 py-0.5",
            // One shared surface for label + Folder-plus (no nested icon hover box).
            "hover:bg-muted/50",
          )}
        >
          <span className="min-w-0 flex-1 font-sans text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            {t("library.folders")}
          </span>
          <div
            className={cn(
              "shrink-0 transition-opacity duration-150",
              // Same reveal pattern as sidebar entity ⋯ actions.
              "opacity-0",
              "group-hover/folders-header:opacity-100 group-focus-within/folders-header:opacity-100",
              "[@media(hover:none)]:opacity-100",
            )}
            style={{ width: "1.5rem" }}
          >
            <button
              type="button"
              aria-label={t("library.newFolder")}
              title={t("library.newFolder")}
              onClick={() => setFolderPromptOpen(true)}
              className={cn(
                "flex size-6 items-center justify-center rounded text-muted-foreground",
                "hover:text-foreground",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background",
              )}
            >
              <FolderPlus className="size-3.5" aria-hidden />
            </button>
          </div>
        </div>
        <div className="mt-1 max-h-[38vh] overflow-y-auto">
          <UserFolderBlock
            folderKey={UNGROUPED_FOLDER_KEY}
            label={t("library.ungrouped")}
            expanded={expandedUserFolderIds.has(UNGROUPED_FOLDER_KEY)}
            onToggle={() => toggleUserFolderExpanded(UNGROUPED_FOLDER_KEY)}
            items={analysesInFolder(null)}
            activeAnalysisId={activeAnalysisId}
            onOpen={openAnalysis}
            onSelectFolder={() => selectUserFolder(null)}
            selected={folderHighlightKey === UNGROUPED_FOLDER_KEY}
            rowClass={textPad}
            archivedLabel={t("library.statusArchived")}
            onRenameAnalysis={(item) => {
              setRenameAnalysisError(null)
              setRenameAnalysisTarget(item)
              setRenameAnalysisValue(item.name)
            }}
            onMoveAnalysis={(item) => {
              setMoveAnalysisError(null)
              setMoveAnalysisTarget(item)
            }}
            onTrashAnalysis={(id) => setTrashAnalysisId(id)}
          />
          {foldersSorted.map((f) => (
            <UserFolderBlock
              key={f.id}
              folderKey={f.id}
              label={f.name}
              expanded={expandedUserFolderIds.has(f.id)}
              onToggle={() => toggleUserFolderExpanded(f.id)}
              items={analysesInFolder(f.id)}
              activeAnalysisId={activeAnalysisId}
              onOpen={openAnalysis}
              onSelectFolder={() => selectUserFolder(f.id)}
              selected={folderHighlightKey === f.id}
              rowClass={textPad}
              archivedLabel={t("library.statusArchived")}
              onRename={() => {
                setRenameFolderTarget({ id: f.id, name: f.name })
                setRenameFolderValue(f.name)
              }}
              onDelete={() => requestDeleteFolder({ id: f.id, name: f.name })}
              onRenameAnalysis={(item) => {
                setRenameAnalysisError(null)
                setRenameAnalysisTarget(item)
                setRenameAnalysisValue(item.name)
              }}
              onMoveAnalysis={(item) => {
                setMoveAnalysisError(null)
                setMoveAnalysisTarget(item)
              }}
              onTrashAnalysis={(id) => setTrashAnalysisId(id)}
            />
          ))}
        </div>
        {folderNotEmptyNotice ? (
          <p
            className="m-0 px-2 pt-1 font-sans text-[10px] leading-snug text-muted-foreground"
            role="status"
            aria-live="polite"
          >
            {folderNotEmptyNotice}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-0.5 border-t border-border/40 pt-2">
        <button
          type="button"
          className={navItemClass(filter.kind === "all")}
          aria-current={filter.kind === "all" ? "page" : undefined}
          onClick={() => {
            void goToLibraryDestination({ kind: "all" })
          }}
        >
          {t("library.allAnalyses")}
        </button>
      </div>

      <div className="mt-auto border-t border-border/40 pt-2">
        <button
          type="button"
          className={navItemClass(filter.kind === "trash")}
          aria-current={filter.kind === "trash" ? "page" : undefined}
          onClick={() => {
            void goToLibraryDestination({ kind: "trash" })
          }}
        >
          <Trash2 className="size-3.5 shrink-0" aria-hidden />
          {t("library.trash")}
        </button>
      </div>

      {newOpen ? (
        <DialogShell onClose={closeNewAnalysisDialog}>
          <h2 className="m-0 mb-3 font-sans text-[15px] font-medium">
            {t("library.newAnalysisTitle")}
          </h2>
          <label className="mb-3 flex flex-col gap-1">
            <span className="font-sans text-[11px] text-muted-foreground">
              {t("library.nameLabel")}
            </span>
            <input
              autoFocus={!inlineFolderMode}
              className="h-9 rounded-md border border-border bg-background px-2 font-sans text-[13px]"
              value={newName}
              onChange={(e) => {
                setNewName(e.target.value)
                if (createError) setCreateError(null)
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !inlineFolderMode) void handleCreate()
              }}
            />
          </label>
          <fieldset className="mb-3 m-0 min-w-0 border-0 p-0">
            <legend className="mb-1.5 font-sans text-[11px] text-muted-foreground">
              {t("library.analysisModeLabel")}
            </legend>
            <div className="flex flex-col gap-1.5">
              {(
                [
                  {
                    id: "single" as const,
                    labelKey: "library.analysisModeSingle",
                    hintKey: "library.analysisModeSingleHint",
                  },
                  {
                    id: "ongoing" as const,
                    labelKey: "library.analysisModeOngoing",
                    hintKey: "library.analysisModeOngoingHint",
                  },
                ] as const
              ).map((mode) => {
                const selected = newAnalysisMode === mode.id
                return (
                  <button
                    key={mode.id}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    data-analysis-mode-option={mode.id}
                    disabled={inlineFolderMode}
                    onClick={() => setNewAnalysisMode(mode.id)}
                    className={cn(
                      "rounded-md border px-2.5 py-2 text-left transition-colors",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background",
                      "disabled:opacity-50",
                      selected
                        ? "border-[#1d868c]/55 bg-[rgba(29,134,140,0.08)]"
                        : "border-border/60 bg-transparent hover:border-border",
                    )}
                  >
                    <span
                      className={cn(
                        "block font-sans text-[13px] font-medium",
                        selected ? "text-[#1d868c]" : "text-foreground",
                      )}
                    >
                      {t(mode.labelKey)}
                    </span>
                    <span className="mt-0.5 block font-sans text-[11px] leading-snug text-muted-foreground">
                      {t(mode.hintKey)}
                    </span>
                  </button>
                )
              })}
            </div>
          </fieldset>
          <div className="mb-4 flex flex-col gap-1">
            <span className="font-sans text-[11px] text-muted-foreground">
              {t("library.folderLabel")}
            </span>
            {inlineFolderMode ? (
              <div className="flex flex-col gap-2">
                <span className="font-sans text-[12px] font-medium text-foreground">
                  {t("library.newFolder")}
                </span>
                <input
                  autoFocus
                  className="h-9 rounded-md border border-border bg-background px-2 font-sans text-[13px]"
                  placeholder={t("library.newFolderPrompt")}
                  value={inlineFolderName}
                  onChange={(e) => setInlineFolderName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void handleInlineCreateFolder()
                    if (e.key === "Escape") {
                      e.stopPropagation()
                      cancelInlineCreateFolder()
                    }
                  }}
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    className="h-8 rounded-md px-3 font-sans text-[12px] text-muted-foreground hover:bg-muted"
                    onClick={cancelInlineCreateFolder}
                  >
                    {t("common.cancel")}
                  </button>
                  <button
                    type="button"
                    className="h-8 rounded-md bg-[#1d868c] px-3 font-sans text-[12px] text-white hover:bg-[#1d868c]/90 disabled:opacity-50"
                    disabled={!inlineFolderName.trim() || inlineFolderCreating}
                    onClick={() => void handleInlineCreateFolder()}
                  >
                    {t("library.create")}
                  </button>
                </div>
              </div>
            ) : (
              <AnalysisFolderPicker
                folders={foldersSorted}
                value={newFolderId}
                onChange={setNewFolderId}
                onRequestNewFolder={() => {
                  setInlineFolderName("")
                  setInlineFolderMode(true)
                }}
              />
            )}
          </div>
          {!inlineFolderMode ? (
            <div className="flex flex-col gap-2">
              {createError ? (
                <p className="m-0 font-sans text-[12px] text-destructive">{createError}</p>
              ) : null}
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  className="h-8 rounded-md px-3 font-sans text-[12px] text-muted-foreground hover:bg-muted"
                  onClick={closeNewAnalysisDialog}
                >
                  {t("common.cancel")}
                </button>
                <button
                  type="button"
                  className="h-8 rounded-md bg-[#1d868c] px-3 font-sans text-[12px] text-white hover:bg-[#1d868c]/90 disabled:opacity-50"
                  disabled={!newName.trim() || creating}
                  onClick={() => void handleCreate()}
                >
                  {t("library.create")}
                </button>
              </div>
            </div>
          ) : null}
        </DialogShell>
      ) : null}

      {folderPromptOpen ? (
        <DialogShell
          onClose={() => {
            setFolderPromptOpen(false)
            setFolderName("")
          }}
        >
          <h2 className="m-0 mb-3 font-sans text-[15px] font-medium">{t("library.newFolder")}</h2>
          <input
            autoFocus
            className="mb-4 h-9 w-full rounded-md border border-border bg-background px-2 font-sans text-[13px]"
            placeholder={t("library.newFolderPrompt")}
            value={folderName}
            onChange={(e) => setFolderName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void handleCreateFolder()
            }}
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="h-8 rounded-md px-3 font-sans text-[12px] text-muted-foreground hover:bg-muted"
              onClick={() => {
                setFolderPromptOpen(false)
                setFolderName("")
              }}
            >
              {t("common.cancel")}
            </button>
            <button
              type="button"
              className="h-8 rounded-md bg-[#1d868c] px-3 font-sans text-[12px] text-white hover:bg-[#1d868c]/90 disabled:opacity-50"
              disabled={!folderName.trim() || folderCreating}
              onClick={() => void handleCreateFolder()}
            >
              {t("library.create")}
            </button>
          </div>
        </DialogShell>
      ) : null}

      {folderCreated ? (
        <DialogShell onClose={() => setFolderCreated(null)}>
          <h2 className="m-0 mb-1 font-sans text-[15px] font-medium">{folderCreated.name}</h2>
          <p className="m-0 mb-4 font-sans text-[13px] text-muted-foreground">
            {t("library.folderCreatedBody")}
          </p>
          <div className="flex flex-wrap justify-end gap-2">
            <button
              type="button"
              className="h-8 rounded-md px-3 font-sans text-[12px] text-muted-foreground hover:bg-muted"
              onClick={() => setFolderCreated(null)}
            >
              {t("library.done")}
            </button>
            <button
              type="button"
              className="h-8 rounded-md bg-[#1d868c] px-3 font-sans text-[12px] text-white hover:bg-[#1d868c]/90"
              onClick={() => {
                const id = folderCreated.id
                setFolderCreated(null)
                openNewAnalysisDialog(id)
              }}
            >
              {t("library.createAnalysis")}
            </button>
          </div>
        </DialogShell>
      ) : null}

      {renameFolderTarget ? (
        <DialogShell
          onClose={() => {
            setRenameFolderTarget(null)
            setRenameFolderValue("")
          }}
        >
          <h2 className="m-0 mb-3 font-sans text-[15px] font-medium">
            {t("library.renameFolderTitle")}
          </h2>
          <input
            autoFocus
            className="mb-4 h-9 w-full rounded-md border border-border bg-background px-2 font-sans text-[13px]"
            value={renameFolderValue}
            onChange={(e) => setRenameFolderValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void handleRenameFolder()
            }}
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="h-8 rounded-md px-3 font-sans text-[12px] text-muted-foreground hover:bg-muted"
              onClick={() => {
                setRenameFolderTarget(null)
                setRenameFolderValue("")
              }}
            >
              {t("common.cancel")}
            </button>
            <button
              type="button"
              className="h-8 rounded-md bg-[#1d868c] px-3 font-sans text-[12px] text-white hover:bg-[#1d868c]/90 disabled:opacity-50"
              disabled={!renameFolderValue.trim() || renameFolderBusy}
              onClick={() => void handleRenameFolder()}
            >
              {t("common.confirm")}
            </button>
          </div>
        </DialogShell>
      ) : null}

      <ConfirmDialog
        open={deleteFolderTarget != null}
        title={t("library.deleteFolderConfirmTitle")}
        message={t("library.deleteFolderConfirm")}
        cancelLabel={t("common.cancel")}
        confirmLabel={t("library.deleteFolderConfirmAction")}
        onCancel={() => setDeleteFolderTarget(null)}
        onConfirm={() => void confirmDeleteFolder()}
      />

      <ConfirmDialog
        open={trashAnalysisId != null}
        title={t("library.deleteConfirmTitle")}
        message={t("library.deleteConfirm")}
        cancelLabel={t("common.cancel")}
        confirmLabel={t("library.deleteConfirmAction")}
        onCancel={() => setTrashAnalysisId(null)}
        onConfirm={() => void confirmTrashAnalysis()}
      />

      {renameAnalysisTarget ? (
        <DialogShell
          onClose={() => {
            setRenameAnalysisTarget(null)
            setRenameAnalysisValue("")
            setRenameAnalysisError(null)
          }}
        >
          <h2 className="m-0 mb-3 font-sans text-[15px] font-medium">{t("library.renameTitle")}</h2>
          <input
            autoFocus
            className="mb-2 h-9 w-full rounded-md border border-border bg-background px-2 font-sans text-[13px]"
            value={renameAnalysisValue}
            onChange={(e) => {
              setRenameAnalysisValue(e.target.value)
              if (renameAnalysisError) setRenameAnalysisError(null)
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") void commitRenameAnalysis()
            }}
          />
          {renameAnalysisError ? (
            <p className="m-0 mb-3 font-sans text-[12px] text-destructive" role="alert">
              {renameAnalysisError}
            </p>
          ) : (
            <div className="mb-3" />
          )}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="h-8 rounded-md px-3 font-sans text-[12px] text-muted-foreground hover:bg-muted"
              onClick={() => {
                setRenameAnalysisTarget(null)
                setRenameAnalysisValue("")
                setRenameAnalysisError(null)
              }}
            >
              {t("common.cancel")}
            </button>
            <button
              type="button"
              className="h-8 rounded-md bg-[#1d868c] px-3 font-sans text-[12px] text-white hover:bg-[#1d868c]/90 disabled:opacity-50"
              disabled={!renameAnalysisValue.trim() || renameAnalysisBusy}
              onClick={() => void commitRenameAnalysis()}
            >
              {t("common.confirm")}
            </button>
          </div>
        </DialogShell>
      ) : null}

      <MoveAnalysisDialog
        open={moveAnalysisTarget != null}
        analysisName={moveAnalysisTarget?.name ?? ""}
        currentFolderId={moveAnalysisTarget?.folderId ?? null}
        folders={folders}
        error={moveAnalysisError}
        onClose={() => {
          setMoveAnalysisTarget(null)
          setMoveAnalysisError(null)
        }}
        onMoved={async (folderId) => {
          await commitMoveAnalysis(folderId)
        }}
      />
    </div>
  )
}
