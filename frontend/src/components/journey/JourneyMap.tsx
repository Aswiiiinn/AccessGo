import { MapContainer, TileLayer, Marker, Polyline, CircleMarker, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useEffect, useMemo } from 'react'
import type { AccessibilityReport } from '@/types'
import type { RoutePoint } from '@/features/journey/routing'
import { getReportCoords, getSeverity, getStatus, isActiveBarrier, SEVERITY_HEX } from '@/features/reports/meta'

const SEVERITY_LETTER: Record<string, string> = { low: 'L', medium: 'M', high: 'H', critical: '!' }

/**
 * Report marker: colour = severity, inner glyph = severity initial (so it is not colour-only),
 * dashed border = unverified, faded = resolved/rejected.
 */
function reportIcon(r: AccessibilityReport, selected: boolean) {
  const muted = !isActiveBarrier(r)
  const color = muted ? '#8a94a6' : SEVERITY_HEX[r.accessibility_impact] ?? '#8a94a6'
  const size = selected ? 38 : 30
  const classes = ['ag-marker', r.status === 'pending' ? 'ag-marker-unverified' : '', selected ? 'ag-marker-selected' : '', muted ? 'ag-marker-muted' : '']
    .filter(Boolean)
    .join(' ')
  return L.divIcon({
    className: '',
    html: `<div class="${classes}" style="background:${color}"><span>${SEVERITY_LETTER[r.accessibility_impact] ?? '?'}</span></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
  })
}

const endpointIcon = (color: string) =>
  L.divIcon({ className: '', html: `<div class="ag-endpoint" style="background:${color}"></div>`, iconSize: [22, 22], iconAnchor: [11, 11] })
const START_ICON = endpointIcon('#0b7d75')
const END_ICON = endpointIcon('#172b4d')

function FitBounds({ points, padding }: { points: [number, number][]; padding: number }) {
  const map = useMap()
  const key = points.map((p) => p.join(',')).join('|')
  useEffect(() => {
    if (points.length === 0) return
    if (points.length === 1) {
      map.setView(points[0], 15)
      return
    }
    map.fitBounds(L.latLngBounds(points), { padding: [padding, padding], maxZoom: 17 })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, map, padding])
  return null
}

/** Re-measure when the container changes size (e.g. map revealed after route calculation). */
function InvalidateOnResize() {
  const map = useMap()
  useEffect(() => {
    const el = map.getContainer()
    const ro = new ResizeObserver(() => map.invalidateSize())
    ro.observe(el)
    return () => ro.disconnect()
  }, [map])
  return null
}

function PanToSelected({ coords }: { coords: [number, number] | null }) {
  const map = useMap()
  useEffect(() => {
    if (coords && !map.getBounds().pad(-0.15).contains(coords)) map.panTo(coords)
  }, [coords, map])
  return null
}

interface JourneyMapProps {
  route: RoutePoint[]
  origin?: RoutePoint | null
  destination?: RoutePoint | null
  /** Shown only if the user granted location permission. */
  userLocation?: RoutePoint | null
  reports: AccessibilityReport[]
  selectedReportId?: number | null
  onSelectReport?: (id: number) => void
  className?: string
  /** Fallback centre when there is nothing to fit. */
  defaultCenter?: [number, number]
  /** When set, centre on this point instead of fitting all markers (e.g. "near me"). */
  focusPoint?: RoutePoint | null
  label?: string
}

export default function JourneyMap({
  route,
  origin,
  destination,
  userLocation,
  reports,
  selectedReportId,
  onSelectReport,
  className = 'ag-map ag-map-tall',
  defaultCenter = [51.505, -0.09],
  focusPoint = null,
  label = 'Map of the route and reported accessibility barriers',
}: JourneyMapProps) {
  const markers = useMemo(
    () =>
      reports
        .map((r) => ({ r, c: getReportCoords(r) }))
        .filter((x): x is { r: AccessibilityReport; c: [number, number] } => x.c !== null),
    [reports]
  )

  const fitPoints = useMemo<[number, number][]>(() => {
    if (focusPoint) return [[focusPoint.lat, focusPoint.lng]]
    if (route.length >= 2) return route.map((p) => [p.lat, p.lng])
    const pts: [number, number][] = markers.map((m) => m.c)
    if (origin) pts.push([origin.lat, origin.lng])
    if (destination) pts.push([destination.lat, destination.lng])
    if (pts.length === 0 && userLocation) pts.push([userLocation.lat, userLocation.lng])
    return pts
  }, [route, markers, origin, destination, userLocation, focusPoint])

  const selectedCoords = markers.find((m) => m.r.id === selectedReportId)?.c ?? null

  return (
    <div className={className} role="region" aria-label={label}>
      <MapContainer center={defaultCenter} zoom={13} style={{ height: '100%', width: '100%' }} scrollWheelZoom={false}>
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        <InvalidateOnResize />
        <FitBounds points={fitPoints} padding={36} />
        <PanToSelected coords={selectedCoords} />
        {route.length >= 2 && (
          <>
            <Polyline positions={route.map((p) => [p.lat, p.lng])} pathOptions={{ color: '#ffffff', weight: 9, opacity: 0.9 }} />
            <Polyline positions={route.map((p) => [p.lat, p.lng])} pathOptions={{ color: '#172b4d', weight: 5, opacity: 0.9 }} />
          </>
        )}
        {origin && <Marker position={[origin.lat, origin.lng]} icon={START_ICON} title="Start" alt="Start" keyboard={false} />}
        {destination && <Marker position={[destination.lat, destination.lng]} icon={END_ICON} title="Destination" alt="Destination" keyboard={false} />}
        {userLocation && (
          <CircleMarker
            center={[userLocation.lat, userLocation.lng]}
            radius={8}
            pathOptions={{ color: '#ffffff', weight: 3, fillColor: '#2f80ed', fillOpacity: 1 }}
          />
        )}
        {markers.map(({ r, c }) => (
          <Marker
            key={r.id}
            position={c}
            icon={reportIcon(r, r.id === selectedReportId)}
            zIndexOffset={r.id === selectedReportId ? 1000 : 0}
            title={`${r.title} — ${getSeverity(r.accessibility_impact).label} severity, ${getStatus(r.status).label}`}
            alt={`${r.title}, ${getSeverity(r.accessibility_impact).label} severity, ${getStatus(r.status).label}`}
            eventHandlers={onSelectReport ? { click: () => onSelectReport(r.id), keypress: (e) => { if ((e.originalEvent as KeyboardEvent).key === 'Enter') onSelectReport(r.id) } } : undefined}
          />
        ))}
      </MapContainer>
    </div>
  )
}

export function MapLegend() {
  return (
    <div className="ag-map-legend" aria-label="Map legend">
      {(['low', 'medium', 'high', 'critical'] as const).map((lvl) => (
        <span key={lvl}>
          <span className="ag-legend-swatch" style={{ background: SEVERITY_HEX[lvl] }} aria-hidden="true" />
          {getSeverity(lvl).label} ({SEVERITY_LETTER[lvl]})
        </span>
      ))}
      <span>Dashed outline = unverified</span>
    </div>
  )
}
