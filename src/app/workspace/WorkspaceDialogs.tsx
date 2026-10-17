import { AddAlternativeDialog } from "@/features/workspace/AddAlternativeDialog"
import { CreateNextCheckpointDialog } from "@/features/checkpoints/CreateNextCheckpointDialog"
import {
  StartOngoingFromArchiveDialog,
} from "@/features/analysis-library/StartOngoingFromArchiveDialog"
import { SaveAndContinueLaterDialog } from "@/features/analysis-library/SaveAndContinueLaterDialog"
import type { Project } from "@/domain/analysis/project"
import { useI18n } from "@/i18n/useI18n"
import { ConfirmDialog } from "@/shared/ConfirmDialog"
import { navigateTo } from "@/shared/auth/auth"
import { buildAnalysisWorkspacePath, LIBRARY_PATH } from "@/persistence/analysisLibraryRoutes"
import { canCreateNextCheckpoint } from "@/domain/analysis/analysisCheckpoint"
import {
  isAnalysisNameConflictError,
  isAnalysisNameConflictOnMoveError,
} from "@/domain/analysis/analysisNameUniqueness"
import { RenameAnalysisDialog } from "@/app/workspace/RenameAnalysisDialog"
import type { Dispatch, RefObject, SetStateAction } from "react"
import type { useLibraryAnalysisSession } from "@/features/analysis-library/useLibraryAnalysisSession"

import type { useAnalysisDialogs } from "@/app/workspace/useAnalysisDialogs"
import type { ArchiveBlockReason } from "@/domain/analysis/buildArchivedAnalysisSnapshot"

export function WorkspaceDialogs({
  dialogs,
  addAlternativeOpen,
  confirmDeleteProject,
  deleteProjectConfirmOpen,
  deleteProjectConfirmTargetRef,
  handleCopyExistingAlternative,
  handleCreateBlankAlternative,
  isOngoingAnalysis,
  librarySession,
  projects,
  setAddAlternativeOpen,
  setDeleteProjectConfirmOpen,
  showArchiveBlockedNotice,
  showFinishOngoingNotice,
}: {
  dialogs: ReturnType<typeof useAnalysisDialogs>
  addAlternativeOpen: boolean
  confirmDeleteProject: () => void
  deleteProjectConfirmOpen: boolean
  deleteProjectConfirmTargetRef: RefObject<string | null>
  handleCopyExistingAlternative: (sourceId: string) => void
  handleCreateBlankAlternative: () => void
  isOngoingAnalysis: boolean
  librarySession: ReturnType<typeof useLibraryAnalysisSession>
  projects: Project[]
  setAddAlternativeOpen: Dispatch<SetStateAction<boolean>>
  setDeleteProjectConfirmOpen: Dispatch<SetStateAction<boolean>>
  showArchiveBlockedNotice: (reason: ArchiveBlockReason) => void
  showFinishOngoingNotice: (kind: 'need_archive_checkpoint' | 'failed') => void
}) {
  const { t } = useI18n()
  const {
    archiveConfirmOpen,
    setArchiveConfirmOpen,
    nextCheckpointOpen,
    setNextCheckpointOpen,
    trashConfirmOpen,
    setTrashConfirmOpen,
    renameOpen,
    setRenameOpen,
    startOngoingDialogOpen,
    setStartOngoingDialogOpen,
    startOngoingAlternatives,
    setStartOngoingAlternatives,
    setStartOngoingError,
    renameValue,
    setRenameValue,
    renameError,
    setRenameError,
    saveContinueOpen,
    setSaveContinueOpen,
    saveContinueError,
    setSaveContinueError,
    finishOngoingConfirmOpen,
    setFinishOngoingConfirmOpen,
    deleteCheckpointConfirmOpen,
    setDeleteCheckpointConfirmOpen,
  } = dialogs
  return (
    <>
      <ConfirmDialog
        open={archiveConfirmOpen}
        message={
          isOngoingAnalysis
            ? t("checkpoints.archiveCheckpointConfirm")
            : t("library.archiveConfirm")
        }
        cancelLabel={t("common.cancel")}
        confirmLabel={
          isOngoingAnalysis
            ? t("checkpoints.archiveCheckpointConfirmAction")
            : t("library.archiveConfirmAction")
        }
        onCancel={() => setArchiveConfirmOpen(false)}
        onConfirm={() => {
          setArchiveConfirmOpen(false)
          if (isOngoingAnalysis) {
            void librarySession.archiveActiveCheckpoint().then((result) => {
              if (!result.ok) {
                showArchiveBlockedNotice(result.reason)
                return
              }
              // Same post-archive step as Results shortcut: open create-next when allowed.
              if (canCreateNextCheckpoint(result.ongoing)) {
                setNextCheckpointOpen(true)
              }
            })
            return
          }
          void librarySession.archiveCurrent().then((result) => {
            if (!result.ok) {
              showArchiveBlockedNotice(result.reason)
            }
          })
        }}
      />
      <ConfirmDialog
        open={deleteCheckpointConfirmOpen}
        title={t("checkpoints.deleteCheckpointConfirmTitle")}
        message={t("checkpoints.deleteCheckpointConfirm")}
        cancelLabel={t("common.cancel")}
        confirmLabel={t("checkpoints.deleteCheckpointConfirmAction")}
        confirmVariant="destructive"
        onCancel={() => setDeleteCheckpointConfirmOpen(false)}
        onConfirm={() => {
          setDeleteCheckpointConfirmOpen(false)
          // Checkpoint-only: never moveCurrentToTrash / analysis delete.
          void librarySession.deleteActiveDraftCheckpoint()
        }}
      />
      <ConfirmDialog
        open={finishOngoingConfirmOpen}
        title={t("checkpoints.finishOngoingConfirmTitle")}
        message={t("checkpoints.finishOngoingConfirm")}
        cancelLabel={t("common.cancel")}
        confirmLabel={t("checkpoints.finishOngoingConfirmAction")}
        onCancel={() => setFinishOngoingConfirmOpen(false)}
        onConfirm={() => {
          setFinishOngoingConfirmOpen(false)
          void librarySession.completeOngoingAnalysis().then((result) => {
            if (result.ok) return
            if (
              result.reason === "has_draft" ||
              result.reason === "latest_not_archived"
            ) {
              showFinishOngoingNotice("need_archive_checkpoint")
              return
            }
            showFinishOngoingNotice("failed")
          })
        }}
      />
      <CreateNextCheckpointDialog
        open={nextCheckpointOpen}
        nextSequence={
          (librarySession.latestCheckpoint?.sequence ?? 0) + 1
        }
        sourceSequence={librarySession.latestCheckpoint?.sequence ?? 1}
        sourceName={
          librarySession.latestCheckpoint?.name ??
          t("checkpoints.nextDialogTitle").replace("{n}", "1")
        }
        onCancel={() => setNextCheckpointOpen(false)}
        onCreate={(name) => {
          setNextCheckpointOpen(false)
          void librarySession.createNextCheckpoint(name)
        }}
      />
      <StartOngoingFromArchiveDialog
        open={startOngoingDialogOpen}
        alternatives={startOngoingAlternatives}
        folderId={librarySession.docMeta?.folderId ?? null}
        onCancel={() => {
          setStartOngoingDialogOpen(false)
          setStartOngoingAlternatives([])
        }}
        onConfirm={async (selectedProjectId, name) => {
          setStartOngoingError(null)
          const result =
            await librarySession.beginStartOngoingFromArchived(
              selectedProjectId,
              name,
            )
          if (result.ok) {
            setStartOngoingDialogOpen(false)
            setStartOngoingAlternatives([])
            navigateTo(buildAnalysisWorkspacePath(result.doc.id))
            return
          }
          // Known validation should already be blocked in the dialog; surface unexpected failures.
          throw new Error(result.reason)
        }}
      />
      <ConfirmDialog
        open={trashConfirmOpen}
        title={t("library.deleteConfirmTitle")}
        message={t("library.deleteConfirm")}
        cancelLabel={t("common.cancel")}
        confirmLabel={t("library.deleteConfirmAction")}
        onCancel={() => setTrashConfirmOpen(false)}
        onConfirm={() => {
          setTrashConfirmOpen(false)
          void (async () => {
            await librarySession.moveCurrentToTrash()
            navigateTo(LIBRARY_PATH)
          })()
        }}
      />
      <RenameAnalysisDialog
        librarySession={librarySession}
        renameError={renameError}
        renameOpen={renameOpen}
        renameValue={renameValue}
        setRenameError={setRenameError}
        setRenameOpen={setRenameOpen}
        setRenameValue={setRenameValue}
      />
      <SaveAndContinueLaterDialog
        open={saveContinueOpen}
        initialFolderId={librarySession.docMeta?.folderId ?? null}
        error={saveContinueError}
        onCancel={() => {
          setSaveContinueOpen(false)
          setSaveContinueError(null)
        }}
        onConfirm={async (folderId) => {
          setSaveContinueError(null)
          try {
            if (librarySession.docMeta?.status === "draft") {
              await librarySession.setFolderId(folderId)
              await librarySession.flushPendingSave().catch(() => undefined)
            }
            setSaveContinueOpen(false)
            setSaveContinueError(null)
            navigateTo(LIBRARY_PATH)
          } catch (error) {
            if (
              isAnalysisNameConflictOnMoveError(error) ||
              isAnalysisNameConflictError(error)
            ) {
              setSaveContinueError(t("library.duplicateNameOnMove"))
            } else {
              setSaveContinueError(t("library.saveError"))
            }
          }
        }}
      />
      <ConfirmDialog
        open={deleteProjectConfirmOpen}
        message={t("projects.confirmDelete")}
        cancelLabel={t("common.cancel")}
        confirmLabel={t("common.confirm")}
        onCancel={() => {
          deleteProjectConfirmTargetRef.current = null
          setDeleteProjectConfirmOpen(false)
        }}
        onConfirm={confirmDeleteProject}
      />
      <AddAlternativeDialog
        open={addAlternativeOpen}
        sources={projects.map((p) => ({ id: p.id, name: p.name }))}
        onClose={() => setAddAlternativeOpen(false)}
        onCreateBlank={handleCreateBlankAlternative}
        onCopyExisting={handleCopyExistingAlternative}
      />
    </>
  )
}
