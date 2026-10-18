import { cn } from "@/shared/utils"

export const textareaClassName = cn(
  "w-full resize-y rounded-md border border-border/70 bg-background px-3 py-2",
  "font-sans text-[13px] leading-snug text-foreground",
  "placeholder:text-muted-foreground/70",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1d868c]/35",
)

export const inlineEditInputClassName = cn(
  "h-9 w-full rounded-md border border-[#1d868c]/45 bg-background px-2",
  "text-center font-sans text-[16px] font-medium tabular-nums text-foreground",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1d868c]/35",
)

export const sideCardClassName = cn(
  "grid grid-rows-[auto_2.25rem_1.25rem_auto] items-center gap-y-2",
  "rounded-md border border-border/50 px-3 py-3 text-center",
)

export const modeCardClassName = cn(
  "grid grid-rows-[auto_2.25rem_1.25rem_auto] items-center gap-y-2",
  "rounded-md border border-[#1d868c]/35 bg-[#1d868c]/5 px-3 py-3 text-center",
)

export const rangeGridClassName = "grid grid-cols-1 gap-4 sm:grid-cols-3 sm:items-stretch sm:gap-4"

export const assumptionInputClassName = cn(
  "h-8 min-w-0 flex-1 rounded-md border border-border/70 bg-background px-2.5",
  "font-sans text-[13px] text-foreground placeholder:text-muted-foreground/60",
  "outline-none focus-visible:ring-2 focus-visible:ring-[#1d868c]/35",
)
