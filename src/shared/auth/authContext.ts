import { createContext, useContext } from "react"

export type AuthUser = {
  id: string
}

export type SignInCredentials = {
  password: string
}

export type SignOutOptions = {
  /** Full-page redirect without notifying subscribers (avoids route-guard races). */
  redirectTo?: string
}

export type AuthContextValue = {
  user: AuthUser | null
  isAuthenticated: boolean
  isLoading: boolean
  signIn: (credentials: SignInCredentials) => Promise<boolean>
  signOut: (options?: SignOutOptions) => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider")
  }
  return ctx
}
