import { Play, Plus } from "lucide-react"
import { useState } from "react"

import { LabProjectProfile } from "@/design-lab/parts/LabProjectProfile"
import { LabTable } from "@/design-lab/parts/LabTable"
import { LabToolbar } from "@/design-lab/parts/LabToolbar"
import { COST_ROWS, DRIVER_ROWS } from "@/design-lab/sampleData"
import { useI18n } from "@/i18n/useI18n"
import { Button } from "@/shared/ui/button"
import { cn } from "@/shared/utils"

type Tab = "cost" | "driver" | "assumptions"

const ASSUMPTIONS = [
  "Priser er oppgitt i faste 2026-kroner, uten mva.",
  "Tomten er ferdig regulert og byggeklar.",
  "Entreprisen gjennomføres som totalentreprise.",
]

/** Input card: project profile on top, then one tabbed area for cost items, drivers and assumptions. */
export function BInputs() {
  const { t } = useI18n()
  const [tab, setTab] = useState<Tab>("cost")
  const tabs: { id: Tab; label: string; count: number }[] = [
    { id: "cost", label: t("expanders.costElements"), count: COST_ROWS.length },
    { id: "driver", label: t("expanders.drivers"), count: DRIVER_ROWS.length },
    { id: "assumptions", label: t("inputs.assumptionsLabel"), count: ASSUMPTIONS.length },
  ]

  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-[var(--b-card)] shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-5 py-3">
        <LabProjectProfile className="min-w-0 flex-1" />
        <Button
          type="button"
          size="sm"
          className="gap-1.5 border-transparent bg-[var(--lab-action)] text-[12px] text-white hover:bg-[var(--lab-action)]/90 hover:text-white"
        >
          <Play className="size-3.5 fill-current" aria-hidden />
          {t("inputs.guidedFocusMode")}
        </Button>
      </div>

      <div role="tablist" className="flex gap-1 border-b border-border px-3">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            onClick={() => setTab(item.id)}
            className={cn(
              "-mb-px flex items-center gap-2 border-b-2 px-3 py-2.5 text-[13px]",
              tab === item.id
                ? "border-[var(--lab-brand)] font-semibold text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {item.label}
            <span className="rounded-full bg-muted px-1.5 text-[10px] tabular-nums">
              {item.count}
            </span>
          </button>
        ))}
      </div>

      <div role="tabpanel" className="space-y-3 p-5">
        {tab === "assumptions" ? (
          <ul className="m-0 list-none space-y-2 p-0 text-[13px]">
            {ASSUMPTIONS.map((text) => (
              <li
                key={text}
                className="rounded-lg border border-[var(--lab-field-border)] bg-background px-3 py-2"
              >
                {text}
              </li>
            ))}
            <li>
              <button
                type="button"
                className="flex items-center gap-1.5 text-[12px] text-[var(--lab-brand)] hover:underline"
              >
                <Plus className="size-3.5" aria-hidden />
                {t("inputs.assumptionsAdd")}
              </button>
            </li>
          </ul>
        ) : (
          <>
            <LabToolbar kind={tab} mode="labelled" rowActions="inline" />
            <LabTable
              kind={tab}
              rows={tab === "cost" ? COST_ROWS : DRIVER_ROWS}
              editable
              rowActions="inline"
            />
          </>
        )}
      </div>
    </section>
  )
}
