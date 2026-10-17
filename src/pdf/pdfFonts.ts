import { Font } from "@react-pdf/renderer"

let registered = false
let registering: Promise<void> | null = null

/**
 * Register Noto Sans so Norwegian æ/ø/å render and extract cleanly.
 * Helvetica (PDF core) lacks these glyphs and produces extraction artifacts.
 *
 * Browser: loads Vite-bundled font asset URLs.
 * Node/Vitest: embeds fonts as data URIs (fetch(file://) is unsupported).
 */
export async function ensurePdfFonts(): Promise<void> {
  if (registered) return
  if (registering) {
    await registering
    return
  }

  registering = (async () => {
    let regularSrc = new URL("./fonts/NotoSans-Regular.ttf", import.meta.url).href
    let boldSrc = new URL("./fonts/NotoSans-Bold.ttf", import.meta.url).href

    if (typeof window === "undefined") {
      const { readFileSync, existsSync } = await import("node:fs")
      const { fileURLToPath } = await import("node:url")
      const { dirname, join } = await import("node:path")
      const fontDir = join(dirname(fileURLToPath(import.meta.url)), "fonts")
      const toDataUri = (filename: string, href: string): string => {
        const fromHref = href.startsWith("file:") ? fileURLToPath(href) : null
        const path =
          fromHref && existsSync(fromHref)
            ? fromHref
            : join(fontDir, filename)
        return `data:font/ttf;base64,${readFileSync(path).toString("base64")}`
      }
      regularSrc = toDataUri("NotoSans-Regular.ttf", regularSrc)
      boldSrc = toDataUri("NotoSans-Bold.ttf", boldSrc)
    }

    Font.register({
      family: "NotoSans",
      fonts: [
        { src: regularSrc, fontWeight: "normal" },
        { src: boldSrc, fontWeight: "bold" },
      ],
    })
    Font.registerHyphenationCallback((word) => [word])
    registered = true
  })()

  try {
    await registering
  } finally {
    registering = null
  }
}
