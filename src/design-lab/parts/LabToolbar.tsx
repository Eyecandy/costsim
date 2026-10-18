import {
  FileText,
  HelpCircle,
  Link2,
  Minus,
  Presentation,
  Plus,
  SlidersHorizontal,
  Trash2,
  type LucideIcon,
} from "lucide-react"

import type { LabOptions } from "@/design-lab/variants/types"
import { useI18n } from "@/i18n/useI18n"
import { Button } from "@/shared/ui/button"

type ToolbarItem = {
  key: string
  label: string
  title?: string
  Icon: LucideIcon
  only?: "cost" | "driver"
  /** Hidden when the actions live on each row instead (note 6). */
  rowLevel?: boolean
}

/** Note 5: the table toolbar as icons only (today) or with text next to the icons. */
export function LabToolbar({
  kind,
  mode,
  rowActions,
  focus = true,
}: {
  kind: "cost" | "driver"
  mode: LabOptions["toolbar"]
  rowActions: LabOptions["rowActions"]
  /** Include the Fokusmodus button (a look may keep it elsewhere instead). */
  focus?: boolean
}) {
  const { t } = useI18n()
  const items: ToolbarItem[] = [
    {
      key: "focus",
      label: t("expanders.guidedInput"),
      title: t("inputs.openFocusMode"),
      Icon: Presentation,
    },
    { key: "define", label: t("expanders.define"), Icon: FileText, rowLevel: true },
    { key: "corr", label: t("expanders.costCorrelation"), Icon: Link2, only: "cost" },
    {
      key: "impact",
      label: t("expanders.driverImpact"),
      Icon: SlidersHorizontal,
      only: "driver",
      rowLevel: true,
    },
    {
      key: "clear",
      label: t("inputs.clearTableAction"),
      title: t("inputs.clearTableTooltip"),
      Icon: Trash2,
    },
    { key: "add", label: t("inputs.addRow"), Icon: Plus },
    { key: "del", label: t("inputs.deleteSelectedRow"), Icon: Minus },
  ]
  const visible = items.filter(
    (item) =>
      (!item.only || item.only === kind) &&
      !(rowActions === "inline" && item.rowLevel) &&
      (focus || item.key !== "focus"),
  )

  return (
    <div className="flex flex-wrap items-center justify-end gap-1.5">
      {visible.map(({ key, label, title, Icon }) =>
        mode === "icons" ? (
          <Button
            key={key}
            type="button"
            variant="ghost"
            size="icon-sm"
            title={title ?? label}
            aria-label={title ?? label}
          >
            <Icon className="size-4" aria-hidden />
          </Button>
        ) : (
          <Button
            key={key}
            type="button"
            variant="outline"
            size="sm"
            title={title}
            className="gap-1.5 text-[11px]"
          >
            <Icon className="size-3.5" aria-hidden />
            {label}
          </Button>
        ),
      )}
      <Button type="button" variant="ghost" size="icon-sm" aria-label="Hjelp" title="Hjelp">
        <HelpCircle className="size-4 text-muted-foreground" aria-hidden />
      </Button>
    </div>
  )
}
