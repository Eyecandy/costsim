import { X } from "lucide-react"
import { useState } from "react"

import { Button } from "@/shared/ui/button"
import { Card, CardContent } from "@/shared/ui/card"
import { Input } from "@/shared/ui/input"
import { useAuth } from "@/shared/auth/AuthProvider"
import { useI18n } from "@/i18n/useI18n"
import { cn } from "@/shared/utils"

type LoginCardProps = {
  onSuccess: () => void
  onDismiss?: () => void
  passwordInputId?: string
}

export function LoginCard({
  onSuccess,
  onDismiss,
  passwordInputId = "login-password",
}: LoginCardProps) {
  const { t } = useI18n()
  const { signIn } = useAuth()
  const [passwordInput, setPasswordInput] = useState("")
  const [authError, setAuthError] = useState(false)

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (await signIn({ password: passwordInput })) {
      setAuthError(false)
      setPasswordInput("")
      onSuccess()
      return
    }
    setAuthError(true)
  }

  return (
    <Card className="w-full max-w-[22rem] border border-border/80 bg-card shadow-sm">
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1 space-y-1.5">
            <h2 className="font-sans text-lg font-semibold leading-tight tracking-tight text-foreground/90">
              {t("auth.title")}
            </h2>
            <p className="font-sans text-[13px] leading-snug text-muted-foreground">
              {t("auth.helper")}
            </p>
          </div>
          {onDismiss ? (
            <button
              type="button"
              onClick={onDismiss}
              className="-mr-1 -mt-0.5 shrink-0 rounded-md p-1 text-muted-foreground/70 transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              aria-label={t("common.cancel")}
            >
              <X className="size-4" strokeWidth={2} aria-hidden />
            </button>
          ) : null}
        </div>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Input
              id={passwordInputId}
              type="password"
              autoComplete="current-password"
              value={passwordInput}
              onChange={(event) => {
                setPasswordInput(event.target.value)
                if (authError) setAuthError(false)
              }}
              placeholder={t("auth.passwordPlaceholder")}
              aria-invalid={authError}
              className={cn(
                "h-9 bg-background text-sm text-foreground shadow-none",
                "placeholder:text-xs placeholder:font-normal placeholder:text-muted-foreground/45",
                authError && "border-destructive/60",
              )}
            />
          </div>
          {authError ? (
            <p className="text-xs leading-snug text-destructive" role="alert">
              {t("auth.incorrectPassword")}
            </p>
          ) : null}
          <Button
            type="submit"
            className="h-9 w-full border-transparent bg-[#1d868c] font-sans text-sm font-medium text-white hover:bg-[#1d868c]/90 hover:text-white"
          >
            {t("auth.continue")}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
