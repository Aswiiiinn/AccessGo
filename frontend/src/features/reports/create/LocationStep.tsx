import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Crosshair, LocateFixed, MapPin, MapPinned, Pencil } from 'lucide-react'
import LocationSearchInput from '@/components/journey/LocationSearchInput'
import Dialog from '@/components/ui/Dialog'
import Notice from '@/components/ui/Notice'
import LoadingButton from '@/components/ui/LoadingButton'
import { reverseGeocode, type LocationPoint } from '@/features/journey/geocoding'
import { useCurrentPosition } from '@/hooks/useCurrentPosition'
import type { SelectedPlace } from './draft'

const PIN_ICON = L.divIcon({
  className: '',
  html: '<div class="ag-marker" style="background:#0b7d75"><span>●</span></div>',
  iconSize: [30, 30],
  iconAnchor: [15, 30],
})

const DEFAULT_CENTER: [number, number] = [51.505, -0.09]

function ClickToPlace({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({ click: (e) => onPick(e.latlng.lat, e.latlng.lng) })
  return null
}

function Recenter({ point, zoom = 17 }: { point: [number, number] | null; zoom?: number }) {
  const map = useMap()
  useEffect(() => {
    // Dialog animates in; re-measure before centring.
    const t = window.setTimeout(() => {
      map.invalidateSize()
      if (point) map.setView(point, Math.max(map.getZoom(), zoom))
    }, 60)
    return () => window.clearTimeout(t)
  }, [point, map, zoom])
  return null
}

const round6 = (n: number) => Number(n.toFixed(6))

async function placeFromPoint(lat: number, lng: number, fallbackName: string): Promise<SelectedPlace> {
  const info = await reverseGeocode(lat, lng)
  return {
    name: info?.name || fallbackName,
    type: info?.type || 'other',
    address: info?.address || `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
    lat: round6(lat),
    lng: round6(lng),
  }
}

interface LocationStepProps {
  value: SelectedPlace | null
  onChange: (place: SelectedPlace | null) => void
  error?: string | null
}

/** Search, use current location, or drop a pin on a map. */
export default function LocationStep({ value, onChange, error }: LocationStepProps) {
  const [mapOpen, setMapOpen] = useState(false)
  const [pin, setPin] = useState<[number, number] | null>(null)
  const [resolving, setResolving] = useState(false)
  const { locate, locating, error: locationError } = useCurrentPosition()

  const searchValue: LocationPoint | null = value ? { name: value.name, lat: value.lat, lng: value.lng } : null

  const useMyLocation = async () => {
    const coords = await locate()
    if (!coords) return
    setResolving(true)
    onChange(await placeFromPoint(coords.lat, coords.lng, 'My current location'))
    setResolving(false)
  }

  const openMap = () => {
    setPin(value ? [value.lat, value.lng] : null)
    setMapOpen(true)
  }

  const confirmPin = async () => {
    if (!pin) return
    setResolving(true)
    onChange(await placeFromPoint(pin[0], pin[1], 'Pinned location'))
    setResolving(false)
    setMapOpen(false)
  }

  const pinMyLocation = async () => {
    const coords = await locate()
    if (coords) setPin([coords.lat, coords.lng])
  }

  return (
    <div className="d-flex flex-column gap-3">
      <LocationSearchInput
        label="Search for the place"
        placeholder="Street, station, building…"
        value={searchValue}
        onSelectResult={(r) =>
          onChange({
            name: r.display_name.split(',')[0]?.trim() || r.display_name,
            address: r.display_name,
            type: r.type || 'other',
            lat: round6(parseFloat(r.lat)),
            lng: round6(parseFloat(r.lon)),
          })
        }
        onChange={(p) => {
          // Selections are handled by onSelectResult (it carries the place type); here we only clear.
          if (!p) onChange(null)
        }}
        error={error}
      />

      <div className="d-flex align-items-center gap-2 text-muted small" aria-hidden="true">
        <span className="flex-grow-1 ag-divider" /> or <span className="flex-grow-1 ag-divider" />
      </div>

      <div className="d-grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }}>
        <LoadingButton className="btn btn-outline-primary" onClick={useMyLocation} loading={locating || (resolving && !mapOpen)} icon={<LocateFixed size={18} aria-hidden="true" />}>
          Use my location
        </LoadingButton>
        <button type="button" className="btn btn-outline-primary" onClick={openMap}>
          <MapPinned size={18} aria-hidden="true" />
          Pick on the map
        </button>
      </div>
      {locationError && <Notice tone="warning">{locationError}</Notice>}

      {value && (
        <section className="ag-card overflow-hidden" aria-label="Selected location">
          <div className="ag-card-body d-flex gap-3 align-items-start">
            <span className="ag-choice-icon" style={{ background: 'var(--ag-teal-50)', color: 'var(--ag-teal-700)' }} aria-hidden="true">
              <MapPin size={18} />
            </span>
            <div className="flex-grow-1 ag-min-w-0">
              <div className="ag-eyebrow">Selected location</div>
              <div className="fw-semibold ag-break">{value.name}</div>
              <div className="small text-muted ag-break">{value.address}</div>
              <div className="ag-caption mt-1">
                {value.lat.toFixed(5)}, {value.lng.toFixed(5)}
              </div>
            </div>
            <button type="button" className="btn btn-sm btn-ghost flex-shrink-0" onClick={openMap}>
              <Pencil size={14} aria-hidden="true" />
              Adjust
            </button>
          </div>
        </section>
      )}

      <Dialog
        open={mapOpen}
        onClose={() => setMapOpen(false)}
        title="Pick the location"
        variant="full"
        size="lg"
        footer={
          <>
            <button type="button" className="btn btn-outline-secondary" onClick={() => setMapOpen(false)}>Cancel</button>
            <LoadingButton className="btn btn-primary" onClick={confirmPin} disabled={!pin} loading={resolving} loadingText="Finding address…">
              Use this location
            </LoadingButton>
          </>
        }
      >
        <p className="small text-muted mb-2">
          Tap the map where the barrier is. You can tap again to move the pin.
        </p>
        <div className="ag-map" style={{ height: 'min(60dvh, 460px)' }}>
          <MapContainer center={pin ?? DEFAULT_CENTER} zoom={pin ? 17 : 13} style={{ height: '100%', width: '100%' }}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' />
            <Recenter point={pin} />
            <ClickToPlace onPick={(lat, lng) => setPin([lat, lng])} />
            {pin && <Marker position={pin} icon={PIN_ICON} />}
          </MapContainer>
        </div>
        <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mt-2">
          <span className="small" aria-live="polite">
            {pin ? (
              <>
                <Crosshair size={14} aria-hidden="true" /> Pin at {pin[0].toFixed(5)}, {pin[1].toFixed(5)}
              </>
            ) : (
              'No pin placed yet.'
            )}
          </span>
          <LoadingButton className="btn btn-sm btn-ghost" onClick={pinMyLocation} loading={locating} icon={<LocateFixed size={16} aria-hidden="true" />}>
            Go to my location
          </LoadingButton>
        </div>
        {locationError && <Notice tone="warning" className="mt-2">{locationError}</Notice>}
      </Dialog>
    </div>
  )
}
