import type { ReactNode } from "react"

import type { CardStyle } from "@/design-lab/families/c/types"
import { cn } from "@/shared/utils"

const SHELL: Record<CardStyle, string> = {
  // a straight card with a coloured line on top
  flat: "rounded-none border border-border border-t-[3px] border-t-[var(--lab-brand)] bg-[var(--b-card)]",
  // large radius, no border, a soft shadow
  soft: "rounded-3xl border-0 bg-[var(--b-card)] shadow-[0_8px_28px_-14px_rgba(0,0,0,0.3)]",
  // a strong outline in the brand colour
  outlined: "rounded-lg border-2 border-[var(--lab-brand)]/45 bg-background",
  // a tinted surface instead of white
  tinted: "rounded-xl border border-[var(--lab-bar-border)] bg-[var(--lab-tint)]",
}

const HEAD: Record<CardStyle, string> = {
  flat: "border-b border-border",
  soft: "",
  outlined: "border-b-2 border-[var(--lab-brand)]/25",
  tinted: "border-b border-[var(--lab-bar-border)]",
}

/** A card: numbered title with a count, optional toolbar on the right, then the content. */
export function CCard({
  style,
  title,
  count,
  badge,
  actions,
  children,
}: {
  style: CardStyle
  title: string
  count?: number
  badge?: string
  actions?: ReactNode
  children: ReactNode
}) {
  return (
    <section className={cn("overflow-hidden", SHELL[style])} data-card-style={style}>
      <header
        className={cn("flex flex-wrap items-center justify-between gap-2 px-5 py-3", HEAD[style])}
      >
        <h2 className="m-0 flex items-center gap-2 text-[14px] font-semibold tracking-tight">
          {badge ? (
            <span className="grid size-6 place-items-center rounded-full bg-[var(--lab-brand)] text-[11px] font-bold text-white">
              {badge}
            </span>
          ) : null}
          {title}
          {count === undefined ? null : (
            <span className="rounded-full bg-muted px-2 text-[11px] font-normal text-muted-foreground tabular-nums">
              {count}
            </span>
          )}
        </h2>
        {actions}
      </header>
      <div className="px-5 pt-3 pb-5">{children}</div>
    </section>
  )
}
