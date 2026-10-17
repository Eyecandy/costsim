import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react"
import {
  AuthContext,
  type AuthContextValue,
  type SignInCredentials,
  type SignOutOptions,
} from "@/shared/auth/authContext"

const AUTH_STORAGE_KEY = "cost-simulator:v1:isAuthenticated"
const AUTH_CHANGED_EVENT = "cost-simulator:auth-changed"

const LOCAL_USER_ID = "local"

function readIsAuthenticated(): boolean {
  if (typeof window === "undefined") return false
  return localStorage.getItem(AUTH_STORAGE_KEY) === "1"
}

function notifyAuthChanged() {
  window.dispatchEvent(new Event(AUTH_CHANGED_EVENT))
}

function clearSession() {
  localStorage.removeItem(AUTH_STORAGE_KEY)
}

function signInWithPassword(password: string, expectedPassword: string): boolean {
  if (password !== expectedPassword) return false
  localStorage.setItem(AUTH_STORAGE_KEY, "1")
  notifyAuthChanged()
  return true
}

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
  const user = isAuthed ? { id: LOCAL_USER_ID } : null

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
