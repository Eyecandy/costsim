import { AnalysisActionsMenu } from "@/features/analysis-library/AnalysisActionsMenu"
import { AnalysisSidebarMenuButton } from "@/features/analysis-library/AnalysisSidebar"
import { BrandWordmark } from "@/shared/BrandWordmark"
import { GlobalHeaderUtilities } from "@/shared/GlobalHeaderUtilities"
import { Archive } from "lucide-react"
import { useI18n } from "@/i18n/useI18n"
import { navigateTo } from "@/shared/auth/auth"
import { buildAnalysisWorkspacePath, LIBRARY_PATH } from "@/persistence/analysisLibraryRoutes"
import { canStartOngoingFromArchivedSingle } from "@/domain/analysis/createOngoingFromArchivedSingle"
import { APP_HEADER_CLASSNAME } from "@/app/workspace/layoutClasses"
import type { Dispatch, SetStateAction } from "react"
import type { useAnalysisDialogs } from "@/app/workspace/useAnalysisDialogs"
import type { useLibraryAnalysisSession } from "@/features/analysis-library/useLibraryAnalysisSession"

export function AnalysisHeader({
  dialogs,
  analysisReadOnly,
  archiveBlockedNotice,
  finishOngoingNotice,
  handleBeforeSignOut,
  isOngoingAnalysis,
  librarySession,
  requestArchiveCheckpoint,
  requestFinishOngoingAnalysis,
  setSidebarOpenRequest,
}: {
  dialogs: ReturnType<typeof useAnalysisDialogs>
  analysisReadOnly: boolean
  archiveBlockedNotice:
    "no_results" | "stale_results" | "result_settings_need_rerun" | "failed" | null
  finishOngoingNotice: "failed" | "need_archive_checkpoint" | null
  handleBeforeSignOut: () => void
  isOngoingAnalysis: boolean
  librarySession: ReturnType<typeof useLibraryAnalysisSession>
  requestArchiveCheckpoint: () => void
  requestFinishOngoingAnalysis: () => void
  setSidebarOpenRequest: Dispatch<SetStateAction<number>>
}) {
  const { t } = useI18n()
  const {
    setDeleteCheckpointConfirmOpen,
    setTrashConfirmOpen,
    setRenameOpen,
    setStartOngoingDialogOpen,
    setStartOngoingAlternatives,
    startOngoingError,
    setStartOngoingError,
    setRenameValue,
    setRenameError,
    setSaveContinueOpen,
  } = dialogs
  return (
    <>
      <div className={APP_HEADER_CLASSNAME}>
        <div className="relative flex min-w-0 items-center justify-between py-3">
          <div className="z-10 flex min-w-0 items-center gap-2">
            <AnalysisSidebarMenuButton
              className="md:hidden"
              onOpen={() => setSidebarOpenRequest((n) => n + 1)}
            />
            <BrandWordmark
              as="button"
              aria-label={t("library.goToHome")}
              title={t("library.goToHome")}
              onClick={() => {
                void (async () => {
                  if (!librarySession.readOnly && librarySession.docMeta?.status === "draft") {
                    await librarySession.flushPendingSave().catch(() => undefined)
                  }
                  navigateTo(LIBRARY_PATH)
                })()
              }}
            />
          </div>
          {librarySession.docMeta ? (
            <div className="pointer-events-none absolute inset-0 z-[5] flex items-center justify-center px-24 sm:px-36 md:px-44">
              <div className="pointer-events-auto relative flex max-w-full min-w-0 items-center gap-1">
                <h1
                  className="m-0 max-w-[min(40vw,20rem)] truncate font-sans text-[13px] font-medium tracking-tight text-foreground"
                  title={librarySession.docMeta.name}
                >
                  {librarySession.docMeta.name}
                </h1>
                {analysisReadOnly ? (
                  <span
                    className="inline-flex shrink-0 items-center"
                    title={t("library.readOnlyHint")}
                    aria-label={t("library.readOnlyHint")}
                  >
                    <Archive
                      className="size-3 text-muted-foreground"
                      aria-hidden
                      data-archived-icon=""
                    />
                  </span>
                ) : null}
                <AnalysisActionsMenu
                  canSaveAndContinueLater={Boolean(librarySession.docMeta)}
                  canArchive={librarySession.canArchive}
                  archiveLabel={
                    isOngoingAnalysis ? t("checkpoints.archiveCheckpointAction") : undefined
                  }
                  finishOngoingLabel={
                    librarySession.canCompleteOngoingAnalysis
                      ? t("checkpoints.finishOngoingAction")
                      : null
                  }
                  onFinishOngoing={
                    librarySession.canCompleteOngoingAnalysis
                      ? requestFinishOngoingAnalysis
                      : undefined
                  }
                  deleteCheckpointLabel={
                    librarySession.canDeleteActiveDraftCheckpoint
                      ? t("checkpoints.deleteCheckpointAction")
                      : null
                  }
                  onDeleteCheckpoint={
                    librarySession.canDeleteActiveDraftCheckpoint
                      ? () => setDeleteCheckpointConfirmOpen(true)
                      : undefined
                  }
                  canRename={Boolean(librarySession.docMeta)}
                  canMoveToTrash={Boolean(librarySession.docMeta)}
                  onSaveAndContinueLater={() => {
                    if (analysisReadOnly) {
                      navigateTo(LIBRARY_PATH)
                      return
                    }
                    if (librarySession.docMeta?.folderId) {
                      void (async () => {
                        await librarySession.flushPendingSave().catch(() => undefined)
                        navigateTo(LIBRARY_PATH)
                      })()
                      return
                    }
                    setSaveContinueOpen(true)
                  }}
                  onArchive={requestArchiveCheckpoint}
                  onRename={() => {
                    setRenameError(null)
                    setRenameValue(librarySession.docMeta?.name ?? "")
                    setRenameOpen(true)
                  }}
                  onMoveToTrash={() => setTrashConfirmOpen(true)}
                  createNewVersionLabel={
                    librarySession.docMeta?.status === "archived"
                      ? t("library.createNewVersion")
                      : null
                  }
                  onCreateNewVersion={
                    librarySession.docMeta?.status === "archived"
                      ? () => {
                          void librarySession
                            .createNewVersion(t("library.versionSuffix"))
                            .then((draft) => {
                              if (draft) {
                                navigateTo(buildAnalysisWorkspacePath(draft.id))
                              }
                            })
                        }
                      : undefined
                  }
                  startOngoingLabel={
                    librarySession.docMeta &&
                    canStartOngoingFromArchivedSingle({
                      status: librarySession.docMeta.status,
                      analysisMode: librarySession.docMeta.analysisMode,
                      deletedAt: null,
                    })
                      ? t("library.startOngoingAnalysis")
                      : null
                  }
                  onStartOngoing={
                    librarySession.docMeta &&
                    canStartOngoingFromArchivedSingle({
                      status: librarySession.docMeta.status,
                      analysisMode: librarySession.docMeta.analysisMode,
                      deletedAt: null,
                    })
                      ? () => {
                          setStartOngoingError(null)
                          void librarySession
                            .beginStartOngoingFromArchived()
                            .then((result) => {
                              if (result.ok) {
                                // Defensive: create path always requires dialog confirmation.
                                navigateTo(buildAnalysisWorkspacePath(result.doc.id))
                                return
                              }
                              if (result.reason === "need_selection" && result.projects?.length) {
                                setStartOngoingAlternatives(result.projects)
                                setStartOngoingDialogOpen(true)
                                return
                              }
                              setStartOngoingError(result.reason)
                            })
                            .catch(() => {
                              setStartOngoingError("create_failed")
                            })
                        }
                      : undefined
                  }
                />
                {startOngoingError ? (
                  <p
                    className="absolute left-0 top-full mt-1 max-w-[18rem] font-sans text-[10px] leading-snug text-destructive"
                    role="alert"
                  >
                    {t("library.startOngoingFailed")}
                  </p>
                ) : null}
                {archiveBlockedNotice ? (
                  <p
                    className="absolute left-0 top-full mt-1 max-w-[18rem] font-sans text-[10px] leading-snug text-muted-foreground"
                    role="status"
                    aria-live="polite"
                  >
                    {archiveBlockedNotice === "no_results"
                      ? t("library.archiveNeedsSimulation")
                      : archiveBlockedNotice === "failed"
                        ? t("library.archiveFailed")
                        : archiveBlockedNotice === "result_settings_need_rerun"
                          ? t("library.archiveNeedsResultSettingsRerun")
                          : t("library.archiveNeedsRerun")}
                  </p>
                ) : null}
                {finishOngoingNotice ? (
                  <p
                    className="absolute left-0 top-full mt-1 max-w-[18rem] font-sans text-[10px] leading-snug text-muted-foreground"
                    role="status"
                    aria-live="polite"
                  >
                    {finishOngoingNotice === "need_archive_checkpoint"
                      ? t("checkpoints.finishOngoingNeedArchiveCheckpoint")
                      : t("checkpoints.finishOngoingFailed")}
                  </p>
                ) : null}
                <span
                  className="pointer-events-none absolute left-full top-1/2 ml-2 inline-flex min-w-[4.25rem] -translate-y-1/2 font-sans text-[10px] text-muted-foreground"
                  aria-live="polite"
                >
                  {librarySession.saveStatus === "saving"
                    ? t("library.saving")
                    : librarySession.saveStatus === "saved"
                      ? t("library.saved")
                      : librarySession.saveStatus === "error_quota"
                        ? t("library.saveErrorQuota")
                        : librarySession.saveStatus === "error"
                          ? t("library.saveError")
                          : "\u00a0"}
                </span>
              </div>
            </div>
          ) : null}
          <GlobalHeaderUtilities className="z-10" onBeforeSignOut={handleBeforeSignOut} />
        </div>
      </div>
    </>
  )
}
