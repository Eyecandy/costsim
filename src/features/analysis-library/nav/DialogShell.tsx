import { type ReactNode } from "react"
import { createPortal } from "react-dom"

export function DialogShell({ children, onClose }: { children: ReactNode; onClose: () => void }) {
  if (typeof document === "undefined") return null
  return createPortal(
    <div
      className="fixed inset-0 z-[220] flex items-center justify-center bg-black/40 p-4"
      role="presentation"
      onClick={(e) => {
        if (e.target !== e.currentTarget) return
        onClose()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-sm rounded-lg border border-border/60 bg-background p-4 shadow-md"
      >
        {children}
      </div>
    </div>,
    document.body,
  )
}
