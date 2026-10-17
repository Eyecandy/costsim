import { brandPrimaryTextClass, PRODUCT_NAME } from "@/lib/brand"
import { cn } from "@/lib/utils"

type BrandWordmarkProps = {
  as?: "span" | "a" | "button"
  href?: string
  onClick?: () => void
  "aria-label"?: string
  title?: string
  className?: string
}

const INTERACTIVE_CLASS =
  "cursor-pointer rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"

export function BrandWordmark({
  as: Tag = "span",
  href,
  onClick,
  "aria-label": ariaLabel,
  title,
  className,
}: BrandWordmarkProps) {
  const content = (
    <>
      <span
        className={cn(
          "font-heading text-[1.6875rem] leading-none font-semibold tracking-tight",
          brandPrimaryTextClass,
        )}
      >
        {PRODUCT_NAME}
      </span>
      <span className="font-sans text-[10px] font-normal not-italic text-muted-foreground/65">
        working title
      </span>
    </>
  )

  if (Tag === "a") {
    return (
      <a
        href={href}
        aria-label={ariaLabel}
        title={title}
        className={cn(
          "inline-flex items-baseline gap-1.5 no-underline",
          INTERACTIVE_CLASS,
          className,
        )}
      >
        {content}
      </a>
    )
  }

  if (Tag === "button") {
    return (
      <button
        type="button"
        aria-label={ariaLabel}
        title={title}
        onClick={onClick}
        className={cn(
          "inline-flex items-baseline gap-1.5 border-0 bg-transparent p-0",
          INTERACTIVE_CLASS,
          className,
        )}
      >
        {content}
      </button>
    )
  }

  return (
    <span className={cn("inline-flex items-baseline gap-1.5", className)}>
      {content}
    </span>
  )
}
