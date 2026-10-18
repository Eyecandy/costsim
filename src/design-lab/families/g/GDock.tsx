import { ChevronDown, ChevronUp, Play } from "lucide-react"
import { useId, useState } from "react"

import type { GVariant } from "@/design-lab/families/g/types"
import { LabSCurve } from "@/design-lab/parts/LabCharts"
import { KeyFiguresTable } from "@/design-lab/parts/LabResults"
import { KEY_FIGURES } from "@/design-lab/sampleData"
import { useI18n } from "@/i18n/useI18n"
import { brandPrimaryButtonClass } from "@/shared/brand"
import { Button } from "@/shared/ui/button"
import { cn } from "@/shared/utils"

function RunButton() {
  const { t } = useI18n()
  return (
    <Button
      type="button"
      className={cn(brandPrimaryButtonClass, "h-12 gap-2 px-6 text-[13px] font-semibold uppercase")}
    >
      <Play className="size-4" aria-hidden />
      {t("buttons.runSimulation")}
    </Button>
  )
}

function Figure({ label, value }: { label: string; value: string }) {
  return (
    <span className="flex flex-col">
      <span className="text-[11px] text-muted-foreground">{label}</span>
      <span className="text-[16px] font-semibold tabular-nums">{value}</span>
    </span>
  )
}

/**
 * The bottom dock: key figures and Kjør simulering always in reach. As a "sheet" it can be pulled up
 * to show the full results; as a "bar" it stays one line high.
 */
export function GDock({ mode }: { mode: GVariant["results"] }) {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const bodyId = useId()
  const sheet = mode === "sheet"
  return (
    <section
      aria-label={t("results.resultsHeading")}
      className="sticky bottom-0 z-20 -mx-4 mt-8 -mb-4 border-t border-[var(--lab-bar-border)] bg-[var(--lab-bar-bg)] shadow-[0_-8px_24px_-12px_rgba(0,0,0,0.3)] sm:-mx-8 sm:-mb-8"
    >
      {sheet && open ? (
        <div id={bodyId} className="max-h-[55vh] space-y-4 overflow-y-auto p-5">
          <KeyFiguresTable />
          <LabSCurve />
        </div>
      ) : null}
      <div className="flex flex-wrap items-center justify-between gap-4 px-4 py-3 sm:px-8">
        <div className="flex flex-wrap items-center gap-x-8 gap-y-2">
          {sheet ? (
            <Button
              type="button"
              variant="outline"
              aria-expanded={open}
              aria-controls={bodyId}
              onClick={() => setOpen((v) => !v)}
              className="h-12 gap-2 text-[13px]"
            >
              {open ? (
                <ChevronDown className="size-4" aria-hidden />
              ) : (
                <ChevronUp className="size-4" aria-hidden />
              )}
              {t("results.resultsHeading")}
            </Button>
          ) : (
            <h2 className="m-0 text-[15px] font-semibold">{t("results.resultsHeading")}</h2>
          )}
          <Figure label={t("keyMetrics.p50")} value={KEY_FIGURES.p50} />
          <Figure label={t("keyMetrics.p85")} value={KEY_FIGURES.p85} />
          {sheet ? null : (
            <>
              <Figure label={t("keyMetrics.baseCost")} value={KEY_FIGURES.baseCost} />
              <Figure
                label={t("keyMetrics.uncertaintyReserve")}
                value={KEY_FIGURES.uncertaintyReserve}
              />
            </>
          )}
        </div>
        <RunButton />
      </div>
    </section>
  )
}
