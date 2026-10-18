import { lazy, Suspense, useEffect, useSyncExternalStore, type ReactNode } from "react"

import { LandingPage } from "@/app/LandingPage"
import { LoginPage } from "@/app/LoginPage"
import { useAuth } from "@/shared/auth/authContext"
import { appFeatures } from "@/config/appVariant"
import {
  getLocationPathKey,
  isLibraryPath,
  subscribeLocation,
} from "@/persistence/analysisLibraryRoutes"
import { buildLoginUrl, captureCurrentAppUrl } from "@/shared/auth/auth"

// The workspace and the library are large; load them only when their route is opened.
const App = lazy(() => import("@/app/App"))
const AnalysisLibraryPage = lazy(() =>
  import("@/features/analysis-library/AnalysisLibraryPage").then((m) => ({
    default: m.AnalysisLibraryPage,
  })),
)

function getPathname() {
  return window.location.pathname
}

function isAppPath(pathname: string) {
  return pathname === "/app" || pathname.startsWith("/app/")
}

function isLoginPath(pathname: string) {
  return pathname === "/login"
}

function AuthedGate({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth()
  const requiresLogin = appFeatures.requireLoginGate

  useEffect(() => {
    if (requiresLogin && !isLoading && !isAuthenticated) {
      window.location.replace(buildLoginUrl(captureCurrentAppUrl()))
    }
  }, [requiresLogin, isLoading, isAuthenticated])

  if (requiresLogin && (isLoading || !isAuthenticated)) {
    return null
  }

  return children
}

export function Router() {
  // Include search so `/app?analysis=` changes remount/re-render App correctly.
  const pathKey = useSyncExternalStore(subscribeLocation, getLocationPathKey, () => "/")
  const pathname = pathKey.split("?")[0] || getPathname()

  if (isLibraryPath(pathname)) {
    return (
      <AuthedGate>
        <Suspense fallback={null}>
          <AnalysisLibraryPage />
        </Suspense>
      </AuthedGate>
    )
  }

  if (isAppPath(pathname)) {
    return (
      <AuthedGate>
        <Suspense fallback={null}>
          <App key={pathKey} />
        </Suspense>
      </AuthedGate>
    )
  }

  if (isLoginPath(pathname)) {
    return <LoginPage />
  }

  return <LandingPage />
}
