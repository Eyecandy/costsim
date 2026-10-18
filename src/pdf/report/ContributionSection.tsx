import { Text, View } from "@react-pdf/renderer"
import { type AppLanguage } from "@/domain/results/formatNumber"
import { type PdfContributionBlock } from "@/pdf/buildPdfReportModel"
import { PdfWaterfallChart } from "@/pdf/pdfWaterfallChart"
import { PDF_SECTION_IDS } from "@/pdf/pdfCoverLayout"
import { styles } from "@/pdf/report/projectReportStyles"
import { SectionTitle } from "@/pdf/report/PdfCoverParts"

export function ContributionSection({
  title,
  expectedLabel,
  reserveLabel,
  baseCostLabel,
  p50Label,
  p85Label,
  otherLabel,
  blocks,
  language,
  pageRefs,
}: {
  title: string
  expectedLabel: string
  reserveLabel: string
  baseCostLabel: string
  p50Label: string
  p85Label: string
  otherLabel: string
  blocks: PdfContributionBlock[]
  language: AppLanguage
  pageRefs?: Map<string, number>
}) {
  if (blocks.length === 0) return null
  return (
    <View style={styles.sectionBlock}>
      <SectionTitle id={PDF_SECTION_IDS.contribution} label={title} pageRefs={pageRefs} />
      {blocks.map((block, idx) => (
        <View key={`${block.projectName}-${idx}`} style={styles.contribBlock} wrap={false}>
          <Text style={styles.tornadoProjectTitle}>{block.projectName}</Text>
          <Text style={styles.contribSubtitle}>{expectedLabel}</Text>
          <PdfWaterfallChart
            waterfall={block.expectedAddition}
            startLabel={baseCostLabel}
            endLabel={p50Label}
            spanLabel={expectedLabel}
            otherLabel={otherLabel}
            language={language}
            showTotalSpanBar
          />
          <Text style={[styles.contribSubtitle, { marginTop: 8 }]}>{reserveLabel}</Text>
          <PdfWaterfallChart
            waterfall={block.uncertaintyReserve}
            startLabel={p50Label}
            endLabel={p85Label}
            spanLabel={reserveLabel}
            otherLabel={otherLabel}
            language={language}
            showTotalSpanBar
          />
        </View>
      ))}
    </View>
  )
}
