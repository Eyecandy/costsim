import { Presentation } from "lucide-react"

import { LabProjectProfile } from "@/design-lab/parts/LabProjectProfile"
import { FILE_NAME } from "@/design-lab/sampleData"
import type { LabOptions } from "@/design-lab/variants/types"
import { useI18n } from "@/i18n/useI18n"
import { Button } from "@/shared/ui/button"

/** Note 4: the small INPUT label, or the analysis name in its place. */
export function LabInputHeading({ mode }: { mode: LabOptions["inputHeading"] }) {
  const { t } = useI18n()
  if (mode === "label") {
    return (
      <p className="m-0 text-[10px] text-muted-foreground/55 italic">
        {t("projects.inputColumnLabel")}
      </p>
    )
  }
  return (
    <div className="flex items-baseline gap-3">
      <h2 className="m-0 text-[17px] font-semibold tracking-tight">{FILE_NAME}</h2>
      <span className="text-[11px] text-muted-foreground">{t("library.saved")}</span>
    </div>
  )
}

/** Note 3: "Checkpoint 1" once, or twice as today (label plus the checkpoint's own name). */
export function LabCheckpoint({ mode }: { mode: LabOptions["checkpoint"] }) {
  const { t } = useI18n()
  const label = t("checkpoints.sequenceLabel").replace("{n}", "1")
  return (
    <div role="tablist" aria-label={t("checkpoints.tablist")} className="flex items-start gap-6">
      <button
        type="button"
        role="tab"
        aria-selected
        className="flex min-w-[5.75rem] flex-col items-center gap-0.5 text-center"
      >
        <span className="grid size-[0.85rem] place-items-center rounded-full border border-[var(--lab-brand)]">
          <span className="size-[0.35rem] rounded-full bg-[var(--lab-brand)]" />
        </span>
        {mode === "duplicate" ? (
          <span className="text-[10px] text-muted-foreground">{label}</span>
        ) : null}
        <span className="text-[11px] font-semibold">Checkpoint 1</span>
        <span className="text-[9px] font-medium tracking-wide text-[var(--lab-brand)] uppercase">
          {t("checkpoints.statusActive")}
        </span>
      </button>
    </div>
  )
}

export type FocusSize = "default" | "small" | "bar"

/** Fokusmodus as a button in three sizes: normal, small (for a header) or a slim full-width bar. */
export function LabFocusButton({ size, filled }: { size: FocusSize; filled: boolean }) {
  const { t } = useI18n()
  if (size === "bar") {
    return (
      <div className="flex items-center justify-between gap-3 rounded-lg bg-[var(--lab-tint)] px-3 py-1.5">
        <span className="text-[12px] text-muted-foreground">
          Trenger du hjelp til å fylle inn? Fokusmodus guider deg steg for steg.
        </span>
        <Button
          type="button"
          size="sm"
          className="gap-1.5 border-transparent bg-[var(--lab-action)] text-[12px] text-white hover:bg-[var(--lab-action)]/90 hover:text-white"
        >
          <Presentation className="size-3.5" aria-hidden />
          {t("inputs.guidedFocusMode")}
        </Button>
      </div>
    )
  }
  const small = size === "small"
  return filled ? (
    <Button
      type="button"
      size={small ? "xs" : "default"}
      className={
        "gap-1.5 border-transparent bg-[var(--lab-action)] text-white shadow-sm hover:bg-[var(--lab-action)]/90 hover:text-white " +
        (small ? "text-[11px]" : "h-8 px-3 text-[12px]")
      }
    >
      <Presentation className="size-3" aria-hidden />
      {t("inputs.guidedFocusMode")}
    </Button>
  ) : (
    <Button type="button" variant="outline" size={small ? "xs" : "sm"} className="text-[11px]">
      <Presentation className="size-3 text-[var(--lab-brand)]" aria-hidden />
      {t("inputs.guidedFocusMode")}
    </Button>
  )
}

/** Notes 10 and 11 and the Fokusmodus placement: the project profile with its Fokusmodus button. */
export function LabProfileRow({
  cues,
  focus,
}: {
  cues: LabOptions["cues"]
  focus: LabOptions["focusButton"]
}) {
  const filled = cues.buttons
  if (focus === "profileHeader") {
    return (
      <LabProjectProfile
        editable={cues.editable}
        headerAction={<LabFocusButton size="small" filled={filled} />}
      />
    )
  }
  if (focus === "bar") {
    return (
      <div className="space-y-2">
        <LabProjectProfile editable={cues.editable} />
        <LabFocusButton size="bar" filled />
      </div>
    )
  }
  if (focus === "toolbarOnly" || focus === "titleRow")
    return <LabProjectProfile editable={cues.editable} />
  return (
    <div className="grid items-start gap-x-3 gap-y-2 md:grid-cols-[minmax(0,3fr)_minmax(0,1fr)]">
      <LabProjectProfile editable={cues.editable} />
      <LabFocusButton size="default" filled={filled} />
    </div>
  )
}
