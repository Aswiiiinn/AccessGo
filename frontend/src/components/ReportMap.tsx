import type { AccessibilityReport, AccessibilityLocation } from '@/types'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

export interface ReportWithLocation extends AccessibilityReport {
  locationData?: AccessibilityLocation | null
}

export interface ReportMapProps {
  reports: ReportWithLocation[]
  locations?: AccessibilityLocation[]
  center?: [number, number]
  zoom?: number
}

export const ReportMap = ({ reports, locations = [], center = [51.505, -0.09], zoom = 13 }: ReportMapProps) => {
  const getCoords = (report: ReportWithLocation): [number, number] | null => {
    // Use attached locationData first
    const loc = report.locationData ?? locations.find(l => l.id === report.location)
    if (loc?.latitude && loc?.longitude) {
      const lat = parseFloat(String(loc.latitude))
      const lng = parseFloat(String(loc.longitude))
      if (!isNaN(lat) && !isNaN(lng)) return [lat, lng]
    }
    // Fallback: if location is already an object with coordinates
    if (typeof report.location === 'object' && report.location !== null) {
      const locObj = report.location as any
      if (locObj.latitude && locObj.longitude) {
        const lat = parseFloat(String(locObj.latitude))
        const lng = parseFloat(String(locObj.longitude))
        if (!isNaN(lat) && !isNaN(lng)) return [lat, lng]
      }
    }
    return null
  }

  const markers = reports
    .map(r => ({ report: r, coords: getCoords(r) }))
    .filter((m): m is { report: ReportWithLocation; coords: [number, number] } => m.coords !== null)

  const mapCenter: [number, number] = center[0] === 0 && center[1] === 0 && markers.length > 0
    ? markers[0].coords
    : center

  return (
    <MapContainer
      center={mapCenter}
      zoom={markers.length > 0 ? 13 : zoom}
      style={{ height: '400px', width: '100%' }}
      scrollWheelZoom={true}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />
      {markers.map(({ report, coords }) => (
        <Marker key={report.id} position={coords}>
          <Popup>
            <h6>{report.title}</h6>
            <p>{report.category || 'No category'} • {report.accessibility_impact}</p>
            <small>Status: {report.status}</small>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  )
}
