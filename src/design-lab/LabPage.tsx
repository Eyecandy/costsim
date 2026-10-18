import { LabCheckpointTimeline } from "@/design-lab/parts/LabCheckpointTimeline"
import { LabDocumentActions } from "@/design-lab/parts/LabDocumentActions"
import { LabHeader } from "@/design-lab/parts/LabHeader"
import { LabCheckpoint, LabInputHeading, LabProfileRow } from "@/design-lab/parts/LabInputTop"
import { LabFullscreenResult, LabResults } from "@/design-lab/parts/LabResults"
import { LabSidebar } from "@/design-lab/parts/LabSidebar"
import { LabTable } from "@/design-lab/parts/LabTable"
import { LabToolbar } from "@/design-lab/parts/LabToolbar"
import { COST_ROWS, DRIVER_ROWS } from "@/design-lab/sampleData"
import { themeStyle } from "@/design-lab/themes"
import { VARIANTS } from "@/design-lab/variants"
import type { LabOptions, LabVariant } from "@/design-lab/variants/types"
import { useI18n } from "@/i18n/useI18n"
import { brandPrimaryButtonClass } from "@/shared/brand"
import { SectionExpander } from "@/shared/SectionExpander"
import { Button } from "@/shared/ui/button"
import { cn } from "@/shared/utils"

const CARD =
  "rounded-[var(--radius)] border border-border bg-[color-mix(in_oklab,var(--muted)_35%,var(--background))] p-4"

function InputCard({ kind, options }: { kind: "cost" | "driver"; options: LabOptions }) {
  const { t } = useI18n()
  return (
    <section className={CARD}>
      <SectionExpander
        title={kind === "cost" ? t("expanders.costElements") : t("expanders.drivers")}
      >
        <div className="space-y-3 pt-2">
          {kind === "cost" ? (
            <p className="m-0 text-[11px] text-muted-foreground">
              {t("inputs.assumptionsLabel")} · {t("inputs.assumptionsNoneDefined")} ·{" "}
              <span className="underline">{t("inputs.assumptionsAddShort")}</span>
            </p>
          ) : null}
          <LabToolbar kind={kind} mode={options.toolbar} rowActions={options.rowActions} />
          <LabTable
            kind={kind}
            rows={kind === "cost" ? COST_ROWS : DRIVER_ROWS}
            editable={options.cues.editable}
            rowActions={options.rowActions}
          />
        </div>
      </SectionExpander>
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

function Banner({ variant }: { variant: LabVariant }) {
  const index = VARIANTS.findIndex((v) => v.id === variant.id)
  const previous = index > 0 ? VARIANTS[index - 1] : undefined
  const next = index >= 0 ? VARIANTS[index + 1] : undefined
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 bg-foreground px-4 py-1.5 text-[11px] text-background">
      <span className="font-semibold">Designlab</span>
      <span>
        {variant.id} · {variant.title}
      </span>
      <span className="opacity-70">Uten funksjon, kun for visning</span>
      <span className="ml-auto flex items-center gap-3">
        {previous ? <a href={`/design/${previous.id}`}>← {previous.id}</a> : null}
        <a href="/design">Alle varianter</a>
        {next ? <a href={`/design/${next.id}`}>{next.id} →</a> : null}
      </span>
    </div>
  )
}

/** One mock page. Everything it shows is decided by `variant.options`. */
export function LabPage({ variant, bare = false }: { variant: LabVariant; bare?: boolean }) {
  const { options } = variant
  const sideBySide = options.inputs === "sideBySide"
  const bottomBar = options.simulation !== "side"
  const timeline = options.checkpointNav === "timeline"
  const activeCheckpoint = timeline ? 3 : 1

  const inputTop = (
    <div className="space-y-4">
      {options.documentActions === "inputRow" ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <LabInputHeading mode={options.inputHeading} />
          <LabDocumentActions />
        </div>
      ) : (
        <LabInputHeading mode={options.inputHeading} />
      )}
      {timeline ? null : <LabCheckpoint mode={options.checkpoint} />}
      <LabProfileRow cues={options.cues} />
    </div>
  )

  return (
    <div
      style={themeStyle(options.theme)}
      className="flex min-h-screen flex-col bg-background font-sans text-foreground"
      data-lab-variant={variant.id}
    >
      {bare ? null : <Banner variant={variant} />}
      <LabHeader
        options={options.header}
        actions={options.documentActions === "headerBar" ? <LabDocumentActions /> : undefined}
      />
      <div className="flex flex-1">
        <LabSidebar mode={options.sidebar} />
        <main className="min-w-0 flex-1">
          <div className="mx-auto flex w-full max-w-[90rem] gap-6 px-6 pt-6 pb-24">
            {timeline ? (
              <aside className="sticky top-4 hidden w-48 shrink-0 self-start md:block">
                <LabCheckpointTimeline />
              </aside>
            ) : null}
            <div className="min-w-0 flex-1">
              {sideBySide ? (
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
