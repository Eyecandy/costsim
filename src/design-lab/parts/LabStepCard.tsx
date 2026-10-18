import type { ReactNode } from "react"

import { cn } from "@/shared/utils"

/**
 * One numbered step of the page: a big number, a title, a one-line hint that says what to do here,
 * then the content with generous padding. Used by the "steps" and "wizard" flows.
 */
export function LabStepCard({
  number,
  title,
  hint,
  actions,
  children,
  className,
}: {
  number: number
  title: string
  hint: string
  /** Optional controls on the right of the step header (for example a view switch). */
  actions?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section
      className={cn("rounded-xl border border-border bg-[var(--b-card)] p-6 shadow-sm", className)}
    >
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <span
            aria-hidden
            className="grid size-8 shrink-0 place-items-center rounded-full bg-[var(--lab-tint-strong)] text-[14px] font-semibold text-[var(--lab-brand)]"
          >
            {number}
          </span>
          <div>
            <h2 className="m-0 text-[16px] font-semibold tracking-tight">{title}</h2>
            <p className="m-0 mt-1 text-[12px] text-muted-foreground">{hint}</p>
          </div>
        </div>
        {actions}
      </div>
      {children}
    </section>
  )
}
