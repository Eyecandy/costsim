import { type ReactNode, useId, useState } from "react"
import { ChevronDown } from "lucide-react"

import { cn } from "@/lib/utils"

type SectionExpanderProps = {
  title: string
  defaultOpen?: boolean
  open?: boolean
  onOpenChange?: (open: boolean) => void
  headerClassName?: string
  titleClassName?: string
  bodyClassName?: string
  /**
   * Compact control(s) in the right-side toolbar group, immediately before the
   * expand chevron (outermost). Interactive children use pointer-events-auto
   * and do not toggle the section.
   */
  headerTrailing?: ReactNode
  children: ReactNode
}

export function SectionExpander({
  title,
  defaultOpen = true,
  open,
  onOpenChange,
  headerClassName,
  titleClassName,
  bodyClassName,
  headerTrailing,
  children,
}: SectionExpanderProps) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen)
  const isOpen = open ?? internalOpen
  const headerId = useId()
  const panelId = useId()

  const toggle = () => {
    const next = !isOpen
    if (open === undefined) setInternalOpen(next)
    onOpenChange?.(next)
  }

  return (
    <div className="space-y-0">
      <div
        className={cn(
          "relative flex w-full items-center justify-between gap-3 rounded-md py-[0.14rem] px-1",
          headerClassName,
        )}
        data-section-expander-header=""
      >
        {/*
          Full-row toggle: one button covers the header. Title/chevron are non-interactive
          layers (pointer-events-none). Embedded controls opt back in with pointer-events-auto
          so they stay independently clickable without nested <button> markup.
        */}
        <button
          type="button"
          className={cn(
            "absolute inset-0 z-0 rounded-md",
            "outline-none ring-offset-background transition-colors",
            "hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring",
          )}
          aria-expanded={isOpen}
          aria-controls={panelId}
          aria-labelledby={headerId}
          data-section-expander-toggle=""
          onClick={toggle}
        />
        <div
          className="pointer-events-none relative z-10 flex min-w-0 flex-1 items-center gap-1.5"
          data-section-expander-title-group=""
        >
          <span
            id={headerId}
            className={cn(
              "min-w-0 truncate rounded-md text-left",
              "section-heading m-0 leading-none font-semibold",
              titleClassName,
            )}
          >
            {title}
          </span>
        </div>
        <div
          className="pointer-events-none relative z-10 flex shrink-0 items-center gap-0.5"
          data-section-expander-end=""
        >
          {headerTrailing ? (
            <div
              className="pointer-events-auto flex shrink-0 items-center self-center"
              data-section-expander-trailing=""
            >
              {headerTrailing}
            </div>
          ) : null}
          <ChevronDown
            className={cn(
              "pointer-events-none size-5 shrink-0 text-muted-foreground transition-transform duration-200",
              isOpen && "rotate-180",
            )}
            aria-hidden
            data-section-expander-chevron=""
          />
        </div>
      </div>
      <div
        id={panelId}
        role="region"
        aria-labelledby={headerId}
        hidden={!isOpen}
      >
        <div className={cn("pt-2", bodyClassName)}>{children}</div>
      </div>
    </div>
  )
}
