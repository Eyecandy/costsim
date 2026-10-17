import { useI18n } from "@/i18n/useI18n"
import { isAnalysisNameConflictError } from "@/domain/analysis/analysisNameUniqueness"
import type { Dispatch, SetStateAction } from "react"
import type { useLibraryAnalysisSession } from "@/features/analysis-library/useLibraryAnalysisSession"

export function RenameAnalysisDialog({
  librarySession,
  renameError,
  renameOpen,
  renameValue,
  setRenameError,
  setRenameOpen,
  setRenameValue,
}: {
  librarySession: ReturnType<typeof useLibraryAnalysisSession>
  renameError: string | null
  renameOpen: boolean
  renameValue: string
  setRenameError: Dispatch<SetStateAction<string | null>>
  setRenameOpen: Dispatch<SetStateAction<boolean>>
  setRenameValue: Dispatch<SetStateAction<string>>
}) {
  const { t } = useI18n()
  return (
    <>
      {renameOpen ? (
        <div
          className="fixed inset-0 z-[220] flex items-center justify-center bg-black/40 p-4"
          role="presentation"
          onClick={(e) => {
            if (e.target !== e.currentTarget) return
            setRenameOpen(false)
            setRenameError(null)
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="rename-analysis-title"
            className="w-full max-w-sm rounded-lg border border-border/60 bg-background p-4 shadow-md"
          >
            <h2 id="rename-analysis-title" className="m-0 mb-3 font-sans text-[15px] font-medium">
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
                if (e.key === "Enter" && renameValue.trim()) {
                  void (async () => {
                    try {
                      await librarySession.renameAnalysis(renameValue)
                      setRenameOpen(false)
                      setRenameError(null)
                    } catch (error) {
                      setRenameError(
                        isAnalysisNameConflictError(error)
                          ? t("library.duplicateNameInFolder")
                          : t("library.saveError"),
                      )
                    }
                  })()
                }
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
                  setRenameOpen(false)
                  setRenameError(null)
                }}
              >
                {t("common.cancel")}
              </button>
              <button
                type="button"
                className="h-8 rounded-md bg-[#1d868c] px-3 font-sans text-[12px] text-white hover:bg-[#1d868c]/90 disabled:opacity-50"
                disabled={!renameValue.trim()}
                onClick={() => {
                  void (async () => {
                    try {
                      await librarySession.renameAnalysis(renameValue)
                      setRenameOpen(false)
                      setRenameError(null)
                    } catch (error) {
                      setRenameError(
                        isAnalysisNameConflictError(error)
                          ? t("library.duplicateNameInFolder")
                          : t("library.saveError"),
                      )
                    }
                  })()
                }}
              >
                {t("common.confirm")}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
