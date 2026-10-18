import { ArrowLeft, ArrowRight, Check, Lightbulb, Presentation } from "lucide-react"
import { useEffect, useState } from "react"

import { DCheckpoints } from "@/design-lab/families/d/DCheckpoints"
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
import { COST_ROWS, DRIVER_ROWS, FILE_NAME, KEY_FIGURES } from "@/design-lab/sampleData"
import type { SampleRow } from "@/design-lab/sampleData"
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
                {variant.ticks && done ? (
                  <span className="block text-[12px] text-[var(--lab-brand)]">Ferdig</span>
                ) : null}
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

function ProgressBar({ percent }: { percent: number }) {
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-[13px]">
        <span className="font-semibold">Fremdrift</span>
        <span className="text-muted-foreground tabular-nums">{percent} % ferdig</span>
      </div>
      <div
        role="progressbar"
        aria-label="Fremdrift"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        className="h-2.5 overflow-hidden rounded-full bg-[var(--lab-tint-strong)]"
      >
        <div
          className="h-full rounded-full bg-[var(--lab-accent)] transition-[width]"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  )
}

/** Checks that every row has low, likely and high, and says what to do if not. */
function Validation({ rows, noun }: { rows: readonly SampleRow[]; noun: string }) {
  const complete = rows.filter((r) => r.optimistic && r.likely && r.pessimistic).length
  const ok = complete === rows.length
  return (
    <p
      role="status"
      className="m-0 mt-4 flex items-start gap-2 rounded-lg bg-[var(--lab-tint)] px-4 py-3 text-[14px]"
    >
      <Check className="mt-0.5 size-4 shrink-0 text-[var(--lab-brand)]" aria-hidden />
      <span>
        {ok
          ? `Alle ${rows.length} ${noun} er fylt inn. `
          : `${complete} av ${rows.length} ${noun} er fylt inn. `}
        <span className="text-muted-foreground">Fyll inn lav, mest sannsynlig og høy.</span>
      </span>
    </p>
  )
}

function HelpPanel({ step }: { step: (typeof STEPS)[number] }) {
  return (
    <aside aria-label="Hjelp" className="space-y-3 rounded-xl border border-border p-4">
      <h3 className="m-0 flex items-center gap-2 text-[13px] font-semibold">
        <Lightbulb className="size-4 text-[var(--lab-brand)]" aria-hidden />
        Slik gjør du
      </h3>
      <p className="m-0 rounded-lg bg-[var(--lab-tint)] p-3 text-[13px]">{step.example}</p>
      <ul className="m-0 list-disc space-y-1 pl-5 text-[13px] text-muted-foreground">
        {step.tips.map((tip) => (
          <li key={tip}>{tip}</li>
        ))}
      </ul>
    </aside>
  )
}

/** The checklist before running: what goes into the simulation, with a way back to each part. */
function ReviewPanel({ onEdit }: { onEdit: (index: number) => void }) {
  const items = [
    { label: `Prosjekt: ${FILE_NAME}`, index: 0 },
    { label: `${COST_ROWS.length} kostnadsposter`, index: 1 },
    { label: `${DRIVER_ROWS.length} drivere`, index: 2 },
  ]
  return (
    <div className="space-y-3 rounded-xl border border-border p-5">
      <h3 className="m-0 text-[16px] font-semibold">Kontroller før kjøring</h3>
      <ul className="m-0 list-none space-y-2 p-0">
        {items.map((item) => (
          <li key={item.label} className="flex items-center justify-between gap-3 text-[14px]">
            <span className="flex items-center gap-2">
              <Check className="size-4 text-[var(--lab-brand)]" aria-hidden />
              {item.label}
            </span>
            <Button type="button" variant="outline" size="sm" onClick={() => onEdit(item.index)}>
              Endre
            </Button>
          </li>
        ))}
      </ul>
    </div>
  )
}

function Headline() {
  return (
    <div className="rounded-2xl bg-[var(--lab-tint)] p-6 text-center">
      <p className="m-0 text-[13px] text-muted-foreground">Mest sannsynlig totalkostnad (P50)</p>
      <p className="m-0 mt-1 text-5xl font-semibold tracking-tight tabular-nums">
        {KEY_FIGURES.p50} kr
      </p>
      <p className="m-0 mt-2 text-[14px] text-muted-foreground">
        Trygt budsjett (P85): {KEY_FIGURES.p85} kr
      </p>
    </div>
  )
}

function StepBody({
  id,
  variant,
  showResults,
  onEdit,
}: {
  id: StepId
  variant: DVariant
  showResults: boolean
  onEdit: (index: number) => void
}) {
  if (id === "profile") return <LabProjectProfile />
  if (id === "cost")
    return (
      <>
        <CTable kind="cost" rows={COST_ROWS} style="filled" airy />
        {variant.hints ? <Validation rows={COST_ROWS} noun="poster" /> : null}
      </>
    )
  if (id === "driver")
    return (
      <>
        <CTable kind="driver" rows={DRIVER_ROWS} style="filled" airy />
        {variant.hints ? <Validation rows={DRIVER_ROWS} noun="drivere" /> : null}
      </>
    )
  if (!showResults) return <ReviewPanel onEdit={onEdit} />
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {variant.headline ? (
        <div className="lg:col-span-2">
          <Headline />
        </div>
      ) : null}
      <KeyFiguresTable />
      <LabSCurve />
      <div className="lg:col-span-2">
        <LabTornado />
      </div>
    </div>
  )
}

/** The input not on screen, so cost items and drivers stay in view together: names only. */
function Summary({ current, values }: { current: StepId; values: boolean }) {
  const groups = (
    [
      { id: "cost", title: "Kostnadsposter", rows: COST_ROWS },
      { id: "driver", title: "Drivere", rows: DRIVER_ROWS },
    ] as const
  ).filter((group) => group.id !== current)
  return (
    <aside aria-label="Oppsummering" className="space-y-4 rounded-xl bg-[var(--lab-tint)] p-4">
      <h3 className="m-0 text-[13px] font-semibold">Så langt</h3>
      {groups.map((group) => (
        <div key={group.id}>
          <p className="m-0 text-[11px] tracking-wide text-muted-foreground uppercase">
            {group.title} ({group.rows.length})
          </p>
          <ul className="m-0 mt-1 list-none space-y-1 p-0 text-[13px]">
            {group.rows.map((row) => (
              <li key={row.name} className="grid grid-cols-[1fr_auto] gap-2">
                <span className="truncate">{row.name}</span>
                {values ? (
                  <span className="w-44 text-right text-muted-foreground tabular-nums">
                    {row.optimistic} / {row.likely} / {row.pessimistic}
                  </span>
                ) : null}
              </li>
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
  const [ran, setRan] = useState(false)
  const last = current === STEPS.length - 1
  const enterNext = variant.enterNext === true

  useEffect(() => {
    if (!enterNext || last) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Enter") return
      const target = e.target
      if (target instanceof HTMLElement && target.closest("input, textarea, select, button, a"))
        return
      setCurrent((c) => Math.min(c + 1, STEPS.length - 1))
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [enterNext, last])

  const step = STEPS[current] ?? STEPS[0]
  if (!step) return null
  const side = variant.stepper === "side"
  const isInput = step.id === "cost" || step.id === "driver"
  const showResults = !variant.review || ran
  const percent = Math.round(((current + (last && showResults ? 1 : 0)) / STEPS.length) * 100)
  const together = variant.together === true && step.id === "cost"
  const single = variant.singleColumn === true
  const showAside = isInput || variant.helpPanel
  return (
    <div
      style={themeStyle(variant.theme)}
      className="flex min-h-screen flex-col bg-[var(--b-canvas)] font-sans text-foreground"
      data-lab-variant={`d${variant.id}`}
    >
      <LabHeader options={{ fileName: "none", bar: "distinct", nav: "farRight", user: true }} />
      <div className="flex flex-1">
        <div className={cn(single && "hidden lg:block")}>
          <CSidebar />
        </div>
        <main
          className={cn(
            "mx-auto w-full min-w-0 flex-1 space-y-6",
            single ? "max-w-3xl p-4 sm:p-8" : "max-w-[84rem] p-8",
          )}
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <LabInputHeading mode="fileName" />
              <Button type="button" variant="outline" size="sm" className="gap-1.5 text-[12px]">
                <Presentation className="size-3.5 text-[var(--lab-brand)]" aria-hidden />
                {t("inputs.guidedFocusMode")}
              </Button>
            </div>
            <LabDocumentActions state="active" tone="accent" />
          </div>

          <DCheckpoints style={variant.checkpoints ?? "row"} />
          {variant.progress ? <ProgressBar percent={percent} /> : null}
          {single ? (
            <p className="m-0 text-[15px] font-semibold sm:hidden">
              Steg {current + 1} av {STEPS.length}: {step.title}
            </p>
          ) : null}

          <div className={cn("gap-6", side ? "grid lg:grid-cols-[18rem_1fr]" : "space-y-6")}>
            <div className={cn(single && "hidden sm:block")}>
              <Stepper variant={variant} current={current} onSelect={setCurrent} />
            </div>
            <section
              aria-label={step.title}
              className={cn(
                "min-w-0 space-y-5 rounded-2xl border border-border bg-[var(--b-card)] shadow-sm",
                single ? "p-5 sm:p-7" : "p-7",
              )}
            >
              <div>
                <h2 className="m-0 text-[22px] font-semibold tracking-tight">
                  {current + 1}. {step.title}
                </h2>
                <p className="mt-1 mb-0 max-w-prose text-[14px] text-muted-foreground">
                  {step.help}
                </p>
              </div>
              <div
                className={cn(
                  "gap-6",
                  showAside &&
                    (together ? "grid xl:grid-cols-[1fr_26rem]" : "grid xl:grid-cols-[1fr_16rem]"),
                )}
              >
                <div className="min-w-0">
                  <StepBody
                    id={step.id}
                    variant={variant}
                    showResults={showResults}
                    onEdit={setCurrent}
                  />
                </div>
                {showAside ? (
                  <div className="space-y-4">
                    {variant.helpPanel ? <HelpPanel step={step} /> : null}
                    {isInput ? <Summary current={step.id} values={together} /> : null}
                  </div>
                ) : null}
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5">
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
                    onClick={() => setRan(true)}
                    className={cn(
                      brandPrimaryButtonClass,
                      "h-10 px-8 text-[12px] font-semibold uppercase",
                    )}
                  >
                    {t("buttons.runSimulation")}
                  </Button>
                ) : (
                  <div className="flex items-center gap-3">
                    {enterNext ? (
                      <span className="hidden text-[12px] text-muted-foreground sm:inline">
                        Trykk{" "}
                        <kbd className="rounded border border-border px-1.5 py-0.5">Enter</kbd> for
                        å gå videre
                      </span>
                    ) : null}
                    <Button
                      type="button"
                      onClick={() => setCurrent(current + 1)}
                      className="gap-1.5"
                    >
                      Neste steg
                      <ArrowRight className="size-4" aria-hidden />
                    </Button>
                  </div>
                )}
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  )
}
