import { useEffect } from "react"

import { LabCompare } from "@/design-lab/Compare"
import { LabGallery } from "@/design-lab/Gallery"
import { LabBanner } from "@/design-lab/LabBanner"
import { entriesOf, getEntry } from "@/design-lab/registry"

/**
 * Entry for everything under /design:
 *   /design                  gallery, grouped by design family
 *   /design/a/04, /design/b/01   one look (family letter + id); /design/04 still means family A
 *   /design/compare?a=a00&b=b01  two looks side by side
 * Throwaway: delete `src/design-lab/` and the one `/design` branch in `src/app/Router.tsx` to remove it.
 * Not behind the login, sample data only.
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
  const [first, second] = segments
  if (!first) return <LabGallery />
  if (first === "compare") return <LabCompare />

  // `/design/a/04` or the older `/design/04`.
  const entry = second ? getEntry(first, second) : getEntry("a", first)
  if (!entry) {
    return (
      <p className="p-6 font-sans text-[13px]">
        Fant ikke varianten «{segments.join("/")}».{" "}
        <a className="underline" href="/design">
          Alle varianter
        </a>
      </p>
    )
  }

  const bare = new URLSearchParams(window.location.search).has("bare")
  const siblings = entriesOf(entry.family)
  const index = siblings.findIndex((candidate) => candidate.key === entry.key)
  return (
    <>
      {bare ? null : (
        <LabBanner entry={entry} previous={siblings[index - 1]} next={siblings[index + 1]} />
      )}
      {entry.render()}
    </>
  )
}
