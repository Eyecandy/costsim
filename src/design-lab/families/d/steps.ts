export type StepId = "profile" | "cost" | "driver" | "results"

export const STEPS: readonly {
  id: StepId
  title: string
  help: string
  example: string
  tips: readonly string[]
}[] = [
  {
    id: "profile",
    title: "Prosjektet",
    help: "Beskriv prosjektet kort. Det du skriver her følger med i rapporten.",
    example: "Eksempel: «Ullern renovering, rehabilitering av tre bygg, ferdig høsten 2028.»",
    tips: [
      "Skriv med egne ord, to eller tre setninger holder",
      "Navn og sted gjør rapporten lettere å kjenne igjen",
    ],
  },
  {
    id: "cost",
    title: "Kostnadsposter",
    help: "Legg inn hva hver post kan koste: lav, mest sannsynlig og høy verdi.",
    example: "Eksempel: Konstruksjon, lav -5 %, mest sannsynlig 4 800 000, høy 20 %.",
    tips: [
      "Mest sannsynlig er et beløp i kroner",
      "Lav og høy kan skrives som prosent av beløpet",
      "Høy skal alltid være større enn lav",
    ],
  },
  {
    id: "driver",
    title: "Drivere",
    help: "Drivere er det som kan flytte kostnadene, som forsinkelser eller prisstigning.",
    example: "Eksempel: Forsinkelse, lav -5 %, mest sannsynlig 5 %, høy 20 %.",
    tips: ["Bruk få drivere, de viktigste først", "Alle tre verdiene er prosent"],
  },
  {
    id: "results",
    title: "Resultat",
    help: "Kjør simuleringen og se hvor mye prosjektet sannsynligvis koster.",
    example: "Eksempel: P50 betyr at det er like sannsynlig å ende over som under.",
    tips: [
      "P85 er et trygt budsjett i de fleste prosjekter",
      "Endre tallene og kjør på nytt når som helst",
    ],
  },
]
