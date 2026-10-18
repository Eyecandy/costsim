import { Check, Plus } from "lucide-react"

import { CHECKPOINTS } from "@/design-lab/sampleData"
import { useI18n } from "@/i18n/useI18n"
import { cn } from "@/shared/utils"

/**
 * The checkpoints as a vertical timeline on the left: oldest at the top, the active one highlighted,
 * a line connecting them, and the next checkpoint as a dashed step at the end.
 */
export function LabCheckpointTimeline() {
  const { t } = useI18n()
  return (
    <nav aria-label={t("checkpoints.region")} className="text-[12px]">
      <p className="m-0 mb-3 text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
        {t("checkpoints.region")}
      </p>
      <ol className="m-0 list-none p-0">
        {CHECKPOINTS.map((checkpoint, index) => {
          const active = checkpoint.status === "active"
          const last = index === CHECKPOINTS.length - 1
          return (
            <li key={checkpoint.sequence} className="relative flex gap-3 pb-5">
              {/* connector to the next step */}
              {last ? null : (
                <span
                  aria-hidden
                  className="absolute top-5 bottom-0 left-[0.55rem] w-px bg-[var(--lab-brand)]/40"
                />
              )}
              <span
                aria-hidden
                className={cn(
                  "z-10 mt-0.5 grid size-[1.1rem] shrink-0 place-items-center rounded-full border",
                  active
                    ? "border-[var(--lab-brand)] bg-background ring-4 ring-[var(--lab-tint-strong)]"
                    : "border-[var(--lab-brand)] bg-[var(--lab-brand)] text-white",
                )}
              >
                {active ? (
                  <span className="size-2 rounded-full bg-[var(--lab-brand)]" />
                ) : (
                  <Check className="size-3" strokeWidth={3} />
                )}
              </span>
              <button
                type="button"
                aria-current={active ? "step" : undefined}
                className={cn(
                  "-mt-0.5 -ml-1 flex min-w-0 flex-col items-start rounded-md px-1.5 py-0.5 text-left",
                  active ? "bg-[var(--lab-tint)]" : "hover:bg-[var(--lab-tint)]",
                )}
              >
                <span className="text-[10px] text-muted-foreground">
                  {t("checkpoints.sequenceLabel").replace("{n}", String(checkpoint.sequence))}
                </span>
                <span
                  className={cn("truncate text-[12px]", active ? "font-semibold" : "font-medium")}
                >
                  {checkpoint.name}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {active ? t("checkpoints.statusActive") : t("checkpoints.statusArchived")} ·{" "}
                  {checkpoint.date}
                </span>
              </button>
            </li>
          )
        })}
        <li className="flex gap-3">
          <span
            aria-hidden
            className="grid size-[1.1rem] shrink-0 place-items-center rounded-full border border-dashed border-[var(--lab-brand)] text-[var(--lab-brand)]"
          >
            <Plus className="size-3" />
          </span>
          <button
            type="button"
            className="-mt-0.5 -ml-1 rounded-md px-1.5 py-0.5 text-left text-[12px] text-muted-foreground hover:bg-[var(--lab-tint)] hover:text-foreground"
          >
            {t("checkpoints.nextAction")}
          </button>
        </li>
      </ol>
    </nav>
  )
}
