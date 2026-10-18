import { CCard } from "@/design-lab/families/c/CCard"
import { CSidebar } from "@/design-lab/families/c/CSidebar"
import { CTable } from "@/design-lab/families/c/CTable"
import type { CVariant } from "@/design-lab/families/c/types"
import { LabHeader } from "@/design-lab/parts/LabHeader"
import { LabCheckpoint, LabInputHeading } from "@/design-lab/parts/LabInputTop"
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

/**
 * Family C: the page is kept simple (header, library, profile, two input cards, results cards) so that
 * the card design and the look of the cells are what changes between looks.
 */
export function CPage({ variant }: { variant: CVariant }) {
  const { t } = useI18n()
  const { cardStyle, cellStyle } = variant
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
            </div>
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
          <LabProjectProfile />
          <div className="grid gap-5 lg:grid-cols-2">
            <CCard
              style={cardStyle}
              badge="1"
              title={t("expanders.costElements")}
              count={COST_ROWS.length}
              actions={<LabToolbar kind="cost" mode="icons" rowActions="inline" />}
            >
              <CTable kind="cost" rows={COST_ROWS} style={cellStyle} airy={variant.airy} />
            </CCard>
            <CCard
              style={cardStyle}
              badge="2"
              title={t("expanders.drivers")}
              count={DRIVER_ROWS.length}
              actions={<LabToolbar kind="driver" mode="icons" rowActions="inline" />}
            >
              <CTable kind="driver" rows={DRIVER_ROWS} style={cellStyle} airy={variant.airy} />
            </CCard>
          </div>
          <div className="grid gap-5 lg:grid-cols-3">
            <CCard style={cardStyle} badge="3" title={t("results.keyMetricsTitle")}>
              <KeyFiguresTable />
            </CCard>
            <CCard style={cardStyle} title={t("charts.sCurveTitle")}>
              <LabSCurve />
            </CCard>
            <div className="grid gap-5">
              <CCard style={cardStyle} title={t("charts.tornadoTitle")}>
                <LabTornado />
              </CCard>
              <CCard style={cardStyle} title={t("checkpoints.developmentTitle")}>
                <LabDevelopment />
              </CCard>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
