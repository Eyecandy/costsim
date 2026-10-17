import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { join } from "node:path"

import { messages } from "@/i18n/messages"
import { repoRoot as root } from "@/test-utils/repoRoot"
import { readAppSource } from "@/test-utils/appSource"


function readSrc(rel: string) {
  return readFileSync(join(root, rel), "utf8")
}

describe("Focus / Results concise guidance copy", () => {
  it("Results Focus does not render question-mark help; Input Focus still does", () => {
    const app = readAppSource()
    const guided = readSrc("src/features/guided-input/GuidedInputDialog.tsx")
    const phaseInfo = readSrc("src/features/guided-input/GuidedPhaseInfo.tsx")
    expect(app).not.toContain("focusResultHelpCopyKeys")
    // Input Focus help is shell-owned via Guided chrome meta (not Results help).
    expect(app).toContain("headerHelp=")
    expect(app).toContain("GuidedPhaseInfo")
    expect(app).toContain("guidedFocusChromeMeta?.helpTopic")
    expect(guided).toContain("<GuidedPhaseInfo")
    expect(phaseInfo).toContain("data-guided-phase-info")
  })

  it("visible Key Figures / S-curve / Tornado / Contribution copy is concise", () => {
    expect(messages.no.helper.resultsKeyMetrics).toBe(
      "Oppsummerer den simulerte kostnadsfordelingen. Percentilene viser kostnadsnivået som den angitte andelen av simuleringene ligger under.",
    )
    expect(messages.en.helper.resultsKeyMetrics).toBe(
      "Summarizes the simulated cost distribution. Percentiles show the cost level that the stated share of simulations falls below.",
    )
    expect(messages.no.helper.resultsKeyMetrics).not.toMatch(/P50|P85/)
    expect(messages.en.helper.resultsKeyMetrics).not.toMatch(/P50|P85/)
    expect(messages.no.charts.sCurveSubtitle).toBe(
      "Viser sannsynligheten for at total kostnad blir lavere enn et gitt nivå. Større horisontal spredning betyr større usikkerhet i kostnadsutfallet.",
    )
    expect(messages.en.charts.sCurveSubtitle).toBe(
      "Shows the probability that total cost will be below a given level. Greater horizontal spread means greater uncertainty in the cost outcome.",
    )
    expect(messages.no.charts.sCurveSubtitle).toMatch(/horisontal spredning/)
    expect(messages.en.charts.sCurveSubtitle).toMatch(/horizontal spread/)
    expect(messages.no.charts.tornadoSubtitle).toBe(
      "Viser hvilke usikkerheter som har størst påvirkning på kostnadsresultatet. Lengre stolper betyr større påvirkning.",
    )
    expect(messages.en.charts.tornadoSubtitle).toBe(
      "Shows which uncertainties have the greatest impact on the cost result. Longer bars mean greater impact.",
    )
    expect(messages.no.charts.attributionSubtitle).toBe(
      "Viser hvordan kostnadsposter og drivere bidrar til forventet tillegg og usikkerhetsavsetning. Større bidrag betyr større påvirkning på det aktuelle resultatet.",
    )
    expect(messages.en.charts.attributionSubtitle).toBe(
      "Shows how cost items and drivers contribute to the expected addition and uncertainty reserve. Larger contributions mean greater impact on the relevant result.",
    )
    expect(messages.no.charts.attributionSubtitle).not.toMatch(/gapet/)
    expect(messages.en.charts.attributionSubtitle).not.toMatch(/\bgap\b/i)
    expect(messages.no.checkpoints.developmentHelper).toBe(
      "Viser hvordan kostnadsnivå og usikkerhet har utviklet seg mellom sjekkpunktene.",
    )
    expect(messages.en.checkpoints.developmentHelper).toBe(
      "Shows how cost level and uncertainty have developed between checkpoints.",
    )
  })

  it("old long guidance and Tornado controllable-outcomes disclaimer stay absent", () => {
    const messagesSrc = readSrc("src/i18n/messages.ts")
    const panel = readSrc("src/features/results/ResultsPanel.tsx")
    expect(messagesSrc).not.toContain("Velg et kostnadsnivå på x-aksen")
    expect(messagesSrc).not.toContain("Choose a cost level on the x-axis")
    expect(messagesSrc).not.toContain("Venstre og høyre side")
    expect(messagesSrc).not.toContain("left and right sides")
    expect(messagesSrc).not.toContain("resultsTornadoFootnote")
    expect(messagesSrc).not.toContain("ikke styrbare utfall")
    expect(messagesSrc).not.toContain("not controllable outcomes")
    expect(panel).not.toContain("resultsTornadoFootnote")
    expect(messages.en.charts.sCurveSubtitle).not.toMatch(/most likely/i)
    expect(messages.no.charts.sCurveSubtitle).not.toMatch(/mest sannsynlig nivå/i)
  })

  it("Results header context remains without help control", () => {
    const app = readAppSource()
    expect(app).toContain("data-focus-results-project-context")
    expect(app).toContain("data-focus-results-context")
    expect(app).toContain('t("inputs.focusResultsContext")')
  })
})
