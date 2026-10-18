import { Plus, Presentation } from "lucide-react"
import { useState } from "react"

import { BTable } from "@/design-lab/families/b/BTable"
import { BCard } from "@/design-lab/families/b/BCard"
import type { BVariant } from "@/design-lab/families/b/types"
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

function Count({ value }: { value: number }) {
  return <span className="rounded-full bg-muted px-1.5 text-[10px] tabular-nums">{value}</span>
}

/** Cost items or drivers: heading with count, the labelled toolbar and the table. */
function TablePane({
  kind,
  roomy = false,
  bare = false,
}: {
  kind: "cost" | "driver"
  roomy?: boolean
  /** Without the heading, when a card already has one. */
  bare?: boolean
}) {
  const { t } = useI18n()
  const rows = kind === "cost" ? COST_ROWS : DRIVER_ROWS
  return (
    <div className={cn("min-w-0", roomy ? "space-y-4" : "space-y-3")}>
      {bare ? null : (
        <h2 className="m-0 flex items-center gap-2 text-[13px] font-semibold">
          {kind === "cost" ? t("expanders.costElements") : t("expanders.drivers")}
          <Count value={rows.length} />
        </h2>
      )}
      <LabToolbar kind={kind} mode="labelled" rowActions="inline" />
      {roomy ? (
        <BTable kind={kind} rows={rows} />
      ) : (
        <LabTable kind={kind} rows={rows} editable rowActions="inline" />
      )}
    </div>
  )
}

/** Assumptions as one compact row, so they stay visible without a tab of their own. */
function AssumptionsStrip() {
  const { t } = useI18n()
  return (
    <div className="flex flex-wrap items-center gap-2 border-t border-border bg-muted/40 px-5 py-3">
      <span className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
        {t("inputs.assumptionsLabel")}
      </span>
      {ASSUMPTIONS.map((text) => (
        <span
          key={text}
          className="rounded-full border border-[var(--lab-field-border)] bg-background px-2.5 py-0.5 text-[12px]"
        >
          {text}
        </span>
      ))}
      <button
        type="button"
        className="flex items-center gap-1 text-[12px] text-[var(--lab-brand)] hover:underline"
      >
        <Plus className="size-3.5" aria-hidden />
        {t("inputs.assumptionsAdd")}
      </button>
    </div>
  )
}

function TabbedBody({ roomy }: { roomy: boolean }) {
  const { t } = useI18n()
  const [tab, setTab] = useState<Tab>("cost")
  const tabs: { id: Tab; label: string; count: number }[] = [
    { id: "cost", label: t("expanders.costElements"), count: COST_ROWS.length },
    { id: "driver", label: t("expanders.drivers"), count: DRIVER_ROWS.length },
    { id: "assumptions", label: t("inputs.assumptionsLabel"), count: ASSUMPTIONS.length },
  ]
  return (
    <>
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
            <Count value={item.count} />
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
          <TablePane kind={tab} roomy={roomy} />
        )}
      </div>
    </>
  )
}

/** The project profile and, when asked, the Fokusmodus button with the Presentation icon. */
function ProfileRow({ showFocus }: { showFocus: boolean }) {
  const { t } = useI18n()
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <LabProjectProfile className="min-w-0 flex-1" />
      {showFocus ? (
        <Button
          type="button"
          size="sm"
          className="gap-1.5 border-transparent bg-[var(--lab-action)] text-[12px] text-white hover:bg-[var(--lab-action)]/90 hover:text-white"
        >
          <Presentation className="size-3.5" aria-hidden />
          {t("inputs.guidedFocusMode")}
        </Button>
      ) : null}
    </div>
  )
}

/**
 * The input card. "tabs" shows one of cost items, drivers or assumptions at a time; "split" shows
 * cost items and drivers side by side; "stacked" shows them one above the other in one scroll.
 * In both of the last two, assumptions stay visible as a strip at the bottom.
 */
export function BInputs({
  mode,
  showFocus = true,
  density = "normal",
  cardStyle,
}: {
  mode: BVariant["inputs"]
  showFocus?: boolean
  density?: BVariant["density"]
  cardStyle?: BVariant["cardStyle"]
}) {
  const { t } = useI18n()
  const roomy = density === "roomy"
  if (cardStyle) {
    return (
      <div className="space-y-6">
        <section className="rounded-2xl border border-border bg-[var(--b-card)] px-6 py-4 shadow-sm">
          <ProfileRow showFocus={showFocus} />
        </section>
        <div className={mode === "split" ? "grid items-start gap-6 xl:grid-cols-2" : "space-y-6"}>
          <BCard
            style={cardStyle}
            badge="1"
            title={t("expanders.costElements")}
            count={COST_ROWS.length}
          >
            <TablePane kind="cost" roomy={roomy} bare />
          </BCard>
          <BCard
            style={cardStyle}
            badge="2"
            title={t("expanders.drivers")}
            count={DRIVER_ROWS.length}
          >
            <TablePane kind="driver" roomy={roomy} bare />
          </BCard>
        </div>
        <BCard
          style={cardStyle}
          badge="3"
          title={t("inputs.assumptionsLabel")}
          count={ASSUMPTIONS.length}
        >
          <ul className="m-0 flex list-none flex-wrap gap-2 p-0 text-[13px]">
            {ASSUMPTIONS.map((text) => (
              <li
                key={text}
                className="rounded-full border border-[var(--lab-field-border)] bg-background px-3 py-1"
              >
                {text}
              </li>
            ))}
          </ul>
        </BCard>
      </div>
    )
  }
  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-[var(--b-card)] shadow-sm">
      <div className={cn("border-b border-border px-5", roomy ? "py-4" : "py-3")}>
        <ProfileRow showFocus={showFocus} />
      </div>

      {mode === "tabs" ? <TabbedBody roomy={roomy} /> : null}

      {mode === "split" ? (
        <>
          <div className="grid divide-y divide-border lg:grid-cols-2 lg:divide-x lg:divide-y-0">
            <div className={roomy ? "p-7" : "p-5"}>
              <TablePane kind="cost" roomy={roomy} />
            </div>
            <div className={roomy ? "p-7" : "p-5"}>
              <TablePane kind="driver" roomy={roomy} />
            </div>
          </div>
          <AssumptionsStrip />
        </>
      ) : null}

      {mode === "stacked" ? (
        <>
          <div className={roomy ? "space-y-8 p-7" : "space-y-5 p-5"}>
            <TablePane kind="cost" roomy={roomy} />
            <div className={cn("border-t border-border", roomy ? "pt-8" : "pt-5")}>
              <TablePane kind="driver" roomy={roomy} />
            </div>
          </div>
          <AssumptionsStrip />
        </>
      ) : null}
    </section>
  )
}
