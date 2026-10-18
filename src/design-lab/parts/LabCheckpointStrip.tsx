import { Check, Lock, Plus } from "lucide-react"

import { CHECKPOINTS } from "@/design-lab/sampleData"
import type { LabOptions } from "@/design-lab/variants/types"
import { useI18n } from "@/i18n/useI18n"
import { cn } from "@/shared/utils"

/**
 * The checkpoints as one horizontal strip above the work: archived ones are checked, the open one is
 * highlighted, and the next one is a locked step until the open checkpoint is archived.
 */
export function LabCheckpointStrip({ state }: { state: LabOptions["checkpointState"] }) {
  const { t } = useI18n()
  const archivedTip = state === "archived"
  return (
    <nav aria-label={t("checkpoints.region")}>
      <ol className="m-0 flex list-none flex-wrap items-center gap-x-2 gap-y-3 p-0">
        {CHECKPOINTS.map((checkpoint) => {
          const active = checkpoint.status === "active" && !archivedTip
          return (
            <li key={checkpoint.sequence} className="flex items-center gap-2">
              <button
                type="button"
                aria-current={active ? "step" : undefined}
                className={cn(
                  "flex h-14 w-48 items-center gap-3 rounded-lg border px-3 text-left",
                  active
                    ? "border-[var(--lab-brand)] bg-[var(--lab-tint)]"
                    : "border-border bg-background hover:bg-[var(--lab-tint)]",
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    "grid size-5 shrink-0 place-items-center rounded-full border border-[var(--lab-brand)]",
                    active ? "bg-background" : "bg-[var(--lab-brand)] text-white",
                  )}
                >
                  {active ? (
                    <span className="size-2 rounded-full bg-[var(--lab-brand)]" />
                  ) : (
                    <Check className="size-3" strokeWidth={3} />
                  )}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-[12px] font-semibold">
                    {checkpoint.sequence}. {checkpoint.name}
                  </span>
                  <span className="block truncate text-[11px] text-muted-foreground">
                    {active ? t("checkpoints.statusActive") : t("checkpoints.statusArchived")} ·{" "}
                    {checkpoint.status === "active" && archivedTip
                      ? "18. okt 2026"
                      : checkpoint.date}
                  </span>
                </span>
              </button>
              <span aria-hidden className="h-px w-5 bg-[var(--lab-brand)]/40" />
            </li>
          )
        })}
        <li>
          <button
            type="button"
            disabled={!archivedTip}
            title={archivedTip ? undefined : "Arkiver Checkpoint 3 først"}
            className={cn(
              "flex h-14 w-48 items-center gap-3 rounded-lg border border-dashed px-3 text-left text-[12px]",
              archivedTip
                ? "border-[var(--lab-brand)] text-foreground hover:bg-[var(--lab-tint)]"
                : "cursor-not-allowed border-border text-muted-foreground/70",
            )}
          >
            {archivedTip ? (
              <Plus className="size-4" aria-hidden />
            ) : (
              <Lock className="size-4" aria-hidden />
            )}
            <span>
              {t("checkpoints.nextAction")}
              {archivedTip ? null : (
                <span className="block text-[11px]">Låses opp når Checkpoint 3 er arkivert</span>
              )}
            </span>
          </button>
        </li>
      </ol>
    </nav>
  )
}
