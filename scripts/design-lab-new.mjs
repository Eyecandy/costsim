// Creates the next design-lab variant: npm run lab:new -- my-look [--from 03]
// The new file starts as a copy of the latest variant's options (or of --from), so a new look only
// needs the few options that differ. See src/design-lab/README.md.
import { readdirSync, readFileSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const variantsDir = join(dirname(fileURLToPath(import.meta.url)), "..", "src", "design-lab", "variants")
const args = process.argv.slice(2)
const fromIndex = args.indexOf("--from")
const from = fromIndex >= 0 ? args[fromIndex + 1] : undefined
const slug = args.find((arg, index) => !arg.startsWith("--") && index !== fromIndex + 1)

if (!slug || !/^[a-z0-9-]+$/.test(slug)) {
  console.error("Usage: npm run lab:new -- my-look [--from 03]   (name: lower-case letters, digits, dashes)")
  process.exit(1)
}

const files = readdirSync(variantsDir)
  .filter((file) => /^v\d\d-.+\.ts$/.test(file))
  .sort()
const latest = files.at(-1)
const sourceFile = from ? files.find((file) => file.startsWith(`v${from}-`)) : latest
if (!sourceFile) {
  console.error(`No variant with id ${from}.`)
  process.exit(1)
}

const nextId = String(Number(latest?.slice(1, 3) ?? "-1") + 1).padStart(2, "0")
const source = readFileSync(join(variantsDir, sourceFile), "utf8")
const match = source.match(/options:\s*(\{[\s\S]*?\n {2}\}|BASE_OPTIONS),?\n\}/)
if (!match) {
  console.error(`Could not read the options of ${sourceFile}.`)
  process.exit(1)
}
const options = match[1]
const title = slug
  .split("-")
  .map((word, index) => (index === 0 ? word.charAt(0).toUpperCase() + word.slice(1) : word))
  .join(" ")
const usesBase = options.includes("BASE_OPTIONS")

const content = `${usesBase ? 'import { BASE_OPTIONS } from "@/design-lab/variants/base"\n' : ""}import type { LabVariant } from "@/design-lab/variants/types"

const variant: LabVariant = {
  id: "${nextId}",
  title: "${title}",
  description: "TODO: one or two sentences on what this look shows.",
  notes: [],
  changes: ["TODO: what is different from ${sourceFile.slice(1, 3)}"],
  options: ${options},
}

export default variant
`

const target = join(variantsDir, `v${nextId}-${slug}.ts`)
writeFileSync(target, content)
console.log(`Created ${target}\nIt starts as a copy of ${sourceFile}. Edit it, then open /design/${nextId}.`)
