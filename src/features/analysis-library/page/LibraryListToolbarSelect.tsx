import { useEffect, useId, useRef, useState } from "react"
import { ChevronDown } from "lucide-react"

import { cn } from "@/shared/utils"

export function LibraryListToolbarSelect<T extends string>({
  ariaLabel,
  value,
  onChange,
  options,
}: {
  ariaLabel: string
  value: T
  onChange: (next: T) => void
  options: { value: T; label: string }[]
}) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement | null>(null)
  const menuId = useId()

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false)
    }
    document.addEventListener("mousedown", onDoc)
    window.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("mousedown", onDoc)
      window.removeEventListener("keydown", onKey)
    }
  }, [open])

  const currentLabel = options.find((o) => o.value === value)?.label ?? options[0]?.label ?? ""

  return (
    <div className="relative shrink-0" ref={rootRef}>
      <button
        type="button"
        className={cn(
          "inline-flex h-8 max-w-[11rem] items-center gap-1 rounded-md border border-border/60 bg-background px-2",
          "font-sans text-[12px] text-muted-foreground hover:bg-muted/40 hover:text-foreground",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        )}
        aria-label={`${ariaLabel}: ${currentLabel}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="min-w-0 truncate">{currentLabel}</span>
        <ChevronDown className="size-3.5 shrink-0 opacity-70" aria-hidden />
      </button>
      {open ? (
        <div
          id={menuId}
          role="listbox"
          aria-label={ariaLabel}
          className="absolute right-0 top-full z-[100] mt-1 min-w-[9.5rem] rounded-md border border-border/60 bg-background py-1 shadow-md"
        >
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              role="option"
              aria-selected={opt.value === value}
              className={cn(
                "flex w-full px-3 py-1.5 text-left font-sans text-[12px] hover:bg-muted/60",
                opt.value === value ? "font-medium text-foreground" : "text-foreground/90",
              )}
              onClick={() => {
                onChange(opt.value)
                setOpen(false)
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}
