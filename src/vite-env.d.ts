/// <reference types="vite/client" />

type ImportMetaEnv = {
  /** "pilot" (login gate, all features) or "public_mvp" (default: open, fewer features). Any other value falls back to "public_mvp". */
  readonly VITE_APP_VARIANT?: string
  /** Password for the pilot login gate. Inlined into the public bundle, so it is a gate, not real authentication. */
  readonly VITE_APP_PASSWORD?: string
}

type ImportMeta = {
  readonly env: ImportMetaEnv
}
