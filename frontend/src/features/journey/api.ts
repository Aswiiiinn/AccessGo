import apiClient from '@/lib/axios'
import type { AccessibilityReport } from '@/types'

export interface NearRouteResponse {
  count: number
  distance_m: number
  results: AccessibilityReport[]
}

export async function getReportsNearRoute(
  route: { lat: number; lng: number }[],
  distanceM = 50
): Promise<NearRouteResponse> {
  const payload = {
    route: route.map(p => [p.lat, p.lng]),
    distance_m: distanceM,
  }
  const { data } = await apiClient.post<NearRouteResponse>('/reports/near-route/', payload)
  return data
}