const ACCESS_KEY = 'accessgo_access'
const REFRESH_KEY = 'accessgo_refresh'

export const getAccessToken = (): string | null => localStorage.getItem(ACCESS_KEY)
export const getRefreshToken = (): string | null => localStorage.getItem(REFRESH_KEY)

export const setTokens = (access: string, refresh: string): void => {
  localStorage.setItem(ACCESS_KEY, access)
  localStorage.setItem(REFRESH_KEY, refresh)
}

export const clearTokens = (): void => {
  localStorage.removeItem(ACCESS_KEY)
  localStorage.removeItem(REFRESH_KEY)
}

export const isAuthenticated = (): boolean => !!getAccessToken()
