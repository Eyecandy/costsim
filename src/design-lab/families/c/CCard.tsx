import type { ReactNode } from "react"

import type {
  CardAccent,
  CardElevation,
  CardHeader,
  CardRadius,
  CardStyle,
} from "@/design-lab/families/c/types"
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

const RADIUS: Record<CardRadius, string> = {
  sm: "rounded-sm",
  md: "rounded-lg",
  xl: "rounded-[1.75rem]",
}

const ELEVATION: Record<CardElevation, string> = {
  default: "",
  flat: "shadow-none",
  raised: "shadow-[0_18px_40px_-16px_rgba(0,0,0,0.38)]",
  glass:
    "border border-white/60 bg-[var(--b-card)]/60 shadow-[0_8px_32px_-12px_rgba(0,0,0,0.25)] backdrop-blur-md",
}

/** A card: numbered title with a count, optional toolbar on the right, then the content. */
export function CCard({
  style,
  title,
  count,
  badge,
  actions,
  header = "plain",
  icon,
  accent = "none",
  elevation = "default",
  radius,
  footer,
  children,
}: {
  style: CardStyle
  title: string
  count?: number
  badge?: string
  actions?: ReactNode
  header?: CardHeader
  /** The icon shown in the header when `header` is "icon". */
  icon?: ReactNode
  accent?: CardAccent
  elevation?: CardElevation
  radius?: CardRadius
  /** A footer strip under the content (for example a total). */
  footer?: ReactNode
  children: ReactNode
}) {
  return (
    <section
      className={cn(
        "relative overflow-hidden",
        SHELL[style],
        radius && RADIUS[radius],
        ELEVATION[elevation],
        accent === "left" && "border-l-[6px] border-l-[var(--lab-accent)]",
      )}
      data-card-style={style}
    >
      {accent === "corner" ? (
        <span
          aria-hidden
          className="pointer-events-none absolute top-0 right-0 size-12 bg-[var(--lab-accent)]/80 [clip-path:polygon(0_0,100%_0,100%_100%)]"
        />
      ) : null}
      <header
        className={cn("flex flex-wrap items-center justify-between gap-2 px-5 py-3", HEAD[style])}
      >
        <h2 className="m-0 flex items-center gap-2.5 text-[14px] font-semibold tracking-tight">
          {header === "icon" && icon ? (
            <span className="grid size-8 place-items-center rounded-lg bg-[var(--lab-tint-strong)] text-[var(--lab-brand)]">
              {icon}
            </span>
          ) : null}
          {header === "chip" && badge ? (
            <span className="rounded-md border border-[var(--lab-brand)]/40 px-1.5 py-0.5 font-mono text-[11px] font-bold text-[var(--lab-brand)]">
              {badge.padStart(2, "0")}
            </span>
          ) : null}
          {header === "plain" && badge ? (
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
      {footer ? (
        <footer className="flex items-center justify-between gap-3 border-t border-border bg-muted/40 px-5 py-3 text-[13px]">
          {footer}
        </footer>
      ) : null}
    </section>
  )
}
