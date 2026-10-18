import { cn } from "@/shared/utils"

export type InputKind = "cost" | "driver"

/** A two-way switch between the cost item table and the driver table, with the row count on each. */
export function LabInputTabs({
  value,
  onChange,
  labels,
}: {
  value: InputKind
  onChange: (next: InputKind) => void
  labels: Record<InputKind, string>
}) {
  const counts: Record<InputKind, number> = { cost: 4, driver: 3 }
  return (
    <div
      role="tablist"
      aria-label="Velg tabell"
      className="inline-flex rounded-lg border border-border bg-muted/60 p-1"
    >
      {(["cost", "driver"] as const).map((kind) => (
        <button
          key={kind}
          type="button"
          role="tab"
          aria-selected={value === kind}
          onClick={() => onChange(kind)}
          className={cn(
            "flex min-w-36 items-center justify-center gap-2 rounded-md px-4 py-2 text-[13px]",
            value === kind
              ? "bg-background font-semibold shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {labels[kind]}
          <span className="rounded-full bg-[var(--lab-tint)] px-1.5 text-[11px] tabular-nums">
            {counts[kind]}
          </span>
        </button>
      ))}
    </div>
  )
}
