/**
 * Canonical visible product name (Unicode middle dot U+00B7).
 * Identical in NO and EN — do not translate.
 */
export const PRODUCT_NAME = "U·SKOP" as const

/** Middle-dot separator used inside {@link PRODUCT_NAME}. */
export const PRODUCT_NAME_SEPARATOR = "\u00B7" as const

/**
 * Primary brand text color — authoritative source shared with BrandWordmark.
 * Change here (and keep logo in sync) when the brand color concept changes.
 */
export const brandPrimaryTextClass = "text-[#1d868c]" as const

/**
 * Primary brand fill for main CTA buttons (e.g. Run simulation).
 * Shared by normal-app strip and Focus Simulation — do not duplicate hex in UI.
 */
export const brandPrimaryButtonClass =
  "border-transparent bg-[#1d868c] text-white hover:bg-[#1d868c]/85 hover:text-white" as const
