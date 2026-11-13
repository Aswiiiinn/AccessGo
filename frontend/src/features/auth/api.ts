import apiClient from '@/lib/axios'
import { setTokens, clearTokens, getRefreshToken } from '@/lib/auth'
import type {
  AuthCredentials,
  LoginResponse,
  RegisterRequest,
  UserProfile,
  ForgotPasswordRequest,
  ResetPasswordConfirmRequest,
  ResetPasswordValidateRequest,
  ChangePasswordRequest,
  ChangePasswordResponse,
  ChangeEmailRequest,
  ProfileUpdateRequest,
  DetailResponse,
} from '@/types'

export const authApi = {
  login: async (credentials: AuthCredentials): Promise<LoginResponse> => {
    const { data } = await apiClient.post('/auth/login/', credentials)
    setTokens(data.access, data.refresh)
    return data
  },

  register: async (requestData: RegisterRequest): Promise<UserProfile> => {
    const { data } = await apiClient.post<UserProfile>('/auth/register/', requestData)
    return data
  },

  /**
   * Blacklists the refresh token on the server (Simple JWT TokenBlacklistView), then
   * clears local tokens. Local tokens are cleared even if the server call fails
   * (e.g. the token was already revoked or the network is down).
   */
  logout: async (): Promise<void> => {
    const refresh = getRefreshToken()
    try {
      if (refresh) await apiClient.post('/auth/logout/', { refresh })
    } catch {
      // Token already invalid/expired, or server unreachable — nothing more to revoke.
    } finally {
      clearTokens()
    }
  },

  getProfile: async (): Promise<UserProfile> => {
    const { data } = await apiClient.get<UserProfile>('/auth/profile/')
    return data
  },

  updateProfile: async (payload: ProfileUpdateRequest): Promise<UserProfile> => {
    if (payload.avatar instanceof File) {
      const form = new FormData()
      for (const [key, value] of Object.entries(payload)) {
        if (value === undefined || value === null) continue
        form.append(key, value as string | Blob)
      }
      // Let the browser set the multipart boundary.
      const { data } = await apiClient.patch<UserProfile>('/auth/profile/', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      return data
    }
    const { data } = await apiClient.patch<UserProfile>('/auth/profile/', payload)
    return data
  },

  changeEmail: async (payload: ChangeEmailRequest): Promise<DetailResponse> => {
    const { data } = await apiClient.post<DetailResponse>('/auth/change-email/', payload)
    return data
  },

  forgotPassword: async (payload: ForgotPasswordRequest): Promise<DetailResponse> => {
    const { data } = await apiClient.post<DetailResponse>('/auth/forgot-password/', payload)
    return data
  },

  validateResetToken: async (payload: ResetPasswordValidateRequest): Promise<void> => {
    await apiClient.post('/auth/reset-password/validate/', payload)
  },

  resetPasswordConfirm: async (payload: ResetPasswordConfirmRequest): Promise<DetailResponse> => {
    const { data } = await apiClient.post<DetailResponse>('/auth/reset-password/confirm/', payload)
    return data
  },

  changePassword: async (payload: ChangePasswordRequest): Promise<ChangePasswordResponse> => {
    const { data } = await apiClient.post<ChangePasswordResponse>('/auth/change-password/', payload)
    return data
  },

  refreshToken: async (refresh: string): Promise<LoginResponse> => {
    const { data } = await apiClient.post<LoginResponse>('/auth/token/refresh/', { refresh })
    if (data.access) {
      setTokens(data.access, data.refresh)
    }
    return data
  },
}
