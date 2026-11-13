export interface RoutePoint {
  lat: number
  lng: number
}

export interface RouteResult {
  geometry: RoutePoint[] // [lat, lng] pairs along route
  distance: number // meters
  duration: number // seconds
}

const OSRM_BASE = 'https://router.project-osrm.org/route/v1/foot'

export async function calculateRoute(origin: RoutePoint, destination: RoutePoint): Promise<RouteResult> {
  // OSRM expects lng,lat
  const coords = `${origin.lng},${origin.lat};${destination.lng},${destination.lat}`
  const params = new URLSearchParams({
    overview: 'full',
    geometries: 'geojson',
    steps: 'false',
  })
  const res = await fetch(`${OSRM_BASE}/${coords}?${params.toString()}`)
  if (!res.ok) throw new Error('Routing request failed')
  const data = await res.json()
  if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
    throw new Error(data.message || 'No route found')
  }
  const route = data.routes[0]
  const geometry: RoutePoint[] = route.geometry.coordinates.map((c: [number, number]) => ({
    lat: c[1],
    lng: c[0],
  }))
  return {
    geometry,
    distance: route.distance,
    duration: route.duration,
  }
}

export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`
  return `${(meters / 1000).toFixed(1)} km`
}

export function formatDuration(seconds: number): string {
  const mins = Math.round(seconds / 60)
  if (mins < 60) return `${mins} min`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m ? `${h} h ${m} min` : `${h} h`
}