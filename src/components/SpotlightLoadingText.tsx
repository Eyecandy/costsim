import type { HTMLAttributes } from "react"

import { cn } from "@/lib/utils"

type SpotlightLoadingTextProps = {
  text: string
  /** `muted` for calm secondary loading; `primary` for brand/primary CTA loading. */
  tone?: "muted" | "primary"
} & Omit<HTMLAttributes<HTMLParagraphElement>, "children">

/** Static base text with a continuous left→right spotlight sweep. */
export function SpotlightLoadingText({
  text,
  tone = "muted",
  className,
  ...props
}: SpotlightLoadingTextProps) {
  return (
    <p
      className={cn("spotlight-loading-text", className)}
      data-tone={tone}
      {...props}
    >
      <span className="spotlight-loading-text-base">{text}</span>
      <span className="spotlight-loading-text-highlight" aria-hidden="true">
        {text}
      </span>
    </p>
  )
}
