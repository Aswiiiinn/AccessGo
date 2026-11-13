export interface GeocodingResult {
  place_id: number
  display_name: string
  lat: string
  lon: string
  type: string
  importance: number
}

export interface LocationPoint {
  name: string
  lat: number
  lng: number
}

const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org/search'

export async function searchLocation(query: string, signal?: AbortSignal): Promise<GeocodingResult[]> {
  if (!query || query.trim().length < 3) return []
  const params = new URLSearchParams({
    q: query.trim(),
    format: 'json',
    addressdetails: '1',
    limit: '5',
  })
  const res = await fetch(`${NOMINATIM_BASE}?${params.toString()}`, {
    headers: { 'Accept-Language': 'en' },
    signal,
  })
  if (!res.ok) throw new Error('Geocoding request failed')
  return res.json()
}

export function toLocationPoint(result: GeocodingResult): LocationPoint {
  return {
    name: result.display_name,
    lat: parseFloat(result.lat),
    lng: parseFloat(result.lon),
  }
}

interface ReverseResult {
  display_name?: string
  name?: string
  type?: string
  address?: Record<string, string>
}

/** Best-effort place name for a map-picked point. Resolves to null on any failure. */
export async function reverseGeocode(lat: number, lng: number, signal?: AbortSignal): Promise<{ name: string; address: string; type: string } | null> {
  try {
    const params = new URLSearchParams({ lat: String(lat), lon: String(lng), format: 'json', zoom: '18' })
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?${params.toString()}`, {
      headers: { 'Accept-Language': 'en' },
      signal,
    })
    if (!res.ok) return null
    const data: ReverseResult = await res.json()
    if (!data.display_name) return null
    const a = data.address ?? {}
    const name = data.name || a.amenity || a.building || a.road || data.display_name.split(',')[0]
    return { name, address: data.display_name, type: data.type || 'other' }
  } catch {
    return null
  }
}
