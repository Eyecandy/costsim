const AUTH_STORAGE_KEY = "cost-simulator:v1:isAuthenticated"

export const AUTH_CHANGED_EVENT = "cost-simulator:auth-changed"

export function readIsAuthenticated(): boolean {
  if (typeof window === "undefined") return false
  return localStorage.getItem(AUTH_STORAGE_KEY) === "1"
}

export function notifyAuthChanged() {
  window.dispatchEvent(new Event(AUTH_CHANGED_EVENT))
}

export function clearSession() {
  localStorage.removeItem(AUTH_STORAGE_KEY)
}

export function signInWithPassword(password: string, expectedPassword: string): boolean {
  if (password !== expectedPassword) return false
  localStorage.setItem(AUTH_STORAGE_KEY, "1")
  notifyAuthChanged()
  return true
}
