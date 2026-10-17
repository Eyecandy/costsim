type ErrorReporter = (context: string, error: unknown) => void

let reporter: ErrorReporter | null = null

/** Plug in an external reporter (for example an error-tracking service). Pass null to remove it. */
export function setErrorReporter(next: ErrorReporter | null): void {
  reporter = next
}

/**
 * The one place to report errors the app recovers from, or cannot recover from.
 * Use it instead of an empty `catch`. `context` says what was being attempted.
 */
export function logError(context: string, error: unknown): void {
  console.error(`[costsim] ${context}`, error)
  try {
    reporter?.(context, error)
  } catch {
    // intentional: reporting an error must never throw a new one
  }
}
