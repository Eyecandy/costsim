import { Check, Lock } from "lucide-react"

import { CHECKPOINTS } from "@/design-lab/sampleData"
import { useI18n } from "@/i18n/useI18n"
import { cn } from "@/shared/utils"

/**
 * The checkpoints of the analysis: finished ones with a tick, the open one filled, then a locked
 * "Neste checkpoint". Blue (--lab-accent), so it differs from Fokusmodus and Kjør simulering.
 * The locked item is text, not a button: the real (disabled) button sits in the document actions.
 */
export function DCheckpoints({ style }: { style: "row" | "timeline" }) {
  const { t } = useI18n()
  const row = style === "row"
  return (
    <ol
      aria-label={t("checkpoints.region")}
      className={cn(
        "m-0 list-none p-0",
        row
          ? "flex flex-wrap items-center gap-2"
          : "flex flex-col gap-0 border-l-2 border-[var(--lab-accent)]/30 pl-4",
      )}
    >
      {CHECKPOINTS.map((cp) => {
        const active = cp.status === "active"
        return (
          <li
            key={cp.sequence}
            aria-current={active ? "step" : undefined}
            className={cn(
              "flex items-center gap-1.5 text-[12px]",
              row
                ? cn(
                    "rounded-full border px-3 py-1",
                    active
                      ? "border-transparent bg-[var(--lab-accent)] font-semibold text-white"
                      : "border-[var(--lab-accent)]/40 bg-background",
                  )
                : cn("py-1", active && "font-semibold text-[var(--lab-accent)]"),
            )}
          >
            {active ? (
              <span className="size-1.5 rounded-full bg-current" aria-hidden />
            ) : (
              <Check className="size-3.5 text-[var(--lab-accent)]" strokeWidth={3} aria-hidden />
            )}
            <span className="opacity-70">CP{cp.sequence}</span>
            {cp.name}
            {!row ? <span className="text-muted-foreground">{cp.date}</span> : null}
          </li>
        )
      })}
      <li
        className={cn(
          "flex items-center gap-1 text-[12px] text-muted-foreground/70",
          row ? "rounded-full border border-dashed border-border px-3 py-1" : "py-1",
        )}
      >
        <Lock className="size-3" aria-hidden />
        {t("checkpoints.nextAction")}
      </li>
    </ol>
  )
}
