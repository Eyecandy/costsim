import { KEY_FIGURES } from "@/design-lab/sampleData"
import { useI18n } from "@/i18n/useI18n"

/** The four key figures in one row of equal, fixed-width cells; it sits in the sticky header. */
export function BKeyStrip() {
  const { t } = useI18n()
  const items = [
    { label: t("keyMetrics.baseCost"), value: KEY_FIGURES.baseCost },
    { label: t("keyMetrics.p50"), value: KEY_FIGURES.p50 },
    { label: t("keyMetrics.p85"), value: KEY_FIGURES.p85 },
    { label: t("keyMetrics.uncertaintyReserve"), value: KEY_FIGURES.uncertaintyReserve },
  ]
  return (
    <div
      role="group"
      aria-label={t("results.keyMetricsTitle")}
      className="m-0 grid grid-cols-2 gap-3 md:grid-cols-4"
    >
      {items.map((item) => (
        <div
          key={item.label}
          className="h-16 rounded-xl border border-[var(--lab-bar-border)] bg-[var(--lab-tint)] px-4 py-2"
        >
          <p className="truncate text-[11px] text-muted-foreground">{item.label}</p>
          <p className="m-0 truncate text-[20px] leading-7 font-semibold tabular-nums">
            {item.value}
          </p>
        </div>
      ))}
    </div>
  )
}
