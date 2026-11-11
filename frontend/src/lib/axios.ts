import axios from 'axios'
import { getAccessToken, getRefreshToken, setTokens, clearTokens } from './auth'

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
})

apiClient.interceptors.request.use((config) => {
  const token = getAccessToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true
      const refresh = getRefreshToken()
      if (refresh) {
        try {
          const { data } = await axios.post(
            `${import.meta.env.VITE_API_BASE_URL}/auth/token/refresh/`,
            { refresh }
          )
          setTokens(data.access, refresh)
          original.headers.Authorization = `Bearer ${data.access}`
          return apiClient(original)
        } catch {
          clearTokens()
        }
      }
    }
    return Promise.reject(error)
  }
)

export default apiClient
