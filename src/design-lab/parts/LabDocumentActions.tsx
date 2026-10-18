import { Flag, Save } from "lucide-react"

import { useI18n } from "@/i18n/useI18n"
import { Button } from "@/shared/ui/button"

/**
 * Visible Save and Checkpoint buttons. Today both live behind the "..." menu: saving is automatic,
 * "Lagre og fortsett senere" is in the menu, and a new checkpoint is made by archiving the active one.
 */
export function LabDocumentActions() {
  const { t } = useI18n()
  return (
    <div className="flex items-center gap-2">
      <span className="hidden text-[11px] text-muted-foreground lg:inline">
        {t("library.saved")} 14:32
      </span>
      <Button type="button" variant="outline" size="sm" className="gap-1.5 text-[12px]">
        <Save className="size-3.5" aria-hidden />
        Lagre
      </Button>
      <Button
        type="button"
        size="sm"
        className="gap-1.5 border-transparent bg-[var(--lab-action)] text-[12px] text-white hover:bg-[var(--lab-action)]/90 hover:text-white"
      >
        <Flag className="size-3.5" aria-hidden />
        {t("checkpoints.nextAction")}
      </Button>
    </div>
  )
}
