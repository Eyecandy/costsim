/**
 * Internal product configuration for the uncertainty / marginal distribution model.
 *
 * Not a user setting — no Result Settings, UI control, env override, or selector.
 * Describes the single supported analytical family today; does not abstract the engine.
 */

import type { AppLanguage } from "@/domain/results/formatNumber"

export const uncertaintyModelConfig = {
  /** Marginal family used by main MC and Shapley after P10/mode/P90 calibration. */
  marginalDistribution: "triangular",
  /** How user estimate fields are interpreted before calibration. */
  inputInterpretation: "p10_mode_p90",
} as const

export type UncertaintyMarginalDistribution = typeof uncertaintyModelConfig.marginalDistribution

export type UncertaintyInputInterpretation = typeof uncertaintyModelConfig.inputInterpretation

type MarginalDistributionLabels = {
  singular: string
  plural: string
}

const MARGINAL_DISTRIBUTION_LABELS: Record<
  UncertaintyMarginalDistribution,
  Record<AppLanguage, MarginalDistributionLabels>
> = {
  triangular: {
    no: {
      singular: "trekantfordeling",
      plural: "trekantfordelinger",
    },
    en: {
      singular: "triangular distribution",
      plural: "triangular distributions",
    },
  },
}

/** Localized singular noun for the configured (or given) marginal family. */
export function formatMarginalDistributionLabel(
  language: AppLanguage,
  family: UncertaintyMarginalDistribution = uncertaintyModelConfig.marginalDistribution,
): string {
  return MARGINAL_DISTRIBUTION_LABELS[family][language].singular
}

/** Localized plural noun for method / About copy ({distributions}). */
export function formatMarginalDistributionPlural(
  language: AppLanguage,
  family: UncertaintyMarginalDistribution = uncertaintyModelConfig.marginalDistribution,
): string {
  return MARGINAL_DISTRIBUTION_LABELS[family][language].plural
}

/**
 * Apply `{count}` and `{distributions}` placeholders in method/About templates.
 */
export function fillUncertaintyModelCopy(
  template: string,
  args: {
    language: AppLanguage
    count?: string
  },
): string {
  let out = template.replace("{distributions}", formatMarginalDistributionPlural(args.language))
  if (args.count !== undefined) {
    out = out.replace("{count}", args.count)
  }
  return out
}
