import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios'
import { getAccessToken, getRefreshToken, setTokens, clearTokens, isAuthenticated } from './auth'

const API_BASE_URL = (import.meta as any).env.VITE_API_BASE_URL

/** Fired when stored tokens are no longer usable so AuthContext can drop the user. */
export const SESSION_EXPIRED_EVENT = 'accessgo:session-expired'

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
})

apiClient.interceptors.request.use((config) => {
  if (isAuthenticated()) {
    const token = getAccessToken()
    if (token) config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Endpoints whose 401s mean "bad credentials/token", not "access token expired".
const NO_REFRESH_PATHS = ['/auth/login/', '/auth/token/refresh/', '/auth/logout/']

// Refresh tokens rotate and the old one is blacklisted, so concurrent 401s must share
// a single refresh request; a second refresh with the same token would be rejected.
let refreshInFlight: Promise<string> | null = null

const refreshAccessToken = (): Promise<string> => {
  if (!refreshInFlight) {
    const refresh = getRefreshToken()
    refreshInFlight = (async () => {
      if (!refresh) throw new Error('No refresh token')
      const { data } = await axios.post(`${API_BASE_URL}/auth/token/refresh/`, { refresh })
      if (!data.access || !data.refresh) throw new Error('Invalid refresh response')
      setTokens(data.access, data.refresh)
      return data.access as string
    })().finally(() => {
      refreshInFlight = null
    })
  }
  return refreshInFlight
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined
    const isAuthEndpoint = NO_REFRESH_PATHS.some((p) => original?.url?.includes(p))
    if (error.response?.status === 401 && original && !original._retry && !isAuthEndpoint && isAuthenticated()) {
      original._retry = true
      try {
        const access = await refreshAccessToken()
        original.headers.Authorization = `Bearer ${access}`
        return apiClient(original)
      } catch {
        clearTokens()
        window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT))
      }
    }
    return Promise.reject(error)
  }
)

export default apiClient
