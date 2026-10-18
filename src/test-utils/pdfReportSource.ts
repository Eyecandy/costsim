import { readFileSync } from "node:fs"
import { join } from "node:path"

import { repoRoot } from "@/test-utils/repoRoot"

/** The pieces that used to sit inside `ProjectReportDocument.tsx`, in their original order. */
const PARTS_IN_ORIGINAL_ORDER = [
  "reportTypes.ts",
  "projectReportStyles.ts",
  "projectReportChartConstants.ts",
  "pdfReportHelpers.ts",
  "PdfCoverParts.tsx",
  "SCurveSection.tsx",
  "TornadoSection.tsx",
  "PdfItemBlocks.tsx",
  "CorrelationBlock.tsx",
  "ContributionSection.tsx",
]

/**
 * Source text of the project PDF document: the sections, styles and helpers in
 * `src/pdf/report/` (without their `export` keyword, in their original order), then
 * `ProjectReportDocument.tsx`. Source-text tests read this instead of the document
 * file alone, so moving code between them does not change what they assert on.
 */
export function readPdfReportSource(): string {
  const parts = PARTS_IN_ORIGINAL_ORDER.map((name) =>
    readFileSync(join(repoRoot, "src/pdf/report", name), "utf8").replace(
      /^export (async function|function|const|type) /gm,
      "$1 ",
    ),
  )
  parts.push(readFileSync(join(repoRoot, "src/pdf/ProjectReportDocument.tsx"), "utf8"))
  return parts.join("\n")
}
