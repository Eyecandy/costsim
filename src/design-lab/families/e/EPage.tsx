import { Presentation } from "lucide-react"
import type { ReactNode } from "react"

import { CSidebar } from "@/design-lab/families/c/CSidebar"
import { CTable } from "@/design-lab/families/c/CTable"
import type { EVariant } from "@/design-lab/families/e/types"
import { LabSCurve, LabTornado } from "@/design-lab/parts/LabCharts"
import { LabDocumentActions } from "@/design-lab/parts/LabDocumentActions"
import { LabHeader } from "@/design-lab/parts/LabHeader"
import { LabInputHeading } from "@/design-lab/parts/LabInputTop"
import { LabProjectProfile } from "@/design-lab/parts/LabProjectProfile"
import { KeyFiguresTable } from "@/design-lab/parts/LabResults"
import { COST_ROWS, DRIVER_ROWS } from "@/design-lab/sampleData"
import { themeStyle } from "@/design-lab/themes"
import { useI18n } from "@/i18n/useI18n"
import { brandPrimaryButtonClass } from "@/shared/brand"
import { Button } from "@/shared/ui/button"
import { cn } from "@/shared/utils"

function Section({
  number,
  title,
  hint,
  children,
}: {
  number: string
  title: string
  hint: string
  children: ReactNode
}) {
  return (
    <section
      aria-label={title}
      className="space-y-3 rounded-2xl border border-border bg-[var(--b-card)] p-6 shadow-sm"
    >
      <div className="flex items-baseline gap-3">
        <span className="grid size-6 shrink-0 place-items-center rounded-full bg-[var(--lab-brand)] text-[11px] font-bold text-white">
          {number}
        </span>
        <h2 className="m-0 text-[17px] font-semibold tracking-tight">{title}</h2>
        <p className="m-0 text-[12px] text-muted-foreground">{hint}</p>
      </div>
      {children}
    </section>
  )
}

function RunButton() {
  const { t } = useI18n()
  return (
    <Button
      type="button"
      className={cn(brandPrimaryButtonClass, "h-10 w-full text-[12px] font-semibold uppercase")}
    >
      {t("buttons.runSimulation")}
    </Button>
  )
}

/** Key figures and charts: the same pieces in the rail and in the top band. */
function ResultsPanel({ wide }: { wide: boolean }) {
  return (
    <div className={cn("gap-5", wide ? "grid lg:grid-cols-3" : "space-y-5")}>
      <KeyFiguresTable />
      <LabSCurve />
      {wide ? <LabTornado /> : null}
    </div>
  )
}

/**
 * Family E: one document you scroll (profile, cost items, drivers), with the results always in view:
 * in a sticky rail on the right, or as a band on top. Run simulation sits with the results.
 */
export function EPage({ variant }: { variant: EVariant }) {
  const { t } = useI18n()
  const rail = variant.results === "rail"
  const gap = variant.airy ? "space-y-8" : "space-y-5"
  return (
    <div
      style={themeStyle(variant.theme)}
      className="flex min-h-screen flex-col bg-[var(--b-canvas)] font-sans text-foreground"
      data-lab-variant={`e${variant.id}`}
    >
      <LabHeader options={{ fileName: "none", bar: "distinct", nav: "farRight", user: true }} />
      <div className="flex flex-1">
        {variant.library ? <CSidebar /> : null}
        <main className="mx-auto w-full max-w-[96rem] min-w-0 flex-1 p-8">
          <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <LabInputHeading mode="fileName" />
              <Button type="button" variant="outline" size="sm" className="gap-1.5 text-[12px]">
                <Presentation className="size-3.5 text-[var(--lab-brand)]" aria-hidden />
                {t("inputs.guidedFocusMode")}
              </Button>
            </div>
            <LabDocumentActions state="active" />
          </div>

          <div
            className={cn("gap-8", rail ? "grid xl:grid-cols-[minmax(0,1fr)_24rem]" : "space-y-8")}
          >
            {rail ? null : (
              <section
                aria-label="Resultater"
                className="space-y-4 rounded-2xl border border-border bg-[var(--b-card)] p-6 shadow-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="m-0 text-[17px] font-semibold tracking-tight">Resultater</h2>
                  <div className="w-56">
                    <RunButton />
                  </div>
                </div>
                <ResultsPanel wide />
              </section>
            )}

            <div className={cn("min-w-0", gap)}>
              <LabProjectProfile />
              <Section number="1" title="Kostnadsposter" hint="Hva prosjektet koster">
                <CTable kind="cost" rows={COST_ROWS} style="filled" airy={variant.airy} />
              </Section>
              <Section number="2" title="Drivere" hint="Hva som kan flytte kostnaden">
                <CTable kind="driver" rows={DRIVER_ROWS} style="filled" airy={variant.airy} />
              </Section>
            </div>

            {rail ? (
              <aside
                aria-label="Resultater"
                className="h-fit space-y-4 rounded-2xl border border-border bg-[var(--b-card)] p-5 shadow-sm xl:sticky xl:top-6"
              >
                <h2 className="m-0 text-[17px] font-semibold tracking-tight">Resultater</h2>
                <RunButton />
                <ResultsPanel wide={false} />
              </aside>
            ) : null}
          </div>
        </main>
      </div>
    </div>
  )
}
