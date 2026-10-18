import { Archive, BarChart3, Coins, Lock, SlidersHorizontal } from "lucide-react"

import { CCard } from "@/design-lab/families/c/CCard"
import { CSidebar } from "@/design-lab/families/c/CSidebar"
import { CTable } from "@/design-lab/families/c/CTable"
import type { CVariant } from "@/design-lab/families/c/types"
import { LabHeader } from "@/design-lab/parts/LabHeader"
import { LabCheckpoint, LabFocusButton, LabInputHeading } from "@/design-lab/parts/LabInputTop"
import { LabDevelopment, LabSCurve, LabTornado } from "@/design-lab/parts/LabCharts"
import { KeyFiguresTable } from "@/design-lab/parts/LabResults"
import { LabProjectProfile } from "@/design-lab/parts/LabProjectProfile"
import { LabToolbar } from "@/design-lab/parts/LabToolbar"
import { COST_ROWS, DRIVER_ROWS } from "@/design-lab/sampleData"
import { themeStyle } from "@/design-lab/themes"
import { useI18n } from "@/i18n/useI18n"
import { brandPrimaryButtonClass } from "@/shared/brand"
import { Button } from "@/shared/ui/button"
import { cn } from "@/shared/utils"

/** Checkpoint buttons in the accent colour (not the Fokusmodus or Kjør colour); next is locked. */
function CheckpointButtons() {
  const { t } = useI18n()
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        type="button"
        size="sm"
        className="gap-1.5 border-transparent bg-[var(--lab-accent)] text-[12px] text-white hover:bg-[var(--lab-accent)]/90 hover:text-white"
      >
        <Archive className="size-3.5" aria-hidden />
        {t("checkpoints.archiveCheckpointAction")}
      </Button>
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled
        title="Arkiver checkpoint først"
        className="gap-1.5 text-[12px]"
      >
        <Lock className="size-3.5" aria-hidden />
        {t("checkpoints.nextAction")}
      </Button>
    </div>
  )
}

const kr = (n: number) => `${n.toLocaleString("nb-NO")} kr`

/**
 * Family C: the page is kept simple (header, library, profile, two input cards, results cards) so that
 * the card design and the look of the cells are what changes between looks.
 */
export function CPage({ variant }: { variant: CVariant }) {
  const { t } = useI18n()
  const { cardStyle, cellStyle } = variant
  const card = {
    style: cardStyle,
    header: variant.cardHeader,
    accent: variant.cardAccent,
    elevation: variant.cardElevation,
    radius: variant.cardRadius,
  }
  const cells = {
    style: cellStyle,
    airy: variant.airy,
    unit: variant.unit,
    focusRing: variant.focusRing,
    hoverActions: variant.hoverActions,
    pencil: variant.pencil,
    heat: variant.heat,
    stickyHead: variant.stickyHead,
    totalsRow: variant.totalsRow,
    touch: variant.touch,
  }
  const total = COST_ROWS.reduce((sum, row) => sum + Number(row.likely.replace(/\D/g, "")), 0)
  return (
    <div
      style={themeStyle(variant.theme)}
      className="flex min-h-screen flex-col bg-[var(--b-canvas)] font-sans text-foreground"
      data-lab-variant={`c${variant.id}`}
    >
      <LabHeader options={{ fileName: "none", bar: "distinct", nav: "farRight", user: true }} />
      <div className="flex flex-1">
        <CSidebar />
        <main className="mx-auto w-full max-w-[90rem] min-w-0 flex-1 space-y-5 p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-3">
              <LabInputHeading mode="fileName" />
              <LabCheckpoint mode="once" />
              <CheckpointButtons />
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <LabFocusButton size="default" filled />
              <Button
                type="button"
                className={cn(
                  brandPrimaryButtonClass,
                  "h-9 px-8 text-[12px] font-semibold tracking-wide uppercase",
                )}
              >
                {t("buttons.runSimulation")}
              </Button>
            </div>
          </div>
          <LabProjectProfile />
          <div className="grid gap-5 lg:grid-cols-2">
            <CCard
              {...card}
              icon={<Coins className="size-4" aria-hidden />}
              badge="1"
              title={t("expanders.costElements")}
              count={COST_ROWS.length}
              actions={<LabToolbar kind="cost" mode="icons" rowActions="inline" />}
              footer={
                variant.cardFooter ? (
                  <>
                    <span className="text-muted-foreground">Sum sannsynlig</span>
                    <strong className="tabular-nums">{kr(total)}</strong>
                  </>
                ) : undefined
              }
            >
              <CTable kind="cost" rows={COST_ROWS} {...cells} />
            </CCard>
            <CCard
              {...card}
              icon={<SlidersHorizontal className="size-4" aria-hidden />}
              badge="2"
              title={t("expanders.drivers")}
              count={DRIVER_ROWS.length}
              actions={<LabToolbar kind="driver" mode="icons" rowActions="inline" />}
              footer={
                variant.cardFooter ? (
                  <>
                    <span className="text-muted-foreground">Drivere</span>
                    <strong className="tabular-nums">{DRIVER_ROWS.length}</strong>
                  </>
                ) : undefined
              }
            >
              <CTable kind="driver" rows={DRIVER_ROWS} {...cells} />
            </CCard>
          </div>
          <div className="grid gap-5 lg:grid-cols-3">
            <CCard
              {...card}
              icon={<BarChart3 className="size-4" aria-hidden />}
              badge="3"
              title={t("results.keyMetricsTitle")}
            >
              <KeyFiguresTable />
            </CCard>
            <CCard {...card} title={t("charts.sCurveTitle")}>
              <LabSCurve />
            </CCard>
            <div className="grid gap-5">
              <CCard {...card} title={t("charts.tornadoTitle")}>
                <LabTornado />
              </CCard>
              <CCard {...card} title={t("checkpoints.developmentTitle")}>
                <LabDevelopment />
              </CCard>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
