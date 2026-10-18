import { Presentation } from "lucide-react"

import { CSidebar } from "@/design-lab/families/c/CSidebar"
import { DCheckpoints } from "@/design-lab/families/d/DCheckpoints"
import { GAddCard, GItemCard } from "@/design-lab/families/g/GCards"
import { GDock } from "@/design-lab/families/g/GDock"
import type { GVariant } from "@/design-lab/families/g/types"
import { LabDocumentActions } from "@/design-lab/parts/LabDocumentActions"
import { LabHeader } from "@/design-lab/parts/LabHeader"
import { LabInputHeading } from "@/design-lab/parts/LabInputTop"
import { LabProjectProfile } from "@/design-lab/parts/LabProjectProfile"
import { COST_ROWS, DRIVER_ROWS, type SampleRow } from "@/design-lab/sampleData"
import { themeStyle } from "@/design-lab/themes"
import { useI18n } from "@/i18n/useI18n"
import { Button } from "@/shared/ui/button"
import { cn } from "@/shared/utils"

function CardSection({
  title,
  kind,
  rows,
  addLabel,
  variant,
}: {
  title: string
  kind: "cost" | "driver"
  rows: readonly SampleRow[]
  addLabel: string
  variant: GVariant
}) {
  const wrap = variant.layout === "wrap"
  return (
    <section aria-label={title} className="min-w-0 space-y-3">
      <h2 className="m-0 text-[18px] font-semibold tracking-tight">{title}</h2>
      <ul
        className={cn(
          "m-0 grid list-none gap-4 p-0",
          wrap ? "grid-cols-[repeat(auto-fill,minmax(16rem,1fr))]" : "grid-cols-1",
        )}
      >
        {rows.map((row) => (
          <GItemCard key={row.name} kind={kind} row={row} variant={variant} />
        ))}
        <GAddCard label={addLabel} variant={variant} />
      </ul>
    </section>
  )
}

/**
 * Family G: every cost item and driver is a card of the same fixed size with a small low / most
 * likely / high scale. Big tap targets, an "add" card at the end, and a bottom dock (sheet or sticky
 * bar) for the results and Kjør simulering.
 */
export function GPage({ variant }: { variant: GVariant }) {
  const { t } = useI18n()
  const wrap = variant.layout === "wrap"
  const add = t("inputs.addRow")
  return (
    <div
      style={themeStyle(variant.theme)}
      className="flex min-h-screen flex-col bg-[var(--b-canvas)] font-sans text-foreground"
      data-lab-variant={`g${variant.id}`}
    >
      <LabHeader options={{ fileName: "none", bar: "distinct", nav: "farRight", user: true }} />
      <div className="flex flex-1">
        <CSidebar />
        <main className="mx-auto w-full max-w-[90rem] min-w-0 flex-1 space-y-6 p-4 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <LabInputHeading mode="fileName" />
              <Button type="button" variant="outline" className="h-11 gap-2 text-[13px]">
                <Presentation className="size-4 text-[var(--lab-brand)]" aria-hidden />
                {t("inputs.guidedFocusMode")}
              </Button>
            </div>
            <LabDocumentActions state="active" tone="accent" />
          </div>
          <DCheckpoints style="row" />
          <LabProjectProfile />
          <div className={cn("gap-8", wrap ? "space-y-8" : "grid lg:grid-cols-2")}>
            <CardSection
              title="Kostnadsposter"
              kind="cost"
              rows={COST_ROWS}
              addLabel={add}
              variant={variant}
            />
            <CardSection
              title="Drivere"
              kind="driver"
              rows={DRIVER_ROWS}
              addLabel={add}
              variant={variant}
            />
          </div>
          <GDock mode={variant.results} />
        </main>
      </div>
    </div>
  )
}
