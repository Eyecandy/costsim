import { logError } from "@/shared/logError"

let installed = false

/** Logs errors that no component caught: uncaught exceptions and unhandled promise rejections. */
export function installGlobalErrorHandlers(): void {
  if (installed || typeof window === "undefined") return
  installed = true
  window.addEventListener("error", (event) => {
    logError("window.error", event.error ?? event.message)
  })
  window.addEventListener("unhandledrejection", (event) => {
    logError("unhandledrejection", event.reason)
  })
}
