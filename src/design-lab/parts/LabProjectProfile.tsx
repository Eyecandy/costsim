import { ChevronDown, ChevronUp, Pencil } from "lucide-react"
import { useId, useState, type ReactNode } from "react"

import { useI18n } from "@/i18n/useI18n"
import type { MessageKey } from "@/i18n/messages"
import { cn } from "@/shared/utils"

/** An example project profile, using the app's own category and option texts (so NO/EN works). */
const EXAMPLE: readonly { label: MessageKey; value: MessageKey }[] = [
  { label: "projectProfile.categories.projectArea", value: "projectProfile.options.buildings" },
  { label: "projectProfile.categories.projectType", value: "projectProfile.options.education" },
  {
    label: "projectProfile.categories.interventionTypes",
    value: "projectProfile.options.rehabilitation_renewal",
  },
  { label: "projectProfile.categories.phase", value: "projectProfile.options.detailed_design" },
  {
    label: "projectProfile.categories.deliveryModel",
    value: "projectProfile.options.design_build",
  },
]

const SIZE_EXAMPLE = "4 200"

/**
 * The project profile shown with example content, and an up/down arrow to hide or show it.
 * Collapsed, it keeps a one-line summary so the profile is never lost from sight.
 */
export function LabProjectProfile({
  editable = false,
  defaultOpen = true,
  className,
  headerAction,
}: {
  editable?: boolean
  defaultOpen?: boolean
  className?: string
  /** Optional control shown in the header, before the arrow (used for a small Fokusmodus button). */
  headerAction?: ReactNode
}) {
  const { t } = useI18n()
  const [open, setOpen] = useState(defaultOpen)
  const bodyId = useId()
  const summary = EXAMPLE.map((item) => t(item.value)).join(" · ")

  return (
    <section
      aria-label={t("projectProfile.heading")}
      className={cn(
        "rounded-lg border bg-background px-3 py-2",
        editable ? "border-dashed border-[var(--lab-field-border)]" : "border-border",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="m-0 flex items-center gap-1.5 text-[12px] font-medium">
            {t("projectProfile.heading")}
            {editable ? <Pencil className="size-3 text-muted-foreground" aria-hidden /> : null}
          </p>
          {open ? null : (
            <p className="m-0 mt-0.5 truncate text-[11px] text-muted-foreground">{summary}</p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {headerAction}
          <button
            type="button"
            aria-expanded={open}
            aria-controls={bodyId}
            aria-label={open ? "Skjul prosjektprofil" : "Vis prosjektprofil"}
            title={open ? "Skjul prosjektprofil" : "Vis prosjektprofil"}
            onClick={() => setOpen((value) => !value)}
            className="grid size-7 shrink-0 place-items-center rounded-md text-muted-foreground hover:bg-[var(--lab-tint)] hover:text-foreground"
          >
            {open ? (
              <ChevronUp className="size-4" aria-hidden />
            ) : (
              <ChevronDown className="size-4" aria-hidden />
            )}
          </button>
        </div>
      </div>
      <div id={bodyId} hidden={!open}>
        <dl className="m-0 mt-2 grid gap-x-6 gap-y-2 sm:grid-cols-2">
          {EXAMPLE.map((item) => (
            <div key={item.label}>
              <dt className="text-[10px] text-muted-foreground">{t(item.label)}</dt>
              <dd className="m-0 mt-0.5">
                <span className="inline-block rounded-full bg-[var(--lab-tint)] px-2.5 py-0.5 text-[12px]">
                  {t(item.value)}
                </span>
              </dd>
            </div>
          ))}
          <div>
            <dt className="text-[10px] text-muted-foreground">{t("projectProfile.sizeHeading")}</dt>
            <dd className="m-0 mt-0.5 text-[12px] tabular-nums">
              {SIZE_EXAMPLE} {t("projectProfile.quantityUnits.m2")} ·{" "}
              {t("projectProfile.quantityTypes.gross_floor_area")}
            </dd>
          </div>
        </dl>
      </div>
    </section>
  )
}
