import type { ReactNode } from "react"

import { LabDevelopment, LabSCurve, LabTornado } from "@/design-lab/parts/LabCharts"
import { KEY_FIGURES } from "@/design-lab/sampleData"
import type { LabOptions } from "@/design-lab/variants/types"
import { useI18n } from "@/i18n/useI18n"
import { cn } from "@/shared/utils"

const SURFACE =
  "rounded-[var(--radius)] border border-border bg-[color-mix(in_oklab,var(--muted)_35%,var(--background))] p-4"

export function KeyFiguresTable() {
  const { t } = useI18n()
  const rows: [string, string][] = [
    [t("keyMetrics.baseCost"), KEY_FIGURES.baseCost],
    [
      t("keyMetrics.expectedAddition"),
      `${KEY_FIGURES.expectedAddition} ${KEY_FIGURES.expectedAdditionPercent}`,
    ],
    [t("keyMetrics.p50"), KEY_FIGURES.p50],
    [t("keyMetrics.uncertaintyReserve"), KEY_FIGURES.uncertaintyReserve],
    [t("keyMetrics.p85"), KEY_FIGURES.p85],
  ]
  return (
    <div className="space-y-2">
      <p className="section-body">{t("helper.resultsKeyMetrics")}</p>
      <table className="w-full border-collapse text-[12px]">
        <tbody>
          {rows.map(([label, value]) => (
            <tr key={label} className="border-b border-border/60">
              <td className="px-2 py-1.5 text-muted-foreground">{label}</td>
              <td className="px-2 py-1.5 text-right tabular-nums">{value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

type Section = { key: string; title: string; body: ReactNode }

function useSections(): Section[] {
  const { t } = useI18n()
  return [
    { key: "key", title: t("results.keyMetricsTitle"), body: <KeyFiguresTable /> },
    {
      key: "change",
      title: t("checkpoints.comparisonHeading"),
      body: <p className="section-body">{t("checkpoints.comparisonBaselineContext")}</p>,
    },
    { key: "dev", title: t("checkpoints.developmentTitle"), body: <LabDevelopment /> },
    { key: "scurve", title: t("charts.sCurveTitle"), body: <LabSCurve /> },
    { key: "tornado", title: t("charts.tornadoTitle"), body: <LabTornado /> },
  ]
}

/** Idea: the results as one long column (today) or as separate horizontal cards. */
export function LabResults({
  layout,
  wide,
  checkpoint = 1,
}: {
  layout: LabOptions["results"]
  wide: boolean
  checkpoint?: number
}) {
  const { t } = useI18n()
  const sections = useSections()

  if (layout === "cards") {
    return (
      <div className="space-y-3">
        <h3 className="section-heading m-0">{t("results.resultsHeading")}</h3>
        <div className={cn("grid gap-4", wide ? "md:grid-cols-2 xl:grid-cols-3" : "grid-cols-1")}>
          {sections.map((section) => (
            <section key={section.key} className={cn(SURFACE, "space-y-2")}>
              <h4 className="section-heading m-0">{section.title}</h4>
              {section.body}
            </section>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className={cn(SURFACE, "space-y-5")}>
      <div>
        <h3 className="section-heading m-0">{t("results.resultsHeading")}</h3>
        <p className="m-0 mt-2 text-[12px] font-medium">Checkpoint {checkpoint}</p>
      </div>
      {sections.map((section) => (
        <section key={section.key} className="space-y-2">
          <h4 className="section-heading m-0">{section.title}</h4>
          {section.body}
        </section>
      ))}
    </div>
  )
}

/** Idea: a full-screen view of the whole result (shown as a framed mock-up on the page). */
export function LabFullscreenResult() {
  const { t } = useI18n()
  return (
    <section
      aria-label="Fullskjerm resultatvisning"
      className="space-y-4 rounded-xl border-2 border-dashed border-[var(--lab-brand)]/50 bg-background p-5"
    >
      <div className="flex items-center justify-between">
        <h3 className="section-heading m-0">{t("results.resultsHeading")} · Fullskjerm</h3>
        <span className="text-[11px] text-muted-foreground">
          Mock-up: slik kan fullskjerm se ut
        </span>
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className={cn(SURFACE, "space-y-2 lg:col-span-2")}>
          <h4 className="section-heading m-0">{t("charts.sCurveTitle")}</h4>
          <LabSCurve tall />
        </div>
        <div className={cn(SURFACE, "space-y-2")}>
          <h4 className="section-heading m-0">{t("results.keyMetricsTitle")}</h4>
          <KeyFiguresTable />
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className={cn(SURFACE, "space-y-2")}>
          <h4 className="section-heading m-0">{t("charts.tornadoTitle")}</h4>
          <LabTornado />
        </div>
        <div className={cn(SURFACE, "space-y-2")}>
          <h4 className="section-heading m-0">{t("checkpoints.developmentTitle")}</h4>
          <LabDevelopment />
        </div>
      </div>
    </section>
  )
}
