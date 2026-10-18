import { PRODUCT_NAME } from "@/shared/brand"

/** Norwegian UI texts (the default language). Keep the shape identical to `messages.en.ts`. */
export const messagesNo = {
  common: {
    example: "Eksempel",
    cancel: "Avbryt",
    confirm: "Bekreft",
    close: "Lukk",
  },
  errorBoundary: {
    title: "Noe gikk galt",
    body: "Siden kunne ikke vises. Prøv igjen, eller last siden på nytt.",
    tryAgain: "Prøv igjen",
    reload: "Last siden på nytt",
  },
  buttons: {
    runSimulation: "Kjør simulering",
    simulating: "Simulerer…",
  },
  sections: {
    costElements: "Kostnadsposter",
    drivers: "Drivere",
  },
  expanders: {
    costElements: "Kostnadsposter",
    drivers: "Drivere",
    driverImpact: "Påvirkning",
    costCorrelation: "Korrelasjon",
    define: "Definer",
    guidedInput: "Fokusmodus",
  },
  projectProfile: {
    heading: "Prosjektprofil",
    collapsedEmptyHint: "Beskriv prosjektet",
    focusIntro:
      "Velg det som best beskriver prosjektet. Profilen gir kontekst til analysen og dokumenterer prosjektgrunnlaget.",
    sizeHeading: "Størrelse",
    categories: {
      projectArea: "Prosjektområde",
      projectType: "Prosjekttype",
      interventionTypes: "Tiltakstype",
      phase: "Hovedstadium ved analysen",
      deliveryModel: "Gjennomføringsmodell",
    },
    options: {
      buildings: "Bygg",
      transport: "Samferdsel",
      energy: "Energi",
      water_wastewater: "Vann og avløp",
      industry: "Industri",
      other: "Annet",
      education: "Undervisning",
      healthcare: "Helse",
      office: "Kontor",
      culture_sports: "Kultur og idrett",
      emergency_defence: "Beredskap og forsvar",
      residential: "Bolig",
      road: "Vei",
      rail: "Bane",
      tunnel: "Tunnel",
      bridge: "Bru",
      transport_hub: "Knutepunkt",
      generation: "Produksjon",
      grid_transmission: "Nett og overføring",
      substation_transformer: "Stasjon / transformator",
      energy_storage: "Energilagring",
      water_supply: "Vannforsyning",
      wastewater: "Avløp",
      pipeline_network: "Ledningsanlegg",
      treatment_plant: "Behandlingsanlegg",
      pumping_station: "Pumpestasjon",
      production_facility: "Produksjonsanlegg",
      process_plant: "Prosessanlegg",
      warehouse_logistics: "Lager og logistikk",
      technical_infrastructure: "Teknisk infrastruktur",
      new_facility: "Nytt anlegg",
      expansion: "Utvidelse",
      rehabilitation_renewal: "Rehabilitering / fornyelse",
      modification: "Ombygging",
      combined: "Kombinert",
      study: "Utredning",
      concept: "Konsept",
      preliminary_design: "Forprosjekt",
      detailed_design: "Detaljprosjektering",
      execution: "Gjennomføring",
      handover: "Overlevering",
      not_contracted: "Ikke avklart",
      design_bid_build: "Utførelsesentreprise",
      design_build: "Totalentreprise",
      partnering: "Samspill",
      multiple_contracts: "Flere / delte kontrakter",
    },
    quantityTypes: {
      gross_floor_area: "BTA",
      length: "Lengde",
      tunnel_length: "Tunnellengde",
      bridge_length: "Brulengde",
      capacity: "Kapasitet",
    },
    quantityUnits: {
      m2: "m²",
      km: "km",
      m: "m",
      mw: "MW",
    },
    changeWillClearLater: "Denne endringen vil fjerne alle senere valg i prosjektprofilen.",
    changeWillClearLaterHint: "Du kan velge dem på nytt etterpå.",
    confirmChange: "Endre",
  },
  helper: {
    resultsKeyMetrics:
      "Oppsummerer den simulerte kostnadsfordelingen. Percentilene viser kostnadsnivået som den angitte andelen av simuleringene ligger under.",
    resultsWaterfallFootnote:
      "Viser hvordan forventet tillegg bygges opp fra basiskostnad til P50, fordelt på kostnadsposter og drivere.",
  },
  charts: {
    sCurveAriaLabel: "S-kurve for simuleringsresultater",
    noContributions: "Ingen bidrag å vise.",
    axisY: "P",
    axisX: "K",
    sCurveTitle: "S-KURVE",
    sCurveSubtitle:
      "Viser sannsynligheten for at total kostnad blir lavere enn et gitt nivå. Større horisontal spredning betyr større usikkerhet i kostnadsutfallet.",
    attributionTitle: "BIDRAGSANALYSE",
    attributionSubtitle:
      "Viser hvordan kostnadsposter og drivere bidrar til forventet tillegg og usikkerhetsavsetning. Større bidrag betyr større påvirkning på det aktuelle resultatet.",
    waterfallTitle: "BIDRAG TIL FORVENTET TILLEGG",
    waterfallSubtitle:
      "Viser hva som bygger opp forventet tillegg (P50 minus basiskostnad), fordelt på kostnadsposter og drivere.",
    reserveWaterfallTitle: "BIDRAG TIL USIKKERHETSAVSETNING",
    reserveWaterfallSubtitle:
      "Viser hva som bygger opp usikkerhetsavsetningen (P85 minus P50), fordelt på kostnadsposter og drivere.",
    tornadoTitle: "TORNADO",
    tornadoSubtitle:
      "Viser hvilke usikkerheter som har størst påvirkning på kostnadsresultatet. Lengre stolper betyr større påvirkning.",
    openLargerView: "Åpne større visning",
    closeLargerView: "Lukk større visning",
  },
  results: {
    resultsHeading: "Resultater",
    keyMetricsTitle: "NØKKELTALL",
    downloadPdf: "Last ned PDF",
    pdfReportTitle: "Usikkerhetsanalyse",
    pdfOngoingReportKindLabel: "Løpende usikkerhetsanalyse",
    pdfOngoingCheckpointOverviewTitle: "Sjekkpunktoversikt",
    pdfOngoingDevelopmentTitle: "Utvikling",
    pdfOngoingLatestSummaryTitle: "Siste arkiverte sjekkpunkt",
    pdfOngoingCurrentStatusTitle: "Nåværende status",
    pdfOngoingChangeTitle: "Endring siden forrige sjekkpunkt",
    pdfOngoingComparisonTitle: "Sammenligning med forrige sjekkpunkt",
    pdfOngoingHistoryTitle: "Sjekkpunkthistorikk",
    pdfOngoingAssumptionsMethodTitle: "Forutsetninger / metode",
    pdfOngoingAssumptionsTitle: "Forutsetninger",
    pdfOngoingMethodTitle: "Om analysemetoden",
    pdfOngoingReportBasisArchivedOnly:
      "Rapportgrunnlag: Arkiverte sjekkpunkter til og med {cutoffLabel}.",
    pdfOngoingReportBasisWithExcludedDraft:
      "Rapportgrunnlag: Arkiverte sjekkpunkter til og med {cutoffLabel}. {draftLabel} er aktivt og er ikke inkludert i rapporten.",
    pdfOngoingReportMeaning:
      "Rapporten viser utviklingen i den løpende usikkerhetsanalysen frem til siste arkiverte sjekkpunkt som inngår i rapportgrunnlaget. Resultatene fra hvert sjekkpunkt er frosset ved arkivering, slik at utviklingen kan sammenlignes over tid.",
    pdfOngoingAssumptionsContext:
      "Forutsetningene nedenfor gjelder {cutoffLabel}, som er siste arkiverte sjekkpunkt i rapportgrunnlaget.",
    pdfOngoingColSequence: "Nr.",
    pdfOngoingColName: "Navn",
    pdfOngoingColStatus: "Status",
    pdfOngoingColArchivedAt: "Arkivert",
    pdfOngoingColPrevious: "Forrige",
    pdfOngoingColLatest: "Siste",
    pdfOngoingColChange: "Endring",
    pdfOngoingStatusArchived: "Arkivert",
    pdfOngoingStatusDraft: "Utkast",
    pdfOngoingColDeltaP50: "Δ P50",
    pdfOngoingLifecycleActive: "Aktiv",
    pdfOngoingLifecycleCompleted: "Fullført",
    pdfOngoingEmptyDevelopment: "Ingen arkiverte resultater å vise.",
    pdfOngoingCheckpointContextLabel: "Siste sjekkpunkt",
    pdfOngoingArchivedCountLabel: "Arkiverte sjekkpunkt",
    pdfOngoingPeriodLabel: "Periode",
    pdfOngoingExportBlockedNoArchived:
      "Arkiver minst ett sjekkpunkt før du eksporterer PDF for løpende analyse.",
    pdfOngoingDraftNotArchivedTitle: "{label} er ikke arkivert",
    pdfOngoingDraftExportBody:
      "Rapporten vil baseres på arkiverte sjekkpunkter til og med {cutoffLabel}. {draftLabel} må arkiveres før det kan inkluderes i rapporten.",
    pdfOngoingDraftExportContinue: "Fortsett",
    pdfOngoingDraftExportCancel: "Avbryt",
    pdfBrandName: PRODUCT_NAME,
    pdfGeneratedAtLabel: "Generert",
    pdfResultsSectionLabel: "01  Resultater",
    pdfContentsTitle: "Innhold",
    pdfAnalysisMeta:
      "Kostnadsusikkerheten er analysert med {count} Monte Carlo-simuleringer basert på P10, mest sannsynlig verdi og P90 for kostnadsposter og usikkerhetsdrivere.",
    pdfMetricsColMetric: "Kostnadsnivå",
    pdfMetricsColValue: "Verdi",
    pdfSCurveFootnote: "S-kurven viser fordelingen av totale kostnader. {percentiles} er markert.",
    pdfUncertaintyPictureTitle: "02  Usikkerhetsbilde",
    pdfTornadoExplanation:
      "Viser den isolerte effekten av hver kostnadspost og driver fra P10 til P90, mens øvrige faktorer holdes på mest sannsynlig verdi.",
    pdfContributionTitle: "Bidragsanalyse",
    pdfContributionExpected: "Bidrag til forventet tillegg",
    pdfContributionReserve: "Bidrag til usikkerhetsavsetning",
    pdfAssumptionsTitle: "03  Forutsetninger",
    pdfAssumptionsEmpty: "Ingen forutsetninger er definert.",
    pdfAnalysisBasisTitle: "04  Analysegrunnlag",
    pdfEstimateUncertaintyTitle: "Estimatusikkerhet",
    pdfDriversTitle: "Usikkerhetsdrivere",
    pdfDefinitionLabel: "Definisjon",
    pdfUncertaintyAssessmentLabel: "Vurdering av usikkerhet",
    pdfMostLikelyLabel: "Mest sannsynlig",
    pdfModelRelationshipsTitle: "05  Modellforhold",
    pdfImpactTitle: "Påvirkning",
    pdfImpactDefaultNote:
      "Drivere påvirker som standard alle aktuelle kostnadsposter 100 %. Avvik er vist nedenfor.",
    pdfImpactNoOverrides:
      "Ingen justeringer i driverpåvirkning. Alle drivere bruker standard påvirkning på 100 %.",
    pdfImpactColDriver: "Driver",
    pdfImpactColCost: "Kostnadspost",
    pdfImpactColPct: "Påvirkning",
    pdfCorrelationTitle: "Korrelasjon",
    pdfCorrelationNone: "Det er ikke lagt inn korrelasjon mellom kostnadspostene.",
    pdfCorrelationUnlistedNote: "Ikke oppførte sammenhenger behandles som ukorrelerte.",
    pdfCorrelationColA: "Kostnadspost A",
    pdfCorrelationColB: "Kostnadspost B",
    pdfCorrelationColRho: "ρ",
    pdfMethodTitle: "06  Om analysen",
    pdfMethodParagraph1:
      "Resultatene er basert på Monte Carlo-simulering med {count} kjøringer. Kostnadsposter og usikkerhetsdrivere er spesifisert som P10, mest sannsynlig verdi og P90. Disse percentilene brukes til å kalibrere {distributions} som danner grunnlaget for samplingen.",
    pdfMethodParagraph2:
      "Usikkerhetsdrivere anvendes multiplikativt på aktuelle kostnadsposter. Påvirkningen kan justeres per kostnadspost når det er relevant. Der korrelasjon mellom kostnadsposter er spesifisert, modelleres samvariasjonen med en gaussisk kopula.",
    pdfMethodParagraph3:
      "Tornadodiagrammet viser den isolerte effekten av hver faktor fra P10 til P90 mens øvrige faktorer holdes på mest sannsynlig verdi.",
    pdfOpenAnalysisTitle: "Åpne analysen",
    pdfOpenAnalysisHelper:
      "Åpner analysegrunnlaget i nettleseren med samme kostnadsposter, drivere, forutsetninger, påvirkning og korrelasjoner. Kjør simuleringen på nytt for å generere resultater.",
    pdfShareLinkAnchorText: `Åpne analysen i ${PRODUCT_NAME}`,
    pdfShareUnavailableNote: "Analysen er for stor til å deles som lenke i denne rapporten.",
    pdfFooter: `Generert av ${PRODUCT_NAME}`,
    pdfExportBlockedStaleInputs: "Input er endret. Kjør simulering på nytt før du eksporterer PDF.",
    shareLinkBlockedStaleInputs: "Input er endret. Kjør simulering på nytt før du oppretter lenke.",
    shareLinkTooLarge:
      "Analysen inneholder for mye data til å deles som lenke. Kort ned beskrivelser eller forutsetninger og prøv igjen.",
    aiBriefBlockedStaleInputs:
      "Input er endret. Kjør simulering på nytt før du oppretter KI-brief.",
    nextStepsHeading: "Eksporter",
    optionsHeading: "Valg",
    actionsHeading: "Del og dokumenter",
    actionsHelperText: "Del rapport eller lenke for videre arbeid.",
    copyShareLink: "Kopier lenke",
    shareLinkCopied: "Lenke kopiert",
    aiAnalyzeHeading: "Analyser med KI",
    aiAnalyzeHelper: "Lim inn i en KI-tjeneste for tolkning, kvalitetssjekk og forbedringsforslag.",
    copyAiBrief: "Kopier KI-brief",
    aiBriefClipboardPrompt: `Du er en erfaren rådgiver innen usikkerhetsanalyse og beslutningsstøtte i prosjekter.

Nedenfor får du et strukturert analysegrunnlag (ai-brief-v3). Bruk det til å orientere brukeren raskt, peke på det viktigste signalet, og åpne en nyttig videre samtale. Første svar er et startpunkt for videre analyse — ikke en fullstendig sluttrapport. Forsøk ikke å avdekke alle mulige svakheter eller gi alle anbefalinger med en gang. La sekundære observasjoner vente til oppfølging, med mindre de påvirker hovedkonklusjonen.

Det strukturerte grunnlaget er rikt og detaljert med vilje. Bruk det i bakgrunnen for kvalitet, men gjør ikke første svar til en uttømmende gjennomgang. Brukeren kan fortsette dialogen med deg basert på hele briefen. Behold og bruk hele analysegrunnlaget i hele den videre samtalen. Når brukeren senere spør om driver, kostnadspost, forutsetning, korrelasjoner, spenn, alternativforskjeller, sensitivitet eller contribution analysis, bruk briefen som allerede finnes — ikke be brukeren lime inn data på nytt.

Ikke gjenta dataene mekanisk. Prioriter det som er mest beslutningsrelevant. Du skal ikke:
- lede med metodebeskrivelse når den ikke påvirker tolkningen nå
- systematisk auditere alle forutsetninger, definisjoner, spenn, impacts og korrelasjoner i første svar
- tilby en «mer detaljert rapport» på samme grunnlag
- finne på ekstra dybde uten ny kontekst
- foreslå forbedringer bare for å fylle plass
- gi konkrete anbefalinger i første svar med mindre briefen allerede støtter dem sterkt; spørsmål er ofte bedre når viktig kontekst mangler

Ett prosjekt: behandle det som normalt. Ikke nevn manglende alternativer. Fokuser på usikkerhetsbildet, det viktigste forholdet og nyttige spørsmål.
Flere prosjekter/alternativer: trekk frem bare den mest materielle sammenligningen. Gi ikke mini-gjennomgang av hvert alternativ med mindre de faktisk skiller seg beslutningsrelevant. Hvis to alternativer er praktisk like, si det kort. Bruk \`displayName\` når du omtaler prosjekter eller alternativer. \`id\` er kun intern for å koble data og skal aldri vises eller forkortes. Når prosjektnavn er like, er \`displayName\` allerede gjort entydig.

Skriv et kort, samtaleorientert førstesvar — normalt ca. 150–300 ord. Fyll ikke plassen mekanisk; hvis analysen er enkel, vær kortere. Bruk tall bare når de støtter hovedpoenget. Svar i denne rekkefølgen:

1. Kort vurdering
Skriv ca. 2–4 setninger. Oppsummer bare: hovedbildet, den mest beslutningsrelevante forskjellen eller eksponeringen, og om analysen fremstår bredt brukbar eller om ett materiell forhold bør avklares. Ikke oppsummer alle prosjekter, gjenta alle nøkkeltall, forklar hele metoden eller redegjør for hele oppsettet.

2. Det viktigste å se nærmere på
Maks 2 punkter — de mest nyttige observasjonene for videre arbeid (f.eks. dominant driver, uvanlig bredt spenn, mulig overlapp, korrelasjon som bør avklares, materiell alternativforskjell). Ikke skap problemer bare for å fylle seksjonen. Hvis bare ett forhold er meningsfullt, ta ett. Hvis ingenting materiellt skiller seg ut, si det kort.

3. Spørsmål for videre arbeid
Still 1–3 målrettede spørsmål basert på den faktiske briefen, som hjelper bruker og AI å fortsette arbeidet sammen. Gode spørsmål kan avklare begrunnelse for en dominant driver, om overlappende usikkerheter er tilsiktet adskilt, om en korrelasjon speiler en konkret felles årsak, om et smalt/bredt P10–P90-spenn er tilsiktet, eller hvilken beslutning analysen skal støtte når det påvirker tolkningen. Unngå generiske «mer kontekst»-spørsmål, spørsmål om betydning når beskrivelse allerede finnes, og spørsmål etter informasjon som allerede står i briefen. Maks 3 spørsmål.

Metodesvakheter og begrensninger: ta dem bare inn i første svar når de faktisk påvirker tolkningen (f.eks. at resultatet er sensitivt for en sterk positiv korrelasjon). Ikke start med «dette er Monte Carlo med trekantfordelinger…» når det ikke er beslutningsrelevant nå. Metode-metadata finnes for senere diskusjon.

Regler for pålitelighet og tolkning:
- Bruk \`displayName\` for menneskelige prosjekt-/alternativhenvisninger. Bruk \`id\` kun internt for å koble data — aldri vis eller forkort prosjekt-id i svaret, og finn ikke på egne forkortelser eller alternative prosjektetiketter.
- Bruk eksplisitte beskrivelser/definisjoner når de finnes.
- Hvis bare et navn finnes, behandle navnet som en label og ikke finn på detaljert faglig betydning.
- Hvis tolkning i stor grad avhenger av manglende definisjon/kontekst, si begrensningen eksplisitt eller still et målrettet spørsmål.
- Presenter aldri antakelser om labels som fakta.
- Optimistic/P10, mostLikely/mode og pessimistic/P90 er percentil-/modusinput, ikke harde min/max. Trekantstøtten er kalibrert fra disse og strekker seg utover P10/P90.
- Tornado beskriver sensitivitet/spredningsassosiasjon. Contribution Analysis tilordner forventet tillegg (basis→P50) og usikkerhetsavsetning (P50→P85). Bland ikke disse.
- Hvis tornado og bidrag forteller ulike historier, tolk forskjellen i stedet for å anta at én er «feil».
- Hvis contributionAnalysis.status er notCalculated, er det ikke en modelsvakhet — det er et valgfritt forklaringsresultat.
- Vurder forutsetninger når de finnes: om de påvirker tolkning, konflikter med tallinput, avslører manglende usikkerhet, eller styrker/svekker troverdighet til spenn. Kritiser ikke forutsetninger bare fordi de finnes, og finn ikke opp manglende.
- Når definisjoner/vurderinger finnes, kan du vurdere om P10/mode/P90 fremstår internt sammenhengende (uforklarlig asymmetri, spenn i strid med skrevet vurdering, svært smalt spenn ved stor beskrevet usikkerhet, eller svært bredt spenn med lite begrunnelse). Ikke påstå at et spenn er objektivt riktig/galt uten dekning.
- Flag mulig overlapp/dobbelttelling bare når definisjoner/vurderinger gir konkret grunn (to drivere som ser ut til å dekke samme usikkerhet, driver og kostnadspostspenn som kan fange samme effekt, eller korrelasjon og felles driver som kan representere samme samvariasjon). Bruk forsiktig språk som «kan være overlappende» eller «bør avklares» — ikke hevde feil uten evidens.
- Bruk driverImpact når det finnes. Hvis defaultImpactPct er 100 og overrides er tom, betyr det 100 % påvirkning på alle aktuelle kostnadsposter — ikke «ingen påvirkning», «ukjent» eller «ikke konfigurert». Når overrides finnes, gjelder de bare de listede kostnadspostene; alle øvrige bruker default. Vurder om impact-mønsteret er konsistent med driverens eksplisitte definisjon — ikke utled dette fra navnet alene.
- Bruk signals.driverConcentration bare i tråd med method.driverConcentrationDefinition — ikke finn på andre betydninger.
- Bruk ikke-null korrelasjoner når du tolker total usikkerhet. Korrelasjon er ikke kausalitet. Ikke påstå at en bestemt rho er riktig/gal uten kontekst. Null korrelasjon er et gyldig modellvalg; ikke etterspør korrelasjon bare fordi den mangler.
- Ikke spør etter informasjon som allerede finnes i assumptions, descriptions, driverImpacts eller correlations.

\`currentResultView\` beskriver brukerens valgte nøkkeltall og S-kurve-percentiler i den aktive resultatvisningen. Prioriter dem i vurderingen når de er relevante, men bruk hele analysegrunnlaget og ikke ignorer andre vesentlige funn.

Tone og stil:
- føles som en erfaren rådgiver som åpner en arbeidsøkt
- kort, samtaleorientert; normalt 150–300 ord
- konsise avsnitt; opptil 2 korte punkter under «Det viktigste å se nærmere på»; 1–3 nummererte eller punktvise spørsmål
- analytisk skarp, ikke bare beskrivende; fokus på implikasjoner
- ikke vær mer sikker enn datagrunnlaget tilsier
- hvis forskjellene er små eller ikke beslutningskritiske, si det eksplisitt
- unngå lang rapportprosa, uttømmende sjekklister, gjentakelse av alle metrikker, generiske avslutninger og tilbud om «mer detaljert rapport»

Analysegrunnlag:`,
    aiBriefClipboardPromptOngoingAddendum: `Tillegg for løpende analyse:

Denne briefen gjelder en løpende analyse. Det strukturerte grunnlaget inneholder \`ongoingDevelopment\` i tillegg til den vanlige sjekkpunktanalysen i \`projects\`.

Svar på to sammenhengende spørsmål:
1. Hva forteller usikkerhetsanalysen på det NÅVÆRENDE/viste sjekkpunktet?
2. Hvordan har kostnadsbildet og usikkerheten utviklet seg sammenlignet med tidligere sjekkpunkter?

Det viste sjekkpunktet er hovedfokuset. Historikken i \`ongoingDevelopment\` er støttende kontekst — ikke gjør briefen om til en generisk trendrapport. Prioriter beslutningsrelevant tolkning fremfor mekanisk opplisting av endringer.

Skill tydelig mellom:
- endring i kostnadsnivå (f.eks. Base Cost, P50, Expected Value)
- endring i usikkerhet / usikkerhetsspenn

\`uncertaintySpanP85MinusBase\` (P85 − Base Cost) er en praktisk indikator på det overordnede usikkerhetsspennet i produktets kontekst — ikke et matematisk komplett mål på all usikkerhet. At P85 stiger fordi Base Cost stiger, er ikke nødvendigvis det samme som at usikkerheten øker; vurder også spennet. Usikkerhet kan øke, minke eller være grovt stabil mens kostnadsnivået beveger seg.

Når \`hasHistoricalDevelopment\` er false (typisk første sjekkpunkt), ikke late som det finnes historisk utvikling. Når \`previousComparison\` finnes, bruk den til meningsfull utvikling siden forrige sjekkpunkt; bruk \`series\` for bredere utvikling når flere sjekkpunkter finnes.

Du kan peke på analytiske oppfølgingspunkter som støttes av dataene (f.eks. usikkerhet som har vokst materielt, usikkerhet som er redusert etter avklaring, ny viktig driver, kostnadsnivå som har flyttet seg uten tilsvarende endring i usikkerhet, høy usikkerhet til tross for prosjektmodning, forutsetninger eller input som fortjener ny gjennomgang). Ikke finn på prosjektaksjoner uten støtte i briefen, og ikke vær forskrivende eller autoritativ.

Resonneringsrekkefølge for løpende analyse: nåværende situasjon først → viktige usikkerheter og bidrag → meningsfull utvikling siden forrige sjekkpunkt → bredere trend der det finnes nok sjekkpunkter → implikasjoner / forhold som fortjener oppmerksomhet.`,
    sCurveTitle: "S-KURVE",
    tornadoTitle: "TORNADO",
    locked: "Låst",
    p10: "P10",
    p90: "P90",
    scale: "Skala",
    calculateExpectedAddition: "Beregn forventet tillegg",
    calculateContributions: "Beregn bidrag",
    calculatingExpectedAddition: "Beregner forventet tillegg…",
    calculatingContributions: "Beregner bidrag…",
    tryAgain: "Prøv igjen",
    waterfallOther: "Øvrige",
    waterfallError: "Kunne ikke beregne bidrag.",
    waterfallStaleInputs: "Input er endret. Kjør simulering på nytt før du beregner bidrag.",
    archivedContributionNotStored: "Bidragsanalyse ble ikke lagret med dette arkivet.",
  },
  keyMetrics: {
    name: "Navn",
    baseCost: "Basiskostnad",
    baseCostTooltip:
      "Basiskostnad er prosjektets faste kostnadsgrunnlag. I analysen brukes dette som utgangspunkt for beregning av forventet tillegg, usikkerhetsavsetning og totalnivå.",
    expectedAddition: "Forventet tillegg",
    uncertaintyReserve: "Usikkerhetsavsetning",
    expectedValue: "Forventningsverdi",
    stdDev: "Standardavvik",
    probabilityAtBaseCost: "Sannsynlighet ved basiskostnad",
    probabilityBelowCostLevel: "Sannsynlighet under kostnadsnivå",
    probabilityBelowWithAmount: "Sannsynlighet under {amount}",
    p50: "P50",
    uncertaintyPremium: "Usikkerhetsavsetning",
    p85: "P85",
  },
  inputs: {
    costFallbackName: "Kost {n}",
    costItemFallbackLabel: "Kostnadspost",
    driverFallbackLabel: "Driver",
    addRow: "Legg til rad",
    deleteSelectedRow: "Slett valgt rad",
    clearTableAction: "Tøm",
    clearTableTooltip: "Tøm tabell",
    clearTableConfirm: "Dette vil tømme tabellen.",
    guidanceCostItems:
      "Angi «Mest sannsynlig» som beløpet du mener kostnadsposten mest sannsynlig vil koste. P10 og P90 angis som prosentvise avvik fra dette beløpet og skal beskrive realistiske lave og høye utfall – ikke beste og verste tenkelige utfall. Usikkerheten ligger ofte i mengde, pris eller begge deler. Korrelasjon kan brukes dersom kostnadsposter har en reell tendens til å variere sammen.",
    guidanceCostItemsGuide: "Fokusmodus for hjelp til å vurdere og fylle inn kostnadsposter.",
    guidanceCostDrivers:
      "Drivere beskriver usikre forhold som kan påvirke flere kostnadsposter samtidig, for eksempel marked, prosjektutvikling, stedlige forhold eller interessenter. De virker multiplikativt på kostnadspostene de påvirker, og påvirkningen kan justeres per kostnadspost. Unngå å modellere samme usikkerhet både som driver og i spennene på kostnadspostene.",
    guidanceCostDriversGuide: "Fokusmodus for hjelp til å identifisere og vurdere drivere.",
    guidanceUseGuide: "Bruk",
    nameHeader: "Navn",
    optimisticHeader: "Optimistisk (%)",
    likelyHeader: "Mest sannsynlig",
    likelyPercentHeader: "Mest sannsynlig (%)",
    pessimisticHeader: "Pessimistisk (%)",
    assumptionsAdd: "Legg til forutsetning",
    assumptionsAddShort: "Legg til",
    assumptionsLabel: "Forutsetninger",
    assumptionsNoneDefined: "Ingen definert",
    assumptionsShow: "Vis",
    assumptionsHide: "Skjul",
    assumptionsPlaceholder: "Skriv en forutsetning...",
    assumptionsRemove: "Fjern forutsetning",
    assumptionsSave: "Lagre forutsetning",
    driverLikelyOutsideSpan:
      "Feil i «{driverName}»: Optimistisk verdi må være lavere enn eller lik mest sannsynlig, og pessimistisk verdi må være høyere enn eller lik mest sannsynlig.",
    driverCalibratedSupportInvalid:
      "Spennet for «{driverName}» går for langt mot nedsiden. Sett den optimistiske verdien nærmere mest sannsynlig.",
    driverImpactHelp:
      "Angir hvor stor del av hver drivers utslag som påvirker den enkelte kostnadsposten.",
    driverImpactEmpty:
      "Legg inn minst én gyldig kostnadspost og én gyldig driver for å redigere påvirkning.",
    driverImpactCorner: "Driver / kost",
    driverImpactCellLabel: "{driver} → {cost}",
    driverImpactSelectHint: "Velg en driver for å justere påvirkning.",
    costCorrelationTestHint: "Midlertidig testpanel for korrelasjon",
    costCorrelationPair: "{a} — {b}",
    costCorrelationEmpty: "Legg inn minst to gyldige kostnadsposter for å redigere korrelasjon.",
    costCorrelationUnnamed: "Kost {n}",
    costCorrelationWarningRepaired:
      "Siste simulering: korrelasjonsmatrisen var ugyldig og ble justert (PSD-reparasjon).",
    costCorrelationWarningFallback:
      "Siste simulering: korrelasjonsmatrisen kunne ikke brukes; uavhengig sampling ble brukt i stedet.",
    costCorrelationCellLabel: "{selected} ↔ {other}",
    costCorrelationSelectHint: "Velg minst to kostnadsposter.",
    costCorrelationSelectedCount: "{count} valgt",
    costCorrelationApply: "Bruk",
    costCorrelationSaved: "Korrelasjon lagret",
    costCorrelationRemoved: "Korrelasjon fjernet",
    costCorrelationRemove: "Fjern korrelasjon",
    costCorrelationCostItemsWord: "kostnadsposter",
    costCorrelationOpenSummary: "Rediger korrelasjon {summary}",
    costCorrelationToggleRow: "Velg kostnadspost {cost} for korrelasjon",
    costCorrelationIncompatibleEdit:
      "Denne korrelasjonen er ikke mulig sammen med de øvrige korrelasjonene.",
    defineSelectHint: "Velg en rad for å dokumentere den.",
    defineSelectHintReadOnly: "Velg en rad for å vise detaljer.",
    defineDescriptionLabel: "Beskrivelse",
    defineCostDescriptionPlaceholder: "Hva inngår i kostnadsposten?",
    defineDriverDescriptionPlaceholder: "Hva innebærer driveren?",
    defineSave: "Lagre beskrivelse",
    defineViewDetails: "Vis detaljer",
    defineDefinedIndicator: "Har dokumentasjon",
    guidedDefinitionLabel: "Definisjon",
    guidedPrevious: "Forrige",
    guidedNext: "Neste",
    guidedFinish: "Ferdig",
    guidedClose: "Lukk",
    guidedFocusMode: "Fokusmodus",
    openFocusMode: "Åpne Fokusmodus",
    guidedExitFocusMode: "Avslutt Fokusmodus",
    focusIntroTitle: "Fokusmodus",
    focusIntroBody:
      "Gå gjennom analysen steg for steg – fra prosjektgrunnlag og usikkerheter til simulering og resultater.",
    focusOverviewPhase1: "Prosjekt og forutsetninger",
    focusOverviewPhase2: "Kostnader og usikkerhet",
    focusOverviewPhase3: "Simulering",
    focusOverviewPhase4: "Resultater",
    focusBackToInput: "Tilbake til input",
    focusSessionExit: "Avslutt",
    focusPhaseNavLabel: "Analysefaser",
    focusPhaseProject: "Prosjekt",
    focusPhaseCosts: "Kostnader",
    focusPhaseDrivers: "Drivere",
    focusPhaseSimulation: "Simulering",
    focusPhaseResults: "Resultater",
    focusNextStepsTitle: "Neste steg",
    focusNextStepsBody: "Velg hvordan du vil arbeide videre med analysen eller bruke resultatene.",
    focusResultsContext: "Resultat",
    focusNextStepsHelpMeaning:
      "Her kan du arbeide videre med analysen eller bruke resultatene i rapportering, deling og videre vurdering.",
    focusReviewInput: "Se gjennom input",
    focusReviewInputHelper: "Gå tilbake til analysegrunnlaget og gjør eventuelle justeringer.",
    focusContinueWorkingHeading: "Fortsett arbeidet",
    focusUseResultsHeading: "Bruk resultatene",
    focusArchiveCheckpoint: "Arkiver sjekkpunkt",
    focusArchiveCheckpointHelper: "Frys dagens analyse som et historisk sjekkpunkt.",
    focusDownloadPdfHelper: "Lag en rapport av analysen.",
    focusShareLinkTitle: "Del lenke",
    focusShareLinkHelper: "Del analysegrunnlaget med andre.",
    focusAiBriefTitle: "KI-brief",
    focusAiBriefHelper: "Bruk analysegrunnlaget og resultatene til videre KI-tolkning.",
    guidedEmpty: "Ingen faktorer å gjennomgå. Legg inn rader i tabellen først.",
    guidedUnnamed: "Uten navn",
    guidedP10: "P10",
    guidedMostLikely: "Mest sannsynlig",
    guidedP90: "P90",
    guidedDriverEffectHint: "Isolert kostnadseffekt av denne driveren relativt til 0 % (nøytral).",
    guidedPhaseFocusIntro: "Fokusmodus",
    guidedPhaseProjectProfile: "Prosjektprofil",
    guidedPhaseAssumptions: "Forutsetninger",
    guidedPhaseIncurred: "Påløpte kostnader",
    guidedPhaseEstimateUncertainty: "Estimatusikkerhet",
    guidedPhaseCost: "Kostnadsposter",
    guidedPhaseCorrelation: "Korrelasjon",
    guidedPhaseDrivers: "Drivere",
    guidedPhaseImpact: "Påvirkning",
    guidedPhaseFinish: "Ferdig",
    guidedPhaseSimulation: "Simulering",
    guidedHelpMeaningLabel: "Hva betyr dette?",
    guidedHelpDiscussLabel: "Hva bør dere diskutere?",
    guidedHelpAvoidLabel: "Unngå",
    guidedAssumptionsGuidance: "Hva legger dere til grunn for vurderingene?",
    guidedAssumptionsSecondaryGuidance:
      "Noter premisser som gjelder for analysen. Hvis et forhold faktisk kan variere og påvirke kostnaden, bør dere vurdere om det heller hører hjemme som estimatusikkerhet eller driver.",
    guidedAssumptionsExamples:
      "Eksempler kan være valgt standard, gjennomføringsform, prisnivå eller hvilket omfang som er lagt til grunn.",
    guidedAssumptionsEmpty:
      "Ingen forutsetninger er lagt inn ennå. Du kan legge til en, eller gå videre.",
    guidedAssumptionsAdd: "Legg til forutsetning",
    guidedAssumptionsHelpTitle: "Forutsetninger",
    guidedAssumptionsHelpMeaning:
      "Forutsetninger beskriver premissene analysen bygger på. De sier hva dere legger til grunn når kostnader og usikkerhet vurderes.\n\nEksempler kan være valgt standard eller kvalitet, gjennomføringsform, prisnivå, fremdriftsforutsetninger eller hvilket omfang som er inkludert.",
    guidedAssumptionsHelpDiscuss:
      "Spør hva som må være sant for at kostnadsgrunnlaget og vurderingene deres skal være gyldige. Noter premisser som er viktige for å forstå analysen senere.",
    guidedAssumptionsHelpAvoid:
      "Ikke bruk forutsetninger som et sted å parkere reell usikkerhet. Hvis et forhold faktisk kan variere og påvirke kostnaden, bør det vurderes som estimatusikkerhet i en kostnadspost eller som en driver.",
    guidedIncurredGuidance:
      "Hvor mye av prosjektkostnaden er allerede påløpt? Påløpte kostnader behandles som kjente kostnader og inngår ikke i usikkerhetsspennet for gjenstående kostnader.",
    guidedIncurredSecondaryGuidance:
      "Jo større andel som allerede er påløpt, desto mindre av total kostnad gjenstår å være usikker.",
    guidedIncurredValueLabel: "Påløpte kostnader",
    guidedEstimateUncertaintyConceptBasis:
      "Analysen tar utgangspunkt i et kostnadsgrunnlag, for eksempel en kalkyle, prisdatabase, modell, mengder eller andre etablerte estimater.",
    guidedEstimateUncertaintyConceptGrouping:
      "Kostnadene grupperes i kostnadsposter på et nivå der de er meningsfulle å vurdere hver for seg. For grov gruppering kan skjule viktige forskjeller, mens for detaljert gruppering kan gjøre vurderingen unødvendig tung.",
    guidedEstimateUncertaintyConceptLikely:
      "For hver kostnadspost angis en mest sannsynlig verdi. Dette er kostnaden dere mener posten mest sannsynlig vil få, gitt dagens kunnskap og forutsetningene analysen bygger på.",
    guidedEstimateUncertaintyConceptUncertainty:
      "Estimatusikkerheten beskriver hvor mye den enkelte kostnadsposten realistisk kan avvike fra mest sannsynlig verdi. Usikkerheten ligger ofte i mengde, pris eller begge deler, og beskrives med P10 og P90.",
    guidedEstimateUncertaintyConceptNext:
      "I neste steg går dere gjennom kostnadspostene én for én og vurderer mest sannsynlig verdi og et realistisk spenn.",
    guidedCostLikelyPrompt: "Hva mener dere er mest sannsynlig kostnad gitt det dere vet i dag?",
    guidedCostRangeSourcePrompt:
      "Hva er usikkert i denne posten – mengden, prisen eller begge deler?",
    guidedCostRangePrompt: "Hva kan realistisk trekke kostnaden ned eller opp fra mest sannsynlig?",
    guidedCostRangeReminder: "Velg et realistisk spenn – ikke beste og verste tenkelige utfall.",
    guidedEstimateUncertaintyHelpTitle: "Estimatusikkerhet",
    guidedEstimateUncertaintyHelpMeaning:
      "Estimatusikkerhet er usikkerheten i kostnadsestimatet for den enkelte kostnadsposten. Den skyldes ofte usikkerhet i mengde, pris eller begge deler. For hver kostnadspost beskrives dette med P10, mest sannsynlig verdi og P90, gitt forutsetningene analysen bygger på.\n\nEksempel: Mengden kan være usikker fordi omfanget ikke er fullt avklart, mens prisen kan være usikker fordi prisgrunnlaget eller markedet er usikkert.",
    guidedEstimateUncertaintyHelpDiscuss:
      "Vurder først hva som er usikkert i kostnadsposten: mengden, prisen eller begge deler. Diskuter deretter hva som realistisk kan trekke akkurat denne posten ned eller opp fra mest sannsynlig verdi.\n\nVurder også om noe av usikkerheten allerede er fanget opp som en driver.\n\nSkillet mot drivere er viktig: estimatusikkerhet gjelder usikkerheten i den enkelte kostnadsposten, mens drivere beskriver forhold som kan påvirke flere kostnadsposter samtidig.",
    guidedEstimateUncertaintyHelpAvoid:
      "Unngå ekstreme beste- og verstefallsscenarioer. Unngå også å legge den samme usikkerheten både i kostnadspostens P10–P90-spenn og som driver.",
    guidedDriversIntroMeaning:
      "Drivere beskriver usikre forhold som kan påvirke flere kostnadsposter samtidig, for eksempel marked, prosjektutvikling, stedlige forhold eller interessenter.",
    guidedDriversIntroDistinction:
      "De skiller seg fra estimatusikkerhet, som gjelder usikkerheten i den enkelte kostnadsposten. En driver bør derfor brukes når et forhold virker på tvers av kostnadsgrunnlaget, og ikke bare på én post.",
    guidedDriversIntroAvoidDouble:
      "Unngå å modellere samme usikkerhet både i spennene på kostnadspostene og som driver. Først vurderer dere selve driveren og et realistisk spenn. Senere går dere gjennom hvilke kostnadsposter den faktisk påvirker.",
    guidedDriversIntroNext: "I neste steg går dere gjennom driverne én for én.",
    guidedDriverUncertaintyNotesHeading: "Usikkerhetsvurdering",
    guidedDriverUncertaintyNotesHelper:
      "Noter kort hvilke forhold som kan bidra til et lavere eller høyere kostnadsutfall. Dette dokumenterer vurderingen og påvirker ikke tallene.",
    guidedDriverUncertaintyLowerPercentile: "P10",
    guidedDriverUncertaintyLowerPrompt: "Forhold som kan gi et lavere kostnadsutfall",
    guidedDriverUncertaintyHigherPercentile: "P90",
    guidedDriverUncertaintyHigherPrompt: "Forhold som kan gi et høyere kostnadsutfall",
    guidedDriverUncertaintyNoteAdd: "Legg til",
    guidedDriverUncertaintyNoteConfirm: "Legg til punkt",
    guidedDriverUncertaintyNotePlaceholder: "Skriv et kort punkt…",
    guidedDriverUncertaintyNotePlaceholderLower:
      "Beskriv et forhold som kan gi lavere kostnadsutfall",
    guidedDriverUncertaintyNotePlaceholderHigher:
      "Beskriv et forhold som kan gi høyere kostnadsutfall",
    guidedDriverUncertaintyNoteRemove: "Fjern punkt",
    guidedDriverRangePrompt:
      "Hvilket spenn beskriver realistisk hvordan denne driveren kan slå ut?",
    guidedDriverOutsideWorkingRange: "Utenfor normalområdet",
    guidedDriverSupportInvalid:
      "Spennet går for langt mot nedsiden til å kunne simuleres. Flytt P10 nærmere mest sannsynlig verdi.",
    guidedDriverOrderInvalid:
      "P10 må være lavere enn eller lik mest sannsynlig, og P90 høyere enn eller lik mest sannsynlig.",
    guidedDriverHelpTitle: "Drivere",
    guidedDriverHelpMeaning:
      "Drivere beskriver usikre forhold som kan påvirke flere kostnadsposter samtidig, for eksempel marked, prosjektutvikling, stedlige forhold eller interessenter.",
    guidedDriverHelpDiscuss:
      "Spør gruppen hvilke overordnede forhold som kan flytte kostnadsbildet, og om virkningen allerede er tatt inn i estimatusikkerheten på kostnadspostene.",
    guidedDriverHelpAvoid:
      "Unngå å bruke en driver til å modellere den samme usikkerheten som allerede ligger i P10–P90-spennet på kostnadspostene.",
    guidedCorrelationGuidance:
      "Er det kostnadsposter som faktisk har en tendens til å bli høye eller lave samtidig?",
    guidedCorrelationSecondaryGuidance:
      "Bruk korrelasjon bare når det finnes en reell sammenheng mellom postene – ikke bare fordi de tilhører samme fag eller prosjekt.",
    guidedCorrelationNone: "Det er ikke lagt inn korrelasjon mellom kostnadspostene.",
    guidedCorrelationSelectedHeading: "Valgte korrelasjoner",
    guidedCorrelationHelpTitle: "Korrelasjon",
    guidedCorrelationHelpMeaning:
      "Korrelasjon brukes når usikkerheten i to kostnadsposter ikke er uavhengig, men har en reell tendens til å bevege seg i samme eller motsatt retning.",
    guidedCorrelationHelpDiscuss:
      "Diskuter hva som faktisk skaper denne sammenhengen. Hvis gruppen ikke kan forklare hvorfor postene bør variere sammen, er det ofte bedre å la dem være ukorrelerte.",
    guidedCorrelationHelpAvoid:
      "Unngå å legge inn korrelasjon bare fordi kostnadspostene ligner på hverandre, ligger i samme fag eller påvirkes av prosjektet generelt.",
    guidedLooksRight: "Ser riktig ut",
    guidedAdjustCorrelation: "Tilpass korrelasjon",
    guidedImpactGuidance: "Treffer denne driveren alle kostnadspostene like mye?",
    guidedImpactSecondaryGuidance:
      "Vurder om enkelte poster påvirkes mindre – eller ikke i det hele tatt.",
    guidedImpactDefaultAll: "Alle drivere bruker standard påvirkning på 100 %.",
    guidedImpactAdjustedHeading: "Tilpasset påvirkning",
    guidedImpactHelpTitle: "Påvirkning",
    guidedImpactHelpMeaning:
      "Påvirkning beskriver hvor sterkt en driver virker på den enkelte kostnadsposten. 100 % betyr full virkning etter modellens standard, mens en lavere verdi reduserer virkningen og 0 % betyr at driveren ikke påvirker posten.",
    guidedImpactHelpDiscuss:
      "Diskuter hvilke deler av kostnadsgrunnlaget driveren faktisk treffer. En bred driver kan påvirke mange poster, mens andre forhold bare virker på enkelte fag eller kostnader.",
    guidedImpactHelpAvoid:
      "Unngå å la alle drivere påvirke alle kostnadsposter 100 % uten å vurdere om sammenhengen faktisk finnes.",
    guidedAdjustImpact: "Tilpass påvirkning",
    guidedFinishBody:
      "Gjennomgangen er ferdig. Du kan nå gå tilbake til tabellene eller kjøre simuleringen når inputen er klar.",
    guidedFinishDone: "Lukk",
    guidedSimulationBodyNoResults:
      "Når inputen er klar, kjør simuleringen for å beregne resultatene.",
    guidedSimulationBodyValid:
      "Resultater er klare. Du kan gå videre, eller kjøre simuleringen på nytt.",
    guidedSimulationRunAgain: "Kjør på nytt",
    guidedReturnToReview: "Tilbake til veiledet gjennomgang",
    guidedCostsEmptyHeading: "Ingen kostnadsposter ennå",
    guidedCostsEmptyGuidance:
      "Før vi kan vurdere usikkerheten, må analysen ha et kostnadsgrunnlag. Legg inn kostnadspostene du ønsker å analysere. Det holder å legge inn navn og mest sannsynlig kostnad nå – usikkerhetsspennet går vi gjennom sammen etterpå.",
    guidedCostsEmptyAdd: "Legg til kostnadsposter",
    guidedDriversEmptyHeading: "Ingen drivere er lagt inn",
    guidedDriversEmptyGuidance:
      "Drivere brukes for usikkerheter som påvirker flere kostnadsposter samtidig, for eksempel marked, fremdrift eller prosjektgjennomføring. Hvis slike forhold er relevante, kan du legge dem inn nå og vurdere spennet i neste steg.",
    guidedDriversEmptyAdd: "Legg til drivere",
    guidedDriversEmptyContinue: "Fortsett uten drivere",
  },
  checkpoints: {
    region: "Analysepunkter",
    tablist: "Velg analysepunkt",
    statusArchived: "Arkivert",
    statusActive: "Aktiv",
    sequenceLabel: "Checkpoint {n}",
    nextAction: "Neste checkpoint",
    nextDialogTitle: "Checkpoint {n}",
    nextNameLabel: "Navn / beslutningspunkt",
    nextNamePlaceholder: "Checkpoint {n}",
    nextCreatedFrom: "Opprettes med utgangspunkt i Checkpoint {n}.",
    nextCreate: "Opprett",
    archiveCheckpointAction: "Arkiver checkpoint",
    archiveCheckpointConfirm:
      "Checkpointet blir låst med dagens input og resultater. Du kan fortsette i et nytt checkpoint.",
    archiveCheckpointConfirmAction: "Arkiver",
    deleteCheckpointAction: "Slett sjekkpunkt",
    deleteCheckpointConfirmTitle: "Slette dette sjekkpunktet?",
    deleteCheckpointConfirm:
      "Endringer og resultater i dette sjekkpunktet går tapt. Tidligere arkiverte sjekkpunkter påvirkes ikke.",
    deleteCheckpointConfirmAction: "Slett sjekkpunkt",
    archiveAndCreateNextAction: "Arkiver og opprett neste checkpoint",
    archiveAndCreateNextHelper: "Lås dette checkpointet og fortsett med neste i tidslinjen.",
    archiveAndCreateNextHeading: "Neste checkpoint",
    developmentTitle: "UTVIKLING",
    developmentHelper:
      "Viser hvordan kostnadsnivå og usikkerhet har utviklet seg mellom sjekkpunktene.",
    developmentEmpty:
      "Utviklingsvisning blir tilgjengelig når analysen har resultater over ett eller flere sjekkpunkter.",
    developmentBandLegend: "P50–P85",
    finishOngoingAction: "Avslutt løpende analyse",
    finishOngoingConfirmTitle: "Avslutt løpende analyse?",
    finishOngoingConfirm:
      "Analysen blir arkivert og kan fortsatt åpnes og gjennomgås, men det kan ikke opprettes flere sjekkpunkter.",
    finishOngoingConfirmAction: "Avslutt og arkiver",
    finishOngoingNeedArchiveCheckpoint: "Arkiver gjeldende sjekkpunkt før analysen avsluttes.",
    finishOngoingFailed: "Kunne ikke avslutte analysen. Prøv igjen.",
    finishOngoingHeading: "Avslutt analyse",
    finishOngoingHelper: "Arkiver hele den løpende analysen når siste sjekkpunkt er ferdig.",
    limitReached: "Maks antall checkpoints er nådd i denne prototypen.",
    comparisonHeading: "Endring siden forrige checkpoint",
    comparisonBaselineTitle: "Første checkpoint",
    comparisonBaselineBody: "Dette danner utgangspunktet for senere sammenligninger.",
    comparisonBaselineContext: "Første checkpoint – utgangspunkt for senere sammenligninger.",
    comparisonComparedWith: "Sammenlignes med {label}",
    comparisonColMetric: "Nøkkeltall",
    comparisonColPrevious: "Forrige",
    comparisonColCurrent: "Nå",
    comparisonColChange: "Endring",
    comparisonMetricP50: "P50",
    comparisonMetricP85: "P85",
    comparisonNoStructural: "Ingen strukturelle endringer i input.",
  },
  projects: {
    noticeWordRed: "rødt",
    noticeWordGreen: "Grønne",
    languageGroup: "Språk",
    inputColumnLabel: "INPUT",
    resultsColumnLabel: "OUTPUT",
    tabsRegion: "Prosjektfaner",
    simulationStripRegion: "Simulering",
    selectProjectTablist: "Velg prosjekt",
    projectNameInputLabel: "Prosjektnavn",
    incurredCosts: "Påløpte kostnader",
    incurredCostsTooltip:
      "Påløpte kostnader er allerede brukte og kjente kostnader. De legges til som et fast beløp i prosjektets kostnadsnivå, men bidrar ikke til usikkerhet i analysen.",
    incurredCostsInputLabel: "Påløpte kostnader",
    projectNameTitleHintSuffix: "(dobbeltklikk for å endre navn)",
    deleteProject: "Slett alternativ",
    addProject: "Nytt alternativ",
    addAlternativeTitle: "Legg til alternativ",
    newAlternative: "Nytt alternativ",
    newAlternativeHint: "Start med et tomt alternativ",
    copyExisting: "Kopier eksisterende",
    copyExistingHint: "Bruk et eksisterende alternativ som utgangspunkt",
    copyFrom: "Kopier fra",
    maxProjectsTooltip: "Maks {max} alternativer i denne versjonen",
    addProjectTooltip: "Opprett et nytt alternativ for sammenligning.",
    confirmDelete: "Er du sikker på at du vil slette dette alternativet?",
    runningSimulation: "Kjører simulering",
    simulationPhasePreparing: "Forbereder…",
    simulationPhaseRunning: "Kjører simulering…",
    simulationPhaseUpdating: "Oppdaterer resultater…",
    invalidInputForRun: "Fullfør feltene markert i rødt før du simulerer.",
    emptyCostBasisForRun:
      "Legg inn minst én kostnadspost med verdi og gyldig spenn før du simulerer.",
    staleInputsTitle: "Input er endret",
    staleInputsNotice:
      "Resultatene er basert på tidligere input. Kjør simuleringen på nytt for å oppdatere resultatene.",
    staleInputsNoticeWithChanges:
      "Resultatene er basert på tidligere input. Grønne felt viser hva som er endret.",
    showInputChanges: "Vis endringer",
    hideInputChanges: "Skjul endringer",
    revertInputChanges: "Angre endringene",
    workerError: "Feil i worker.",
  },
  header: {
    navMethodGuide: "Metodeguide",
    navAbout: "Om modellen",
    signOut: "Logg ut",
    signOutConfirmMessage:
      "Ved utlogging kan innholdet i denne økten gå tapt. Hvis du vil fortsette senere, bør du lagre en lenke eller laste ned rapporten før du logger ut. Har du bare lagt inn input, må du simulere først for å kunne opprette lenke eller rapport. Vil du fortsette?",
    navLabel: "Snarveier og språk",
  },
  auth: {
    title: "Logg inn",
    helper: "Skriv inn passordet for å åpne appen.",
    passwordLabel: "Passord",
    passwordPlaceholder: "Skriv inn passord",
    continue: "Logg inn",
    incorrectPassword: "Feil passord",
  },
  aboutModel: {
    title: "Om modellen",
    paragraph1:
      "Analysen bruker Monte Carlo-simulering med {count} kjøringer per prosjekt. For kostnadsposter og drivere angis P10, mest sannsynlig verdi og P90. Disse brukes til å kalibrere {distributions} som det trekkes fra i simuleringen. Påløpte kostnader behandles som kjente kostnader og legges direkte til de simulerte kostnadene.",
    paragraph2:
      "Kostnadsposter kan modelleres med korrelasjon når det er en faglig begrunnet sammenheng mellom dem. Korrelasjonen håndteres ved å skape avhengige trekk mellom de aktuelle kostnadspostene, mens hver posts egen sannsynlighetsfordeling beholdes. Drivere modelleres separat og virker multiplikativt på kostnadspostene de påvirker. Påvirkningen kan justeres per kostnadspost, slik at en driver kan ha full, redusert eller ingen effekt på ulike deler av kostnadsgrunnlaget.",
    paragraph3:
      "P50 og P85 beregnes fra fordelingen av simulerte totalkostnader. Tornadodiagrammet er en deterministisk sensitivitetsanalyse: én kostnadspost eller driver varieres fra P10 til P90 om gangen, mens øvrige faktorer holdes på mest sannsynlig verdi. Bidragsanalysen bruker Shapley-basert dekomponering til å fordele bidrag til forventet tillegg og usikkerhetsavsetning mellom kostnadsposter og drivere.",
    paragraph4:
      "Modellen er en forenkling av virkeligheten. Resultatene avhenger av kvaliteten på kostnadsgrunnlaget, valgte spenn, forutsetninger, korrelasjoner og vurderingen av hvordan driverne påvirker kostnadspostene. Resultatene bør derfor brukes som beslutningsstøtte og som grunnlag for faglig refleksjon, ikke som en fasit.",
    closeDialog: "Lukk",
  },
  methodGuide: {
    title: "Metodeguide",
    introLead:
      "Analysen bygges opp steg for steg fra prosjektets rammer og kostnadsgrunnlag til vurdering av usikkerhet, drivere og resultater.",
    introGuideBefore: "Du kan arbeide direkte i analysen eller bruke",
    introGuideName: "Fokusmodus",
    introGuideAfter: "for å gå gjennom analysen steg for steg.",
    guideTipBefore: "Bruk",
    guideTipName: "Fokusmodus",
    guideTipAfter: "hvis du ønsker stegvis støtte til å strukturere vurderingene.",
    analysisModesHeading: "Enkeltanalyse eller løpende analyse?",
    analysisModesText:
      "Velg Enkeltanalyse når du vil vurdere prosjektets kostnadsusikkerhet på ett bestemt tidspunkt, eller sammenligne alternative konsepter eller løsninger. Velg Løpende analyse når du vil følge hvordan kostnadsbildet og usikkerheten utvikler seg over tid. I en løpende analyse representerer hvert sjekkpunkt analysen på et bestemt tidspunkt. Når et sjekkpunkt arkiveres, fryses resultatene slik at de kan sammenlignes med senere sjekkpunkter.",
    projectProfileHeading: "Prosjektprofil",
    projectProfileText:
      "Start med Prosjektprofil. Beskriv prosjektets viktigste kjennetegn og kontekst, og fyll inn relevant informasjon som er kjent på analysetidspunktet. Prosjektprofilen gir kontekst for å forstå kostnadsgrunnlag, forutsetninger og usikkerhet. Den er primært beskrivende og endrer ikke beregningene i simuleringen direkte, men hjelper med å dokumentere hva slags prosjekt analysen gjelder og i hvilken kontekst resultatene bør tolkes.",
    costBasisHeading: "Kostnadsgrunnlag",
    costBasisText:
      "Ta utgangspunkt i et tydelig kostnadsgrunnlag, for eksempel kalkyle, prisdatabase, modell, mengder eller andre etablerte estimater. Legg inn det som faktisk prises i prosjektet. Kostnadsgrunnlaget bør være konsistent med Prosjektprofil og dokumenterte forutsetninger.",
    assumptionsHeading: "Forutsetninger",
    assumptionsText:
      "Bruk Forutsetninger til å dokumentere hva kostnadsgrunnlaget og analysen faktisk bygger på – for eksempel hva som er inkludert og ekskludert, valgt løsning, standard eller kvalitetsnivå, prosjektgrenser, fremdriftsforutsetninger, kontrakts-, leveranse- eller gjennomføringsmodell, og forhold som ennå ikke er avklart, men som estimatet likevel legger til grunn. En annen person skal kunne forstå premissene analysen er laget under. Skill tydelig mellom forutsetning og usikkerhet: hvis et forhold faktisk kan variere og påvirke kostnaden, bør det normalt representeres i kostnadspostenes usikkerhetsspenn eller som en driver – ikke bare skrives ned som en forutsetning og dermed stå utenfor den kvantitative analysen. Når en vesentlig forutsetning endres, vurder om kostnadsposter, spenn eller drivere også bør endres.",
    incurredCostsHeading: "Påløpte kostnader",
    incurredCostsText:
      "Skill mellom kostnader som allerede er påløpt og kostnader som gjenstår. Påløpte kostnader behandles som kjente kostnader og får ikke usikkerhetsspenn som del av usikkerheten i gjenstående kostnader.",
    costItemsHeading: "Kostnadsposter",
    costItemsText:
      "Velg en meningsfull oppdeling av kostnadspostene: samle det som naturlig hører sammen, men behold et nivå der usikkerheten kan vurderes faglig. Unngå poster som er så brede at de skjuler vesentlig ulik usikkerhet, og unngå overlapp og dobbelttelling. For hver kostnadspost angis «Mest sannsynlig» som et absolutt beløp.",
    rangesHeading: "Usikkerhetsspenn",
    rangesText:
      "Estimatusikkerhet beskriver hvor mye den enkelte kostnadsposten realistisk kan avvike fra mest sannsynlig verdi. Usikkerheten kan ligge i mengde, pris eller begge deler. P10 og P90 angis som prosentvise avvik rundt mest sannsynlig verdi og skal beskrive realistiske lave og høye utfall – ikke beste og verste tenkelige utfall. Omtrent 80 % av utfallene ligger mellom P10 og P90.",
    driversHeading: "Drivere",
    driversText:
      "Drivere beskriver forhold som kan påvirke flere kostnadsposter samtidig, for eksempel marked, prosjektutvikling, stedlige forhold eller interessenter. De bør representere faktorer som kan rokke ved forutsetningene i estimatet. Unngå å modellere den samme usikkerheten både i kostnadspostenes spenn og som driver.",
    impactHeading: "Driverpåvirkning",
    impactText:
      "Vurder hvilke kostnadsposter den enkelte driver faktisk påvirker. Bred eller standard påvirkning kan være riktig når effekten faktisk er bred. Reduser eller fjern påvirkning der sammenhengen er svak eller ikke finnes.",
    correlationHeading: "Korrelasjon",
    correlationText:
      "Bruk korrelasjon når kostnadsposter har en reell tendens til å bevege seg sammen. Ikke legg inn korrelasjon bare fordi postene tilhører samme prosjekt eller samme fagområde. Korrelasjon bør ha en klar faglig begrunnelse.",
    runAnalysisHeading: "Kjør analysen",
    runAnalysisText:
      "Når kostnadsgrunnlag, forutsetninger, kostnadsposter, spenn, drivere, påvirkning og eventuell korrelasjon er på plass, kjør simuleringen for å beregne resultater. Se gjennom nøkkeltall, S-kurve og øvrige resultater før du trekker konklusjoner.",
    interpretationHeading: "Tolk resultatene",
    interpretationText:
      "Resultatene er beslutningsstøtte og grunnlag for refleksjon – ikke et fasitsvar. Hvis analysen gir et overraskende lavt eller høyt utslag, gå tilbake til analysegrunnlaget. Vurder spesielt spenn, drivere, driverpåvirkning, korrelasjoner og sentrale forutsetninger. Et uventet resultat kan bety at noe viktig er avdekket, eller at en vurdering i input bør sees på nytt.",
    workingApproachHeading: "Oppdater over tid",
    workingApproachText:
      "Behandle analysen som et arbeidsverktøy. Når forutsetninger blir klarere, estimatet modnes eller ny informasjon kommer til, bør analysen oppdateres og kjøres på nytt.",
    perspectivesTipHeading: "Tips",
    perspectivesTipText:
      "Analysen kan gjennomføres av én person, men relevante faglige perspektiver kan styrke kvaliteten på vurderingene. De som deltar bør kjenne prosjektet og forutsetningene godt nok til å gjøre meningsfulle vurderinger.",
    closeDialog: "Lukk",
  },
  resultPreferences: {
    open: "Resultatvisning",
    title: "Resultatvisning",
    close: "Lukk",
    keyFiguresHeading: "Nøkkeltall",
    showBaseCost: "Basiskostnad",
    showExpectedValue: "Forventningsverdi",
    showExpectedAddition: "Forventet tillegg",
    showUncertaintyReserve: "Usikkerhetsavsetning",
    showStdDev: "Standardavvik",
    showProbabilityAtBaseCost: "Sannsynlighet ved basiskostnad",
    showProbabilityBelowCostLevel: "Sannsynlighet under kostnadsnivå",
    probabilityBelowAmount: "Beløp",
    probabilityBelowAmountInvalid: "Angi et gyldig beløp",
    percentilesHeading: "Percentiler",
    addPercentile: "+ Legg til percentil",
    percentileInput: "Percentil",
    sCurveHeading: "S-kurve",
    useSamePercentiles: "Bruk samme percentiler som i nøkkeltall",
    saveAsDefault: "Lagre som standard på denne enheten",
    reset: "Tilbakestill",
    saved: "Lagret som standard på denne enheten.",
    compactDerivedMetricsDeferred:
      "Nye percentiler og sannsynlighet under kostnadsnivå oppdateres ved ny simulering. Synlighet og S-kurvevisning gjelder med en gang.",
  },
  library: {
    title: "Analyser",
    goToHome: "Gå til start",
    welcomeBack: "Velkommen tilbake",
    viewAllAnalyses: "Se alle analyser",
    allAnalyses: "Alle analyser",
    recent: "Nylige",
    showFilterLabel: "Filtrer analyser",
    filterShowAll: "Alle",
    filterShowDrafts: "Utkast",
    filterShowArchived: "Arkiverte",
    sortAnalysesLabel: "Sorter analyser",
    sortLastModified: "Sist endret",
    sortNameAsc: "Navn A–Å",
    sortNameDesc: "Navn Å–A",
    sortRecentlyDeleted: "Slettet sist",
    noDraftsAmongDeleted: "Ingen utkast blant de slettede.",
    noArchivedAmongDeleted: "Ingen arkiverte analyser blant de slettede.",
    noDraftsInFolder: "Ingen utkast i denne mappen.",
    noArchivedInFolder: "Ingen arkiverte analyser i denne mappen.",
    noDrafts: "Ingen utkast.",
    noArchived: "Ingen arkiverte analyser.",
    folders: "Mapper",
    newFolder: "Ny mappe",
    newFolderPrompt: "Mappenavn",
    folderCreatedBody: "Mappen er opprettet.",
    createAnalysis: "Opprett analyse",
    done: "Ferdig",
    newAnalysis: "Ny analyse",
    newAnalysisTitle: "Ny analyse",
    nameLabel: "Navn",
    folderLabel: "Mappe",
    noFolder: "Ingen mappe",
    analysisModeLabel: "Analysemodus",
    analysisModeSingle: "Enkeltanalyse",
    analysisModeSingleHint: "Én analyse av prosjektet på et gitt tidspunkt.",
    analysisModeOngoing: "Løpende analyse",
    analysisModeOngoingHint: "Følg prosjektet gjennom flere analysepunkter over tid.",
    modeOngoingShort: "Løpende",
    modeOngoingTitle: "Løpende analyse",
    create: "Opprett",
    createFailed: "Kunne ikke opprette analysen. Prøv igjen.",
    emptyTitle: "Kom i gang",
    emptyBody: "Opprett din første analyse.",
    statusDraft: "Utkast",
    statusArchived: "Arkivert",
    archivedBadge: "Arkivert",
    open: "Åpne",
    delete: "Slett",
    deleteConfirmTitle: "Slette analysen?",
    deleteConfirm: "Analysen kan gjenopprettes fra Slettede analyser i 30 dager.",
    deleteConfirmAction: "Slett",
    trash: "Slettede analyser",
    trashHeading: "Slettede analyser",
    trashEmpty: "Ingen slettede analyser",
    trashRetentionHint: "Slettede analyser kan gjenopprettes i 30 dager før de slettes permanent.",
    restore: "Gjenopprett",
    deletePermanently: "Slett permanent",
    deletePermanentlyConfirmTitle: "Slette analysen permanent?",
    deletePermanentlyConfirm: "Denne handlingen kan ikke angres.",
    deletePermanentlyConfirmAction: "Slett permanent",
    emptyTrash: "Slett alle permanent",
    emptyTrashConfirmTitle: "Slette alle permanent?",
    emptyTrashConfirm:
      "Alle slettede analyser fjernes permanent. Denne handlingen kan ikke angres.",
    emptyTrashConfirmAction: "Slett alle permanent",
    trashedUnavailable: "Analysen er blant slettede analyser",
    backToLibrary: "Alle analyser",
    archiveAction: "Arkiver analyse",
    archiveConfirm:
      "Analysen blir låst med dagens input og resultater. Den kan ikke redigeres etterpå. Videre arbeid gjøres i en ny versjon.",
    archiveConfirmAction: "Arkiver",
    archiveNeedsSimulation: "Kjør simuleringen før analysen arkiveres.",
    archiveNeedsRerun: "Input er endret. Kjør simuleringen på nytt før analysen arkiveres.",
    archiveNeedsResultSettingsRerun:
      "Kjør simuleringen på nytt for å oppdatere de valgte resultatinnstillingene før arkivering.",
    archiveFailed: "Kunne ikke arkivere. Prøv igjen.",
    duplicateNameInFolder: "Det finnes allerede en analyse med dette navnet i denne mappen.",
    duplicateNameOnMove:
      "Det finnes allerede en analyse med dette navnet i denne mappen. Gi analysen et annet navn før du flytter den.",
    createNewVersion: "Opprett ny versjon",
    startOngoingAnalysis: "Start løpende analyse",
    startOngoingChooseTitle: "Velg alternativ",
    startOngoingChooseHint: "Velg hvilket alternativ du vil følge videre i den løpende analysen.",
    startOngoingNameLabel: "Navn på analyse",
    startOngoingCreate: "Opprett løpende analyse",
    startOngoingFailed: "Kunne ikke starte løpende analyse. Prøv igjen.",
    saving: "Lagrer…",
    saved: "Lagret",
    readOnlyHint: "Arkivert",
    runDisabledArchived: "Opprett en ny versjon for å kjøre simulering",
    ungrouped: "Uten mappe",
    noAnalysesInFilter: "Ingen analyser her ennå.",
    folderEmpty: "Ingen analyser ennå",
    versionSuffix: " (ny versjon)",
    archivedAnalyses: "Arkiverte",
    sidebarLabel: "Analysebibliotek",
    openSidebar: "Åpne analysebibliotek",
    closeSidebar: "Lukk analysebibliotek",
    pinSidebar: "Fest meny",
    unpinSidebar: "Løsne meny",
    analysisActions: "Flere handlinger",
    renameAnalysis: "Endre navn",
    renameTitle: "Endre navn",
    renameFolder: "Endre navn",
    renameFolderTitle: "Endre mappenavn",
    deleteFolder: "Slett",
    deleteFolderConfirmTitle: "Slette mappen?",
    deleteFolderConfirm: "Mappen slettes. Analyser påvirkes ikke.",
    deleteFolderConfirmAction: "Slett",
    folderNotEmpty: "Mappen må være tom før den kan slettes.",
    folderActions: "Mappehandlinger",
    moveAnalysis: "Flytt",
    moveTitle: "Flytt analyse",
    moveConfirm: "Flytt",
    saveError: "Lagring mislyktes",
    saveErrorQuota: "Lagringsplassen i nettleseren er full. Endringene kunne ikke lagres.",
    saveAndContinueLater: "Lagre og fortsett senere",
    saveAndGoToLibrary: "Lagre og gå til analyser",
    resizeList: "Juster listehøyde",
    recentAnalysesHeading: "Nylige analyser",
    archivedAnalysesHeading: "Arkiverte analyser",
  },
  empty: {
    noData: "Ingen data",
    noTornadoData: "Ingen tornado-data for dette alternativet.",
  },
}
