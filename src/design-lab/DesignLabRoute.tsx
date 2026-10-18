import { useEffect } from "react"

import { LabCompare } from "@/design-lab/Compare"
import { LabGallery } from "@/design-lab/Gallery"
import { LabPage } from "@/design-lab/LabPage"
import { getVariant } from "@/design-lab/variants"

/**
 * Entry for everything under /design. Throwaway: delete `src/design-lab/` and the one `/design`
 * branch in `src/app/Router.tsx` to remove it. It is not behind the login, and holds sample data only.
 */
export function DesignLabRoute() {
  useEffect(() => {
    const meta = document.createElement("meta")
    meta.name = "robots"
    meta.content = "noindex"
    document.head.appendChild(meta)
    return () => meta.remove()
  }, [])

  const segments = window.location.pathname
    .replace(/^\/design\/?/, "")
    .split("/")
    .filter(Boolean)
  const first = segments[0]
  if (!first) return <LabGallery />
  if (first === "compare") return <LabCompare />

  const variant = getVariant(first)
  if (!variant) {
    return (
      <p className="p-6 font-sans text-[13px]">
        Fant ikke varianten «{first}».{" "}
        <a className="underline" href="/design">
          Alle varianter
        </a>
      </p>
    )
  }
  const bare = new URLSearchParams(window.location.search).has("bare")
  return <LabPage variant={variant} bare={bare} />
}
