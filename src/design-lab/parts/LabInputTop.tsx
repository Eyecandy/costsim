import { Play } from "lucide-react"

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

/** Notes 10 and 11: the project profile and Fokusmodus, plain as today or clearer. */
export function LabProfileRow({ cues }: { cues: LabOptions["cues"] }) {
  const { t } = useI18n()
  return (
    <div className="grid items-start gap-x-3 gap-y-2 md:grid-cols-[minmax(0,3fr)_minmax(0,1fr)]">
      <LabProjectProfile editable={cues.editable} />
      {cues.buttons ? (
        <Button
          type="button"
          className="h-8 justify-self-start border-transparent bg-[var(--lab-action)] px-3 text-[12px] text-white shadow-sm hover:bg-[var(--lab-action)]/90 hover:text-white"
        >
          <Play className="size-3.5 fill-current" aria-hidden />
          {t("inputs.guidedFocusMode")}
        </Button>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="justify-self-start text-[11px]"
        >
          <Play className="size-3 fill-current text-[var(--lab-brand)]" aria-hidden />
          {t("inputs.guidedFocusMode")}
        </Button>
      )}
    </div>
  )
}
