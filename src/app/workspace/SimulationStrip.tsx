import { Button } from "@/shared/ui/button"
import { COLUMN_HEADER_BOTTOM_GAP_CLASS } from "@/domain/results/columnHeaderLayout"
import { cn } from "@/shared/utils"
import { useI18n } from "@/i18n/useI18n"
import { SpotlightLoadingText } from "@/shared/SpotlightLoadingText"
import { brandPrimaryTextClass, brandPrimaryButtonClass } from "@/shared/brand"
import {
  STICKY_CONTROL_STRIP_CLASSNAME,
  ONGOING_SIMULATION_CELL_CLASS,
  SIMULATION_NOTICE_ZONE_CLASS,
  SIMULATION_NOTICE_TEXT_CLASS,
  NOTICE_WORD_RED_CLASS,
  NOTICE_WORD_GREEN_CLASS,
} from "@/app/workspace/layoutClasses"
import { noticeWithColorWord, type RunErrorKey } from "@/app/workspace/workspaceHelpers"
import type { Dispatch, SetStateAction } from "react"

export function SimulationStrip({
  analysisReadOnly,
  currentValidationError,
  handleRevertInputsToLastSimulation,
  handleRun,
  isOngoingAnalysis,
  isRunning,
  runErrorKey,
  setShowStaleInputChanges,
  showStaleInputChanges,
  showStaleInputNotice,
  showValidationFeedback,
}: {
  analysisReadOnly: boolean
  currentValidationError: 'projects.invalidInputForRun' | 'projects.emptyCostBasisForRun' | null
  handleRevertInputsToLastSimulation: () => void
  handleRun: () => void
  isOngoingAnalysis: boolean
  isRunning: boolean
  runErrorKey: RunErrorKey | null
  setShowStaleInputChanges: Dispatch<SetStateAction<boolean>>
  showStaleInputChanges: boolean
  showStaleInputNotice: boolean
  showValidationFeedback: boolean
}) {
  const { language, t } = useI18n()
  return (
    <>
      <div
        className={
          isOngoingAnalysis
            ? ONGOING_SIMULATION_CELL_CLASS
            : STICKY_CONTROL_STRIP_CLASSNAME
        }
        role="region"
        aria-label={t("projects.simulationStripRegion")}
      >
        <p
          className={cn(
            "font-sans text-[10px] font-normal italic tracking-wide text-muted-foreground/55",
            COLUMN_HEADER_BOTTOM_GAP_CLASS,
          )}
        >
          {t("projects.resultsColumnLabel")}
        </p>
        <div className="flex h-8 w-full shrink-0 items-center justify-center">
          {isRunning ? (
            <SpotlightLoadingText
              text={t("buttons.simulating")}
              tone="primary"
              className={cn(
                "font-sans text-xs font-semibold",
                brandPrimaryTextClass,
              )}
              data-simulation-loading=""
              aria-live="polite"
              aria-busy="true"
            />
          ) : analysisReadOnly ? (
            <Button
              type="button"
              disabled
              title={t("library.runDisabledArchived")}
              className={cn(
                "h-8 w-full shrink-0 font-sans text-xs font-semibold uppercase tracking-wide opacity-40",
                brandPrimaryButtonClass,
              )}
            >
              {t("buttons.runSimulation")}
            </Button>
          ) : (
            <Button
              type="button"
              className={cn(
                "h-8 w-full shrink-0 font-sans text-xs font-semibold uppercase tracking-wide",
                brandPrimaryButtonClass,
              )}
              onClick={handleRun}
            >
              {t("buttons.runSimulation")}
            </Button>
          )}
        </div>
        <div className={SIMULATION_NOTICE_ZONE_CLASS}>
          {runErrorKey === "projects.workerError" ? (
            <p
              className={cn(SIMULATION_NOTICE_TEXT_CLASS, "min-w-0 break-words")}
              role="alert"
            >
              {t(runErrorKey)}
            </p>
          ) : null}
          {showValidationFeedback ? (
            <p
              className={cn(SIMULATION_NOTICE_TEXT_CLASS, "min-w-0 break-words")}
              role="alert"
            >
              {noticeWithColorWord(
                // showValidationFeedback implies a non-null validation error.
                t(currentValidationError!),
                language === "no" ? "rødt" : "red",
                NOTICE_WORD_RED_CLASS,
              )}
            </p>
          ) : null}
          {showStaleInputNotice ? (
            <div className="flex min-w-0 flex-col gap-1">
              <p
                className={cn(
                  "font-sans text-xs font-medium leading-snug text-foreground/85",
                  "min-w-0 break-words",
                )}
              >
                {t("projects.staleInputsTitle")}
              </p>
              <p
                className={cn(
                  SIMULATION_NOTICE_TEXT_CLASS,
                  "min-w-0 break-words",
                )}
              >
                {showStaleInputChanges
                  ? noticeWithColorWord(
                      t("projects.staleInputsNoticeWithChanges"),
                      language === "no" ? "Grønne" : "Green",
                      NOTICE_WORD_GREEN_CLASS,
                    )
                  : t("projects.staleInputsNotice")}
              </p>
              <div className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1">
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  className="h-auto min-h-0 w-fit shrink-0 self-start px-0 py-0 text-xs leading-snug"
                  aria-pressed={showStaleInputChanges}
                  onClick={() =>
                    setShowStaleInputChanges((prev) => !prev)
                  }
                >
                  {showStaleInputChanges
                    ? t("projects.hideInputChanges")
                    : t("projects.showInputChanges")}
                </Button>
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  className="h-auto min-h-0 w-fit shrink-0 self-start px-0 py-0 text-xs leading-snug"
                  onClick={handleRevertInputsToLastSimulation}
                >
                  {t("projects.revertInputChanges")}
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </>
  )
}
