import { Play } from "lucide-react"

import { buttonVariants } from "@/shared/ui/button"
import { cn } from "@/shared/utils"
import { brandPrimaryTextClass } from "@/shared/brand"
import { useI18n } from "@/i18n/useI18n"
import { PROJECT_PROFILE_FOCUS_ENTRY_CELL_CLASS } from "@/domain/results/columnHeaderLayout"

/** Primary Focus mode entry beside Project Profile (~75% across on md+). */
export function PrimaryFocusModeEntry({ onClick }: { onClick: () => void }) {
  const { t } = useI18n()
  return (
    <div className={PROJECT_PROFILE_FOCUS_ENTRY_CELL_CLASS}>
      <button
        type="button"
        data-focus-mode-primary-entry=""
        onClick={onClick}
        className={buttonVariants({
          variant: "outline",
          size: "sm",
          className:
            "h-7 gap-1.5 px-2.5 text-[12px] font-medium text-muted-foreground hover:text-foreground",
        })}
        aria-label={t("inputs.guidedFocusMode")}
        title={t("inputs.guidedFocusMode")}
      >
        <Play className={cn("size-3.5 fill-current", brandPrimaryTextClass)} aria-hidden />
        {t("inputs.guidedFocusMode")}
      </button>
    </div>
  )
}
