import { Archive, Flag, Lock } from "lucide-react"

import type { LabOptions } from "@/design-lab/variants/types"
import { useI18n } from "@/i18n/useI18n"
import { Button } from "@/shared/ui/button"

/**
 * Checkpoint buttons (no Save: saving is automatic). The rule they show: the next checkpoint cannot
 * be started until the one being worked on is archived. While it is open, "Arkiver checkpoint" is the
 * action and "Neste checkpoint" is locked; once archived, "Neste checkpoint" opens up.
 */
export function LabDocumentActions({
  state,
  tone = "action",
}: {
  state: LabOptions["checkpointState"]
  /** "accent" colours the checkpoint buttons differently from Fokusmodus and Kjør simulering. */
  tone?: LabOptions["checkpointTone"]
}) {
  const { t } = useI18n()
  const archived = state === "archived"
  const filled =
    tone === "accent"
      ? "gap-1.5 border-transparent bg-[var(--lab-accent)] text-[12px] text-white hover:bg-[var(--lab-accent)]/90 hover:text-white"
      : "gap-1.5 border-transparent bg-[var(--lab-action)] text-[12px] text-white hover:bg-[var(--lab-action)]/90 hover:text-white"
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="hidden text-[11px] text-muted-foreground lg:inline">
        {archived ? `${t("checkpoints.statusArchived")} 18. okt` : `${t("library.saved")} 14:32`}
      </span>
      {archived ? null : (
        <Button type="button" size="sm" className={filled}>
          <Archive className="size-3.5" aria-hidden />
          {t("checkpoints.archiveCheckpointAction")}
        </Button>
      )}
      <Button
        type="button"
        size="sm"
        variant={archived ? "default" : "outline"}
        disabled={!archived}
        title={archived ? undefined : "Arkiver Checkpoint 3 først"}
        className={archived ? filled : "gap-1.5 text-[12px]"}
      >
        {archived ? (
          <Flag className="size-3.5" aria-hidden />
        ) : (
          <Lock className="size-3.5" aria-hidden />
        )}
        {t("checkpoints.nextAction")}
      </Button>
    </div>
  )
}
