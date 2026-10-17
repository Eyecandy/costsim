import { useEffect } from "react"

import { LoginCard } from "@/app/LoginCard"
import { useAuth } from "@/shared/auth/AuthProvider"
import { appFeatures } from "@/config/appVariant"
import { readPostLoginPath, useNavigate } from "@/shared/auth/auth"
import { cn } from "@/shared/utils"

export function LoginPage() {
  const navigate = useNavigate()
  const { isAuthenticated, isLoading } = useAuth()
  const requiresLogin = appFeatures.requireLoginGate

  const goToLanding = () => navigate("/")

  useEffect(() => {
    if (isLoading) return
    if (!requiresLogin || isAuthenticated) {
      navigate(readPostLoginPath())
    }
  }, [requiresLogin, isLoading, isAuthenticated, navigate])

  useEffect(() => {
    if (isLoading || !requiresLogin || isAuthenticated) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") navigate("/")
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [requiresLogin, isLoading, isAuthenticated, navigate])

  if (isLoading || !requiresLogin || isAuthenticated) {
    return null
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header
        className={cn(
          "sticky top-0 z-50 bg-background/95 backdrop-blur-sm",
        )}
      >
        <div className="mx-auto flex max-w-[90rem] items-center justify-between px-3 py-3 md:px-5 lg:px-6">
          {/*
            Pre-auth login: product wordmark withheld until brand/domain is secured.
            Restore the shared app wordmark in this left slot when ready
            (spacer height matches the wordmark line).
          */}
          <div className="min-h-[1.6875rem]" aria-hidden />
        </div>
      </header>
      <main className="flex flex-1 items-center justify-center p-4">
        <LoginCard
          onSuccess={() => navigate(readPostLoginPath())}
          onDismiss={goToLanding}
          passwordInputId="login-page-password"
        />
      </main>
    </div>
  )
}
