import apiClient from '@/lib/axios'
import { setTokens, clearTokens } from '@/lib/auth'
import type { User } from '@/types'

export interface LoginCredentials {
  username: string
  password: string
}

export interface RegisterData {
  username: string
  email: string
  password: string
}

export const login = async (credentials: LoginCredentials): Promise<void> => {
  const { data } = await apiClient.post('/auth/login/', credentials)
  setTokens(data.access, data.refresh)
}

export const register = async (data: RegisterData): Promise<User> => {
  const response = await apiClient.post<User>('/auth/register/', data)
  return response.data
}

export const logout = async (refresh: string): Promise<void> => {
  await apiClient.post('/auth/logout/', { refresh })
  clearTokens()
}

export const getProfile = async (): Promise<User> => {
  const { data } = await apiClient.get<User>('/auth/profile/')
  return data
}

export const updateProfile = async (payload: Partial<User>): Promise<User> => {
  const { data } = await apiClient.patch<User>('/auth/profile/', payload)
  return data
}
