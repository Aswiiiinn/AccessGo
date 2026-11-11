import apiClient from '@/lib/axios'
import type { AccessibilityLocation, PaginatedResponse } from '@/types'

export const getLocations = async (params?: Record<string, string>): Promise<PaginatedResponse<AccessibilityLocation>> => {
  const { data } = await apiClient.get('/accessibility/locations/', { params })
  return data
}

export const getLocation = async (id: number): Promise<AccessibilityLocation> => {
  const { data } = await apiClient.get(`/accessibility/locations/${id}/`)
  return data
}

export const getNearbyLocations = async (lat: number, lng: number, radius = 1.0): Promise<AccessibilityLocation[]> => {
  const { data } = await apiClient.get('/accessibility/locations/nearby/', {
    params: { lat, lng, radius },
  })
  return data
}
