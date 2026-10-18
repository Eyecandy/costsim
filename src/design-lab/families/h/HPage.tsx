import { Presentation } from "lucide-react"
import { useState, type ReactNode } from "react"

import { CSidebar } from "@/design-lab/families/c/CSidebar"
import { CTable } from "@/design-lab/families/c/CTable"
import { DCheckpoints } from "@/design-lab/families/d/DCheckpoints"
import type { HVariant } from "@/design-lab/families/h/types"
import { LabSCurve, LabTornado } from "@/design-lab/parts/LabCharts"
import { LabDocumentActions } from "@/design-lab/parts/LabDocumentActions"
import { LabHeader } from "@/design-lab/parts/LabHeader"
import { LabInputHeading } from "@/design-lab/parts/LabInputTop"
import { LabProjectProfile } from "@/design-lab/parts/LabProjectProfile"
import { COST_ROWS, DRIVER_ROWS, KEY_FIGURES, type SampleRow } from "@/design-lab/sampleData"
import { themeStyle } from "@/design-lab/themes"
import { useI18n } from "@/i18n/useI18n"
import { brandPrimaryButtonClass } from "@/shared/brand"
import { Button } from "@/shared/ui/button"
import { cn } from "@/shared/utils"

type Mode = "read" | "edit"

const CARD = "rounded-2xl border border-border bg-[var(--b-card)] p-6 shadow-sm"

function ModeToggle({ mode, onChange }: { mode: Mode; onChange: (mode: Mode) => void }) {
  const option = (value: Mode, label: string) => (
    <button
      type="button"
      aria-pressed={mode === value}
      onClick={() => onChange(value)}
      className={cn(
        "h-9 w-24 rounded-full text-[13px] font-semibold",
        mode === value
          ? "bg-[var(--lab-brand)] text-white"
          : "text-muted-foreground hover:bg-[var(--lab-tint)]",
      )}
    >
      {label}
    </button>
  )
  return (
    <div className="inline-flex gap-1 rounded-full border border-border bg-background p-1">
      {option("read", "Les")}
      {option("edit", "Rediger")}
    </div>
  )
}

function Headline({ style }: { style: HVariant["headline"] }) {
  const { t } = useI18n()
  const figures: [string, string][] = [
    [t("keyMetrics.p50"), KEY_FIGURES.p50],
    [t("keyMetrics.p85"), KEY_FIGURES.p85],
    [t("keyMetrics.uncertaintyReserve"), KEY_FIGURES.uncertaintyReserve],
  ]
  const sentence = (
    <p className="m-0 text-[17px] leading-relaxed text-muted-foreground">
      Med 50 % sannsynlighet blir kostnaden under {KEY_FIGURES.p50} kr, og med 85 % sannsynlighet
      under {KEY_FIGURES.p85} kr. Forventet tillegg til grunnkostnaden på {KEY_FIGURES.baseCost} kr
      er {KEY_FIGURES.expectedAddition} kr {KEY_FIGURES.expectedAdditionPercent}.
    </p>
  )
  if (style === "sentence") {
    return (
      <section aria-label="Hovedtall" className={cn(CARD, "grid gap-8 lg:grid-cols-[1fr_28rem]")}>
        <div className="space-y-3">
          <h2 className="m-0 text-[28px] font-semibold tracking-tight">
            {KEY_FIGURES.p50} kr er det mest sannsynlige
          </h2>
          {sentence}
        </div>
        <dl className="m-0 grid grid-cols-3 gap-4">
          {figures.map(([label, value]) => (
            <div key={label}>
              <dt className="text-[12px] text-muted-foreground">{label}</dt>
              <dd className="m-0 text-[20px] font-semibold tabular-nums">{value}</dd>
            </div>
          ))}
        </dl>
      </section>
    )
  }
  return (
    <section aria-label="Hovedtall" className="space-y-4">
      <dl className="m-0 grid gap-4 md:grid-cols-3">
        {figures.map(([label, value], index) => (
          <div key={label} className={cn(CARD, "space-y-1")}>
            <dt className="text-[13px] font-medium text-muted-foreground">{label}</dt>
            <dd
              className={cn(
                "m-0 text-[40px] leading-tight font-semibold tracking-tight tabular-nums",
                index === 0 && "text-[var(--lab-brand)]",
              )}
            >
              {value}
            </dd>
          </div>
        ))}
      </dl>
      {sentence}
    </section>
  )
}

/** A clean read-only table with fixed-width columns, for showing the page in a meeting. */
function ReadTable({ kind, rows }: { kind: "cost" | "driver"; rows: readonly SampleRow[] }) {
  const { t } = useI18n()
  const head = "px-3 py-2 text-[11px] font-medium tracking-wide text-muted-foreground uppercase"
  return (
    <table className="w-full table-fixed border-collapse text-[14px]">
      <colgroup>
        <col />
        <col className="w-28" />
        <col className="w-28" />
        <col className="w-28" />
      </colgroup>
      <thead>
        <tr>
          <th className={cn(head, "text-left")}>{t("inputs.nameHeader")}</th>
          <th className={cn(head, "text-right")}>{t("inputs.optimisticHeader")}</th>
          <th className={cn(head, "text-right")}>
            {kind === "cost" ? t("inputs.likelyHeader") : t("inputs.likelyPercentHeader")}
          </th>
          <th className={cn(head, "text-right")}>{t("inputs.pessimisticHeader")}</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.name} className="border-b border-border/50">
            <td className="px-3 py-3 font-medium">{row.name}</td>
            <td className="px-3 py-3 text-right tabular-nums">{row.optimistic}</td>
            <td className="px-3 py-3 text-right tabular-nums">{row.likely}</td>
            <td className="px-3 py-3 text-right tabular-nums">{row.pessimistic}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function InputSection({
  title,
  edit,
  children,
}: {
  title: string
  edit: boolean
  children: ReactNode
}) {
  return (
    <section aria-label={title} className="min-w-0 space-y-2">
      <h3 className="m-0 text-[16px] font-semibold">{title}</h3>
      <div className={cn(edit && "overflow-x-auto")}>{children}</div>
    </section>
  )
}

/** Cost items and drivers together: editable tables in Rediger, plain summaries in Les. */
function Inputs({ edit }: { edit: boolean }) {
  return (
    <div className="space-y-6">
      <InputSection title="Kostnadsposter" edit={edit}>
        {edit ? (
          <div className="min-w-[34rem]">
            <CTable kind="cost" rows={COST_ROWS} style="filled" airy pencil />
          </div>
        ) : (
          <ReadTable kind="cost" rows={COST_ROWS} />
        )}
      </InputSection>
      <InputSection title="Drivere" edit={edit}>
        {edit ? (
          <div className="min-w-[34rem]">
            <CTable kind="driver" rows={DRIVER_ROWS} style="filled" airy pencil />
          </div>
        ) : (
          <ReadTable kind="driver" rows={DRIVER_ROWS} />
        )}
      </InputSection>
    </div>
  )
}

/**
 * Family H, "Rapport først": the page opens as a readable report (big P50/P85, S-curve, tornado).
 * The inputs sit behind a Les / Rediger toggle: in Rediger they open as roomy editable tables, in
 * a drawer beside the report or inline under it; in Les they are plain read-only summaries.
 */
export function HPage({ variant }: { variant: HVariant }) {
  const { t } = useI18n()
  const [mode, setMode] = useState<Mode>("read")
  const editing = mode === "edit"
  const drawer = variant.edit === "drawer"
  const showLibrary = variant.library === "always" || (variant.library === "read" && !editing)

  return (
    <div
      style={themeStyle(variant.theme)}
      className="flex min-h-screen flex-col bg-[var(--b-canvas)] font-sans text-foreground"
      data-lab-variant={`h${variant.id}`}
      data-mode={mode}
    >
      <LabHeader options={{ fileName: "none", bar: "distinct", nav: "farRight", user: true }} />
      <div className="flex flex-1">
        {showLibrary ? <CSidebar /> : null}
        <main className="mx-auto w-full max-w-[96rem] min-w-0 flex-1 space-y-6 p-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <LabInputHeading mode="fileName" />
              <Button type="button" variant="outline" size="sm" className="gap-1.5 text-[12px]">
                <Presentation className="size-3.5 text-[var(--lab-brand)]" aria-hidden />
                {t("inputs.guidedFocusMode")}
              </Button>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <ModeToggle mode={mode} onChange={setMode} />
              <Button
                type="button"
                className={cn(brandPrimaryButtonClass, "h-9 text-[12px] font-semibold uppercase")}
              >
                {t("buttons.runSimulation")}
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4">
            <DCheckpoints style="row" />
            <LabDocumentActions state="active" tone="accent" />
          </div>

          <div
            className={cn(
              "gap-8",
              drawer && editing ? "grid xl:grid-cols-[minmax(0,1fr)_44rem]" : "space-y-8",
            )}
          >
            <div className="min-w-0 space-y-8">
              <Headline style={variant.headline} />
              <section aria-label="Diagrammer">
                <div
                  className={cn(
                    "gap-6",
                    variant.charts === "side" ? "grid lg:grid-cols-2" : "space-y-6",
                  )}
                >
                  <div className={CARD}>
                    <LabSCurve tall={variant.charts === "stacked"} />
                  </div>
                  <div className={CARD}>
                    <LabTornado />
                  </div>
                </div>
              </section>
              <LabProjectProfile />
              {drawer && editing ? null : (
                <section
                  aria-label={editing ? "Rediger inndata" : "Inndata"}
                  className={cn(CARD, "space-y-4")}
                >
                  <h2 className="m-0 text-[20px] font-semibold tracking-tight">
                    {editing ? "Rediger inndata" : "Inndata"}
                  </h2>
                  <Inputs edit={editing} />
                </section>
              )}
            </div>
            {drawer && editing ? (
              <aside
                aria-label="Rediger inndata"
                className={cn(CARD, "h-fit space-y-4 xl:sticky xl:top-6")}
              >
                <div className="flex items-center justify-between gap-3">
                  <h2 className="m-0 text-[20px] font-semibold tracking-tight">Rediger inndata</h2>
                  <Button type="button" variant="outline" size="sm" onClick={() => setMode("read")}>
                    Ferdig
                  </Button>
                </div>
                <Inputs edit />
              </aside>
            ) : null}
          </div>
        </main>
      </div>
    </div>
  )
}
