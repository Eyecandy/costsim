import { PRODUCT_NAME } from "@/lib/brand"

export const messages = {
  no: {
    common: {
      example: "Eksempel",
      cancel: "Avbryt",
      confirm: "Bekreft",
      close: "Lukk",
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
      changeWillClearLater:
        "Denne endringen vil fjerne alle senere valg i prosjektprofilen.",
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
      pdfSCurveFootnote:
        "S-kurven viser fordelingen av totale kostnader. {percentiles} er markert.",
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
      pdfCorrelationNone:
        "Det er ikke lagt inn korrelasjon mellom kostnadspostene.",
      pdfCorrelationUnlistedNote:
        "Ikke oppførte sammenhenger behandles som ukorrelerte.",
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
      pdfShareUnavailableNote:
        "Analysen er for stor til å deles som lenke i denne rapporten.",
      pdfFooter: `Generert av ${PRODUCT_NAME}`,
      pdfExportBlockedStaleInputs:
        "Input er endret. Kjør simulering på nytt før du eksporterer PDF.",
      shareLinkBlockedStaleInputs:
        "Input er endret. Kjør simulering på nytt før du oppretter lenke.",
      shareLinkTooLarge:
        "Analysen inneholder for mye data til å deles som lenke. Kort ned beskrivelser eller forutsetninger og prøv igjen.",
      aiBriefBlockedStaleInputs:
        "Input er endret. Kjør simulering på nytt før du oppretter KI-brief.",
      nextStepsHeading: "Eksporter",
      optionsHeading: "Valg",
      actionsHeading: "Del og dokumenter",
      actionsHelperText:
        "Del rapport eller lenke for videre arbeid.",
      copyShareLink: "Kopier lenke",
      shareLinkCopied: "Lenke kopiert",
      aiAnalyzeHeading: "Analyser med KI",
      aiAnalyzeHelper:
        "Lim inn i en KI-tjeneste for tolkning, kvalitetssjekk og forbedringsforslag.",
      copyAiBrief: "Kopier KI-brief",
      aiBriefClipboardPromptNo: `Du er en erfaren rådgiver innen usikkerhetsanalyse og beslutningsstøtte i prosjekter.

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
      aiBriefClipboardPromptOngoingAddendumNo: `Tillegg for løpende analyse:

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
      waterfallStaleInputs:
        "Input er endret. Kjør simulering på nytt før du beregner bidrag.",
      archivedContributionNotStored:
        "Bidragsanalyse ble ikke lagret med dette arkivet.",
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
      addRow: "Legg til rad",
      deleteSelectedRow: "Slett valgt rad",
      clearTableAction: "Tøm",
      clearTableTooltip: "Tøm tabell",
      clearTableConfirm: "Dette vil tømme tabellen.",
      guidanceCostItems:
        "Angi «Mest sannsynlig» som beløpet du mener kostnadsposten mest sannsynlig vil koste. P10 og P90 angis som prosentvise avvik fra dette beløpet og skal beskrive realistiske lave og høye utfall – ikke beste og verste tenkelige utfall. Usikkerheten ligger ofte i mengde, pris eller begge deler. Korrelasjon kan brukes dersom kostnadsposter har en reell tendens til å variere sammen.",
      guidanceCostItemsGuide:
        "Fokusmodus for hjelp til å vurdere og fylle inn kostnadsposter.",
      guidanceCostDrivers:
        "Drivere beskriver usikre forhold som kan påvirke flere kostnadsposter samtidig, for eksempel marked, prosjektutvikling, stedlige forhold eller interessenter. De virker multiplikativt på kostnadspostene de påvirker, og påvirkningen kan justeres per kostnadspost. Unngå å modellere samme usikkerhet både som driver og i spennene på kostnadspostene.",
      guidanceCostDriversGuide:
        "Fokusmodus for hjelp til å identifisere og vurdere drivere.",
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
      costCorrelationEmpty:
        "Legg inn minst to gyldige kostnadsposter for å redigere korrelasjon.",
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
      focusNextStepsBody:
        "Velg hvordan du vil arbeide videre med analysen eller bruke resultatene.",
      focusResultsContext: "Resultat",
      focusNextStepsHelpMeaning:
        "Her kan du arbeide videre med analysen eller bruke resultatene i rapportering, deling og videre vurdering.",
      focusReviewInput: "Se gjennom input",
      focusReviewInputHelper:
        "Gå tilbake til analysegrunnlaget og gjør eventuelle justeringer.",
      focusContinueWorkingHeading: "Fortsett arbeidet",
      focusUseResultsHeading: "Bruk resultatene",
      focusArchiveCheckpoint: "Arkiver sjekkpunkt",
      focusArchiveCheckpointHelper:
        "Frys dagens analyse som et historisk sjekkpunkt.",
      focusDownloadPdfHelper: "Lag en rapport av analysen.",
      focusShareLinkTitle: "Del lenke",
      focusShareLinkHelper: "Del analysegrunnlaget med andre.",
      focusAiBriefTitle: "KI-brief",
      focusAiBriefHelper:
        "Bruk analysegrunnlaget og resultatene til videre KI-tolkning.",
      guidedEmpty: "Ingen faktorer å gjennomgå. Legg inn rader i tabellen først.",
      guidedUnnamed: "Uten navn",
      guidedP10: "P10",
      guidedMostLikely: "Mest sannsynlig",
      guidedP90: "P90",
      guidedDriverEffectHint:
        "Isolert kostnadseffekt av denne driveren relativt til 0 % (nøytral).",
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
      guidedCostLikelyPrompt:
        "Hva mener dere er mest sannsynlig kostnad gitt det dere vet i dag?",
      guidedCostRangeSourcePrompt:
        "Hva er usikkert i denne posten – mengden, prisen eller begge deler?",
      guidedCostRangePrompt:
        "Hva kan realistisk trekke kostnaden ned eller opp fra mest sannsynlig?",
      guidedCostRangeReminder:
        "Velg et realistisk spenn – ikke beste og verste tenkelige utfall.",
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
      guidedDriverUncertaintyLowerPrompt:
        "Forhold som kan gi et lavere kostnadsutfall",
      guidedDriverUncertaintyHigherPercentile: "P90",
      guidedDriverUncertaintyHigherPrompt:
        "Forhold som kan gi et høyere kostnadsutfall",
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
      guidedCorrelationNone:
        "Det er ikke lagt inn korrelasjon mellom kostnadspostene.",
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
      guidedImpactGuidance:
        "Treffer denne driveren alle kostnadspostene like mye?",
      guidedImpactSecondaryGuidance:
        "Vurder om enkelte poster påvirkes mindre – eller ikke i det hele tatt.",
      guidedImpactDefaultAll:
        "Alle drivere bruker standard påvirkning på 100 %.",
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
      archiveAndCreateNextHelper:
        "Lås dette checkpointet og fortsett med neste i tidslinjen.",
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
      finishOngoingNeedArchiveCheckpoint:
        "Arkiver gjeldende sjekkpunkt før analysen avsluttes.",
      finishOngoingFailed: "Kunne ikke avslutte analysen. Prøv igjen.",
      finishOngoingHeading: "Avslutt analyse",
      finishOngoingHelper:
        "Arkiver hele den løpende analysen når siste sjekkpunkt er ferdig.",
      limitReached: "Maks antall checkpoints er nådd i denne prototypen.",
      comparisonHeading: "Endring siden forrige checkpoint",
      comparisonBaselineTitle: "Første checkpoint",
      comparisonBaselineBody:
        "Dette danner utgangspunktet for senere sammenligninger.",
      comparisonBaselineContext:
        "Første checkpoint – utgangspunkt for senere sammenligninger.",
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
      copyExistingHint:
        "Bruk et eksisterende alternativ som utgangspunkt",
      copyFrom: "Kopier fra",
      maxProjectsTooltip: "Maks {max} alternativer i denne versjonen",
      addProjectTooltip:
        "Opprett et nytt alternativ for sammenligning.",
      confirmDelete: "Er du sikker på at du vil slette dette alternativet?",
      runningSimulation: "Kjører simulering",
      simulationPhasePreparing: "Forbereder…",
      simulationPhaseRunning: "Kjører simulering…",
      simulationPhaseUpdating: "Oppdaterer resultater…",
      invalidInputForRun:
        "Fullfør feltene markert i rødt før du simulerer.",
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
      introGuideAfter:
        "for å gå gjennom analysen steg for steg.",
      guideTipBefore: "Bruk",
      guideTipName: "Fokusmodus",
      guideTipAfter:
        "hvis du ønsker stegvis støtte til å strukturere vurderingene.",
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
      analysisModeSingleHint:
        "Én analyse av prosjektet på et gitt tidspunkt.",
      analysisModeOngoing: "Løpende analyse",
      analysisModeOngoingHint:
        "Følg prosjektet gjennom flere analysepunkter over tid.",
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
      deleteConfirm:
        "Analysen kan gjenopprettes fra Slettede analyser i 30 dager.",
      deleteConfirmAction: "Slett",
      trash: "Slettede analyser",
      trashHeading: "Slettede analyser",
      trashEmpty: "Ingen slettede analyser",
      trashRetentionHint:
        "Slettede analyser kan gjenopprettes i 30 dager før de slettes permanent.",
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
      archiveNeedsSimulation:
        "Kjør simuleringen før analysen arkiveres.",
      archiveNeedsRerun:
        "Input er endret. Kjør simuleringen på nytt før analysen arkiveres.",
      archiveNeedsResultSettingsRerun:
        "Kjør simuleringen på nytt for å oppdatere de valgte resultatinnstillingene før arkivering.",
      archiveFailed: "Kunne ikke arkivere. Prøv igjen.",
      duplicateNameInFolder:
        "Det finnes allerede en analyse med dette navnet i denne mappen.",
      duplicateNameOnMove:
        "Det finnes allerede en analyse med dette navnet i denne mappen. Gi analysen et annet navn før du flytter den.",
      createNewVersion: "Opprett ny versjon",
      startOngoingAnalysis: "Start løpende analyse",
      startOngoingChooseTitle: "Velg alternativ",
      startOngoingChooseHint:
        "Velg hvilket alternativ du vil følge videre i den løpende analysen.",
      startOngoingNameLabel: "Navn på analyse",
      startOngoingCreate: "Opprett løpende analyse",
      startOngoingFailed:
        "Kunne ikke starte løpende analyse. Prøv igjen.",
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
      saveErrorQuota:
        "Lagringsplassen i nettleseren er full. Endringene kunne ikke lagres.",
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
  },
  en: {
    common: {
      example: "Example",
      cancel: "Cancel",
      confirm: "Confirm",
      close: "Close",
    },
    buttons: {
      runSimulation: "Run simulation",
      simulating: "Simulating…",
    },
    sections: {
      costElements: "Cost items",
      drivers: "Cost drivers",
    },
    expanders: {
      costElements: "Cost items",
      drivers: "Cost drivers",
      driverImpact: "Impact",
      costCorrelation: "Correlation",
      define: "Define",
      guidedInput: "Focus mode",
    },
    projectProfile: {
      heading: "Project profile",
      collapsedEmptyHint: "Describe the project",
      focusIntro:
        "Choose the options that best describe the project. The profile provides context for the analysis and documents the project basis.",
      sizeHeading: "Size",
      categories: {
        projectArea: "Project area",
        projectType: "Project type",
        interventionTypes: "Intervention type",
        phase: "Primary stage at analysis",
        deliveryModel: "Delivery model",
      },
      options: {
        buildings: "Buildings",
        transport: "Transport",
        energy: "Energy",
        water_wastewater: "Water and wastewater",
        industry: "Industry",
        other: "Other",
        education: "Education",
        healthcare: "Healthcare",
        office: "Office",
        culture_sports: "Culture and sports",
        emergency_defence: "Emergency and defence",
        residential: "Residential",
        road: "Road",
        rail: "Rail",
        tunnel: "Tunnel",
        bridge: "Bridge",
        transport_hub: "Transport hub",
        generation: "Generation",
        grid_transmission: "Grid and transmission",
        substation_transformer: "Substation / transformer",
        energy_storage: "Energy storage",
        water_supply: "Water supply",
        wastewater: "Wastewater",
        pipeline_network: "Pipeline network",
        treatment_plant: "Treatment plant",
        pumping_station: "Pumping station",
        production_facility: "Production facility",
        process_plant: "Process plant",
        warehouse_logistics: "Warehouse and logistics",
        technical_infrastructure: "Technical infrastructure",
        new_facility: "New facility",
        expansion: "Expansion",
        rehabilitation_renewal: "Rehabilitation / renewal",
        modification: "Modification",
        combined: "Combined",
        study: "Study",
        concept: "Concept",
        preliminary_design: "Preliminary design",
        detailed_design: "Detailed design",
        execution: "Execution",
        handover: "Handover",
        not_contracted: "Not decided",
        design_bid_build: "Design-bid-build",
        design_build: "Design-build",
        partnering: "Partnering",
        multiple_contracts: "Multiple / split contracts",
      },
      quantityTypes: {
        gross_floor_area: "Gross floor area",
        length: "Length",
        tunnel_length: "Tunnel length",
        bridge_length: "Bridge length",
        capacity: "Capacity",
      },
      quantityUnits: {
        m2: "m²",
        km: "km",
        m: "m",
        mw: "MW",
      },
      changeWillClearLater:
        "This change will remove all later selections in the project profile.",
      changeWillClearLaterHint: "You can select them again afterwards.",
      confirmChange: "Change",
    },
    helper: {
      resultsKeyMetrics:
        "Summarizes the simulated cost distribution. Percentiles show the cost level that the stated share of simulations falls below.",
      resultsWaterfallFootnote:
        "Shows how expected addition is built from base cost to P50, distributed across cost items and drivers.",
    },
    charts: {
      axisY: "P",
      axisX: "C",
      sCurveTitle: "S-CURVE",
      sCurveSubtitle:
        "Shows the probability that total cost will be below a given level. Greater horizontal spread means greater uncertainty in the cost outcome.",
      attributionTitle: "CONTRIBUTION ANALYSIS",
      attributionSubtitle:
        "Shows how cost items and drivers contribute to the expected addition and uncertainty reserve. Larger contributions mean greater impact on the relevant result.",
      waterfallTitle: "CONTRIBUTIONS TO EXPECTED ADDITION",
      waterfallSubtitle:
        "Shows what builds up the expected addition (P50 minus base cost), distributed across cost items and drivers.",
      reserveWaterfallTitle: "CONTRIBUTIONS TO UNCERTAINTY RESERVE",
      reserveWaterfallSubtitle:
        "Shows what builds up the uncertainty reserve (P85 minus P50), distributed across cost items and drivers.",
      tornadoTitle: "TORNADO",
      tornadoSubtitle:
        "Shows which uncertainties have the greatest impact on the cost result. Longer bars mean greater impact.",
      openLargerView: "Open larger view",
      closeLargerView: "Close larger view",
    },
    results: {
      resultsHeading: "Results",
      keyMetricsTitle: "KEY FIGURES",
      downloadPdf: "Download PDF",
      pdfReportTitle: "Uncertainty analysis",
      pdfOngoingReportKindLabel: "Ongoing uncertainty analysis",
      pdfOngoingCheckpointOverviewTitle: "Checkpoint overview",
      pdfOngoingDevelopmentTitle: "Development",
      pdfOngoingLatestSummaryTitle: "Latest archived checkpoint",
      pdfOngoingCurrentStatusTitle: "Current status",
      pdfOngoingChangeTitle: "Change since previous checkpoint",
      pdfOngoingComparisonTitle: "Comparison with previous checkpoint",
      pdfOngoingHistoryTitle: "Checkpoint history",
      pdfOngoingAssumptionsMethodTitle: "Assumptions / method",
      pdfOngoingAssumptionsTitle: "Assumptions",
      pdfOngoingMethodTitle: "About the analysis method",
      pdfOngoingReportBasisArchivedOnly:
        "Report basis: Archived checkpoints up to and including {cutoffLabel}.",
      pdfOngoingReportBasisWithExcludedDraft:
        "Report basis: Archived checkpoints up to and including {cutoffLabel}. {draftLabel} is active and is not included in the report.",
      pdfOngoingReportMeaning:
        "The report shows how the ongoing uncertainty analysis has developed up to the latest archived checkpoint included in the report basis. Results from each checkpoint are frozen at archiving so development can be compared over time.",
      pdfOngoingAssumptionsContext:
        "The assumptions below apply to {cutoffLabel}, the latest archived checkpoint included in the report.",
      pdfOngoingColSequence: "No.",
      pdfOngoingColName: "Name",
      pdfOngoingColStatus: "Status",
      pdfOngoingColArchivedAt: "Archived",
      pdfOngoingColPrevious: "Previous",
      pdfOngoingColLatest: "Latest",
      pdfOngoingColChange: "Change",
      pdfOngoingStatusArchived: "Archived",
      pdfOngoingStatusDraft: "Draft",
      pdfOngoingColDeltaP50: "Δ P50",
      pdfOngoingLifecycleActive: "Active",
      pdfOngoingLifecycleCompleted: "Completed",
      pdfOngoingEmptyDevelopment: "No archived results to show.",
      pdfOngoingCheckpointContextLabel: "Latest checkpoint",
      pdfOngoingArchivedCountLabel: "Archived checkpoints",
      pdfOngoingPeriodLabel: "Period",
      pdfOngoingExportBlockedNoArchived:
        "Archive at least one checkpoint before exporting an Ongoing analysis PDF.",
      pdfOngoingDraftNotArchivedTitle: "{label} is not archived",
      pdfOngoingDraftExportBody:
        "The report will be based on archived checkpoints up to and including {cutoffLabel}. {draftLabel} must be archived before it can be included in the report.",
      pdfOngoingDraftExportContinue: "Continue",
      pdfOngoingDraftExportCancel: "Cancel",
      pdfBrandName: PRODUCT_NAME,
      pdfGeneratedAtLabel: "Generated",
      pdfResultsSectionLabel: "01  Results",
      pdfContentsTitle: "Contents",
      pdfAnalysisMeta:
        "Cost uncertainty has been analysed using {count} Monte Carlo simulations based on P10, most likely value and P90 for cost items and uncertainty drivers.",
      pdfMetricsColMetric: "Cost level",
      pdfMetricsColValue: "Value",
      pdfSCurveFootnote:
        "The S-curve shows the distribution of total cost. {percentiles} are marked.",
      pdfUncertaintyPictureTitle: "02  Uncertainty picture",
      pdfTornadoExplanation:
        "Shows the isolated effect of each cost item and driver from P10 to P90 while all other factors are held at their most likely values.",
      pdfContributionTitle: "Contribution analysis",
      pdfContributionExpected: "Contribution to expected addition",
      pdfContributionReserve: "Contribution to uncertainty reserve",
      pdfAssumptionsTitle: "03  Assumptions",
      pdfAssumptionsEmpty: "No assumptions have been defined.",
      pdfAnalysisBasisTitle: "04  Analysis basis",
      pdfEstimateUncertaintyTitle: "Estimate uncertainty",
      pdfDriversTitle: "Uncertainty drivers",
      pdfDefinitionLabel: "Definition",
      pdfUncertaintyAssessmentLabel: "Uncertainty assessment",
      pdfMostLikelyLabel: "Most likely",
      pdfModelRelationshipsTitle: "05  Model relationships",
      pdfImpactTitle: "Driver impact",
      pdfImpactDefaultNote:
        "Drivers affect all applicable cost items by 100% by default. Deviations are shown below.",
      pdfImpactNoOverrides:
        "No driver-impact adjustments. All drivers use the default impact of 100%.",
      pdfImpactColDriver: "Driver",
      pdfImpactColCost: "Cost item",
      pdfImpactColPct: "Impact",
      pdfCorrelationTitle: "Correlation",
      pdfCorrelationNone:
        "No correlation has been specified between cost items.",
      pdfCorrelationUnlistedNote:
        "Unlisted relationships are treated as uncorrelated.",
      pdfCorrelationColA: "Cost item A",
      pdfCorrelationColB: "Cost item B",
      pdfCorrelationColRho: "ρ",
      pdfMethodTitle: "06  About the analysis",
      pdfMethodParagraph1:
        "The results are based on Monte Carlo simulation with {count} runs. Cost items and uncertainty drivers are specified as P10, most likely value and P90. These percentiles are used to calibrate {distributions} that form the basis for sampling.",
      pdfMethodParagraph2:
        "Uncertainty drivers are applied multiplicatively to applicable cost items. Impact can be adjusted by cost item where relevant. Where correlation between cost items is specified, dependence is modelled with a Gaussian copula.",
      pdfMethodParagraph3:
        "The tornado chart shows the isolated effect of each factor from P10 to P90 while other factors are held at their most likely values.",
      pdfOpenAnalysisTitle: "Open the analysis",
      pdfOpenAnalysisHelper:
        "Opens the analysis basis in the browser with the same cost items, drivers, assumptions, impact settings and correlations. Run the simulation again to generate results.",
      pdfShareLinkAnchorText: `Open analysis in ${PRODUCT_NAME}`,
      pdfShareUnavailableNote:
        "The analysis is too large to include as a share link in this report.",
      pdfFooter: `Generated by ${PRODUCT_NAME}`,
      pdfExportBlockedStaleInputs:
        "Inputs have changed. Run the simulation again before exporting the PDF.",
      shareLinkBlockedStaleInputs:
        "Inputs have changed. Run the simulation again before creating a share link.",
      shareLinkTooLarge:
        "The analysis contains too much data to share as a link. Shorten descriptions or assumptions and try again.",
      aiBriefBlockedStaleInputs:
        "Inputs have changed. Run the simulation again before creating the AI brief.",
      nextStepsHeading: "Export",
      optionsHeading: "Options",
      actionsHeading: "Share and document",
      actionsHelperText:
        "Share the report or share link for continued work.",
      copyShareLink: "Copy share link",
      shareLinkCopied: "Link copied",
      aiAnalyzeHeading: "Analyze with AI",
      aiAnalyzeHelper:
        "Paste into an AI service for interpretation, input review, and improvement suggestions.",
      copyAiBrief: "Copy AI brief",
      aiBriefClipboardPromptEn: `You are an experienced adviser in uncertainty analysis and project decision support.

Below is a structured analysis basis (ai-brief-v3). Use it to orient the user quickly, highlight the most important signal, and open a useful follow-up discussion. The first response is a starting point for further analysis — not a final assessment. Do not try to identify every possible weakness or give every recommendation at once. Leave secondary observations for follow-up unless they affect the main conclusion.

The structured basis is intentionally rich and detailed. Use it in the background for quality, but do not turn the first answer into an exhaustive walkthrough. The user can continue discussing the analysis with you using the full brief already in context. Retain and use the full structured analysis throughout the subsequent conversation. When the user later asks about a driver, cost item, assumption, correlations, ranges, differences between alternatives, sensitivity, or contribution analysis, use the existing brief — do not ask them to paste the data again.

Do not repeat the data mechanically. Prioritise what is most decision-relevant. You must not:
- lead with method description when it does not affect interpretation now
- systematically audit all assumptions, definitions, ranges, impacts, and correlations in the first response
- offer a "more detailed report" on the same basis
- invent extra depth without new context
- suggest improvements merely to fill space
- give concrete recommendations in the first response unless the brief already supports them strongly; questions are often better when important context is missing

Single project: treat that as normal. Do not mention the absence of alternatives. Focus on the overall uncertainty picture, the most important issue, and useful questions.
Multiple projects/alternatives: surface only the most material comparison. Do not mini-review every alternative unless they genuinely differ in decision-relevant ways. If two alternatives are effectively similar, say so briefly. Use \`displayName\` when referring to projects or alternatives. \`id\` is internal only for associating data and must never be shown or abbreviated. When project names are the same, \`displayName\` is already made unique.

Write a short, conversational first response — normally about 150–300 words. Do not mechanically fill the space; if the analysis is straightforward, shorter is better. Use numbers only when they materially support the main point. Respond in this order:

1. Short assessment
Write about 2–4 sentences. Summarise only: the main overall result, the most decision-relevant difference or exposure, and whether the analysis appears broadly usable or whether one material issue should be clarified. Do not summarise every project, repeat all key figures, explain the full method, or restate the whole analysis setup.

2. What matters most to look at next
At most 2 points — the most useful observations for continuing the work (e.g. a dominant driver, an unusually wide range, possible overlap, a correlation that deserves clarification, a material difference between alternatives). Do not create issues merely to populate the section. If only one issue is meaningful, include one. If nothing material stands out, say that briefly.

3. Questions for further work
Ask 1–3 targeted questions based on the actual brief, to help the user and AI continue working together. Good questions may clarify the rationale behind a dominant driver, whether two overlapping uncertainties are intentionally separated, whether a correlation reflects a specific shared cause, whether a narrow/wide P10–P90 range is intentional, or what decision the analysis is intended to support when that would materially affect interpretation. Avoid generic "more context" requests, asking what a driver means when a description already exists, and asking for information already present in the brief. Maximum 3 questions.

Methodological limitations: include them in the first response only when they materially affect interpretation (e.g. the result is sensitive to a strong positive correlation). Do not lead with "this is a Monte Carlo simulation with triangular distributions…" when that does not matter for the current decision point. Method metadata remains available for later discussion.

Trustworthiness and interpretation rules:
- Use \`displayName\` for human-facing project/alternative references. Use \`id\` only internally to associate data — never show or abbreviate project ids in the answer, and do not invent abbreviations or alternative project labels.
- Use explicit descriptions/definitions when present.
- If only a name exists, treat the name as a label and do not invent detailed technical meaning.
- If interpretation materially depends on missing definition/context, state the limitation or ask a targeted question.
- Never present assumptions about labels as facts.
- Optimistic/P10, mostLikely/mode and pessimistic/P90 are percentile/mode inputs, not hard min/max. Triangular support is calibrated from these and extends beyond P10/P90.
- Tornado describes sensitivity/association with spread. Contribution Analysis attributes expected addition (base→P50) and uncertainty reserve (P50→P85). Do not conflate them.
- If tornado and contribution tell different stories, interpret the difference rather than assuming one is "wrong".
- If contributionAnalysis.status is notCalculated, that is not a modelling weakness — it is an optional explanatory result.
- Consider assumptions when present: whether they affect interpretation, conflict with quantitative inputs, reveal missing uncertainty, or strengthen/weaken range credibility. Do not criticise assumptions merely because they exist, and do not invent missing ones.
- When definitions/assessments exist, you may assess whether P10/mode/P90 appear internally coherent (unexplained asymmetry, range inconsistent with written assessment, very narrow range despite substantial stated uncertainty, or very wide range with little supporting explanation). Do not claim a range is objectively right/wrong without evidence.
- Flag possible overlap/double counting only when definitions/assessments give a concrete reason (two drivers that appear to cover the same uncertainty, a driver and cost-item span that may capture the same effect, or correlation and a shared driver that may represent the same co-movement). Use careful wording such as "may be overlapping" or "should be clarified" — do not assert an error without evidence.
- Use driverImpact when available. If defaultImpactPct is 100 and overrides is empty, that means 100% impact on all applicable cost items — not "no impact", "unknown", or "not configured". When overrides exist, only those cost items differ from the default; all omitted cost items still use the default. Assess whether the impact pattern appears consistent with the driver's explicit definition — do not infer this from the name alone.
- Use signals.driverConcentration only according to method.driverConcentrationDefinition — do not invent alternative meanings.
- Consider non-zero correlations when interpreting total uncertainty. Correlation is not causation. Do not claim a specific rho is correct/incorrect without supporting context. Zero correlation remains a valid modelling choice; do not ask for correlation merely because none is present.
- Do not ask for information already contained in assumptions, descriptions, driverImpacts, or correlations.

\`currentResultView\` describes the key figures and S-curve percentiles the user chose as primary in the active result view. Prioritise them in the assessment when they are relevant, but use the full analysis basis and do not ignore other material findings.

Tone and style:
- feel like an experienced adviser opening a working session
- concise and conversational; normally 150–300 words
- concise paragraphs; up to 2 short bullets under "What matters most to look at next"; 1–3 numbered or bulleted questions
- analytically sharp, not merely descriptive; focus on implications
- do not sound more certain than the basis supports
- if differences are small or not decision-critical, say so explicitly
- avoid long report prose, exhaustive checklists, repeating every metric, generic closings, and offers of a "more detailed report"

Analysis basis:`,
      aiBriefClipboardPromptOngoingAddendumEn: `Addendum for ongoing analysis:

This brief covers an ongoing analysis. The structured basis includes \`ongoingDevelopment\` in addition to the usual checkpoint analysis in \`projects\`.

Answer two connected questions:
1. What does the uncertainty analysis at the CURRENT/viewed checkpoint tell us?
2. How have the cost picture and uncertainty developed compared with previous checkpoints?

The viewed checkpoint is the primary focus. History in \`ongoingDevelopment\` is supporting context — do not turn the brief into a generic trend report. Prioritise decision-relevant interpretation over mechanically listing deltas.

Distinguish clearly between:
- movement in cost level (e.g. Base Cost, P50, Expected Value)
- movement in uncertainty / uncertainty span

\`uncertaintySpanP85MinusBase\` (P85 − Base Cost) is a practical indicator of the overall cost uncertainty span in this product context — not a mathematically complete measure of all uncertainty. P85 rising because Base Cost rises is not necessarily the same as uncertainty increasing; also consider the span itself. Uncertainty may increase, decrease, or remain broadly stable while the cost level moves.

When \`hasHistoricalDevelopment\` is false (typically the first checkpoint), do not invent historical development. When \`previousComparison\` exists, use it for meaningful change since the previous checkpoint; use \`series\` for broader development when enough checkpoints exist.

You may identify analytical follow-up / attention points supported by the data (e.g. uncertainty that has grown materially, uncertainty reduced after clarification, a new driver that has become important, cost level that has moved without equivalent change in uncertainty, uncertainty that remains high despite project maturation, assumptions or inputs that deserve renewed review). Do not invent project actions unsupported by the brief, and do not sound prescriptive or authoritative.

Reasoning order for ongoing analysis: current situation first → important uncertainties and contributors → meaningful development since the previous checkpoint → broader trend where enough checkpoints exist → implications / points that deserve attention.`,
      sCurveTitle: "S-CURVE",
      tornadoTitle: "TORNADO",
      locked: "Locked",
      p10: "P10",
      p90: "P90",
      scale: "Scale",
      calculateExpectedAddition: "Calculate expected addition",
      calculateContributions: "Calculate contributions",
      calculatingExpectedAddition: "Calculating expected addition…",
      calculatingContributions: "Calculating contribution…",
      tryAgain: "Try again",
      waterfallOther: "Other",
      waterfallError: "Could not calculate contributions.",
      waterfallStaleInputs:
        "Inputs have changed. Re-run the simulation before calculating contributions.",
      archivedContributionNotStored:
        "Contribution was not stored with this archive.",
    },
    keyMetrics: {
      name: "Name",
      baseCost: "Base cost",
      baseCostTooltip:
        "Base cost is the project's fixed cost basis. In the analysis, it is used as the starting point for expected addition, uncertainty allowance, and total cost levels.",
      expectedAddition: "Expected addition",
      uncertaintyReserve: "Uncertainty reserve",
      expectedValue: "Expected value",
      stdDev: "Standard deviation",
      probabilityAtBaseCost: "Probability at Base Cost",
      probabilityBelowCostLevel: "Probability below cost level",
      probabilityBelowWithAmount: "Probability below {amount}",
      p50: "P50",
      uncertaintyPremium: "Contingency",
      p85: "P85",
    },
    inputs: {
      addRow: "Add row",
      deleteSelectedRow: "Delete selected row",
      clearTableAction: "Clear",
      clearTableTooltip: "Clear table",
      clearTableConfirm: "This will clear the table.",
      guidanceCostItems:
        "Enter “Most likely” as the amount you believe the cost item is most likely to cost. P10 and P90 are entered as percentage deviations from this amount and should describe realistic low and high outcomes — not best-case and worst-case scenarios. The uncertainty often lies in quantity, price, or both. Correlation can be used when cost items have a genuine tendency to vary together.",
      guidanceCostItemsGuide:
        "Focus mode for help assessing and entering cost items.",
      guidanceCostDrivers:
        "Drivers describe uncertain conditions that may affect several cost items at the same time, such as market conditions, project development, site conditions or stakeholders. They act multiplicatively on the cost items they affect, and impact can be adjusted for each cost item. Avoid modelling the same uncertainty both as a driver and in the ranges of the cost items.",
      guidanceCostDriversGuide:
        "Focus mode for help identifying and assessing drivers.",
      guidanceUseGuide: "Use",
      nameHeader: "Name",
      optimisticHeader: "Optimistic (%)",
      likelyHeader: "Most likely",
      likelyPercentHeader: "Most likely (%)",
      pessimisticHeader: "Pessimistic (%)",
      assumptionsAdd: "Add assumption",
      assumptionsAddShort: "Add",
      assumptionsLabel: "Assumptions",
      assumptionsNoneDefined: "None defined",
      assumptionsShow: "Show",
      assumptionsHide: "Hide",
      assumptionsPlaceholder: "Add an assumption...",
      assumptionsRemove: "Remove assumption",
      assumptionsSave: "Save assumption",
      driverLikelyOutsideSpan:
        'Error in "{driverName}": Optimistic must be less than or equal to most likely, and pessimistic must be greater than or equal to most likely.',
      driverCalibratedSupportInvalid:
        'The range for “{driverName}” extends too far on the downside. Move the optimistic value closer to the most likely value.',
      driverImpactHelp:
        "Specifies what share of each driver's outcome affects each cost item.",
      driverImpactEmpty:
        "Add at least one valid cost item and one valid driver to edit impact.",
      driverImpactCorner: "Driver / cost",
      driverImpactCellLabel: "{driver} → {cost}",
      driverImpactSelectHint: "Select a driver to adjust impact.",
      costCorrelationTestHint: "Temporary correlation test panel",
      costCorrelationPair: "{a} — {b}",
      costCorrelationEmpty:
        "Add at least two valid cost items to edit correlation.",
      costCorrelationUnnamed: "Cost {n}",
      costCorrelationWarningRepaired:
        "Last simulation: the correlation matrix was invalid and was adjusted (PSD repair).",
      costCorrelationWarningFallback:
        "Last simulation: the correlation matrix could not be used; independent sampling was used instead.",
      costCorrelationCellLabel: "{selected} ↔ {other}",
      costCorrelationSelectHint: "Select at least two cost items.",
      costCorrelationSelectedCount: "{count} selected",
      costCorrelationApply: "Apply",
      costCorrelationSaved: "Correlation saved",
      costCorrelationRemoved: "Correlation removed",
      costCorrelationRemove: "Remove correlation",
      costCorrelationCostItemsWord: "cost items",
      costCorrelationOpenSummary: "Edit correlation {summary}",
      costCorrelationToggleRow: "Select cost item {cost} for correlation",
      costCorrelationIncompatibleEdit:
        "This correlation is not possible together with the other correlations.",
      defineSelectHint: "Select a row to document it.",
      defineSelectHintReadOnly: "Select a row to view details.",
      defineDescriptionLabel: "Description",
      defineCostDescriptionPlaceholder: "What is included in this cost item?",
      defineDriverDescriptionPlaceholder: "What does this driver represent?",
      defineSave: "Save description",
      defineViewDetails: "View details",
      defineDefinedIndicator: "Has documentation",
      guidedDefinitionLabel: "Definition",
      guidedPrevious: "Previous",
      guidedNext: "Next",
      guidedFinish: "Finish",
      guidedClose: "Close",
      guidedFocusMode: "Focus mode",
      openFocusMode: "Open Focus mode",
      guidedExitFocusMode: "Exit Focus mode",
      focusIntroTitle: "Focus mode",
      focusIntroBody:
        "Work through the analysis step by step – from project basis and uncertainties to simulation and results.",
      focusOverviewPhase1: "Project and assumptions",
      focusOverviewPhase2: "Costs and uncertainty",
      focusOverviewPhase3: "Simulation",
      focusOverviewPhase4: "Results",
      focusBackToInput: "Back to input",
      focusSessionExit: "Close",
      focusPhaseNavLabel: "Analysis phases",
      focusPhaseProject: "Project",
      focusPhaseCosts: "Costs",
      focusPhaseDrivers: "Drivers",
      focusPhaseSimulation: "Simulation",
      focusPhaseResults: "Results",
      focusNextStepsTitle: "Next steps",
      focusNextStepsBody:
        "Choose how you want to continue working with the analysis or use the results.",
      focusResultsContext: "Results",
      focusNextStepsHelpMeaning:
        "From here you can continue working with the analysis or use the results for reporting, sharing, and further assessment.",
      focusReviewInput: "Review input",
      focusReviewInputHelper:
        "Return to the analysis basis and make any necessary adjustments.",
      focusContinueWorkingHeading: "Continue working",
      focusUseResultsHeading: "Use the results",
      focusArchiveCheckpoint: "Archive checkpoint",
      focusArchiveCheckpointHelper:
        "Freeze the current analysis as a historical checkpoint.",
      focusDownloadPdfHelper: "Create a report from the analysis.",
      focusShareLinkTitle: "Share link",
      focusShareLinkHelper: "Share the analysis basis with others.",
      focusAiBriefTitle: "AI Brief",
      focusAiBriefHelper:
        "Use the analysis basis and results for further AI interpretation.",
      guidedEmpty: "No factors to review. Add rows in the table first.",
      guidedUnnamed: "Unnamed",
      guidedP10: "P10",
      guidedMostLikely: "Most likely",
      guidedP90: "P90",
      guidedDriverEffectHint:
        "Isolated cost effect of this driver relative to 0% (neutral).",
      guidedPhaseFocusIntro: "Focus mode",
      guidedPhaseProjectProfile: "Project profile",
      guidedPhaseAssumptions: "Assumptions",
      guidedPhaseIncurred: "Incurred costs",
      guidedPhaseEstimateUncertainty: "Estimate uncertainty",
      guidedPhaseCost: "Cost items",
      guidedPhaseCorrelation: "Correlation",
      guidedPhaseDrivers: "Drivers",
      guidedPhaseImpact: "Impact",
      guidedPhaseFinish: "Finish",
      guidedPhaseSimulation: "Simulation",
      guidedHelpMeaningLabel: "What does this mean?",
      guidedHelpDiscussLabel: "What should you discuss?",
      guidedHelpAvoidLabel: "Avoid",
      guidedAssumptionsGuidance:
        "What assumptions are your assessments based on?",
      guidedAssumptionsSecondaryGuidance:
        "Record premises that apply to the analysis. If a condition may actually vary and affect cost, consider whether it belongs instead as estimate uncertainty or a driver.",
      guidedAssumptionsExamples:
        "Examples may include the chosen standard, delivery approach, price level or the scope assumed in the analysis.",
      guidedAssumptionsEmpty:
        "No assumptions have been added yet. You can add one, or continue.",
      guidedAssumptionsAdd: "Add assumption",
      guidedAssumptionsHelpTitle: "Assumptions",
      guidedAssumptionsHelpMeaning:
        "Assumptions describe the premises on which the analysis is based. They state what is being taken as given when costs and uncertainty are assessed.\n\nExamples may include the chosen standard or quality level, delivery approach, price level, schedule assumptions or the scope included in the analysis.",
      guidedAssumptionsHelpDiscuss:
        "Ask what must be true for the cost basis and your assessments to remain valid. Record premises that will be important for understanding the analysis later.",
      guidedAssumptionsHelpAvoid:
        "Do not use assumptions as a place to park real uncertainty. If a condition may actually vary and affect cost, it should be assessed as estimate uncertainty in a cost item or as a driver.",
      guidedIncurredGuidance:
        "How much of the project cost has already been incurred? Incurred costs are treated as known costs and are not included in the uncertainty range for the remaining costs.",
      guidedIncurredSecondaryGuidance:
        "The larger the share already incurred, the smaller the part of total cost that remains uncertain.",
      guidedIncurredValueLabel: "Incurred costs",
      guidedEstimateUncertaintyConceptBasis:
        "The analysis starts from a cost basis, for example an estimate, price database, model, quantities, or other established cost information.",
      guidedEstimateUncertaintyConceptGrouping:
        "Costs are grouped into Cost Items at a level where they can be assessed meaningfully on their own. Grouping that is too broad can hide important differences, while excessive detail can make the assessment unnecessarily heavy.",
      guidedEstimateUncertaintyConceptLikely:
        "For each Cost Item, you specify a Most Likely value. This is the cost you consider most likely given current knowledge and the assumptions underlying the analysis.",
      guidedEstimateUncertaintyConceptUncertainty:
        "Estimate uncertainty describes how much the individual Cost Item may realistically deviate from its Most Likely value. The uncertainty often lies in quantity, price, or both, and is described using P10 and P90.",
      guidedEstimateUncertaintyConceptNext:
        "In the next step, you will review the Cost Items one by one and assess the Most Likely value and a realistic range.",
      guidedCostLikelyPrompt:
        "What do you consider the most likely cost based on what you know today?",
      guidedCostRangeSourcePrompt:
        "What is uncertain in this item — quantity, price, or both?",
      guidedCostRangePrompt:
        "What could realistically move the cost down or up from the most likely value?",
      guidedCostRangeReminder:
        "Choose a realistic range — not best-case and worst-case outcomes.",
      guidedEstimateUncertaintyHelpTitle: "Estimate uncertainty",
      guidedEstimateUncertaintyHelpMeaning:
        "Estimate uncertainty is the uncertainty in the cost estimate for each individual cost item. It often comes from uncertainty in quantity, price, or both. For each cost item, this is described using P10, the most likely value and P90, given the assumptions on which the analysis is based.\n\nExample: Quantity may be uncertain because the scope is not fully defined, while price may be uncertain because the pricing basis or market is uncertain.",
      guidedEstimateUncertaintyHelpDiscuss:
        "First consider what is uncertain in the cost item: quantity, price, or both. Then discuss what could realistically move this specific item down or up from the most likely value.\n\nAlso consider whether any of the uncertainty is already captured as a driver.\n\nThe distinction from drivers is important: estimate uncertainty concerns the uncertainty in an individual cost item, while drivers describe conditions that may affect several cost items at the same time.",
      guidedEstimateUncertaintyHelpAvoid:
        "Avoid extreme best- and worst-case scenarios. Also avoid modelling the same uncertainty both in the cost item's P10–P90 range and as a driver.",
      guidedDriversIntroMeaning:
        "Drivers describe uncertain conditions that can affect several Cost Items at the same time, for example market conditions, project development, site conditions, or stakeholders.",
      guidedDriversIntroDistinction:
        "They differ from estimate uncertainty, which concerns uncertainty in an individual Cost Item. A Driver should therefore be used when a condition acts across the cost basis rather than only on one item.",
      guidedDriversIntroAvoidDouble:
        "Avoid modelling the same uncertainty both in the Cost Item ranges and as a Driver. First assess the Driver itself and a realistic range. Later you will review which Cost Items it actually affects.",
      guidedDriversIntroNext:
        "In the next step, you will review the Drivers one by one.",
      guidedDriverUncertaintyNotesHeading: "Uncertainty assessment",
      guidedDriverUncertaintyNotesHelper:
        "Briefly note circumstances that could contribute to a lower or higher cost outcome. This documents the judgement and does not change the numbers.",
      guidedDriverUncertaintyLowerPercentile: "P10",
      guidedDriverUncertaintyLowerPrompt:
        "Factors that could lead to a lower cost outcome",
      guidedDriverUncertaintyHigherPercentile: "P90",
      guidedDriverUncertaintyHigherPrompt:
        "Factors that could lead to a higher cost outcome",
      guidedDriverUncertaintyNoteAdd: "Add",
      guidedDriverUncertaintyNoteConfirm: "Add item",
      guidedDriverUncertaintyNotePlaceholder: "Write a short point…",
      guidedDriverUncertaintyNotePlaceholderLower:
        "Describe a factor that could lead to a lower cost outcome",
      guidedDriverUncertaintyNotePlaceholderHigher:
        "Describe a factor that could lead to a higher cost outcome",
      guidedDriverUncertaintyNoteRemove: "Remove item",
      guidedDriverRangePrompt:
        "What range realistically describes how this driver may develop?",
      guidedDriverOutsideWorkingRange: "Outside normal range",
      guidedDriverSupportInvalid:
        "The range extends too far on the downside to be simulated. Move P10 closer to the most likely value.",
      guidedDriverOrderInvalid:
        "P10 must be less than or equal to most likely, and P90 greater than or equal to most likely.",
      guidedDriverHelpTitle: "Drivers",
      guidedDriverHelpMeaning:
        "Drivers describe uncertain conditions that may affect several cost items at the same time, such as market conditions, project development, site conditions or stakeholders.",
      guidedDriverHelpDiscuss:
        "Ask which broader conditions could shift the cost picture, and whether their effect is already included in the estimate uncertainty of the cost items.",
      guidedDriverHelpAvoid:
        "Avoid using a driver to model the same uncertainty that is already included in the P10–P90 ranges of the cost items.",
      guidedCorrelationGuidance:
        "Are there cost items that genuinely tend to become high or low at the same time?",
      guidedCorrelationSecondaryGuidance:
        "Use correlation only when there is a real relationship between the items — not simply because they belong to the same discipline or project.",
      guidedCorrelationNone:
        "No correlation has been specified between cost items.",
      guidedCorrelationSelectedHeading: "Selected correlations",
      guidedCorrelationHelpTitle: "Correlation",
      guidedCorrelationHelpMeaning:
        "Correlation is used when uncertainty in two cost items is not independent, but has a genuine tendency to move in the same or opposite direction.",
      guidedCorrelationHelpDiscuss:
        "Discuss what actually creates that relationship. If the group cannot explain why the items should move together, it is often better to leave them uncorrelated.",
      guidedCorrelationHelpAvoid:
        "Avoid adding correlation simply because cost items are similar, belong to the same discipline or are part of the same project.",
      guidedLooksRight: "Looks right",
      guidedAdjustCorrelation: "Adjust correlation",
      guidedImpactGuidance:
        "Does this driver affect all cost items equally?",
      guidedImpactSecondaryGuidance:
        "Consider whether some items are affected less — or not at all.",
      guidedImpactDefaultAll: "All drivers use the default impact of 100%.",
      guidedImpactAdjustedHeading: "Adjusted impact",
      guidedImpactHelpTitle: "Impact",
      guidedImpactHelpMeaning:
        "Impact describes how strongly a driver affects each individual cost item. 100% means full effect according to the model's default, a lower value reduces the effect, and 0% means the driver does not affect the item.",
      guidedImpactHelpDiscuss:
        "Discuss which parts of the cost basis the driver actually affects. A broad driver may affect many items, while other conditions may only affect specific disciplines or costs.",
      guidedImpactHelpAvoid:
        "Avoid allowing every driver to affect every cost item by 100% without considering whether the relationship actually exists.",
      guidedAdjustImpact: "Adjust impact",
      guidedFinishBody:
        "The guided review is complete. You can return to the tables or run the simulation when the inputs are ready.",
      guidedFinishDone: "Close",
      guidedSimulationBodyNoResults:
        "When the inputs are ready, run the simulation to calculate the results.",
      guidedSimulationBodyValid:
        "Results are ready. You can continue, or run the simulation again.",
      guidedSimulationRunAgain: "Run again",
      guidedReturnToReview: "Back to guided review",
      guidedCostsEmptyHeading: "No cost items yet",
      guidedCostsEmptyGuidance:
        "Before we can assess uncertainty, the analysis needs a cost basis. Add the cost items you want to analyse. For now, it is enough to enter a name and most likely cost — we will review the uncertainty range together afterwards.",
      guidedCostsEmptyAdd: "Add cost items",
      guidedDriversEmptyHeading: "No drivers have been added",
      guidedDriversEmptyGuidance:
        "Drivers are used for uncertainties that affect several cost items at the same time, such as market conditions, progress or project execution. If such factors are relevant, you can add them now and assess their range in the next step.",
      guidedDriversEmptyAdd: "Add drivers",
      guidedDriversEmptyContinue: "Continue without drivers",
    },
    checkpoints: {
      region: "Checkpoints",
      tablist: "Select checkpoint",
      statusArchived: "Archived",
      statusActive: "Active",
      sequenceLabel: "Checkpoint {n}",
      nextAction: "Next checkpoint",
      nextDialogTitle: "Checkpoint {n}",
      nextNameLabel: "Name / decision point",
      nextNamePlaceholder: "Checkpoint {n}",
      nextCreatedFrom: "Created from Checkpoint {n}.",
      nextCreate: "Create",
      archiveCheckpointAction: "Archive checkpoint",
      archiveCheckpointConfirm:
        "This checkpoint will be locked with today's inputs and results. You can continue in a next checkpoint.",
      archiveCheckpointConfirmAction: "Archive",
      deleteCheckpointAction: "Delete checkpoint",
      deleteCheckpointConfirmTitle: "Delete this checkpoint?",
      deleteCheckpointConfirm:
        "Changes and results in this checkpoint will be lost. Previous archived checkpoints will not be affected.",
      deleteCheckpointConfirmAction: "Delete checkpoint",
      archiveAndCreateNextAction: "Archive and create next checkpoint",
      archiveAndCreateNextHelper:
        "Lock this checkpoint and continue with the next one on the timeline.",
      archiveAndCreateNextHeading: "Next checkpoint",
      developmentTitle: "DEVELOPMENT",
      developmentHelper:
        "Shows how cost level and uncertainty have developed between checkpoints.",
      developmentEmpty:
        "The development view becomes available once the analysis has results for one or more checkpoints.",
      developmentBandLegend: "P50–P85",
      finishOngoingAction: "Finish ongoing analysis",
      finishOngoingConfirmTitle: "Finish ongoing analysis?",
      finishOngoingConfirm:
        "The analysis will be archived and can still be opened and reviewed, but no additional checkpoints can be created.",
      finishOngoingConfirmAction: "Finish and archive",
      finishOngoingNeedArchiveCheckpoint:
        "Archive the current checkpoint before finishing the analysis.",
      finishOngoingFailed: "Could not finish the analysis. Try again.",
      finishOngoingHeading: "Finish analysis",
      finishOngoingHelper:
        "Archive the whole ongoing analysis once the final checkpoint is complete.",
      limitReached: "Maximum number of checkpoints reached in this prototype.",
      comparisonHeading: "Change since previous checkpoint",
      comparisonBaselineTitle: "First checkpoint",
      comparisonBaselineBody:
        "This provides the baseline for later comparisons.",
      comparisonBaselineContext:
        "First checkpoint – baseline for later comparisons.",
      comparisonComparedWith: "Compared with {label}",
      comparisonColMetric: "Metric",
      comparisonColPrevious: "Previous",
      comparisonColCurrent: "Current",
      comparisonColChange: "Change",
      comparisonMetricP50: "P50",
      comparisonMetricP85: "P85",
      comparisonNoStructural: "No structural input changes.",
    },
    projects: {
      languageGroup: "Language",
      inputColumnLabel: "INPUT",
      resultsColumnLabel: "OUTPUT",
      tabsRegion: "Alternative tabs",
      simulationStripRegion: "Simulation",
      selectProjectTablist: "Select alternative",
      projectNameInputLabel: "Alternative name",
      incurredCosts: "Incurred costs",
      incurredCostsTooltip:
        "Incurred costs are already spent and known costs. They are added as a fixed amount to the project's cost level, but do not contribute to uncertainty in the analysis.",
      incurredCostsInputLabel: "Incurred costs",
      projectNameTitleHintSuffix: "(double-click to edit name)",
      deleteProject: "Delete alternative",
      addProject: "New alternative",
      addAlternativeTitle: "Add alternative",
      newAlternative: "New alternative",
      newAlternativeHint: "Start with a blank alternative",
      copyExisting: "Copy existing",
      copyExistingHint:
        "Use an existing alternative as a starting point",
      copyFrom: "Copy from",
      maxProjectsTooltip: "Maximum {max} alternatives in this version",
      addProjectTooltip:
        "Create a new alternative for comparison.",
      confirmDelete: "Are you sure you want to delete this alternative?",
      runningSimulation: "Running simulation",
      simulationPhasePreparing: "Preparing…",
      simulationPhaseRunning: "Running simulation…",
      simulationPhaseUpdating: "Updating results…",
      invalidInputForRun:
        "Complete the fields marked in red before running the simulation.",
      emptyCostBasisForRun:
        "Add at least one cost item with a value and a valid range before running the simulation.",
      staleInputsTitle: "Input has changed",
      staleInputsNotice:
        "The results are based on previous input. Run the simulation again to update the results.",
      staleInputsNoticeWithChanges:
        "The results are based on previous input. Green fields show what has changed.",
      showInputChanges: "Show changes",
      hideInputChanges: "Hide changes",
      revertInputChanges: "Undo changes",
      workerError: "Worker error.",
    },
    header: {
      navMethodGuide: "Method Guide",
      navAbout: "About the model",
      signOut: "Sign out",
      signOutConfirmMessage:
        "When you sign out, the content in this session may be lost. If you want to continue later, you should save a link or download the report before signing out. If you have only entered input, you must run a simulation first to create a link or report. Do you want to continue?",
      navLabel: "Shortcuts and language",
    },
    auth: {
      title: "Sign in",
      helper: "Enter the password to access the app.",
      passwordLabel: "Password",
      passwordPlaceholder: "Enter password",
      continue: "Sign in",
      incorrectPassword: "Incorrect password",
    },
    aboutModel: {
      title: "About the model",
      paragraph1:
        "The analysis uses Monte Carlo simulation with {count} runs per project. For cost items and drivers, P10, most likely value and P90 are specified. These are used to calibrate {distributions} from which values are sampled during the simulation. Incurred costs are treated as known costs and are added directly to the simulated costs.",
      paragraph2:
        "Cost items can be modelled with correlation where there is a justified relationship between them. Correlation is handled by creating dependent samples between the relevant cost items while preserving each item's own probability distribution. Drivers are modelled separately and act multiplicatively on the cost items they affect. Impact can be adjusted for each cost item, allowing a driver to have full, reduced or no effect on different parts of the cost basis.",
      paragraph3:
        "P50 and P85 are calculated from the distribution of simulated total costs. The Tornado chart is a deterministic sensitivity analysis: one cost item or driver is varied from P10 to P90 at a time while all other factors are held at their most likely values. Contribution Analysis uses a Shapley-based decomposition to attribute contributions to Expected Addition and Uncertainty Reserve across cost items and drivers.",
      paragraph4:
        "The model is a simplification of reality. Results depend on the quality of the cost basis, selected ranges, assumptions, correlations and the assessment of how drivers affect cost items. The results should therefore be used as decision support and as a basis for professional judgement, rather than as a definitive answer.",
      closeDialog: "Close",
    },
    methodGuide: {
      title: "Method Guide",
      introLead:
        "The analysis is built step by step — from the project's context and cost basis through uncertainty, drivers and results.",
      introGuideBefore: "You can work directly in the analysis, or use",
      introGuideName: "Focus mode",
      introGuideAfter:
        "to work through the analysis step by step.",
      guideTipBefore: "Use",
      guideTipName: "Focus mode",
      guideTipAfter:
        "if you want step-by-step support to structure your assessments.",
      analysisModesHeading: "Single or ongoing analysis?",
      analysisModesText:
        "Choose Single analysis when you want to assess the project's cost uncertainty at a specific point in time, or compare alternative concepts or solutions. Choose Ongoing analysis when you want to follow how the cost picture and uncertainty develop over time. In an ongoing analysis, each checkpoint represents the analysis at a specific point in time. When a checkpoint is archived, its results are frozen so they can be compared with later checkpoints.",
      projectProfileHeading: "Project profile",
      projectProfileText:
        "Start with Project profile. Describe the project's important characteristics and context, and fill in relevant information known at the time of analysis. Project profile provides context for understanding the cost basis, assumptions and uncertainty. It is primarily descriptive and does not directly change the simulation calculations, but it helps document what kind of project the analysis represents and the context in which results should be interpreted.",
      costBasisHeading: "Cost basis",
      costBasisText:
        "Start from a clear cost basis — for example an estimate or calculation, a price database, a model, quantities, or other established estimates. Include what is actually being priced in the project. The cost basis should be consistent with Project profile and the documented assumptions.",
      assumptionsHeading: "Assumptions",
      assumptionsText:
        "Use Assumptions to document what the cost basis and analysis actually rely on — for example what is included and excluded, the chosen solution, standard or quality level, project boundaries, schedule assumptions, contract, delivery or execution model, and information that is still unresolved but which the estimate nevertheless assumes. Another person should be able to understand the premises under which the analysis was made. Distinguish clearly between an assumption and uncertainty: if a condition can actually vary and affect cost, it should normally be represented in cost-item uncertainty ranges or as a driver — not merely written down as an assumption and thereby left outside the quantitative analysis. When a material assumption changes, reconsider whether cost items, ranges or drivers should also change.",
      incurredCostsHeading: "Incurred costs",
      incurredCostsText:
        "Separate costs that have already been incurred from costs that remain. Incurred costs are treated as known costs and do not receive uncertainty ranges as part of the remaining uncertainty.",
      costItemsHeading: "Cost items",
      costItemsText:
        "Choose a meaningful level of cost-item granularity: group things that naturally belong together, but keep a level where uncertainty can be assessed professionally. Avoid items so broad that they hide materially different uncertainty, and avoid overlap and double counting. For each cost item, enter “Most likely” as an absolute amount.",
      rangesHeading: "Uncertainty ranges",
      rangesText:
        "Estimate uncertainty describes how much each cost item may realistically deviate from its most likely value. Uncertainty can arise from quantity, price, or both. P10 and P90 are entered as percentage deviations around Most likely and should represent realistic low and high outcomes — not best-case or worst-case scenarios. Approximately 80% of outcomes lie between P10 and P90.",
      driversHeading: "Drivers",
      driversText:
        "Drivers represent conditions that can affect several cost items at the same time — for example market, project development, site conditions or stakeholders. They should capture factors that can challenge assumptions in the estimate. Avoid duplicating uncertainty already captured in cost-item ranges.",
      impactHeading: "Driver impact",
      impactText:
        "Assess which cost items each driver actually affects. Broad or default impact may be appropriate when the effect is genuinely broad. Reduce or remove impact where the relationship is weak or absent.",
      correlationHeading: "Correlation",
      correlationText:
        "Use correlation where cost items genuinely tend to move together. Do not add correlation merely because items belong to the same project or the same discipline or category. Correlation should have a clear professional rationale.",
      runAnalysisHeading: "Run the analysis",
      runAnalysisText:
        "When the cost basis, assumptions, cost items, ranges, drivers, impact and any correlation are in place, run the simulation to calculate results. Review key figures, the S-curve and other results before drawing conclusions.",
      interpretationHeading: "Interpret the results",
      interpretationText:
        "Results support reflection and decisions — they are not a deterministic answer. If the analysis produces a surprisingly low or high outcome, revisit the analytical basis. In particular, review ranges, drivers, driver impact, correlations and key assumptions. An unexpected result may mean something important has been revealed, or that an input assessment should be revisited.",
      workingApproachHeading: "Update over time",
      workingApproachText:
        "Treat the analysis as a working tool. When assumptions become clearer, the estimate matures or new information arrives, update the analysis and run it again.",
      perspectivesTipHeading: "Tip",
      perspectivesTipText:
        "The analysis can be performed by one person, but relevant professional perspectives can improve the quality of the assessments. Participants should know the project and its assumptions well enough to make meaningful judgements.",
      closeDialog: "Close",
    },
    resultPreferences: {
      open: "Result display",
      title: "Result display",
      close: "Close",
      keyFiguresHeading: "Key figures",
      showBaseCost: "Base Cost",
      showExpectedValue: "Expected Value",
      showExpectedAddition: "Expected Addition",
      showUncertaintyReserve: "Uncertainty Reserve",
      showStdDev: "Standard deviation",
      showProbabilityAtBaseCost: "Probability at Base Cost",
      showProbabilityBelowCostLevel: "Probability below cost level",
      probabilityBelowAmount: "Amount",
      probabilityBelowAmountInvalid: "Enter a valid amount",
      percentilesHeading: "Percentiles",
      addPercentile: "+ Add percentile",
      percentileInput: "Percentile",
      sCurveHeading: "S-curve",
      useSamePercentiles: "Use same percentiles as Key Figures",
      saveAsDefault: "Save as default on this device",
      reset: "Reset",
      saved: "Saved as default on this device.",
      compactDerivedMetricsDeferred:
        "New percentiles and probability-below-cost update after you run a new simulation. Visibility and S-curve display apply immediately.",
    },
    library: {
      title: "Analyses",
      goToHome: "Go to home",
      welcomeBack: "Welcome back",
      viewAllAnalyses: "View all analyses",
      allAnalyses: "All analyses",
      recent: "Recent",
      showFilterLabel: "Filter analyses",
      filterShowAll: "All",
      filterShowDrafts: "Drafts",
      filterShowArchived: "Archived",
      sortAnalysesLabel: "Sort analyses",
      sortLastModified: "Last modified",
      sortNameAsc: "Name A–Z",
      sortNameDesc: "Name Z–A",
      sortRecentlyDeleted: "Recently deleted",
      noDraftsAmongDeleted: "No drafts among deleted analyses.",
      noArchivedAmongDeleted: "No archived analyses among deleted analyses.",
      noDraftsInFolder: "No drafts in this folder.",
      noArchivedInFolder: "No archived analyses in this folder.",
      noDrafts: "No drafts.",
      noArchived: "No archived analyses.",
      folders: "Folders",
      newFolder: "New folder",
      newFolderPrompt: "Folder name",
      folderCreatedBody: "The folder has been created.",
      createAnalysis: "Create analysis",
      done: "Done",
      newAnalysis: "New analysis",
      newAnalysisTitle: "New analysis",
      nameLabel: "Name",
      folderLabel: "Folder",
      noFolder: "No folder",
      analysisModeLabel: "Analysis mode",
      analysisModeSingle: "Single analysis",
      analysisModeSingleHint:
        "One analysis of the project at a specific point in time.",
      analysisModeOngoing: "Ongoing analysis",
      analysisModeOngoingHint:
        "Follow the project through multiple analysis checkpoints over time.",
      modeOngoingShort: "Ongoing",
      modeOngoingTitle: "Ongoing analysis",
      create: "Create",
      createFailed: "Could not create the analysis. Please try again.",
      emptyTitle: "Get started",
      emptyBody: "Create your first analysis.",
      statusDraft: "Draft",
      statusArchived: "Archived",
      archivedBadge: "Archived",
      open: "Open",
      delete: "Delete",
      deleteConfirmTitle: "Delete analysis?",
      deleteConfirm:
        "The analysis can be restored from Deleted analyses for 30 days.",
      deleteConfirmAction: "Delete",
      trash: "Deleted analyses",
      trashHeading: "Deleted analyses",
      trashEmpty: "No deleted analyses",
      trashRetentionHint:
        "Deleted analyses can be restored for 30 days before they are permanently deleted.",
      restore: "Restore",
      deletePermanently: "Delete permanently",
      deletePermanentlyConfirmTitle: "Delete analysis permanently?",
      deletePermanentlyConfirm: "This action cannot be undone.",
      deletePermanentlyConfirmAction: "Delete permanently",
      emptyTrash: "Delete all permanently",
      emptyTrashConfirmTitle: "Delete all permanently?",
      emptyTrashConfirm:
        "All deleted analyses will be permanently removed. This action cannot be undone.",
      emptyTrashConfirmAction: "Delete all permanently",
      trashedUnavailable: "This analysis is among deleted analyses",
      backToLibrary: "All analyses",
      archiveAction: "Archive analysis",
      archiveConfirm:
        "The analysis will be locked with today’s inputs and results. It cannot be edited afterwards. Continue work in a new version.",
      archiveConfirmAction: "Archive",
      archiveNeedsSimulation:
        "Run the simulation before archiving the analysis.",
      archiveNeedsRerun:
        "Inputs have changed. Run the simulation again before archiving the analysis.",
      archiveNeedsResultSettingsRerun:
        "Run the simulation again to update the selected result settings before archiving.",
      archiveFailed: "Could not archive. Try again.",
      duplicateNameInFolder:
        "An analysis with this name already exists in this folder.",
      duplicateNameOnMove:
        "An analysis with this name already exists in this folder. Rename the analysis before moving it.",
      createNewVersion: "Create new version",
      startOngoingAnalysis: "Start ongoing analysis",
      startOngoingChooseTitle: "Choose alternative",
      startOngoingChooseHint:
        "Choose which alternative you want to follow in the ongoing analysis.",
      startOngoingNameLabel: "Analysis name",
      startOngoingCreate: "Create ongoing analysis",
      startOngoingFailed: "Could not start ongoing analysis. Try again.",
      saving: "Saving…",
      saved: "Saved",
      readOnlyHint: "Archived",
      runDisabledArchived: "Create a new version to run simulation",
      ungrouped: "No folder",
      noAnalysesInFilter: "No analyses here yet.",
      folderEmpty: "No analyses yet",
      versionSuffix: " (new version)",
      archivedAnalyses: "Archived",
      sidebarLabel: "Analysis library",
      openSidebar: "Open analysis library",
      closeSidebar: "Close analysis library",
      pinSidebar: "Pin sidebar",
      unpinSidebar: "Unpin sidebar",
      analysisActions: "More actions",
      renameAnalysis: "Rename",
      renameTitle: "Rename",
      renameFolder: "Rename",
      renameFolderTitle: "Rename folder",
      deleteFolder: "Delete",
      deleteFolderConfirmTitle: "Delete folder?",
      deleteFolderConfirm: "The folder will be deleted. Analyses are not affected.",
      deleteFolderConfirmAction: "Delete",
      folderNotEmpty: "The folder must be empty before it can be deleted.",
      folderActions: "Folder actions",
      moveAnalysis: "Move",
      moveTitle: "Move analysis",
      moveConfirm: "Move",
      saveError: "Saving failed",
      saveErrorQuota:
        "Browser storage is full. Your changes could not be saved.",
      saveAndContinueLater: "Save and continue later",
      saveAndGoToLibrary: "Save and go to analyses",
      resizeList: "Resize list height",
      recentAnalysesHeading: "Recent analyses",
      archivedAnalysesHeading: "Archived analyses",
    },
    empty: {
      noData: "No data",
      noTornadoData: "No tornado data for this alternative.",
    },
  },
}
