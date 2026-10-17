import { Check, Plus } from "lucide-react"

import { COLUMN_HEADER_BOTTOM_GAP_CLASS } from "@/domain/results/columnHeaderLayout"
import { cn } from "@/lib/utils"
import {
  checkpointPrimaryStageId,
  type AnalysisCheckpoint,
} from "@/lib/analysisCheckpoint"
import { useI18n } from "@/i18n/useI18n"

export type CheckpointNavProps = {
  checkpoints: readonly AnalysisCheckpoint[]
  activeCheckpointId: string
  onSelect: (checkpointId: string) => void
  /** Show discreet “Next checkpoint” control when the tip is archived. */
  canCreateNext?: boolean
  atCheckpointLimit?: boolean
  onCreateNext?: () => void
  className?: string
}

/**
 * Lightweight horizontal timeline for Ongoing Analysis checkpoints.
 * Deliberately distinct from Single Analysis alternative tabs.
 */
export function CheckpointNav({
  checkpoints,
  activeCheckpointId,
  onSelect,
  canCreateNext = false,
  atCheckpointLimit = false,
  onCreateNext,
  className,
}: CheckpointNavProps) {
  const { t } = useI18n()
  const ordered = [...checkpoints].sort((a, b) => a.sequence - b.sequence)

  return (
    <div
      className={className}
      role="region"
      aria-label={t("checkpoints.region")}
      data-checkpoint-nav="timeline"
    >
      <p
        className={cn(
          "m-0 font-sans text-[10px] font-normal italic tracking-wide text-muted-foreground/55",
          COLUMN_HEADER_BOTTOM_GAP_CLASS,
        )}
      >
        {t("projects.inputColumnLabel")}
      </p>
      <div
        role="tablist"
        aria-label={t("checkpoints.tablist")}
        className="flex w-full min-w-0 flex-nowrap items-start gap-0 overflow-x-auto pb-0.5"
      >
        {ordered.map((cp, index) => {
          const isSelected = cp.id === activeCheckpointId
          const isArchived = cp.status === "archived"
          const isDraft = cp.status === "draft"
          const stageId = checkpointPrimaryStageId(cp)
          const stageLabel = stageId
            ? t(`projectProfile.options.${stageId}`)
            : null
          const hasNext = index < ordered.length - 1
          return (
            <div
              key={cp.id}
              className="relative flex min-w-[5.75rem] max-w-[8.5rem] shrink-0 flex-col items-center"
            >
              {hasNext ? (
                <span
                  aria-hidden
                  className="pointer-events-none absolute left-[calc(50%+0.4rem)] top-[0.4rem] h-px w-[calc(100%-0.8rem)] bg-[#1d868c]/35"
                />
              ) : null}
              <button
                type="button"
                id={`checkpoint-tab-${cp.id}`}
                role="tab"
                aria-selected={isSelected}
                tabIndex={isSelected ? 0 : -1}
                onClick={() => onSelect(cp.id)}
                onKeyDown={(e) => {
                  if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
                    e.preventDefault()
                    const delta = e.key === "ArrowRight" ? 1 : -1
                    const next = ordered[index + delta]
                    if (next) onSelect(next.id)
                  }
                }}
                className={cn(
                  "relative z-[1] flex w-full cursor-pointer flex-col items-center gap-1 rounded-md px-1.5 py-0.5 text-center font-sans outline-none",
                  "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                  isSelected
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    "flex size-[0.85rem] items-center justify-center rounded-full border transition-colors",
                    isDraft && isSelected
                      ? "border-[#1d868c] bg-[#1d868c] text-white"
                      : isDraft
                        ? "border-[#1d868c]/70 bg-[#1d868c]/15"
                        : isArchived && isSelected
                          ? "border-[#1d868c] bg-[#1d868c] text-white"
                          : "border-[#1d868c]/45 bg-background text-[#1d868c]/80",
                  )}
                >
                  {isArchived ? (
                    <Check className="size-2.5" strokeWidth={3} />
                  ) : isSelected ? (
                    <span className="size-1.5 rounded-full bg-white" />
                  ) : null}
                </span>
                <span className="flex w-full min-w-0 flex-col items-center gap-0.5">
                  <span
                    className={cn(
                      "w-full truncate text-[10px] tabular-nums tracking-wide",
                      isSelected ? "font-semibold" : "font-medium",
                    )}
                  >
                    {t("checkpoints.sequenceLabel").replace(
                      "{n}",
                      String(cp.sequence),
                    )}
                  </span>
                  <span
                    className={cn(
                      "w-full truncate text-[11px] leading-tight",
                      isSelected ? "font-semibold" : "font-medium",
                    )}
                    title={cp.name}
                  >
                    {cp.name}
                  </span>
                  {stageLabel ? (
                    <span className="w-full truncate text-[10px] font-normal text-muted-foreground">
                      {stageLabel}
                    </span>
                  ) : null}
                  <span
                    className={cn(
                      "text-[9px] font-medium uppercase tracking-wider",
                      isDraft
                        ? "text-[#1d868c]"
                        : "text-muted-foreground/70",
                    )}
                  >
                    {isArchived
                      ? t("checkpoints.statusArchived")
                      : t("checkpoints.statusActive")}
                  </span>
                </span>
              </button>
            </div>
          )
        })}

        {canCreateNext && onCreateNext ? (
          <div className="relative flex min-w-[4.5rem] shrink-0 flex-col items-center">
            {ordered.length > 0 ? (
              <span
                aria-hidden
                className="pointer-events-none absolute right-1/2 top-[0.4rem] h-px w-1/2 bg-[#1d868c]/25"
              />
            ) : null}
            <button
              type="button"
              aria-label={t("checkpoints.nextAction")}
              title={t("checkpoints.nextAction")}
              onClick={onCreateNext}
              className={cn(
                "relative z-[1] mt-0 flex cursor-pointer flex-col items-center gap-1 rounded-md px-1.5 py-0.5 text-muted-foreground outline-none",
                "hover:text-foreground",
                "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              )}
            >
              <span
                aria-hidden
                className="flex size-[0.85rem] items-center justify-center rounded-full border border-dashed border-[#1d868c]/50 bg-transparent"
              >
                <Plus className="size-2.5" strokeWidth={2.5} />
              </span>
              <span className="max-w-[4.5rem] text-center text-[10px] font-medium leading-tight">
                {t("checkpoints.nextAction")}
              </span>
            </button>
          </div>
        ) : null}
      </div>
      {atCheckpointLimit ? (
        <p
          className="mt-1 font-sans text-[10px] text-muted-foreground/80"
          role="status"
        >
          {t("checkpoints.limitReached")}
        </p>
      ) : null}
    </div>
  )
}
