import { ArrowLeft, ArrowRight, Check } from "lucide-react"

import { Button } from "@/shared/ui/button"
import { cn } from "@/shared/utils"

/** The row of numbered steps at the top of the wizard flow; finished steps get a check mark. */
export function LabWizardStepper({
  steps,
  current,
  onSelect,
}: {
  steps: readonly string[]
  current: number
  onSelect: (index: number) => void
}) {
  return (
    <nav aria-label="Steg">
      <ol className="m-0 flex list-none items-center gap-2 p-0">
        {steps.map((label, index) => {
          const done = index < current
          const active = index === current
          return (
            <li key={label} className="flex min-w-0 flex-1 items-center gap-2">
              <button
                type="button"
                aria-current={active ? "step" : undefined}
                onClick={() => onSelect(index)}
                className={cn(
                  "flex h-12 min-w-0 flex-1 items-center gap-3 rounded-lg border px-3 text-left",
                  active
                    ? "border-[var(--lab-brand)] bg-[var(--lab-tint)]"
                    : "border-border bg-background hover:bg-[var(--lab-tint)]",
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    "grid size-6 shrink-0 place-items-center rounded-full text-[12px] font-semibold",
                    done
                      ? "bg-[var(--lab-brand)] text-white"
                      : "border border-[var(--lab-brand)] text-[var(--lab-brand)]",
                  )}
                >
                  {done ? <Check className="size-3.5" strokeWidth={3} /> : index + 1}
                </span>
                <span className={cn("truncate text-[13px]", active && "font-semibold")}>
                  {label}
                </span>
              </button>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

/** Back and forward buttons under the current step. The last step has no forward button. */
export function LabWizardFooter({
  current,
  last,
  nextLabel,
  onBack,
  onNext,
}: {
  current: number
  last: number
  nextLabel: string
  onBack: () => void
  onNext: () => void
}) {
  return (
    <div className="flex items-center justify-between">
      {current > 0 ? (
        <Button type="button" variant="outline" onClick={onBack} className="h-10 gap-2 px-4">
          <ArrowLeft className="size-4" aria-hidden />
          Tilbake
        </Button>
      ) : (
        <span />
      )}
      {current < last ? (
        <Button
          type="button"
          onClick={onNext}
          className="h-10 gap-2 border-transparent bg-[var(--lab-action)] px-5 text-white hover:bg-[var(--lab-action)]/90 hover:text-white"
        >
          {nextLabel}
          <ArrowRight className="size-4" aria-hidden />
        </Button>
      ) : null}
    </div>
  )
}
