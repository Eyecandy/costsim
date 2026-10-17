export type AppVariant = "pilot" | "public_mvp"

export type AppFeatureConfig = {
  requireLoginGate: boolean
  showP85: boolean
  showContingency: boolean
  showExpectedAddition: boolean
  allowShareLink: boolean
  maxProjects: number
}

const rawVariant = import.meta.env.VITE_APP_VARIANT

export const appVariant: AppVariant =
  rawVariant === "pilot" || rawVariant === "public_mvp"
    ? rawVariant
    : "public_mvp"

export const featureConfigByVariant: Record<AppVariant, AppFeatureConfig> = {
  pilot: {
    requireLoginGate: true,
    showP85: true,
    showContingency: true,
    showExpectedAddition: true,
    allowShareLink: true,
    maxProjects: 4,
  },
  public_mvp: {
    requireLoginGate: false,
    showP85: false,
    showContingency: false,
    showExpectedAddition: true,
    allowShareLink: true,
    maxProjects: 2,
  },
}

export const appFeatures = featureConfigByVariant[appVariant]

if (import.meta.env.DEV) {
  // eslint-disable-next-line no-console -- useful dev visibility only
  console.info("[appVariant]", appVariant)
}
