export type StepId = "profile" | "cost" | "driver" | "results"

export const STEPS: readonly { id: StepId; title: string; help: string }[] = [
  {
    id: "profile",
    title: "Prosjektet",
    help: "Beskriv prosjektet kort. Det du skriver her følger med i rapporten.",
  },
  {
    id: "cost",
    title: "Kostnadsposter",
    help: "Legg inn hva hver post kan koste: lav, mest sannsynlig og høy verdi.",
  },
  {
    id: "driver",
    title: "Drivere",
    help: "Drivere er det som kan flytte kostnadene, som forsinkelser eller prisstigning.",
  },
  {
    id: "results",
    title: "Resultat",
    help: "Kjør simuleringen og se hvor mye prosjektet sannsynligvis koster.",
  },
]
