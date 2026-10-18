import { useCallback, useEffect, useId, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { MoreHorizontal } from "lucide-react"

import { cn } from "@/shared/utils"

/**
 * Shared trailing ⋯ for sidebar folder and analysis rows.
 * Hover/focus visibility is owned by parent `.group/sidebar-entity-row`.
 * Menu is portaled so overflow scrollports (folder list / sidebar) cannot clip it.
 */
export function SidebarEntityActionsMenu({
  items,
  menuLabel,
}: {
  items: { label: string; onSelect: () => void }[]
  menuLabel: string
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const menuRef = useRef<HTMLDivElement | null>(null)
  const menuId = useId()
  const [menuPos, setMenuPos] = useState<{ top: number; right: number } | null>(null)

  const updateMenuPos = useCallback(() => {
    const el = triggerRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    setMenuPos({
      top: r.bottom + 4,
      right: Math.max(8, window.innerWidth - r.right),
    })
  }, [])

  useEffect(() => {
    if (!menuOpen) {
      setMenuPos(null)
      return
    }
    updateMenuPos()
    window.addEventListener("resize", updateMenuPos)
    // Capture scroll from overflow ancestors (folder list, sidebar, etc.).
    window.addEventListener("scroll", updateMenuPos, true)
    return () => {
      window.removeEventListener("resize", updateMenuPos)
      window.removeEventListener("scroll", updateMenuPos, true)
    }
  }, [menuOpen, updateMenuPos])

  useEffect(() => {
    if (!menuOpen) return
    const onDoc = (e: MouseEvent) => {
      const target = e.target as Node
      if (triggerRef.current?.contains(target)) return
      if (menuRef.current?.contains(target)) return
      setMenuOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false)
    }
    document.addEventListener("mousedown", onDoc)
    window.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("mousedown", onDoc)
      window.removeEventListener("keydown", onKey)
    }
  }, [menuOpen])

  const menu =
    menuOpen && menuPos && typeof document !== "undefined"
      ? createPortal(
          <div
            ref={menuRef}
            id={menuId}
            role="menu"
            data-sidebar-entity-menu=""
            className="fixed z-[240] min-w-[9.5rem] rounded-md border border-border/60 bg-background py-1 shadow-md"
            style={{ top: menuPos.top, right: menuPos.right }}
          >
            {items.map((item) => (
              <button
                key={item.label}
                type="button"
                role="menuitem"
                className="flex w-full px-3 py-1.5 text-left font-sans text-[12px] text-foreground hover:bg-muted/60"
                onClick={(e) => {
                  e.stopPropagation()
                  setMenuOpen(false)
                  item.onSelect()
                }}
              >
                {item.label}
              </button>
            ))}
          </div>,
          document.body,
        )
      : null

  return (
    <div
      className={cn(
        "relative shrink-0 transition-opacity duration-150",
        menuOpen
          ? "opacity-100"
          : cn(
              "opacity-0",
              "group-hover/sidebar-entity-row:opacity-100 group-focus-within/sidebar-entity-row:opacity-100",
              "[@media(hover:none)]:opacity-100",
            ),
      )}
      style={{ width: "1.5rem" }}
      data-sidebar-entity-actions=""
    >
      <button
        ref={triggerRef}
        type="button"
        className={cn(
          "flex size-6 items-center justify-center rounded text-muted-foreground",
          // Row owns hover surface — no nested action background.
          "hover:text-foreground",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        )}
        aria-label={menuLabel}
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        aria-controls={menuId}
        title={menuLabel}
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setMenuOpen((v) => !v)
        }}
        onMouseDown={(e) => {
          // Prevent parent row name/toggle from receiving the gesture.
          e.stopPropagation()
        }}
      >
        <MoreHorizontal className="size-3.5" aria-hidden />
      </button>
      {menu}
    </div>
  )
}
