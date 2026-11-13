import apiClient from '@/lib/axios'
import type { AccessibilityLocation, PaginatedResponse } from '@/types'

export const accessibilityApi = {
  getAll: async (params?: Record<string, string>): Promise<PaginatedResponse<AccessibilityLocation>> => {
    const { data } = await apiClient.get<PaginatedResponse<AccessibilityLocation>>('/accessibility/locations/', { params })
    return data
  },

  getById: async (id: number): Promise<AccessibilityLocation> => {
    const { data } = await apiClient.get<AccessibilityLocation>(`/accessibility/locations/${id}/`)
    return data
  },

  create: async (payload: {
    name: string
    location_type?: string
    address?: string
    latitude: number | string
    longitude: number | string
    description?: string
  }): Promise<AccessibilityLocation> => {
    const { data } = await apiClient.post<AccessibilityLocation>('/accessibility/locations/', payload)
    return data
  },
}
