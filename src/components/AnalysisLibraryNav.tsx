import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
  type ReactNode,
} from "react"
import { createPortal } from "react-dom"
import {
  ChevronDown,
  ChevronRight,
  FolderPlus,
  Archive,
  MoreHorizontal,
  Plus,
  Trash2,
} from "lucide-react"

import { ConfirmDialog } from "@/components/ConfirmDialog"
import { AnalysisModeIndicator } from "@/components/AnalysisModeIndicator"
import { MoveAnalysisDialog } from "@/components/MoveAnalysisDialog"
import { useI18n } from "@/i18n/useI18n"
import { getAnalysisLibraryRepository } from "@/lib/analysisLibraryRepository"
import {
  hasAnalysisNameConflict,
  isAnalysisNameConflictError,
  isAnalysisNameConflictOnMoveError,
} from "@/lib/analysisNameUniqueness"
import type {
  AnalysisFolder,
  AnalysisMode,
  AnalysisSummary,
} from "@/lib/analysisDocument"
import { DEFAULT_ANALYSIS_MODE } from "@/lib/analysisDocument"
import {
  buildAnalysisWorkspacePath,
  LIBRARY_PATH,
} from "@/lib/analysisLibraryRoutes"
import { navigateTo } from "@/lib/auth"
import { createBlankWorkspaceRuntimeState } from "@/lib/workspaceReset"
import { cn } from "@/lib/utils"

export type LibraryNavFilter =
  | { kind: "home" }
  | { kind: "all" }
  /** @deprecated Removed from sidebar; retained for type compatibility. */
  | { kind: "recent" }
  /** @deprecated Removed from sidebar; retained for type compatibility. */
  | { kind: "archived" }
  | { kind: "trash" }
  | { kind: "folder"; folderId: string | null }

/** Disclosure key for the synthetic "no folder" row under Mapper — not a nav section. */
const UNGROUPED_FOLDER_KEY = "__ungrouped__"

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
  const [expandedUserFolderIds, setExpandedUserFolderIds] = useState(
    () => new Set<string>(),
  )
  /**
   * Transient visual mark for a clicked folder row. Independent of `filter`
   * (which drives the main library view). Cleared on outside click.
   */
  const [folderHighlightKey, setFolderHighlightKey] = useState<string | null>(
    null,
  )
  const [newOpen, setNewOpen] = useState(false)
  const [newName, setNewName] = useState("")
  const [newAnalysisMode, setNewAnalysisMode] =
    useState<AnalysisMode>(DEFAULT_ANALYSIS_MODE)
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
  const [renameAnalysisTarget, setRenameAnalysisTarget] =
    useState<AnalysisSummary | null>(null)
  const [renameAnalysisValue, setRenameAnalysisValue] = useState("")
  const [renameAnalysisBusy, setRenameAnalysisBusy] = useState(false)
  const [renameAnalysisError, setRenameAnalysisError] = useState<string | null>(
    null,
  )
  const [moveAnalysisTarget, setMoveAnalysisTarget] =
    useState<AnalysisSummary | null>(null)
  const [moveAnalysisError, setMoveAnalysisError] = useState<string | null>(
    null,
  )
  const [trashAnalysisId, setTrashAnalysisId] = useState<string | null>(null)
  const [folderNotEmptyNotice, setFolderNotEmptyNotice] = useState<string | null>(
    null,
  )
  const folderNotEmptyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  )

  const refresh = useCallback(async () => {
    const [s, f] = await Promise.all([
      repo.listSummaries(),
      repo.listFolders(),
    ])
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
      folders
        .slice()
        .sort((a, b) =>
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
      if (
        hit instanceof HTMLElement &&
        hit.dataset.sidebarFolderHighlight === folderHighlightKey
      ) {
        return
      }
      setFolderHighlightKey(null)
    }
    document.addEventListener("pointerdown", onPointerDown, true)
    return () =>
      document.removeEventListener("pointerdown", onPointerDown, true)
  }, [folderHighlightKey])

  useEffect(() => {
    if (newAnalysisOpenRequest <= 0) return
    openNewAnalysisDialog(
      newAnalysisFolderOverride !== undefined
        ? newAnalysisFolderOverride
        : undefined,
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
    setNewFolderId(
      folderId !== undefined ? folderId : resolveNewAnalysisFolderPrefill(),
    )
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
      setFolderHighlightKey(
        next.folderId === null ? UNGROUPED_FOLDER_KEY : next.folderId,
      )
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
      if (
        filter.kind === "folder" &&
        filter.folderId === id
      ) {
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
        isAnalysisNameConflictOnMoveError(error) ||
          isAnalysisNameConflictError(error)
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
      <div
        className="flex shrink-0 flex-col gap-0.5"
        data-library-user-folders=""
      >
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
              onDelete={() =>
                requestDeleteFolder({ id: f.id, name: f.name })
              }
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
                <p className="m-0 font-sans text-[12px] text-destructive">
                  {createError}
                </p>
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
          <h2 className="m-0 mb-3 font-sans text-[15px] font-medium">
            {t("library.newFolder")}
          </h2>
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
          <h2 className="m-0 mb-1 font-sans text-[15px] font-medium">
            {folderCreated.name}
          </h2>
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
          <h2 className="m-0 mb-3 font-sans text-[15px] font-medium">
            {t("library.renameTitle")}
          </h2>
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

function AnalysisFolderPicker({
  folders,
  value,
  onChange,
  onRequestNewFolder,
}: {
  folders: AnalysisFolder[]
  value: string | null
  onChange: (folderId: string | null) => void
  onRequestNewFolder: () => void
}) {
  const { t } = useI18n()
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

  const selectedLabel =
    value == null
      ? t("library.noFolder")
      : (folders.find((f) => f.id === value)?.name ?? t("library.noFolder"))

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        className={cn(
          "flex h-9 w-full items-center justify-between gap-2 rounded-md border border-border bg-background px-2",
          "font-sans text-[13px] text-foreground",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        )}
        aria-label={t("library.folderLabel")}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="min-w-0 truncate">{selectedLabel}</span>
        <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
      </button>
      {open ? (
        <div
          id={menuId}
          role="listbox"
          aria-label={t("library.folderLabel")}
          className="absolute left-0 right-0 top-full z-[110] mt-1 max-h-56 overflow-y-auto rounded-md border border-border/60 bg-background py-1 shadow-md"
        >
          <button
            type="button"
            role="option"
            aria-selected={value == null}
            className={cn(
              "flex w-full px-3 py-1.5 text-left font-sans text-[12px] hover:bg-muted/60",
              value == null ? "font-medium text-foreground" : "text-foreground/90",
            )}
            onClick={() => {
              onChange(null)
              setOpen(false)
            }}
          >
            {t("library.noFolder")}
          </button>
          {folders.map((f) => (
            <button
              key={f.id}
              type="button"
              role="option"
              aria-selected={value === f.id}
              className={cn(
                "flex w-full px-3 py-1.5 text-left font-sans text-[12px] hover:bg-muted/60",
                value === f.id
                  ? "font-medium text-foreground"
                  : "text-foreground/90",
              )}
              onClick={() => {
                onChange(f.id)
                setOpen(false)
              }}
            >
              {f.name}
            </button>
          ))}
          <div className="my-1 border-t border-border/50" role="separator" />
          <button
            type="button"
            className="flex w-full items-center gap-1.5 px-3 py-1.5 text-left font-sans text-[12px] text-[#1d868c] hover:bg-muted/60"
            onClick={() => {
              setOpen(false)
              onRequestNewFolder()
            }}
          >
            <Plus className="size-3.5 shrink-0" aria-hidden />
            {t("library.newFolder")}
          </button>
        </div>
      ) : null}
    </div>
  )
}

function AnalysisRow({
  item,
  active,
  onOpen,
  className,
  archivedLabel,
  onRename,
  onMove,
  onTrash,
}: {
  item: AnalysisSummary
  active: boolean
  onOpen: () => void
  className?: string
  archivedLabel: string
  onRename?: () => void
  onMove?: () => void
  onTrash?: () => void
}) {
  const { t } = useI18n()
  const isArchived = item.status === "archived"
  const rowTitle = isArchived ? `${item.name} — ${archivedLabel}` : item.name
  const actionItems =
    onRename && onMove && onTrash
      ? [
          { label: t("library.renameAnalysis"), onSelect: onRename },
          { label: t("library.moveAnalysis"), onSelect: onMove },
          { label: t("library.delete"), onSelect: onTrash },
        ]
      : null
  return (
    <li
      className={cn(
        "group/sidebar-entity-row flex min-w-0 items-center gap-0.5 rounded",
        // One shared hover/active surface for name + ⋯
        active ? "bg-muted" : "hover:bg-muted/50",
      )}
      data-sidebar-entity-row="analysis"
    >
      <button
        type="button"
        title={rowTitle}
        aria-label={rowTitle}
        onClick={onOpen}
        className={cn(
          "flex min-w-0 flex-1 items-center rounded text-left font-sans",
          className,
          active ? "font-medium text-foreground" : "text-foreground/90",
        )}
      >
        <span className="inline-flex min-w-0 max-w-full items-center gap-1.5">
          <span className="min-w-0 truncate">{item.name}</span>
          <AnalysisModeIndicator mode={item.analysisMode} />
          {isArchived ? (
            <Archive
              className="size-3 shrink-0 text-muted-foreground"
              aria-hidden
              data-archived-icon=""
            />
          ) : null}
        </span>
      </button>
      {actionItems ? (
        <SidebarEntityActionsMenu
          items={actionItems}
          menuLabel={t("library.analysisActions")}
        />
      ) : null}
    </li>
  )
}

/**
 * One user-created folder row under Mapper (or the synthetic Ungrouped row).
 * Nested analyses render ONLY when `expanded` is true — not All analyses.
 */
export function UserFolderBlock({
  folderKey,
  label,
  expanded,
  onToggle,
  items,
  activeAnalysisId,
  onOpen,
  onSelectFolder,
  selected,
  rowClass,
  archivedLabel,
  onRename,
  onDelete,
  onRenameAnalysis,
  onMoveAnalysis,
  onTrashAnalysis,
}: {
  folderKey: string
  label: string
  expanded: boolean
  onToggle: () => void
  items: AnalysisSummary[]
  activeAnalysisId: string | null
  onOpen: (id: string) => void
  onSelectFolder: () => void
  selected: boolean
  rowClass?: string
  archivedLabel: string
  onRename?: () => void
  onDelete?: () => void
  onRenameAnalysis?: (item: AnalysisSummary) => void
  onMoveAnalysis?: (item: AnalysisSummary) => void
  onTrashAnalysis?: (id: string) => void
}) {
  const { t } = useI18n()
  const folderActionItems =
    onRename || onDelete
      ? [
          ...(onRename
            ? [{ label: t("library.renameFolder"), onSelect: onRename }]
            : []),
          ...(onDelete
            ? [{ label: t("library.deleteFolder"), onSelect: onDelete }]
            : []),
        ]
      : null

  return (
    <div
      className="mb-0.5"
      data-user-folder={folderKey}
      data-folder-expanded={expanded ? "true" : "false"}
    >
      <div
        className={cn(
          "group/sidebar-entity-row flex min-w-0 items-center gap-0.5 rounded",
          // One shared surface for chevron + name + ⋯ (collapsed or expanded).
          selected ? "bg-muted" : "hover:bg-muted/50",
        )}
        data-sidebar-entity-row="folder"
      >
        <button
          type="button"
          className={cn(
            "flex size-6 shrink-0 items-center justify-center rounded text-muted-foreground",
            "hover:text-foreground",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          )}
          aria-expanded={expanded}
          aria-label={label}
          onClick={onToggle}
        >
          {expanded ? (
            <ChevronDown className="size-3.5" aria-hidden />
          ) : (
            <ChevronRight className="size-3.5" aria-hidden />
          )}
        </button>
        <button
          type="button"
          title={label}
          data-sidebar-folder-highlight={folderKey}
          onClick={() => {
            // Name click expands/collapses the tree (same as chevron) and selects the folder view.
            onToggle()
            onSelectFolder()
          }}
          className={cn(
            "min-w-0 flex-1 truncate rounded text-left font-sans",
            rowClass,
            selected
              ? "font-medium text-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {label}
        </button>
        {folderActionItems ? (
          <SidebarEntityActionsMenu
            items={folderActionItems}
            menuLabel={t("library.folderActions")}
          />
        ) : null}
      </div>
      {expanded ? (
        <ul
          className="m-0 ml-3 list-none border-l border-border/40 py-0.5 pl-2"
          data-folder-children={folderKey}
        >
          {items.map((item) => (
            <AnalysisRow
              key={item.id}
              item={item}
              active={item.id === activeAnalysisId}
              onOpen={() => onOpen(item.id)}
              className={rowClass}
              archivedLabel={archivedLabel}
              onRename={
                onRenameAnalysis ? () => onRenameAnalysis(item) : undefined
              }
              onMove={onMoveAnalysis ? () => onMoveAnalysis(item) : undefined}
              onTrash={
                onTrashAnalysis ? () => onTrashAnalysis(item.id) : undefined
              }
            />
          ))}
          {items.length === 0 ? (
            <li className="px-2 py-1 font-sans text-[11px] text-muted-foreground">
              —
            </li>
          ) : null}
        </ul>
      ) : null}
    </div>
  )
}

/**
 * Shared trailing ⋯ for sidebar folder and analysis rows.
 * Hover/focus visibility is owned by parent `.group/sidebar-entity-row`.
 * Menu is portaled so overflow scrollports (folder list / sidebar) cannot clip it.
 */
function SidebarEntityActionsMenu({
  items,
  menuLabel,
}: {
  items: { label: string; onSelect: () => void }[]
  menuLabel: string
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const menuRef = useRef<HTMLDivElement | null>(null)
  const menuId = useId()
  const [menuPos, setMenuPos] = useState<{ top: number; right: number } | null>(
    null,
  )

  const updateMenuPos = useCallback(() => {
    const el = triggerRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    setMenuPos({
      top: r.bottom + 4,
      right: Math.max(8, window.innerWidth - r.right),
    })
  }, [])

  useEffect(() => {
    if (!menuOpen) {
      setMenuPos(null)
      return
    }
    updateMenuPos()
    window.addEventListener("resize", updateMenuPos)
    // Capture scroll from overflow ancestors (folder list, sidebar, etc.).
    window.addEventListener("scroll", updateMenuPos, true)
    return () => {
      window.removeEventListener("resize", updateMenuPos)
      window.removeEventListener("scroll", updateMenuPos, true)
    }
  }, [menuOpen, updateMenuPos])

  useEffect(() => {
    if (!menuOpen) return
    const onDoc = (e: MouseEvent) => {
      const target = e.target as Node
      if (triggerRef.current?.contains(target)) return
      if (menuRef.current?.contains(target)) return
      setMenuOpen(false)
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

  const menu =
    menuOpen && menuPos && typeof document !== "undefined"
      ? createPortal(
          <div
            ref={menuRef}
            id={menuId}
            role="menu"
            data-sidebar-entity-menu=""
            className="fixed z-[240] min-w-[9.5rem] rounded-md border border-border/60 bg-background py-1 shadow-md"
            style={{ top: menuPos.top, right: menuPos.right }}
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
          </div>,
          document.body,
        )
      : null

  return (
    <div
      className={cn(
        "relative shrink-0 transition-opacity duration-150",
        menuOpen
          ? "opacity-100"
          : cn(
              "opacity-0",
              "group-hover/sidebar-entity-row:opacity-100 group-focus-within/sidebar-entity-row:opacity-100",
              "[@media(hover:none)]:opacity-100",
            ),
      )}
      style={{ width: "1.5rem" }}
      data-sidebar-entity-actions=""
    >
      <button
        ref={triggerRef}
        type="button"
        className={cn(
          "flex size-6 items-center justify-center rounded text-muted-foreground",
          // Row owns hover surface — no nested action background.
          "hover:text-foreground",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        )}
        aria-label={menuLabel}
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        aria-controls={menuId}
        title={menuLabel}
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setMenuOpen((v) => !v)
        }}
        onMouseDown={(e) => {
          // Prevent parent row name/toggle from receiving the gesture.
          e.stopPropagation()
        }}
      >
        <MoreHorizontal className="size-3.5" aria-hidden />
      </button>
      {menu}
    </div>
  )
}

function DialogShell({
  children,
  onClose,
}: {
  children: ReactNode
  onClose: () => void
}) {
  if (typeof document === "undefined") return null
  return createPortal(
    <div
      className="fixed inset-0 z-[220] flex items-center justify-center bg-black/40 p-4"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-sm rounded-lg border border-border/60 bg-background p-4 shadow-md"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>,
    document.body,
  )
}
