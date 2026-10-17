import { Component, type ErrorInfo, type ReactNode } from "react"

import { useI18n } from "@/i18n/useI18n"
import { logError } from "@/shared/logError"
import { Button } from "@/shared/ui/button"

type ErrorBoundaryProps = {
  children: ReactNode
}

type ErrorBoundaryState = {
  error: Error | null
}

function ErrorFallback({ onRetry }: { onRetry: () => void }) {
  const { t } = useI18n()
  return (
    <div
      role="alert"
      className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 px-4 text-center"
    >
      <h1 className="m-0 font-sans text-lg font-medium">{t("errorBoundary.title")}</h1>
      <p className="m-0 font-sans text-sm text-muted-foreground">{t("errorBoundary.body")}</p>
      <div className="flex gap-2">
        <Button type="button" variant="outline" onClick={onRetry}>
          {t("errorBoundary.tryAgain")}
        </Button>
        <Button type="button" onClick={() => window.location.reload()}>
          {t("errorBoundary.reload")}
        </Button>
      </div>
    </div>
  )
}

/**
 * Catches errors thrown while rendering its children, logs them and shows a recoverable message
 * instead of a blank page. Place it inside the i18n provider, since the message is translated.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error }
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    logError("render error", { error, componentStack: info.componentStack })
  }

  override render(): ReactNode {
    if (this.state.error) {
      return <ErrorFallback onRetry={() => this.setState({ error: null })} />
    }
    return this.props.children
  }
}
