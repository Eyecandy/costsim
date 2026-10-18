import { ArrowLeft, ArrowRight, Check, Presentation } from "lucide-react"
import { useState } from "react"

import { CSidebar } from "@/design-lab/families/c/CSidebar"
import { CTable } from "@/design-lab/families/c/CTable"
import { STEPS, type StepId } from "@/design-lab/families/d/steps"
import type { DVariant } from "@/design-lab/families/d/types"
import { LabDocumentActions } from "@/design-lab/parts/LabDocumentActions"
import { LabHeader } from "@/design-lab/parts/LabHeader"
import { LabSCurve, LabTornado } from "@/design-lab/parts/LabCharts"
import { LabInputHeading } from "@/design-lab/parts/LabInputTop"
import { LabProjectProfile } from "@/design-lab/parts/LabProjectProfile"
import { KeyFiguresTable } from "@/design-lab/parts/LabResults"
import { COST_ROWS, DRIVER_ROWS } from "@/design-lab/sampleData"
import { themeStyle } from "@/design-lab/themes"
import { useI18n } from "@/i18n/useI18n"
import { brandPrimaryButtonClass } from "@/shared/brand"
import { Button } from "@/shared/ui/button"
import { cn } from "@/shared/utils"

function Stepper({
  variant,
  current,
  onSelect,
}: {
  variant: DVariant
  current: number
  onSelect: (index: number) => void
}) {
  const side = variant.stepper === "side"
  return (
    <ol
      aria-label="Steg"
      className={cn("m-0 flex list-none gap-2 p-0", side ? "flex-col" : "flex-wrap items-stretch")}
    >
      {STEPS.map((step, index) => {
        const done = index < current
        const active = index === current
        return (
          <li key={step.id} className={side ? "" : "min-w-[9rem] flex-1"}>
            <button
              type="button"
              aria-current={active ? "step" : undefined}
              onClick={() => onSelect(index)}
              className={cn(
                "flex w-full items-start gap-3 rounded-xl border p-3 text-left",
                active
                  ? "border-[var(--lab-accent)] bg-background shadow-sm"
                  : "border-border bg-[var(--b-card)] hover:border-[var(--lab-accent)]/50",
              )}
            >
              <span
                className={cn(
                  "grid size-7 shrink-0 place-items-center rounded-full text-[12px] font-semibold",
                  active
                    ? "bg-[var(--lab-accent)] text-white"
                    : done
                      ? "bg-[var(--lab-tint-strong)] text-foreground"
                      : "border border-border text-muted-foreground",
                )}
              >
                {done ? <Check className="size-3.5" aria-hidden /> : index + 1}
              </span>
              <span className="min-w-0">
                <span className="block text-[13px] font-semibold">{step.title}</span>
                {side ? (
                  <span className="mt-0.5 block text-[12px] text-muted-foreground">
                    {step.help}
                  </span>
                ) : null}
              </span>
            </button>
          </li>
        )
      })}
    </ol>
  )
}

function StepBody({ id }: { id: StepId }) {
  if (id === "profile") return <LabProjectProfile />
  if (id === "cost") return <CTable kind="cost" rows={COST_ROWS} style="filled" airy />
  if (id === "driver") return <CTable kind="driver" rows={DRIVER_ROWS} style="filled" airy />
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <KeyFiguresTable />
      <LabSCurve />
      <div className="lg:col-span-2">
        <LabTornado />
      </div>
    </div>
  )
}

/** The input not on screen, so cost items and drivers stay in view together: names only. */
function Summary({ current }: { current: StepId }) {
  const groups = (
    [
      { id: "cost", title: "Kostnadsposter", items: COST_ROWS.map((row) => row.name) },
      { id: "driver", title: "Drivere", items: DRIVER_ROWS.map((row) => row.name) },
    ] as const
  ).filter((group) => group.id !== current)
  return (
    <aside aria-label="Oppsummering" className="space-y-4 rounded-xl bg-[var(--lab-tint)] p-4">
      <h3 className="m-0 text-[13px] font-semibold">Så langt</h3>
      {groups.map((group) => (
        <div key={group.id}>
          <p className="m-0 text-[11px] tracking-wide text-muted-foreground uppercase">
            {group.title} ({group.items.length})
          </p>
          <ul className="m-0 mt-1 list-none space-y-0.5 p-0 text-[13px]">
            {group.items.map((name) => (
              <li key={name}>{name}</li>
            ))}
          </ul>
        </div>
      ))}
    </aside>
  )
}

/** Family D: one step at a time, large cells and a short explanation, so nobody has to know the whole page. */
export function DPage({ variant }: { variant: DVariant }) {
  const { t } = useI18n()
  const [current, setCurrent] = useState(0)
  const step = STEPS[current] ?? STEPS[0]
  if (!step) return null
  const last = current === STEPS.length - 1
  const side = variant.stepper === "side"
  const isInput = step.id === "cost" || step.id === "driver"
  return (
    <div
      style={themeStyle(variant.theme)}
      className="flex min-h-screen flex-col bg-[var(--b-canvas)] font-sans text-foreground"
      data-lab-variant={`d${variant.id}`}
    >
      <LabHeader options={{ fileName: "none", bar: "distinct", nav: "farRight", user: true }} />
      <div className="flex flex-1">
        <CSidebar />
        <main className="mx-auto w-full max-w-[84rem] min-w-0 flex-1 space-y-6 p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <LabInputHeading mode="fileName" />
              <Button type="button" variant="outline" size="sm" className="gap-1.5 text-[12px]">
                <Presentation className="size-3.5 text-[var(--lab-brand)]" aria-hidden />
                {t("inputs.guidedFocusMode")}
              </Button>
            </div>
            <LabDocumentActions state="active" />
          </div>

          <div className={cn("gap-6", side ? "grid lg:grid-cols-[18rem_1fr]" : "space-y-6")}>
            <Stepper variant={variant} current={current} onSelect={setCurrent} />
            <section
              aria-label={step.title}
              className="min-w-0 space-y-5 rounded-2xl border border-border bg-[var(--b-card)] p-7 shadow-sm"
            >
              <div>
                <h2 className="m-0 text-[22px] font-semibold tracking-tight">
                  {current + 1}. {step.title}
                </h2>
                <p className="mt-1 mb-0 max-w-prose text-[14px] text-muted-foreground">
                  {step.help}
                </p>
              </div>
              <div className={cn("gap-6", isInput && "grid xl:grid-cols-[1fr_16rem]")}>
                <div className="min-w-0">
                  <StepBody id={step.id} />
                </div>
                {isInput ? <Summary current={step.id} /> : null}
              </div>
              <div className="flex items-center justify-between border-t border-border pt-5">
                <Button
                  type="button"
                  variant="outline"
                  disabled={current === 0}
                  onClick={() => setCurrent(current - 1)}
                  className="gap-1.5"
                >
                  <ArrowLeft className="size-4" aria-hidden />
                  Forrige steg
                </Button>
                {last ? (
                  <Button
                    type="button"
                    className={cn(
                      brandPrimaryButtonClass,
                      "h-10 px-8 text-[12px] font-semibold uppercase",
                    )}
                  >
                    {t("buttons.runSimulation")}
                  </Button>
                ) : (
                  <Button type="button" onClick={() => setCurrent(current + 1)} className="gap-1.5">
                    Neste steg
                    <ArrowRight className="size-4" aria-hidden />
                  </Button>
                )}
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  )
}
