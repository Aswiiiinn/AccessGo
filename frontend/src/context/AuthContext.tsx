import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import { authApi } from '@/features/auth/api'
import { clearTokens, isAuthenticated as hasStoredToken } from '@/lib/auth'
import { SESSION_EXPIRED_EVENT } from '@/lib/axios'
import type { UserProfile } from '@/types'

interface AuthContextValue {
  user: UserProfile | null
  isLoading: boolean
  isAuthenticated: boolean
  isAdmin: boolean
  loginUser: (accessToken: string, refreshToken: string) => Promise<UserProfile | null>
  /** Revokes the refresh token on the server, then clears all local auth state. */
  logoutUser: () => Promise<void>
  /** Re-fetches the profile from the server (e.g. after an email change). */
  refreshUser: () => Promise<UserProfile | null>
  /** Replaces the cached profile with a server response (e.g. after PATCH /auth/profile/). */
  setUser: (user: UserProfile) => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const loadUser = useCallback(async (): Promise<UserProfile | null> => {
    if (!hasStoredToken()) {
      setUserState(null)
      setIsLoading(false)
      return null
    }
    try {
      const profile = await authApi.getProfile()
      setUserState(profile)
      return profile
    } catch {
      clearTokens()
      setUserState(null)
      return null
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadUser()
  }, [loadUser])

  // Drop the user when the axios layer finds the session can no longer be refreshed.
  useEffect(() => {
    const onExpired = () => setUserState(null)
    window.addEventListener(SESSION_EXPIRED_EVENT, onExpired)
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired)
  }, [])

  const loginUser = useCallback(async (): Promise<UserProfile | null> => {
    return await loadUser()
  }, [loadUser])

  const logoutUser = useCallback(async () => {
    await authApi.logout()
    setUserState(null)
  }, [])

  const setUser = useCallback((profile: UserProfile) => setUserState(profile), [])

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        isAdmin: user?.role === 'admin' || user?.is_superuser === true,
        loginUser,
        logoutUser,
        refreshUser: loadUser,
        setUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
