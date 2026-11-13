import { useCallback, useEffect, useState } from 'react'
import { authApi } from '@/features/auth/api'
import { useAuth } from '@/context/AuthContext'
import { parseApiError } from '@/lib/apiErrors'
import type { UserProfile } from '@/types'

/** Loads the current profile from GET /auth/profile/ and syncs it into AuthContext. */
export function useFreshProfile() {
  const { setUser } = useAuth()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await authApi.getProfile()
      setProfile(data)
      setUser(data)
    } catch (err) {
      setError(parseApiError(err, 'Could not load your profile.').message)
    } finally {
      setLoading(false)
    }
  }, [setUser])

  useEffect(() => {
    load()
  }, [load])

  return { profile, loading, error, reload: load }
}
