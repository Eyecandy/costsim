import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { Analytics } from "@vercel/analytics/react"
import "./index.css"
import { AuthProvider } from "@/shared/auth/AuthProvider"
import { ErrorBoundary } from "@/shared/ErrorBoundary"
import { installGlobalErrorHandlers } from "@/shared/globalErrorHandlers"
import { I18nProvider } from "@/i18n/I18nProvider"
import { Router } from "@/app/Router"

installGlobalErrorHandlers()

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <I18nProvider>
      <ErrorBoundary>
        <AuthProvider>
          <Router />
          <Analytics />
        </AuthProvider>
      </ErrorBoundary>
    </I18nProvider>
  </StrictMode>,
)
