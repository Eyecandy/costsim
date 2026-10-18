import { useState, type ReactNode } from "react"

import { CSidebar } from "@/design-lab/families/c/CSidebar"
import { LabCheckpointStrip } from "@/design-lab/parts/LabCheckpointStrip"
import { LabCheckpointTimeline } from "@/design-lab/parts/LabCheckpointTimeline"
import { LabDocumentActions } from "@/design-lab/parts/LabDocumentActions"
import { LabHeader } from "@/design-lab/parts/LabHeader"
import { LabInputTabs, type InputKind } from "@/design-lab/parts/LabInputTabs"
import {
  LabCheckpoint,
  LabFocusButton,
  LabInputHeading,
  LabProfileRow,
} from "@/design-lab/parts/LabInputTop"
import { LabFullscreenResult, LabResults } from "@/design-lab/parts/LabResults"
import { LabProjectProfile } from "@/design-lab/parts/LabProjectProfile"
import { LabSidebar } from "@/design-lab/parts/LabSidebar"
import { LabStepCard } from "@/design-lab/parts/LabStepCard"
import { LabTable } from "@/design-lab/parts/LabTable"
import { LabToolbar } from "@/design-lab/parts/LabToolbar"
import { LabWizardFooter, LabWizardStepper } from "@/design-lab/parts/LabWizardNav"
import { COST_ROWS, DRIVER_ROWS } from "@/design-lab/sampleData"
import { themeStyle } from "@/design-lab/themes"
import type { LabOptions, LabVariant } from "@/design-lab/variants/types"
import { useI18n } from "@/i18n/useI18n"
import { brandPrimaryButtonClass } from "@/shared/brand"
import { SectionExpander } from "@/shared/SectionExpander"
import { Button } from "@/shared/ui/button"
import { cn } from "@/shared/utils"

const CARD =
  "rounded-[var(--radius)] border border-border bg-[color-mix(in_oklab,var(--muted)_35%,var(--background))] p-4"

function InputBody({ kind, options }: { kind: InputKind; options: LabOptions }) {
  const { t } = useI18n()
  const airy = options.spacing === "airy"
  return (
    <div className={cn("pt-2", airy ? "space-y-5" : "space-y-3")}>
      {kind === "cost" ? (
        <p className={cn("m-0 text-muted-foreground", airy ? "text-[12px]" : "text-[11px]")}>
          {t("inputs.assumptionsLabel")} · {t("inputs.assumptionsNoneDefined")} ·{" "}
          <span className="underline">{t("inputs.assumptionsAddShort")}</span>
        </p>
      ) : null}
      <LabToolbar
        kind={kind}
        mode={options.toolbar}
        rowActions={options.rowActions}
        focus={options.focusInToolbar}
      />
      <LabTable
        kind={kind}
        rows={kind === "cost" ? COST_ROWS : DRIVER_ROWS}
        editable={options.cues.editable}
        rowActions={options.rowActions}
        size={options.tableSize}
      />
    </div>
  )
}

function InputCard({ kind, options }: { kind: InputKind; options: LabOptions }) {
  const { t } = useI18n()
  const title = kind === "cost" ? t("expanders.costElements") : t("expanders.drivers")
  const content = <InputBody kind={kind} options={options} />
  return (
    <section className={cn(CARD, options.spacing === "airy" && "p-6")}>
      {options.inputCards === "plain" ? (
        <>
          <h2 className="section-heading m-0 px-1">{title}</h2>
          {content}
        </>
      ) : (
        <SectionExpander title={title}>{content}</SectionExpander>
      )}
    </section>
  )
}

function RunButton({ full }: { full: boolean }) {
  const { t } = useI18n()
  return (
    <Button
      type="button"
      className={cn(
        brandPrimaryButtonClass,
        "h-8 text-[12px] font-semibold tracking-wide uppercase",
        full ? "w-full" : "px-10",
      )}
    >
      {t("buttons.runSimulation")}
    </Button>
  )
}

function OutputLabel() {
  const { t } = useI18n()
  return (
    <p className="m-0 text-[10px] text-muted-foreground/55 italic">
      {t("projects.resultsColumnLabel")}
    </p>
  )
}

/** One mock page. Everything it shows is decided by `variant.options`. */
export function LabPage({ variant }: { variant: LabVariant }) {
  const { t } = useI18n()
  const { options } = variant
  const [view, setView] = useState<InputKind>("cost")
  const [wizardStep, setWizardStep] = useState(0)
  const airy = options.spacing === "airy"
  const strip = options.checkpointNav === "strip"
  const tabbed = options.inputsView === "tabs"
  const stepped = options.flow !== "free"
  const labels: Record<InputKind, string> = {
    cost: t("expanders.costElements"),
    driver: t("expanders.drivers"),
  }
  const sideBySide = options.inputs === "sideBySide"
  const bottomBar = options.simulation !== "side"
  const timeline = options.checkpointNav === "timeline"
  const activeCheckpoint = timeline ? 3 : 1

  const inputTop = (
    <div className="space-y-4">
      {options.documentActions === "inputRow" || options.focusButton === "titleRow" ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <LabInputHeading mode={options.inputHeading} />
          <div className="flex flex-wrap items-center gap-3">
            {options.focusButton === "titleRow" ? (
              <LabFocusButton size="default" filled={options.cues.buttons} />
            ) : null}
            {options.documentActions === "inputRow" ? (
              <LabDocumentActions state={options.checkpointState} tone={options.checkpointTone} />
            ) : null}
          </div>
        </div>
      ) : (
        <LabInputHeading mode={options.inputHeading} />
      )}
      {timeline || strip ? null : <LabCheckpoint mode={options.checkpoint} />}
      <LabProfileRow cues={options.cues} focus={options.focusButton} />
    </div>
  )

  const titleRow = (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <LabInputHeading mode="fileName" />
      <div className="flex flex-wrap items-center gap-3">
        <LabFocusButton size="default" filled />
        {options.documentActions === "inputRow" ? (
          <LabDocumentActions state={options.checkpointState} tone={options.checkpointTone} />
        ) : null}
      </div>
    </div>
  )
  const profileStep = (
    <LabStepCard
      number={1}
      title="Prosjektprofil"
      hint="Fortell kort hva prosjektet er. Profilen gir analysen riktig utgangspunkt."
    >
      <LabProjectProfile editable={options.cues.editable} />
    </LabStepCard>
  )
  const tableStep = (number: number, kind: InputKind) => (
    <LabStepCard
      number={number}
      title={labels[kind]}
      hint={
        kind === "cost"
          ? "Legg inn kostnadspostene med laveste, mest sannsynlige og høyeste anslag."
          : "Legg inn det som kan påvirke kostnadene, med anslag for hver driver."
      }
    >
      <InputBody kind={kind} options={options} />
    </LabStepCard>
  )
  const inputsStep = (number: number) => (
    <LabStepCard
      number={number}
      title="Kostnadsposter og drivere"
      hint="Bytt mellom tabellene. Du ser én om gangen, med god plass."
      actions={<LabInputTabs value={view} onChange={setView} labels={labels} />}
    >
      <InputBody kind={view} options={options} />
    </LabStepCard>
  )
  const runStep = (number: number) => (
    <LabStepCard
      number={number}
      title="Kjør og se resultat"
      hint="Når tallene er inne, kjører du simuleringen og leser resultatet her."
    >
      <div className="space-y-6">
        <RunButton full={false} />
        <LabResults layout={options.results} wide={false} checkpoint={activeCheckpoint} />
      </div>
    </LabStepCard>
  )
  const bothInputsStep = (
    <LabStepCard
      number={1}
      title="Kostnadsposter og drivere"
      hint="Fyll inn begge tabellene. Du kan gå videre når du er fornøyd."
    >
      <div className="space-y-10">
        {(["cost", "driver"] as const).map((kind) => (
          <div key={kind} className="space-y-2">
            <h3 className="m-0 text-[14px] font-semibold">{labels[kind]}</h3>
            <InputBody kind={kind} options={options} />
          </div>
        ))}
      </div>
    </LabStepCard>
  )
  const wizardNames = tabbed ? ["Inndata", "Resultat"] : ["Inndata", "Kjør simulering", "Resultat"]
  const wizardBody = (): ReactNode => {
    const index = Math.min(wizardStep, wizardNames.length - 1)
    if (index === 0) return tabbed ? inputsStep(1) : bothInputsStep
    if (index === wizardNames.length - 1)
      return (
        <LabStepCard
          number={index + 1}
          title="Resultat"
          hint="Slik ser kostnadsbildet ut etter simuleringen."
        >
          <LabResults layout={options.results} wide={false} checkpoint={activeCheckpoint} />
        </LabStepCard>
      )
    return (
      <LabStepCard
        number={2}
        title="Kjør simulering"
        hint="4 kostnadsposter og 3 drivere er klare. Kjør når du er fornøyd med tallene."
      >
        <RunButton full={false} />
      </LabStepCard>
    )
  }
  const flow =
    options.flow === "wizard" ? (
      <div className="mx-auto max-w-4xl space-y-6">
        {titleRow}
        <LabProjectProfile editable={options.cues.editable} />
        <LabWizardStepper steps={wizardNames} current={wizardStep} onSelect={setWizardStep} />
        {wizardBody()}
        <LabWizardFooter
          current={wizardStep}
          last={wizardNames.length - 1}
          nextLabel="Neste steg"
          onBack={() => setWizardStep((value) => Math.max(0, value - 1))}
          onNext={() => setWizardStep((value) => Math.min(wizardNames.length - 1, value + 1))}
        />
      </div>
    ) : (
      <div className="mx-auto max-w-4xl space-y-8">
        {titleRow}
        {profileStep}
        {tabbed ? (
          <>
            {inputsStep(2)}
            {runStep(3)}
          </>
        ) : (
          <>
            {tableStep(2, "cost")}
            {tableStep(3, "driver")}
            {runStep(4)}
          </>
        )}
      </div>
    )

  return (
    <div
      style={themeStyle(options.theme)}
      className="flex min-h-screen flex-col bg-background font-sans text-foreground"
      data-lab-variant={variant.id}
    >
      <LabHeader
        options={options.header}
        actions={
          options.documentActions === "headerBar" ? (
            <LabDocumentActions state={options.checkpointState} tone={options.checkpointTone} />
          ) : undefined
        }
      />
      <div className="flex flex-1">
        {options.sidebar === "library" ? <CSidebar /> : <LabSidebar mode={options.sidebar} />}
        <main className="min-w-0 flex-1">
          <div
            className={cn(
              "mx-auto flex w-full max-w-[90rem]",
              airy ? "gap-10 px-10 pt-10 pb-28" : "gap-6 px-6 pt-6 pb-24",
            )}
          >
            {timeline ? (
              <aside className="sticky top-4 hidden w-48 shrink-0 self-start md:block">
                <LabCheckpointTimeline state={options.checkpointState} />
              </aside>
            ) : null}
            <div className="min-w-0 flex-1">
              {strip ? (
                <div
                  className={cn(
                    "rounded-xl border border-border bg-[var(--b-card)] p-4",
                    airy ? "mb-8" : "mb-5",
                  )}
                >
                  <LabCheckpointStrip state={options.checkpointState} />
                </div>
              ) : null}
              {stepped ? (
                flow
              ) : sideBySide ? (
                <div className="space-y-6">
                  {inputTop}
                  <div className="grid gap-6 lg:grid-cols-2">
                    <InputCard kind="cost" options={options} />
                    <InputCard kind="driver" options={options} />
                  </div>
                  <div className="space-y-4">
                    <OutputLabel />
                    {bottomBar ? null : <RunButton full={false} />}
                    <LabResults layout={options.results} wide checkpoint={activeCheckpoint} />
                    {options.simulation === "fullscreen" ? <LabFullscreenResult /> : null}
                  </div>
                </div>
              ) : (
                <div className="grid gap-8 md:grid-cols-2 md:items-start">
                  <div className="space-y-5">
                    {inputTop}
                    <InputCard kind="cost" options={options} />
                    <InputCard kind="driver" options={options} />
                  </div>
                  <div className="space-y-4">
                    <OutputLabel />
                    {bottomBar ? null : <RunButton full />}
                    <LabResults
                      layout={options.results}
                      wide={false}
                      checkpoint={activeCheckpoint}
                    />
                    {options.simulation === "fullscreen" ? <LabFullscreenResult /> : null}
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
      {bottomBar ? (
        <div className="sticky bottom-0 z-10 border-t border-border bg-background/95 backdrop-blur">
          <div className="mx-auto flex max-w-[90rem] items-center gap-4 px-6 py-3">
            <RunButton full={false} />
            <span className="text-[11px] text-muted-foreground">
              Input er endret siden forrige kjøring
            </span>
          </div>
        </div>
      ) : null}
    </div>
  )
}
