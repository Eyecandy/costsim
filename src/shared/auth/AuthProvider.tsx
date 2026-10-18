import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react"
import {
  AuthContext,
  type AuthContextValue,
  type SignInCredentials,
  type SignOutOptions,
} from "@/shared/auth/authContext"
import {
  AUTH_CHANGED_EVENT,
  clearSession,
  notifyAuthChanged,
  readIsAuthenticated,
  signInWithPassword,
} from "@/persistence/authSession"

const LOCAL_USER_ID = "local"

type AuthProviderProps = {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)

  useEffect(() => {
    const syncAuth = () => {
      setIsAuthenticated(readIsAuthenticated())
    }
    syncAuth()
    window.addEventListener("storage", syncAuth)
    window.addEventListener(AUTH_CHANGED_EVENT, syncAuth)
    return () => {
      window.removeEventListener("storage", syncAuth)
      window.removeEventListener(AUTH_CHANGED_EVENT, syncAuth)
    }
  }, [])

  const isLoading = isAuthenticated === null
  const isAuthed = isAuthenticated === true
  const user = useMemo(() => (isAuthed ? { id: LOCAL_USER_ID } : null), [isAuthed])

  const signIn = useCallback(async ({ password }: SignInCredentials) => {
    const expectedPassword = import.meta.env.VITE_APP_PASSWORD ?? ""
    if (expectedPassword.length === 0) return false
    return signInWithPassword(password, expectedPassword)
  }, [])

  const signOut = useCallback(async (options?: SignOutOptions) => {
    clearSession()
    if (options?.redirectTo) {
      window.location.replace(options.redirectTo)
      return
    }
    notifyAuthChanged()
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: isAuthed,
      isLoading,
      signIn,
      signOut,
    }),
    [user, isAuthed, isLoading, signIn, signOut],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
