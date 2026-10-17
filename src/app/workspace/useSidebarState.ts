import { useState } from "react"
import { loadSidebarPinned } from "@/persistence/sidebarUiPreferences"

export function useSidebarState() {
  const [sidebarOpenRequest, setSidebarOpenRequest] = useState(0)
  const [sidebarPinned, setSidebarPinned] = useState(() => loadSidebarPinned())

  return {
    sidebarOpenRequest,
    setSidebarOpenRequest,
    sidebarPinned,
    setSidebarPinned,
  }
}
