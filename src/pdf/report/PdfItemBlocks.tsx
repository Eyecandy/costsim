import { Text, View } from "@react-pdf/renderer"
import { type AppLanguage } from "@/domain/results/formatNumber"
import {
  formatPdfAbsoluteAmount,
  formatPdfSignedPct,
  type PdfAmountScale,
  type PdfCostItemBlock,
  type PdfDriverBlock,
  type PdfImpactOverride,
} from "@/pdf/buildPdfReportModel"
import { PAGE_CONTENT_WIDTH, styles } from "@/pdf/report/projectReportStyles"

export function PercentileTriplet({
  p10Value,
  mostLikelyValue,
  p90Value,
  mostLikelyLabel,
}: {
  p10Value: string
  mostLikelyValue: string
  p90Value: string
  mostLikelyLabel: string
}) {
  return (
    <View style={styles.percentileRow} wrap={false}>
      <View style={styles.percentileCell}>
        <Text style={styles.percentileLabel} wrap={false}>
          P10
        </Text>
        <Text style={styles.percentileValue} wrap={false}>
          {p10Value}
        </Text>
      </View>
      <View style={styles.percentileCell}>
        <Text style={styles.percentileLabel} wrap={false}>
          {mostLikelyLabel}
        </Text>
        <Text style={styles.percentileValue} wrap={false}>
          {mostLikelyValue}
        </Text>
      </View>
      <View style={styles.percentileCell}>
        <Text style={styles.percentileLabel} wrap={false}>
          P90
        </Text>
        <Text style={styles.percentileValue} wrap={false}>
          {p90Value}
        </Text>
      </View>
    </View>
  )
}

export function CostItemBlocks({
  items,
  language,
  amountScale,
  mostLikelyLabel,
}: {
  items: PdfCostItemBlock[]
  language: AppLanguage
  amountScale: PdfAmountScale
  mostLikelyLabel: string
}) {
  return (
    <>
      {items.map((item, idx) => (
        <View
          key={`${item.name}-${idx}`}
          style={styles.factorBlock}
          wrap={false}
          minPresenceAhead={72}
        >
          <Text style={styles.factorName} wrap={false}>
            {item.name}
          </Text>
          {item.description ? (
            <Text style={styles.factorDescription}>{item.description}</Text>
          ) : null}
          <PercentileTriplet
            mostLikelyLabel={mostLikelyLabel}
            p10Value={formatPdfSignedPct(item.optimisticPct, language)}
            mostLikelyValue={formatPdfAbsoluteAmount(item.mostLikely, language, amountScale)}
            p90Value={formatPdfSignedPct(item.pessimisticPct, language)}
          />
        </View>
      ))}
    </>
  )
}

export function DriverBlocks({
  items,
  language,
  definitionLabel,
  mostLikelyLabel,
}: {
  items: PdfDriverBlock[]
  language: AppLanguage
  definitionLabel: string
  mostLikelyLabel: string
}) {
  return (
    <>
      {items.map((item, idx) => (
        <View
          key={`${item.name}-${idx}`}
          style={styles.factorBlock}
          wrap={false}
          minPresenceAhead={84}
        >
          <Text style={styles.factorName} wrap={false}>
            {item.name}
          </Text>
          {item.description ? (
            <View wrap={false}>
              <Text style={styles.factorFieldLabel}>{definitionLabel}</Text>
              <Text style={styles.factorDescription}>{item.description}</Text>
            </View>
          ) : null}
          <PercentileTriplet
            mostLikelyLabel={mostLikelyLabel}
            p10Value={formatPdfSignedPct(item.optimisticPct, language)}
            mostLikelyValue={formatPdfSignedPct(item.mostLikely, language)}
            p90Value={formatPdfSignedPct(item.pessimisticPct, language)}
          />
        </View>
      ))}
    </>
  )
}

export function ImpactOverridesTable({
  overrides,
  defaultNote,
  noOverrides,
  colDriver,
  colCost,
  colPct,
}: {
  overrides: PdfImpactOverride[]
  defaultNote: string
  noOverrides: string
  colDriver: string
  colCost: string
  colPct: string
}) {
  const driverW = PAGE_CONTENT_WIDTH * 0.34
  const costW = PAGE_CONTENT_WIDTH * 0.46
  const pctW = PAGE_CONTENT_WIDTH * 0.2

  return (
    <View>
      <Text style={styles.bodyMuted}>{defaultNote}</Text>
      {overrides.length === 0 ? (
        <Text style={styles.bodyText}>{noOverrides}</Text>
      ) : (
        <View style={styles.compactTable} wrap={false}>
          <View style={styles.compactHeader} wrap={false}>
            <Text style={[styles.compactCellBold, { width: driverW }]} wrap={false}>
              {colDriver}
            </Text>
            <Text style={[styles.compactCellBold, { width: costW }]} wrap={false}>
              {colCost}
            </Text>
            <Text
              style={[styles.compactCellBold, { width: pctW, textAlign: "right" }]}
              wrap={false}
            >
              {colPct}
            </Text>
          </View>
          {overrides.map((row, idx) => (
            <View
              key={`${row.driverName}-${row.costItemName}-${idx}`}
              style={styles.compactRow}
              wrap={false}
            >
              <Text style={[styles.compactCell, { width: driverW }]} wrap={false}>
                {row.driverName}
              </Text>
              <Text style={[styles.compactCell, { width: costW }]} wrap={false}>
                {row.costItemName}
              </Text>
              <Text style={[styles.compactCell, { width: pctW, textAlign: "right" }]} wrap={false}>
                {`${row.impactPct} %`}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  )
}
